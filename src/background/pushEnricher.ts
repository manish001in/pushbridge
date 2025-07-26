/**
 * Push Enricher for Pushbridge Extension
 * Adds enhanced metadata to pushes including ownership, source, and file information
 */

import {
  PushApiResponse,
  EnhancedPush,
  EnhancedPushMetadata,
  UserContext,
} from '../types/api-interfaces';

import { contextManager } from './contextManager';

export class PushEnricher {
  /**
   * Enrich a single push with metadata
   */
  static enrichPush(push: PushApiResponse, context: UserContext): EnhancedPush {
    const metadata = this.computeMetadata(push, context);

    return {
      ...push,
      metadata,
    };
  }

  /**
   * Enrich multiple pushes with metadata
   */
  static enrichPushes(
    pushes: PushApiResponse[],
    context: UserContext
  ): EnhancedPush[] {
    return pushes.map(push => this.enrichPush(push, context));
  }

  /**
   * Compute metadata for a push based on context
   */
  private static computeMetadata(
    push: PushApiResponse,
    context: UserContext
  ): EnhancedPushMetadata {
    const sourceType = this.determineSourceType(push, context);
    const isOwned = this.determineOwnership(push, context);
    const hasFile = this.determineFileInfo(push);
    const displaySource = this.computeDisplaySource(push, context, sourceType);
    const ownershipReason = this.computeOwnershipReason(
      push,
      context,
      isOwned,
      sourceType
    );

    return {
      source_type: sourceType,
      source_channel_tag: this.getChannelTag(push, context),
      source_channel_name: this.getChannelName(push, context),
      source_device_nickname: this.getDeviceNickname(push, context),
      is_owned_by_user: isOwned,
      can_delete: isOwned,
      can_dismiss: true, // Users can always dismiss pushes
      has_file: hasFile,
      file_metadata: hasFile ? this.getFileMetadata(push) : undefined,
      display_source: displaySource,
      ownership_reason: ownershipReason,
    };
  }

  /**
   * Determine the source type of a push
   */
  private static determineSourceType(
    push: PushApiResponse,
    context: UserContext
  ): 'device' | 'channel_broadcast' | 'channel_subscription' {
    // If it has a channel_iden, it's from a channel
    if (push.channel_iden) {
      // Check if it's from an owned channel (broadcast)
      if (context.owned_channels.has(push.channel_iden)) {
        return 'channel_broadcast';
      }
      // Check if it's from a subscribed channel
      if (context.subscriptions.has(push.channel_iden)) {
        return 'channel_subscription';
      }
      // Unknown channel, treat as subscription for now
      return 'channel_subscription';
    }

    // Otherwise it's from a device
    return 'device';
  }

  /**
   * Determine if the push is owned by the current user
   */
  private static determineOwnership(
    push: PushApiResponse,
    context: UserContext
  ): boolean {
    // Check if it's from the current device
    if (push.source_device_iden === context.current_device_iden) {
      return true;
    }

    // Check if it's from an owned channel
    if (push.channel_iden && context.owned_channels.has(push.channel_iden)) {
      return true;
    }

    return false;
  }

  /**
   * Determine if the push has file information
   */
  private static determineFileInfo(push: PushApiResponse): boolean {
    return !!(push.file_name || push.file_url || push.image_url);
  }

  /**
   * Get file metadata if present
   */
  private static getFileMetadata(
    push: PushApiResponse
  ): EnhancedPushMetadata['file_metadata'] | undefined {
    if (!this.determineFileInfo(push)) {
      return undefined;
    }

    return {
      name: push.file_name || 'Unknown file',
      type: push.file_type || 'unknown',
      url: push.file_url || push.image_url,
    };
  }

  /**
   * Get channel tag for the push
   */
  private static getChannelTag(
    push: PushApiResponse,
    context: UserContext
  ): string | undefined {
    if (!push.channel_iden) {
      return undefined;
    }

    // Check owned channels first
    const ownedChannel = context.owned_channels.get(push.channel_iden);
    if (ownedChannel) {
      return ownedChannel.tag;
    }

    // Check subscriptions
    const subscription = context.subscriptions.get(push.channel_iden);
    if (subscription) {
      return subscription.channel.tag;
    }

    return undefined;
  }

  /**
   * Get channel name for the push
   */
  private static getChannelName(
    push: PushApiResponse,
    context: UserContext
  ): string | undefined {
    if (!push.channel_iden) {
      return undefined;
    }

    // Check owned channels first
    const ownedChannel = context.owned_channels.get(push.channel_iden);
    if (ownedChannel) {
      return ownedChannel.name;
    }

    // Check subscriptions
    const subscription = context.subscriptions.get(push.channel_iden);
    if (subscription) {
      return subscription.channel.name;
    }

    return undefined;
  }

  /**
   * Get device nickname for the push
   */
  private static getDeviceNickname(
    push: PushApiResponse,
    context: UserContext
  ): string | undefined {
    if (!push.source_device_iden) {
      return undefined;
    }

    const device = context.devices.get(push.source_device_iden);
    return device?.nickname;
  }

  /**
   * Compute display source string
   */
  private static computeDisplaySource(
    push: PushApiResponse,
    context: UserContext,
    sourceType: 'device' | 'channel_broadcast' | 'channel_subscription'
  ): string {
    switch (sourceType) {
      case 'device': {
        const deviceNickname = this.getDeviceNickname(push, context);
        if (push.source_device_iden === context.current_device_iden) {
          return 'Your device';
        }
        return deviceNickname || 'Unknown device';
      }

      case 'channel_broadcast': {
        const channelName = this.getChannelName(push, context);
        return `Channel: ${channelName || 'Unknown channel'}`;
      }

      case 'channel_subscription': {
        const subChannelName = this.getChannelName(push, context);
        return `Channel: ${subChannelName || 'Unknown channel'}`;
      }

      default:
        return 'Unknown source';
    }
  }

  /**
   * Compute ownership reason string
   */
  private static computeOwnershipReason(
    push: PushApiResponse,
    context: UserContext,
    isOwned: boolean,
    sourceType: 'device' | 'channel_broadcast' | 'channel_subscription'
  ): string {
    if (!isOwned) {
      return 'You received this';
    }

    switch (sourceType) {
      case 'device':
        if (push.source_device_iden === context.current_device_iden) {
          return 'You sent this';
        }
        return 'From your device';

      case 'channel_broadcast': {
        const channelName = this.getChannelName(push, context);
        return `You own channel: ${channelName || 'Unknown channel'}`;
      }

      case 'channel_subscription':
        return 'You received this from a channel';

      default:
        return 'You own this';
    }
  }

  /**
   * Check if a push source is known and handle unknown sources
   */
  static async checkAndHandleUnknownSource(
    push: PushApiResponse
  ): Promise<void> {
    const isKnown = await contextManager.isKnownSource(
      push.source_device_iden,
      push.channel_iden
    );

    if (!isKnown) {
      await contextManager.handleUnknownSource(
        push.source_device_iden,
        push.channel_iden
      );
    }
  }

  /**
   * Enrich pushes with context refresh on unknown sources
   */
  static async enrichPushesWithContextRefresh(
    pushes: PushApiResponse[],
    trigger: {
      type: 'popup_open' | 'unknown_source' | 'periodic' | 'manual';
      timestamp: number;
      reason?: string;
    }
  ): Promise<EnhancedPush[]> {
    // Check for unknown sources and refresh if needed
    for (const push of pushes) {
      await this.checkAndHandleUnknownSource(push);
    }

    // Get fresh context after potential refresh
    const freshContext = await contextManager.getContext(trigger);

    // Enrich all pushes
    return this.enrichPushes(pushes, freshContext);
  }
}
