import { createPush } from '../../src/background/pushManager';
import { enqueue, processQueue } from '../../src/background/queue';
import { getLocal, setLocal } from '../../src/background/storage';

jest.mock('../../src/background/pushManager', () => ({
  createPush: jest.fn(),
}));
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: { Unknown: 'unknown' },
}));
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));

jest.setTimeout(30000);

describe('outgoing operation queue', () => {
  let ops: any[] = [];
  let nextId = 0;
  // Unique across tests, because the queue remembers delivered IDs.
  const op = (id: string) => ({
    id: `${id}#${nextId++}`,
    type: 'pushSend',
    payload: { id },
    timestamp: Date.now(),
    retryCount: 0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ops = [];
    (getLocal as jest.Mock).mockImplementation(async () => [...ops]);
    (setLocal as jest.Mock).mockImplementation(async (_key, value) => {
      ops = value;
    });
    (createPush as jest.Mock).mockResolvedValue({});
  });

  test('finishing a batch empties the queue instead of restoring earlier items', async () => {
    ops = [op('a'), op('b')];
    await processQueue();
    expect(ops).toEqual([]);
    expect(createPush).toHaveBeenCalledTimes(2);

    // A second run must not send anything again.
    await processQueue();
    expect(createPush).toHaveBeenCalledTimes(2);
  }, 15000);

  test('an operation added during processing survives', async () => {
    ops = [op('a')];
    (createPush as jest.Mock).mockImplementationOnce(async () => {
      ops = [...ops, op('late')];
      return {};
    });
    await processQueue();
    expect(ops.map(o => o.id.split('#')[0])).toEqual(['late']);
  }, 15000);

  describe('when sending fails', () => {
    const { reportError } = jest.requireMock(
      '../../src/background/errorManager'
    );

    test('a network failure keeps the push and retries later, not straight away', async () => {
      ops = [op('a')];
      (createPush as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));
      await processQueue();
      expect(ops).toHaveLength(1);
      expect(ops[0].retryCount).toBe(1);
      expect(ops[0].nextAttemptAt).toBeGreaterThan(Date.now());
      expect(ops[0].attemptStartedAt).toBeUndefined();

      await processQueue();
      expect(createPush).toHaveBeenCalledTimes(1);
    });

    test('never gives up on a push just from repeated network failures', async () => {
      ops = [{ ...op('a'), retryCount: 50 }];
      (createPush as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));
      await processQueue();
      expect(ops).toHaveLength(1);
    });

    test('a request the server rejects is dropped and reported', async () => {
      ops = [op('a')];
      (createPush as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to create push: 400 Bad Request')
      );
      await processQueue();
      expect(ops).toEqual([]);
      expect(reportError).toHaveBeenCalled();
    });

    test('rate limiting is not treated as a rejection', async () => {
      ops = [op('a')];
      (createPush as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to create push: 429 Too Many Requests')
      );
      await processQueue();
      expect(ops).toHaveLength(1);
    });

    test('a push interrupted mid-send by a worker restart is not sent again', async () => {
      ops = [{ ...op('interrupted'), attemptStartedAt: Date.now() - 1000 }];
      await processQueue();
      expect(createPush).not.toHaveBeenCalled();
      expect(ops).toEqual([]);
      expect(reportError).toHaveBeenCalled();
    });

    test('the in-flight mark is saved before the request goes out', async () => {
      ops = [op('a')];
      (createPush as jest.Mock).mockImplementationOnce(async () => {
        expect(ops[0].attemptStartedAt).toBeDefined();
        return {};
      });
      await processQueue();
      expect(createPush).toHaveBeenCalledTimes(1);
    });

    test('a push is not resent when its removal from storage fails', async () => {
      ops = [op('a')];
      const real = (setLocal as jest.Mock).getMockImplementation();
      let writes = 0;
      (setLocal as jest.Mock).mockImplementation(async (key, value) => {
        // First write marks it in flight; the second, its removal, fails.
        if (++writes === 2) throw new Error('storage full');
        return real!(key, value);
      });
      await processQueue();
      (setLocal as jest.Mock).mockImplementation(real!);
      await processQueue();
      expect(createPush).toHaveBeenCalledTimes(1);
      expect(ops).toEqual([]);
    });

    test('an old push is dropped and reported rather than sent days late', async () => {
      ops = [{ ...op('a'), timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 }];
      await processQueue();
      expect(createPush).not.toHaveBeenCalled();
      expect(ops).toEqual([]);
    });
  });

  // Last: its send never finishes, so the queue stays busy afterwards.
  test('concurrent additions are all kept', async () => {
    // Slow storage makes a lost update likely if writes aren't serialized.
    (getLocal as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return [...ops];
    });
    (createPush as jest.Mock).mockImplementation(
      () => new Promise(() => undefined)
    );
    await Promise.race([
      Promise.all(
        ['x', 'y', 'z'].map(type =>
          enqueue({ type: 'pushSend', payload: { type } } as any)
        )
      ),
      new Promise(resolve => setTimeout(resolve, 200)),
    ]);
    expect(ops).toHaveLength(3);
  }, 15000);
});
