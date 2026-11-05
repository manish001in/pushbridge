/**
 * Uses the real tracker: a backlog must not look new again on the next scan once
 * it has aged out of the 50-entry ID cache, or its links reopen.
 */
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

describe('rescanning pushes that were already handled', () => {
  let socket: any;
  const start = Date.now() / 1000 - 3600;
  const links = (from: number, to: number) => {
    const pushes = [];
    for (let i = to; i >= from; i--) {
      pushes.push({
        iden: `p${i}`,
        type: 'link',
        url: `https://example.test/${i}`,
        created: start + i,
        receiver_iden: 'user',
      });
    }
    return pushes;
  };
  const scan = async () => {
    await initializeWebSocket();
    socket.onopen();
    for (let i = 0; i < 40; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    disconnectWebSocket();
  };

  test('a full page processed once is never processed again', async () => {
    const stored: Record<string, any> = {
      pb_token: 'fixture',
      pb_device_iden: 'chrome-device',
      pb_settings: { autoOpenPushLinksAsTab: true },
    };
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      const result = { [key]: stored[key] };
      cb?.(result);
      return Promise.resolve(result);
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

    await unifiedNotificationTracker.markAsSeen((start - 100) * 1000);

    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: links(1, 50) });
    await scan();
    const firstScan = (chrome.tabs.create as jest.Mock).mock.calls.length;
    expect(firstScan).toBe(10);

    // One new push arrives, which evicts an old ID from the cache.
    (chrome.tabs.create as jest.Mock).mockClear();
    (getPushHistory as jest.Mock).mockResolvedValue({ pushes: links(2, 51) });
    await scan();
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/51',
      active: false,
    });

    // Nothing new: nothing opens.
    (chrome.tabs.create as jest.Mock).mockClear();
    await scan();
    expect(chrome.tabs.create).not.toHaveBeenCalled();

    // An older push that was never handled is not lost because newer ones were
    // handled first (the API sorts by modified time, not creation).
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: [
        {
          iden: 'edited-later',
          type: 'link',
          url: 'https://example.test/edited-later',
          created: start + 0.5,
          modified: start + 60,
          receiver_iden: 'user',
        },
      ],
    });
    await scan();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/edited-later',
      active: false,
    });

    // Two pushes in the same millisecond are both handled.
    (chrome.tabs.create as jest.Mock).mockClear();
    (getPushHistory as jest.Mock).mockResolvedValue({
      pushes: ['same-a', 'same-b'].map(iden => ({
        iden,
        type: 'link',
        url: `https://example.test/${iden}`,
        created: start + 70,
        modified: start + 70,
        receiver_iden: 'user',
      })),
    });
    await scan();
    expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
  });
});
