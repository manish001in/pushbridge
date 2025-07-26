/**
 * Pushbullet API Request/Response Interfaces
 * Properly separated request and response objects for type safety
 */

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

export interface SubscriptionsApiResponse {
  subscriptions: SubscriptionApiResponse[];
}

export interface SubscriptionApiResponse {
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
    website_url?: string;
  };
}

// ============================================================================
// CHANNELS API
// ============================================================================

export interface ChannelsApiResponse {
  channels: OwnedChannelApiResponse[];
}

export interface OwnedChannelApiResponse {
  iden: string;
  tag: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
  modified: number;
}

// ============================================================================
// DEVICES API
// ============================================================================

export interface DevicesApiResponse {
  devices: DeviceApiResponse[];
}

export interface DeviceApiResponse {
  iden: string;
  nickname: string;
  type: string;
  active: boolean;
  created: number;
  modified: number;
  icon: string;
  manufacturer?: string;
  model?: string;
  pushable: boolean;
  has_sms?: boolean;
}

// ============================================================================
// PUSHES API
// ============================================================================

export interface PushesApiResponse {
  pushes: PushApiResponse[];
  cursor?: string;
}

export interface PushApiResponse {
  iden: string;
  type: string;
  title?: string;
  body?: string;
  url?: string;
  source_device_iden: string;
  target_device_iden?: string;
  channel_iden?: string;
  created: number;
  modified: number;
  dismissed: boolean;
  receiver_iden?: string;
  // File-specific fields
  file_name?: string;
  file_type?: string;
  file_url?: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
}

// ============================================================================
// ENHANCED PUSH METADATA
// ============================================================================

export interface EnhancedPushMetadata {
  // Source information
  source_type: 'device' | 'channel_broadcast' | 'channel_subscription';
  source_channel_tag?: string;
  source_channel_name?: string;
  source_device_nickname?: string;
  
  // Ownership information  
  is_owned_by_user: boolean;
  can_delete: boolean;
  can_dismiss: boolean;
  
  // File information
  has_file: boolean;
  file_metadata?: {
    name: string;
    type: string;
    size?: number;
    url?: string;
  };
  
  // Computed fields
  display_source: string; // "Your iPhone", "Channel: Tech News", etc.
  ownership_reason: string; // "You sent this", "You own this channel", etc.
}

export interface EnhancedPush extends PushApiResponse {
  metadata: EnhancedPushMetadata;
}

// ============================================================================
// USER CONTEXT
// ============================================================================

export interface UserContext {
  current_device_iden: string;
  owned_channels: Map<string, OwnedChannelApiResponse>; // iden -> channel
  subscriptions: Map<string, SubscriptionApiResponse>; // channel_iden -> subscription
  devices: Map<string, DeviceApiResponse>; // iden -> device
  last_refreshed: number;
  is_valid: boolean;
}

// ============================================================================
// CONTEXT REFRESH TRIGGERS
// ============================================================================

export interface ContextRefreshTrigger {
  type: 'popup_open' | 'unknown_source' | 'periodic' | 'manual';
  timestamp: number;
  reason?: string;
} 