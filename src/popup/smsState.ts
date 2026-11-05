import type { PushbulletDevice } from '../background/deviceManager';
import { getLocal } from '../background/storage';

const DEVICE_CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface CachedSmsState {
  device: PushbulletDevice | null;
  /** True when the cached device list is missing or older than a day. */
  isStale: boolean;
}

/**
 * Read the SMS device from storage only. The popup draws from this so that first
 * paint never waits on the network, the worker, or the rate limiter.
 */
export async function getCachedSmsState(): Promise<CachedSmsState> {
  const [cache, storedIden] = await Promise.all([
    getLocal<{ devices?: PushbulletDevice[]; lastFetched?: number }>(
      'pb_device_cache'
    ),
    getLocal<string>('defaultSmsDevice'),
  ]);

  const smsDevices = (cache?.devices ?? [])
    .filter(device => device.has_sms === true && device.active)
    .sort((a, b) => (a.nickname ?? '').localeCompare(b.nickname ?? ''));

  return {
    device:
      smsDevices.find(device => device.iden === storedIden) ??
      smsDevices[0] ??
      null,
    isStale:
      !cache?.lastFetched ||
      Date.now() - cache.lastFetched >= DEVICE_CACHE_DURATION,
  };
}
