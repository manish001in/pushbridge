/**
 * Notification Badge Manager
 * Handles showing badges on the extension icon for new notifications
 * Now fully integrated with UnifiedNotificationTracker for centralized state management
 */

import { getTotalUnreadCount } from './smsBridge';
import { getLocal, setLocal } from './storage';
import { unifiedNotificationTracker, UnreadCounts } from './unifiedNotificationTracker';

export interface NotificationCounts {
  pushes: number;
  sms: number;
  total: number;
}

export interface BadgeState {
  counts: NotificationCounts;
  lastUpdated: number;
}

class NotificationBadgeManager {
  private static instance: NotificationBadgeManager;
  private badgeState: BadgeState = {
    counts: { pushes: 0, sms: 0, total: 0 },
    lastUpdated: 0
  };

  private constructor() {
    this.initializeBadge();
  }

  public static getInstance(): NotificationBadgeManager {
    if (!NotificationBadgeManager.instance) {
      NotificationBadgeManager.instance = new NotificationBadgeManager();
    }
    return NotificationBadgeManager.instance;
  }

  /**
   * Initialize badge state from storage and unified tracker
   */
  private async initializeBadge(): Promise<void> {
    try {
      console.log('🏷️ [NotificationBadge] Initializing badge from storage');
      
      // Initialize the unified tracker first
      await unifiedNotificationTracker.initialize();
      
      const stored = await getLocal<BadgeState>('notification_badge_state');
      if (stored) {
        this.badgeState = stored;
        console.log('🏷️ [NotificationBadge] Loaded stored badge state:', this.badgeState);
      } else {
        console.log('🏷️ [NotificationBadge] No stored badge state found, using defaults');
      }
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to initialize notification badge:', error);
    }
  }

  /**
   * Add new push notifications (delegates to unified tracker)
   */
  async addPushNotifications(count: number): Promise<void> {
    if (count > 0) {
      await unifiedNotificationTracker.incrementCount('push', count);
    } else if (count < 0) {
      await unifiedNotificationTracker.decrementCount('push', Math.abs(count));
    }
    
    await this.updateBadge();
  }

  /**
   * Update SMS notification count (delegates to unified tracker)
   */
  async updateSmsNotifications(): Promise<void> {
    try {
      const smsCount = await getTotalUnreadCount();
      await unifiedNotificationTracker.setCount('sms', smsCount);
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to update SMS notifications:', error);
    }
  }

  /**
   * Clear push notifications (delegates to unified tracker)
   */
  async clearPushNotifications(): Promise<void> {
    await unifiedNotificationTracker.clearNotifications('push');
    await this.updateBadge();
  }

  /**
   * Clear SMS notifications (delegates to unified tracker)
   */
  async clearSmsNotifications(): Promise<void> {
    await unifiedNotificationTracker.clearNotifications('sms');
    await this.updateBadge();
  }

  /**
   * Clear all notifications using unified tracker
   */
  async clearAllNotifications(): Promise<void> {
    await unifiedNotificationTracker.clearAllNotifications();
    await this.updateBadge();
  }

  /**
   * Get current notification counts from unified tracker
   */
  async getNotificationCounts(): Promise<NotificationCounts> {
    try {
      // Get unread counts from unified tracker
      const unreadCounts = await unifiedNotificationTracker.getUnreadCount() as UnreadCounts;
      
      // Update local state to match unified tracker
      this.badgeState.counts = {
        pushes: unreadCounts.pushes,
        sms: unreadCounts.sms,
        total: unreadCounts.total
      };
      
      return { ...this.badgeState.counts };
    } catch (error) {
      console.error('Failed to get notification counts from unified tracker:', error);
      // Fallback to local state
      return { ...this.badgeState.counts };
    }
  }

  /**
   * Update the badge on the extension icon
   */
  private async updateBadge(): Promise<void> {
    try {
      // Get current counts from unified tracker
      const unreadCounts = await unifiedNotificationTracker.getUnreadCount() as UnreadCounts;
      const { total, pushes, sms } = unreadCounts;
      
      // Update local state
      this.badgeState.counts = { pushes, sms, total };
      this.badgeState.lastUpdated = Date.now();
      
      console.log('🏷️ [NotificationBadge] Updating badge:', {
        total,
        pushes,
        sms,
        badgeState: this.badgeState
      });
      
      if (total === 0) {
        // Clear badge
        console.log('🏷️ [NotificationBadge] Clearing badge (no notifications)');
        await chrome.action.setBadgeText({ text: '' });
      } else if (total === 1) {
        // Show red dot for single notification
        console.log('🏷️ [NotificationBadge] Setting badge to red dot (single notification)');
        await chrome.action.setBadgeText({ text: '•' });
        await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
      } else {
        // Show count for multiple notifications
        const displayText = total > 99 ? '99+' : total.toString();
        console.log('🏷️ [NotificationBadge] Setting badge to count:', displayText);
        await chrome.action.setBadgeText({ text: displayText });
        
        // Use different colors based on notification types
        if (sms > 0 && pushes > 0) {
          // Mixed notifications - purple
          console.log('🏷️ [NotificationBadge] Setting badge color to purple (mixed notifications)');
          await chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
        } else if (sms > 0) {
          // SMS only - blue
          console.log('🏷️ [NotificationBadge] Setting badge color to blue (SMS only)');
          await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
        } else {
          // Pushes only - red
          console.log('🏷️ [NotificationBadge] Setting badge color to red (pushes only)');
          await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        }
      }
      
      // Save badge state
      await this.saveBadgeState();
    } catch (error) {
      console.error('Failed to update notification badge:', error);
    }
  }

  /**
   * Save badge state to storage
   */
  private async saveBadgeState(): Promise<void> {
    try {
      console.log('🏷️ [NotificationBadge] Saving badge state to storage:', this.badgeState);
      await setLocal('notification_badge_state', this.badgeState);
    } catch (error) {
      console.error('Failed to save badge state:', error);
    }
  }

  /**
   * Refresh badge state (called periodically or on popup open)
   */
  async refreshBadge(): Promise<void> {
    console.log('🏷️ [NotificationBadge] Refreshing badge state');
    await this.updateSmsNotifications();
  }
}

// Export singleton instance
export const notificationBadge = NotificationBadgeManager.getInstance(); 