import { createPush } from '../../src/background/pushManager';
import {
  clearSmsSightings,
  showSmsOnce,
} from '../../src/background/smsNotificationIdentity';
import { setLocal } from '../../src/background/storage';

jest.mock('../../src/background/httpClient', () => ({
  httpClient: { fetch: jest.fn() },
}));
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: { Unknown: 'unknown', TokenRevoked: 'revoked' },
}));

describe('sending to the right place', () => {
  const { httpClient } = jest.requireMock('../../src/background/httpClient');
  const sentBody = () => JSON.parse(httpClient.fetch.mock.calls[0][1].body);

  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ iden: 'p', type: 'note' }),
    });
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) =>
      cb({ [key]: key === 'pb_token' ? 'token' : 'chrome-device' })
    );
  });

  test.each(['note', 'link'] as const)(
    'a %s posted to a channel goes to the channel, not to all devices',
    async type => {
      await createPush({
        type,
        body: 'hello',
        url: 'https://example.test/',
        channel_tag: 'my-channel',
      } as any);
      expect(sentBody().channel_tag).toBe('my-channel');
      expect(sentBody().type).toBe(type);
    }
  );

  test('a device target is kept', async () => {
    await createPush({
      type: 'note',
      body: 'x',
      targetDeviceIden: 'd1',
    } as any);
    // The API ignores target_device_iden in a request and sends to every device.
    expect(sentBody().device_iden).toBe('d1');
    expect(sentBody().target_device_iden).toBeUndefined();
  });
});

describe('storage writes', () => {
  afterEach(() => {
    (chrome.runtime as any).lastError = undefined;
  });

  test('report failure instead of pretending to succeed', async () => {
    (chrome.storage.local.set as jest.Mock).mockImplementation((_v, cb) => {
      (chrome.runtime as any).lastError = { message: 'QUOTA_BYTES exceeded' };
      cb();
    });
    await expect(setLocal('k', 'v')).rejects.toThrow('QUOTA_BYTES');
  });

  test('resolve when they succeed', async () => {
    (chrome.storage.local.set as jest.Mock).mockImplementation((_v, cb) =>
      cb()
    );
    await expect(setLocal('k', 'v')).resolves.toBeUndefined();
  });
});

describe('recognizing one SMS arriving twice', () => {
  const see = (
    sender: string,
    text: string,
    sentAt: number,
    source: 'mirror' | 'history',
    show: () => Promise<unknown> = async () => {}
  ) => showSmsOnce({ sender, text, sentAt, source }, show);

  beforeEach(() => clearSmsSightings());

  test('one message from both routes is shown once', async () => {
    await expect(see('Alex', 'See you soon', 100_000, 'mirror')).resolves.toBe(true);
    await expect(see(' alex ', 'See you soon', 130_000, 'history')).resolves.toBe(
      false
    );
  });

  test('different senders or text are separate messages', async () => {
    await expect(see('Sam', 'same words', 1000, 'mirror')).resolves.toBe(true);
    await expect(see('Pat', 'same words', 1000, 'history')).resolves.toBe(true);
    await expect(see('Sam', 'other words', 1000, 'history')).resolves.toBe(true);
  });

  test('the same words twice from one route are two messages', async () => {
    await expect(see('Kim', 'ok', 1000, 'mirror')).resolves.toBe(true);
    await expect(see('Kim', 'ok', 2000, 'mirror')).resolves.toBe(true);
  });

  test('each route cancels only one sighting from the other', async () => {
    await see('Kim', 'ok', 1000, 'mirror');
    await see('Kim', 'ok', 2000, 'mirror');
    await expect(see('Kim', 'ok', 3000, 'history')).resolves.toBe(false);
    await expect(see('Kim', 'ok', 4000, 'history')).resolves.toBe(false);
    // A third arriving by history has no twin left: it's a new message.
    await expect(see('Kim', 'ok', 5000, 'history')).resolves.toBe(true);
  });

  test('the same words much later are a new message', async () => {
    await see('Kim', 'ok', 1000, 'mirror');
    await expect(see('Kim', 'ok', 5 * 60 * 1000, 'history')).resolves.toBe(true);
  });

  test('a notification that failed to show suppresses nothing', async () => {
    await expect(
      see('Lee', 'hello', 1000, 'mirror', () => Promise.reject(new Error('no')))
    ).rejects.toThrow('no');
    await expect(see('Lee', 'hello', 1000, 'history')).resolves.toBe(true);
  });

  test('the other route waits to see whether the first one succeeds', async () => {
    let failFirst: (error: Error) => void = () => {};
    const first = see(
      'Lee',
      'overlap',
      1000,
      'mirror',
      () => new Promise((_, reject) => (failFirst = reject))
    );
    const secondShow = jest.fn().mockResolvedValue(undefined);
    const second = see('Lee', 'overlap', 1000, 'history', secondShow);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(secondShow).not.toHaveBeenCalled();

    failFirst(new Error('no'));
    await expect(first).rejects.toThrow('no');
    await expect(second).resolves.toBe(true);
    expect(secondShow).toHaveBeenCalled();
  });

  test('a sighting survives a worker restart', async () => {
    await see('Lee', 'restart', 1000, 'mirror');
    let restarted: typeof import('../../src/background/smsNotificationIdentity');
    jest.isolateModules(() => {
      restarted = require('../../src/background/smsNotificationIdentity');
    });
    await expect(
      restarted!.showSmsOnce(
        { sender: 'Lee', text: 'restart', sentAt: 1000, source: 'history' },
        async () => {}
      )
    ).resolves.toBe(false);
  });

  test('clearing forgets every sighting', async () => {
    await see('Lee', 'clear', 1000, 'mirror');
    await clearSmsSightings();
    await expect(see('Lee', 'clear', 1000, 'history')).resolves.toBe(true);
  });
});
