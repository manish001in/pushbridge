import {
  AccountChangedError,
  bumpAccountEpoch,
  currentAccountEpoch,
  setAccountChanging,
} from '../../src/background/accountEpoch';
import { httpClient } from '../../src/background/httpClient';
import { createPush } from '../../src/background/pushManager';
import { enqueue, processQueue, showQueueWarnings } from '../../src/background/queue';
import { rateLimitManager } from '../../src/background/rateLimitManager';
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
  let warnings: string[] = [];
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
    warnings = [];
    (getLocal as jest.Mock).mockImplementation(async (key: string) =>
      key === 'pb_pending_ops'
        ? [...ops]
        : key === 'pb_queue_warnings'
          ? warnings
          : undefined
    );
    (setLocal as jest.Mock).mockImplementation(async (key, value) => {
      if (key === 'pb_queue_warnings') warnings = value;
      else ops = value;
    });
    (chrome.notifications.create as jest.Mock) = jest
      .fn()
      .mockResolvedValue('id');
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
      ops = [{ ...op('a'), payload: { guid: 'g50' }, retryCount: 50, mayHaveBeenSent: false }];
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
      expect(chrome.notifications.create).toHaveBeenCalled();
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
        expect(chrome.notifications.create).toHaveBeenCalled();
      });
    });

    describe('checking whether a send got through', () => {
      const uncertain = (guid: string, extra = {}) => ({
        ...op(guid),
        payload: { guid },
        mayHaveBeenSent: true,
        ...extra,
      });
      const page = (pushes: any[], cursor?: string) => ({
        ok: true,
        json: async () => ({ pushes, cursor }),
      });
      const fetchMock = () => httpClient.fetch as jest.Mock;

      test('operations in one pass share one search', async () => {
        ops = [uncertain('s1'), uncertain('s2')];
        fetchMock().mockResolvedValue(page([{ guid: 's1' }]));
        await processQueue();
        expect(fetchMock()).toHaveBeenCalledTimes(1);
        expect(createPush).toHaveBeenCalledTimes(1);
        expect((createPush as jest.Mock).mock.calls[0][0].guid).toBe('s2');
      }, 15000);

      test('searches from the first attempt, in seconds', async () => {
        const firstAttemptAt = 1_800_000_000_000;
        ops = [uncertain('s3', { firstAttemptAt })];
        fetchMock().mockResolvedValue(page([]));
        await processQueue();
        const url = new URL(fetchMock().mock.calls[0][0]);
        expect(Number(url.searchParams.get('modified_after'))).toBe(
          firstAttemptAt / 1000 - 300
        );
      });

      test('follows empty pages to the answer', async () => {
        ops = [uncertain('s4')];
        fetchMock()
          .mockResolvedValueOnce(page([], 'next'))
          .mockResolvedValueOnce(page([{ guid: 's4' }]));
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toEqual([]);
      });

      test('running out of pages proves nothing, so it does not resend', async () => {
        ops = [uncertain('s5')];
        fetchMock().mockResolvedValue(page([], 'more'));
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops[0].inconclusiveChecks).toBe(1);
        expect(ops[0].mayHaveBeenSent).toBe(true);
      });

      test('it eventually tells the user instead of waiting forever', async () => {
        ops = [uncertain('s6', { inconclusiveChecks: 2 })];
        fetchMock().mockResolvedValue(page([], 'more'));
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toEqual([]);
        expect(chrome.notifications.create).toHaveBeenCalled();
      });

      test('a clear refusal needs no check', async () => {
        ops = [{ ...op('s7'), payload: { guid: 's7' }, retryCount: 1, mayHaveBeenSent: false }];
        await processQueue();
        expect(fetchMock()).not.toHaveBeenCalled();
        expect(createPush).toHaveBeenCalledTimes(1);
      });

      test('a network failure makes it uncertain', async () => {
        ops = [{ ...op('s8'), payload: { guid: 's8' } }];
        (createPush as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));
        await processQueue();
        expect(ops[0].mayHaveBeenSent).toBe(true);
      });

      test('a rate limit refusal does not', async () => {
        ops = [{ ...op('s9'), payload: { guid: 's9' } }];
        (createPush as jest.Mock).mockRejectedValueOnce(
          Object.assign(new Error('Rate limited'), { name: 'RateLimitError' })
        );
        await processQueue();
        expect(ops[0].mayHaveBeenSent).toBe(false);
      });

      test('a later refusal does not erase earlier uncertainty', async () => {
        ops = [uncertain('s10')];
        fetchMock().mockResolvedValue(page([]));
        (createPush as jest.Mock).mockRejectedValueOnce(
          Object.assign(new Error('Rate limited'), { name: 'RateLimitError' })
        );
        await processQueue();
        expect(ops[0].mayHaveBeenSent).toBe(true);
      });

      test('a failed check sends nothing and stays uncertain', async () => {
        ops = [uncertain('s11')];
        fetchMock().mockRejectedValue(new TypeError('offline'));
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops[0].mayHaveBeenSent).toBe(true);
      });

      test('low quota postpones the check', async () => {
        const low = jest.spyOn(rateLimitManager, 'isQuotaLow').mockReturnValue(true);
        ops = [uncertain('s12')];
        await processQueue();
        low.mockRestore();
        expect(fetchMock()).not.toHaveBeenCalled();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops[0].nextAttemptAt).toBeGreaterThan(Date.now());
        expect(ops[0].inconclusiveChecks).toBeUndefined();
      });
    });

    describe('dropping a message', () => {
      const lost = () => ({
        ...op('lost'),
        payload: {},
        attemptStartedAt: Date.now() - 1000,
      });

      test('the warning is saved before the message goes', async () => {
        ops = [lost()];
        const order: string[] = [];
        const real = (setLocal as jest.Mock).getMockImplementation();
        (setLocal as jest.Mock).mockImplementation(async (key, value) => {
          order.push(key);
          return real!(key, value);
        });
        await processQueue();
        (setLocal as jest.Mock).mockImplementation(real!);
        expect(order[0]).toBe('pb_queue_warnings');
        expect(order).toContain('pb_pending_ops');
      });

      test('a warning that fails to show is kept and shown later', async () => {
        ops = [lost()];
        (chrome.notifications.create as jest.Mock).mockRejectedValueOnce(
          new Error('no')
        );
        await processQueue();
        expect(ops).toEqual([]);
        expect(warnings).toHaveLength(1);

        await showQueueWarnings();
        expect(warnings).toEqual([]);
      });

      test('an older send with no ID is reported, not sent again', async () => {
        ops = [{ ...op('old'), payload: { type: 'note' }, retryCount: 1 }];
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
        expect(ops).toEqual([]);
        expect(warnings).toHaveLength(0);
        expect(chrome.notifications.create).toHaveBeenCalled();
      });
    });

    test('a browser not registered yet waits instead of losing the message', async () => {
      ops = [op('wait')];
      (createPush as jest.Mock).mockRejectedValueOnce(
        new Error('Chrome device not registered')
      );
      await processQueue();
      expect(ops).toHaveLength(1);
    });

    describe('when the account changes', () => {
      test('during the check, the message is not sent', async () => {
        ops = [
          { ...op('a1'), payload: { guid: 'a1' }, mayHaveBeenSent: true },
        ];
        (httpClient.fetch as jest.Mock).mockImplementation(async () => {
          bumpAccountEpoch();
          return { ok: true, json: async () => ({ pushes: [] }) };
        });
        await processQueue();
        expect(createPush).not.toHaveBeenCalled();
      });

      test('the epoch it started under reaches the send', async () => {
        ops = [op('a2')];
        await processQueue();
        expect((createPush as jest.Mock).mock.calls[0][1].accountEpoch).toBe(
          currentAccountEpoch()
        );
      });

      test('a send stopped by the change is not retried', async () => {
        ops = [op('a3')];
        (createPush as jest.Mock).mockRejectedValueOnce(new AccountChangedError());
        await processQueue();
        expect(ops[0].retryCount).toBe(0);
        expect(ops[0].nextAttemptAt).toBeUndefined();
      });

      test('before saving, it is not saved under the new account', async () => {
        const started = currentAccountEpoch();
        bumpAccountEpoch();
        await expect(
          enqueue({ type: 'pushSend', payload: {} } as any, {
            accountEpoch: started,
          })
        ).rejects.toBeInstanceOf(AccountChangedError);
        expect(ops).toEqual([]);
      });

      test('while old data is clearing, nothing new is saved', async () => {
        setAccountChanging(true);
        await expect(
          enqueue({ type: 'pushSend', payload: {} } as any)
        ).rejects.toBeInstanceOf(AccountChangedError);
        setAccountChanging(false);
        expect(ops).toEqual([]);
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
