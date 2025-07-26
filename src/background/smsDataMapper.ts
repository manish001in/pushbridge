/**
 * SMS Data Mapper for Pushbridge extension
 * Converts between API and internal data formats
 */

import { SmsThread, SmsMsg } from '../types/pushbullet';

import { PushbulletDevice } from './deviceManager';
import { ApiSmsThread, ApiSmsMessage } from './smsApiClient';
import { fromPushbulletTime } from './timestampUtils';

export class SmsDataMapper {
  /**
   * Convert API thread to internal SmsThread format
   */
  static mapApiThreadToSmsThread(
    apiThread: ApiSmsThread,
    deviceIden: string
  ): SmsThread {
    // Extract conversation ID from thread
    const conversationId = apiThread.id;
    
    // Get primary recipient name (first recipient or fallback)
    const primaryRecipient = apiThread.recipients?.[0];
    const name = primaryRecipient?.name || `Thread ${conversationId}`;
    
    // Convert latest message to SmsMsg format
    const latestMessage: SmsMsg = this.mapApiMessageToSmsMsg(
      apiThread.latest,
      deviceIden,
      conversationId
    );

    return {
      id: conversationId,
      name,
      messages: [latestMessage], // Start with just the latest message
      lastMessageTime: this.convertTimestamp(apiThread.latest.timestamp),
      unreadCount: 0, // Will be calculated separately
      deviceIden,
      recipients: apiThread.recipients,
    };
  }

  /**
   * Convert API message to internal SmsMsg format
   */
  static mapApiMessageToSmsMsg(
    apiMessage: ApiSmsMessage,
    deviceIden: string,
    conversationId: string
  ): SmsMsg {
    return {
      id: apiMessage.id,
      pb_guid: apiMessage.guid || apiMessage.id,
      timestamp: this.convertTimestamp(apiMessage.timestamp),
      inbound: apiMessage.direction === 'incoming',
      text: apiMessage.body,
      conversation_iden: conversationId,
      deviceIden,
      type: apiMessage.type,
      status: apiMessage.status,
      recipient_index: apiMessage.recipient_index,
    };
  }

  /**
   * Convert API timestamp (seconds) to milliseconds
   */
  static convertTimestamp(apiTimestamp: number): number {
    // API timestamps are in seconds, convert to milliseconds using utility
    return fromPushbulletTime(apiTimestamp);
  }

  /**
   * Get device display name from device object
   */
  static getDeviceDisplayName(device: PushbulletDevice): string {
    if (device.nickname) {
      return device.nickname;
    }
    
    if (device.model && device.manufacturer) {
      return `${device.manufacturer} ${device.model}`;
    }
    
    if (device.model) {
      return device.model;
    }
    
    return `Device ${device.iden.slice(0, 8)}`;
  }

  /**
   * Merge API messages with existing thread messages
   */
  static mergeMessages(
    existingMessages: SmsMsg[],
    newMessages: SmsMsg[]
  ): SmsMsg[] {
    // Create a map of existing messages by ID for quick lookup
    const existingMap = new Map<string, SmsMsg>();
    existingMessages.forEach(msg => existingMap.set(msg.id, msg));

    // Add new messages, avoiding duplicates
    newMessages.forEach(newMsg => {
      if (!existingMap.has(newMsg.id)) {
        existingMap.set(newMsg.id, newMsg);
      }
    });

    // Convert back to array and sort by timestamp
    return Array.from(existingMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /**
   * Calculate unread count for a thread
   */
  static calculateUnreadCount(messages: SmsMsg[]): number {
    return messages.filter(msg => msg.inbound).length;
  }

  /**
   * Get the most recent message time from a thread
   */
  static getLastMessageTime(messages: SmsMsg[]): number {
    if (messages.length === 0) {
      return 0;
    }
    
    return Math.max(...messages.map(msg => msg.timestamp));
  }

  /**
   * Extract conversation name from recipients
   */
  static getConversationName(recipients: Array<{ name: string; address: string; number: string }>): string {
    if (recipients.length === 0) {
      return 'Unknown';
    }
    
    if (recipients.length === 1) {
      return recipients[0].name || recipients[0].number || 'Unknown';
    }
    
    // For group conversations, show first name + count
    const firstName = recipients[0].name || recipients[0].number || 'Unknown';
    return `${firstName} +${recipients.length - 1}`;
  }
} 