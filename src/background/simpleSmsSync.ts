/**
 * Simple SMS Sync for Pushbridge
 * ONE function that does everything: fetch threads, fetch messages, update cache, handle notifications
 * Replaces all the complex lazy loading, caching, and separate API call logic
 */

import { SmsThread, SmsMsg } from '../types/pushbullet';

import { getDefaultSmsDevice } from './deviceManager';
import { notificationBadge } from './notificationBadge';
import { smsApiClient } from './smsApiClient';
import { getLocal, setLocal } from './storage';
import { fromPushbulletTime, now } from './timestampUtils';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

// Simple storage keys
const SMS_DATA_KEY = (deviceIden: string) => `sms_data_${deviceIden}`;
const SMS_LAST_SYNC_KEY = (deviceIden: string) => `sms_last_sync_${deviceIden}`;

// Simple data structure
interface SimpleSmsData {
  threads: SmsThread[];
  lastSync: number;
  deviceIden: string;
}

/**
 * The ONE function that does everything for SMS
 * Call this from: daily timer, popup open, sms_changed push
 */
export async function syncAllSmsData(
  deviceIden: string
): Promise<SimpleSmsData> {
  console.log(
    `🔄 [SimpleSMS] Starting complete SMS sync for device: ${deviceIden}`
  );

  try {
    // Initialize API client
    await smsApiClient.initialize();

    // Check if device is online
    const isOnline = await smsApiClient.isDeviceOnline(deviceIden);
    if (!isOnline) {
      console.warn(`⚠️ [SimpleSMS] Device ${deviceIden} is offline`);
      // Return cached data if available
      return await getCachedSmsData(deviceIden);
    }

    // 1. Get all threads
    console.log(`📱 [SimpleSMS] Fetching SMS threads...`);
    const threadsResponse = await smsApiClient.getSmsThreadsList(deviceIden);

    const threads: SmsThread[] = [];

    // 2. For each thread, get all messages
    for (const apiThread of threadsResponse.threads) {
      console.log(
        `📨 [SimpleSMS] Fetching messages for thread: ${apiThread.id}`
      );

      try {
        const messagesResponse = await smsApiClient.getSmsThreadMessages(
          deviceIden,
          apiThread.id
        );

        // Convert API data to our format
        const messages: SmsMsg[] = messagesResponse.thread.map(msg => ({
          id: msg.id,
          pb_guid: msg.guid || msg.id,
          timestamp: fromPushbulletTime(msg.timestamp),
          inbound: msg.direction === 'incoming',
          text: msg.body,
          conversation_iden: apiThread.id,
        }));

        // Get lastSeenTimestamp from unified tracker for proper unread count calculation
        const trackerState = unifiedNotificationTracker.getState();
        const lastSeenTimestamp = trackerState.timestamps.lastSeenTimestamp;

        // Create thread with all messages
        const thread: SmsThread = {
          id: apiThread.id,
          name: getThreadName(apiThread),
          messages: messages.sort((a, b) => a.timestamp - b.timestamp), // Sort by time
          lastMessageTime:
            messages.length > 0
              ? Math.max(...messages.map(m => m.timestamp))
              : 0,
          unreadCount: calculateUnreadCount(messages, lastSeenTimestamp),
          deviceIden,
          recipients: apiThread.recipients,
        };

        threads.push(thread);

        // Check for new messages and create notifications
        await checkForNewMessages(thread);
      } catch (error) {
        console.warn(
          `⚠️ [SimpleSMS] Failed to fetch messages for thread ${apiThread.id}:`,
          error
        );
        // Continue with other threads
      }
    }

    // 3. Save everything to cache
    const smsData: SimpleSmsData = {
      threads,
      lastSync: now(),
      deviceIden,
    };

    await setLocal(SMS_DATA_KEY(deviceIden), smsData);
    await setLocal(SMS_LAST_SYNC_KEY(deviceIden), smsData.lastSync);

    // Update SMS notification badge with current unread count
    await updateSmsNotificationBadge();

    console.log(
      `✅ [SimpleSMS] Sync complete: ${threads.length} threads, total messages: ${threads.reduce((sum, t) => sum + t.messages.length, 0)}`
    );

    return smsData;
  } catch (error) {
    console.error(
      `❌ [SimpleSMS] Sync failed for device ${deviceIden}:`,
      error
    );
    // Return cached data as fallback
    return await getCachedSmsData(deviceIden);
  }
}

/**
 * Get cached SMS data
 */
export async function getCachedSmsData(
  deviceIden: string
): Promise<SimpleSmsData> {
  const cached = await getLocal<SimpleSmsData>(SMS_DATA_KEY(deviceIden));

  if (cached) {
    console.log(
      `💾 [SimpleSMS] Using cached data: ${cached.threads.length} threads`
    );
    return cached;
  }

  // Return empty data if no cache
  return {
    threads: [],
    lastSync: 0,
    deviceIden,
  };
}

/**
 * Get thread by ID from cache
 */
export async function getThreadById(
  deviceIden: string,
  threadId: string
): Promise<SmsThread | null> {
  const smsData = await getCachedSmsData(deviceIden);
  return smsData.threads.find(t => t.id === threadId) || null;
}

/**
 * Update thread with a sent message
 */
export async function updateThreadWithSentMessage(
  deviceIden: string,
  conversationId: string,
  message: SmsMsg
): Promise<void> {
  try {
    const smsData = await getCachedSmsData(deviceIden);
    const threadIndex = smsData.threads.findIndex(t => t.id === conversationId);

    if (threadIndex !== -1) {
      // Update existing thread
      const thread = smsData.threads[threadIndex];
      thread.messages.push(message);
      thread.messages.sort((a, b) => a.timestamp - b.timestamp); // Keep messages sorted
      thread.lastMessageTime = Math.max(
        thread.lastMessageTime,
        message.timestamp
      );

      // Save updated data
      await setLocal(SMS_DATA_KEY(deviceIden), smsData);
      console.log(
        `📝 [SimpleSMS] Updated thread ${conversationId} with sent message`
      );
    } else {
      console.warn(
        `📝 [SimpleSMS] Thread ${conversationId} not found for sent message update`
      );
    }
  } catch (error) {
    console.error('Failed to update thread with sent message:', error);
  }
}

/**
 * Check if sync is needed (avoid too frequent syncs)
 */
export async function shouldSync(deviceIden: string): Promise<boolean> {
  const lastSync = (await getLocal<number>(SMS_LAST_SYNC_KEY(deviceIden))) || 0;
  const timeSinceSync = now() - lastSync;
  const minInterval = 60 * 1000; // 1 minute minimum between syncs

  return timeSinceSync > minInterval;
}

/**
 * Reload a specific SMS thread by fetching fresh data from API
 */
export async function reloadSmsThread(
  deviceIden: string,
  threadId: string
): Promise<SmsThread | null> {
  console.log(
    `🔄 [SimpleSMS] Reloading specific thread: ${threadId} for device: ${deviceIden}`
  );

  try {
    // Initialize API client
    await smsApiClient.initialize();

    // Check if device is online
    const isOnline = await smsApiClient.isDeviceOnline(deviceIden);
    if (!isOnline) {
      console.warn(`⚠️ [SimpleSMS] Device ${deviceIden} is offline`);
      return null;
    }

    // Fetch fresh thread data
    console.log(
      `📨 [SimpleSMS] Fetching fresh messages for thread: ${threadId}`
    );
    const messagesResponse = await smsApiClient.getSmsThreadMessages(
      deviceIden,
      threadId
    );

    // Convert API data to our format
    const messages: SmsMsg[] = messagesResponse.thread.map(msg => ({
      id: msg.id,
      pb_guid: msg.guid || msg.id,
      timestamp: fromPushbulletTime(msg.timestamp),
      inbound: msg.direction === 'incoming',
      text: msg.body,
      conversation_iden: threadId,
    }));

    // Get lastSeenTimestamp from unified tracker for proper unread count calculation
    const trackerState = unifiedNotificationTracker.getState();
    const lastSeenTimestamp = trackerState.timestamps.lastSeenTimestamp;

    // Find thread info from threads list (we need recipients info)
    const threadsResponse = await smsApiClient.getSmsThreadsList(deviceIden);
    const apiThread = threadsResponse.threads.find(t => t.id === threadId);

    if (!apiThread) {
      console.warn(
        `⚠️ [SimpleSMS] Thread ${threadId} not found in threads list`
      );
      return null;
    }

    // Create updated thread
    const updatedThread: SmsThread = {
      id: threadId,
      name: getThreadName(apiThread),
      messages: messages.sort((a, b) => a.timestamp - b.timestamp), // Sort by time
      lastMessageTime:
        messages.length > 0 ? Math.max(...messages.map(m => m.timestamp)) : 0,
      unreadCount: calculateUnreadCount(messages, lastSeenTimestamp),
      deviceIden,
      recipients: apiThread.recipients,
    };

    // Update the cached data with this specific thread
    const cachedData = await getCachedSmsData(deviceIden);
    const threadIndex = cachedData.threads.findIndex(t => t.id === threadId);

    if (threadIndex >= 0) {
      cachedData.threads[threadIndex] = updatedThread;
    } else {
      cachedData.threads.push(updatedThread);
    }

    // Save updated cache
    await setLocal(SMS_DATA_KEY(deviceIden), cachedData);

    console.log(`✅ [SimpleSMS] Successfully reloaded thread: ${threadId}`);
    return updatedThread;
  } catch (error) {
    console.error(`❌ [SimpleSMS] Failed to reload thread ${threadId}:`, error);
    return null;
  }
}

/**
 * Get total unread SMS count for the simple system
 */
export async function getTotalUnreadSmsCount(
  deviceIden?: string
): Promise<number> {
  try {
    // If no device specified, get default
    if (!deviceIden) {
      const defaultDevice = await getDefaultSmsDevice();
      if (!defaultDevice) return 0;
      deviceIden = defaultDevice.iden;
    }

    const smsData = await getCachedSmsData(deviceIden);
    const totalCount = smsData.threads.reduce(
      (total, thread) => total + thread.unreadCount,
      0
    );

    // Get current lastSeenTimestamp for logging
    const trackerState = unifiedNotificationTracker.getState();
    const lastSeenTimestamp = trackerState.timestamps.lastSeenTimestamp;

    console.log(`📊 [SMSCount] Total unread SMS count:`, {
      deviceIden,
      totalThreads: smsData.threads.length,
      totalUnreadCount: totalCount,
      lastSeenTimestamp: lastSeenTimestamp,
      lastSeenISO: new Date(lastSeenTimestamp * 1000).toISOString(),
      threadBreakdown: smsData.threads.map(t => ({
        name: t.name,
        id: t.id,
        unreadCount: t.unreadCount,
        lastMessageTime: t.lastMessageTime,
        lastMessageISO: new Date(t.lastMessageTime).toISOString(),
      })),
    });

    return totalCount;
  } catch (error) {
    console.error('[SimpleSMS] Failed to get total unread count:', error);
    return 0;
  }
}

/**
 * Update SMS notification badge with current unread count
 */
async function updateSmsNotificationBadge(): Promise<void> {
  try {
    const unreadCount = await getTotalUnreadSmsCount();

    // Update unified tracker with the current SMS count
    await unifiedNotificationTracker.setCount('sms', unreadCount);

    // Refresh the badge
    await notificationBadge.refreshBadge();

    console.log(`📱 [SimpleSMS] Updated badge with ${unreadCount} unread SMS`);
  } catch (error) {
    console.error(
      '[SimpleSMS] Failed to update SMS notification badge:',
      error
    );
  }
}

// Helper functions
function getThreadName(apiThread: any): string {
  if (apiThread.recipients && apiThread.recipients.length > 0) {
    const names = apiThread.recipients
      .map((r: any) => r.name || 'Unknown')
      .join(', ');
    return names || `Thread ${apiThread.id}`;
  }
  return `Thread ${apiThread.id}`;
}

function calculateUnreadCount(
  messages: SmsMsg[],
  lastSeenTimestamp?: number
): number {
  // Count only inbound messages that are newer than lastSeenTimestamp
  const cutoffTimestamp = lastSeenTimestamp ? lastSeenTimestamp * 1000 : 0; // Convert seconds to milliseconds

  const unreadMessages = messages.filter(m => {
    const isInbound = m.inbound;
    const isNewer = m.timestamp > cutoffTimestamp;
    return isInbound && isNewer;
  });

  console.log(`📊 [SMSCount] Calculated unread count:`, {
    totalMessages: messages.length,
    inboundMessages: messages.filter(m => m.inbound).length,
    unreadMessages: unreadMessages.length,
    lastSeenTimestamp: lastSeenTimestamp,
    cutoffTimestampMs: cutoffTimestamp,
    cutoffISO:
      cutoffTimestamp > 0 ? new Date(cutoffTimestamp).toISOString() : 'never',
  });

  return unreadMessages.length;
}

async function checkForNewMessages(thread: SmsThread): Promise<void> {
  if (thread.messages.length === 0) {
    console.log(`📱 [SMSNotif] No messages in thread: ${thread.name}`);
    return;
  }

  const latestMessage = thread.messages[thread.messages.length - 1];

  // Get current tracker state for logging
  const trackerState = unifiedNotificationTracker.getState();
  const lastSeenTimestamp = trackerState.timestamps.lastSeenTimestamp;

  console.log(`📱 [SMSNotif] Checking message for notification:`, {
    threadName: thread.name,
    messageId: latestMessage.id,
    isInbound: latestMessage.inbound,
    messageTimestamp: latestMessage.timestamp,
    messageTimestampISO: new Date(latestMessage.timestamp).toISOString(),
    lastSeenTimestamp: lastSeenTimestamp,
    lastSeenTimestampISO: new Date(lastSeenTimestamp * 1000).toISOString(), // Convert seconds to ms for display
    timestampComparison: {
      messageInMs: latestMessage.timestamp,
      lastSeenInMs: lastSeenTimestamp * 1000,
      messageIsNewer: latestMessage.timestamp > lastSeenTimestamp * 1000,
      timeDifferenceMs: latestMessage.timestamp - lastSeenTimestamp * 1000,
    },
  });

  // Check if this message should trigger a notification
  const shouldShow = await unifiedNotificationTracker.shouldShowNotification({
    id: latestMessage.id,
    type: 'sms',
    created: latestMessage.timestamp,
    metadata: {
      conversationId: thread.id,
    },
  });

  console.log(`📱 [SMSNotif] Notification decision:`, {
    threadName: thread.name,
    messageId: latestMessage.id,
    shouldShow: shouldShow,
    isInbound: latestMessage.inbound,
    willCreateNotification: shouldShow && latestMessage.inbound,
  });

  if (shouldShow && latestMessage.inbound) {
    console.log(
      `🔔 [SMSNotif] Creating Chrome notification for thread: ${thread.name}, message: ${latestMessage.text.substring(0, 50)}...`
    );

    // Note: This creates notifications for SMS discovered during regular sync
    // Mirror SMS notifications are handled separately in mirrorManager.ts to avoid duplicates
    const notificationId = `sms_sync_${latestMessage.id}`;

    // Create Chrome notification
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      title: `SMS from ${thread.name}`,
      message: latestMessage.text,
      iconUrl: 'icons/48.png',
      requireInteraction: false,
    });

    // Update SMS notifications and tracker
    await updateSmsNotificationBadge();
    await unifiedNotificationTracker.markAsProcessed(
      'sms',
      latestMessage.id,
      latestMessage.timestamp
    );

    console.log(
      `✅ [SMSNotif] Sync notification created: ${notificationId} for message: ${latestMessage.id}`
    );
  } else if (!latestMessage.inbound) {
    console.log(`⏭️ [SMSNotif] Skipping outbound message: ${latestMessage.id}`);
  } else {
    console.log(
      `⏭️ [SMSNotif] Skipping notification (shouldShow=false): ${latestMessage.id}`
    );
  }
}
