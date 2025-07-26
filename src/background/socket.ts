/**
 * WebSocket manager for Pushbridge extension
 * Handles real-time connection to Pushbullet stream API
 */

import { reportError, PBError } from './errorManager';
import { handleMirror, handleRemoteDismiss } from './mirrorManager';
import { getLocal } from './storage';

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
const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 32000]; // Exponential backoff
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds
const POLL_INTERVAL = 60000; // 60 seconds

/**
 * Initialize WebSocket connection
 */
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

    // Close existing connection if any
    if (wsState.socket) {
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
    const wsUrl = `wss://stream.pushbullet.com/websocket/${token}`;
    console.log('Connecting to WebSocket:', wsUrl);

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
          handlePushTickle();
        } else if (message.subtype === 'device') {
          console.log('Device tickle received, syncing history');
          handleDeviceTickle();
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
    handlePushTickle();
  }, POLL_INTERVAL) as any;
}

/**
 * Handle push tickle by syncing history using unified tracker
 */
async function handlePushTickle(): Promise<void> {
  try {
    console.log(
      '🔄 [WebSocket] Push tickle received, syncing history with unified tracker'
    );

    // Import the push manager to get push history directly
    const { getPushHistory } = await import('./pushManager');
    const { unifiedNotificationTracker } = await import(
      './unifiedNotificationTracker'
    );
    const { notificationBadge } = await import('./notificationBadge');

    // Get recent pushes and process them
    const history = await getPushHistory(50, 0, '');

    if (history.pushes && history.pushes.length > 0) {
      console.log(
        `🔄 [WebSocket] Found ${history.pushes.length} pushes to process`
      );

      let processedCount = 0;
      let newPushesCount = 0;

      for (const push of history.pushes) {
        // Only process non-dismissed pushes that are for this user/device
        if (
          !push.dismissed &&
          (push.receiver_iden ||
            push.target_device_iden ||
            push.type === 'mirror' ||
            push.type === 'file' ||
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
            await notificationBadge.addPushNotifications(1);
            await unifiedNotificationTracker.markAsProcessed(
              'push',
              push.iden,
              new Date(push.created).getTime()
            );
            newPushesCount++;
          } else {
            console.log(
              `⏭️ [WebSocket] Skipping already processed push: ${push.iden}`
            );
          }

          processedCount++;
        }
      }

      console.log(
        `🔄 [WebSocket] Processed ${processedCount} pushes, ${newPushesCount} new pushes from tickle`
      );
    }
  } catch (error) {
    console.error('Failed to handle push tickle:', error);
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

    // Import the device manager functions directly
    const { getDevices } = await import('./deviceManager');

    // Refresh devices by calling getDevices with force refresh
    await getDevices(true);
    console.log('🔄 [WebSocket] Devices refreshed successfully');
  } catch (error) {
    console.error('Failed to handle device tickle:', error);
  }
}

/**
 * Handle push messages for mirror and dismissal
 */
async function handlePushMessage(message: WebSocketMessage): Promise<void> {
  try {
    const push = message.push;
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
    // Use the simple SMS sync system
    const { triggerSmsSync } = await import('./background');
    await triggerSmsSync('sms_changed');
  } catch (error) {
    console.error('📱 [WebSocket] Failed to handle SMS changed:', error);
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
    wsState.socket.close();
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
