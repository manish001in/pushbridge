import { httpClient } from '../../src/background/httpClient';
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
jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
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
    (getLocal as jest.Mock).mockImplementation(async (key: string) =>
      key === 'pb_pending_ops' ? [...ops] : undefined
    );
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
        Object.assign(new Error('Invalid push data'), { status: 400 })
      );
      await processQueue();
      expect(ops).toEqual([]);
      expect(reportError).toHaveBeenCalled();
    });

    test('rate limiting is not treated as a rejection', async () => {
      ops = [op('a')];
      (createPush as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Too many requests'), { status: 429 })
      );
      await processQueue();
      expect(ops).toHaveLength(1);
    });

    describe('interrupted by a worker restart', () => {
      const interrupted = (guid?: string) => ({
        ...op('interrupted'),
        payload: guid ? { guid } : {},
        attemptStartedAt: Date.now() - 1000,
      });
      const history = (pushes: any[]) =>
        (httpClient.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ pushes }),
        });

      test('is not sent again when it did get through', async () => {
        ops = [interrupted('g1')];
        history([{ guid: 'g1' }]);
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toEqual([]);
        expect(reportError).not.toHaveBeenCalled();
      });

      test('is sent once when it never left, say during a backoff', async () => {
        ops = [interrupted('g2')];
        history([{ guid: 'someone-else' }]);
        await processQueue();
        expect(createPush).toHaveBeenCalledTimes(1);
        expect(ops).toEqual([]);
      });

      test('waits when it cannot find out', async () => {
        ops = [interrupted('g3')];
        (httpClient.fetch as jest.Mock).mockRejectedValue(new TypeError('offline'));
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toHaveLength(1);
      });

      test('with no send ID it can only be reported', async () => {
        ops = [interrupted()];
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toEqual([]);
        expect(reportError).toHaveBeenCalled();
      });
    });

    describe('telling the caller what happened', () => {
      test('sent', async () => {
        await expect(
          enqueue({ type: 'pushSend', payload: { type: 'note' } } as any)
        ).resolves.toEqual({ status: 'sent' });
      });

      test('a send ID is added for later checks', async () => {
        await enqueue({ type: 'pushSend', payload: { type: 'note' } } as any);
        expect((createPush as jest.Mock).mock.calls[0][0].guid).toEqual(
          expect.any(String)
        );
      });

      test('an existing send ID is kept', async () => {
        await enqueue({
          type: 'pushSend',
          payload: { type: 'note', guid: 'mine' },
        } as any);
        expect((createPush as jest.Mock).mock.calls[0][0].guid).toBe('mine');
      });

      test('rejected by the server', async () => {
        (createPush as jest.Mock).mockRejectedValueOnce(
          Object.assign(new Error('Nope'), { status: 400 })
        );
        await expect(
          enqueue({ type: 'pushSend', payload: { type: 'note' } } as any)
        ).resolves.toEqual({ status: 'rejected', error: 'Nope' });
      });

      test('still waiting after a network failure', async () => {
        (createPush as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));
        await expect(
          enqueue({ type: 'pushSend', payload: { type: 'note' } } as any)
        ).resolves.toEqual({ status: 'queued' });
      });
    });

    test('there is no delay after the last operation', async () => {
      ops = [op('only')];
      const started = Date.now();
      await processQueue();
      expect(Date.now() - started).toBeLessThan(1000);
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

    test('a message from another account is dropped, never sent', async () => {
      ops = [{ ...op('a'), accountIden: 'account-a' }];
      (getLocal as jest.Mock).mockImplementation(async key =>
        key === 'pb_user_iden' ? 'account-b' : [...ops]
      );
      await processQueue();
      expect(createPush).not.toHaveBeenCalled();
      expect(ops).toEqual([]);
    });

    test('a retry first checks whether the earlier attempt went through', async () => {
      const { httpClient } = jest.requireMock(
        '../../src/background/httpClient'
      );
      const queued = {
        ...op('a'),
        retryCount: 1,
        payload: { guid: 'sent-guid' },
      };
      ops = [queued];
      httpClient.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pushes: [{ guid: 'sent-guid' }] }),
      });
      await processQueue();
      expect(createPush).not.toHaveBeenCalled();
      expect(ops).toEqual([]);
    });

    test('later messages wait behind one that is backing off', async () => {
      ops = [
        { ...op('first'), nextAttemptAt: Date.now() + 60_000 },
        op('second'),
      ];
      await processQueue();
      expect(createPush).not.toHaveBeenCalled();
      expect(ops).toHaveLength(2);
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
    (getLocal as jest.Mock).mockImplementation(async key => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return key === 'pb_pending_ops' ? [...ops] : undefined;
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
