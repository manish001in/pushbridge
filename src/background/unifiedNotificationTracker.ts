/**
 * Unified Notification Tracker
 * Central coordinator for all notification tracking using timestamps and small caches
 * Prevents duplicate notifications and ensures accurate badge counts
 */

import { getLocal, setLocal } from './storage';

export type NotificationType = 'push' | 'mirror' | 'sms' | 'channel';

export interface NotificationData {
  id: string;
  type: NotificationType;
  created: string | number; // ISO string or timestamp
  metadata?: {
    pushIden?: string;
    mirrorId?: string;
    conversationId?: string;
    channelTag?: string;
    packageName?: string;
    applicationName?: string;
  };
}

export interface NotificationTimestamps {
  lastSeenTimestamp: number; // When user last acknowledged notifications
  lastProcessedPushTimestamp: number; // For API efficiency tracking
  lastProcessedMirrorTimestamp: number;
  lastProcessedSmsTimestamp: number;
  lastProcessedChannelTimestamp: number;
  lastUpdated: number; // Tracker state update time
}

export interface RecentlyProcessedCache {
  pushIds: string[]; // Last 50 entries
  mirrorIds: string[]; // Last 50 entries
  smsIds: string[]; // Last 50 entries
  channelIds: string[]; // Last 50 entries
  lastCleanup: number; // Cache cleanup timestamp
}

export interface UnreadCounts {
  pushes: number;
  mirrors: number;
  sms: number;
  channels: number;
  total: number;
}

// Constants
const CACHE_SIZE = 50; // Maximum entries per notification type
const BUFFER_TIME = 5000; // 5 seconds buffer for clock skew
const CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEYS = {
  TIMESTAMPS: 'unified_notification_timestamps',
  CACHE: 'unified_notification_cache',
  COUNTS: 'unified_notification_counts',
  VERSION: 'unified_notification_tracker_version',
};

class UnifiedNotificationTracker {
  private static instance: UnifiedNotificationTracker;
  private timestamps: NotificationTimestamps;
  private cache: RecentlyProcessedCache;
  private counts: UnreadCounts;
  private isInitialized = false;

  private constructor() {
    // Initialize with default values
    this.timestamps = {
      lastSeenTimestamp: 0,
      lastProcessedPushTimestamp: 0,
      lastProcessedMirrorTimestamp: 0,
      lastProcessedSmsTimestamp: 0,
      lastProcessedChannelTimestamp: 0,
      lastUpdated: Date.now(),
    };

    this.cache = {
      pushIds: [],
      mirrorIds: [],
      smsIds: [],
      channelIds: [],
      lastCleanup: Date.now(),
    };

    this.counts = {
      pushes: 0,
      mirrors: 0,
      sms: 0,
      channels: 0,
      total: 0,
    };
  }

  public static getInstance(): UnifiedNotificationTracker {
    if (!UnifiedNotificationTracker.instance) {
      UnifiedNotificationTracker.instance = new UnifiedNotificationTracker();
    }
    return UnifiedNotificationTracker.instance;
  }

  /**
   * Initialize the tracker by loading state from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 [UnifiedTracker] Initializing notification tracker');

      // Load timestamps
      const storedTimestamps = await getLocal<NotificationTimestamps>(
        STORAGE_KEYS.TIMESTAMPS
      );
      if (storedTimestamps) {
        this.timestamps = { ...this.timestamps, ...storedTimestamps };
        console.log('🔄 [UnifiedTracker] Loaded timestamps:', this.timestamps);
      }

      // Load cache
      const storedCache = await getLocal<RecentlyProcessedCache>(
        STORAGE_KEYS.CACHE
      );
      if (storedCache) {
        this.cache = { ...this.cache, ...storedCache };
        console.log('🔄 [UnifiedTracker] Loaded cache with entries:', {
          pushIds: this.cache.pushIds.length,
          mirrorIds: this.cache.mirrorIds.length,
          smsIds: this.cache.smsIds.length,
          channelIds: this.cache.channelIds.length,
        });
      }

      // Load counts
      const storedCounts = await getLocal<UnreadCounts>(STORAGE_KEYS.COUNTS);
      if (storedCounts) {
        this.counts = { ...this.counts, ...storedCounts };
        this.updateTotalCount();
        console.log('🔄 [UnifiedTracker] Loaded counts:', this.counts);
      }

      // Perform cache cleanup if needed
      await this.cleanupCache();

      this.isInitialized = true;
      console.log('✅ [UnifiedTracker] Initialization complete');
    } catch (error) {
      console.error('❌ [UnifiedTracker] Failed to initialize:', error);
      // Continue with default values if initialization fails
      this.isInitialized = true;
    }
  }

  /**
   * Determine if a notification should be shown based on timestamp and cache
   */
  async shouldShowNotification(
    notification: NotificationData
  ): Promise<boolean> {
    await this.ensureInitialized();

    const created =
      typeof notification.created === 'string'
        ? new Date(notification.created).getTime()
        : notification.created;

    const lastSeenTimestampMs = this.timestamps.lastSeenTimestamp * 1000; // Convert seconds to milliseconds
    const bufferTimeMs = BUFFER_TIME;
    const cutoffTimestampMs = lastSeenTimestampMs - bufferTimeMs;

    console.log(
      `🔍 [UnifiedTracker] Evaluating notification: ${notification.id}`,
      {
        notificationId: notification.id,
        notificationType: notification.type,
        createdTimestamp: created,
        createdISO: new Date(created).toISOString(),
        lastSeenTimestamp: this.timestamps.lastSeenTimestamp,
        lastSeenTimestampMs: lastSeenTimestampMs,
        lastSeenISO: new Date(lastSeenTimestampMs).toISOString(),
        bufferTimeMs: bufferTimeMs,
        cutoffTimestampMs: cutoffTimestampMs,
        cutoffISO: new Date(cutoffTimestampMs).toISOString(),
        comparison: {
          createdVsLastSeen: created - lastSeenTimestampMs,
          createdVsCutoff: created - cutoffTimestampMs,
          isNewerThanCutoff: created > cutoffTimestampMs,
        },
      }
    );

    // Check if notification is too old (with buffer time for clock skew)
    // Note: lastSeenTimestamp is in seconds, created is in milliseconds
    if (created <= this.timestamps.lastSeenTimestamp * 1000 - bufferTimeMs) {
      console.log(
        `⏭️ [UnifiedTracker] REJECTED - Too old: ${notification.id}`,
        {
          reason: 'timestamp_too_old',
          createdMs: created,
          cutoffMs: cutoffTimestampMs,
          differenceMs: created - cutoffTimestampMs,
          createdISO: new Date(created).toISOString(),
          cutoffISO: new Date(cutoffTimestampMs).toISOString(),
        }
      );
      return false;
    }

    // Check if notification was recently processed
    const isRecentlyProcessed = this.isRecentlyProcessed(
      notification.id,
      notification.type
    );
    if (isRecentlyProcessed) {
      console.log(
        `⏭️ [UnifiedTracker] REJECTED - Recently processed: ${notification.id}`,
        {
          reason: 'recently_processed',
          notificationType: notification.type,
          notificationId: notification.id,
        }
      );
      return false;
    }

    console.log(
      `✅ [UnifiedTracker] APPROVED - Will show notification: ${notification.id}`,
      {
        notificationId: notification.id,
        notificationType: notification.type,
        createdISO: new Date(created).toISOString(),
        passedTimeCheck: true,
        passedDuplicateCheck: true,
      }
    );
    return true;
  }

  /**
   * Mark notification as processed (for API efficiency)
   */
  async markAsProcessed(
    type: NotificationType,
    id: string,
    timestamp: number
  ): Promise<void> {
    await this.ensureInitialized();

    console.log(
      `📝 [UnifiedTracker] Marking as processed: ${id} (type: ${type}, timestamp: ${timestamp})`
    );

    // Update the appropriate timestamp
    const timestampKey =
      `lastProcessed${type.charAt(0).toUpperCase() + type.slice(1)}Timestamp` as keyof NotificationTimestamps;
    if (this.timestamps[timestampKey] < timestamp) {
      this.timestamps[timestampKey] = timestamp;
    }

    // Add to cache
    this.addToCache(type, id);

    // Update last updated timestamp
    this.timestamps.lastUpdated = Date.now();

    // Save state
    await this.saveState();
  }

  /**
   * Mark all notifications as seen (when user opens popup or dismisses)
   * @param timestamp - The timestamp to mark as seen. Must be in milliseconds (optional).
   */
  async markAsSeen(timestamp?: number): Promise<void> {
    await this.ensureInitialized();

    const seenTimestamp = (timestamp || Date.now()) / 1000;
    console.log(
      `👁️ [UnifiedTracker] Marking notifications as seen at: ${seenTimestamp}`
    );

    this.timestamps.lastSeenTimestamp = seenTimestamp;
    this.timestamps.lastUpdated = Date.now();

    await this.saveState();
  }

  /**
   * Increment notification count for a specific type
   */
  async incrementCount(
    type: NotificationType,
    amount: number = 1
  ): Promise<void> {
    await this.ensureInitialized();

    const countKey = this.getCountKey(type);
    const oldCount = this.counts[countKey];
    const newCount = Math.max(0, oldCount + amount);

    this.counts[countKey] = newCount;
    this.updateTotalCount();

    console.log(`📈 [UnifiedTracker] Incremented ${type} count:`, {
      type,
      amount,
      oldCount,
      newCount,
      total: this.counts.total,
    });

    await this.saveState();
  }

  /**
   * Decrement notification count for a specific type
   */
  async decrementCount(
    type: NotificationType,
    amount: number = 1
  ): Promise<void> {
    await this.ensureInitialized();

    const countKey = this.getCountKey(type);
    const oldCount = this.counts[countKey];
    const newCount = Math.max(0, oldCount - amount);

    this.counts[countKey] = newCount;
    this.updateTotalCount();

    console.log(`📉 [UnifiedTracker] Decremented ${type} count:`, {
      type,
      amount,
      oldCount,
      newCount,
      total: this.counts.total,
    });

    await this.saveState();
  }

  /**
   * Set notification count for a specific type
   */
  async setCount(type: NotificationType, count: number): Promise<void> {
    await this.ensureInitialized();

    const countKey = this.getCountKey(type);
    const oldCount = this.counts[countKey];
    const newCount = Math.max(0, count);

    this.counts[countKey] = newCount;
    this.updateTotalCount();

    console.log(`🎯 [UnifiedTracker] Set ${type} count:`, {
      type,
      oldCount,
      newCount,
      total: this.counts.total,
    });

    await this.saveState();
  }

  /**
   * Get unread counts for badge calculation
   */
  async getUnreadCount(
    type?: NotificationType
  ): Promise<UnreadCounts | number> {
    await this.ensureInitialized();

    if (type) {
      // Map notification type to count property
      const countMap: Record<NotificationType, keyof UnreadCounts> = {
        push: 'pushes',
        mirror: 'mirrors',
        sms: 'sms',
        channel: 'channels',
      };
      return this.counts[countMap[type]];
    }

    return { ...this.counts };
  }

  /**
   * Clear all notifications (reset state)
   */
  async clearAllNotifications(): Promise<void> {
    await this.ensureInitialized();

    console.log('🗑️ [UnifiedTracker] Clearing all notifications');

    // Reset timestamps to current time
    const now = Date.now();
    this.timestamps = {
      lastSeenTimestamp: now,
      lastProcessedPushTimestamp: now,
      lastProcessedMirrorTimestamp: now,
      lastProcessedSmsTimestamp: now,
      lastProcessedChannelTimestamp: now,
      lastUpdated: now,
    };

    // Clear cache
    this.cache = {
      pushIds: [],
      mirrorIds: [],
      smsIds: [],
      channelIds: [],
      lastCleanup: now,
    };

    // Clear counts
    this.counts = {
      pushes: 0,
      mirrors: 0,
      sms: 0,
      channels: 0,
      total: 0,
    };

    await this.saveState();
  }

  /**
   * Clear notifications of a specific type
   */
  async clearNotifications(type: NotificationType): Promise<void> {
    await this.ensureInitialized();

    const countKey = this.getCountKey(type);
    const oldCount = this.counts[countKey];

    this.counts[countKey] = 0;
    this.updateTotalCount();

    console.log(`🗑️ [UnifiedTracker] Cleared ${type} notifications:`, {
      type,
      oldCount,
      newCount: 0,
      total: this.counts.total,
    });

    await this.saveState();
  }

  /**
   * Validate tracker state and attempt recovery if needed
   */
  async validateState(): Promise<boolean> {
    await this.ensureInitialized();

    const validateCurrentState = () => {
      const now = Date.now();
      return (
        this.timestamps.lastSeenTimestamp >= 0 &&
        this.timestamps.lastSeenTimestamp <= now &&
        this.timestamps.lastUpdated >= 0 &&
        this.timestamps.lastUpdated <= now &&
        this.counts.pushes >= 0 &&
        this.counts.mirrors >= 0 &&
        this.counts.sms >= 0 &&
        this.counts.channels >= 0 &&
        this.counts.total >= 0
      );
    };

    const isValid = validateCurrentState();

    if (!isValid) {
      console.warn(
        '⚠️ [UnifiedTracker] State validation failed, attempting recovery'
      );
      await this.recoverState();

      // Re-validate after recovery
      return validateCurrentState();
    }

    return isValid;
  }

  /**
   * Get current tracker state for debugging
   */
  getState(): {
    timestamps: NotificationTimestamps;
    cache: RecentlyProcessedCache;
    counts: UnreadCounts;
  } {
    return {
      timestamps: { ...this.timestamps },
      cache: { ...this.cache },
      counts: { ...this.counts },
    };
  }

  /**
   * Check if notification was recently processed
   */
  private isRecentlyProcessed(id: string, type: NotificationType): boolean {
    const cacheKey = `${type}Ids` as keyof RecentlyProcessedCache;
    const cache = this.cache[cacheKey] as string[];
    return cache.includes(id);
  }

  /**
   * Add notification ID to cache
   */
  private addToCache(type: NotificationType, id: string): void {
    const cacheKey = `${type}Ids` as keyof RecentlyProcessedCache;
    const cache = this.cache[cacheKey] as string[];

    // Add to beginning of array
    cache.unshift(id);

    // Keep only the most recent entries
    if (cache.length > CACHE_SIZE) {
      cache.splice(CACHE_SIZE);
    }

    (this.cache[cacheKey] as string[]) = cache;
  }

  /**
   * Get the correct count key for a notification type
   */
  private getCountKey(type: NotificationType): keyof UnreadCounts {
    const countMap: Record<NotificationType, keyof UnreadCounts> = {
      push: 'pushes',
      mirror: 'mirrors',
      sms: 'sms',
      channel: 'channels',
    };
    return countMap[type];
  }

  /**
   * Update total count based on individual counts
   */
  private updateTotalCount(): void {
    this.counts.total =
      this.counts.pushes +
      this.counts.mirrors +
      this.counts.sms +
      this.counts.channels;
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    const now = Date.now();

    // Only cleanup if enough time has passed
    if (now - this.cache.lastCleanup < CACHE_CLEANUP_INTERVAL) {
      return;
    }

    console.log('🧹 [UnifiedTracker] Cleaning up cache');

    // For now, we'll just update the cleanup timestamp
    // In the future, we could implement more sophisticated cleanup
    this.cache.lastCleanup = now;
    await this.saveState();
  }

  /**
   * Ensure tracker is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Save current state to storage
   */
  private async saveState(): Promise<void> {
    try {
      await Promise.all([
        setLocal(STORAGE_KEYS.TIMESTAMPS, this.timestamps),
        setLocal(STORAGE_KEYS.CACHE, this.cache),
        setLocal(STORAGE_KEYS.COUNTS, this.counts),
      ]);
    } catch (error) {
      console.error('❌ [UnifiedTracker] Failed to save state:', error);
    }
  }

  /**
   * Recover from invalid state
   */
  private async recoverState(): Promise<void> {
    console.log('🔄 [UnifiedTracker] Recovering from invalid state');

    // Reset to current time
    const now = Date.now();
    this.timestamps = {
      lastSeenTimestamp: now,
      lastProcessedPushTimestamp: now,
      lastProcessedMirrorTimestamp: now,
      lastProcessedSmsTimestamp: now,
      lastProcessedChannelTimestamp: now,
      lastUpdated: now,
    };

    // Clear cache
    this.cache = {
      pushIds: [],
      mirrorIds: [],
      smsIds: [],
      channelIds: [],
      lastCleanup: now,
    };

    // Reset counts
    this.counts = {
      pushes: 0,
      mirrors: 0,
      sms: 0,
      channels: 0,
      total: 0,
    };

    await this.saveState();
  }
}

// Export singleton instance and class for testing
export const unifiedNotificationTracker =
  UnifiedNotificationTracker.getInstance();
export { UnifiedNotificationTracker };
