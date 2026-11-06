/**
 * WebSocket manager for Pushbridge extension
 * Handles real-time connection to Pushbullet stream API
 */

import { currentAccountEpoch } from './accountEpoch';
import { getContacts } from './contactManager';
import { getDevices, getDefaultSmsDevice } from './deviceManager';
import { reportError, PBError } from './errorManager';
import { handleMirror, handleRemoteDismiss } from './mirrorManager';
import { notificationBadge } from './notificationBadge';
import { getNotificationPrefs } from './notificationPrefs';
import { formatToThreeDecimals } from './numberUtils';
import { getPushHistory } from './pushManager';
import { isPushForThisBrowser, showPushNotification } from './pushNotifications';
import { rateLimitManager } from './rateLimitManager';
import { syncAllSmsData } from './simpleSmsSync';
import { getLocal, getSession, setLocal, setSession } from './storage';
import { unifiedNotificationTracker } from './unifiedNotificationTracker';

interface WebSocketMessage {
  type: string;
  subtype?: string;
  [key: string]: any;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  lastHeartbeat: number;
  retryCount: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  isPolling: boolean;
  pollInterval: ReturnType<typeof setInterval> | null;
}

// WebSocket state
const wsState: WebSocketState = {
  socket: null,
  isConnected: false,
  lastHeartbeat: 0,
  retryCount: 0,
  reconnectTimer: null,
  isPolling: false,
  pollInterval: null,
};

// Constants
const MAX_RETRY_COUNT = 10;
const STREAM_STARTED_KEY = 'pb_stream_started';
const ENCRYPTION_WARNED_KEY = 'pb_encryption_warned';
// Limit tabs opened at once when catching up after sleep; the rest stay in Messages.
const MAX_CATCH_UP_TABS = 10;
// Enough for a long absence without paging through a whole account's history.
// A backlog shouldn't flood the desktop; the rest stay in Messages and on the badge.
const MAX_NOTIFICATIONS_PER_SCAN = 10;
const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 32000]; // Exponential backoff
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds
const POLL_INTERVAL = 60000; // 60 seconds

/**
 * Initialize WebSocket connection
 */
/**
 * Connect when the worker starts. With auto-reconnect off the user only wants the
 * first connection of the browser session, and an alarm waking the worker later
 * must not count as a new one.
 */
export async function connectOnWorkerStart(): Promise<void> {
  const settings = await getLocal<any>('pb_settings');
  const alreadyStarted = await getSession<boolean>(STREAM_STARTED_KEY);
  if (settings?.autoReconnect === false && alreadyStarted) {
    console.log('Auto-reconnect is off, not reconnecting on worker start');
    return;
  }
  try {
    await setSession(STREAM_STARTED_KEY, true);
  } catch (error) {
    console.error('Failed to record stream start:', error);
  }
  await initializeWebSocket();
}

export async function initializeWebSocket(): Promise<void> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      console.log('No token available, skipping WebSocket initialization');
      return;
    }

    await connectWebSocket();
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to initialize WebSocket connection',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Connect to Pushbullet WebSocket
 */
async function connectWebSocket(): Promise<void> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Close existing connection if any, without triggering a reconnect
    if (wsState.socket) {
      wsState.socket.onopen = null;
      wsState.socket.onclose = null;
      wsState.socket.close();
    }

    // Clear any existing timers
    if (wsState.reconnectTimer) {
      clearTimeout(wsState.reconnectTimer);
      wsState.reconnectTimer = null;
    }

    if (wsState.pollInterval) {
      clearInterval(wsState.pollInterval);
      wsState.pollInterval = null;
    }

    // Create new WebSocket connection
    // The URL contains the access token, so it must never be logged.
    const wsUrl = `wss://stream.pushbullet.com/websocket/${token}`;
    console.log('Connecting to WebSocket');

    wsState.socket = new WebSocket(wsUrl);
    wsState.socket.onopen = onWebSocketOpen;
    wsState.socket.onmessage = onWebSocketMessage;
    wsState.socket.onclose = onWebSocketClose;
    wsState.socket.onerror = onWebSocketError;
  } catch (error) {
    console.log('Failed to connect WebSocket:', error);
    await handleConnectionFailure();
  }
}

/**
 * Handle WebSocket open event
 */
function onWebSocketOpen(): void {
  console.log('WebSocket connected');
  wsState.isConnected = true;
  wsState.lastHeartbeat = Date.now();
  wsState.retryCount = 0; // Reset retry count on successful connection
  wsState.isPolling = false;

  // Clear any polling interval
  if (wsState.pollInterval) {
    clearInterval(wsState.pollInterval);
    wsState.pollInterval = null;
  }

  // Nothing is delivered while the socket is down, such as during sleep.
  void schedulePushSync(true);
}

/**
 * Handle WebSocket message event
 */
function onWebSocketMessage(event: MessageEvent): void {
  try {
    const message: WebSocketMessage = JSON.parse(event.data);
    console.log('WebSocket message received:', message.type);

    // Update heartbeat timestamp
    wsState.lastHeartbeat = Date.now();

    // Handle different message types
    switch (message.type) {
      case 'nop':
        // No operation - just a heartbeat
        console.log('WebSocket heartbeat received');
        break;

      case 'tickle':
        if (message.subtype === 'push') {
          console.log('Push tickle received, syncing history');
          schedulePushSync();
        } else if (message.subtype === 'device') {
          console.log('Device tickle received, syncing history');
          handleDeviceTickle();
        } else if (message.subtype === 'contact') {
          console.log('Contact tickle received, syncing contacts');
          handleContactTickle();
        }
        break;

      case 'push':
        // Handle push messages for mirror and dismissal
        console.log('Push message received:', message.push?.type);
        handlePushMessage(message);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
  }
}

/**
 * Handle WebSocket close event
 */
async function onWebSocketClose(event: CloseEvent): Promise<void> {
  console.log('WebSocket closed:', event.code, event.reason);
  wsState.isConnected = false;
  wsState.socket = null;

  const settings = await getLocal<any>('pb_settings');
  if (settings?.autoReconnect === false) {
    console.log('Auto-reconnect is off, staying disconnected');
    return;
  }

  // Attempt to reconnect unless we've exceeded max retries
  if (wsState.retryCount < MAX_RETRY_COUNT) {
    await handleConnectionFailure();
  } else {
    console.log('Max retry count reached, switching to polling mode');
    await switchToPollingMode();
  }
}

/**
 * Handle WebSocket error event
 */
function onWebSocketError(event: Event): void {
  console.log('WebSocket connection error:', event);
  wsState.isConnected = false;
}

/**
 * Handle connection failure and schedule reconnect
 */
async function handleConnectionFailure(): Promise<void> {
  wsState.retryCount++;
  const delay =
    RECONNECT_DELAYS[
      Math.min(wsState.retryCount - 1, RECONNECT_DELAYS.length - 1)
    ];

  console.log(
    `WebSocket connection failed, retry ${wsState.retryCount}/${MAX_RETRY_COUNT} in ${delay}ms`
  );

  wsState.reconnectTimer = setTimeout(() => {
    connectWebSocket();
  }, delay);
}

/**
 * Switch to polling mode when WebSocket fails
 */
async function switchToPollingMode(): Promise<void> {
  if (wsState.isPolling) {
    return; // Already in polling mode
  }

  console.log('Switching to polling mode due to WebSocket connection failures');
  wsState.isPolling = true;

  // Show user notification about fallback
  await reportError(PBError.Unknown, {
    message: 'Real-time connection lost; falling back to polling.',
    code: 1001,
  });

  // Start polling
  wsState.pollInterval = setInterval(() => {
    schedulePushSync();
  }, POLL_INTERVAL) as any;
}

const PUSH_SCAN_WATERMARK_KEY = 'pb_push_scan_watermark';
// Re-read a few seconds, in case a push became visible slightly out of order. The
// tracker already knows which of those were handled.
const PUSH_SCAN_OVERLAP_SECONDS = 5;

const PUSH_SCAN_STATE_KEY = 'pb_push_scan_progress';
const PUSH_SUMMARY_KEY = 'pb_push_summary_unshown';
export const PUSH_SCAN_ALARM = 'pb_push_scan_resume';
const PAGES_PER_SCAN_PASS = 5;
const MAX_FAILED_ROW_RETRIES = 5;

/** At worker start: saved work needs its alarm, which may not have survived. */
export async function restorePushScanAlarm(): Promise<void> {
  if (
    (await getLocal<PushScan | null>(PUSH_SCAN_STATE_KEY)) ||
    (await getLocal<number>(PUSH_SUMMARY_KEY))
  ) {
    await ensureScanAlarm();
  }
}

/** One more pass of a long scan, from its alarm. */
export function resumePushScan(): Promise<void> {
  pushSyncChain = pushSyncChain.then(() => handlePushTickle(true, true));
  return pushSyncChain;
}

let pushSyncChain: Promise<void> = Promise.resolve();
let syncWaiting = false;

/**
 * Run one history scan at a time. Overlapping scans would both see the same push
 * as new before either marks it processed, and open its link twice.
 */
function schedulePushSync(catchUp = false): Promise<void> {
  // One waiting scan will see everything the skipped ones would have.
  if (syncWaiting) {
    return pushSyncChain;
  }
  syncWaiting = true;
  pushSyncChain = pushSyncChain.then(() => {
    syncWaiting = false;
    return handlePushTickle(catchUp);
  });
  return pushSyncChain;
}

/** A scan of everything changed since the watermark, resumable across workers. */
interface PushScan {
  since: number;
  cursor: string;
  newestSeen: number;
  oldestFailed?: number;
  tabsOpened: number;
  notificationsShown: number;
  heldBack: number;
  failedRetries?: number;
}

/**
 * Read one pass of a scan, oldest first. The API sorts by modified time, so `done`
 * means there's no cursor left, or the rest was modified before the user last looked.
 */
async function readScanPages(
  scan: PushScan,
  catchUp: boolean
): Promise<{ pushes: any[]; done: boolean }> {
  const pushes: any[] = [];

  for (let page = 0; page < PAGES_PER_SCAN_PASS; page++) {
    if (page > 0 && rateLimitManager.isQuotaLow()) {
      return { pushes: sortByCreated(pushes), done: false };
    }
    const history: { pushes?: any[]; cursor?: string } = await getPushHistory(
      50,
      scan.since,
      scan.cursor
    );
    const batch = history.pushes ?? [];
    pushes.push(...batch);
    scan.cursor = history.cursor ?? '';

    const oldest = batch[batch.length - 1];
    if (
      !scan.cursor ||
      (oldest &&
        (!(await unifiedNotificationTracker.isNewerThanLastSeen(
          oldest.modified
        )) ||
          // A live scan has caught up once it reaches one it has already handled.
          // With a watermark the query itself says where to stop, and an old push
          // that was only dismissed mustn't hide new ones behind it.
          (!catchUp &&
            !scan.since &&
            batch.some(push =>
              unifiedNotificationTracker.wasProcessed('push', push.iden)
            ))))
    ) {
      return { pushes: sortByCreated(pushes), done: true };
    }
  }

  // Without a baseline there's nothing to stop an old account's whole history.
  const done = !(await unifiedNotificationTracker.hasBaseline());
  return { pushes: sortByCreated(pushes), done };
}

function sortByCreated(pushes: any[]): any[] {
  return pushes.sort((a, b) => a.created - b.created);
}

/**
 * The summarized pushes count as handled, so this is their only notice. If it can't be
 * shown it's kept, with an alarm, until it can.
 */
async function showBacklogSummary(count: number): Promise<void> {
  try {
    const prefs = await getNotificationPrefs();
    if (prefs.enabled) {
      await chrome.notifications.create('push_backlog_summary', {
        type: 'basic',
        iconUrl: 'icons/48.png',
        title: 'More pushes',
        message: `${count} more while you were away. See Messages.`,
        silent: !prefs.sound,
      });
    }
    await setLocal(PUSH_SUMMARY_KEY, 0);
  } catch (error) {
    console.error('Failed to show the backlog summary:', error);
    await setLocal(PUSH_SUMMARY_KEY, count);
    await ensureScanAlarm();
  }
}

/** The alarm, not tickles or reconnects, paces a long scan. */
async function ensureScanAlarm(): Promise<void> {
  if (!(await chrome.alarms.get(PUSH_SCAN_ALARM))) {
    await chrome.alarms.create(PUSH_SCAN_ALARM, { delayInMinutes: 1 });
  }
}

/**
 * Handle push tickle by syncing history using unified tracker
 */
async function handlePushTickle(
  catchUp = false,
  fromAlarm = false
): Promise<void> {
  let checkpoint: PushScan | undefined;
  const scanEpoch = currentAccountEpoch();
  try {
    console.log(
      catchUp
        ? '🔄 [WebSocket] Connected, catching up on missed pushes'
        : '🔄 [WebSocket] Push tickle received, syncing history with unified tracker'
    );

    // With no baseline, everything looks new. Start from now rather than opening
    // a tab for every old link in the account.
    if (catchUp && !(await unifiedNotificationTracker.hasBaseline())) {
      await unifiedNotificationTracker.markAsSeen();
      return;
    }

    if (!(await getLocal<string>('pb_token'))) {
      return;
    }

    const unshownSummary = await getLocal<number>(PUSH_SUMMARY_KEY);
    if (unshownSummary) {
      await showBacklogSummary(unshownSummary);
    }

    const saved = await getLocal<PushScan | null>(PUSH_SCAN_STATE_KEY);
    if (saved && (!fromAlarm || rateLimitManager.isQuotaLow())) {
      // Finish the scan in progress first. New arrivals are picked up right after.
      await ensureScanAlarm();
      return;
    }
    if (!saved && fromAlarm) {
      return;
    }

    const scannedUpTo = await getLocal<number>(PUSH_SCAN_WATERMARK_KEY);
    const scan: PushScan = saved ?? {
      since: scannedUpTo ? scannedUpTo - PUSH_SCAN_OVERLAP_SECONDS : 0,
      cursor: '',
      newestSeen: scannedUpTo ?? 0,
      tabsOpened: 0,
      notificationsShown: 0,
      heldBack: 0,
    };

    // Get recent pushes and process them
    const accountEpoch = currentAccountEpoch();
    const deviceIden = await getLocal<string>('pb_device_iden');
    // Where to start again if this pass fails. Reading moves the cursor on.
    checkpoint = { ...scan };
    const { pushes, done } = await readScanPages(scan, catchUp);
    // Only a backlog is capped. A scan long enough to need resuming is one.
    const capped = catchUp || !!saved || !done;

    if (pushes.length > 0) {
      console.log(`🔄 [WebSocket] Found ${pushes.length} pushes to process`);

      let processedCount = 0;
      let newPushesCount = 0;

      for (const push of pushes) {
        // Signed out meanwhile: nothing from this scan should show or open.
        if (accountEpoch !== currentAccountEpoch()) {
          return;
        }

        // Only process non-dismissed pushes that are for this user/device
        if (
          !push.dismissed &&
          (push.receiver_iden ||
            push.target_device_iden ||
            push.type === 'mirror' ||
            push.type === 'file' ||
            push.type === 'link' ||
            push.channel_iden)
        ) {
          console.log(
            `🔔 [WebSocket] Processing push: ${push.iden} (type: ${push.type}, created: ${push.created})`
          );

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
              `🆕 [WebSocket] New push detected: ${push.iden} (timestamp: ${push.created})`
            );
            
            // Handle specific push types
            let openedInTab = false;
            let heldBack = false;
            if (push.type === 'link') {
              console.log('🔗 [WebSocket] Processing link push from history');
              if (!capped || scan.tabsOpened < MAX_CATCH_UP_TABS) {
                openedInTab = await handleLinkPush(push);
                if (openedInTab) scan.tabsOpened++;
              }
            }

            // The new tab already shows a link that opened.
            if (!openedInTab) {
              // Only a backlog is capped. The rest get one summary, below.
              if (
                capped &&
                scan.notificationsShown >= MAX_NOTIFICATIONS_PER_SCAN
              ) {
                heldBack = true;
                if (isPushForThisBrowser(push, deviceIden)) {
                  scan.heldBack++;
                }
              } else {
                try {
                  if (await showPushNotification(push)) {
                    scan.notificationsShown++;
                  }
                } catch (error) {
                  // Not shown. Leave it unprocessed so the next scan retries, unless
                  // that has been tried enough. Then it counts as handled, or the
                  // next scan would read it again and start all over.
                  if ((scan.failedRetries ?? 0) < MAX_FAILED_ROW_RETRIES) {
                    scan.oldestFailed = Math.min(
                      scan.oldestFailed ?? Infinity,
                      push.modified ?? 0
                    );
                    continue;
                  }
                  console.error('Giving up on a push notification:', error);
                }
              }
            }

            // Only count what was meant for this browser.
            if (isPushForThisBrowser(push, deviceIden)) {
              await notificationBadge.addPushNotifications(1);
            }
            // Later passes read older pushes, which no scan reads again. The tracker only
            // remembers so many, and they mustn't push out the recent ones it needs.
            if (!heldBack || !saved) {
              await unifiedNotificationTracker.markAsProcessed(
                'push',
                push.iden,
                new Date(formatToThreeDecimals(push.created)*1000).getTime()
              );
            }
            newPushesCount++;
          } else {
            console.log(
              `⏭️ [WebSocket] Skipping already processed push: ${push.iden}`
            );
          }

          processedCount++;
        }
      }

      if (scan.heldBack > 0) {
        await showBacklogSummary(scan.heldBack);
      }

      console.log(
        `🔄 [WebSocket] Processed ${processedCount} pushes, ${newPushesCount} new pushes`
      );

      scan.newestSeen = Math.max(
        scan.newestSeen,
        ...pushes.map(push => push.modified ?? 0)
      );
    }

    if (accountEpoch !== currentAccountEpoch()) {
      return;
    }

    if (!done) {
      await setLocal(PUSH_SCAN_STATE_KEY, scan);
      await ensureScanAlarm();
      return;
    }

    // The scan is complete, so nothing older is left unread. Only a push that failed
    // to show needs another look.
    const reachedTo =
      scan.oldestFailed === undefined
        ? scan.newestSeen
        : Math.max(scan.since, scan.oldestFailed - 1);
    if (scan.oldestFailed !== undefined) {
      // Nothing else would look again on a quiet connection.
      await setLocal(PUSH_SCAN_WATERMARK_KEY, reachedTo);
      await setLocal(PUSH_SCAN_STATE_KEY, {
        ...scan,
        since: reachedTo - PUSH_SCAN_OVERLAP_SECONDS,
        cursor: '',
        oldestFailed: undefined,
        failedRetries: (scan.failedRetries ?? 0) + 1,
      });
      await ensureScanAlarm();
      return;
    }
    if (scan.newestSeen > (scannedUpTo ?? 0)) {
      await setLocal(PUSH_SCAN_WATERMARK_KEY, scan.newestSeen);
    }
    if (saved) {
      await setLocal(PUSH_SCAN_STATE_KEY, null);
      // Anything that arrived during the scan.
      void schedulePushSync();
    }
  } catch (error) {
    console.error('Failed to handle push tickle:', error);
    // An alarm alone does nothing without saved work, and nothing else may come along.
    if (checkpoint && scanEpoch === currentAccountEpoch()) {
      try {
        await setLocal(PUSH_SCAN_STATE_KEY, checkpoint);
        await ensureScanAlarm();
      } catch (saveError) {
        console.error('Failed to save the push scan:', saveError);
      }
    }
  }
}

/**
 * Handle device tickle by refreshing device list
 */
async function handleDeviceTickle(): Promise<void> {
  try {
    console.log(
      '🔄 [WebSocket] Device tickle received, refreshing devices directly'
    );

    // Refresh devices by calling getDevices with force refresh
    await getDevices(true);
    console.log('🔄 [WebSocket] Devices refreshed successfully');
  } catch (error) {
    console.error('Failed to handle device tickle:', error);
  }
}

/**
 * Handle contact tickle by refreshing contact list
 */
async function handleContactTickle(): Promise<void> {
  try {
    console.log(
      '🔄 [WebSocket] Contact tickle received, refreshing contacts directly'
    );

    // Refresh contacts by calling getContacts with force refresh
    await getContacts(true);
    console.log('🔄 [WebSocket] Contacts refreshed successfully');
  } catch (error) {
    console.error('Failed to handle contact tickle:', error);
  }
}

/** Encrypted mirrors can't be read here. Say so once, instead of them just not appearing. */
async function warnEncryptionUnsupported(): Promise<void> {
  if (await getSession<boolean>(ENCRYPTION_WARNED_KEY)) {
    return;
  }
  await setSession(ENCRYPTION_WARNED_KEY, true);
  await chrome.notifications.create('pb_encryption_unsupported', {
    type: 'basic',
    iconUrl: 'icons/48.png',
    title: "Mirrored notifications can't be shown",
    message:
      "End-to-end encryption is on for your Pushbullet account, and Pushbridge can't read encrypted notifications yet.",
  });
}

/**
 * Handle push messages for mirror and dismissal
 */
async function handlePushMessage(message: WebSocketMessage): Promise<void> {
  try {
    const push = message.push;

    if ((push as any)?.encrypted) {
      await warnEncryptionUnsupported();
      return;
    }

    if (!push || !push.type) {
      console.log('Invalid push message format');
      return;
    }

    switch (push.type) {
      case 'mirror':
        console.log('Mirror push received, creating Chrome notification');
        await handleMirror(push);
        break;

      case 'dismissal':
        console.log('Dismissal push received, clearing Chrome notification');
        await handleRemoteDismiss(push);
        break;

      case 'sms_changed':
        console.log('SMS changed push received, triggering SMS sync');
        await handleSmsChanged(push);
        break;

      case 'link':
        console.log('Link push received, opening in new tab');
        await handleLinkPush(push);
        break;

      default:
        console.log('Unhandled push type:', push.type);
    }
  } catch (error) {
    console.error('Failed to handle push message:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to process push message',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Handle SMS changed push by triggering SMS sync
 */
async function handleSmsChanged(_push: any): Promise<void> {
  try {
    console.log('📱 [WebSocket] SMS changed detected, triggering simple sync');
    console.log('📱 [WebSocket] SMS changed push:', _push);
    
    // Get default SMS device and sync
    const defaultDevice = await getDefaultSmsDevice();
    if (!defaultDevice) {
      console.warn('⚠️ [WebSocket] No SMS device for sync');
      return;
    }

    // Use the simple SMS sync system
    await syncAllSmsData(defaultDevice.iden, { incremental: true });
  } catch (error) {
    console.error('📱 [WebSocket] Failed to handle SMS changed:', error);
  }
}

/**
 * Handle link push by opening URL in new tab
 */
async function handleLinkPush(push: any): Promise<boolean> {
  try {
    console.log('🔗 [WebSocket] Link push received:', push);
    
    // Check if auto-open setting is enabled
    const settings = await getLocal<any>('pb_settings');
    if (!settings?.autoOpenPushLinksAsTab) {
      console.log('🔗 [WebSocket] Auto-open links disabled, skipping tab creation');
      return false;
    }

    // Only open links meant for this browser, not ones sent to another device
    // or sent from here.
    const deviceIden = await getLocal<string>('pb_device_iden');
    if (!isPushForThisBrowser(push, deviceIden)) {
      console.log('🔗 [WebSocket] Link push is not for this browser, skipping');
      return false;
    }
    
    // Extract URL from the push
    const url = push.url;
    if (!url) {
      console.warn('⚠️ [WebSocket] Link push missing URL');
      return false;
    }

    // Validate URL format; pushes can come from other people
    try {
      if (!['http:', 'https:'].includes(new URL(url).protocol)) {
        console.warn('⚠️ [WebSocket] Refusing non-web link push');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ [WebSocket] Link push has an invalid URL', error);
      return false;
    }

    console.log(`🔗 [WebSocket] Opening URL in new tab: ${url}`);
    
    // Open URL in new tab
    await chrome.tabs.create({
      url: url,
      active: false // Don't switch to the new tab immediately
    });

    console.log('✅ [WebSocket] Successfully opened link in new tab');
    return true;
  } catch (error) {
    console.error('🔗 [WebSocket] Failed to handle link push:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to open link in new tab',
      code: error instanceof Error ? undefined : 500,
    });
    return false;
  }
}

/**
 * Check if WebSocket is connected and heartbeat is recent
 */
export function isWebSocketHealthy(): boolean {
  if (!wsState.isConnected || !wsState.socket) {
    return false;
  }

  const timeSinceHeartbeat = Date.now() - wsState.lastHeartbeat;
  return timeSinceHeartbeat < HEARTBEAT_TIMEOUT;
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): {
  isConnected: boolean;
  isPolling: boolean;
  retryCount: number;
  lastHeartbeat: number;
} {
  return {
    isConnected: wsState.isConnected,
    isPolling: wsState.isPolling,
    retryCount: wsState.retryCount,
    lastHeartbeat: wsState.lastHeartbeat,
  };
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket(): void {
  if (wsState.socket) {
    // Stop the close handler from scheduling a reconnect.
    wsState.socket.onclose = null;
    wsState.socket.close();
    wsState.socket = null;
  }

  if (wsState.reconnectTimer) {
    clearTimeout(wsState.reconnectTimer);
    wsState.reconnectTimer = null;
  }

  if (wsState.pollInterval) {
    clearInterval(wsState.pollInterval);
    wsState.pollInterval = null;
  }

  wsState.isConnected = false;
  wsState.isPolling = false;
  wsState.retryCount = 0;
}
