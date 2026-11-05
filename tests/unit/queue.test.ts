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

describe('outgoing operation queue', () => {
  let ops: any[] = [];
  const op = (id: string) => ({
    id,
    type: 'pushSend',
    payload: { id },
    timestamp: 0,
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
    expect(ops.map(o => o.id)).toEqual(['late']);
  }, 15000);

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
