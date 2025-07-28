/**
 * Context Manager for Pushbridge Extension
 * Manages user's channels, subscriptions, and devices context
 * Refreshes on popup open and when encountering unknown push sources
 */

import {
  UserContext,
  SubscriptionsApiResponse,
  ChannelsApiResponse,
  DevicesApiResponse,
  SubscriptionApiResponse,
  OwnedChannelApiResponse,
  DeviceApiResponse,
  ContextRefreshTrigger,
  PushbulletContact,
  ContactsApiResponse,
} from '../types/api-interfaces';

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal, setLocal } from './storage';

const CONTEXT_STORAGE_KEY = 'user_context';
const CONTEXT_REFRESH_TRIGGERS_KEY = 'context_refresh_triggers';

export class ContextManager {
  private static instance: ContextManager;
  private context: UserContext | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Get the current user context, refreshing if needed
   */
  async getContext(trigger: ContextRefreshTrigger): Promise<UserContext> {
    // Always refresh on popup open
    if (trigger.type === 'popup_open') {
      await this.refreshContext(trigger);
    } else {
      // For other triggers, check if context exists and is valid
      if (!this.context || !this.context.is_valid) {
        await this.refreshContext(trigger);
      }
    }

    if (!this.context) {
      throw new Error('Failed to load user context');
    }

    return this.context;
  }

  /**
   * Check if a push source is known in the current context
   */
  async isKnownSource(
    sourceDeviceIden?: string,
    channelIden?: string
  ): Promise<boolean> {
    if (!this.context) {
      return false;
    }

    // Check if it's from a known device
    if (sourceDeviceIden && this.context.devices.has(sourceDeviceIden)) {
      return true;
    }

    // Check if it's from a subscribed channel
    if (channelIden) {
      for (const subscription of this.context.subscriptions.values()) {
        if (subscription.channel.iden === channelIden) {
          return true;
        }
      }
    }

    // Check if it's from an owned channel
    if (channelIden && this.context.owned_channels.has(channelIden)) {
      return true;
    }

    return false;
  }

  /**
   * Handle unknown push source by refreshing context
   */
  async handleUnknownSource(
    sourceDeviceIden?: string,
    channelIden?: string
  ): Promise<void> {
    const trigger: ContextRefreshTrigger = {
      type: 'unknown_source',
      timestamp: Date.now(),
      reason: `Unknown source: device=${sourceDeviceIden}, channel=${channelIden}`,
    };

    await this.refreshContext(trigger);
  }

  /**
   * Refresh the user context by fetching latest data
   */
  async refreshContext(trigger: ContextRefreshTrigger): Promise<void> {
    // Prevent multiple simultaneous refreshes
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh(trigger);

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual context refresh
   */
  private async performRefresh(trigger: ContextRefreshTrigger): Promise<void> {
    try {
      const token = await getLocal<string>('pb_token');
      if (!token) {
        throw new Error('No token available');
      }

      const currentDeviceIden = await getLocal<string>('pb_device_iden');
      if (!currentDeviceIden) {
        throw new Error('Current device not registered');
      }

      // Fetch all context data in parallel
      const [subscriptions, channels, devices, contacts] = await Promise.all([
        this.fetchSubscriptions(token),
        this.fetchChannels(token),
        this.fetchDevices(token),
        this.fetchContacts(token),
      ]);

      // Build context maps
      const ownedChannelsMap = new Map<string, OwnedChannelApiResponse>();
      const subscriptionsMap = new Map<string, SubscriptionApiResponse>();
      const devicesMap = new Map<string, DeviceApiResponse>();
      const contactsMap = new Map<string, PushbulletContact>();

      // Populate owned channels map
      if (channels.channels && Array.isArray(channels.channels)) {
        channels.channels.forEach(channel => {
          // Skip channels with missing iden
          if (channel && channel.iden) {
            ownedChannelsMap.set(channel.iden, channel);
          } else {
            console.warn('Skipping channel with missing iden:', channel);
          }
        });
      }

      // Populate subscriptions map - store by channel ID for easy lookup
      if (
        subscriptions.subscriptions &&
        Array.isArray(subscriptions.subscriptions)
      ) {
        subscriptions.subscriptions.forEach(subscription => {
          // Skip subscriptions with missing channel data
          if (subscription.channel && subscription.channel.iden) {
            subscriptionsMap.set(subscription.channel.iden, subscription);
          } else {
            console.warn(
              'Skipping subscription with missing channel data:',
              subscription
            );
          }
        });
      }

      // Populate devices map
      if (devices.devices && Array.isArray(devices.devices)) {
        devices.devices.forEach(device => {
          // Skip devices with missing iden
          if (device && device.iden) {
            devicesMap.set(device.iden, device);
          } else {
            console.warn('Skipping device with missing iden:', device);
          }
        });
      }

      // Populate contacts map
      if (contacts && Array.isArray(contacts)) {
        contacts.forEach(contact => {
          // Skip contacts with missing iden
          if (contact && contact.iden) {
            contactsMap.set(contact.iden, contact);
          } else {
            console.warn('Skipping contact with missing iden:', contact);
          }
        });
      }

      // Create new context
      this.context = {
        current_device_iden: currentDeviceIden,
        owned_channels: ownedChannelsMap,
        subscriptions: subscriptionsMap,
        devices: devicesMap,
        contacts: contactsMap,
        last_refreshed: Date.now(),
        is_valid: true,
      };

      // Save to storage
      await this.saveContext();
      await this.saveRefreshTrigger(trigger);

      console.log('Context refreshed successfully', {
        ownedChannels: ownedChannelsMap.size,
        subscriptions: subscriptionsMap.size,
        devices: devicesMap.size,
        contacts: contactsMap.size,
        trigger: trigger.type,
      });
    } catch (error) {
      console.error('Failed to refresh context:', error);

      // Mark context as invalid
      if (this.context) {
        this.context.is_valid = false;
        await this.saveContext();
      }

      await reportError(PBError.Unknown, {
        message: 'Failed to refresh user context',
        code: error instanceof Error ? undefined : 500,
      });

      throw error;
    }
  }

  /**
   * Fetch user's channel subscriptions
   */
  private async fetchSubscriptions(
    token: string
  ): Promise<SubscriptionsApiResponse> {
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/subscriptions',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while fetching subscriptions',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch subscriptions: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from subscriptions API');
    }

    // Ensure subscriptions array exists
    if (!data.subscriptions || !Array.isArray(data.subscriptions)) {
      console.warn(
        'Subscriptions API returned unexpected format, using empty array'
      );
      data.subscriptions = [];
    }

    return data;
  }

  /**
   * Fetch user's owned channels
   */
  private async fetchChannels(token: string): Promise<ChannelsApiResponse> {
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/channels?limit=500&active_only=true',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while fetching channels',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch channels: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from channels API');
    }

    // Ensure channels array exists
    if (!data.channels || !Array.isArray(data.channels)) {
      console.warn(
        'Channels API returned unexpected format, using empty array'
      );
      data.channels = [];
    }

    return data;
  }

  /**
   * Fetch user's devices
   */
  private async fetchDevices(token: string): Promise<DevicesApiResponse> {
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/devices',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

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

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from devices API');
    }

    // Ensure devices array exists
    if (!data.devices || !Array.isArray(data.devices)) {
      console.warn('Devices API returned unexpected format, using empty array');
      data.devices = [];
    }

    return data;
  }

  /**
   * Fetch user's contacts
   */
  private async fetchContacts(token: string): Promise<PushbulletContact[]> {
    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/chats',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while fetching contacts',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch contacts: ${response.status} ${response.statusText}`
      );
    }

    const data: ContactsApiResponse = await response.json();

    // Transform chats data into contacts
    const contacts: PushbulletContact[] = [];
    
    if (data.chats && Array.isArray(data.chats)) {
      for (const chat of data.chats) {
        // Only process active chats with valid contact info
        if (chat.active && chat.with && chat.with.type === 'user') {
          const contact: PushbulletContact = {
            iden: chat.with.iden,
            name: chat.with.name,
            email: chat.with.email,
            email_normalized: chat.with.email_normalized,
            image_url: chat.with.image_url,
            active: chat.active,
            created: chat.created,
            modified: chat.modified,
          };
          contacts.push(contact);
        }
      }
    }

    return contacts;
  }

  /**
   * Save context to storage
   */
  private async saveContext(): Promise<void> {
    if (this.context) {
      // Convert Maps to arrays for storage
      const contextForStorage = {
        ...this.context,
        owned_channels: Array.from(this.context.owned_channels.entries()),
        subscriptions: Array.from(this.context.subscriptions.entries()),
        devices: Array.from(this.context.devices.entries()),
      };

      await setLocal(CONTEXT_STORAGE_KEY, contextForStorage);
    }
  }

  /**
   * Load context from storage
   */
  async loadContext(): Promise<void> {
    try {
      const storedContext = await getLocal<any>(CONTEXT_STORAGE_KEY);
      if (storedContext) {
        // Convert arrays back to Maps
        this.context = {
          ...storedContext,
          owned_channels: new Map(storedContext.owned_channels || []),
          subscriptions: new Map(storedContext.subscriptions || []),
          devices: new Map(storedContext.devices || []),
        };
      }
    } catch (error) {
      console.error('Failed to load context from storage:', error);
      this.context = null;
    }
  }

  /**
   * Save refresh trigger for debugging
   */
  private async saveRefreshTrigger(
    trigger: ContextRefreshTrigger
  ): Promise<void> {
    try {
      const storedTriggers = await getLocal<ContextRefreshTrigger[]>(
        CONTEXT_REFRESH_TRIGGERS_KEY
      );
      const triggers = Array.isArray(storedTriggers) ? storedTriggers : [];
      triggers.push(trigger);

      // Keep only last 10 triggers
      if (triggers.length > 10) {
        triggers.splice(0, triggers.length - 10);
      }

      await setLocal(CONTEXT_REFRESH_TRIGGERS_KEY, triggers);
    } catch (error) {
      console.error('Failed to save refresh trigger:', error);
    }
  }

  /**
   * Get refresh triggers for debugging
   */
  async getRefreshTriggers(): Promise<ContextRefreshTrigger[]> {
    return (
      (await getLocal<ContextRefreshTrigger[]>(CONTEXT_REFRESH_TRIGGERS_KEY)) ||
      []
    );
  }

  /**
   * Clear stored context (for testing/debugging)
   */
  async clearContext(): Promise<void> {
    this.context = null;
    await setLocal(CONTEXT_STORAGE_KEY, null);
    await setLocal(CONTEXT_REFRESH_TRIGGERS_KEY, null);
  }

  /**
   * Remove a channel from the context subscriptions
   */
  async removeChannelFromContext(channelIden: string): Promise<void> {
    if (!this.context || !this.context.subscriptions) {
      return;
    }

    this.context.subscriptions.delete(channelIden);
    await this.saveContext();
    console.log(`Removed channel ${channelIden} from user context`);
  }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();
