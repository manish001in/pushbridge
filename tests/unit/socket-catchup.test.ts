/**
 * Pushes sent while the computer sleeps produce no stream event, so connecting
 * has to catch up. Covers issue #9 and link safety.
 */
import { getPushHistory } from '../../src/background/pushManager';
import { rateLimitManager } from '../../src/background/rateLimitManager';
import {
  connectOnWorkerStart,
  disconnectWebSocket,
  initializeWebSocket,
  restorePushScanAlarm,
  resumePushScan,
} from '../../src/background/socket';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

jest.mock('../../src/background/pushNotifications', () => ({
  ...jest.requireActual('../../src/background/pushNotifications'),
  showPushNotification: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../src/background/pushManager', () => ({
  getPushHistory: jest.fn(),
}));
jest.mock('../../src/background/simpleSmsSync', () => ({
  syncAllSmsData: jest.fn(),
}));
jest.mock('../../src/background/deviceManager', () => ({
  getDevices: jest.fn(),
  getDefaultSmsDevice: jest.fn(),
}));
jest.mock('../../src/background/contactManager', () => ({
  getContacts: jest.fn(),
}));
jest.mock('../../src/background/mirrorManager', () => ({
  handleMirror: jest.fn(),
  handleRemoteDismiss: jest.fn(),
}));
jest.mock('../../src/background/notificationBadge', () => ({
  notificationBadge: { addPushNotifications: jest.fn() },
}));
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: { Unknown: 'unknown' },
}));
jest.mock('../../src/background/unifiedNotificationTracker', () => ({
  unifiedNotificationTracker: {
    hasBaseline: jest.fn(),
    isNewerThanLastSeen: jest.fn(),
    markAsSeen: jest.fn(),
    shouldShowNotification: jest.fn(),
    markAsProcessed: jest.fn(),
    wasProcessed: jest.fn().mockReturnValue(false),
  },
}));

const tracker = unifiedNotificationTracker as jest.Mocked<
  typeof unifiedNotificationTracker
>;

describe('catching up when the stream connects', () => {
  let stored: Record<string, any>;
  let socket: any;
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const link = (iden: string, extra = {}) => ({
    iden,
    type: 'link',
    url: `https://example.test/${iden}`,
    created: 100,
    modified: 100,
    receiver_iden: 'user',
    ...extra,
  });
  const connect = async () => {
    await initializeWebSocket();
    socket.onopen();
    for (let i = 0; i < 40; i++) await settle();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stored = {
      pb_token: 'fixture',
      pb_device_iden: 'chrome-device',
      pb_settings: { autoOpenPushLinksAsTab: true },
    };
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      cb?.({ [key]: stored[key] });
      return Promise.resolve({ [key]: stored[key] });
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((values, cb) => {
      Object.assign(stored, values);
      cb?.();
      return Promise.resolve();
    });
    (chrome as any).tabs = { create: jest.fn().mockResolvedValue({}) };
    global.WebSocket = jest.fn().mockImplementation(() => {
      socket = { close: jest.fn() };
      return socket;
    }) as any;
    tracker.hasBaseline.mockResolvedValue(true);
    tracker.isNewerThanLastSeen.mockResolvedValue(true);
    tracker.shouldShowNotification.mockResolvedValue(true);
  });

  afterEach(() => disconnectWebSocket());

  test('opens links pushed while disconnected, when auto-open is on', async () => {
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: [link('a')] });
    await connect();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/a',
      active: false,
    });
    expect(tracker.markAsProcessed).toHaveBeenCalledTimes(1);
  });

  test('leaves links alone when auto-open is off', async () => {
    stored.pb_settings = {};
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: [link('a')] });
    await connect();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(tracker.markAsProcessed).toHaveBeenCalledTimes(1);
  });

  test('does not open the whole account history without a baseline', async () => {
    tracker.hasBaseline.mockResolvedValue(false);
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: [link('a')] });
    await connect();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(tracker.markAsSeen).toHaveBeenCalled();
  });

  test('limits how many tabs a backlog opens at once', async () => {
    const pushes = Array.from({ length: 25 }, (_, i) => link(`p${i}`));
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes });
    await connect();
    expect(chrome.tabs.create).toHaveBeenCalledTimes(10);
    expect(tracker.markAsProcessed).toHaveBeenCalledTimes(25);
  });

  test.each([
    ['sent to another device', { target_device_iden: 'phone' }],
    ['sent to another person', { direction: 'outgoing' }],
    ['sent from this browser', { source_device_iden: 'chrome-device' }],
    ['not a web link', { url: 'javascript:alert(1)' }],
    ['a file: link', { url: 'file:///etc/passwd' }],
  ])('does not open a link %s', async (_name, extra) => {
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: [link('a', extra)],
    });
    await connect();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  test('after time away, shows 10 notifications and one summary of the rest', async () => {
    const shown = jest.requireMock('../../src/background/pushNotifications');
    (shown.showPushNotification as jest.Mock).mockResolvedValue(true);
    chrome.notifications.create = jest.fn().mockResolvedValue('id');
    const notes = Array.from({ length: 25 }, (_, i) =>
      link(`n${i}`, { type: 'note', url: undefined })
    );
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: notes });
    await connect();
    expect(shown.showPushNotification).toHaveBeenCalledTimes(10);
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      'push_backlog_summary',
      expect.objectContaining({ message: expect.stringContaining('15 more') })
    );
  });

  test('opens a link targeted at this browser', async () => {
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: [link('a', { target_device_iden: 'chrome-device' })],
    });
    await connect();
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
  });

  test('follows pages until reaching pushes that are already handled', async () => {
    (getPushHistory as jest.Mock)
      .mockResolvedValueOnce({ pushes: [link('new')], cursor: 'next' })
      .mockResolvedValueOnce({ pushes: [link('older')] });
    await connect();
    expect(getPushHistory).toHaveBeenCalledTimes(2);
    expect((getPushHistory as jest.Mock).mock.calls[1][2]).toBe('next');
    expect(tracker.markAsProcessed).toHaveBeenCalledTimes(2);
  });

  test('stops paging once a page reaches handled pushes', async () => {
    tracker.isNewerThanLastSeen.mockResolvedValue(false);
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: [link('old')],
      cursor: 'next',
    });
    await connect();
    expect(getPushHistory).toHaveBeenCalledTimes(1);
  });

  test('processes in creation order, whatever order the API returns', async () => {
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: [
        link('edited-old', { created: 50, modified: 200 }),
        link('newest', { created: 300, modified: 150 }),
        link('oldest', { created: 10, modified: 100 }),
      ],
    });
    await connect();
    expect(tracker.markAsProcessed.mock.calls.map(call => call[1])).toEqual([
      'oldest',
      'edited-old',
      'newest',
    ]);
  });

  test('skips pushes that were already handled', async () => {
    tracker.shouldShowNotification.mockResolvedValue(false);
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: [link('a')] });
    await connect();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  describe('a scan too long for one pass', () => {
    const note = (i: number) =>
      link(`n${i}`, {
        type: 'note',
        url: undefined,
        modified: 1000 - i,
        created: 1000 - i,
      });
    /** Pages of `size`, newest first, each pointing at the next by number. */
    const serve = (total: number, size = 1) =>
      (getPushHistory as jest.Mock).mockImplementation(
        async (_limit: number, since: number, cursor: string) => {
          const rows = Array.from({ length: total }, (_, i) => note(i)).filter(
            push => push.modified > since
          );
          const start = Number(cursor || 0);
          return {
            pushes: rows.slice(start, start + size),
            ...(start + size < rows.length
              ? { cursor: String(start + size) }
              : {}),
          };
        }
      );
    const showPush = () =>
      jest.requireMock('../../src/background/pushNotifications')
        .showPushNotification as jest.Mock;
    const pass = async () => {
      await resumePushScan();
      for (let i = 0; i < 20; i++) await settle();
    };

    beforeEach(() => {
      const handled = new Set<string>();
      tracker.shouldShowNotification.mockImplementation(
        async ({ id }: any) => !handled.has(id)
      );
      tracker.markAsProcessed.mockImplementation(async (_type: any, id: any) => {
        handled.add(id);
      });
      showPush().mockReset();
      showPush().mockResolvedValue(true);
      (chrome.alarms.get as jest.Mock).mockResolvedValue(undefined);
      (chrome.notifications.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue('id');
    });

    test('nothing older is skipped: the watermark waits for the end', async () => {
      serve(7);
      await connect();
      expect(getPushHistory).toHaveBeenCalledTimes(5);
      expect(stored.pb_push_scan_watermark).toBeUndefined();
      expect(stored.pb_push_scan_progress.cursor).toBe('5');
      expect(chrome.alarms.create).toHaveBeenCalledWith('pb_push_scan_resume', {
        delayInMinutes: 1,
      });

      await pass();
      expect(getPushHistory).toHaveBeenCalledWith(50, 0, '6');
      expect(tracker.markAsProcessed).toHaveBeenCalledTimes(7);
      expect(stored.pb_push_scan_watermark).toBe(1000);
      expect(stored.pb_push_scan_progress).toBeNull();
    });

    test('an empty page with a cursor is not the end', async () => {
      (getPushHistory as jest.Mock)
        .mockResolvedValueOnce({ pushes: [note(0)], cursor: 'a' })
        .mockResolvedValueOnce({ pushes: [], cursor: 'b' })
        .mockResolvedValueOnce({ pushes: [note(1)] });
      await connect();
      expect(getPushHistory).toHaveBeenCalledTimes(3);
      expect(tracker.markAsProcessed).toHaveBeenCalledTimes(2);
    });

    test('a reconnect or tickle during the scan reads nothing', async () => {
      serve(7);
      await connect();
      (getPushHistory as jest.Mock).mockClear();
      socket.onmessage({
        data: JSON.stringify({ type: 'tickle', subtype: 'push' }),
      });
      for (let i = 0; i < 20; i++) await settle();
      expect(getPushHistory).not.toHaveBeenCalled();
    });

    test('low quota pauses it, and it stays reachable', async () => {
      serve(7);
      await connect();
      (getPushHistory as jest.Mock).mockClear();
      const low = jest.spyOn(rateLimitManager, 'isQuotaLow').mockReturnValue(true);
      await pass();
      expect(getPushHistory).not.toHaveBeenCalled();
      expect(stored.pb_push_scan_progress.cursor).toBe('5');
      low.mockRestore();
      await pass();
      expect(stored.pb_push_scan_progress).toBeNull();
    });

    test('notification limits apply across the whole scan', async () => {
      serve(60, 5);
      await connect();
      await pass();
      await pass();
      expect(showPush()).toHaveBeenCalledTimes(10);
      expect(stored.pb_push_scan_progress).toBeNull();
      const summary = (chrome.notifications.create as jest.Mock).mock.calls
        .filter(call => call[0] === 'push_backlog_summary')
        .pop();
      expect(summary).toBeDefined();
    });

    test('a push that failed to show keeps the watermark behind it', async () => {
      showPush().mockRejectedValueOnce(new Error('no'));
      (getPushHistory as jest.Mock).mockResolvedValue({
        pushes: [note(0), note(5)],
      });
      await connect();
      // The older one was processed first, and it's the one that failed.
      expect(stored.pb_push_scan_watermark).toBe(994);
    });

    test('a resumed pass that fails sets its alarm again', async () => {
      serve(7);
      await connect();
      expect(stored.pb_push_scan_progress.cursor).toBe('5');
      (chrome.alarms.create as jest.Mock).mockClear();
      (getPushHistory as jest.Mock).mockRejectedValueOnce(new TypeError('down'));
      await pass();
      expect(stored.pb_push_scan_progress.cursor).toBe('5');
      expect(chrome.alarms.create).toHaveBeenCalledWith('pb_push_scan_resume', {
        delayInMinutes: 1,
      });
    });

    test('a first pass that fails is saved and retried by the alarm', async () => {
      (getPushHistory as jest.Mock).mockRejectedValueOnce(new TypeError('down'));
      await connect();
      expect(stored.pb_push_scan_progress.cursor).toBe('');
      expect(chrome.alarms.create).toHaveBeenCalledWith('pb_push_scan_resume', {
        delayInMinutes: 1,
      });

      serve(2);
      await pass();
      expect(tracker.markAsProcessed).toHaveBeenCalledTimes(2);
      expect(stored.pb_push_scan_progress).toBeNull();
    });

    test('a failure partway restarts from before the pass, skipping nothing', async () => {
      (getPushHistory as jest.Mock)
        .mockResolvedValueOnce({ pushes: [note(0)], cursor: 'later' })
        .mockRejectedValueOnce(new TypeError('down'));
      await connect();
      expect(stored.pb_push_scan_progress.cursor).toBe('');
    });

    test('a notification that failed comes back through the alarm', async () => {
      showPush().mockRejectedValueOnce(new Error('no'));
      serve(1);
      await connect();
      expect(chrome.alarms.create).toHaveBeenCalledWith('pb_push_scan_resume', {
        delayInMinutes: 1,
      });
      expect(tracker.markAsProcessed).not.toHaveBeenCalled();

      await pass();
      expect(showPush()).toHaveBeenCalledTimes(2);
      expect(tracker.markAsProcessed).toHaveBeenCalledTimes(1);
      expect(stored.pb_push_scan_progress).toBeNull();
    });

    test('one that keeps failing is eventually let go', async () => {
      showPush().mockRejectedValue(new Error('no'));
      serve(1);
      await connect();
      for (let i = 0; i < 6; i++) await pass();
      expect(stored.pb_push_scan_progress).toBeNull();
      expect(stored.pb_push_scan_watermark).toBe(1000);
    });

    test('a summary that fails is kept, and the rest stays recoverable', async () => {
      (chrome.notifications.create as jest.Mock).mockRejectedValueOnce(
        new Error('no')
      );
      (getPushHistory as jest.Mock).mockResolvedValue({
        pushes: Array.from({ length: 12 }, (_, i) => note(i)),
      });
      await connect();
      expect(stored.pb_push_summary_unshown).toBe(2);
      expect(chrome.alarms.create).toHaveBeenCalledWith('pb_push_scan_resume', {
        delayInMinutes: 1,
      });

      await pass();
      expect(chrome.notifications.create).toHaveBeenLastCalledWith(
        'push_backlog_summary',
        expect.objectContaining({ message: expect.stringContaining('2 more') })
      );
      expect(stored.pb_push_summary_unshown).toBe(0);
    });

    test('at worker start, saved work gets its alarm back', async () => {
      stored.pb_push_scan_progress = { cursor: '5' };
      (chrome.alarms.create as jest.Mock).mockClear();
      await restorePushScanAlarm();
      expect(chrome.alarms.create).toHaveBeenCalledTimes(1);
    });

    test('later scans ask only for what changed', async () => {
      (getPushHistory as jest.Mock).mockResolvedValue({ pushes: [note(0)] });
      await connect();
      (getPushHistory as jest.Mock).mockClear();
      socket.onmessage({
        data: JSON.stringify({ type: 'tickle', subtype: 'push' }),
      });
      for (let i = 0; i < 20; i++) await settle();
      expect((getPushHistory as jest.Mock).mock.calls[0][1]).toBe(995);
    });
  });
});

describe('reconnecting', () => {
  let stored: Record<string, any>;
  let sockets: any[];

  beforeEach(() => {
    jest.useFakeTimers();
    sockets = [];
    stored = { pb_token: 'fixture', pb_settings: {} };
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      cb?.({ [key]: stored[key] });
      return Promise.resolve({ [key]: stored[key] });
    });
    global.WebSocket = jest.fn().mockImplementation(() => {
      const socket = { close: jest.fn() };
      sockets.push(socket);
      return socket;
    }) as any;
  });

  afterEach(() => {
    disconnectWebSocket();
    jest.useRealTimers();
  });

  const closeSocket = async (socket: any) => {
    await socket.onclose({ code: 1006, reason: '' });
    await jest.advanceTimersByTimeAsync(120000);
  };

  test('reconnects after a dropped connection by default', async () => {
    await initializeWebSocket();
    await closeSocket(sockets[0]);
    expect(sockets.length).toBeGreaterThan(1);
  });

  test('stays disconnected when auto-reconnect is off', async () => {
    stored.pb_settings = { autoReconnect: false };
    await initializeWebSocket();
    await closeSocket(sockets[0]);
    expect(sockets).toHaveLength(1);
  });

  test('with auto-reconnect off, a worker restart does not reconnect', async () => {
    stored.pb_settings = { autoReconnect: false };
    let started = false;
    (chrome.storage.session.get as jest.Mock).mockImplementation((_key, cb) =>
      cb({ pb_stream_started: started })
    );
    (chrome.storage.session.set as jest.Mock).mockImplementation((_v, cb) => {
      started = true;
      cb();
    });
    await connectOnWorkerStart();
    expect(sockets).toHaveLength(1);
    await connectOnWorkerStart();
    expect(sockets).toHaveLength(1);
  });

  test('disconnecting does not schedule a reconnect', async () => {
    await initializeWebSocket();
    disconnectWebSocket();
    expect(sockets[0].onclose).toBeNull();
    await jest.advanceTimersByTimeAsync(120000);
    expect(sockets).toHaveLength(1);
  });

  test('never logs the token-bearing stream URL', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await initializeWebSocket();
    expect(JSON.stringify(log.mock.calls)).not.toContain('fixture');
    log.mockRestore();
  });
});
