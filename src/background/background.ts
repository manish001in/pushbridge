// Background service worker entry point
console.log('Pushbridge background service worker started');

// Import modules
import { base64ToBytes } from '../popup/fileTransport';
import { TransferRecord } from '../types/pushbullet';

import {
  accountReady,
  inAccountOrder,
  isSwitchingAccount,
  requestAccountChange,
  restartForAccountChange,
  takeCompletedChange,
} from './accountCutover';
import { bumpAccountEpoch, currentAccountEpoch } from './accountEpoch';
import { getKeepAliveAlarm, initializeKeepAlive, registerKeepAliveListener } from './alarm';
import {
  initializeChannelManager,
  getOwnedChannels,
  refreshChannelData,
  getSubscriptionPosts,
} from './channelManager';
import { getContacts, clearContactCache, getContactByIden } from './contactManager';
import { contextManager } from './contextManager';
import { buildContextMenuPush } from './contextMenuPayload';
import {
  getDevices,
  ensureChromeDevice,
  getPushableDevices,
  clearDeviceCache,
  getSmsCapableDevices,
  getDefaultSmsDevice,
  setDefaultSmsDevice,
  hasSmsCapableDevices,
} from './deviceManager';
import { reportError, PBError } from './errorManager';
import {
  uploadFile,
  ProgressCallback,
  resumeInterruptedUploads,
  cleanupOldPendingUploads,
} from './fileUploader';
import { httpClient, RateLimitError } from './httpClient';
import {
  handleUserDismissal,
  isMirrorNotificationId,
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
import {
  addTransferRecord,
  forgetPushNotification,
  handlePushNotificationClick,
  showPushNotification,
} from './pushNotifications';
import {
  initializeQueue,
  enqueue,
  getQueueStatus,
  clearQueue,
  checkGuidDelivered,
  type EnqueueOutcome,
} from './queue';
import { initializeQuotaMonitor, registerQuotaListener } from './quotaMonitor';
import { rateLimitManager } from './rateLimitManager';
// SMS imports moved to simple system
import {
  syncAllSmsData,
  getCachedSmsData,
  getThreadById,
  reloadSmsThread,
  markConversationRead,
} from './simpleSmsSync';
import { sendSms } from './smsBridge';
import {
  restoreSmsRetryAlarm,
  runSmsNotificationRetries,
  SMS_RETRY_ALARM,
} from './smsNotificationIdentity';
import {
  PUSH_SCAN_ALARM,
  restorePushScanAlarm,
  resumePushScan,
  initializeWebSocket,
  connectOnWorkerStart,
  isWebSocketHealthy,
  getConnectionStatus,
} from './socket';
import { setLocal, getLocal } from './storage';
import { tokenBucket } from './tokenBucket';
import {
  initializeTokenHealthMonitor,
  registerTokenHealthListener,
} from './tokenHealth';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

// Storage key for tracking popup open time
const POPUP_LAST_OPENED_KEY = 'pb_last_popup_opened';
const SMS_SYNC_ALARM = 'pb_sms_sync';
const DEVICE_SETUP_ALARM = 'pb_device_setup';
const SMS_SYNC_INTERVAL_MINUTES = 6 * 60;
const ONE_HOUR_MS = 3600000; // 1 hour in milliseconds



/**
 * Initialize SMS sync functionality
 */
async function initializeSmsSync(): Promise<void> {
  try {
    // An alarm, because a timer would be lost whenever the worker stops. It runs even
    // with no phone yet: the sync skips quietly until there is one.
    await chrome.alarms.create(SMS_SYNC_ALARM, {
      periodInMinutes: SMS_SYNC_INTERVAL_MINUTES,
    });
  } catch (error) {
    console.error('[Background] Failed to initialize SMS sync:', error);
  }
}

let workerRuntime: Promise<void> | null = null;

/**
 * Start what must be running whenever the worker is alive. Chrome stops and
 * restarts the worker, and each restart begins with empty memory.
 */
function ensureWorkerRuntime(): Promise<void> {
  if (!workerRuntime) workerRuntime = initializeWorkerRuntime();
  return workerRuntime;
}

async function initializeWorkerRuntime(): Promise<void> {
  // Before anything reads account state. If it fails, nothing else starts.
  await accountReady;

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

    // Initialize queue system
    initializeQueue();

    // Initialize context manager
    await contextManager.loadContext();
    console.log('[Background] Context manager initialized');

    // Initialize unified notification tracker
    await unifiedNotificationTracker.initialize();

    // Nothing can still be uploading in a worker that just started, so any record
    // left over was interrupted.
    await resumeInterruptedUploads();

    // Initialize WebSocket connection
    await connectOnWorkerStart();
  } catch (error) {
    console.error('Failed to initialize worker runtime:', error);
  }
}

/**
 * Start what only needs to run once per install or browser start: alarms,
 * network checks, restoring notifications, and context menus.
 */
async function initializeStartupServices(): Promise<void> {
  await ensureWorkerRuntime();

  try {
    // Initialize keep-alive alarm
    await initializeKeepAlive();

    // Initialize monitoring systems
    await initializeQuotaMonitor();
    await initializeTokenHealthMonitor();

    // Initialize channel functionality
    await initializeChannelManager();

    // Initialize SMS sync
    await initializeSmsSync();

    // Clean up expired mirrors, then restore the rest after a restart
    await cleanupExpiredMirrors();
    await reconstructMirrors();


    // Clean up old pending uploads
    await cleanupOldPendingUploads();

    // Create context menu items
    await createContextMenus();
  } catch (error) {
    console.error('Failed to initialize background services:', error);
  }
}

/** What can't wait for an install or browser start, which won't necessarily come. */
async function finishWorkerStart(): Promise<void> {
  const change = takeCompletedChange();

  // Alarms don't always survive, and they drive everything below while idle.
  if (!(await getKeepAliveAlarm())) {
    await initializeStartupServices();
  }
  await restorePushScanAlarm();
  await restoreSmsRetryAlarm();
  await ensureDeviceRegistered();

  if (!change) {
    return;
  }

  try {
    if (change.reset) {
      await chrome.runtime.openOptionsPage();
      return;
    }
    await fetchInitialDataAfterTokenVerification();
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?windowMode=1'),
      type: 'popup',
      width: 500,
      height: 700,
    });
  } catch (error) {
    console.error('Failed to finish setting up after an account change:', error);
  }
}

/** The retry alarm: each phone with a failed notification, until it's shown. */
function retrySmsNotifications(): Promise<void> {
  return runSmsNotificationRetries(async (deviceIden, full) => {
    const devices = await getDevices();
    if (!devices.some(device => device.iden === deviceIden)) {
      // That phone is gone, and so is any way of showing its message.
      return Number.MAX_SAFE_INTEGER;
    }
    const data = await syncAllSmsData(deviceIden, { incremental: !full });
    return data.lastCompleteSync ?? 0;
  });
}

/**
 * Sends need this browser registered. Worth checking on every start: if it failed once,
 * or the worker stopped first, every send would fail with nothing to fix it.
 */
async function ensureDeviceRegistered(): Promise<void> {
  const token = await getLocal<string>('pb_token');
  if (!token || (await getLocal<string>('pb_device_iden'))) {
    return;
  }
  try {
    await ensureChromeDevice();
  } catch (error) {
    console.error('Failed to register this browser, will retry:', error);
    await chrome.alarms.create(DEVICE_SETUP_ALARM, { delayInMinutes: 1 });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Pushbridge extension installed');
  void initializeStartupServices();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Pushbridge browser startup');
  void initializeStartupServices();
});

// Runs on every worker start. Listeners must be registered synchronously or
// Chrome won't deliver the event that woke the worker.
registerKeepAliveListener();
chrome.alarms.onAlarm.addListener(alarm => {
  void accountReady.then(() => {
    if (alarm.name === SMS_SYNC_ALARM) {
      void triggerSmsSync('periodic');
    } else if (alarm.name === SMS_RETRY_ALARM) {
      void retrySmsNotifications();
    } else if (alarm.name === PUSH_SCAN_ALARM) {
      void resumePushScan();
    } else if (alarm.name === DEVICE_SETUP_ALARM) {
      void ensureDeviceRegistered();
    }
  });
});
registerQuotaListener();
registerTokenHealthListener();
void ensureWorkerRuntime()
  .then(finishWorkerStart)
  .catch(error => console.error('Worker start failed:', error));

// Handle notification button clicks (dismiss)
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    await accountReady;
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

// Handle notification clicks. Keep this the only click listener: a second one
// would act on the same click, and open a link twice.
chrome.notifications.onClicked.addListener(async notificationId => {
  await accountReady;
  if (await isMirrorNotificationId(notificationId)) {
    await handleUserDismissal(notificationId);
  } else {
    await handlePushNotificationClick(notificationId);
  }
});

// Handle notifications the user closes
chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
  await accountReady;
  if (await isMirrorNotificationId(notificationId)) {
    // Only the user closing it means dismissing it on the phone too.
    if (byUser) {
      await handleUserDismissal(notificationId);
    }
  } else {
    // Auto-dismissed ones also need their click record removed.
    await forgetPushNotification(notificationId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  accountReady.then(
    () => handleMessage(message, sendResponse),
    () =>
      sendResponse({
        ok: false,
        success: false,
        error: 'Pushbridge is restarting. Please try again.',
      })
  );
  return true; // Keep message channel open for async response
});

function handleMessage(
  message: any,
  sendResponse: (response: any) => void
): void {
  // Messages can hold tokens and message text, so only the command is logged.
  console.log('📨 [Background] Received message:', message?.cmd);

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
        message.payload.attachments,
        message.payload.guid
      );
      break;
    case 'MARK_CONVERSATION_READ':
      handleMarkConversationRead(
        message.conversationId,
        message.deviceIden,
        sendResponse
      );
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
}

/**
 * Handle token verification from popup
 */
async function handleTokenVerification(
  token: string,
  sendResponse: (response: any) => void
) {
  try {
    // Initialize token bucket to ensure we have tokens for API calls
    tokenBucket.forceRefill(100);
    console.log('🔑 [Background] Token bucket initialized for verification');
    
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

      // Signing back in as the same user keeps everything. Another account restarts the
      // extension first, so nothing of the old one can carry over.
      if (isSwitchingAccount()) {
        sendResponse({ ok: false, error: 'Pushbridge is restarting. Please try again.' });
        return;
      }
      const changedAccount = await inAccountOrder(async () => {
        const previous = await getLocal<string>('pb_user_iden');
        if (previous && previous !== userData.iden) {
          await requestAccountChange({ token, userIden: userData.iden });
          return true;
        }
        await chrome.storage.local.set({
          pb_token: token,
          pb_user_iden: userData.iden,
        });
        if (previous !== userData.iden) {
          bumpAccountEpoch();
        }
        return false;
      });
      if (changedAccount) {
        sendResponse({ ok: true, restarting: true, user: userData });
        restartForAccountChange();
        return;
      }

      // Register Chrome device
      try {
        const deviceIden = await ensureChromeDevice();
        console.log('Chrome device registered:', deviceIden);
        
        // Fetch important data after successful token verification
        console.log('🔄 [Background] Fetching initial data after token verification...');
        await fetchInitialDataAfterTokenVerification();
        
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
 * Fetch important data after successful token verification
 */
async function fetchInitialDataAfterTokenVerification(): Promise<void> {
  try {
    console.log('🔄 [Background] Starting initial data fetch...');
    
    // Fetch data in parallel for better performance
    const fetchPromises = [
      // Fetch devices
      getPushableDevices(true).then(() => {
        console.log('✅ [Background] Devices fetched successfully');
      }).catch(error => {
        console.error('❌ [Background] Failed to fetch devices:', error);
      }),
      
      // Fetch contacts
      getContacts(true).then(() => {
        console.log('✅ [Background] Contacts fetched successfully');
      }).catch(error => {
        console.error('❌ [Background] Failed to fetch contacts:', error);
      }),
      
      // Fetch channel subscriptions
      (async () => {
        try {
          const { getSubscriptions } = await import('./channelManager');
          await getSubscriptions(true);
          console.log('✅ [Background] Channel subscriptions fetched successfully');
        } catch (error) {
          console.error('❌ [Background] Failed to fetch channel subscriptions:', error);
        }
      })(),
      
      // Fetch recent pushes
      (async () => {
        try {
          const history = await getEnhancedPushHistory(
            { type: 'manual', timestamp: Date.now(), reason: 'token_verification' },
            50, // Limit to 50 recent pushes
            0, // No modifiedAfter filter for initial fetch
            undefined // No cursor for initial fetch
          );
          console.log(`✅ [Background] Recent pushes fetched successfully (${history.pushes.length} pushes)`);
        } catch (error) {
          console.error('❌ [Background] Failed to fetch recent pushes:', error);
        }
      })(),
      
      // Initialize SMS sync if available
      (async () => {
        try {
          const hasSms = await hasSmsCapableDevices();
          if (hasSms) {
            await triggerSmsSync('token_verification');
            console.log('✅ [Background] SMS sync triggered successfully');
          } else {
            console.log('ℹ️ [Background] No SMS-capable devices found, skipping SMS sync');
          }
        } catch (error) {
          console.error('❌ [Background] Failed to trigger SMS sync:', error);
        }
      })(),
      
      // Create context menus
      (async () => {
        try {
          await createContextMenus();
          console.log('✅ [Background] Context menus created successfully');
        } catch (error) {
          console.error('❌ [Background] Failed to create context menus:', error);
        }
      })(),
      
      // Ensure WebSocket is connected
      (async () => {
        try {
          await initializeWebSocket();
          console.log('✅ [Background] WebSocket connection ensured');
        } catch (error) {
          console.error('❌ [Background] Failed to ensure WebSocket connection:', error);
        }
      })(),
    ];
    
    // Wait for all fetches to complete (but don't fail if some fail)
    await Promise.allSettled(fetchPromises);
    
    console.log('🎉 [Background] Initial data fetch completed');
  } catch (error) {
    console.error('❌ [Background] Error during initial data fetch:', error);
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
  payload: PushPayload & { isRetry?: boolean; attemptStartedAt?: number },
  sendResponse: (response: any) => void
) {
  const accountEpoch = currentAccountEpoch();
  const startedAt = Date.now();
  // Fixed before the first attempt, so a retry can tell if that one went through.
  const { isRetry, attemptStartedAt, ...push } = payload;
  push.guid = push.guid ?? crypto.randomUUID();

  /** Saved for later, without keeping the composer waiting for it to go out. */
  const saveForLater = async (mayHaveBeenSent: boolean) => {
    respondToQueued(
      await enqueue(
        {
          type: 'pushSend',
          payload: push,
          mayHaveBeenSent,
          firstAttemptAt: attemptStartedAt ?? startedAt,
        },
        { waitForSend: false, accountEpoch }
      )
    );
  };

  const respondToQueued = (outcome: EnqueueOutcome) => {
    if (outcome.status === 'rejected') {
      sendResponse({ ok: false, error: outcome.error });
    } else {
      sendResponse({ ok: true, queued: outcome.status === 'queued' });
    }
  };

  try {
    // Before anything that could wait for quota, including the check just below.
    if (rateLimitManager.isBackoffActive() || !tokenBucket.canConsume(1)) {
      await saveForLater(!!isRetry);
      return;
    }

    // The user retried after a failure that may have been a lost response.
    if (isRetry) {
      const delivery = await checkGuidDelivered(push.guid, attemptStartedAt);
      if (delivery === 'delivered') {
        sendResponse({ ok: true, queued: false });
        return;
      }
      if (delivery === 'unknown') {
        await saveForLater(true);
        return;
      }
    }

    // Check if we're online
    if (!isWebSocketHealthy()) {
      await saveForLater(false);
      return;
    }

    // Failures are reported to the composer that's waiting for this answer.
    const created = await createPush(push, {
      silent: true,
      accountEpoch,
      failFast: true,
    });

    // Broadcast to any listening popups that a new push was created
    try {
      chrome.runtime.sendMessage({
        cmd: 'pushCreated',
        source: 'background',
        push: created,
      });
    } catch {
      // Ignore if no popup is listening
    }

    sendResponse({ ok: true, push: created });
  } catch (error) {
    console.error('Failed to create push:', error);

    // No answer from the server. It may still have accepted this, so keep it and
    // let its send ID settle that. Chrome reports this as a TypeError.
    const noAnswer =
      error instanceof TypeError ||
      (error instanceof Error && /network/i.test(error.message));
    // Refused for now, not for good: the queue sends it once the backoff ends.
    const rateLimited = error instanceof RateLimitError;
    if (noAnswer || rateLimited) {
      try {
        // A clear refusal wasn't delivered, unless an earlier attempt already might be.
        await saveForLater(noAnswer || !!isRetry);
        return;
      } catch (queueError) {
        console.error('Failed to queue push:', queueError);
      }
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
              let notificationShown: boolean;
              try {
                notificationShown = await showPushNotification(push);
              } catch {
                // Not shown. Leave it unprocessed so the next check retries it.
                continue;
              }

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
    // The badge isn't touched: opening the popup already cleared what this row
    // counted for, so a decrement would take away a newer push instead.

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
    // The badge isn't touched: opening the popup already cleared what this row
    // counted for, so a decrement would take away a newer push instead.

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
            let notificationShown: boolean;
            try {
              notificationShown = await showPushNotification(push);
            } catch {
              // Not shown. Leave it unprocessed so the next check retries it.
              continue;
            }

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
 * Handle file upload request from popup
 */
async function handleUploadFile(
  payload: {
    fileData: {
      name: string;
      type: string;
      size: number;
      lastModified: number;
      base64: string;
    };
    targetDeviceIden?: string;
    email?: string;
    title?: string;
    body?: string;
    channel_tag?: string;
    guid?: string;
    isRetry?: boolean;
    attemptStartedAt?: number;
  },
  sendResponse: (response: any) => void
) {
  const accountEpoch = currentAccountEpoch();
  try {
    const { fileData, targetDeviceIden, email, title, body, channel_tag, isRetry } =
      payload;
    const guid = payload.guid ?? crypto.randomUUID();

    // The user retried after a failure that may have been a lost response.
    if (isRetry) {
      const delivery = await checkGuidDelivered(guid, payload.attemptStartedAt);
      if (delivery === 'delivered') {
        sendResponse({ success: true });
        return;
      }
      if (delivery === 'unknown') {
        sendResponse({
          success: false,
          error:
            "Couldn't confirm whether the file already went through. Please check before sending it again.",
        });
        return;
      }
    }

    // Reconstruct the File object from the ArrayBuffer data
    const file = new File([base64ToBytes(fileData.base64)], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified,
    });

    // Request upload from Pushbullet
    // Files aren't kept for later, so a rate limit is an immediate, visible failure.
    const uploadInfo = await requestUpload(file, { failFast: true });

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

    // A file uploaded for one account must not be sent from another.
    if (accountEpoch !== currentAccountEpoch()) {
      sendResponse({
        ok: false,
        success: false,
        error: 'Account changed during upload',
      });
      return;
    }

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
        email,
        guid,
        accountEpoch,
        { failFast: true }
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

      // The file is delivered: nothing after this may report it as failed, or
      // the user would send it again.
      sendResponse({ success: true, filePush });

      try {
        await addTransferRecord(transferRecord);
      } catch (error) {
        console.error('Failed to record the file transfer:', error);
      }

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

      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/48.png',
          title: 'File Sent',
          message: `File "${file.name}" sent successfully`,
        });
      } catch (error) {
        console.error('Failed to show file sent notification:', error);
      }
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
      base64: string;
    };
    targetDeviceIden?: string;
  },
  sendResponse: (response: any) => void
) {
  try {
    const { fileData } = payload;

    // Reconstruct the File object from the ArrayBuffer data
    const file = new File([base64ToBytes(fileData.base64)], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified,
    });

    // Request upload from Pushbullet
    const accountEpoch = currentAccountEpoch();
    const uploadInfo = await requestUpload(file, { failFast: true });

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

    // A file uploaded for one account must not be sent from another.
    if (accountEpoch !== currentAccountEpoch()) {
      sendResponse({
        ok: false,
        success: false,
        error: 'Account changed during upload',
      });
      return;
    }

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
      const devices = await getPushableDevices();
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
              title: `📱 ${device.nickname || 'Unknown Device'}`,
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
      // Gracefully handle first-time setup where token isn't available yet
      if (error instanceof Error && error.message.includes('No token available')) {
        console.log('No token available, skipping detailed context menu creation');
      } else {
        console.error('Failed to create context menus:', error);
      }
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
  await accountReady;
  console.log('🔄 [Background] Context menu clicked:', info, tab);
  if (!tab) return;

  console.log('🔄 [Background] Context menu processing:', info, tab);
  try {
    const push = buildContextMenuPush(info.menuItemId as string, info, tab);
    if (!push) {
      console.warn('🔄 [Background] Unknown context menu ID:', info.menuItemId);
      return;
    }

    const { payload, contactIden } = push;
    if (contactIden) {
      const contact = await getContactByIden(contactIden);
      if (!contact) {
        console.error('🔄 [Background] Contact not found for ID:', contactIden);
        return;
      }
      payload.email = contact.email;
    }

    // Through the saved queue, so a rate limit or worker restart can't lose it.
    await enqueue({ type: 'pushSend', payload }, { waitForSend: false });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'Push queued',
      message: 'It will send as soon as it can.',
    });
  } catch (error) {
    console.error('❌ [Background] Failed to handle context menu click:', error);

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

    // Opening the popup only needs what changed. The periodic sync checks everything.
    await syncAllSmsData(defaultDevice.iden, {
      incremental: reason === 'popup_open',
    });
  } catch (error) {
    console.error(`❌ [Background] SMS sync failed (${reason}):`, error);
  }
}

/**
 * Handle marking conversation as read
 */
async function handleMarkConversationRead(
  conversationId: string,
  deviceIden: string | undefined,
  sendResponse: (response: any) => void
) {
  try {
    console.log(`[Background] Marking conversation ${conversationId} as read`);
    const targetDevice = deviceIden ?? (await getDefaultSmsDevice())?.iden;
    if (!targetDevice) {
      sendResponse({ success: false, error: 'No SMS device available' });
      return;
    }

    await markConversationRead(targetDevice, conversationId);
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
  attachments?: Array<{ content_type: string; name: string; url: string }>,
  guid?: string
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
    await sendSms(targetDeviceIden, conversationId, message, attachments, guid);

    console.log('📱 [Background] SMS sent successfully to:', conversationId);
    sendResponse({ success: true });
  } catch (error) {
    // The error can contain a phone number, so only its type is logged.
    console.error(
      '📱 [Background] Failed to send SMS:',
      error instanceof Error ? error.name : 'unknown'
    );

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
    console.log('🧹 [Background] Starting complete data clear...');

    // Cleared at the next start, once nothing from before can still be running.
    await inAccountOrder(() => requestAccountChange({ reset: true }));
    sendResponse({
      success: true,
      restarting: true,
      message: 'All extension data has been cleared',
    });
    restartForAccountChange();
  } catch (error) {
    console.error('❌ [Background] Failed to clear all data:', error);
    sendResponse({ 
      success: false, 
      error: 'Failed to clear all data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle WebSocket connection test
 */
async function handleTestWebSocket(sendResponse: (response: any) => void) {
  try {
    // Get the last heartbeat time from the socket manager
    const status = getConnectionStatus();
    if (!isWebSocketHealthy()) {
      sendResponse({
        ok: false,
        error: status.isPolling
          ? 'Not connected to the stream; checking for pushes periodically'
          : 'Not connected to the stream',
      });
      return;
    }
    sendResponse({
      ok: true,
      lastHeartbeat: new Date(status.lastHeartbeat).toISOString(),
    });
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
  logEntries.push(`Extension Version: ${chrome.runtime.getManifest().version}`);
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
  const wsStatus = getConnectionStatus();
  logEntries.push(
    `WebSocket status: ${wsStatus.isConnected ? 'Connected' : wsStatus.isPolling ? 'Polling' : 'Disconnected'}`
  );
  logEntries.push(`Last push received: ${new Date().toISOString()}`);
  logEntries.push(
    `Queue: ${(await getQueueStatus()).pendingCount ?? 'unknown'} pending`
  );

  return logEntries.join('\n');
}
