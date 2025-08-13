/**
 * Device manager for Pushbridge extension
 * Handles Chrome device registration and management with Pushbullet
 */

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { clearSmsCache, syncSmsHistoryFromApi } from './smsBridge';
import { getLocal, setLocal } from './storage';

export interface PushbulletDevice {
  iden: string;
  nickname: string;
  type: string;
  active: boolean;
  created: number;
  modified: number;
  manufacturer?: string;
  model?: string;
  pushable?: boolean;
  has_sms?: boolean;
}

export interface PushbulletUser {
  iden: string;
  name: string;
  email: string;
  created: number;
  modified: number;
}

interface DeviceCache {
  devices: PushbulletDevice[];
  lastFetched: number;
  cursor?: string;
  hasMore: boolean;
}

interface DeviceApiResponse {
  devices: PushbulletDevice[];
  cursor?: string;
}

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Register or get the Chrome device with Pushbullet
 * @returns Promise resolving to the device iden
 */
export async function ensureChromeDevice(): Promise<string> {
  try {
    // Check if we already have a device iden
    const existingIden = await getLocal<string>('pb_device_iden');
    if (existingIden) {
      console.log('Using existing Chrome device:', existingIden);
      return existingIden;
    }

    // Create a new Chrome device
    const deviceIden = await createChromeDevice();
    await setLocal('pb_device_iden', deviceIden);
    console.log('Created new Chrome device:', deviceIden);
    return deviceIden;
  } catch (error) {
    console.error('Failed to ensure Chrome device:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to register Chrome device',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Create a new Chrome device with Pushbullet
 * @returns Promise resolving to the device iden
 */
async function createChromeDevice(): Promise<string> {
  const token = await getLocal<string>('pb_token');
  if (!token) {
    throw new Error('No token available for device creation');
  }

  const deviceData = {
    nickname: `Chrome (Pushbridge ${new Date().toLocaleString()})`,
    type: 'chrome',
    model: 'Chrome Extension',
  };

  const response = await httpClient.fetch(
    'https://api.pushbullet.com/v2/devices',
    {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      await reportError(PBError.TokenRevoked, {
        message: 'Token revoked during device creation',
        code: response.status,
      });
      throw new Error('Token is invalid or revoked');
    }

    const errorText = await response.text();
    console.error('Device creation failed:', response.status, errorText);
    throw new Error(
      `Failed to create device: ${response.status} ${response.statusText}`
    );
  }

  const device: PushbulletDevice = await response.json();
  return device.iden;
}

/**
 * Get all devices from Pushbullet with caching
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to array of devices
 */
export async function getDevices(
  forceRefresh = false
): Promise<PushbulletDevice[]> {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getLocal<DeviceCache>('pb_device_cache');
      if (cached && Date.now() - cached.lastFetched < CACHE_DURATION) {
        console.log('Using cached device list');
        return cached.devices;
      }
    }

    // Fetch fresh data with cursor support
    const devices = await fetchDevicesFromAPI(forceRefresh);

    // Cache the result
    const cache: DeviceCache = {
      devices,
      lastFetched: Date.now(),
      cursor: await getLocal<string>('pb_devices_cursor'),
      hasMore: (await getLocal<boolean>('pb_devices_has_more')) || false,
    };
    await setLocal('pb_device_cache', cache);

    console.log('Device list cached with', devices.length, 'devices');
    return devices;
  } catch (error) {
    // Gracefully handle first-time setup where token isn't available yet
    if (error instanceof Error && error.message.includes('No token available')) {
      const cached = await getLocal<DeviceCache>('pb_device_cache');
      if (cached) {
        console.log('No token available, returning cached device list');
        return cached.devices;
      }
      console.log('No token available, returning empty device list');
      return [];
    }

    console.error('Failed to get devices:', error);

    // Try to return cached data even if expired
    const cached = await getLocal<DeviceCache>('pb_device_cache');
    if (cached) {
      console.log('Returning expired cache due to fetch error');
      return cached.devices;
    }

    throw error;
  }
}

/**
 * Get devices suitable for receiving pushes (excludes Chrome device)
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to array of pushable devices
 */
export async function getPushableDevices(
  forceRefresh = false
): Promise<PushbulletDevice[]> {
  const allDevices = await getDevices(forceRefresh);
  const chromeDeviceIden = await getLocal<string>('pb_device_iden');

  return allDevices
    .filter(
      device =>
        device.active &&
        device.pushable !== false &&
        device.iden !== chromeDeviceIden
    )
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
}

/**
 * Fetch devices directly from Pushbullet API with cursor support
 * @param forceRefresh - Whether to force refresh (ignore stored cursor)
 * @returns Promise resolving to array of devices
 */
async function fetchDevicesFromAPI(
  forceRefresh = false
): Promise<PushbulletDevice[]> {
  const token = await getLocal<string>('pb_token');
  if (!token) {
    console.log('No token available, skipping device fetch and returning empty list');
    return [];
  }

  // Get stored cursor for pagination (unless force refresh)
  let cursor: string | undefined;
  if (!forceRefresh) {
    cursor = await getLocal<string>('pb_devices_cursor');
  }

  // Build query parameters
  const params = new URLSearchParams();
  if (cursor) {
    params.append('cursor', cursor);
  }

  const url = cursor
    ? `https://api.pushbullet.com/v2/devices?${params}`
    : 'https://api.pushbullet.com/v2/devices';

  const response = await httpClient.fetch(url, {
    method: 'GET',
    headers: {
      'Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await reportError(PBError.TokenRevoked, {
        message: 'Token revoked while fetching devices',
        code: response.status,
      });
      throw new Error('Token is invalid or revoked');
    }
    throw new Error(
      `Failed to fetch devices: ${response.status} ${response.statusText}`
    );
  }

  const data: DeviceApiResponse = await response.json();

  // Store cursor for next pagination
  if (data.cursor) {
    await setLocal('pb_devices_cursor', data.cursor);
    await setLocal('pb_devices_has_more', true);
  } else {
    // Clear cursor if no more data
    await setLocal('pb_devices_cursor', null);
    await setLocal('pb_devices_has_more', false);
  }

  return data.devices || [];
}

/**
 * Clear the device cache and cursors
 */
export async function clearDeviceCache(): Promise<void> {
  await setLocal('pb_device_cache', null);
  await setLocal('pb_devices_cursor', null);
  await setLocal('pb_devices_has_more', null);
  console.log('Device cache and cursors cleared');
}

/**
 * Activate a device if it's inactive
 * @param deviceIden - The device iden to activate
 */
export async function activateDevice(deviceIden: string): Promise<void> {
  const token = await getLocal<string>('pb_token');
  if (!token) {
    console.log('[DeviceManager] No token available, skipping device activation');
    return;
  }

  const response = await httpClient.fetch(
    `https://api.pushbullet.com/v2/devices/${deviceIden}`,
    {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active: true }),
    }
  );

  if (!response.ok) {
    console.error(
      'Failed to activate device:',
      response.status,
      response.statusText
    );
    throw new Error(
      `Failed to activate device: ${response.status} ${response.statusText}`
    );
  }

  console.log('Device activated:', deviceIden);
}

/**
 * Get SMS-capable devices
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to array of SMS-capable devices
 */
export async function getSmsCapableDevices(
  forceRefresh = false
): Promise<PushbulletDevice[]> {
  console.log(
    '[DeviceManager] Getting SMS-capable devices, forceRefresh:',
    forceRefresh
  );
  const allDevices = await getDevices(forceRefresh);
  console.log('[DeviceManager] Total devices:', allDevices.length);

  // Log all devices with their SMS properties
  console.log(
    '[DeviceManager] All devices with SMS info:',
    allDevices.map(d => ({
      iden: d.iden,
      nickname: d.nickname,
      has_sms: d.has_sms,
      active: d.active,
      created: d.created,
      type: d.type,
    }))
  );

  const smsDevices = allDevices
    .filter(device => device.has_sms === true && device.active)
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  console.log(
    '[DeviceManager] SMS-capable devices:',
    smsDevices.map(d => ({
      iden: d.iden,
      nickname: d.nickname,
      has_sms: d.has_sms,
      active: d.active,
    }))
  );

  return smsDevices;
}

/**
 * Get the default SMS device (first SMS-capable device)
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to the default SMS device or null
 */
export async function getDefaultSmsDevice(
  forceRefresh = false
): Promise<PushbulletDevice | null> {
  try {
    console.log(
      '[DeviceManager] Getting default SMS device, forceRefresh:',
      forceRefresh
    );

    // Check if we have a stored default SMS device
    const storedIden = await getLocal<string>('defaultSmsDevice');
    console.log('[DeviceManager] Stored default SMS device ID:', storedIden);

    if (storedIden && !forceRefresh) {
      const devices = await getDevices();
      console.log('[DeviceManager] Found', devices.length, 'total devices');

      // Log all devices to see what we have
      console.log(
        '[DeviceManager] All devices:',
        devices.map(d => ({
          iden: d.iden,
          nickname: d.nickname,
          has_sms: d.has_sms,
          active: d.active,
          type: d.type,
        }))
      );

      const device = devices.find(
        d => d.iden === storedIden && d.has_sms === true
      );
      if (device) {
        console.log(
          '[DeviceManager] Using stored default SMS device:',
          device.nickname
        );
        return device;
      } else {
        console.log(
          '[DeviceManager] Stored device not found or not SMS-capable'
        );

        // Check if device exists but doesn't meet criteria
        const deviceExists = devices.find(d => d.iden === storedIden);
        if (deviceExists) {
          console.log('[DeviceManager] Device exists but criteria not met:', {
            iden: deviceExists.iden,
            nickname: deviceExists.nickname,
            has_sms: deviceExists.has_sms,
            active: deviceExists.active,
          });
        } else {
          console.log(
            '[DeviceManager] Device with ID',
            storedIden,
            'not found in device list'
          );
        }
      }
    }

    // Find the first SMS-capable device
    console.log('[DeviceManager] Looking for SMS-capable devices...');
    const smsDevices = await getSmsCapableDevices(forceRefresh);
    console.log(
      '[DeviceManager] Found',
      smsDevices.length,
      'SMS-capable devices'
    );

    if (smsDevices.length > 0) {
      const defaultDevice = smsDevices[0];
      await setLocal('defaultSmsDevice', defaultDevice.iden);
      console.log(
        '[DeviceManager] Set default SMS device:',
        defaultDevice.nickname
      );
      return defaultDevice;
    }

    // Clear stored default if no SMS devices found
    console.log('[DeviceManager] No SMS-capable devices found');
    await setLocal('defaultSmsDevice', null);
    return null;
  } catch (error) {
    console.error('[DeviceManager] Failed to get default SMS device:', error);
    return null;
  }
}

/**
 * Check if user has any SMS-capable devices
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to true if user has SMS-capable devices
 */
export async function hasSmsCapableDevices(
  forceRefresh = false
): Promise<boolean> {
  try {
    const smsDevices = await getSmsCapableDevices(forceRefresh);
    return smsDevices.length > 0;
  } catch (error) {
    console.error('Failed to check SMS devices:', error);
    return false;
  }
}

/**
 * Check if our Chrome device exists and is active
 * @returns Promise resolving to true if device exists and is active
 */
export async function checkChromeDevice(): Promise<boolean> {
  try {
    const deviceIden = await getLocal<string>('pb_device_iden');
    if (!deviceIden) {
      return false;
    }

    const devices = await getDevices();
    const chromeDevice = devices.find(device => device.iden === deviceIden);

    if (!chromeDevice) {
      console.log('Chrome device not found, will recreate');
      await setLocal('pb_device_iden', ''); // Clear invalid iden
      return false;
    }

    if (!chromeDevice.active) {
      console.log('Chrome device is inactive, activating...');
      await activateDevice(deviceIden);
    }

    return true;
  } catch (error) {
    console.error('Failed to check Chrome device:', error);
    return false;
  }
}

/**
 * Handle default SMS device change
 */
export async function handleDefaultSmsDeviceChange(
  newDeviceIden: string
): Promise<void> {
  try {
    console.log(
      `[DeviceManager] Handling default SMS device change to: ${newDeviceIden}`
    );

    // Get the new device
    const devices = await getDevices();
    const newDevice = devices.find(d => d.iden === newDeviceIden);

    if (!newDevice) {
      console.error(`[DeviceManager] New device ${newDeviceIden} not found`);
      return;
    }

    if (!newDevice.has_sms) {
      console.error(
        `[DeviceManager] New device ${newDeviceIden} is not SMS-capable`
      );
      return;
    }

    // Clear existing SMS cache
    await clearSmsCache();

    // Load SMS data for new device
    await syncSmsHistoryFromApi(newDeviceIden);

    // Update stored default device
    await setLocal('defaultSmsDevice', newDeviceIden);

    console.log(
      `[DeviceManager] Successfully switched to SMS device: ${newDevice.nickname}`
    );
  } catch (error) {
    console.error(
      '[DeviceManager] Failed to handle default SMS device change:',
      error
    );
    await reportError(PBError.Unknown, {
      message: 'Failed to handle default SMS device change',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Set default SMS device
 */
export async function setDefaultSmsDevice(
  deviceIden: string
): Promise<boolean> {
  try {
    console.log(`[DeviceManager] Setting default SMS device to: ${deviceIden}`);

    // Verify device exists and has SMS capability
    const devices = await getDevices();
    const device = devices.find(d => d.iden === deviceIden);

    if (!device) {
      console.error(`[DeviceManager] Device ${deviceIden} not found`);
      return false;
    }

    if (!device.has_sms) {
      console.error(`[DeviceManager] Device ${deviceIden} is not SMS-capable`);
      return false;
    }

    // Handle device change
    await handleDefaultSmsDeviceChange(deviceIden);

    return true;
  } catch (error) {
    console.error('[DeviceManager] Failed to set default SMS device:', error);
    return false;
  }
}
