/**
 * Keep-alive alarm system for Pushbridge extension
 * Ensures service worker stays active and can monitor WebSocket connections
 */

import { refreshChannelData } from './channelManager';
import { reportError, PBError } from './errorManager';
import { cleanupExpiredMirrors } from './mirrorManager';
import { notificationBadge } from './notificationBadge';
import {
  initializeWebSocket,
  isWebSocketHealthy,
  getConnectionStatus,
} from './socket';
import { tokenBucket } from './tokenBucket';

const KEEPALIVE_ALARM_NAME = 'keepalive';
const CHANNEL_REFRESH_ALARM_NAME = 'channel-refresh';
const TOKEN_BUCKET_REFILL_ALARM_NAME = 'token-bucket-refill';
const KEEPALIVE_INTERVAL_MINUTES = 5;
const CHANNEL_REFRESH_INTERVAL_HOURS = 6;
const TOKEN_BUCKET_REFILL_INTERVAL_MINUTES = 2; // Check every 2 minutes

/**
 * Initialize the keep-alive alarm system
 * Creates an alarm that fires every 5 minutes
 */
export async function initializeKeepAlive(): Promise<void> {
  try {
    // Create the keep-alive alarm
    await chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
      periodInMinutes: KEEPALIVE_INTERVAL_MINUTES,
    });

    console.log(
      `Keep-alive alarm created with ${KEEPALIVE_INTERVAL_MINUTES} minute interval`
    );

    // Create the channel refresh alarm (6-hour interval)
    await chrome.alarms.create(CHANNEL_REFRESH_ALARM_NAME, {
      periodInMinutes: CHANNEL_REFRESH_INTERVAL_HOURS * 60,
    });

    console.log(
      `Channel refresh alarm created with ${CHANNEL_REFRESH_INTERVAL_HOURS} hour interval`
    );

    // Create the token bucket refill alarm (2-minute interval)
    await chrome.alarms.create(TOKEN_BUCKET_REFILL_ALARM_NAME, {
      periodInMinutes: TOKEN_BUCKET_REFILL_INTERVAL_MINUTES,
    });

    console.log(
      `Token bucket refill alarm created with ${TOKEN_BUCKET_REFILL_INTERVAL_MINUTES} minute interval`
    );

    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(handleAlarm);
  } catch (error) {
    console.error('Failed to initialize alarms:', error);
  }
}

/**
 * Handle alarm events
 * @param alarm - The alarm that fired
 */
function handleAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === KEEPALIVE_ALARM_NAME) {
    handleKeepAlive();
  } else if (alarm.name === CHANNEL_REFRESH_ALARM_NAME) {
    handleChannelRefresh();
  } else if (alarm.name === TOKEN_BUCKET_REFILL_ALARM_NAME) {
    handleTokenBucketRefill();
  }
}

/**
 * Handle keep-alive alarm
 * Enhanced in M3 to check WebSocket heartbeat and perform maintenance
 */
async function handleKeepAlive(): Promise<void> {
  console.log('keepalive - checking system health');

  try {
    // Check WebSocket connection health
    const connectionStatus = getConnectionStatus();
    const isHealthy = isWebSocketHealthy();

    console.log('WebSocket status:', connectionStatus);

    // If WebSocket is unhealthy (no heartbeat for >60s), attempt reconnection
    if (!isHealthy && connectionStatus.lastHeartbeat > 0) {
      const timeSinceHeartbeat = Date.now() - connectionStatus.lastHeartbeat;
      if (timeSinceHeartbeat > 60000) {
        // 60 seconds
        console.log('WebSocket heartbeat stale, attempting reconnection');
        await initializeWebSocket();
      }
    }

    // Clean up expired mirror notifications
    await cleanupExpiredMirrors();

    // Refresh notification badge state
    console.log('🔄 [Alarm] Refreshing notification badge');
    await notificationBadge.refreshBadge();

    // Log reconnection count for debugging
    if (connectionStatus.retryCount > 0) {
      console.log(
        `WebSocket reconnection attempts: ${connectionStatus.retryCount}`
      );
    }
  } catch (error) {
    console.log('Keep-alive check failed:', error);
    // Don't show user notification for keep-alive failures
  }
}

/**
 * Handle token bucket refill alarm
 * Ensures token bucket can refill even when no API requests are being made
 */
async function handleTokenBucketRefill(): Promise<void> {
  console.log('token-bucket-refill - checking token bucket status');

  try {
    const bucketStatus = tokenBucket.getDetailedStatus();
    console.log('Token bucket status:', bucketStatus);

    // Check if time-based refill is needed
    const refillOccurred = tokenBucket.checkAndRefill();
    
    if (refillOccurred) {
      console.log('🔄 [Alarm] Token bucket refilled via time-based mechanism');
    } else {
      console.log('ℹ️ [Alarm] Token bucket refill not needed at this time');
    }

    // Emergency refill if bucket has been empty for too long
    const timeSinceLastRefill = Date.now() - bucketStatus.lastRefill;
    const emergencyThreshold = 5 * 60 * 1000; // 5 minutes

    if (bucketStatus.bucket === 0 && timeSinceLastRefill > emergencyThreshold) {
      console.log('🚨 [Alarm] Emergency token bucket refill triggered');
      tokenBucket.forceTimeBasedRefill();
    }
  } catch (error) {
    console.error('Token bucket refill check failed:', error);
  }
}

/**
 * Get the keep-alive alarm
 * @returns Promise resolving to the alarm or undefined if not found
 */
export async function getKeepAliveAlarm(): Promise<
  chrome.alarms.Alarm | undefined
> {
  try {
    return await chrome.alarms.get(KEEPALIVE_ALARM_NAME);
  } catch (error) {
    console.error('Failed to get keep-alive alarm:', error);
    return undefined;
  }
}

/**
 * Clear the keep-alive alarm
 */
export async function clearKeepAlive(): Promise<void> {
  try {
    await chrome.alarms.clear(KEEPALIVE_ALARM_NAME);
    console.log('Keep-alive alarm cleared');
  } catch (error) {
    console.error('Failed to clear keep-alive alarm:', error);
  }
}

/**
 * Handle channel refresh alarm
 * Triggered every 6 hours to refresh channel and subscription data
 */
async function handleChannelRefresh(): Promise<void> {
  console.log('channel-refresh - refreshing channel data');

  try {
    await refreshChannelData();
    console.log('Channel data refreshed successfully');
  } catch (error) {
    console.error('Channel refresh failed:', error);
    await reportError(PBError.Unknown, {
      message: 'Channel data refresh failed',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Check if keep-alive alarm is active
 * @returns Promise resolving to true if alarm exists
 */
export async function isKeepAliveActive(): Promise<boolean> {
  const alarm = await getKeepAliveAlarm();
  return alarm !== undefined;
}
