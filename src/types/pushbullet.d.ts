/**
 * Pushbullet API Type Definitions
 */

export interface PushbulletUser {
  iden: string;
  name: string;
  email: string;
  image_url: string;
  created: number;
  modified: number;
}

export interface PushbulletDevice {
  iden: string;
  nickname: string;
  type: string;
  created: number;
  modified: number;
  icon: string;
  manufacturer?: string;
  model?: string;
  pushable: boolean;
  has_sms?: boolean;
}

export interface MirrorPush {
  type: 'mirror';
  package_name: string;
  notification_id: string;
  notification_tag?: string;
  source_device_iden: string;
  title: string;
  body: string;
  application_name?: string;
  icon_url?: string;
  timestamp?: number; // Unix timestamp in seconds (Pushbullet API format)
}

export interface DismissalPush {
  type: 'dismissal';
  package_name: string;
  notification_id: string;
  notification_tag?: string;
  source_user_iden: string;
}

export interface MirrorMeta {
  package_name: string;
  notification_id: string;
  notification_tag?: string;
  source_device_iden: string;
  title: string;
  body: string;
  application_name?: string;
  icon_url?: string;
  expiresAt: number;
}

// File upload types for Milestone 4
export interface UploadRequestPayload {
  file_name: string;
  file_type: string;
}

export interface UploadRequestResponse {
  upload_url: string;
  file_url: string;
  file_type: string;
  file_name: string;
  data: Record<string, string>; // S3 form fields
}

export interface UploadInfo {
  uploadUrl: string;
  fileUrl: string;
  s3Fields: Record<string, string>;
}

export interface FilePush {
  iden: string;
  type: 'file';
  file_name: string;
  file_type: string;
  file_url: string;
  source_device_iden: string;
  target_device_iden?: string;
  created: number;
  modified: number;
  dismissed: boolean;
  receiver_iden?: string;
}

export interface LinkPush {
  iden: string;
  type: 'link';
  title?: string;
  body?: string;
  url: string;
  source_device_iden: string;
  target_device_iden?: string;
  created: number;
  modified: number;
  dismissed: boolean;
  receiver_iden?: string;
}

export interface TransferRecord {
  id: string;
  type: 'sent' | 'received';
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'in_progress';
  targetDevice?: string;
  sourceDevice?: string;
}

export interface PendingUpload {
  fileHash: string;
  uploadInfo: UploadInfo;
  offset: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  attempts: number;
}

export interface WebSocketPushMessage {
  type: 'push';
  push: MirrorPush | DismissalPush | FilePush | LinkPush;
}

export interface WebSocketTickleMessage {
  type: 'tickle';
  subtype: 'push';
}

export interface WebSocketNopMessage {
  type: 'nop';
}

// SMS/MMS Types for Milestone 5
export interface SmsMsg {
  id: string;
  pb_guid: string;
  timestamp: number;
  inbound: boolean;
  text: string;
  image_url?: string;
  conversation_iden: string;
  deviceIden?: string; // NEW: Device context
  type?: 'sms' | 'mms'; // NEW: Message type
  status?: string; // NEW: Message status
  recipient_index?: number; // NEW: For MMS with multiple recipients
}

export interface SmsThread {
  id: string; // phone number or PB thread iden
  name: string; // contact name
  messages: SmsMsg[]; // chronological
  lastMessageTime: number;
  unreadCount: number;
  deviceIden?: string; // NEW: Device context
  recipients?: Array<{
    // NEW: Multiple recipients support
    name: string;
    address: string;
    number: string;
  }>;
}

export interface MessagingExtensionReply {
  type: 'messaging_extension_reply';
  package_name: string;
  target_device_iden: string;
  conversation_iden: string;
  message: string;
  attachments?: Array<{
    content_type: string;
    name: string;
    url: string;
  }>;
}

export interface ContactInfo {
  name: string;
  number: string;
  lastUpdated: number;
}

export type WebSocketMessage =
  | WebSocketPushMessage
  | WebSocketTickleMessage
  | WebSocketNopMessage;
