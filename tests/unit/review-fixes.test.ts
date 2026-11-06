/** Smaller behaviours: partial lists, stale answers and notifications that fail. */
import { getDevices } from '../../src/background/deviceManager';
import { httpClient } from '../../src/background/httpClient';
import { showPushNotification } from '../../src/background/pushNotifications';
import { rateLimitManager } from '../../src/background/rateLimitManager';
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

describe('token revocation', () => {
  test('a token saved while the check ran is left alone', async () => {
    const tokens = ['old', 'new'];
    local.mockImplementation(async (key: string) =>
      key === 'pb_token' ? tokens.shift() : undefined
    );
    (chrome.storage.local.set as jest.Mock).mockClear();
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await checkTokenHealth();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  test('the token actually checked is cleared', async () => {
    local.mockImplementation(async (key: string) =>
      key === 'pb_token' ? 'same' : undefined
    );
    (chrome.storage.local.set as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await checkTokenHealth();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      pb_token: '',
      pb_device_iden: '',
    });
  });
});

describe('quota', () => {
  const headers = (remaining: number, resetInSeconds: number) =>
    ({
      headers: {
        get: (name: string) =>
          ({
            'X-Ratelimit-Limit': '16384',
            'X-Ratelimit-Remaining': String(remaining),
            'X-Ratelimit-Reset': String(
              Math.floor(Date.now() / 1000) + resetInSeconds
            ),
          })[name] ?? null,
      },
    }) as any;

  afterEach(async () => {
    await rateLimitManager.clearState();
  });

  test('a 429 with no quota left waits for the reset, not just the backoff', () => {
    rateLimitManager.parseHeaders(headers(0, 600));
    rateLimitManager.startBackoff();
    expect(rateLimitManager.getBackoffRemainingSeconds()).toBeGreaterThan(590);
  });

  test('a far-off reset is not trusted beyond the API window', () => {
    rateLimitManager.parseHeaders(headers(0, 100000));
    rateLimitManager.startBackoff();
    expect(rateLimitManager.getBackoffRemainingSeconds()).toBeLessThanOrEqual(960);
  });

  test('a 429 with quota left uses the normal backoff', () => {
    rateLimitManager.parseHeaders(headers(9000, 600));
    rateLimitManager.startBackoff();
    expect(rateLimitManager.getBackoffRemainingSeconds()).toBeLessThan(60);
  });

  test('low quota is noticed, and ends when the period does', () => {
    rateLimitManager.parseHeaders(headers(1000, 600));
    expect(rateLimitManager.isQuotaLow()).toBe(true);
    rateLimitManager.parseHeaders(headers(5000, 600));
    expect(rateLimitManager.isQuotaLow()).toBe(false);
    rateLimitManager.parseHeaders(headers(1000, -5));
    expect(rateLimitManager.isQuotaLow()).toBe(false);
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
