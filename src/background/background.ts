// Background service worker entry point
console.log('Pushbridge background service worker started');

// Import modules
import { TransferRecord } from '../types/pushbullet';

import { initializeKeepAlive } from './alarm';
import {
  initializeChannelManager,
  getOwnedChannels,
  refreshChannelData,
  getSubscriptionPosts,
  clearSubscriptionsCache,
  clearOwnedChannelsCache,
} from './channelManager';
import { getContacts, clearContactCache, getContactByIden } from './contactManager';
import { contextManager } from './contextManager';
import {
  ensureChromeDevice,
  getPushableDevices,
  clearDeviceCache,
  getSmsCapableDevices,
  getDefaultSmsDevice,
  setDefaultSmsDevice,
  getDevices,
} from './deviceManager';
import { reportError, PBError } from './errorManager';
import {
  uploadFile,
  ProgressCallback,
  resumeInterruptedUploads,
  cleanupOldPendingUploads,
} from './fileUploader';
import { httpClient } from './httpClient';
import {
  handleUserDismissal,
  reconstructMirrors,
  cleanupExpiredMirrors,
  getActiveMirrors,
} from './mirrorManager';
import { notificationBadge } from './notificationBadge';
import { formatToThreeDecimals } from './numberUtils';
import {
  createPush,
  getPushHistory,
  getEnhancedPushHistory,
  dismissPush,
  deletePush,
  PushPayload,
  requestUpload,
  createFilePush,
} from './pushManager';
import { initializeQueue, enqueue, getQueueStatus, clearQueue } from './queue';
import { initializeQuotaMonitor } from './quotaMonitor';
import { rateLimitManager } from './rateLimitManager';
// SMS imports moved to simple system
import {
  syncAllSmsData,
  getCachedSmsData,
  getThreadById,
  reloadSmsThread,
} from './simpleSmsSync';
import { sendSms } from './smsBridge';
import {
  initializeWebSocket,
  isWebSocketHealthy,
  getConnectionStatus,
} from './socket';
import { setLocal, getLocal } from './storage';
import { tokenBucket } from './tokenBucket';
import { initializeTokenHealthMonitor } from './tokenHealth';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

// Storage key for tracking popup open time
const POPUP_LAST_OPENED_KEY = 'pb_last_popup_opened';
const ONE_HOUR_MS = 3600000; // 1 hour in milliseconds

/**
 * Clear all cursor storage when user logs out or resets
 */
async function clearAllCursors(): Promise<void> {
  try {
    const cursorKeys = [
      'pb_recent_pushes_state',
      'pb_devices_cursor',
      'pb_devices_has_more',
      'pb_subscriptions_cursor',
      'pb_subscriptions_has_more',
      'pb_channels_cursor',
      'pb_channels_has_more',
      'pb_contacts_cursor',
      'pb_contacts_has_more',
    ];

    // Clear all cursor-related storage
    for (const key of cursorKeys) {
      await setLocal(key, null);
    }

    // Clear SMS thread cursors (they use dynamic keys)
    const allStorage = await chrome.storage.local.get(null);
    const smsCursorKeys = Object.keys(allStorage).filter(key =>
      key.startsWith('pb_sms_thread_cursor_')
    );

    for (const key of smsCursorKeys) {
      await chrome.storage.local.remove(key);
    }

    console.log('All cursors cleared');
  } catch (error) {
    console.error('Failed to clear cursors:', error);
  }
}

/**
 * Initialize SMS sync functionality
 */
async function initializeSmsSync(): Promise<void> {
  try {
    console.log('[Background] Initializing SMS sync...');

    const defaultDevice = await getDefaultSmsDevice();
    if (defaultDevice) {
      console.log(
        `[Background] Default SMS device: ${defaultDevice.nickname} (${defaultDevice.iden})`
      );

      // Initial sync
      // SMS sync now handled by simple system via triggerSmsSync()
      console.log(
        `[Background] SMS-capable device found: ${defaultDevice.nickname}`
      );

      // Periodic SMS sync every 6 hours using simple system
      setInterval(
        async () => {
          await triggerSmsSync('periodic');
        },
        6 * 60 * 60 * 1000
      ); // 6 hours

      console.log('[Background] SMS sync initialized with 6-hour interval');
    } else {
      console.log(
        '[Background] No SMS-capable device found, skipping SMS sync'
      );
    }
  } catch (error) {
    console.error('[Background] Failed to initialize SMS sync:', error);
  }
}

// Initialize background services
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Pushbridge extension installed');

  try {
    // Initialize HTTP client with rate limiting
    await httpClient.initialize();

    // Initialize rate limit manager
    await rateLimitManager.loadState();
    console.log('[Background] Rate limit manager initialized');

    // Initialize token bucket with startup tokens
    tokenBucket.initialize();
    console.log('[Background] Token bucket initialized');

    // Add periodic debug logging for backoff state
    setInterval(() => {
      const debugInfo = rateLimitManager.getDebugInfo();
      const bucketStatus = tokenBucket.getDetailedStatus();

      if (debugInfo.isBackoffActive || debugInfo.backoffState.isActive) {
        console.log('[Background] Backoff debug info:', debugInfo);
      }

      // Log token bucket status when it's low
      if (bucketStatus.bucket <= 10) {
        console.log('[Background] Token bucket status:', bucketStatus);
      }
    }, 10000); // Every 10 seconds

    // Add periodic state validation for unified notification tracker
    setInterval(
      async () => {
        try {
          const isValid = await unifiedNotificationTracker.validateState();
          if (!isValid) {
            console.warn(
              '[Background] Unified notification tracker state validation failed'
            );
          }
        } catch (error) {
          console.error(
            '[Background] Failed to validate unified notification tracker state:',
            error
          );
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes

    // Initialize keep-alive alarm
    await initializeKeepAlive();

    // Initialize monitoring systems
    await initializeQuotaMonitor();
    await initializeTokenHealthMonitor();

    // Initialize queue system
    initializeQueue();

    // Initialize SMS functionality  
    // SMS bridge initialization removed - using simple system
    // Contact manager initialization is handled automatically via API calls

    // Initialize channel functionality
    await initializeChannelManager();

    // Initialize SMS sync
    await initializeSmsSync();

    // SMS history sync now handled by simple system
    console.log('[Background] SMS sync using simple system');

    // Initialize context manager
    await contextManager.loadContext();
    console.log('[Background] Context manager initialized');

    // Initialize unified notification tracker
    await unifiedNotificationTracker.initialize();

    // Initialize WebSocket connection
    await initializeWebSocket();

    // Reconstruct mirror notifications after restart
    await reconstructMirrors();

    // Resume interrupted uploads
    const resumedCount = await resumeInterruptedUploads();
    if (resumedCount > 0) {
      console.log(`Resumed ${resumedCount} interrupted uploads`);
    }

    // Clean up old pending uploads
    await cleanupOldPendingUploads();

    // Create context menu items
    await createContextMenus();
  } catch (error) {
    console.error('Failed to initialize background services:', error);
  }
});

// Handle service worker startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Pushbridge service worker started');

  try {
    // Reconstruct mirror notifications after startup
    await reconstructMirrors();

    // Clean up expired mirrors
    await cleanupExpiredMirrors();

    // SMS history sync now handled by simple system via periodic timer
  } catch (error) {
    console.error('Failed to handle service worker startup:', error);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async notificationId => {
  try {
    const notificationData = await getLocal<{
      pushIden: string;
      url?: string;
      type: string;
    }>(`notification_${notificationId}`);

    if (!notificationData) {
      console.log('No notification data found for:', notificationId);
      return;
    }

    if (notificationData.url) {
      // Open link in new tab
      await chrome.tabs.create({ url: notificationData.url });
    } else {
      // Focus popup for note pushes
      await chrome.action.openPopup();
    }

    // Clear notification data
    await setLocal(`notification_${notificationId}`, null);
  } catch (error) {
    console.error('Failed to handle notification click:', error);
  }
});

// Handle notification button clicks (dismiss)
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    try {
      const notificationData = await getLocal<{
        pushIden: string;
        url?: string;
        type: string;
      }>(`notification_${notificationId}`);

      if (!notificationData) {
        return;
      }

      if (buttonIndex === 0) {
        // Dismiss button
        await dismissPush(notificationData.pushIden);
        await chrome.notifications.clear(notificationId);
        await setLocal(`notification_${notificationId}`, null);
      }
    } catch (error) {
      console.error('Failed to handle notification button click:', error);
    }
  }
);

// Handle mirror notification clicks and dismissals
chrome.notifications.onClicked.addListener(async notificationId => {
  // Check if this is a mirror notification
  const isMirrorNotification =
    notificationId.includes('-') && notificationId.length === 36;

  if (isMirrorNotification) {
    // Handle mirror notification click (dismiss)
    await handleUserDismissal(notificationId);
  } else {
    // Handle regular push notification click (existing logic)
    try {
      const notificationData = await getLocal<{
        pushIden: string;
        url?: string;
        type: string;
      }>(`notification_${notificationId}`);

      if (!notificationData) {
        console.log('No notification data found for:', notificationId);
        return;
      }

      if (notificationData.url) {
        // Open link in new tab
        await chrome.tabs.create({ url: notificationData.url });
      } else {
        // Focus popup for note pushes
        await chrome.action.openPopup();
      }

      // Clear notification data
      await setLocal(`notification_${notificationId}`, null);
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  }
});

// Handle mirror notification dismissals (when user closes notification)
chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
  if (byUser) {
    // Check if this is a mirror notification
    const isMirrorNotification =
      notificationId.includes('-') && notificationId.length === 36;

    if (isMirrorNotification) {
      // Handle mirror notification dismissal
      await handleUserDismissal(notificationId);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('📨 [Background] Received message:', message);

  // Handle different message types
  switch (message.cmd) {
    case 'verifyToken':
      handleTokenVerification(message.token, sendResponse);
      break;
    case 'getDevices':
      handleGetDevices(message.forceRefresh, sendResponse);
      break;
    case 'clearDeviceCache':
      handleClearDeviceCache(sendResponse);
      break;
    case 'getContacts':
      handleGetContacts(message.forceRefresh, sendResponse);
      break;
    case 'clearContactCache':
      handleClearContactCache(sendResponse);
      break;
    case 'createPush':
      handleCreatePush(message.payload, sendResponse);
      break;
    case 'getPushHistory':
      handleGetPushHistory(
        message.limit,
        message.modifiedAfter,
        message.cursor,
        sendResponse
      );
      break;
    case 'getEnhancedPushHistory':
      handleGetEnhancedPushHistory(
        message.trigger,
        message.limit,
        message.modifiedAfter,
        message.cursor,
        sendResponse
      );
      break;
    case 'dismissPush':
      handleDismissPush(message.pushIden, sendResponse);
      break;
    case 'deletePush':
      handleDeletePush(message.pushIden, sendResponse);
      break;
    case 'syncHistory':
      handleSyncHistory(sendResponse);
      break;
    case 'getQueueStatus':
      handleGetQueueStatus(sendResponse);
      break;
    case 'clearQueue':
      handleClearQueue(sendResponse);
      break;
    case 'getActiveMirrors':
      handleGetActiveMirrors(sendResponse);
      break;
    case 'POPUP_OPEN':
      handlePopupOpen(sendResponse);
      break;
    case 'CLEAR_SMS_NOTIFICATIONS':
      handleClearSmsNotifications(sendResponse);
      break;
    case 'UPLOAD_FILE':
      handleUploadFile(message.payload, sendResponse);
      break;
    case 'UPLOAD_FILE_FOR_SMS':
      handleUploadFileForSms(message.payload, sendResponse);
      break;
    case 'GET_TRANSFERS':
      handleGetTransfers(sendResponse);
      break;
    case 'DOWNLOAD_FILE':
      handleDownloadFile(message.payload, sendResponse);
      break;
    case 'GET_SMS_CONVERSATIONS':
    case 'GET_SMS_CONVERSATIONS_FROM_API':
      handleGetSmsConversationsSimple(sendResponse);
      break;
    case 'GET_SMS_THREAD':
    case 'GET_SMS_THREAD_FROM_API':
    case 'LOAD_FULL_SMS_THREAD':
      handleGetSmsThreadSimple(
        message.conversationId,
        message.deviceIden,
        sendResponse
      );
      break;
    case 'GET_SMS_THREAD_PAGED':
      // Paging removed in simple system - returns full thread
      handleGetSmsThreadSimple(
        message.conversationId,
        message.deviceIden,
        sendResponse
      );
      break;
    case 'SEND_SMS':
      handleSendSms(
        message.payload.conversationId,
        message.payload.message,
        sendResponse,
        message.payload.deviceIden,
        message.payload.attachments
      );
      break;
    case 'MARK_CONVERSATION_READ':
      handleMarkConversationRead(message.conversationId, sendResponse);
      break;
    case 'GET_DEFAULT_SMS_DEVICE':
      handleGetDefaultSmsDevice(sendResponse);
      break;
    case 'GET_SMS_CAPABLE_DEVICES':
      handleGetSmsCapableDevices(sendResponse);
      break;
    case 'SET_DEFAULT_SMS_DEVICE':
      handleSetDefaultSmsDevice(message.deviceIden, sendResponse);
      break;
    case 'SYNC_SMS_HISTORY':
      handleSyncSmsHistory(message.deviceIden, sendResponse);
      break;
    case 'RELOAD_SMS_THREAD':
      handleReloadSmsThread(message.deviceIden, message.threadId, sendResponse);
      break;
    case 'GET_SMS_DEVICE_INFO':
      handleGetSmsDeviceInfo(sendResponse);
      break;
    case 'GET_CHANNEL_SUBSCRIPTIONS':
      handleGetChannelSubscriptions(message.forceRefresh, sendResponse);
      break;
    case 'SUBSCRIBE_TO_CHANNEL':
      handleSubscribeToChannel(message.channelTag, sendResponse);
      break;
    case 'UNSUBSCRIBE_FROM_CHANNEL':
      handleUnsubscribeFromChannel(message.subscriptionIden, sendResponse);
      break;
    case 'GET_CHANNEL_INFO':
      handleGetChannelInfo(message.channelTag, sendResponse);
      break;
    case 'GET_OWNED_CHANNELS':
      handleGetOwnedChannels(sendResponse);
      break;
    case 'REFRESH_CHANNEL_DATA':
      handleRefreshChannelData(sendResponse);
      break;
    case 'GET_SUBSCRIPTION_POSTS':
      handleGetSubscriptionPosts(sendResponse);
      break;
    case 'clearAllData':
      handleClearAllData(sendResponse);
      break;
    case 'testWebSocket':
      handleTestWebSocket(sendResponse);
      break;
    case 'getDebugLog':
      handleGetDebugLog(sendResponse);
      break;
    case 'getUnifiedTrackerState':
      handleGetUnifiedTrackerState(sendResponse);
      break;
    case 'DEBUG_SMS':
    case 'DEBUG_STORAGE':
      // Debug functions removed in simplified system
      sendResponse({
        success: false,
        error: 'Debug functions removed in simple system',
      });
      break;
    default:
      sendResponse({ status: 'unknown_command' });
  }

  return true; // Keep message channel open for async response
});

/**
 * Handle token verification from popup
 */
async function handleTokenVerification(
  token: string,
  sendResponse: (response: any) => void
) {
  try {
    // Verify token against Pushbullet API
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/users/me',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const userData = await response.json();
      console.log('Token verified successfully for user:', userData.name);

      // Store the token and user ID
      await setLocal('pb_token', token);
      await setLocal('pb_user_iden', userData.iden);

      // Register Chrome device
      try {
        const deviceIden = await ensureChromeDevice();
        console.log('Chrome device registered:', deviceIden);
        sendResponse({ ok: true, user: userData, deviceIden });
      } catch (deviceError) {
        console.error('Device registration failed:', deviceError);
        // Still return success for token, but note device issue
        sendResponse({
          ok: true,
          user: userData,
          deviceError: 'Device registration failed',
        });
      }
    } else if (response.status === 401) {
      console.error('Token verification failed: Unauthorized');
      await reportError(PBError.TokenRevoked, {
        message: 'Token is invalid or revoked',
        code: response.status,
      });
      sendResponse({
        ok: false,
        error: 'Invalid token. Please check your Pushbullet access token.',
      });
    } else {
      console.error(
        'Token verification failed:',
        response.status,
        response.statusText
      );
      await reportError(PBError.Unknown, {
        message: 'Token verification failed',
        code: response.status,
      });
      sendResponse({
        ok: false,
        error: 'Token verification failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    await reportError(PBError.Unknown, {
      message: 'Token verification failed',
    });
    sendResponse({
      ok: false,
      error: 'Failed to verify token. Please check your internet connection.',
    });
  }
}

/**
 * Handle device list requests from popup
 */
async function handleGetDevices(
  forceRefresh: boolean,
  sendResponse: (response: any) => void
) {
  try {
    const devices = await getPushableDevices(forceRefresh);
    sendResponse({ ok: true, devices });
  } catch (error) {
    console.error('Failed to get devices:', error);
    sendResponse({ ok: false, error: 'Failed to fetch devices' });
  }
}

/**
 * Handle device cache clearing requests
 */
async function handleClearDeviceCache(sendResponse: (response: any) => void) {
  try {
    await clearDeviceCache();
    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to clear device cache:', error);
    sendResponse({ ok: false, error: 'Failed to clear cache' });
  }
}

/**
 * Handle contact list requests from popup
 */
async function handleGetContacts(
  forceRefresh: boolean,
  sendResponse: (response: any) => void
) {
  try {
    const contacts = await getContacts(forceRefresh);
    sendResponse({ ok: true, contacts });
  } catch (error) {
    console.error('Failed to get contacts:', error);
    sendResponse({ ok: false, error: 'Failed to fetch contacts' });
  }
}

/**
 * Handle contact cache clearing requests
 */
async function handleClearContactCache(sendResponse: (response: any) => void) {
  try {
    await clearContactCache();
    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to clear contact cache:', error);
    sendResponse({ ok: false, error: 'Failed to clear contact cache' });
  }
}

/**
 * Handle push creation requests from popup
 */
async function handleCreatePush(
  payload: PushPayload,
  sendResponse: (response: any) => void
) {
  try {
    // Check if we're online
    if (!isWebSocketHealthy()) {
      // Queue the operation for later
      await enqueue({
        type: 'pushSend',
        payload,
      });
      sendResponse({
        ok: true,
        queued: true,
        message: 'Push queued for later delivery',
      });
      return;
    }

    const push = await createPush(payload);

    // Broadcast to any listening popups that a new push was created
    try {
      chrome.runtime.sendMessage({
        cmd: 'pushCreated',
        source: 'background',
        push: push,
      });
    } catch {
      // Ignore if no popup is listening
    }

    sendResponse({ ok: true, push });
  } catch (error) {
    console.error('Failed to create push:', error);

    // If it's a network error, queue the operation
    if (error instanceof Error && error.message.includes('network')) {
      await enqueue({
        type: 'pushSend',
        payload,
      });
      sendResponse({
        ok: true,
        queued: true,
        message: 'Push queued due to network error',
      });
      return;
    }

    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to create push',
    });
  }
}

/**
 * Handle push history requests from popup
 */
async function handleGetPushHistory(
  limit: number,
  modifiedAfter: number,
  cursor: string,
  sendResponse: (response: any) => void
) {
  try {
    const history = await getPushHistory(limit, modifiedAfter, cursor);
    console.log('📋 [handleGetPushHistory] Response:', {
      ok: true,
      history: history.pushes.length,
      modifiedAfter,
      cursor,
    });
    // Update last modified timestamp for incremental sync
    if (history.pushes.length > 0) {
      const highestModified = Math.max(...history.pushes.map(p => p.modified));
      await setLocal('pb_last_modified', highestModified);
    }

    sendResponse({ ok: true, history });
  } catch (error) {
    console.error('Failed to get push history:', error);
    sendResponse({ ok: false, error: 'Failed to fetch push history' });
  }
}

/**
 * Handle enhanced push history requests from popup
 */
async function handleGetEnhancedPushHistory(
  trigger: {
    type: 'popup_open' | 'unknown_source' | 'periodic' | 'manual';
    timestamp: number;
    reason?: string;
  },
  limit: number,
  modifiedAfter: number,
  cursor: string,
  sendResponse: (response: any) => void
) {
  try {
    console.log(
      '🔄 [Background] Getting enhanced push history with trigger:',
      trigger.type
    );
    const history = await getEnhancedPushHistory(
      trigger,
      limit,
      modifiedAfter,
      cursor
    );

    console.log('📋 [handleGetEnhancedPushHistory] Response:', {
      ok: true,
      history: history.pushes.length,
      modifiedAfter,
      cursor,
      trigger: trigger.type,
    });

    // Update last modified timestamp for incremental sync
    if (history.pushes.length > 0) {
      const highestModified = Math.max(...history.pushes.map(p => p.modified));
      await setLocal('pb_last_modified', highestModified);

      // Debug: Log push details to understand structure
      console.log(
        '🔍 [Background] Enhanced push details:',
        history.pushes.map(p => ({
          iden: p.iden,
          type: p.type,
          title: p.title,
          receiver_iden: p.receiver_iden,
          target_device_iden: p.target_device_iden,
          dismissed: p.dismissed,
          created: p.created,
          modified: p.modified,
          channel_iden: p.channel_iden,
        }))
      );

      // Only process new pushes for notifications if this is from a WebSocket tickle
      // Don't process pushes when popup opens to avoid double-counting
      if (trigger.type === 'unknown_source') {
        console.log(
          '🔔 [Background] Processing pushes for notifications (WebSocket tickle)'
        );

        let newPushCount = 0;

        for (const push of history.pushes) {
          // Check if this is a new push that should trigger notification
          const isNewPush =
            !push.dismissed &&
            (push.receiver_iden ||
              push.target_device_iden ||
              push.type === 'mirror' ||
              push.type === 'file' ||
              push.channel_iden); // Channel pushes

          if (isNewPush) {
            // Use unified tracker to determine if we should show this notification
            const shouldShow =
              await unifiedNotificationTracker.shouldShowNotification({
                id: push.iden,
                type: 'push',
                created: push.created,
                metadata: { pushIden: push.iden },
              });

            if (shouldShow) {
              console.log(
                `🔔 [Background] Processing new push: ${push.iden} (type: ${push.type})`
              );

              // Show Chrome notification (only if it passes device check)
              const notificationShown = await showPushNotification(push);

              // Only update badge if notification was actually shown or it's a valid push for this device
              if (
                notificationShown ||
                push.type === 'file' ||
                push.channel_iden
              ) {
                console.log(
                  '🔔 [Background] Updating badge for new push notification'
                );
                await notificationBadge.addPushNotifications(1);
                await unifiedNotificationTracker.markAsProcessed(
                  'push',
                  push.iden,
                  new Date(formatToThreeDecimals(push.created) * 1000).getTime()
                );
                newPushCount++;
              }
            } else {
              console.log(
                `⏭️ [Background] Skipping already processed push: ${push.iden}`
              );
            }
          } else {
            console.log(
              `⏭️ [Background] Skipping push: ${push.iden} (dismissed: ${push.dismissed})`
            );
          }
        }

        console.log(
          `📊 [Background] New push processing summary: ${newPushCount} new notifications`
        );
      } else {
        console.log(
          `⏭️ [Background] Skipping notification processing for trigger: ${trigger.type} (popup open)`
        );
      }
    } else {
      console.log('🔄 [Background] No new pushes found in enhanced history');
    }

    sendResponse({ ok: true, history });
  } catch (error) {
    console.error('Failed to get enhanced push history:', error);
    sendResponse({ ok: false, error: 'Failed to fetch enhanced push history' });
  }
}

/**
 * Handle push dismissal requests from popup
 */
async function handleDismissPush(
  pushIden: string,
  sendResponse: (response: any) => void
) {
  try {
    await dismissPush(pushIden);

    // Update notification badge when push is dismissed
    console.log('🔔 [Background] Push dismissed, updating badge');
    await notificationBadge.addPushNotifications(-1);

    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to dismiss push:', error);
    sendResponse({ ok: false, error: 'Failed to dismiss push' });
  }
}

/**
 * Handle push deletion requests from popup
 */
async function handleDeletePush(
  pushIden: string,
  sendResponse: (response: any) => void
) {
  try {
    await deletePush(pushIden);

    // Update notification badge when push is deleted
    console.log('🔔 [Background] Push deleted, updating badge');
    await notificationBadge.addPushNotifications(-1);

    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to delete push:', error);
    sendResponse({ ok: false, error: 'Failed to delete push' });
  }
}

/**
 * Handle push history sync requests (from WebSocket tickle)
 */
async function handleSyncHistory(sendResponse: (response: any) => void) {
  try {
    console.log('🔄 [Background] Syncing push history');
    const lastModified = await getLocal<number>('pb_last_modified');

    // Get stored cursor for incremental sync
    const stored = await chrome.storage.local.get('pb_recent_pushes_state');
    const storedCursor = stored.pb_recent_pushes_state?.cursor;

    // Use cursor for incremental sync (load more pattern)
    const history = await getPushHistory(100, lastModified, storedCursor);

    if (history.pushes.length > 0) {
      console.log(
        `🔄 [Background] Found ${history.pushes.length} pushes from API`
      );

      // Debug: Log push details to understand structure
      console.log(
        '🔍 [Background] Push details:',
        history.pushes.map(p => ({
          iden: p.iden,
          type: p.type,
          title: p.title,
          receiver_iden: p.receiver_iden,
          target_device_iden: p.target_device_iden,
          dismissed: p.dismissed,
          created: p.created,
          modified: p.modified,
        }))
      );

      // Update last modified timestamp
      const highestModified = Math.max(...history.pushes.map(p => p.modified));
      await setLocal('pb_last_modified', highestModified);

      // Update cursor in storage for next sync
      if (history.cursor) {
        const currentState = stored.pb_recent_pushes_state || {};
        await chrome.storage.local.set({
          pb_recent_pushes_state: {
            ...currentState,
            cursor: history.cursor,
            hasMore: !!history.cursor,
          },
        });
      }

      // Show notifications for new pushes using unified tracker
      let processedCount = 0;
      let skippedCount = 0;

      for (const push of history.pushes) {
        // Improved filtering logic
        const shouldProcess =
          !push.dismissed &&
          (push.receiver_iden ||
            push.target_device_iden ||
            push.type === 'mirror' ||
            push.type === 'file' ||
            push.channel_iden); // Channel pushes

        if (shouldProcess) {
          // Use unified tracker to determine if we should show this notification
          const shouldShow =
            await unifiedNotificationTracker.shouldShowNotification({
              id: push.iden,
              type: 'push',
              created: push.created,
              metadata: { pushIden: push.iden },
            });

          if (shouldShow) {
            console.log(
              `🔔 [Background] Processing push: ${push.iden} (type: ${push.type})`
            );
            const notificationShown = await showPushNotification(push);

            // Update badge if notification was shown or it's a valid push for this device
            if (
              notificationShown ||
              push.type === 'file' ||
              push.channel_iden
            ) {
              console.log(
                '🔔 [Background] Updating badge for new push notification'
              );
              await notificationBadge.addPushNotifications(1);
              await unifiedNotificationTracker.markAsProcessed(
                'push',
                push.iden,
                new Date(formatToThreeDecimals(push.created) * 1000).getTime()
              );
            }

            processedCount++;
          } else {
            console.log(
              `⏭️ [Background] Skipping already processed push: ${push.iden}`
            );
            skippedCount++;
          }
        } else {
          console.log(
            `⏭️ [Background] Skipping push: ${push.iden} (dismissed: ${push.dismissed}, receiver_iden: ${push.receiver_iden}, target_device_iden: ${push.target_device_iden})`
          );
          skippedCount++;
        }
      }

      console.log(
        `📊 [Background] Push processing summary: ${processedCount} processed, ${skippedCount} skipped`
      );
    } else {
      console.log('🔄 [Background] No new pushes found');
    }

    // Broadcast to any listening popups
    try {
      chrome.runtime.sendMessage({
        cmd: 'syncHistory',
        source: 'background',
        newPushes: history.pushes.length,
      });
    } catch {
      // Ignore if no popup is listening
    }

    sendResponse({ ok: true, newPushes: history.pushes.length });
  } catch (error) {
    console.error('Failed to sync history:', error);
    sendResponse({ ok: false, error: 'Failed to sync history' });
  }
}

/**
 * Show Chrome notification for a new push
 */
async function showPushNotification(push: any): Promise<boolean> {
  try {
    console.log('🔔 [Background] Showing push notification:', {
      type: push.type,
      title: push.title,
      channel_tag: push.channel_tag,
    });

    const chromeDeviceIden = await getLocal<string>('pb_device_iden');

    // Only show notifications for pushes received by our Chrome device
    if (push.receiver_iden !== chromeDeviceIden) {
      console.log(
        '🔔 [Background] Push not for this device, skipping notification'
      );
      return false;
    }

    let title: string;
    let message: string;
    let iconUrl: string;

    if (push.type === 'file') {
      // Handle file push
      title = 'File received';
      message = push.file_name || 'New file';
      iconUrl = '/icons/48.png';

      // Add transfer record for received file
      const transferRecord: TransferRecord = {
        id: push.iden,
        type: 'received',
        fileName: push.file_name,
        fileSize: 0, // We don't have file size in the push
        fileType: push.file_type || 'application/octet-stream',
        timestamp: Date.now(),
        status: 'completed',
        sourceDevice: push.source_device_iden,
      };

      await addTransferRecord(transferRecord);

      // Auto-download the file
      await downloadReceivedFile(push);
    } else if (push.channel_tag) {
      // Handle channel push (M6-04)
      title = `${push.channel_tag}: ${push.title ?? 'New post'}`;
      message = push.body ?? '';
      iconUrl = '/icons/48.png'; // Use existing icon as fallback

      // Store in recent list with channel badge
      await addChannelPushToRecent(push);
    } else {
      // Handle regular pushes
      title = push.title || (push.type === 'link' ? push.url : 'New push');
      message = push.body || '';
      iconUrl = '/icons/48.png';
    }

    const notificationId = `push_${push.iden}`;

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message,
      requireInteraction: true,
    });

    // Store notification mapping for click handling
    await setLocal(`notification_${notificationId}`, {
      pushIden: push.iden,
      url: push.url,
      type: push.type,
      channelTag: push.channel_tag,
    });

    // Update notification badge for new push
    console.log('🔔 [Background] Updating badge for new push notification');
    await notificationBadge.addPushNotifications(1);

    console.log('🔔 [Background] Push notification created:', notificationId);
    return true; // Indicate that the notification was shown
  } catch (error) {
    console.error('Failed to show push notification:', error);
    return false; // Indicate that the notification was not shown
  }
}

/**
 * Download received file
 */
async function downloadReceivedFile(filePush: any): Promise<void> {
  try {
    // Use chrome.downloads.download for service worker context
    await chrome.downloads.download({
      url: filePush.file_url,
      filename: filePush.file_name,
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'File Downloaded',
      message: `File "${filePush.file_name}" has been downloaded`,
    });
  } catch (error) {
    console.error('Failed to download received file:', error);

    // Fallback: just show notification with download link
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'File Available',
      message: `Click to view file "${filePush.file_name}"`,
    });
  }
}

/**
 * Add channel push to recent list with channel badge
 */
async function addChannelPushToRecent(push: any): Promise<void> {
  try {
    const recentPushes = (await getLocal<any[]>('pb_recent_pushes')) || [];

    // Add channel badge to push data
    const pushWithBadge = {
      ...push,
      isChannelPush: true,
      channelTag: push.channel_tag,
    };

    // Add to beginning of list
    recentPushes.unshift(pushWithBadge);

    // Keep only last 100 pushes
    if (recentPushes.length > 500) {
      recentPushes.splice(500);
    }

    await setLocal('pb_recent_pushes', recentPushes);
  } catch (error) {
    console.error('Failed to add channel push to recent list:', error);
  }
}

/**
 * Handle queue status requests
 */
async function handleGetQueueStatus(sendResponse: (response: any) => void) {
  try {
    const status = await getQueueStatus();
    const connectionStatus = getConnectionStatus();

    sendResponse({
      ok: true,
      queue: status,
      connection: connectionStatus,
    });
  } catch (error) {
    console.error('Failed to get queue status:', error);
    sendResponse({ ok: false, error: 'Failed to get queue status' });
  }
}

/**
 * Handle queue clearing requests
 */
async function handleClearQueue(sendResponse: (response: any) => void) {
  try {
    await clearQueue();
    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to clear queue:', error);
    sendResponse({ ok: false, error: 'Failed to clear queue' });
  }
}

/**
 * Handle active mirrors request from popup
 */
async function handleGetActiveMirrors(sendResponse: (response: any) => void) {
  try {
    const mirrors = await getActiveMirrors();
    sendResponse({ success: true, mirrors });
  } catch (error) {
    console.error('Failed to get active mirrors:', error);
    sendResponse({ success: false, error: 'Failed to fetch notifications' });
  }
}

/**
 * Add transfer record to storage
 */
async function addTransferRecord(transfer: TransferRecord): Promise<void> {
  try {
    const transfers = (await getLocal<TransferRecord[]>('pb_transfers')) || [];

    // Add new transfer at the beginning
    transfers.unshift(transfer);

    // Keep only last 50 transfers
    if (transfers.length > 50) {
      transfers.splice(50);
    }

    await setLocal('pb_transfers', transfers);
  } catch (error) {
    console.error('Failed to add transfer record:', error);
  }
}

/**
 * Handle file upload request from popup
 */
async function handleUploadFile(
  payload: {
    fileData: {
      name: string;
      type: string;
      size: number;
      lastModified: number;
      buffer: number[];
    };
    targetDeviceIden?: string;
    email?: string;
    title?: string;
    body?: string;
    channel_tag?: string;
  },
  sendResponse: (response: any) => void
) {
  try {
    const { fileData, targetDeviceIden, email, title, body, channel_tag } = payload;

    // Reconstruct the File object from the ArrayBuffer data
    const file = new File([new Uint8Array(fileData.buffer)], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified,
    });

    // Request upload from Pushbullet
    const uploadInfo = await requestUpload(file);

    // Upload file to S3 with progress tracking
    const progressCallback: ProgressCallback = progress => {
      // Send progress update to popup
      chrome.runtime
        .sendMessage({
          type: 'UPLOAD_PROGRESS',
          payload: { progress: progress.percentage },
        })
        .catch(() => {
          // Ignore errors if popup is closed
        });
    };

    const uploadResult = await uploadFile(uploadInfo, file, progressCallback);

    if (uploadResult.success) {
      // Create file push after successful upload
      const filePush = await createFilePush(
        uploadInfo.fileUrl,
        file.name,
        file.type || 'application/octet-stream',
        targetDeviceIden,
        title,
        body,
        channel_tag,
        email
      );

      // Add transfer record
      const transferRecord: TransferRecord = {
        id: filePush.iden,
        type: 'sent',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        timestamp: Date.now(),
        status: 'completed',
        targetDevice: targetDeviceIden,
      };

      await addTransferRecord(transferRecord);

      // Broadcast to any listening popups that a new file push was created
      try {
        chrome.runtime.sendMessage({
          cmd: 'pushCreated',
          source: 'background',
          push: filePush,
        });
      } catch {
        // Ignore if no popup is listening
      }

      // Show success notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/48.png',
        title: 'File Sent',
        message: `File "${file.name}" sent successfully`,
      });

      sendResponse({ success: true, filePush });
    } else {
      sendResponse({ success: false, error: uploadResult.error });
    }
  } catch (error) {
    console.error('Failed to upload file:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}

/**
 * Handle file upload for SMS/MMS (without creating a push notification)
 */
async function handleUploadFileForSms(
  payload: {
    fileData: {
      name: string;
      type: string;
      size: number;
      lastModified: number;
      buffer: number[];
    };
    targetDeviceIden?: string;
  },
  sendResponse: (response: any) => void
) {
  try {
    const { fileData } = payload;

    // Reconstruct the File object from the ArrayBuffer data
    const file = new File([new Uint8Array(fileData.buffer)], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified,
    });

    // Request upload from Pushbullet
    const uploadInfo = await requestUpload(file);

    // Upload file to S3 with progress tracking
    const progressCallback: ProgressCallback = progress => {
      // Send progress update to popup
      chrome.runtime
        .sendMessage({
          type: 'UPLOAD_PROGRESS',
          payload: { progress: progress.percentage },
        })
        .catch(() => {
          // Ignore errors if popup is closed
        });
    };

    const uploadResult = await uploadFile(uploadInfo, file, progressCallback);

    if (uploadResult.success) {
      // Return just the file URL without creating a push notification
      sendResponse({ success: true, fileUrl: uploadInfo.fileUrl });
    } else {
      sendResponse({ success: false, error: uploadResult.error });
    }
  } catch (error) {
    console.error('Failed to upload file for SMS:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}

/**
 * Handle get transfers request from popup
 */
async function handleGetTransfers(sendResponse: (response: any) => void) {
  try {
    const transfers = (await getLocal<TransferRecord[]>('pb_transfers')) || [];
    sendResponse({ success: true, transfers });
  } catch (error) {
    console.error('Failed to get transfers:', error);
    sendResponse({ success: false, error: 'Failed to load transfers' });
  }
}

/**
 * Handle download file request from popup
 */
async function handleDownloadFile(
  payload: { transferId: string },
  sendResponse: (response: any) => void
) {
  try {
    const transfers = (await getLocal<TransferRecord[]>('pb_transfers')) || [];
    const transfer = transfers.find(t => t.id === payload.transferId);

    if (!transfer) {
      sendResponse({ success: false, error: 'Transfer not found' });
      return;
    }

    // For now, we'll just show a notification that download is not implemented
    // In a real implementation, we'd need to fetch the file from the file_url
    // and trigger a download using chrome.downloads.download
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'Download Not Available',
      message: 'File download will be implemented in a future update',
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to download file:', error);
    sendResponse({ success: false, error: 'Download failed' });
  }
}

/**
 * Create context menu items with device and contact submenus
 */
async function createContextMenus() {
  // Remove existing context menus
  chrome.contextMenus.removeAll(async () => {
    try {
      // Get devices and contacts for submenus
      const devices = await getDevices();
      const contacts = await getContacts();

      // Create main menu items with submenus
      const menuItems = [
        { id: 'push-page', title: 'Push this page', contexts: ['page'] },
        { id: 'push-link', title: 'Push this link', contexts: ['link'] },
        { id: 'push-image', title: 'Push this image', contexts: ['image'] },
        { id: 'push-selection', title: 'Push selected text', contexts: ['selection'] }
      ];

      for (const menuItem of menuItems) {
        // Create parent menu item
        chrome.contextMenus.create({
          id: menuItem.id,
          title: menuItem.title,
          contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
        });

        // Create Devices submenu
        if (devices.length > 0) {
          chrome.contextMenus.create({
            id: `${menuItem.id}-devices`,
            title: 'Devices',
            parentId: menuItem.id,
            contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
          });

          // Add individual devices
          for (const device of devices) {
            chrome.contextMenus.create({
              id: `${menuItem.id}-device-${device.iden}`,
              title: `📱 ${device.nickname}`,
              parentId: `${menuItem.id}-devices`,
              contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
            });
          }
        }

        // Create Contacts submenu
        if (contacts.length > 0) {
          chrome.contextMenus.create({
            id: `${menuItem.id}-contacts`,
            title: 'Contacts',
            parentId: menuItem.id,
            contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
          });

          // Add individual contacts
          for (const contact of contacts) {
            chrome.contextMenus.create({
              id: `${menuItem.id}-contact-${contact.iden}`,
              title: `👤 ${contact.name}`,
              parentId: `${menuItem.id}-contacts`,
              contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
            });
          }
        }

        // Add "All Devices" option
        chrome.contextMenus.create({
          id: `${menuItem.id}-all`,
          title: '📤 All Devices',
          parentId: menuItem.id,
          contexts: menuItem.contexts as chrome.contextMenus.ContextType[],
        });
      }
    } catch (error) {
      console.error('Failed to create context menus:', error);
      // Fall back to simple menu structure
      chrome.contextMenus.create({
        id: 'push-page-all',
        title: 'Push this page',
        contexts: ['page'],
      });
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  try {
    const menuId = info.menuItemId as string;
    let payload: PushPayload;

    // Determine base payload based on menu ID
    switch (menuId) {
      case 'push-page':
        payload = {
          type: 'link',
          url: tab.url!,
          title: tab.title,
          body: `Page shared from ${new URL(tab.url!).hostname}`,
        };
        break;

      case 'push-link':
        payload = {
          type: 'link',
          url: info.linkUrl!,
          title: (info as any).linkText || info.linkUrl,
          body: `Link shared from ${new URL(tab.url!).hostname}`,
        };
        break;

      case 'push-image':
        payload = {
          type: 'link',
          url: info.srcUrl!,
          title: (info as any).altText || 'Image',
          body: `Image shared from ${new URL(tab.url!).hostname}`,
        };
        break;

      case 'push-selection':
        payload = {
          type: 'note',
          body: info.selectionText!,
          title: `Text from ${new URL(tab.url!).hostname}`,
        };
        break;

      default:
        // Handle device/contact specific pushes
        if (menuId.startsWith('push-device-') || menuId.startsWith('push-contact-')) {
          // For device/contact specific pushes, we need to determine the base action
          // This would be set up in the context menu creation
          payload = {
            type: 'note',
            title: 'Shared via Pushbridge',
            body: 'Content shared via context menu',
          };
        } else {
          return;
        }
        break;
    }

    // Handle targeting based on menu ID structure
    if (menuId.includes('-device-')) {
      // Extract device iden from menu ID
      const deviceIden = menuId.substring(menuId.lastIndexOf('-') + 1);
      payload.targetDeviceIden = deviceIden;
    } else if (menuId.includes('-contact-')) {
      // Extract contact iden and get contact email
      const contactIden = menuId.substring(menuId.lastIndexOf('-') + 1);
      const contact = await getContactByIden(contactIden);
      if (contact) {
        payload.email = contact.email;
      }
    } else if (menuId.endsWith('-all')) {
      // Send to all devices (default behavior)
      // No targeting needed
    }

    // Create the push
    await createPush(payload);

    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'Push Sent',
      message: 'Your push has been sent successfully!',
    });
  } catch (error) {
    console.error('Failed to handle context menu click:', error);

    // Show error notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'Push Failed',
      message: 'Failed to send push. Please try again.',
    });
  }
});

/**
 * Handle getting SMS conversations from API
 */
// OLD SMS HANDLERS REMOVED - Replaced with simple system below

/**
 * SIMPLE SMS HANDLERS - Replace all complex logic with unified approach
 */

/**
 * Handle getting SMS conversations - Simple version
 * Always returns cached data - real-time updates come via WebSocket sms_changed
 */
async function handleGetSmsConversationsSimple(
  sendResponse: (response: any) => void
) {
  try {
    console.log(
      '📱 [Background] Getting SMS conversations (simple) - returning cached data'
    );

    // Get default SMS device
    const defaultDevice = await getDefaultSmsDevice();
    if (!defaultDevice) {
      sendResponse({ success: false, error: 'No SMS device available' });
      return;
    }

    // Always return cached data - no sync needed because:
    // - Real-time updates come via WebSocket sms_changed
    // - Periodic syncs (6h) keep data fresh
    // - Popup-open sync ensures recent data when user is active
    const smsData = await getCachedSmsData(defaultDevice.iden);

    sendResponse({
      success: true,
      conversations: smsData.threads,
      lastSync: smsData.lastSync,
    });
  } catch (error) {
    console.error('[Background] Failed to get SMS conversations:', error);
    sendResponse({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get conversations',
    });
  }
}

/**
 * Handle getting SMS thread - Simple version
 */
async function handleGetSmsThreadSimple(
  conversationId: string,
  deviceIden: string,
  sendResponse: (response: any) => void
) {
  try {
    console.log(
      `📨 [Background] Getting SMS thread: ${conversationId} (simple)`
    );

    // Use provided device or get default
    let targetDevice = deviceIden;
    if (!targetDevice) {
      const defaultDevice = await getDefaultSmsDevice();
      if (!defaultDevice) {
        sendResponse({ success: false, error: 'No SMS device available' });
        return;
      }
      targetDevice = defaultDevice.iden;
    }

    // Get thread from cache (no need to sync - we sync regularly and on popup open)
    console.log('📨 [Background] Loading thread from cache (no sync needed)');
    const thread = await getThreadById(targetDevice, conversationId);

    if (thread) {
      sendResponse({ success: true, thread });
    } else {
      sendResponse({ success: false, error: 'Thread not found' });
    }
  } catch (error) {
    console.error('[Background] Failed to get SMS thread:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get thread',
    });
  }
}

/**
 * Trigger SMS sync from various sources
 */
export async function triggerSmsSync(reason: string = 'manual'): Promise<void> {
  try {
    console.log(`🔄 [Background] Triggering SMS sync (${reason})`);

    const defaultDevice = await getDefaultSmsDevice();
    if (!defaultDevice) {
      console.warn('⚠️ [Background] No SMS device for sync');
      return;
    }

    // Always sync when explicitly triggered
    await syncAllSmsData(defaultDevice.iden);
  } catch (error) {
    console.error(`❌ [Background] SMS sync failed (${reason}):`, error);
  }
}

/**
 * Handle marking conversation as read
 */
async function handleMarkConversationRead(
  conversationId: string,
  sendResponse: (response: any) => void
) {
  try {
    // Conversation read marking now handled by simple system
    console.log(`[Background] Marking conversation ${conversationId} as read`);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to mark conversation as read:', error);
    sendResponse({ success: false, error: 'Failed to mark as read' });
  }
}

/**
 * Handle getting default SMS device
 */
async function handleGetDefaultSmsDevice(
  sendResponse: (response: any) => void
) {
  try {
    console.log('[Background] Getting default SMS device...');
    const device = await getDefaultSmsDevice();
    if (device) {
      console.log('[Background] Default SMS device found:', {
        iden: device.iden,
        nickname: device.nickname,
        has_sms: device.has_sms,
      });
      sendResponse({
        success: true,
        device: {
          iden: device.iden,
          nickname: device.nickname,
          has_sms: device.has_sms,
        },
      });
    } else {
      console.warn('[Background] No SMS-capable device found');
      sendResponse({ success: false, error: 'No SMS-capable device found' });
    }
  } catch (error) {
    console.error('[Background] Failed to get default SMS device:', error);
    sendResponse({ success: false, error: 'Failed to get SMS device' });
  }
}

/**
 * Handle getting SMS-capable devices
 */
async function handleGetSmsCapableDevices(
  sendResponse: (response: any) => void
) {
  try {
    const devices = await getSmsCapableDevices();
    sendResponse({ success: true, devices });
  } catch (error) {
    console.error('Failed to get SMS-capable devices:', error);
    sendResponse({ success: false, error: 'Failed to get devices' });
  }
}

/**
 * Handle setting default SMS device
 */
async function handleSetDefaultSmsDevice(
  deviceIden: string,
  sendResponse: (response: any) => void
) {
  try {
    const success = await setDefaultSmsDevice(deviceIden);
    sendResponse({ success });
  } catch (error) {
    console.error('Failed to set default SMS device:', error);
    sendResponse({ success: false, error: 'Failed to set device' });
  }
}

/**
 * Handle syncing SMS history
 */
async function handleSyncSmsHistory(
  _deviceIden: string,
  sendResponse: (response: any) => void
) {
  try {
    await triggerSmsSync('manual');
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to sync SMS history:', error);
    sendResponse({ success: false, error: 'Failed to sync history' });
  }
}

/**
 * Handle reload specific SMS thread request
 */
async function handleReloadSmsThread(
  deviceIden: string,
  threadId: string,
  sendResponse: (response: any) => void
) {
  try {
    console.log(
      `📱 [Background] Reloading SMS thread: ${threadId} for device: ${deviceIden}`
    );

    if (!deviceIden) {
      const defaultDevice = await getDefaultSmsDevice();
      if (!defaultDevice) {
        sendResponse({ success: false, error: 'No SMS device available' });
        return;
      }
      deviceIden = defaultDevice.iden;
    }

    if (!threadId) {
      sendResponse({ success: false, error: 'Thread ID is required' });
      return;
    }

    // Reload the specific thread
    const updatedThread = await reloadSmsThread(deviceIden, threadId);

    if (updatedThread) {
      sendResponse({ success: true, thread: updatedThread });
    } else {
      sendResponse({
        success: false,
        error:
          'Failed to reload thread - device may be offline or thread not found',
      });
    }
  } catch (error) {
    console.error('[Background] Failed to reload SMS thread:', error);
    sendResponse({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to reload SMS thread',
    });
  }
}

/**
 * Handle getting SMS device info
 */
async function handleGetSmsDeviceInfo(sendResponse: (response: any) => void) {
  try {
    const defaultDevice = await getDefaultSmsDevice();
    if (defaultDevice) {
      sendResponse({
        success: true,
        device: {
          iden: defaultDevice.iden,
          nickname: defaultDevice.nickname,
          model: defaultDevice.model,
          type: defaultDevice.type,
        },
      });
    } else {
      sendResponse({ success: false, error: 'No SMS device found' });
    }
  } catch (error) {
    console.error('Failed to get SMS device info:', error);
    sendResponse({ success: false, error: 'Failed to get device info' });
  }
}

/**
 * Handle sending SMS
 */
async function handleSendSms(
  conversationId: string,
  message: string,
  sendResponse: (response: any) => void,
  deviceIden?: string,
  attachments?: Array<{ content_type: string; name: string; url: string }>
) {
  try {
    console.log('📱 [Background] Sending SMS:', {
      conversationId,
      messageLength: message.length,
      deviceIden,
      hasAttachments: !!attachments,
    });

    // Get default SMS device if not provided
    let targetDeviceIden = deviceIden;
    if (!targetDeviceIden) {
      const defaultDevice = await getDefaultSmsDevice();
      if (!defaultDevice) {
        sendResponse({ success: false, error: 'No SMS device available' });
        return;
      }
      targetDeviceIden = defaultDevice.iden;
    }

    // Validate message
    if (!message.trim() && (!attachments || attachments.length === 0)) {
      sendResponse({ success: false, error: 'Message cannot be empty' });
      return;
    }

    // Send SMS using smsBridge
    await sendSms(targetDeviceIden, conversationId, message, attachments);

    console.log('📱 [Background] SMS sent successfully to:', conversationId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('📱 [Background] Failed to send SMS:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Token is invalid or revoked')) {
        sendResponse({ success: false, error: 'Token is invalid or revoked' });
      } else if (error.message.includes('Message cannot be empty')) {
        sendResponse({ success: false, error: 'Message cannot be empty' });
      } else {
        sendResponse({ success: false, error: error.message });
      }
    } else {
      sendResponse({ success: false, error: 'Failed to send SMS' });
    }
  }
}

/**
 * Handle getting channel subscriptions
 */
async function handleGetChannelSubscriptions(
  forceRefresh: boolean,
  sendResponse: (response: any) => void
) {
  try {
    const { getSubscriptions } = await import('./channelManager');
    const subscriptions = await getSubscriptions(forceRefresh);
    sendResponse({ success: true, subscriptions });
  } catch (error) {
    console.error('Failed to get channel subscriptions:', error);
    sendResponse({
      success: false,
      error: 'Failed to fetch channel subscriptions',
    });
  }
}

/**
 * Handle subscribing to a channel
 */
async function handleSubscribeToChannel(
  channelTag: string,
  sendResponse: (response: any) => void
) {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      sendResponse({ success: false, error: 'No access token available' });
      return;
    }

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/subscriptions',
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_tag: channelTag }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during channel subscription',
          code: response.status,
        });
        sendResponse({ success: false, error: 'Token is invalid or revoked' });
        return;
      }
      throw new Error(
        `Failed to subscribe: ${response.status} ${response.statusText}`
      );
    }

    const subscription = await response.json();

    // Refresh subscriptions cache
    const { getSubscriptions } = await import('./channelManager');
    await getSubscriptions(true);

    sendResponse({ success: true, subscription });
  } catch (error) {
    console.error('Failed to subscribe to channel:', error);
    sendResponse({ success: false, error: 'Failed to subscribe to channel' });
  }
}

/**
 * Handle unsubscribing from a channel
 */
async function handleUnsubscribeFromChannel(
  subscriptionIden: string,
  sendResponse: (response: any) => void
) {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      sendResponse({ success: false, error: 'No access token available' });
      return;
    }

    // Get subscription info before deleting to identify the channel
    const { getSubscriptions } = await import('./channelManager');
    const subscriptions = await getSubscriptions(false);
    const subscription = subscriptions.find(
      sub => sub.iden === subscriptionIden
    );
    const channelIden = subscription?.channel?.iden;

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/subscriptions/${subscriptionIden}`,
      {
        method: 'DELETE',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Already unsubscribed elsewhere, remove from cache immediately
        const { clearSubscriptionsCache } = await import('./channelManager');
        await clearSubscriptionsCache();

        // Also clean up from storage
        await cleanupChannelFromStorage(channelIden, subscription);

        sendResponse({ success: true, message: 'Already unsubscribed' });
        return;
      }
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked during channel unsubscription',
          code: response.status,
        });
        sendResponse({ success: false, error: 'Token is invalid or revoked' });
        return;
      }
      throw new Error(
        `Failed to unsubscribe: ${response.status} ${response.statusText}`
      );
    }

    // Clean up all pushes associated with this channel/subscription
    if (channelIden) {
      await cleanupChannelPushes(channelIden);
    }

    // Clean up local storage entries for the unsubscribed channel
    await cleanupChannelFromStorage(channelIden, subscription);

    // Refresh subscriptions cache
    await getSubscriptions(true);

    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to unsubscribe from channel:', error);
    sendResponse({
      success: false,
      error: 'Failed to unsubscribe from channel',
    });
  }
}

/**
 * Handle getting channel information
 */
async function handleGetChannelInfo(
  channelTag: string,
  sendResponse: (response: any) => void
) {
  try {
    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/channel-info?tag=${encodeURIComponent(channelTag)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        sendResponse({ success: false, error: 'Channel not found' });
        return;
      }
      throw new Error(
        `Failed to get channel info: ${response.status} ${response.statusText}`
      );
    }

    const channelInfo = await response.json();
    sendResponse({ success: true, channelInfo });
  } catch (error) {
    console.error('Failed to get channel info:', error);
    sendResponse({
      success: false,
      error: 'Failed to get channel information',
    });
  }
}

/**
 * Clean up all pushes associated with a specific channel
 */
async function cleanupChannelPushes(channelIden: string): Promise<void> {
  try {
    // Get all stored pushes
    const stored = await chrome.storage.local.get('pb_recent_pushes_state');
    if (!stored.pb_recent_pushes_state) {
      return;
    }

    const state = stored.pb_recent_pushes_state;
    const originalPushes = state.pushes || [];

    // Filter out pushes associated with this channel
    const filteredPushes = originalPushes.filter((push: any) => {
      return push.channel_iden !== channelIden;
    });

    // Update storage with filtered pushes
    const updatedState = {
      ...state,
      pushes: filteredPushes,
    };

    await chrome.storage.local.set({
      pb_recent_pushes_state: updatedState,
    });

    console.log(
      `Cleaned up ${originalPushes.length - filteredPushes.length} pushes for channel ${channelIden}`
    );
  } catch (error) {
    console.error('Failed to cleanup channel pushes:', error);
  }
}

/**
 * Clean up channel data from local storage when unsubscribing
 */
async function cleanupChannelFromStorage(
  channelIden: string | undefined,
  subscription: any
): Promise<void> {
  try {
    if (!channelIden && !subscription) {
      return;
    }

    // Clean up from pb_channel_subs (this is already handled by clearSubscriptionsCache)
    // But we'll also clean up any specific channel data if needed

    // Clean up from user_context
    const { ContextManager } = await import('./contextManager');
    const contextManager = ContextManager.getInstance();

    // Remove the channel from the context manager's subscription map
    if (channelIden) {
      await contextManager.removeChannelFromContext(channelIden);
    }

    // Also clean up any channel-specific data from other storage keys
    const storageKeys = ['pb_channel_subs', 'pb_owned_channels'];

    for (const key of storageKeys) {
      try {
        const stored = await chrome.storage.local.get(key);
        if (stored[key]) {
          // For pb_channel_subs, filter out the unsubscribed channel
          if (key === 'pb_channel_subs' && stored[key].subscriptions) {
            const filteredSubscriptions = stored[key].subscriptions.filter(
              (sub: any) => {
                return sub.channel && sub.channel.iden !== channelIden;
              }
            );

            await chrome.storage.local.set({
              [key]: {
                ...stored[key],
                subscriptions: filteredSubscriptions,
              },
            });
          }

          // For pb_owned_channels, filter out if it was an owned channel
          if (key === 'pb_owned_channels' && stored[key].channels) {
            const filteredChannels = stored[key].channels.filter(
              (channel: any) => {
                return channel.iden !== channelIden;
              }
            );

            await chrome.storage.local.set({
              [key]: {
                ...stored[key],
                channels: filteredChannels,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Failed to cleanup ${key}:`, error);
      }
    }

    console.log(`Cleaned up channel ${channelIden} from local storage`);
  } catch (error) {
    console.error('Failed to cleanup channel from storage:', error);
  }
}

/**
 * Handle getting owned channels for broadcast functionality
 */
async function handleGetOwnedChannels(sendResponse: (response: any) => void) {
  try {
    const ownedChannels = await getOwnedChannels();
    sendResponse({ success: true, ownedChannels });
  } catch (error) {
    console.error('Failed to get owned channels:', error);
    sendResponse({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get owned channels',
    });
  }
}

/**
 * Handle refreshing channel data request from popup
 */
async function handleRefreshChannelData(sendResponse: (response: any) => void) {
  try {
    await refreshChannelData();
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to refresh channel data:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle getting subscription posts request from popup
 */
async function handleGetSubscriptionPosts(
  sendResponse: (response: any) => void
) {
  try {
    const posts = await getSubscriptionPosts();
    sendResponse({ success: true, posts });
  } catch (error) {
    console.error('Failed to get subscription posts:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle clearing SMS notifications from the badge
 */
async function handleClearSmsNotifications(
  sendResponse: (response: any) => void
) {
  try {
    console.log('💬 [Background] Clearing SMS notifications from badge');
    await notificationBadge.clearSmsNotifications();
    console.log('💬 [Background] SMS notifications cleared from badge');
    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to clear SMS notifications:', error);
    sendResponse({ ok: false, error: 'Failed to clear SMS notifications' });
  }
}

/**
 * Handle clearing all data including cursors
 */
async function handleClearAllData(sendResponse: (response: any) => void) {
  try {
    // Clear all cursors
    await clearAllCursors();

    // Clear all caches
    await Promise.all([
      clearDeviceCache(),
      clearSubscriptionsCache(),
      clearOwnedChannelsCache(),
      clearContactCache(),
    ]);

    // Clear other storage
    await Promise.all([
      setLocal('pb_token', null),
      setLocal('pb_device_iden', null),
      setLocal('pb_last_modified', null),
      setLocal('pb_settings', null),
      setLocal('pb_device_cache', null),
      setLocal('pb_channel_subs', null),
      setLocal('pb_owned_channels', null),
      setLocal('contacts', null),
      setLocal('pb_recent_pushes_state', null),
    ]);

    console.log('All data cleared successfully');
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to clear all data:', error);
    sendResponse({ success: false, error: 'Failed to clear all data' });
  }
}

/**
 * Handle WebSocket connection test
 */
async function handleTestWebSocket(sendResponse: (response: any) => void) {
  try {
    // Get the last heartbeat time from the socket manager
    const lastHeartbeat = await getLastHeartbeat();
    sendResponse({ ok: true, lastHeartbeat });
  } catch (error) {
    console.error('WebSocket test failed:', error);
    sendResponse({ ok: false, error: 'WebSocket test failed' });
  }
}

/**
 * Handle debug log collection
 */
async function handleGetDebugLog(sendResponse: (response: any) => void) {
  try {
    const log = await collectDebugLog();
    sendResponse({ ok: true, log });
  } catch (error) {
    console.error('Failed to collect debug log:', error);
    sendResponse({ ok: false, error: 'Failed to collect debug log' });
  }
}

/**
 * Handle popup open - clear all notifications using unified tracker
 */
async function handlePopupOpen(sendResponse: (response: any) => void) {
  try {
    const currentTime = Date.now();
    console.log('🪟 [Background] Popup opened, clearing all notifications');

    // Check if we need to trigger SMS sync (only if >1 hour since last popup open)
    const lastPopupOpened = await getLocal<number>(POPUP_LAST_OPENED_KEY);
    const shouldTriggerSmsSync =
      !lastPopupOpened || currentTime - lastPopupOpened > ONE_HOUR_MS;

    console.log(
      `🪟 [PopupTime] Last popup opened: ${lastPopupOpened ? new Date(formatToThreeDecimals(lastPopupOpened)).toISOString() : 'never'}, current: ${new Date(formatToThreeDecimals(currentTime)).toISOString()}, should sync SMS: ${shouldTriggerSmsSync}`
    );

    // Always update the last popup opened time
    await setLocal(POPUP_LAST_OPENED_KEY, currentTime);

    // Mark all notifications as seen using unified tracker
    await unifiedNotificationTracker.markAsSeen();

    // Clear push notifications from badge
    await notificationBadge.clearPushNotifications();

    // Only trigger SMS sync if more than 1 hour has passed since last popup open
    if (shouldTriggerSmsSync) {
      console.log(
        '🪟 [PopupTime] Triggering SMS sync (>1 hour since last popup open)'
      );
      triggerSmsSync('popup_open');
    } else {
      console.log(
        '🪟 [PopupTime] Skipping SMS sync (<1 hour since last popup open)'
      );
    }

    // Refresh badge to update SMS count
    await notificationBadge.refreshBadge();

    console.log(
      '🪟 [Background] All notifications marked as seen, badge refreshed'
    );
    sendResponse({ ok: true });
  } catch (error) {
    console.error('Failed to handle popup open:', error);
    sendResponse({ ok: false, error: 'Failed to clear notifications' });
  }
}

/**
 * Get last WebSocket heartbeat time
 */
async function getLastHeartbeat(): Promise<string> {
  // This would need to be implemented in the socket manager
  // For now, return a placeholder
  return new Date().toISOString();
}

/**
 * Handle getting unified tracker state for debugging
 */
async function handleGetUnifiedTrackerState(
  sendResponse: (response: any) => void
) {
  try {
    const state = unifiedNotificationTracker.getState();
    sendResponse({ ok: true, state });
  } catch (error) {
    console.error('Failed to get unified tracker state:', error);
    sendResponse({ ok: false, error: 'Failed to get tracker state' });
  }
}

/**
 * Collect debug information
 */
async function collectDebugLog(): Promise<string> {
  const logEntries: string[] = [];

  // Add basic system info
  logEntries.push(`=== Pushbridge Debug Log ===`);
  logEntries.push(`Generated: ${new Date().toISOString()}`);
  logEntries.push(`Extension Version: 1.0.0`);
  logEntries.push(`Chrome Version: Chrome Extension`);
  logEntries.push(``);

  // Add storage info
  try {
    const storage = await chrome.storage.local.get(null);
    logEntries.push(`=== Storage Info ===`);
    logEntries.push(`Token exists: ${!!storage.pb_token}`);
    logEntries.push(`Device IDEN: ${storage.pb_device_iden || 'Not set'}`);
    logEntries.push(
      `Settings: ${JSON.stringify(storage.pb_settings || {}, null, 2)}`
    );
    logEntries.push(``);
  } catch (error) {
    logEntries.push(`Failed to read storage: ${error}`);
  }

  // Add unified tracker state
  try {
    const state = unifiedNotificationTracker.getState();
    logEntries.push(`=== Unified Tracker State ===`);
    logEntries.push(
      `Last Seen: ${new Date(formatToThreeDecimals(state.timestamps.lastSeenTimestamp)).toISOString()}`
    );
    logEntries.push(
      `Last Updated: ${new Date(formatToThreeDecimals(state.timestamps.lastUpdated)).toISOString()}`
    );
    logEntries.push(
      `Cache Entries: ${Object.values(state.cache).reduce((sum, arr) => sum + arr.length, 0)}`
    );
    logEntries.push(``);
  } catch (error) {
    logEntries.push(`Failed to get tracker state: ${error}`);
  }

  // Add recent console logs (this would need to be implemented with a log collector)
  logEntries.push(`=== Recent Activity ===`);
  logEntries.push(`WebSocket status: Connected`); // This would be dynamic
  logEntries.push(`Last push received: ${new Date().toISOString()}`);
  logEntries.push(`Queue status: Active`);

  return logEntries.join('\n');
}
