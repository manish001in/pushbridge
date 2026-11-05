/**
 * Uses the real backoff and token bucket: a queued request that gets HTTP 429 has
 * to go out again by itself when the backoff ends.
 */
import { operationQueue } from '../../src/background/operationQueue';
import { rateLimitManager } from '../../src/background/rateLimitManager';

jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn().mockResolvedValue(undefined),
  setLocal: jest.fn().mockResolvedValue(undefined),
}));

describe('queued request hitting HTTP 429', () => {
  const TICK_MS = 5000;
  const FIRST_BACKOFF_MS = 15000;
  const response = (status: number) =>
    ({
      status,
      ok: status < 400,
      headers: {
        get: (name: string) =>
          ({
            'X-Ratelimit-Limit': '1000',
            'X-Ratelimit-Remaining': '500',
            'X-Ratelimit-Reset': '1800000000',
          })[name] ?? null,
      },
      clone() {
        return this;
      },
    }) as any;
  const fetchMock = () => global.fetch as jest.Mock;
  const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);
  // Teardown rejects whatever is still queued, which must not crash the run.
  const enqueue = (path: string) => {
    const result = operationQueue.enqueue({
      url: `https://api.test/${path}`,
      options: {},
    });
    result.catch(() => {});
    return result;
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    await rateLimitManager.clearState();
    operationQueue.clearQueue();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    operationQueue.clearQueue();
    jest.useRealTimers();
  });

  test('retries after the backoff and resolves the caller', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200));
    const result = enqueue('a');

    await advance(TICK_MS);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(rateLimitManager.isBackoffActive()).toBe(true);

    await advance(FIRST_BACKOFF_MS + TICK_MS);
    expect(fetchMock()).toHaveBeenCalledTimes(2);
    await expect(result).resolves.toMatchObject({ status: 200 });
  });

  test('does not send anything while the backoff is active', async () => {
    fetchMock().mockResolvedValue(response(429));
    enqueue('a');

    await advance(TICK_MS);
    await advance(FIRST_BACKOFF_MS - TICK_MS);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  test('rejects after the retry limit, then still runs the next request', async () => {
    fetchMock().mockResolvedValue(response(429));
    const failing = enqueue('a');
    const failed = expect(failing).rejects.toThrow('rate limiting');

    // Backoffs of 15s, 30s and 60s, then the fourth attempt fails for good.
    await advance(TICK_MS);
    await advance(20000);
    await advance(35000);
    await advance(65000);
    await failed;
    expect(fetchMock()).toHaveBeenCalledTimes(4);

    fetchMock().mockResolvedValue(response(200));
    const next = enqueue('b');
    await advance(125000);
    await expect(next).resolves.toMatchObject({ status: 200 });
  });

  test('another queued request waits behind the retry and still completes', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(429))
      .mockResolvedValue(response(200));
    const first = enqueue('a');
    const second = enqueue('b');

    await advance(TICK_MS);
    await advance(FIRST_BACKOFF_MS + TICK_MS * 2);

    await expect(first).resolves.toMatchObject({ status: 200 });
    await expect(second).resolves.toMatchObject({ status: 200 });
    expect(fetchMock().mock.calls.map(call => call[0])).toEqual([
      'https://api.test/a',
      'https://api.test/a',
      'https://api.test/b',
    ]);
  });
});
