/**
 * User Feedback System for Pushbridge extension
 * Handles rate limit notifications and user feedback
 */

class UserFeedback {
  private isRateLimited: boolean = false;
  private notificationId: string | null = null;

  /**
   * Show rate limit notification
   * @param backoffSeconds - Duration of backoff in seconds
   */
  async showRateLimitNotification(backoffSeconds: number): Promise<void> {
    if (this.isRateLimited) {
      return; // Already showing notification
    }

    try {
      // Set badge to "RL" for rate limit
      await chrome.action.setBadgeText({ text: 'RL' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });

      // Show toast notification
              this.notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.notifications.create(this.notificationId, {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title: 'Rate Limit Hit',
        message: `Retrying in ${backoffSeconds}s. Operations queued.`,
      });

      this.isRateLimited = true;

      console.log(`Rate limit notification shown: ${backoffSeconds}s backoff`);
    } catch (error) {
      console.error('Failed to show rate limit notification:', error);
    }
  }

  /**
   * Clear rate limit notification
   */
  async clearRateLimitNotification(): Promise<void> {
    if (!this.isRateLimited) {
      return; // No notification to clear
    }

    try {
      // Clear badge
      await chrome.action.setBadgeText({ text: '' });

      // Show recovery notification
              const recoveryId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.notifications.create(recoveryId, {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title: 'Rate Limit Cleared',
        message: 'Operations resuming normally.',
      });

      // Clear the original notification if it exists
      if (this.notificationId) {
        try {
          await chrome.notifications.clear(this.notificationId);
        } catch {
          // Ignore errors when clearing notifications
        }
        this.notificationId = null;
      }

      this.isRateLimited = false;

      console.log('Rate limit notification cleared');
    } catch (error) {
      console.error('Failed to clear rate limit notification:', error);
    }
  }

  /**
   * Show queue status notification
   * @param pendingCount - Number of pending operations
   */
  async showQueueStatus(pendingCount: number): Promise<void> {
    if (pendingCount === 0) {
      return;
    }

    try {
      const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title: 'Operations Queued',
        message: `${pendingCount} operation(s) waiting to be processed.`,
      });

      console.log(`Queue status notification shown: ${pendingCount} pending`);
    } catch (error) {
      console.error('Failed to show queue status notification:', error);
    }
  }

  /**
   * Update badge with queue status
   * @param pendingCount - Number of pending operations
   */
  async updateQueueBadge(pendingCount: number): Promise<void> {
    try {
      if (pendingCount > 0) {
        // Show queue status with a different badge style to avoid conflicts
        await chrome.action.setBadgeText({ text: `Q${pendingCount}` });
        await chrome.action.setBadgeBackgroundColor({ color: '#FFA500' }); // Orange
      } else {
        // Don't clear badge here - let notification badge manager handle it
        // This prevents conflicts with notification badges
      }
    } catch (error) {
      console.error('Failed to update queue badge:', error);
    }
  }

  /**
   * Show error notification
   * @param title - Notification title
   * @param message - Notification message
   */
  async showErrorNotification(title: string, message: string): Promise<void> {
    try {
      const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title,
        message,
      });

      console.log(`Error notification shown: ${title}`);
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  /**
   * Show success notification
   * @param title - Notification title
   * @param message - Notification message
   */
  async showSuccessNotification(title: string, message: string): Promise<void> {
    try {
      const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title,
        message,
      });

      console.log(`Success notification shown: ${title}`);
    } catch (error) {
      console.error('Failed to show success notification:', error);
    }
  }

  /**
   * Check if rate limit notification is currently showing
   */
  isRateLimitNotificationActive(): boolean {
    return this.isRateLimited;
  }

  /**
   * Get current notification ID
   */
  getNotificationId(): string | null {
    return this.notificationId;
  }

  /**
   * Clear all notifications (for testing or reset scenarios)
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: '' });

      if (this.notificationId) {
        try {
          await chrome.notifications.clear(this.notificationId);
        } catch {
          // Ignore errors when clearing notifications
        }
        this.notificationId = null;
      }

      this.isRateLimited = false;

      console.log('All notifications cleared');
    } catch {
      console.error('Failed to clear all notifications');
    }
  }
}

// Export singleton instance
export const userFeedback = new UserFeedback();
