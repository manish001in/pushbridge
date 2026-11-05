import { getCachedSmsState } from '../../src/popup/smsState';

describe('getCachedSmsState', () => {
  let stored: Record<string, unknown>;
  const phone = (iden: string, extra = {}) => ({
    iden,
    nickname: iden,
    active: true,
    has_sms: true,
    ...extra,
  });

  beforeEach(() => {
    stored = {};
    global.fetch = jest.fn();
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      cb?.({ [key]: stored[key] });
      return Promise.resolve({ [key]: stored[key] });
    });
  });

  test('uses an expired cache without touching the network', async () => {
    stored.pb_device_cache = { devices: [phone('a')], lastFetched: 1 };
    const state = await getCachedSmsState();
    expect(state.device?.iden).toBe('a');
    expect(state.isStale).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('is stale with no cache at all', async () => {
    expect(await getCachedSmsState()).toEqual({ device: null, isStale: true });
  });

  test('prefers the stored default and skips ineligible devices', async () => {
    stored.pb_device_cache = {
      devices: [
        phone('a'),
        phone('b'),
        phone('c', { has_sms: false }),
        phone('d', { active: false }),
      ],
      lastFetched: Date.now(),
    };
    stored.defaultSmsDevice = 'b';
    const state = await getCachedSmsState();
    expect(state.device?.iden).toBe('b');
    expect(state.isStale).toBe(false);

    stored.defaultSmsDevice = 'c';
    expect((await getCachedSmsState()).device?.iden).toBe('a');
  });
});
