/** Smaller behaviours: partial lists, stale answers and notifications that fail. */
import { getDevices } from '../../src/background/deviceManager';
import { httpClient } from '../../src/background/httpClient';
import { showPushNotification } from '../../src/background/pushNotifications';
import { getLocal, setLocal } from '../../src/background/storage';
import { checkTokenHealth } from '../../src/background/tokenHealth';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
}));
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
  removeLocal: jest.fn(),
  clearLocal: jest.fn(),
}));

const fetchMock = httpClient.fetch as jest.Mock;
const local = getLocal as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  local.mockImplementation(async (key: string) =>
    key === 'pb_token' ? 'token' : undefined
  );
  (setLocal as jest.Mock).mockResolvedValue(undefined);
});

describe('device list paging', () => {
  test('a list that never ends fails, so the cached list is kept', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ devices: [{ iden: 'd' }], cursor: 'more' }),
    });
    await expect(getDevices(true)).rejects.toThrow(/pages/);
  });
});

describe('token health check', () => {
  test('a 401 for a token since replaced does not revoke the new one', async () => {
    const tokens = ['old', 'new'];
    local.mockImplementation(async (key: string) =>
      key === 'pb_token' ? (tokens.shift() ?? 'new') : undefined
    );
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await checkTokenHealth();
    expect(setLocal).not.toHaveBeenCalledWith('pb_token', expect.anything());
    expect(chrome.notifications.create).not.toHaveBeenCalled();
  });
});

describe('notifications that fail', () => {
  test('showPushNotification reports the failure to its caller', async () => {
    (chrome.notifications.create as jest.Mock) = jest
      .fn()
      .mockRejectedValue(new Error('no'));
    await expect(
      showPushNotification({
        iden: 'p',
        type: 'note',
        title: 't',
        body: 'b',
        created: 1,
      })
    ).rejects.toThrow('no');
  });

  test('a released claim can be claimed again', async () => {
    const id = `claim-${Date.now()}`;
    const claim = () =>
      unifiedNotificationTracker.claimNotification({
        id,
        type: 'sms',
        created: Date.now(),
      } as any);
    await unifiedNotificationTracker.initialize();
    const first = await claim();
    unifiedNotificationTracker.releaseClaim('sms', id);
    expect(await claim()).toBe(first);
  });
});
