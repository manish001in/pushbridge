/**
 * Worker lifecycle, against the real background.ts and everything it imports. Only
 * what lies outside the extension is faked: Chrome's APIs, the network and the
 * stream socket. Each test loads the worker fresh, as Chrome does on a restart.
 */

type Listener = (...args: any[]) => any;

/** A Chrome event: keeps listeners so a test can fire it. */
function chromeEvent() {
  const listeners = new Set<Listener>();
  return {
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    hasListener: (listener: Listener) => listeners.has(listener),
    count: () => listeners.size,
    clear: () => listeners.clear(),
    fire: (...args: any[]) =>
      Promise.all([...listeners].map(listener => listener(...args))),
  };
}

describe('background worker lifecycle', () => {
  const USER_IDEN = 'user-iden';
  const BROWSER_IDEN = 'this-browser';
  const PHONE_IDEN = 'phone-iden';

  let local: Record<string, any>;
  let session: Record<string, any>;
  let events: Record<string, ReturnType<typeof chromeEvent>>;
  let sockets: any[];
  let pushes: any[];
  let chromeMock: any;

  const storageArea = (read: () => Record<string, any>) => ({
    get: jest.fn((key: any, cb?: Listener) => {
      const data = read();
      const result: Record<string, any> =
        key === null || key === undefined
          ? { ...data }
          : typeof key === 'string'
            ? { [key]: data[key] }
            : Object.fromEntries((key as string[]).map(k => [k, data[k]]));
      cb?.(result);
      return Promise.resolve(result);
    }),
    set: jest.fn((values: Record<string, any>, cb?: Listener) => {
      Object.assign(read(), values);
      cb?.();
      return Promise.resolve();
    }),
    remove: jest.fn((key: string, cb?: Listener) => {
      delete read()[key];
      cb?.();
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      const data = read();
      Object.keys(data).forEach(key => delete data[key]);
      return Promise.resolve();
    }),
    getBytesInUse: jest.fn((_key: unknown, cb?: Listener) => {
      cb?.(0);
      return Promise.resolve(0);
    }),
  });

  const respond = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'X-Ratelimit-Limit': '1000',
        'X-Ratelimit-Remaining': '500',
        'X-Ratelimit-Reset': '1800000000',
      },
    });

  /** Let everything already due run, without moving the clock on. */
  const settle = () => jest.advanceTimersByTimeAsync(0);

  /** Start the worker as Chrome would, and let its startup finish. */
  const startWorker = async () => {
    // A stopped worker takes its listeners and timers with it.
    Object.values(events).forEach(event => event.clear());
    jest.resetModules();
    jest.clearAllTimers();
    require('../../src/background/background');
    await settle();
  };

  const liveSocket = () => sockets[sockets.length - 1];

  /** Send what the stream sends for a new push, and let the scan finish. */
  const pushArrives = async (...newPushes: any[]) => {
    pushes = newPushes;
    liveSocket().onmessage({
      data: JSON.stringify({ type: 'tickle', subtype: 'push' }),
    });
    await settle();
  };

  const sendCommand = (message: Record<string, any>) =>
    new Promise<any>(resolve => {
      events.onMessage.fire(message, {}, resolve);
    });

  const newPush = (iden: string, extra = {}) => ({
    iden,
    type: 'note',
    title: `Title ${iden}`,
    body: 'Body',
    active: true,
    dismissed: false,
    created: Date.now() / 1000 + 60,
    modified: Date.now() / 1000 + 60,
    receiver_iden: USER_IDEN,
    source_device_iden: PHONE_IDEN,
    ...extra,
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z') });

    local = {
      pb_token: 'fixture-token',
      pb_device_iden: BROWSER_IDEN,
      pb_user_iden: USER_IDEN,
      pb_settings: {},
    };
    session = {};
    sockets = [];
    pushes = [];
    events = {
      onAlarm: chromeEvent(),
      onInstalled: chromeEvent(),
      onStartup: chromeEvent(),
      onMessage: chromeEvent(),
      onNotificationClicked: chromeEvent(),
      onNotificationClosed: chromeEvent(),
      onNotificationButtonClicked: chromeEvent(),
      onContextMenuClicked: chromeEvent(),
    };

    chromeMock = {
      storage: {
        local: storageArea(() => local),
        session: storageArea(() => session),
        onChanged: chromeEvent(),
      },
      runtime: {
        id: 'fixture',
        onInstalled: events.onInstalled,
        onStartup: events.onStartup,
        onMessage: events.onMessage,
        sendMessage: jest.fn().mockResolvedValue(undefined),
        getURL: (path: string) => `chrome-extension://fixture/${path}`,
        getManifest: () => ({ version: '0.0.0' }),
      },
      alarms: {
        create: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([]),
        onAlarm: events.onAlarm,
      },
      notifications: {
        create: jest.fn().mockResolvedValue('id'),
        clear: jest.fn().mockResolvedValue(true),
        getAll: jest.fn().mockResolvedValue({}),
        onClicked: events.onNotificationClicked,
        onClosed: events.onNotificationClosed,
        onButtonClicked: events.onNotificationButtonClicked,
      },
      contextMenus: {
        create: jest.fn(),
        remove: jest.fn(),
        removeAll: jest.fn((cb?: Listener) => {
          cb?.();
          return Promise.resolve();
        }),
        onClicked: events.onContextMenuClicked,
      },
      action: {
        setBadgeText: jest.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined),
        setBadgeTextColor: jest.fn().mockResolvedValue(undefined),
        openPopup: jest.fn().mockResolvedValue(undefined),
      },
      tabs: { create: jest.fn().mockResolvedValue({}), query: jest.fn() },
      downloads: { download: jest.fn().mockResolvedValue(1) },
    };
    (global as any).chrome = chromeMock;

    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      const socket = { url, close: jest.fn() };
      sockets.push(socket);
      return socket;
    }) as any;

    global.fetch = jest.fn(async (url: any) => {
      const path = new URL(String(url)).pathname;
      if (path === '/v2/pushes') return respond({ pushes });
      if (path === '/v2/devices') {
        return respond({
          devices: [
            { iden: PHONE_IDEN, active: true, has_sms: true, pushable: true },
          ],
        });
      }
      return respond({});
    }) as any;

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('starting', () => {
    test('registers every listener before the first await', () => {
      // Chrome only delivers the event that woke the worker to a listener added
      // during the first turn, so this is checked without settling.
      jest.resetModules();
      require('../../src/background/background');

      expect(events.onAlarm.count()).toBeGreaterThan(0);
      expect(events.onMessage.count()).toBe(1);
      expect(events.onInstalled.count()).toBe(1);
      expect(events.onStartup.count()).toBe(1);
      expect(events.onNotificationClosed.count()).toBe(1);
    });

    test('connects the stream using the stored token', async () => {
      await startWorker();
      expect(sockets).toHaveLength(1);
      expect(liveSocket().url).toContain('fixture-token');
    });

    test('stays disconnected with no token', async () => {
      delete local.pb_token;
      await startWorker();
      expect(sockets).toHaveLength(0);
    });

    test('install creates the alarms that keep the stream healthy', async () => {
      await startWorker();
      await events.onInstalled.fire({ reason: 'install' });
      await settle();

      expect(chromeMock.alarms.create).toHaveBeenCalledWith('keepalive', {
        periodInMinutes: 5,
      });
    });
  });

  describe('keeping the stream connected', () => {
    test('reconnects with a delay after the socket closes', async () => {
      await startWorker();
      liveSocket().onclose({ code: 1006, reason: '' });
      await settle();
      expect(sockets).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(2000);
      expect(sockets).toHaveLength(2);
    });

    test('backs off further with each failed attempt', async () => {
      await startWorker();
      liveSocket().onclose({ code: 1006, reason: '' });
      await jest.advanceTimersByTimeAsync(2000);
      liveSocket().onclose({ code: 1006, reason: '' });
      await jest.advanceTimersByTimeAsync(2000);
      expect(sockets).toHaveLength(2);

      await jest.advanceTimersByTimeAsync(2000);
      expect(sockets).toHaveLength(3);
    });

    test('stays closed when auto-reconnect is off', async () => {
      local.pb_settings = { autoReconnect: false };
      await startWorker();
      liveSocket().onclose({ code: 1006, reason: '' });
      await jest.advanceTimersByTimeAsync(60000);
      expect(sockets).toHaveLength(1);
    });

    test('the keepalive alarm replaces a socket that has gone quiet', async () => {
      await startWorker();
      liveSocket().onopen();
      await settle();

      await jest.advanceTimersByTimeAsync(61000);
      await events.onAlarm.fire({ name: 'keepalive' });
      await settle();

      expect(sockets).toHaveLength(2);
    });

    test('the keepalive alarm leaves a healthy socket alone', async () => {
      await startWorker();
      liveSocket().onopen();
      await settle();

      await events.onAlarm.fire({ name: 'keepalive' });
      await settle();

      expect(sockets).toHaveLength(1);
    });

    test('a restarted worker connects again by itself', async () => {
      await startWorker();
      await startWorker();
      expect(sockets).toHaveLength(2);
    });
  });

  describe('a live push', () => {
    const connected = async () => {
      await startWorker();
      liveSocket().onopen();
      await settle();
    };

    test('creates a desktop notification', async () => {
      await connected();
      await pushArrives(newPush('n1'));

      expect(chromeMock.notifications.create).toHaveBeenCalledTimes(1);
      expect(chromeMock.notifications.create).toHaveBeenCalledWith(
        'push_n1',
        expect.objectContaining({ title: 'Title n1', message: 'Body' })
      );
    });

    test('does not notify again on the next scan', async () => {
      await connected();
      await pushArrives(newPush('n1'));
      await pushArrives(newPush('n1'));
      expect(chromeMock.notifications.create).toHaveBeenCalledTimes(1);
    });

    test('from this browser does not notify', async () => {
      await connected();
      await pushArrives(newPush('n1', { source_device_iden: BROWSER_IDEN }));
      expect(chromeMock.notifications.create).not.toHaveBeenCalled();
    });

    test('of a file notifies without downloading', async () => {
      await connected();
      await pushArrives(
        newPush('f1', {
          type: 'file',
          file_name: 'report.pdf',
          file_url: 'https://example.test/report.pdf',
        })
      );

      expect(chromeMock.downloads.download).not.toHaveBeenCalled();
      expect(chromeMock.notifications.create).toHaveBeenCalledTimes(1);
      expect(chromeMock.notifications.create.mock.calls[0][1].title).toBe(
        'File received'
      );
    });

    test('opens its link in exactly one tab when clicked', async () => {
      await connected();
      await pushArrives(
        newPush('l1', { type: 'link', url: 'https://example.test/l1' })
      );

      await events.onNotificationClicked.fire('push_l1');
      await settle();

      expect(chromeMock.tabs.create).toHaveBeenCalledTimes(1);
      expect(chromeMock.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.test/l1',
      });
    });

    test('with an unsafe link opens the popup instead when clicked', async () => {
      await connected();
      await pushArrives(
        newPush('l1', { type: 'link', url: 'javascript:alert(1)' })
      );

      await events.onNotificationClicked.fire('push_l1');
      await settle();

      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
      expect(chromeMock.action.openPopup).toHaveBeenCalledTimes(1);
    });

    test('leaves nothing stored once its notification is closed', async () => {
      await connected();
      await pushArrives(newPush('n1'));
      expect(local.notification_push_n1).toBeDefined();

      await events.onNotificationClosed.fire('push_n1', true);
      await settle();

      expect(local.notification_push_n1).toBeUndefined();
    });
  });

  describe('a mirrored notification', () => {
    const mirror = (body: string) => ({
      type: 'push',
      push: {
        type: 'mirror',
        title: 'Title',
        body,
        application_name: 'App',
        package_name: 'com.app',
        notification_id: '1',
        notification_tag: 'tag',
        source_device_iden: PHONE_IDEN,
      },
    });

    test('updated on the phone replaces the one on screen', async () => {
      await startWorker();
      liveSocket().onmessage({ data: JSON.stringify(mirror('First')) });
      await settle();
      liveSocket().onmessage({ data: JSON.stringify(mirror('Second')) });
      await settle();

      const ids = chromeMock.notifications.create.mock.calls.map(
        (call: any[]) => call[0]
      );
      expect(ids).toHaveLength(2);
      expect(ids[0]).toBe(ids[1]);
    });

    test('comes back after a worker restart with the same ID', async () => {
      await startWorker();
      liveSocket().onmessage({ data: JSON.stringify(mirror('First')) });
      await settle();
      const id = chromeMock.notifications.create.mock.calls[0][0];

      await startWorker();
      chromeMock.notifications.create.mockClear();
      await events.onStartup.fire();
      await settle();

      expect(chromeMock.notifications.create).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ message: 'First' })
      );
    });
  });

  describe('commands from the popup', () => {
    test('marking a conversation read clears its unread count', async () => {
      local[`sms_data_${PHONE_IDEN}`] = {
        deviceIden: PHONE_IDEN,
        lastSync: 1,
        threads: [
          {
            id: 't1',
            name: 'Someone',
            messages: [],
            lastMessageTime: 100,
            unreadCount: 3,
          },
        ],
      };
      await startWorker();

      const pending = sendCommand({
        cmd: 'MARK_CONVERSATION_READ',
        conversationId: 't1',
      });
      await settle();
      await expect(pending).resolves.toEqual({ success: true });

      expect(local[`sms_data_${PHONE_IDEN}`].threads[0].unreadCount).toBe(0);
    });

    test('an unknown command still leaves the worker running', async () => {
      await startWorker();
      await events.onMessage.fire({ cmd: 'no-such-command' }, {}, jest.fn());
      await settle();
      expect(sockets).toHaveLength(1);
    });
  });

  describe('error reporting', () => {
    test('goes through the real error manager', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await startWorker();
      const { reportError, PBError } = require('../../src/background/errorManager');

      await reportError(PBError.Unknown, { message: 'Test error message' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
