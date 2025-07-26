/**
 * Token health monitoring for Pushbridge extension
 * Periodically checks token validity and handles revocation
 */

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal, setLocal } from './storage';

const TOKEN_HEALTH_CHECK_INTERVAL_HOURS = 6;
const TOKEN_HEALTH_ALARM_NAME = 'token-health-check';

export interface TokenHealthStatus {
  isValid: boolean;
  lastChecked: number;
  error?: string;
}

/**
 * Initialize the token health monitoring system
 */
export async function initializeTokenHealthMonitor(): Promise<void> {
  try {
    // Create token health check alarm
    await chrome.alarms.create(TOKEN_HEALTH_ALARM_NAME, {
      periodInMinutes: TOKEN_HEALTH_CHECK_INTERVAL_HOURS * 60,
    });

    console.log(
      `Token health monitor initialized with ${TOKEN_HEALTH_CHECK_INTERVAL_HOURS} hour interval`
    );

    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(handleTokenHealthAlarm);

    // Run initial check
    await checkTokenHealth();
  } catch (error) {
    console.error('Failed to initialize token health monitor:', error);
  }
}

/**
 * Handle token health check alarm
 */
function handleTokenHealthAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === TOKEN_HEALTH_ALARM_NAME) {
    checkTokenHealth();
  }
}

/**
 * Check token health by calling Pushbullet API
 */
export async function checkTokenHealth(): Promise<TokenHealthStatus> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      console.log('No token found for health check');
      return {
        isValid: false,
        lastChecked: Date.now(),
        error: 'No token found',
      };
    }

    console.log('Checking token health...');

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

    const status: TokenHealthStatus = {
      isValid: response.ok,
      lastChecked: Date.now(),
    };

    if (response.ok) {
      const userData = await response.json();
      console.log('Token health check passed for user:', userData.name);

      // Store health status
      await setLocal('pb_token_health', status);
    } else if (response.status === 401) {
      console.error('Token health check failed: Token revoked');
      status.error = 'Token revoked';

      // Handle token revocation
      await handleTokenRevocation();
    } else {
      console.error(
        'Token health check failed:',
        response.status,
        response.statusText
      );
      status.error = `API error: ${response.status}`;
    }

    // Store health status
    await setLocal('pb_token_health', status);

    return status;
  } catch (error) {
    console.error('Token health check error:', error);

    const status: TokenHealthStatus = {
      isValid: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    await setLocal('pb_token_health', status);
    return status;
  }
}

/**
 * Handle token revocation
 */
async function handleTokenRevocation(): Promise<void> {
  try {
    console.log('Handling token revocation...');

    // Report the error
    await reportError(PBError.TokenRevoked, {
      message: 'Token has been revoked by Pushbullet',
      code: 401,
    });

    // Clear the token
    await setLocal('pb_token', '');
    await setLocal('pb_device_iden', '');

    // Update badge to show auth error
    await chrome.action.setBadgeText({ text: 'AUTH' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

    // TODO: In M3, this will also:
    // 1. Suspend WebSocket connection
    // 2. Clear operation queue
    // 3. Stop all background operations

    console.log('Token revocation handled');
  } catch (error) {
    console.error('Failed to handle token revocation:', error);
  }
}

/**
 * Get current token health status
 */
export async function getTokenHealthStatus(): Promise<TokenHealthStatus | null> {
  try {
    const status = await getLocal<TokenHealthStatus>('pb_token_health');
    return status || null;
  } catch (error) {
    console.error('Failed to get token health status:', error);
    return null;
  }
}

/**
 * Clear token health status (useful when token is updated)
 */
export async function clearTokenHealthStatus(): Promise<void> {
  try {
    await setLocal('pb_token_health', null);
    console.log('Token health status cleared');
  } catch (error) {
    console.error('Failed to clear token health status:', error);
  }
}

/**
 * Clear the token health check alarm
 */
export async function clearTokenHealthMonitor(): Promise<void> {
  try {
    await chrome.alarms.clear(TOKEN_HEALTH_ALARM_NAME);
    console.log('Token health monitor cleared');
  } catch (error) {
    console.error('Failed to clear token health monitor:', error);
  }
}

/**
 * Force a token health check (for manual testing)
 */
export async function forceTokenHealthCheck(): Promise<TokenHealthStatus> {
  console.log('Forcing token health check...');
  return await checkTokenHealth();
}
