/**
 * SMS Bridge for Pushbridge extension
 * Handles SMS conversation cache, message deduplication, and SMS sending via Pushbullet's SMS API
 */

import { SmsThread, SmsMsg } from '../types/pushbullet';

import { getDefaultSmsDevice } from './deviceManager';
import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import {
  getTotalUnreadSmsCount,
  syncAllSmsData,
  getThreadById,
  updateThreadWithSentMessage,
} from './simpleSmsSync';
import { smsApiClient } from './smsApiClient';
import { SmsDataMapper } from './smsDataMapper';
import { getLocal, setLocal } from './storage';
import { fromPushbulletTime, now } from './timestampUtils';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

// In-memory conversation cache
const conversationCache = new Map<string, SmsThread>();

// Persistence interval (30 seconds)
const PERSISTENCE_INTERVAL = 30 * 1000;
let persistenceTimer: ReturnType<typeof setInterval> | null = null;

// Device-specific storage keys
const STORAGE_KEYS = {
  SMS_THREADS: (deviceIden: string) => `smsThreads_${deviceIden}`,
  SMS_DEVICE_INFO: (deviceIden: string) => `smsDeviceInfo_${deviceIden}`,
  SMS_LAST_SYNC: (deviceIden: string) => `smsLastSync_${deviceIden}`,
  DEFAULT_SMS_DEVICE: 'defaultSmsDevice', // existing
};

/**
 * Initialize SMS bridge
 */
export async function initializeSmsBridge(): Promise<void> {
  try {
    console.log('[SMSBridge] Starting SMS bridge initialization');

    // Load conversations from storage
    await loadConversationsFromStorage();

    // Start persistence timer
    startPersistenceTimer();

    console.log(
      `[SMSBridge] SMS Bridge initialized with ${conversationCache.size} conversations`
    );
  } catch (error) {
    console.error('[SMSBridge] Failed to initialize SMS bridge:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to initialize SMS bridge',
      code: error instanceof Error ? undefined : 500,
    });
    throw error; // Re-throw to let caller know initialization failed
  }
}

/**
 * Load conversations from device-specific storage
 */
async function loadConversationsFromStorage(): Promise<void> {
  try {
    console.log('[SMSBridge] Loading conversations from storage...');

    // Get default SMS device
    const defaultDevice = await getDefaultSmsDevice();
    if (!defaultDevice) {
      console.log('[SMSBridge] No default SMS device found');
      return;
    }

    // Load device-specific conversations
    const storageKey = STORAGE_KEYS.SMS_THREADS(defaultDevice.iden);
    const stored = await getLocal<Record<string, SmsThread>>(storageKey);

    console.log('[SMSBridge] Storage result:', {
      hasData: !!stored,
      type: typeof stored,
      keys: stored ? Object.keys(stored).length : 0,
      deviceIden: defaultDevice.iden,
    });

    if (stored) {
      for (const [id, thread] of Object.entries(stored)) {
        console.log(`[SMSBridge] Loading thread: ${id}`, {
          name: thread.name,
          messagesCount: thread.messages ? thread.messages.length : 0,
          lastMessageTime: thread.lastMessageTime,
          deviceIden: thread.deviceIden,
        });

        conversationCache.set(id, thread);
      }
      console.log(
        `[SMSBridge] Loaded ${conversationCache.size} conversations from storage for device ${defaultDevice.iden}`
      );
    } else {
      console.log('[SMSBridge] No conversations found in storage');
    }
  } catch (error) {
    console.error(
      '[SMSBridge] Failed to load conversations from storage:',
      error
    );
    // Don't throw here - allow initialization to continue with empty cache
  }
}

/**
 * Persist conversations to device-specific storage
 */
async function persistConversations(): Promise<void> {
  try {
    // Get default SMS device
    const defaultDevice = await getDefaultSmsDevice();
    if (!defaultDevice) {
      console.log('[SMSBridge] No default SMS device found for persistence');
      return;
    }

    const storageKey = STORAGE_KEYS.SMS_THREADS(defaultDevice.iden);
    const conversations: Record<string, SmsThread> = {};

    for (const [id, thread] of conversationCache.entries()) {
      conversations[id] = thread;
    }

    await setLocal(storageKey, conversations);
    console.log(
      `[SMSBridge] Persisted ${conversationCache.size} conversations to storage for device ${defaultDevice.iden}`
    );
  } catch (error) {
    console.error('[SMSBridge] Failed to persist conversations:', error);
  }
}

/**
 * Start persistence timer
 */
function startPersistenceTimer(): void {
  if (persistenceTimer) {
    clearInterval(persistenceTimer);
  }

  persistenceTimer = setInterval(async () => {
    await persistConversations();
  }, PERSISTENCE_INTERVAL);
}

/**
 * Add message to thread with deduplication and ordering
 */
export async function addMessageToThread(
  conversationId: string,
  message: SmsMsg,
  contactName?: string
): Promise<void> {
  try {
    console.log(`📝 [SMSBridge] Adding message to thread cache (OLD SYSTEM):`, {
      conversationId,
      messageId: message.id,
      isInbound: message.inbound,
      timestamp: message.timestamp,
      timestampISO: new Date(message.timestamp).toISOString(),
      contactName: contactName || 'unknown',
    });

    let thread = conversationCache.get(conversationId);

    if (!thread) {
      // Create new thread
      thread = {
        id: conversationId,
        name: contactName || conversationId,
        messages: [],
        lastMessageTime: message.timestamp,
        unreadCount: message.inbound ? 1 : 0,
      };
      conversationCache.set(conversationId, thread);
      console.log(`📝 [SMSBridge] Created new thread: ${conversationId}`);
    } else {
      // Update thread metadata
      thread.lastMessageTime = Math.max(
        thread.lastMessageTime,
        message.timestamp
      );
      if (message.inbound) {
        thread.unreadCount++;
      }
      if (contactName && contactName !== conversationId) {
        thread.name = contactName;
      }
      console.log(
        `📝 [SMSBridge] Updated existing thread: ${conversationId}, unreadCount: ${thread.unreadCount}`
      );
    }

    // Check for duplicate message
    const isDuplicate = thread.messages.some(
      m => m.pb_guid === message.pb_guid
    );
    if (isDuplicate) {
      console.log(
        '⏭️ [SMSBridge] Skipping duplicate message:',
        message.pb_guid
      );
      return;
    }

    // Insert message in chronological order using binary insertion
    const insertIndex = findInsertionIndex(thread.messages, message.timestamp);
    thread.messages.splice(insertIndex, 0, message);

    // REMOVED: Double badge update issue - Don't increment count here as it's handled in simple system
    // The simple system will recalculate counts properly based on lastSeenTimestamp
    // if (message.inbound) {
    //   await unifiedNotificationTracker.incrementCount('sms', 1);
    //   await unifiedNotificationTracker.markAsProcessed('sms', message.pb_guid, message.timestamp);
    // }

    // Just mark as processed for deduplication, don't increment count
    if (message.inbound) {
      await unifiedNotificationTracker.markAsProcessed(
        'sms',
        message.pb_guid,
        message.timestamp
      );
      console.log(`📝 [SMSBridge] Marked SMS as processed: ${message.pb_guid}`);
    }

    console.log(
      `✅ [SMSBridge] Added message to thread: ${conversationId}, total messages: ${thread.messages.length}`
    );
  } catch (error) {
    console.error('Failed to add message to thread:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to add message to thread',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Find insertion index for chronological ordering using binary search
 */
function findInsertionIndex(messages: SmsMsg[], timestamp: number): number {
  let left = 0;
  let right = messages.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (messages[mid].timestamp < timestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Get all conversations sorted by last message time
 */
export async function getConversations(): Promise<SmsThread[]> {
  try {
    console.log('[SMSBridge] Getting conversations from cache');
    console.log(`[SMSBridge] Cache size: ${conversationCache.size}`);

    const threads = Array.from(conversationCache.values());
    console.log(`[SMSBridge] Raw threads count: ${threads.length}`);

    const sortedThreads = threads.sort(
      (a, b) => b.lastMessageTime - a.lastMessageTime
    );
    console.log(`[SMSBridge] Sorted threads count: ${sortedThreads.length}`);

    // Log a sample of the threads for debugging
    if (sortedThreads.length > 0) {
      console.log('[SMSBridge] Sample thread:', {
        id: sortedThreads[0].id,
        name: sortedThreads[0].name,
        messagesCount: sortedThreads[0].messages.length,
        lastMessageTime: sortedThreads[0].lastMessageTime,
        unreadCount: sortedThreads[0].unreadCount,
      });
    }

    return sortedThreads;
  } catch (error) {
    console.error('[SMSBridge] Error in getConversations:', error);
    throw error;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<SmsThread | null> {
  console.log('[SMSBridge] Getting conversation by ID:', conversationId);
  console.log('[SMSBridge] Conversation cache:', conversationCache);
  return conversationCache.get(conversationId) || null;
}

/**
 * Send SMS using Pushbullet's dedicated SMS API (/v2/texts)
 */
export async function sendSms(
  deviceIden: string,
  conversationId: string,
  message: string,
  attachments?: Array<{ content_type: string; name: string; url: string }>
): Promise<void> {
  try {
    // Allow empty message if attachments are present (for MMS)
    if (!message.trim() && (!attachments || attachments.length === 0)) {
      throw new Error('Message cannot be empty');
    }

    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Get the conversation to extract recipient phone numbers
    // Use simple SMS system instead of conversationCache
    let conversation = await getThreadById(deviceIden, conversationId);

    // If conversation not found, fail gracefully - UI will show reload option
    if (!conversation) {
      console.log(`📱 [SMS] Conversation ${conversationId} not found in cache`);
      throw new Error(`CONVERSATION_NOT_FOUND:${conversationId}`);
    }

    // Extract phone numbers from recipients
    const addresses: string[] = [];
    if (conversation.recipients && conversation.recipients.length > 0) {
      // Use recipients array if available
      addresses.push(...conversation.recipients.map(r => r.number));
    } else {
      throw new Error('No recipients found in conversation');
    }

    if (addresses.length === 0) {
      throw new Error('No recipient phone numbers found');
    }

    // Prepare SMS data using Pushbullet's SMS API format
    const smsData: any = {
      data: {
        target_device_iden: deviceIden,
        addresses: addresses, // Array of phone numbers
        message: message,
      },
    };

    // Add file attachments for MMS if provided
    if (attachments && attachments.length > 0) {
      smsData.data.file_type = attachments[0].content_type;
      smsData.file_url = attachments[0].url;
    }

    // Send to Pushbullet SMS API
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/texts',
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smsData),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during SMS send',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SMS send failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const result = await response.json();
    console.log('SMS sent successfully via /v2/texts API:', result);

    // Add sent message to local cache
    const sentMessage: SmsMsg = {
      id:
        result.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pb_guid:
        result.guid ||
        `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      inbound: false,
      text: message,
      conversation_iden: conversationId,
    };

    // Update the simple SMS cache with the sent message
    await updateThreadWithSentMessage(deviceIden, conversationId, sentMessage);

    console.log('SMS sent successfully to:', conversationId);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to send SMS',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<void> {
  try {
    const thread = conversationCache.get(conversationId);
    if (thread && thread.unreadCount > 0) {
      thread.unreadCount = 0;
      console.log('Marked conversation as read:', conversationId);

      // Clear SMS notifications in unified tracker
      await unifiedNotificationTracker.clearNotifications('sms');
    }
  } catch (error) {
    console.error('Failed to mark conversation as read:', error);
  }
}

/**
 * Get unread count for all conversations
 * Now supports both old cache system and new simple SMS system
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    // Try the new simple SMS system first
    const simpleCount = await getTotalUnreadSmsCount();
    if (simpleCount > 0) {
      return simpleCount;
    }
  } catch (error) {
    console.warn(
      '[SMSBridge] Simple SMS count failed, falling back to cache:',
      error
    );
  }

  // Fallback to old cache system
  let total = 0;
  for (const thread of conversationCache.values()) {
    total += thread.unreadCount;
  }
  return total;
}

/**
 * Search conversations by contact name or number
 */
export async function searchConversations(query: string): Promise<SmsThread[]> {
  const threads = Array.from(conversationCache.values());
  const lowerQuery = query.toLowerCase();

  return threads.filter(
    thread =>
      thread.name.toLowerCase().includes(lowerQuery) ||
      thread.id.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Clean up SMS bridge
 */
export async function cleanupSmsBridge(): Promise<void> {
  if (persistenceTimer) {
    clearInterval(persistenceTimer);
    persistenceTimer = null;
  }

  // Final persistence
  await persistConversations();

  // Clear the cache
  conversationCache.clear();
  console.log('SMS Bridge cleaned up');
}

/**
 * Reset SMS bridge for testing
 */
export async function resetForTesting(): Promise<void> {
  if (persistenceTimer) {
    clearInterval(persistenceTimer);
    persistenceTimer = null;
  }

  // Clear the cache without persisting
  conversationCache.clear();
}

/**
 * Get SMS history from Pushbullet pushes API
 * SMS messages appear as regular pushes, not through a dedicated texts endpoint
 */
export async function getSmsHistory(limit: number = 50): Promise<any[]> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      console.log('No token available for SMS history sync');
      return [];
    }

    // SMS history comes from regular pushes, filtered for SMS-related content
    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/pushes?active=true&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        console.log('Token revoked during push history fetch');
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during push history fetch',
          code: response.status,
        });
        return [];
      }
      console.warn(
        `Push history fetch failed: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();

    // Filter pushes for SMS-related content
    // SMS messages appear as pushes with specific characteristics
    const smsPushes = (data.pushes || []).filter((push: any) => {
      // Look for pushes that might be SMS-related
      // This could include pushes with specific types or from SMS apps
      return (
        push.source_device_iden &&
        (push.type === 'note' || push.type === 'link') &&
        // Additional SMS filtering logic can be added here
        push.direction === 'incoming'
      );
    });

    return smsPushes;
  } catch (error) {
    console.warn(
      'Failed to get SMS history from pushes (non-critical):',
      error
    );
    return [];
  }
}

/**
 * Update SMS using Pushbullet's SMS API (/v2/texts/{id})
 */
export async function updateSms(textId: string, updates: any): Promise<void> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/texts/${textId}`,
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during SMS update',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to update SMS: ${response.status} ${response.statusText}`
      );
    }

    console.log('SMS updated successfully:', textId);
  } catch (error) {
    console.error('Failed to update SMS:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to update SMS',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Delete SMS using Pushbullet's SMS API (/v2/texts/{id})
 */
export async function deleteSms(textId: string): Promise<void> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/texts/${textId}`,
      {
        method: 'DELETE',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during SMS deletion',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to delete SMS: ${response.status} ${response.statusText}`
      );
    }

    console.log('SMS deleted successfully:', textId);
  } catch (error) {
    console.error('Failed to delete SMS:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to delete SMS',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Sync SMS history from Pushbullet's pushes API and populate local cache
 * Real SMS history is available through pushes, not a dedicated texts endpoint
 */
export async function syncSmsHistory(): Promise<void> {
  try {
    console.log('Syncing SMS history from Pushbullet /v2/pushes API...');

    const smsPushes = await getSmsHistory(50);

    if (smsPushes.length === 0) {
      console.log('No SMS-related pushes found');
      return;
    }

    console.log(
      `Fetched ${smsPushes.length} SMS-related pushes from /v2/pushes API`
    );

    // Process each SMS-related push
    for (const push of smsPushes) {
      // Extract conversation ID from push data
      // For SMS pushes, this might be embedded in the push content or metadata
      const conversationId =
        push.target_device_iden || push.source_device_iden || push.iden;
      if (!conversationId) continue;

      const message: SmsMsg = {
        id: push.iden,
        pb_guid: push.guid || push.iden,
        timestamp: push.created ? fromPushbulletTime(push.created) : now(),
        inbound: push.direction === 'incoming',
        text: push.body || push.title || '',
        conversation_iden: conversationId,
      };

      // Add to thread cache (will handle deduplication)
      await addMessageToThread(conversationId, message);
    }

    console.log('SMS history sync completed');
  } catch (error) {
    console.warn('SMS history sync failed (non-critical):', error);
    // Don't throw error to prevent blocking other initialization
  }
}

/**
 * Get conversation with pagination support
 */
export async function getConversationPaged(
  conversationId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ messages: SmsMsg[]; cursor?: string; hasMore: boolean }> {
  try {
    const thread = conversationCache.get(conversationId);
    if (!thread) {
      return { messages: [], hasMore: false };
    }

    // If no cursor, return recent messages
    if (!cursor) {
      const recentMessages = thread.messages.slice(-limit);
      const hasMore = thread.messages.length > limit;
      const nextCursor = hasMore
        ? thread.messages[Math.max(0, thread.messages.length - limit - 1)]?.id
        : undefined;

      return {
        messages: recentMessages,
        cursor: nextCursor,
        hasMore,
      };
    }

    // Find the cursor position
    const cursorIndex = thread.messages.findIndex(m => m.id === cursor);
    if (cursorIndex === -1) {
      return { messages: [], hasMore: false };
    }

    // Get older messages before the cursor
    const startIndex = Math.max(0, cursorIndex - limit);
    const olderMessages = thread.messages.slice(startIndex, cursorIndex);
    const hasMore = startIndex > 0;
    const nextCursor = hasMore
      ? thread.messages[startIndex - 1]?.id
      : undefined;

    return {
      messages: olderMessages,
      cursor: nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get conversation paged:', error);
    return { messages: [], hasMore: false };
  }
}

/**
 * Load older messages from Pushbullet API for a conversation
 */
export async function loadOlderMessagesFromApi(
  conversationId: string,
  cursor?: string
): Promise<{ messages: SmsMsg[]; cursor?: string; hasMore: boolean }> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('active', 'true');
    params.append('limit', '50');

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/texts?${params}`,
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load older messages: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const texts = data.texts || [];

    // Filter messages for this conversation
    const conversationMessages = texts.filter(
      (text: any) => (text.thread_id || text.address) === conversationId
    );

    // Convert to SmsMsg format
    const messages: SmsMsg[] = conversationMessages.map((text: any) => ({
      id: text.id,
      pb_guid: text.guid || text.id,
      timestamp: fromPushbulletTime(text.timestamp),
      inbound: text.direction === 'incoming',
      text: text.body || '',
      conversation_iden: conversationId,
    }));

    // Add messages to thread cache
    for (const message of messages) {
      await addMessageToThread(conversationId, message);
    }

    return {
      messages,
      cursor: data.cursor,
      hasMore: !!data.cursor,
    };
  } catch (error) {
    console.error('Failed to load older messages from API:', error);
    return { messages: [], hasMore: false };
  }
}

/**
 * Get SMS threads from API for a specific device
 */
export async function getSmsThreadsFromApi(
  deviceIden: string
): Promise<SmsThread[]> {
  try {
    console.log(
      `[SMSBridge] Getting SMS threads from API for device: ${deviceIden}`
    );

    // Verify device has SMS capability
    const hasSms = await smsApiClient.verifyDeviceSmsCapability(deviceIden);
    if (!hasSms) {
      console.warn(`[SMSBridge] Device ${deviceIden} is not SMS-capable`);
      return [];
    }

    // Get threads from API
    const response = await smsApiClient.getSmsThreadsList(deviceIden);

    // Convert API threads to internal format
    const threads: SmsThread[] = response.threads.map(apiThread =>
      SmsDataMapper.mapApiThreadToSmsThread(apiThread, deviceIden)
    );

    console.log(`[SMSBridge] Retrieved ${threads.length} SMS threads from API`);
    return threads;
  } catch (error) {
    console.error(
      `[SMSBridge] Failed to get SMS threads from API for device ${deviceIden}:`,
      error
    );
    throw error;
  }
}

/**
 * Get SMS thread messages from API for a specific device and thread
 */
export async function getSmsThreadMessagesFromApi(
  deviceIden: string,
  threadId: string
): Promise<SmsMsg[]> {
  try {
    console.log(
      `[SMSBridge] Getting SMS thread messages from API for device: ${deviceIden}, thread: ${threadId}`
    );

    // Get messages from API
    const response = await smsApiClient.getSmsThreadMessages(
      deviceIden,
      threadId
    );

    // Convert API messages to internal format
    const messages: SmsMsg[] = response.thread.map(apiMessage =>
      SmsDataMapper.mapApiMessageToSmsMsg(apiMessage, deviceIden, threadId)
    );

    console.log(
      `[SMSBridge] Retrieved ${messages.length} SMS messages from API`
    );
    return messages;
  } catch (error) {
    console.error(
      `[SMSBridge] Failed to get SMS thread messages from API for device ${deviceIden}, thread ${threadId}:`,
      error
    );
    throw error;
  }
}

/**
 * Sync SMS history from API for a specific device
 * Now uses the simple SMS sync system
 */
export async function syncSmsHistoryFromApi(deviceIden: string): Promise<void> {
  // Use static import instead of dynamic import to avoid window error
  await syncAllSmsData(deviceIden);
}

// syncSmsThreadsLazy removed - replaced by simpleSmsSync.ts

// loadFullSmsThread removed - replaced by simpleSmsSync.ts

/**
 * Add thread to cache with device context
 */
// addThreadToCache removed - replaced by simpleSmsSync.ts

/**
 * Clear SMS cache for a specific device
 */
export async function clearSmsCache(deviceIden?: string): Promise<void> {
  try {
    if (deviceIden) {
      // Clear cache for specific device
      const deviceThreads = Array.from(conversationCache.values()).filter(
        thread => thread.deviceIden === deviceIden
      );

      deviceThreads.forEach(thread => {
        conversationCache.delete(thread.id);
      });

      // Clear device-specific storage
      const storageKey = STORAGE_KEYS.SMS_THREADS(deviceIden);
      await setLocal(storageKey, null);

      console.log(`[SMSBridge] Cleared SMS cache for device ${deviceIden}`);
    } else {
      // Clear entire cache
      conversationCache.clear();
      console.log('[SMSBridge] Cleared entire SMS cache');
    }
  } catch (error) {
    console.error('[SMSBridge] Failed to clear SMS cache:', error);
  }
}

/**
 * Get last sync timestamp for a device
 */
export async function getLastSyncTimestamp(
  deviceIden: string
): Promise<number | null> {
  try {
    const storageKey = STORAGE_KEYS.SMS_LAST_SYNC(deviceIden);
    return (await getLocal<number>(storageKey)) || null;
  } catch (error) {
    console.error(
      `[SMSBridge] Failed to get last sync timestamp for device ${deviceIden}:`,
      error
    );
    return null;
  }
}

/**
 * Set last sync timestamp for a device
 */
export async function setLastSyncTimestamp(
  deviceIden: string,
  timestamp: number
): Promise<void> {
  try {
    const storageKey = STORAGE_KEYS.SMS_LAST_SYNC(deviceIden);
    await setLocal(storageKey, timestamp);
  } catch (error) {
    console.error(
      `[SMSBridge] Failed to set last sync timestamp for device ${deviceIden}:`,
      error
    );
  }
}

/**
 * Get sync status for a device
 */
export async function getSyncStatus(deviceIden: string): Promise<{
  lastSync: number | null;
  isOnline: boolean;
  hasSms: boolean;
  error?: string;
}> {
  try {
    const lastSync = await getLastSyncTimestamp(deviceIden);
    const isOnline = await smsApiClient.isDeviceOnline(deviceIden);
    const hasSms = await smsApiClient.verifyDeviceSmsCapability(deviceIden);

    return {
      lastSync,
      isOnline,
      hasSms,
    };
  } catch (error) {
    console.error(
      `[SMSBridge] Failed to get sync status for device ${deviceIden}:`,
      error
    );
    return {
      lastSync: null,
      isOnline: false,
      hasSms: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Force sync for a device (ignores last sync timestamp)
 */
export async function forceSyncSmsHistory(deviceIden: string): Promise<void> {
  try {
    console.log(
      `[SMSBridge] Force syncing SMS history for device: ${deviceIden}`
    );

    // Clear last sync timestamp to force full sync
    await setLastSyncTimestamp(deviceIden, 0);

    // Perform sync
    await syncSmsHistoryFromApi(deviceIden);
  } catch (error) {
    console.error(
      `[SMSBridge] Force sync failed for device ${deviceIden}:`,
      error
    );
    throw error;
  }
}
