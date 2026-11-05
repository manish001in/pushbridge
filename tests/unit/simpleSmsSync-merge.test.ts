/**
 * A full sync must not lose anything newer or anything it failed to fetch, and
 * reading a conversation must stay read across syncs.
 */
import * as smsSync from '../../src/background/simpleSmsSync';
import { smsApiClient } from '../../src/background/smsApiClient';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

jest.mock('../../src/background/smsApiClient', () => ({
  smsApiClient: {
    initialize: jest.fn(),
    isDeviceOnline: jest.fn(),
    getSmsThreadsList: jest.fn(),
    getSmsThreadMessages: jest.fn(),
  },
}));
jest.mock('../../src/background/deviceManager', () => ({
  getDefaultSmsDevice: jest.fn().mockResolvedValue({ iden: 'phone' }),
}));
jest.mock('../../src/background/notificationBadge', () => ({
  notificationBadge: { refreshBadge: jest.fn() },
}));
jest.mock('../../src/background/unifiedNotificationTracker', () => ({
  unifiedNotificationTracker: {
    getState: jest.fn(),
    shouldShowNotification: jest.fn().mockResolvedValue(false),
    claimNotification: jest.fn().mockResolvedValue(false),
    markAsProcessed: jest.fn(),
    setCount: jest.fn(),
  },
}));

const api = smsApiClient as jest.Mocked<typeof smsApiClient>;
const tracker = unifiedNotificationTracker as jest.Mocked<
  typeof unifiedNotificationTracker
>;

describe('SMS cache', () => {
  let stored: Record<string, any>;
  const DEVICE = 'phone';
  const T = 1_700_000_000_000; // ms
  const cachedMsg = (id: string, timestamp: number, extra = {}) => ({
    id,
    pb_guid: id,
    timestamp,
    inbound: true,
    text: id,
    conversation_iden: 't1',
    ...extra,
  });
  const apiMsg = (id: string, timestamp: number, extra = {}) => ({
    id,
    guid: id,
    timestamp: timestamp / 1000, // The API reports seconds
    direction: 'incoming',
    body: id,
    ...extra,
  });
  const thread = (id: string, messages: any[], extra = {}) => ({
    id,
    name: id,
    messages,
    lastMessageTime: Math.max(0, ...messages.map(m => m.timestamp)),
    unreadCount: 0,
    deviceIden: DEVICE,
    ...extra,
  });
  const seedCache = (...threads: any[]) => {
    stored[`sms_data_${DEVICE}`] = { threads, lastSync: 1, deviceIden: DEVICE };
  };
  const cachedThread = (id: string) =>
    stored[`sms_data_${DEVICE}`].threads.find((t: any) => t.id === id);
  const listThreads = (...ids: string[]) =>
    api.getSmsThreadsList.mockResolvedValue({
      threads: ids.map(id => ({ id, recipients: [{ name: id }] })),
    } as any);
  const threadMessages = (byId: Record<string, any[] | Error>) =>
    api.getSmsThreadMessages.mockImplementation(async (_d, id) => {
      const result = byId[id];
      if (result instanceof Error) throw result;
      return { thread: result } as any;
    });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(T + 60_000);
    jest.clearAllMocks();
    stored = {};
    api.isDeviceOnline.mockResolvedValue(true);
    tracker.getState.mockReturnValue({
      timestamps: { lastSeenTimestamp: (T - 60_000) / 1000 },
    } as any);
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      cb?.({ [key]: stored[key] });
      return Promise.resolve({ [key]: stored[key] });
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((values, cb) => {
      Object.assign(stored, values);
      cb?.();
      return Promise.resolve();
    });
  });

  describe('full sync', () => {
    test('keeps a cached thread when fetching its messages fails', async () => {
      seedCache(
        thread('t1', [cachedMsg('old1', T)]),
        thread('t2', [cachedMsg('old2', T)])
      );
      listThreads('t1', 't2');
      threadMessages({
        t1: new Error('phone unreachable'),
        t2: [apiMsg('old2', T), apiMsg('new2', T + 1000)],
      });

      const result = await smsSync.syncAllSmsData(DEVICE);

      expect(result.threads.map(t => t.id)).toEqual(['t1', 't2']);
      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'old1',
      ]);
      expect(cachedThread('t2').messages.map((m: any) => m.id)).toEqual([
        'old2',
        'new2',
      ]);
    });

    test('does not lose a message newer than the fetched ones', async () => {
      seedCache(
        thread('t1', [cachedMsg('a', T), cachedMsg('newer', T + 5000)])
      );
      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T)] });

      await smsSync.syncAllSmsData(DEVICE);

      const saved = cachedThread('t1');
      expect(saved.messages.map((m: any) => m.id)).toEqual(['a', 'newer']);
      expect(saved.lastMessageTime).toBe(T + 5000);
    });

    test('keeps a message sent while the sync was running', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)]));
      listThreads('t1');
      let finishFetch: (value: any) => void = () => {};
      api.getSmsThreadMessages.mockReturnValue(
        new Promise(resolve => (finishFetch = resolve))
      );

      const sync = smsSync.syncAllSmsData(DEVICE);
      await new Promise(resolve => setTimeout(resolve, 0));
      await smsSync.updateThreadWithSentMessage(
        DEVICE,
        't1',
        cachedMsg('sent', T + 5000, { inbound: false })
      );
      finishFetch({ thread: [apiMsg('a', T)] });
      await sync;

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'a',
        'sent',
      ]);
    });

    describe('incremental sync', () => {
      const withLatest = (id: string, latestId: string) => ({
        id,
        recipients: [{ name: id, number: id, address: id }],
        latest: { id: latestId, timestamp: 1, direction: 'incoming', body: 'x' },
      });
      const fetchedIds = () =>
        api.getSmsThreadMessages.mock.calls.map(call => call[1]);

      beforeEach(async () => {
        api.getSmsThreadsList.mockResolvedValue({
          threads: [withLatest('t1', 'a'), withLatest('t2', 'b')],
        } as any);
        api.getSmsThreadMessages.mockResolvedValue({
          thread: [apiMsg('m', T)],
        } as any);
        await smsSync.syncAllSmsData(DEVICE);
        api.getSmsThreadMessages.mockClear();
      });

      test('fetches nothing when nothing changed', async () => {
        await smsSync.syncAllSmsData(DEVICE, { incremental: true });
        expect(fetchedIds()).toEqual([]);
        expect(cachedThread('t1').messages).toHaveLength(1);
      });

      test('fetches only the conversation that changed', async () => {
        api.getSmsThreadsList.mockResolvedValue({
          threads: [withLatest('t1', 'a'), withLatest('t2', 'new')],
        } as any);
        await smsSync.syncAllSmsData(DEVICE, { incremental: true });
        expect(fetchedIds()).toEqual(['t2']);
      });

      test('a full sync still fetches everything', async () => {
        await smsSync.syncAllSmsData(DEVICE);
        expect(fetchedIds()).toEqual(['t1', 't2']);
      });
    });

    test('keeps a sent message the phone has not reported, behind newer ones', async () => {
      const now = Date.now();
      seedCache(
        thread('t1', [cachedMsg('sent', now - 20 * 60 * 1000, { inbound: false })])
      );
      listThreads('t1');
      api.getSmsThreadMessages.mockResolvedValue({
        thread: [apiMsg('newer', now - 60 * 1000)],
      } as any);

      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'sent',
        'newer',
      ]);
    });

    test('lets go of a sent message once Pushbullet would have given up', async () => {
      const now = Date.now();
      seedCache(
        thread('t1', [cachedMsg('sent', now - 70 * 60 * 1000, { inbound: false })])
      );
      listThreads('t1');
      api.getSmsThreadMessages.mockResolvedValue({
        thread: [apiMsg('newer', now - 60 * 1000)],
      } as any);

      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual(['newer']);
    });

    test('a retried send the API recognized is not listed twice', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)]));
      const sent = cachedMsg('sent', T + 1, { inbound: false, pb_guid: 'g' });
      await smsSync.updateThreadWithSentMessage(DEVICE, 't1', sent);
      await smsSync.updateThreadWithSentMessage(DEVICE, 't1', { ...sent, id: 'x' });
      expect(cachedThread('t1').messages).toHaveLength(2);
    });

    test('drops older messages the phone no longer has', async () => {
      seedCache(
        thread('t1', [cachedMsg('deleted', T), cachedMsg('kept', T + 1000)])
      );
      listThreads('t1');
      threadMessages({ t1: [apiMsg('kept', T + 1000)] });

      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'kept',
      ]);
    });

    test('drops a thread the phone no longer lists', async () => {
      seedCache(thread('gone', [cachedMsg('x', T)]));
      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T)] });

      const result = await smsSync.syncAllSmsData(DEVICE);

      expect(result.threads.map(t => t.id)).toEqual(['t1']);
    });

    test('does not duplicate a sent message once the phone reports it', async () => {
      // The computer's clock runs ahead of the phone's, and the IDs differ.
      seedCache(
        thread('t1', [
          cachedMsg('local-id', T + 3000, { inbound: false, text: 'on my way' }),
        ])
      );
      listThreads('t1');
      threadMessages({
        t1: [
          apiMsg('phone-id', T, { direction: 'outgoing', body: 'on my way' }),
        ],
      });

      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'phone-id',
      ]);
    });

    test('still shows the same words sent again much later', async () => {
      seedCache(
        thread('t1', [
          cachedMsg('again', T + 3_600_000, { inbound: false, text: 'ok' }),
        ])
      );
      listThreads('t1');
      threadMessages({
        t1: [apiMsg('first', T, { direction: 'outgoing', body: 'ok' })],
      });

      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').messages.map((m: any) => m.id)).toEqual([
        'first',
        'again',
      ]);
    });
  });

  describe('reloading one thread', () => {
    test('does not lose a newer cached message', async () => {
      seedCache(thread('t1', [cachedMsg('a', T), cachedMsg('newer', T + 5000)]));
      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T)] });

      const result = await smsSync.reloadSmsThread(DEVICE, 't1');

      expect(result?.messages.map(m => m.id)).toEqual(['a', 'newer']);
      expect(cachedThread('t1').messages).toHaveLength(2);
    });
  });

  describe('marking a conversation read', () => {
    const markRead = (id: string) =>
      (smsSync as any).markConversationRead(DEVICE, id);

    test('clears its unread count and updates the badge', async () => {
      seedCache(
        thread('t1', [cachedMsg('a', T)], { unreadCount: 1 }),
        thread('t2', [cachedMsg('b', T)], { unreadCount: 2 })
      );

      await markRead('t1');

      expect(cachedThread('t1').unreadCount).toBe(0);
      expect(cachedThread('t2').unreadCount).toBe(2);
      expect(tracker.setCount).toHaveBeenCalledWith('sms', 2);
    });

    test('stays read after a full sync', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)], { unreadCount: 1 }));
      await markRead('t1');

      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T)] });
      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').unreadCount).toBe(0);
    });

    test('stays read after reloading the thread', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)], { unreadCount: 1 }));
      await markRead('t1');

      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T)] });
      await smsSync.reloadSmsThread(DEVICE, 't1');

      expect(cachedThread('t1').unreadCount).toBe(0);
    });

    test('a message arriving afterwards is unread', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)], { unreadCount: 1 }));
      await markRead('t1');

      listThreads('t1');
      threadMessages({ t1: [apiMsg('a', T), apiMsg('b', T + 1000)] });
      await smsSync.syncAllSmsData(DEVICE);

      expect(cachedThread('t1').unreadCount).toBe(1);
    });

    test('an unknown conversation changes nothing', async () => {
      seedCache(thread('t1', [cachedMsg('a', T)], { unreadCount: 1 }));
      await markRead('missing');
      expect(cachedThread('t1').unreadCount).toBe(1);
    });
  });
});
