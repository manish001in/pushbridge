import { createPush } from '../../src/background/pushManager';
import {
  claimSmsContent,
  clearSmsSightings,
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
  beforeEach(() => clearSmsSightings());

  test('one message from both routes is shown once', () => {
    expect(claimSmsContent('Alex', 'See you soon', 100_000, 'mirror')).toBe(true);
    expect(claimSmsContent(' alex ', 'See you soon', 130_000, 'history')).toBe(
      false
    );
  });

  test('different senders or text are separate messages', () => {
    expect(claimSmsContent('Sam', 'same words', 1000, 'mirror')).toBe(true);
    expect(claimSmsContent('Pat', 'same words', 1000, 'history')).toBe(true);
    expect(claimSmsContent('Sam', 'other words', 1000, 'history')).toBe(true);
  });

  test('the same words twice from one route are two messages', () => {
    expect(claimSmsContent('Kim', 'ok', 1000, 'mirror')).toBe(true);
    expect(claimSmsContent('Kim', 'ok', 2000, 'mirror')).toBe(true);
  });

  test('each route cancels only one sighting from the other', () => {
    expect(claimSmsContent('Kim', 'ok', 1000, 'mirror')).toBe(true);
    expect(claimSmsContent('Kim', 'ok', 2000, 'mirror')).toBe(true);
    expect(claimSmsContent('Kim', 'ok', 3000, 'history')).toBe(false);
    expect(claimSmsContent('Kim', 'ok', 4000, 'history')).toBe(false);
    // A third arriving by history has no twin left: it's a new message.
    expect(claimSmsContent('Kim', 'ok', 5000, 'history')).toBe(true);
  });

  test('the same words much later are a new message', () => {
    expect(claimSmsContent('Kim', 'ok', 1000, 'mirror')).toBe(true);
    expect(claimSmsContent('Kim', 'ok', 5 * 60 * 1000, 'history')).toBe(true);
  });
});
