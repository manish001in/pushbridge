/**
 * Pushes sent while the computer sleeps produce no stream event, so connecting
 * has to catch up. Covers issue #9 and link safety.
 */
import { getPushHistory } from '../../src/background/pushManager';
import {
  connectOnWorkerStart,
  disconnectWebSocket,
  initializeWebSocket,
} from '../../src/background/socket';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

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
    for (let i = 0; i < 5; i++) await settle();
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
