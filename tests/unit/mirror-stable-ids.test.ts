/**
 * Android re-posts a notification when it updates (progress, new message count).
 * Each update must replace the desktop notification rather than add another.
 */
import {
  getActiveMirrors,
  handleMirror,
  handleRemoteDismiss,
} from '../../src/background/mirrorManager';
import { notificationBadge } from '../../src/background/notificationBadge';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

jest.mock('../../src/background/notificationBadge', () => ({
  notificationBadge: { addPushNotifications: jest.fn() },
}));
jest.mock('../../src/background/unifiedNotificationTracker', () => ({
  unifiedNotificationTracker: {
    markAsProcessed: jest.fn(),
    getLastSeenMs: jest.fn(),
    shouldShowNotification: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock('../../src/background/smsBridge', () => ({
  addMessageToThread: jest.fn(),
}));
jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
}));

describe('mirrored notification identity', () => {
  let stored: Record<string, any>;
  const mirror = (extra = {}) =>
    ({
      type: 'mirror',
      title: 'Title',
      body: 'Body',
      application_name: 'App',
      package_name: 'com.app',
      notification_id: '1',
      notification_tag: 'tag',
      source_device_iden: 'phone',
      ...extra,
    }) as any;
  const create = () => chrome.notifications.create as jest.Mock;
  const addToBadge = notificationBadge.addPushNotifications as jest.Mock;
  const lastSeen = unifiedNotificationTracker.getLastSeenMs as jest.Mock;
  const ids = () => create().mock.calls.map(call => call[0]);

  beforeEach(() => {
    jest.clearAllMocks();
    stored = {};
    lastSeen.mockResolvedValue(0);
    chrome.notifications.create = jest.fn().mockResolvedValue('id');
    chrome.notifications.clear = jest.fn().mockResolvedValue(true);
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      const result = key === null ? { ...stored } : { [key]: stored[key] };
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

  test('an update replaces the notification instead of adding one', async () => {
    await handleMirror(mirror({ body: 'First' }));
    await handleMirror(mirror({ body: 'Second' }));

    expect(new Set(ids()).size).toBe(1);
    const active = await getActiveMirrors();
    expect(active).toHaveLength(1);
    expect(active[0].meta.body).toBe('Second');
  });

  test('an update counts once on the badge', async () => {
    await handleMirror(mirror());
    await handleMirror(mirror());
    expect(addToBadge).toHaveBeenCalledTimes(1);
  });

  test('updates arriving together count once on the badge', async () => {
    await Promise.all([handleMirror(mirror()), handleMirror(mirror())]);
    expect(addToBadge).toHaveBeenCalledTimes(1);
    expect(await getActiveMirrors()).toHaveLength(1);
  });

  test('an update after the user opened the popup counts as new', async () => {
    await handleMirror(mirror());
    lastSeen.mockResolvedValue(Date.now() + 1000);
    const later = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 2000);
    await handleMirror(mirror());
    later.mockRestore();
    expect(addToBadge).toHaveBeenCalledTimes(2);
  });

  test('a dismissal after updates clears it and releases the badge once', async () => {
    await handleMirror(mirror());
    await handleMirror(mirror());
    await handleRemoteDismiss({
      type: 'dismissal',
      package_name: 'com.app',
      notification_id: '1',
      notification_tag: 'tag',
      source_user_iden: 'user',
    });

    expect(chrome.notifications.clear).toHaveBeenCalledTimes(1);
    expect(await getActiveMirrors()).toHaveLength(0);
    expect(addToBadge).toHaveBeenLastCalledWith(-1);
    expect(addToBadge).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['device', { source_device_iden: 'tablet' }],
    ['package', { package_name: 'com.other' }],
    ['notification ID', { notification_id: '2' }],
    ['tag', { notification_tag: 'other' }],
    ['missing tag', { notification_tag: undefined }],
  ])('a different %s is a different notification', async (_name, extra) => {
    await handleMirror(mirror());
    await handleMirror(mirror(extra));
    expect(new Set(ids()).size).toBe(2);
  });

  test('separators inside fields cannot make two IDs collide', async () => {
    await handleMirror(mirror({ package_name: 'a:b', notification_id: 'c' }));
    await handleMirror(mirror({ package_name: 'a', notification_id: 'b:c' }));
    expect(new Set(ids()).size).toBe(2);
  });

  test('the ID stays the same across a worker restart', async () => {
    await handleMirror(mirror());
    const first = ids()[0];
    let second = '';
    await jest.isolateModulesAsync(async () => {
      const fresh = await import('../../src/background/mirrorManager');
      await fresh.handleMirror(mirror());
      second = ids()[1];
    });
    expect(second).toBe(first);
  });

  test('an updated mirrored SMS keeps one notification too', async () => {
    const sms = mirror({ application_name: 'SMS' });
    await handleMirror(sms);
    await handleMirror(sms);
    expect(new Set(ids()).size).toBe(1);
  });
});
