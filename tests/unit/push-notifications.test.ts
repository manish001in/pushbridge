/**
 * Live pushes reach the browser as a stream tickle followed by a history scan.
 * Uses the real socket and notification code, with only the API and tracker faked.
 */
import { notificationBadge } from '../../src/background/notificationBadge';
import { getPushHistory } from '../../src/background/pushManager';
import {
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

describe('desktop notifications for live pushes', () => {
  let stored: Record<string, any>;
  let socket: any;
  const create = () => chrome.notifications.create as jest.Mock;
  const note = (iden: string, extra = {}) => ({
    iden,
    type: 'note',
    title: `Title ${iden}`,
    body: 'Body',
    created: 100,
    modified: 100,
    // The live API puts the user's iden here, not a device's.
    receiver_iden: 'user-iden',
    ...extra,
  });
  const receive = async (...pushes: any[]) => {
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes });
    await initializeWebSocket();
    socket.onmessage({
      data: JSON.stringify({ type: 'tickle', subtype: 'push' }),
    });
    for (let i = 0; i < 40; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stored = {
      pb_token: 'fixture',
      pb_device_iden: 'this-browser',
      pb_settings: {},
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
    chrome.notifications.create = jest.fn().mockResolvedValue('id');
    (chrome as any).tabs = { create: jest.fn().mockResolvedValue({}) };
    (chrome as any).downloads = { download: jest.fn().mockResolvedValue(1) };
    global.WebSocket = jest.fn().mockImplementation(() => {
      socket = { close: jest.fn() };
      return socket;
    }) as any;
    tracker.hasBaseline.mockResolvedValue(true);
    tracker.isNewerThanLastSeen.mockResolvedValue(true);
    tracker.shouldShowNotification.mockResolvedValue(true);
  });

  afterEach(() => disconnectWebSocket());

  test('notifies for a push whose receiver is the user', async () => {
    await receive(note('a'));
    expect(create()).toHaveBeenCalledTimes(1);
    expect(create()).toHaveBeenCalledWith(
      'push_a',
      expect.objectContaining({ title: 'Title a', message: 'Body' })
    );
  });

  test('notifies for a push targeted at this browser', async () => {
    await receive(note('a', { target_device_iden: 'this-browser' }));
    expect(create()).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['sent from this browser', { source_device_iden: 'this-browser' }],
    ['targeted at another device', { target_device_iden: 'phone' }],
    ['sent to another person', { direction: 'outgoing' }],
    ['deleted', { active: false }],
    ['dismissed', { dismissed: true }],
  ])('does not notify for a push %s', async (_name, extra) => {
    await receive(note('a', extra));
    expect(create()).not.toHaveBeenCalled();
  });

  test('counts each push on the badge once', async () => {
    await receive(note('a'));
    expect(notificationBadge.addPushNotifications).toHaveBeenCalledTimes(1);
  });

  test('respects the notification setting but keeps the badge', async () => {
    stored.pb_settings = { notificationsEnabled: false };
    await receive(note('a'));
    expect(create()).not.toHaveBeenCalled();
    expect(notificationBadge.addPushNotifications).toHaveBeenCalledTimes(1);
  });

  test('does not re-notify a push that was already handled', async () => {
    tracker.shouldShowNotification.mockResolvedValue(false);
    await receive(note('a'));
    expect(create()).not.toHaveBeenCalled();
  });

  test('limits how many notifications one scan can raise', async () => {
    const backlog = Array.from({ length: 30 }, (_, i) => note(`p${i}`));
    await receive(...backlog);
    expect(create()).toHaveBeenCalledTimes(10);
    // The rest still count as unread, and stay in Messages.
    expect(notificationBadge.addPushNotifications).toHaveBeenCalledTimes(30);
  });

  describe('received files', () => {
    const file = note('f', {
      type: 'file',
      title: undefined,
      file_name: 'report.pdf',
      file_type: 'application/pdf',
      file_url: 'https://example.test/report.pdf',
    });

    test('notify without downloading', async () => {
      await receive(file);
      expect(chrome.downloads.download).not.toHaveBeenCalled();
      expect(create()).toHaveBeenCalledTimes(1);
      expect(create()).toHaveBeenCalledWith(
        'push_f',
        expect.objectContaining({
          title: 'File received',
          message: 'report.pdf',
        })
      );
    });

    test('are recorded as received', async () => {
      await receive(file);
      expect(stored.pb_transfers).toEqual([
        expect.objectContaining({
          id: 'f',
          type: 'received',
          fileName: 'report.pdf',
        }),
      ]);
    });
  });

  describe('links', () => {
    const link = note('l', {
      type: 'link',
      title: 'A link',
      url: 'https://example.test/l',
    });

    test('notify when auto-open is off, and remember the URL for clicks', async () => {
      await receive(link);
      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(create()).toHaveBeenCalledTimes(1);
      expect(stored.notification_push_l.url).toBe('https://example.test/l');
    });

    test('do not also notify when the link opened in a tab', async () => {
      stored.pb_settings = { autoOpenPushLinksAsTab: true };
      await receive(link);
      expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
      expect(create()).not.toHaveBeenCalled();
    });

    test('with an unsafe URL are not clickable', async () => {
      await receive({ ...link, url: 'javascript:alert(1)' });
      expect(create()).toHaveBeenCalledTimes(1);
      expect(stored.notification_push_l.url).toBeUndefined();
    });
  });
});
