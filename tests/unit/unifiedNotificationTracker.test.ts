/**
 * Unit tests for UnifiedNotificationTracker
 * Tests the enhanced counting functionality and integration
 */

import { getLocal, setLocal } from '../../src/background/storage';
import { unifiedNotificationTracker, NotificationData, UnifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

// Mock storage
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));

const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;

describe('UnifiedNotificationTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance for each test
    (UnifiedNotificationTracker as any).instance = undefined;
    // Reset the exported instance state
    (unifiedNotificationTracker as any).timestamps = {
      lastSeenTimestamp: 0,
      lastProcessedPushTimestamp: 0,
      lastProcessedMirrorTimestamp: 0,
      lastProcessedSmsTimestamp: 0,
      lastProcessedChannelTimestamp: 0,
      lastUpdated: 0
    };
    (unifiedNotificationTracker as any).cache = {
      pushIds: [],
      mirrorIds: [],
      smsIds: [],
      channelIds: [],
      lastCleanup: 0
    };
    (unifiedNotificationTracker as any).counts = {
      pushes: 0,
      mirrors: 0,
      sms: 0,
      channels: 0,
      total: 0
    };
    (unifiedNotificationTracker as any).isInitialized = false;
  });

  describe('Initialization', () => {
    it('should initialize with default values when no stored data exists', async () => {
      mockGetLocal.mockResolvedValue(null);

      await unifiedNotificationTracker.initialize();

      const state = unifiedNotificationTracker.getState();
      expect(state.counts).toEqual({
        pushes: 0,
        mirrors: 0,
        sms: 0,
        channels: 0,
        total: 0
      });
      expect(state.timestamps.lastSeenTimestamp).toBe(0);
      expect(state.cache.pushIds).toEqual([]);
    });

    it('should load stored data on initialization', async () => {
      const storedCounts = {
        pushes: 5,
        mirrors: 2,
        sms: 3,
        channels: 1,
        total: 11
      };
      const storedTimestamps = {
        lastSeenTimestamp: 1000,
        lastProcessedPushTimestamp: 2000,
        lastProcessedMirrorTimestamp: 3000,
        lastProcessedSmsTimestamp: 4000,
        lastProcessedChannelTimestamp: 5000,
        lastUpdated: 6000
      };

      mockGetLocal
        .mockResolvedValueOnce(storedTimestamps)
        .mockResolvedValueOnce({ pushIds: ['test1'], mirrorIds: [], smsIds: [], channelIds: [], lastCleanup: 1000 })
        .mockResolvedValueOnce(storedCounts);

      await unifiedNotificationTracker.initialize();

      const state = unifiedNotificationTracker.getState();
      expect(state.counts).toEqual(storedCounts);
      expect(state.timestamps).toEqual(storedTimestamps);
    });
  });

  describe('Count Management', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
    });

    describe('incrementCount', () => {
      it('should increment push count correctly', async () => {
        await unifiedNotificationTracker.incrementCount('push', 3);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(3);
        expect(counts.total).toBe(3);
      });

      it('should increment mirror count correctly', async () => {
        await unifiedNotificationTracker.incrementCount('mirror', 2);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.mirrors).toBe(2);
        expect(counts.total).toBe(2);
      });

      it('should increment SMS count correctly', async () => {
        await unifiedNotificationTracker.incrementCount('sms', 4);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.sms).toBe(4);
        expect(counts.total).toBe(4);
      });

      it('should increment channel count correctly', async () => {
        await unifiedNotificationTracker.incrementCount('channel', 1);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.channels).toBe(1);
        expect(counts.total).toBe(1);
      });

      it('should calculate total correctly with multiple types', async () => {
        await unifiedNotificationTracker.incrementCount('push', 2);
        await unifiedNotificationTracker.incrementCount('mirror', 1);
        await unifiedNotificationTracker.incrementCount('sms', 3);
        await unifiedNotificationTracker.incrementCount('channel', 1);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(2);
        expect(counts.mirrors).toBe(1);
        expect(counts.sms).toBe(3);
        expect(counts.channels).toBe(1);
        expect(counts.total).toBe(7);
      });
    });

    describe('decrementCount', () => {
      beforeEach(async () => {
        await unifiedNotificationTracker.incrementCount('push', 5);
        await unifiedNotificationTracker.incrementCount('mirror', 3);
      });

      it('should decrement count correctly', async () => {
        await unifiedNotificationTracker.decrementCount('push', 2);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(3);
        expect(counts.total).toBe(6);
      });

      it('should not go below zero', async () => {
        await unifiedNotificationTracker.decrementCount('push', 10);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(0);
        expect(counts.total).toBe(3); // mirrors only
      });

      it('should handle negative amounts', async () => {
        await unifiedNotificationTracker.decrementCount('push', -2); // This should increment
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(7);
        expect(counts.total).toBe(10);
      });
    });

    describe('setCount', () => {
      it('should set count correctly', async () => {
        await unifiedNotificationTracker.setCount('push', 10);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(10);
        expect(counts.total).toBe(10);
      });

      it('should not allow negative counts', async () => {
        await unifiedNotificationTracker.setCount('push', -5);
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(0);
        expect(counts.total).toBe(0);
      });
    });

    describe('clearNotifications', () => {
      beforeEach(async () => {
        await unifiedNotificationTracker.incrementCount('push', 3);
        await unifiedNotificationTracker.incrementCount('mirror', 2);
        await unifiedNotificationTracker.incrementCount('sms', 1);
      });

      it('should clear specific notification type', async () => {
        await unifiedNotificationTracker.clearNotifications('push');
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
        expect(counts.pushes).toBe(0);
        expect(counts.mirrors).toBe(2);
        expect(counts.sms).toBe(1);
        expect(counts.total).toBe(3);
      });
    });

    describe('clearAllNotifications', () => {
      beforeEach(async () => {
        await unifiedNotificationTracker.incrementCount('push', 3);
        await unifiedNotificationTracker.incrementCount('mirror', 2);
        await unifiedNotificationTracker.incrementCount('sms', 1);
        await unifiedNotificationTracker.incrementCount('channel', 1);
      });

      it('should clear all notification counts', async () => {
        await unifiedNotificationTracker.clearAllNotifications();
        
        const counts = await unifiedNotificationTracker.getUnreadCount() as any;
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
      await unifiedNotificationTracker.initialize();
      
      await unifiedNotificationTracker.incrementCount('push', 2);
      await unifiedNotificationTracker.incrementCount('mirror', 1);
      await unifiedNotificationTracker.incrementCount('sms', 3);
      await unifiedNotificationTracker.incrementCount('channel', 1);
    });

    it('should return all counts when no type specified', async () => {
      const counts = await unifiedNotificationTracker.getUnreadCount() as any;
      
      expect(counts).toEqual({
        pushes: 2,
        mirrors: 1,
        sms: 3,
        channels: 1,
        total: 7
      });
    });

    it('should return specific count when type specified', async () => {
      const pushCount = await unifiedNotificationTracker.getUnreadCount('push') as number;
      const mirrorCount = await unifiedNotificationTracker.getUnreadCount('mirror') as number;
      const smsCount = await unifiedNotificationTracker.getUnreadCount('sms') as number;
      const channelCount = await unifiedNotificationTracker.getUnreadCount('channel') as number;
      
      expect(pushCount).toBe(2);
      expect(mirrorCount).toBe(1);
      expect(smsCount).toBe(3);
      expect(channelCount).toBe(1);
    });
  });

  describe('shouldShowNotification', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
    });

    it('should show notification if not recently processed', async () => {
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: Date.now(),
        metadata: { pushIden: 'test123' }
      };

      const shouldShow = await unifiedNotificationTracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(true);
    });

    it('should not show notification if recently processed', async () => {
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: Date.now(),
        metadata: { pushIden: 'test123' }
      };

      // Mark as processed first
      await unifiedNotificationTracker.markAsProcessed('push', 'test123', Date.now());

      const shouldShow = await unifiedNotificationTracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });

    it('should not show old notifications', async () => {
      const oldTimestamp = (Date.now() - 20000) / 1000; // 20 seconds ago
      const notification: NotificationData = {
        id: 'test123',
        type: 'push',
        created: oldTimestamp,
        metadata: { pushIden: 'test123' }
      };

      // Mark as seen recently
      await unifiedNotificationTracker.markAsSeen(Date.now());

      const shouldShow = await unifiedNotificationTracker.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });
  });

  describe('markAsSeen', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
    });

    it('should update last seen timestamp', async () => {
      const timestamp = Date.now();
      await unifiedNotificationTracker.markAsSeen(timestamp);
      
      const state = unifiedNotificationTracker.getState();
      expect(state.timestamps.lastSeenTimestamp).toBe(timestamp / 1000);
    });

    it('should use current time if no timestamp provided', async () => {
      const before = Date.now();
      await unifiedNotificationTracker.markAsSeen();
      const after = Date.now();
      
      const state = unifiedNotificationTracker.getState();
      expect(state.timestamps.lastSeenTimestamp).toBeGreaterThanOrEqual(before / 1000);
      expect(state.timestamps.lastSeenTimestamp).toBeLessThanOrEqual(after / 1000);
    });
  });

  describe('markAsProcessed', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
    });

    it('should update processed timestamp and add to cache', async () => {
      const timestamp = Date.now();
      await unifiedNotificationTracker.markAsProcessed('push', 'test123', timestamp);
      
      const state = unifiedNotificationTracker.getState();
      expect(state.timestamps.lastProcessedPushTimestamp).toBe(timestamp);
      expect(state.cache.pushIds).toContain('test123');
    });

    it('should only update timestamp if new timestamp is greater', async () => {
      const oldTimestamp = Date.now();
      const newTimestamp = oldTimestamp + 1000;
      
      await unifiedNotificationTracker.markAsProcessed('push', 'test123', oldTimestamp);
      await unifiedNotificationTracker.markAsProcessed('push', 'test456', newTimestamp);
      
      const state = unifiedNotificationTracker.getState();
      expect(state.timestamps.lastProcessedPushTimestamp).toBe(newTimestamp);
    });
  });

  describe('validateState', () => {
    beforeEach(async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
    });

    it('should return true for valid state', async () => {
      const isValid = await unifiedNotificationTracker.validateState();
      expect(isValid).toBe(true);
    });

    it('should recover from invalid state', async () => {
      // Manually corrupt the state
      (unifiedNotificationTracker as any).counts.pushes = -1;
      
      const isValid = await unifiedNotificationTracker.validateState();
      expect(isValid).toBe(true);
      
      const state = unifiedNotificationTracker.getState();
      expect(state.counts.pushes).toBe(0);
    });
  });

  describe('Storage Integration', () => {
    it('should save state to storage', async () => {
      mockGetLocal.mockResolvedValue(null);
      await unifiedNotificationTracker.initialize();
      
      await unifiedNotificationTracker.incrementCount('push', 5);
      
      expect(mockSetLocal).toHaveBeenCalledWith('unified_notification_counts', {
        pushes: 5,
        mirrors: 0,
        sms: 0,
        channels: 0,
        total: 5
      });
    });

    it('should load state from storage on initialization', async () => {
      const storedCounts = {
        pushes: 3,
        mirrors: 1,
        sms: 2,
        channels: 0,
        total: 6
      };
      
      mockGetLocal
        .mockResolvedValueOnce(null) // timestamps
        .mockResolvedValueOnce(null) // cache
        .mockResolvedValueOnce(storedCounts); // counts
      
      await unifiedNotificationTracker.initialize();
      
      const counts = await unifiedNotificationTracker.getUnreadCount() as any;
      expect(counts).toEqual(storedCounts);
    });
  });
}); 