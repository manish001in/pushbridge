/**
 * Integration tests for UnifiedNotificationTracker
 * Tests the enhanced counting functionality with proper isolation
 */

import { getLocal, setLocal } from '../../src/background/storage';
import {
  UnifiedNotificationTracker,
  NotificationData,
} from '../../src/background/unifiedNotificationTracker';

// Mock storage
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));

const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;

describe('UnifiedNotificationTracker Integration', () => {
  let tracker: UnifiedNotificationTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a fresh instance for each test
    tracker = new UnifiedNotificationTracker();
  });

  describe('Count Management', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await tracker.initialize();
    });

    describe('incrementCount', () => {
      it('should increment push count correctly', async () => {
        await tracker.incrementCount('push', 3);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(3);
        expect(counts.total).toBe(3);
      });

      it('should increment mirror count correctly', async () => {
        await tracker.incrementCount('mirror', 2);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.mirrors).toBe(2);
        expect(counts.total).toBe(2);
      });

      it('should increment SMS count correctly', async () => {
        await tracker.incrementCount('sms', 4);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.sms).toBe(4);
        expect(counts.total).toBe(4);
      });

      it('should increment channel count correctly', async () => {
        await tracker.incrementCount('channel', 1);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.channels).toBe(1);
        expect(counts.total).toBe(1);
      });

      it('should calculate total correctly with multiple types', async () => {
        await tracker.incrementCount('push', 2);
        await tracker.incrementCount('mirror', 1);
        await tracker.incrementCount('sms', 3);
        await tracker.incrementCount('channel', 1);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(2);
        expect(counts.mirrors).toBe(1);
        expect(counts.sms).toBe(3);
        expect(counts.channels).toBe(1);
        expect(counts.total).toBe(7);
      });
    });

    describe('decrementCount', () => {
      beforeEach(async () => {
        await tracker.incrementCount('push', 5);
        await tracker.incrementCount('mirror', 3);
      });

      it('should decrement count correctly', async () => {
        await tracker.decrementCount('push', 2);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(3);
        expect(counts.total).toBe(6);
      });

      it('should not go below zero', async () => {
        await tracker.decrementCount('push', 10);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(0);
        expect(counts.total).toBe(3); // mirrors only
      });

      it('should handle negative amounts', async () => {
        await tracker.decrementCount('push', -2); // This should increment

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(7);
        expect(counts.total).toBe(10);
      });
    });

    describe('setCount', () => {
      it('should set count correctly', async () => {
        await tracker.setCount('push', 10);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(10);
        expect(counts.total).toBe(10);
      });

      it('should not allow negative counts', async () => {
        await tracker.setCount('push', -5);

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(0);
        expect(counts.total).toBe(0);
      });
    });

    describe('clearNotifications', () => {
      beforeEach(async () => {
        await tracker.incrementCount('push', 3);
        await tracker.incrementCount('mirror', 2);
        await tracker.incrementCount('sms', 1);
      });

      it('should clear specific notification type', async () => {
        await tracker.clearNotifications('push');

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(0);
        expect(counts.mirrors).toBe(2);
        expect(counts.sms).toBe(1);
        expect(counts.total).toBe(3);
      });
    });

    describe('clearAllNotifications', () => {
      beforeEach(async () => {
        await tracker.incrementCount('push', 3);
        await tracker.incrementCount('mirror', 2);
        await tracker.incrementCount('sms', 1);
        await tracker.incrementCount('channel', 1);
      });

      it('should clear all notification counts', async () => {
        await tracker.clearAllNotifications();

        const counts = (await tracker.getUnreadCount()) as any;
        expect(counts.pushes).toBe(0);
        expect(counts.mirrors).toBe(0);
        expect(counts.sms).toBe(0);
        expect(counts.channels).toBe(0);
        expect(counts.total).toBe(0);
      });
    });
  });

  describe('getUnreadCount', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await tracker.initialize();

      await tracker.incrementCount('push', 2);
      await tracker.incrementCount('mirror', 1);
      await tracker.incrementCount('sms', 3);
      await tracker.incrementCount('channel', 1);
    });

    it('should return all counts when no type specified', async () => {
      const counts = (await tracker.getUnreadCount()) as any;

      expect(counts).toEqual({
        pushes: 2,
        mirrors: 1,
        sms: 3,
        channels: 1,
        total: 7,
      });
    });

    it('should return specific count when type specified', async () => {
      const pushCount = (await tracker.getUnreadCount('push')) as number;
      const mirrorCount = (await tracker.getUnreadCount('mirror')) as number;
      const smsCount = (await tracker.getUnreadCount('sms')) as number;
      const channelCount = (await tracker.getUnreadCount('channel')) as number;

      expect(pushCount).toBe(2);
      expect(mirrorCount).toBe(1);
      expect(smsCount).toBe(3);
      expect(channelCount).toBe(1);
    });
  });

  describe('shouldShowNotification', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await tracker.initialize();
    });

    it('should show notification if not recently processed', async () => {
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: Date.now(),
        metadata: { pushIden: 'test123' },
      };

      const shouldShow = await tracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(true);
    });

    it('should not show notification if recently processed', async () => {
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: Date.now(),
        metadata: { pushIden: 'test123' },
      };

      // Mark as processed first
      await tracker.markAsProcessed('push', 'test123', Date.now());

      const shouldShow = await tracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });

    it('should not show old notifications', async () => {
      const oldTimestamp = (Date.now() - 20000) / 1000; // 20 seconds ago
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: oldTimestamp,
        metadata: { pushIden: 'test123' },
      };

      // Mark as seen recently
      await tracker.markAsSeen(Date.now());

      const shouldShow = await tracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });
  });

  describe('Storage Integration', () => {
    it('should save state to storage', async () => {
      mockGetLocal.mockResolvedValue(null);
      await tracker.initialize();

      await tracker.incrementCount('push', 5);

      expect(mockSetLocal).toHaveBeenCalledWith('unified_notification_counts', {
        pushes: 5,
        mirrors: 0,
        sms: 0,
        channels: 0,
        total: 5,
      });
    });

    it('should load state from storage on initialization', async () => {
      const storedCounts = {
        pushes: 3,
        mirrors: 1,
        sms: 2,
        channels: 0,
        total: 6,
      };

      mockGetLocal
        .mockResolvedValueOnce(null) // timestamps
        .mockResolvedValueOnce(null) // cache
        .mockResolvedValueOnce(storedCounts); // counts

      await tracker.initialize();

      const counts = (await tracker.getUnreadCount()) as any;
      expect(counts).toEqual(storedCounts);
    });
  });
});
