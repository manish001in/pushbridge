import {
  clearSubscriptionsCache,
  getSubscriptions,
} from '../../src/background/channelManager';
import { getLocal, setLocal } from '../../src/background/storage';

jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));
jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
}));
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: { Unknown: 'unknown', TokenRevoked: 'revoked' },
}));

describe('restoring saved subscriptions after a worker restart', () => {
  const { httpClient } = jest.requireMock('../../src/background/httpClient');
  const saved = { iden: 'saved', channel: { tag: 'saved' } };
  const fresh = { iden: 'fresh', channel: { tag: 'fresh' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    (setLocal as jest.Mock).mockResolvedValue(undefined);
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(undefined);
    httpClient.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [fresh] }),
    });
    await clearSubscriptionsCache();
  });

  const savedCopy = (value: unknown) =>
    (getLocal as jest.Mock).mockImplementation(async key =>
      key === 'pb_channel_subs' ? value : key === 'pb_token' ? 'token' : null
    );

  test('uses a recent saved copy without fetching', async () => {
    savedCopy({ subscriptions: [saved], lastFetched: Date.now() });
    expect(await getSubscriptions()).toEqual([saved]);
    expect(httpClient.fetch).not.toHaveBeenCalled();
  });

  test('fetches when the saved copy is old', async () => {
    savedCopy({ subscriptions: [saved], lastFetched: 1 });
    expect((await getSubscriptions()).map(s => s.iden)).toEqual(['fresh']);
    expect(httpClient.fetch).toHaveBeenCalledTimes(1);
  });

  test('clearing the cache during the read discards the saved copy', async () => {
    let finishRead: (value: unknown) => void = () => undefined;
    (getLocal as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => (finishRead = resolve))
    );
    (getLocal as jest.Mock).mockImplementation(async key =>
      key === 'pb_token' ? 'token' : null
    );
    const result = getSubscriptions();
    await clearSubscriptionsCache();
    finishRead({ subscriptions: [saved], lastFetched: Date.now() });
    expect((await result).map(s => s.iden)).toEqual(['fresh']);
  });
});
