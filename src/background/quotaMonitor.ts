/**
 * Storage quota monitor for Pushbridge extension
 * Monitors storage usage and purges old data when quota is exceeded
 */

import { reportError, PBError } from './errorManager';
import { getLocalBytesInUse, getLocal, setLocal, removeLocal } from './storage';

const QUOTA_LIMIT_BYTES = 4 * 1024 * 1024; // 4 MB (MV3 limit ≈ 5 MB)
const QUOTA_CHECK_INTERVAL_HOURS = 12;
const QUOTA_ALARM_NAME = 'quota-check';

// Storage keys for different data types
const PUSH_HISTORY_KEY = 'pb_push_history';
const TRANSFERS_KEY = 'pb_transfers';
const SETTINGS_KEY = 'pb_settings';

export interface PushHistoryEntry {
  id: string;
  timestamp: number;
  type: string;
  title?: string;
  body?: string;
  url?: string;
}

export interface TransferEntry {
  id: string;
  timestamp: number;
  filename: string;
  size: number;
  status: 'completed' | 'failed' | 'pending';
}

/**
 * Initialize the quota monitoring system
 */
export async function initializeQuotaMonitor(): Promise<void> {
  try {
    // Create quota check alarm
    await chrome.alarms.create(QUOTA_ALARM_NAME, {
      periodInMinutes: QUOTA_CHECK_INTERVAL_HOURS * 60,
    });

    console.log(
      `Quota monitor initialized with ${QUOTA_CHECK_INTERVAL_HOURS} hour interval`
    );

    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(handleQuotaAlarm);

    // Run initial check
    await checkQuota();
  } catch (error) {
    console.error('Failed to initialize quota monitor:', error);
  }
}

/**
 * Handle quota check alarm
 */
function handleQuotaAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === QUOTA_ALARM_NAME) {
    checkQuota();
  }
}

/**
 * Check storage quota and purge if necessary
 */
export async function checkQuota(): Promise<void> {
  try {
    const bytesUsed = await getLocalBytesInUse();
    console.log(`Storage quota check: ${bytesUsed} bytes used`);

    if (bytesUsed > QUOTA_LIMIT_BYTES) {
      console.log('Storage quota exceeded, purging old data...');
      await purgeOldData();

      // Report quota exceeded
      await reportError(PBError.QuotaExceeded, {
        message: `Storage quota exceeded (${Math.round((bytesUsed / 1024 / 1024) * 100) / 100} MB used)`,
        code: bytesUsed,
      });
    }
  } catch (error) {
    console.error('Failed to check quota:', error);
  }
}

/**
 * Purge old data to free up storage space
 */
async function purgeOldData(): Promise<void> {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let purgedCount = 0;

  try {
    // Purge old push history entries (> 90 days)
    const pushHistory =
      (await getLocal<PushHistoryEntry[]>(PUSH_HISTORY_KEY)) || [];
    const filteredPushHistory = pushHistory.filter(
      entry => entry.timestamp > ninetyDaysAgo
    );

    if (filteredPushHistory.length < pushHistory.length) {
      await setLocal(PUSH_HISTORY_KEY, filteredPushHistory);
      purgedCount += pushHistory.length - filteredPushHistory.length;
      console.log(
        `Purged ${pushHistory.length - filteredPushHistory.length} old push history entries`
      );
    }

    // Purge old transfers (> 30 days)
    const transfers = (await getLocal<TransferEntry[]>(TRANSFERS_KEY)) || [];
    const filteredTransfers = transfers.filter(
      entry => entry.timestamp > thirtyDaysAgo
    );

    if (filteredTransfers.length < transfers.length) {
      await setLocal(TRANSFERS_KEY, filteredTransfers);
      purgedCount += transfers.length - filteredTransfers.length;
      console.log(
        `Purged ${transfers.length - filteredTransfers.length} old transfer entries`
      );
    }

    // Purge old notification mappings (if they exist)
    const allKeys = await getAllStorageKeys();
    const notificationKeys = allKeys.filter(key => key.startsWith('mirror_'));

    for (const key of notificationKeys) {
      const entry = await getLocal<any>(key);
      if (entry && entry.timestamp && entry.timestamp < thirtyDaysAgo) {
        await removeLocal(key);
        purgedCount++;
      }
    }

    console.log(`Quota purge completed: ${purgedCount} items removed`);
  } catch (error) {
    console.error('Failed to purge old data:', error);
    throw error;
  }
}

/**
 * Get all storage keys (helper function)
 * Note: This is a simplified implementation since chrome.storage.local doesn't have a keys() method
 */
async function getAllStorageKeys(): Promise<string[]> {
  // For now, we'll return known keys
  // In a real implementation, you might want to maintain a separate key index
  return [
    PUSH_HISTORY_KEY,
    TRANSFERS_KEY,
    SETTINGS_KEY,
    'pb_token',
    'pb_device_iden',
    'pb_last_modified',
  ];
}

/**
 * Get current storage usage in a human-readable format
 */
export async function getStorageUsage(): Promise<{
  bytes: number;
  megabytes: number;
  percentage: number;
}> {
  const bytes = await getLocalBytesInUse();
  const megabytes = bytes / 1024 / 1024;
  const percentage = (bytes / QUOTA_LIMIT_BYTES) * 100;

  return { bytes, megabytes, percentage };
}

/**
 * Clear the quota check alarm
 */
export async function clearQuotaMonitor(): Promise<void> {
  try {
    await chrome.alarms.clear(QUOTA_ALARM_NAME);
    console.log('Quota monitor cleared');
  } catch (error) {
    console.error('Failed to clear quota monitor:', error);
  }
}
