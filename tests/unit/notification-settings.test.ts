/**
 * Issues #5 and #6: the notification settings must change what is shown, while
 * syncing and the badge keep working.
 */
import {
  cleanupExpiredMirrors,
  handleMirror,
  handleUserDismissal,
  isMirrorNotificationId,
  reconstructMirrors,
} from '../../src/background/mirrorManager';
import { notificationBadge } from '../../src/background/notificationBadge';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

jest.mock('../../src/background/notificationBadge', () => ({
  notificationBadge: { addPushNotifications: jest.fn() },
}));
jest.mock('../../src/background/unifiedNotificationTracker', () => ({
  unifiedNotificationTracker: {
    markAsProcessed: jest.fn(),
    getLastSeenMs: jest.fn().mockResolvedValue(0),
    shouldShowNotification: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock('../../src/background/smsBridge', () => ({}), { virtual: true });
jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
}));

describe('notification settings', () => {
  let stored: Record<string, any>;
  const mirror = {
    type: 'mirror',
    title: 'Title',
    body: 'Body',
    application_name: 'App',
    package_name: 'com.app',
    notification_id: '1',
    source_device_iden: 'phone',
  } as any;
  const create = () => chrome.notifications.create as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = {};
    chrome.notifications.create = jest.fn().mockResolvedValue('id');
    chrome.notifications.clear = jest.fn().mockResolvedValue(true);
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      const result =
        key === null
          ? { ...stored }
          : typeof key === 'string'
            ? { [key]: stored[key] }
            : stored;
      cb?.(result);
      return Promise.resolve(result);
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((values, cb) => {
      Object.assign(stored, values);
      cb?.();
      return Promise.resolve();
    });
    (chrome.storage.local.remove as jest.Mock).mockImplementation((key, cb) => {
      delete stored[key];
      cb?.();
      return Promise.resolve();
    });
  });

  const options = () => create().mock.calls[0][1];

  test('defaults keep today’s behaviour: sticky with sound', async () => {
    await handleMirror(mirror);
    expect(options().requireInteraction).toBe(true);
    expect(options().silent).toBe(false);
  });

  test.each([
    ['notifications off', { notificationsEnabled: false }],
    ['mirrored notifications off', { mirrorNotificationsEnabled: false }],
  ])(
    '%s: no desktop notification, badge still counts',
    async (_n, settings) => {
      stored.pb_settings = settings;
      await handleMirror(mirror);
      expect(create()).not.toHaveBeenCalled();
      expect(notificationBadge.addPushNotifications).toHaveBeenCalledWith(1);
    }
  );

  test('sound off makes notifications silent', async () => {
    stored.pb_settings = { soundEnabled: false };
    await handleMirror(mirror);
    expect(options().silent).toBe(true);
  });

  test('auto-dismiss stops notifications from sticking', async () => {
    stored.pb_settings = { autoDismissNotifications: true };
    await handleMirror(mirror);
    expect(options().requireInteraction).toBe(false);
  });

  test.each([
    ['notifications off', { notificationsEnabled: false }],
    ['mirrored notifications off', { mirrorNotificationsEnabled: false }],
    ['auto-dismiss on', { autoDismissNotifications: true }],
  ])(
    'restart does not bring notifications back with %s',
    async (_n, settings) => {
      stored.pb_settings = settings;
      stored.mirror_x = {
        title: 'T',
        body: 'B',
        expiresAt: Date.now() + 1000,
      };
      await handleMirror(mirror);
      create().mockClear();
      await reconstructMirrors();
      expect(create()).not.toHaveBeenCalled();
    }
  );

  test('expiring a mirror also clears its visible notification', async () => {
    await handleMirror(mirror);
    const key = Object.keys(stored).find(k => k !== 'pb_settings')!;
    const id = create().mock.calls[0][0];
    stored[key].expiresAt = 1;
    await cleanupExpiredMirrors();
    expect(chrome.notifications.clear).toHaveBeenCalledWith(id);
    expect(stored[key]).toBeUndefined();
  });

  describe('closing a mirror notification', () => {
    const closeMirror = async () => {
      await handleMirror(mirror);
      (notificationBadge.addPushNotifications as jest.Mock).mockClear();
      return create().mock.calls[0][0];
    };

    test('a failed phone dismissal still removes it locally', async () => {
      stored.pb_user_iden = 'user';
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      const id = await closeMirror();
      await handleUserDismissal(id);
      expect(await isMirrorNotificationId(id)).toBe(false);
      expect(notificationBadge.addPushNotifications).toHaveBeenCalledWith(-1);
    });

    test('a mirror from before the popup was opened leaves the badge alone', async () => {
      const id = await closeMirror();
      (
        unifiedNotificationTracker.getLastSeenMs as jest.Mock
      ).mockResolvedValueOnce(Date.now() + 1000);
      await handleUserDismissal(id);
      expect(notificationBadge.addPushNotifications).not.toHaveBeenCalled();
    });
  });

  test('generated mirror IDs are recognized by their stored record', async () => {
    await handleMirror(mirror);
    const id = create().mock.calls[0][0];
    expect(id).not.toHaveLength(36);
    expect(await isMirrorNotificationId(id)).toBe(true);
    expect(await isMirrorNotificationId('push_abc')).toBe(false);
  });
});
