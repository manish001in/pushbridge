/**
 * Mirror Manager for Pushbridge extension
 * Handles Chrome notification creation and dismissal sync
 */

import { MirrorPush, DismissalPush, MirrorMeta } from '../types/pushbullet';

import { getContactName } from './contactManager';
import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { notificationBadge } from './notificationBadge';
import { addMessageToThread } from './smsBridge';
import { getLocal, setLocal, removeLocal } from './storage';
import { fromPushbulletTime } from './timestampUtils';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

// Constants
const MIRROR_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MIRROR_STORAGE_PREFIX = 'mirror_';

/**
 * Handle mirror push by creating Chrome notification
 */
export async function handleMirror(push: MirrorPush): Promise<void> {
  try {
    console.log('🔔 [MirrorManager] Handling mirror push:', {
      application_name: push.application_name,
      package_name: push.package_name,
      title: push.title
    });

    // Handle SMS/MMS specifically
    if (push.application_name === 'SMS') {
      await handleIncomingSms(push);

      // Remove double notification creation - handleIncomingSms already handles this
      // await createSmsNotification(push);  // ❌ REMOVED - This was causing double notifications
      return;
    }

    // Generate unique Chrome notification ID
    const chromeNotifId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create notification metadata
    const notifMeta: MirrorMeta = {
      package_name: push.package_name,
      notification_id: push.notification_id,
      notification_tag: push.notification_tag,
      source_device_iden: push.source_device_iden,
      title: push.title,
      body: push.body,
      application_name: push.application_name,
      icon_url: push.icon_url,
      expiresAt: Date.now() + MIRROR_TTL,
    };

    // Store metadata in local storage
    await setLocal(`${MIRROR_STORAGE_PREFIX}${chromeNotifId}`, notifMeta);

    // Create Chrome notification
    const notificationOptions = {
      type: 'basic' as const,
      title: push.title,
      message: push.body,
      iconUrl: push.icon_url ? push.icon_url : 'icons/48.png',
      requireInteraction: true,
      silent: false,
    };

    await chrome.notifications.create(chromeNotifId, notificationOptions);

    // Update notification badge for mirror notification
    console.log('🔔 [MirrorManager] Adding mirror notification to badge');
    await notificationBadge.addPushNotifications(1);
    
    // Mark as processed in unified tracker
    await unifiedNotificationTracker.markAsProcessed('mirror', push.notification_id, Date.now());

    console.log(
      'Chrome notification created:',
      chromeNotifId,
      'for app:',
      push.package_name
    );
  } catch (error) {
    console.error('Failed to handle mirror push:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to create notification from phone',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Handle remote dismissal by clearing Chrome notification
 */
export async function handleRemoteDismiss(push: DismissalPush): Promise<void> {
  try {
    console.log('🗑️ [MirrorManager] Handling remote dismissal:', {
      package_name: push.package_name,
      notification_id: push.notification_id
    });

    // Find matching Chrome notification by metadata
    const mirrorEntries = await findMatchingMirrors(push);

    for (const [chromeNotifId] of mirrorEntries) {
      // Clear the Chrome notification
      await chrome.notifications.clear(chromeNotifId);

      // Remove from storage
      await removeLocal(`${MIRROR_STORAGE_PREFIX}${chromeNotifId}`);

      // Update notification badge (decrement mirror count)
      console.log('🗑️ [MirrorManager] Removing mirror notification from badge');
      await notificationBadge.addPushNotifications(-1);

      console.log(
        'Chrome notification cleared:',
        chromeNotifId,
        'for app:',
        push.package_name
      );
    }
  } catch (error) {
    console.error('Failed to handle remote dismissal:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to clear notification from phone',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Handle user-initiated dismissal (Chrome notification clicked/closed)
 */
export async function handleUserDismissal(
  chromeNotifId: string
): Promise<void> {
  try {
    console.log('👤 [MirrorManager] Handling user dismissal for:', chromeNotifId);

    // Get notification metadata
    const meta = await getLocal<MirrorMeta>(
      `${MIRROR_STORAGE_PREFIX}${chromeNotifId}`
    );
    if (!meta) {
      console.log('No metadata found for notification:', chromeNotifId);
      // Just clear the notification if no metadata
      await chrome.notifications.clear(chromeNotifId);
      return;
    }

    // Get user ID for dismissal payload
    const userIden = await getLocal<string>('pb_user_iden');
    if (!userIden) {
      console.error('No user ID found for dismissal');
      return;
    }

    // Send dismissal ephemeral to Pushbullet
    await sendDismissalEphemeral(meta, userIden);

    // Remove from storage
    await removeLocal(`${MIRROR_STORAGE_PREFIX}${chromeNotifId}`);

    // Update notification badge (decrement mirror count)
    console.log('👤 [MirrorManager] Removing mirror notification from badge (user dismissal)');
    await notificationBadge.addPushNotifications(-1);

    console.log('User dismissal sent to phone for:', chromeNotifId);
  } catch (error) {
    console.error('Failed to handle user dismissal:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to dismiss notification on phone',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Find matching mirror entries for a dismissal push
 */
async function findMatchingMirrors(
  push: DismissalPush
): Promise<Array<[string, MirrorMeta]>> {
  const matches: Array<[string, MirrorMeta]> = [];

  try {
    // Get all mirror entries from storage
    const allData = await chrome.storage.local.get(null);

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(MIRROR_STORAGE_PREFIX)) {
        const meta = value as MirrorMeta;

        // Check if metadata matches dismissal criteria
        if (
          meta.package_name === push.package_name &&
          meta.notification_id === push.notification_id &&
          meta.notification_tag === push.notification_tag
        ) {
          const chromeNotifId = key.replace(MIRROR_STORAGE_PREFIX, '');
          matches.push([chromeNotifId, meta]);
        }
      }
    }
  } catch (error) {
    console.error('Failed to find matching mirrors:', error);
  }

  return matches;
}

/**
 * Send dismissal ephemeral to Pushbullet API
 */
async function sendDismissalEphemeral(
  meta: MirrorMeta,
  userIden: string
): Promise<void> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    const dismissalPayload = {
      type: 'push',
      push: {
        type: 'dismissal',
        package_name: meta.package_name,
        notification_id: meta.notification_id,
        notification_tag: meta.notification_tag,
        source_user_iden: userIden,
      },
    };

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/ephemerals',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': token,
        },
        body: JSON.stringify(dismissalPayload),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Dismissal API error: ${response.status} ${response.statusText}`
      );
    }

    console.log('Dismissal ephemeral sent successfully');
  } catch (error) {
    console.error('Failed to send dismissal ephemeral:', error);
    throw error;
  }
}

/**
 * Reconstruct Chrome notifications after service worker restart
 */
export async function reconstructMirrors(): Promise<void> {
  try {
    const allData = await chrome.storage.local.get(null);
    const now = Date.now();

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(MIRROR_STORAGE_PREFIX)) {
        const meta = value as MirrorMeta;

        // Skip expired entries
        if (meta.expiresAt < now) {
          await removeLocal(key);
          continue;
        }

        const chromeNotifId = key.replace(MIRROR_STORAGE_PREFIX, '');

        // Recreate the notification
        const notificationOptions = {
          type: 'basic' as const,
          title: meta.title,
          message: meta.body,
          iconUrl: meta.icon_url ? meta.icon_url : 'icons/48.png',
          requireInteraction: true,
          silent: false,
        };

        await chrome.notifications.create(chromeNotifId, notificationOptions);
        console.log('Reconstructed notification:', chromeNotifId);
      }
    }
  } catch (error) {
    console.error('Failed to reconstruct mirrors:', error);
  }
}

/**
 * Clean up expired mirror entries
 */
export async function cleanupExpiredMirrors(): Promise<void> {
  try {
    console.log('🧹 [MirrorManager] Cleaning up expired mirrors');
    const allData = await chrome.storage.local.get(null);
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(MIRROR_STORAGE_PREFIX)) {
        const meta = value as MirrorMeta;

        if (meta.expiresAt < now) {
          await removeLocal(key);
          expiredCount++;
          console.log('Cleaned up expired mirror:', key);
        }
      }
    }

    // Update notification badge if any mirrors were cleaned up
    if (expiredCount > 0) {
      console.log(`🧹 [MirrorManager] Removed ${expiredCount} expired mirrors from badge`);
      await notificationBadge.addPushNotifications(-expiredCount);
    }
  } catch (error) {
    console.error('Failed to cleanup expired mirrors:', error);
  }
}

/**
 * Get all active mirror notifications
 */
export async function getActiveMirrors(): Promise<
  Array<{ id: string; meta: MirrorMeta }>
> {
  const mirrors: Array<{ id: string; meta: MirrorMeta }> = [];

  try {
    const allData = await chrome.storage.local.get(null);
    const now = Date.now();

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(MIRROR_STORAGE_PREFIX)) {
        const meta = value as MirrorMeta;

        // Skip expired entries
        if (meta.expiresAt < now) {
          continue;
        }

        const chromeNotifId = key.replace(MIRROR_STORAGE_PREFIX, '');
        mirrors.push({ id: chromeNotifId, meta });
      }
    }
  } catch (error) {
    console.error('Failed to get active mirrors:', error);
  }

  return mirrors;
}

// REMOVED: createSmsNotification function - was causing double notifications
// SMS Chrome notifications are now handled directly in handleIncomingSms() to avoid duplicates

/**
 * Handle incoming SMS/MMS from mirror ephemeral
 * @param push - The mirror push containing SMS data
 */
async function handleIncomingSms(push: MirrorPush): Promise<void> {
  try {
    if (push.application_name !== 'SMS') {
      return; // Not an SMS
    }

    // Extract conversation ID from notification data
    const conversationId =
      (push as any).conversation_iden ||
      `${push.package_name}:${(push as any).address}` ||
      push.notification_id;

    // Get message timestamp - CRITICAL FIX: Pushbullet API uses seconds, convert to milliseconds
    const rawTimestamp = (push as any).timestamp;
    const messageTimestamp = rawTimestamp 
      ? fromPushbulletTime(rawTimestamp)  // Convert seconds to milliseconds
      : Date.now();

    console.log(`📱 [MirrorManager] Processing SMS with timestamp conversion:`, {
      rawTimestamp,
      rawTimestampISO: rawTimestamp ? new Date(rawTimestamp * 1000).toISOString() : 'none',
      convertedTimestamp: messageTimestamp,
      convertedTimestampISO: new Date(messageTimestamp).toISOString(),
      conversationId
    });

    // Check if we should show this notification based on last seen time
    const shouldShow = await unifiedNotificationTracker.shouldShowNotification({
      id: push.notification_id || `sms_${Date.now()}`,
      type: 'sms',
      created: messageTimestamp,
      metadata: { 
        conversationId,
        packageName: push.package_name,
        applicationName: push.application_name
      }
    });

    if (!shouldShow) {
      console.log(`⏭️ [MirrorManager] Skipping SMS notification (too old): ${conversationId}`);
      return;
    }

    // Create Chrome notification for SMS (since we removed createSmsNotification call)
    const chromeNotifId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📱 [MirrorManager] Creating Chrome notification for SMS:', {
      title: push.title,
      body: push.body,
      chromeNotifId: chromeNotifId
    });

    await chrome.notifications.create(chromeNotifId, {
      type: 'basic' as const,
      title: push.title,
      message: push.body,
      iconUrl: push.icon_url ? push.icon_url : 'icons/48.png',
      requireInteraction: false, // SMS notifications can auto-dismiss
      silent: false,
    });

    // Create SMS message object
    const message = {
      id: push.notification_id || `incoming_${Date.now()}`,
      pb_guid:
        (push as any).pb_guid || `incoming_${Date.now()}_${Math.random()}`,
      timestamp: messageTimestamp,
      inbound: true,
      text: push.body || '',
      image_url: (push as any).image_url,
      conversation_iden: conversationId,
    };

    // Get contact name for the conversation
    const contactName = await getContactName(conversationId);

    // Add message to thread cache
    await addMessageToThread(conversationId, message, contactName);

    // Mark as processed in unified tracker
    await unifiedNotificationTracker.markAsProcessed('sms', message.id, messageTimestamp);

    console.log('✅ [MirrorManager] Incoming SMS processed:', conversationId, 'Chrome notif:', chromeNotifId);
  } catch (error) {
    console.error('Failed to handle incoming SMS:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to handle incoming SMS',
      code: error instanceof Error ? undefined : 500,
    });
  }
}
