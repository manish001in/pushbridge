/**
 * Channel Manager - Handles Pushbullet channel subscriptions
 * Implements M6-01: Fetch & Cache Channel Subscriptions
 */

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal, setLocal } from './storage';

// Types for channel subscriptions
export interface ChannelSubscription {
  iden: string;
  created: number;
  modified: number;
  active: boolean;
  channel: {
    iden: string;
    tag: string;
    name: string;
    description: string;
    image_url?: string;
  };
}

// New interface for owned channels
export interface OwnedChannel {
  active: boolean;
  iden: string;
  created: number;
  modified: number;
  tag: string;
  name: string;
}

// API response interface
export interface ApiResponse {
  channels: OwnedChannel[];
  subscriptions: ChannelSubscription[];
}

export interface ChannelInfo {
  iden: string;
  tag: string;
  name: string;
  description: string;
  image_url?: string;
}

export interface SubscriptionsResponse {
  subscriptions: ChannelSubscription[];
  cursor?: string;
}

export interface ChannelsResponse {
  channels: OwnedChannel[];
  cursor?: string;
}

// Cache for channel subscriptions and owned channels
let subscriptionsCache: ChannelSubscription[] | null = null;
let ownedChannelsCache: OwnedChannel[] | null = null;
let lastSubscriptionsFetchTime: number = 0;
let lastOwnedChannelsFetchTime: number = 0;
const CACHE_EXPIRY_HOURS = 6;
const CACHE_DURATION = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Fetch channel subscriptions from Pushbullet API with cursor support
 * Calls GET /v2/subscriptions and caches the result
 * @param forceRefresh - Whether to force refresh (ignore stored cursor)
 */
export async function fetchSubscriptions(forceRefresh = false): Promise<ChannelSubscription[]> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No access token available');
    }

    // Get stored cursor for pagination (unless force refresh)
    let cursor: string | undefined;
    if (!forceRefresh) {
      cursor = await getLocal<string>('pb_subscriptions_cursor');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = cursor 
      ? `https://api.pushbullet.com/v2/subscriptions?${params}`
      : 'https://api.pushbullet.com/v2/subscriptions';

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
          message: 'Token revoked during channel fetch',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch subscriptions: ${response.status} ${response.statusText}`
      );
    }

    const data: SubscriptionsResponse = await response.json();

    // Store cursor for next pagination
    if (data.cursor) {
      await setLocal('pb_subscriptions_cursor', data.cursor);
      await setLocal('pb_subscriptions_has_more', true);
    } else {
      // Clear cursor if no more data
      await setLocal('pb_subscriptions_cursor', null);
      await setLocal('pb_subscriptions_has_more', false);
    }

    // Cache the subscriptions
    await cacheSubscriptions(data.subscriptions);

    // Emit runtime message for UI updates
    chrome.runtime
      .sendMessage({
        type: 'pb:subsUpdated',
        payload: { subscriptions: data.subscriptions },
      })
      .catch(() => {
        // Ignore errors if no listeners
      });

    return data.subscriptions;
  } catch (error) {
    console.error('Failed to fetch channel subscriptions:', error);
    await reportError(PBError.Unknown, {
      message: `Failed to fetch channel subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

/**
 * Fetch owned channels from Pushbullet API with cursor support
 * Calls GET /v2/channels and caches the result
 * @param forceRefresh - Whether to force refresh (ignore stored cursor)
 */
async function fetchOwnedChannels(forceRefresh = false): Promise<OwnedChannel[]> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No access token available');
    }

    // Get stored cursor for pagination (unless force refresh)
    let cursor: string | undefined;
    if (!forceRefresh) {
      cursor = await getLocal<string>('pb_channels_cursor');
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('active_only', 'true');
    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = cursor 
      ? `https://api.pushbullet.com/v2/channels?${params}`
      : 'https://api.pushbullet.com/v2/channels?active_only=true';

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
          message: 'Token revoked during owned channels fetch',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch owned channels: ${response.status} ${response.statusText}`
      );
    }

    const data: ChannelsResponse = await response.json();

    // Store cursor for next pagination
    if (data.cursor) {
      await setLocal('pb_channels_cursor', data.cursor);
      await setLocal('pb_channels_has_more', true);
    } else {
      // Clear cursor if no more data
      await setLocal('pb_channels_cursor', null);
      await setLocal('pb_channels_has_more', false);
    }

    // Cache the owned channels
    await cacheOwnedChannels(data.channels);

    // Emit runtime message for UI updates
    chrome.runtime
      .sendMessage({
        type: 'pb:ownedChannelsUpdated',
        payload: { channels: data.channels },
      })
      .catch(() => {
        // Ignore errors if no listeners
      });

    return data.channels;
  } catch (error) {
    console.error('Failed to fetch owned channels:', error);
    await reportError(PBError.Unknown, {
      message: `Failed to fetch owned channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

/**
 * Get cached subscriptions or fetch from API if cache is stale
 */
export async function getSubscriptions(
  forceRefresh: boolean = false
): Promise<ChannelSubscription[]> {
  const now = Date.now();

  // Return cached data if available and not stale
  if (
    !forceRefresh &&
    subscriptionsCache &&
    now - lastSubscriptionsFetchTime < CACHE_DURATION
  ) {
    return subscriptionsCache;
  }

  // Fetch fresh data from API with cursor support
  const subscriptions = await fetchSubscriptions(forceRefresh);
  return subscriptions;
}

/**
 * Get owned channels (cached or fresh)
 */
export async function getOwnedChannels(
  forceRefresh: boolean = false
): Promise<OwnedChannel[]> {
  const now = Date.now();

  // Return cached data if available and not stale
  if (
    !forceRefresh &&
    ownedChannelsCache &&
    now - lastOwnedChannelsFetchTime < CACHE_DURATION
  ) {
    return ownedChannelsCache;
  }

  // Fetch fresh data from API with cursor support
  const channels = await fetchOwnedChannels(forceRefresh);
  return channels;
}

/**
 * Cache subscriptions in memory and local storage
 */
async function cacheSubscriptions(
  subscriptions: ChannelSubscription[]
): Promise<void> {
  // Update memory cache
  subscriptionsCache = subscriptions;
  lastSubscriptionsFetchTime = Date.now();

  // Store in local storage for persistence
  await setLocal('pb_channel_subs', {
    subscriptions,
    lastFetched: lastSubscriptionsFetchTime,
  });
}

/**
 * Cache owned channels in memory and local storage
 */
async function cacheOwnedChannels(channels: OwnedChannel[]): Promise<void> {
  // Update memory cache
  ownedChannelsCache = channels;
  lastOwnedChannelsFetchTime = Date.now();

  // Store in local storage for persistence
  await setLocal('pb_owned_channels', {
    channels,
    lastFetched: lastOwnedChannelsFetchTime,
  });
}

/**
 * Refresh both channel data types (subscriptions and owned channels)
 */
export async function refreshChannelData(): Promise<void> {
  try {
    console.log(
      'Refreshing channel data (subscriptions and owned channels)...'
    );

    // Fetch both data types in parallel
    await Promise.all([fetchSubscriptions(), fetchOwnedChannels()]);

    console.log('Channel data refresh completed');
  } catch (error) {
    console.error('Failed to refresh channel data:', error);
    await reportError(PBError.Unknown, {
      message: `Failed to refresh channel data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

/**
 * Load cached subscriptions from storage on startup
 */
export async function loadCachedSubscriptions(): Promise<
  ChannelSubscription[]
> {
  try {
    const cached = await getLocal<{
      subscriptions: ChannelSubscription[];
      lastFetched: number;
    }>('pb_channel_subs');

    if (cached && cached.subscriptions) {
      subscriptionsCache = cached.subscriptions;
      lastSubscriptionsFetchTime = cached.lastFetched;
      return cached.subscriptions;
    }
  } catch (error) {
    console.error('Failed to load cached subscriptions:', error);
  }

  return [];
}

/**
 * Load cached owned channels from storage on startup
 */
export async function loadCachedOwnedChannels(): Promise<OwnedChannel[]> {
  try {
    const cached = await getLocal<{
      channels: OwnedChannel[];
      lastFetched: number;
    }>('pb_owned_channels');

    if (cached && cached.channels) {
      ownedChannelsCache = cached.channels;
      lastOwnedChannelsFetchTime = cached.lastFetched;
      return cached.channels;
    }
  } catch (error) {
    console.error('Failed to load cached owned channels:', error);
  }

  return [];
}

/**
 * Get a specific subscription by channel tag
 */
export async function getSubscriptionByTag(
  channelTag: string
): Promise<ChannelSubscription | undefined> {
  const subscriptions = await getSubscriptions();
  return subscriptions.find(sub => sub.channel.tag === channelTag);
}

/**
 * Get a specific subscription by subscription iden
 */
export async function getSubscriptionById(
  subscriptionIden: string
): Promise<ChannelSubscription | undefined> {
  const subscriptions = await getSubscriptions();
  return subscriptions.find(sub => sub.iden === subscriptionIden);
}

/**
 * Check if user is subscribed to a specific channel
 */
export async function isSubscribedToChannel(
  channelTag: string
): Promise<boolean> {
  const subscription = await getSubscriptionByTag(channelTag);
  return subscription?.active === true;
}

/**
 * Get all active subscriptions
 */
export async function getActiveSubscriptions(): Promise<ChannelSubscription[]> {
  const subscriptions = await getSubscriptions();
  return subscriptions.filter(sub => sub.active);
}

/**
 * Clear the subscriptions cache
 */
export async function clearSubscriptionsCache(): Promise<void> {
  subscriptionsCache = null;
  lastSubscriptionsFetchTime = 0;
  await setLocal('pb_channel_subs', null);
  await setLocal('pb_subscriptions_cursor', null);
  await setLocal('pb_subscriptions_has_more', null);
}

/**
 * Clear the owned channels cache
 */
export async function clearOwnedChannelsCache(): Promise<void> {
  ownedChannelsCache = null;
  lastOwnedChannelsFetchTime = 0;
  await setLocal('pb_owned_channels', null);
  await setLocal('pb_channels_cursor', null);
  await setLocal('pb_channels_has_more', null);
}

/**
 * Clear all channel caches
 */
export async function clearAllChannelCaches(): Promise<void> {
  await Promise.all([clearSubscriptionsCache(), clearOwnedChannelsCache()]);
}

/**
 * Initialize channel manager
 */
export async function initializeChannelManager(): Promise<void> {
  try {
    // Load cached data on startup
    await Promise.all([loadCachedSubscriptions(), loadCachedOwnedChannels()]);
    console.log('Channel manager initialized');
  } catch (error) {
    console.error('Failed to initialize channel manager:', error);
  }
}

/**
 * Get subscription posts (recent pushes from subscribed channels)
 */
export async function getSubscriptionPosts(limit: number = 50): Promise<any[]> {
  try {
    // Import here to avoid circular dependency
    const { getPushHistory } = await import('./pushManager');

    const [pushes, subscriptions] = await Promise.all([
      getPushHistory(limit * 2), // Fetch more to account for filtering
      getSubscriptions()
    ]);

    // Filter out subscriptions with missing channel data and create set of channel idens
    const subscribedChannelIdens = new Set(
      subscriptions
        .filter(sub => sub.channel && sub.channel.iden) // Only include subscriptions with valid channel data
        .map(sub => sub.channel.iden)
    );
    
    // Filter pushes by channel_iden to only show pushes from subscribed channels
    return pushes.pushes
      .filter(push => push.channel_iden && subscribedChannelIdens.has(push.channel_iden))
      .sort((a, b) => b.created - a.created) // Latest first
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get subscription posts:', error);
    await reportError(PBError.Unknown, {
      message: `Failed to get subscription posts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

/**
 * Check if user owns a specific channel
 * @param channelTag - The channel tag to check
 * @returns Promise resolving to true if user owns the channel
 */
export async function isChannelOwner(channelTag: string): Promise<boolean> {
  try {
    const subscription = await getSubscriptionByTag(channelTag);
    // If user is subscribed and the subscription is active, they might be the owner
    // The actual ownership verification happens when attempting to broadcast
    return subscription?.active === true;
  } catch (error) {
    console.error('Failed to check channel ownership:', error);
    return false;
  }
}
