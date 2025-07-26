/**
 * SMS API Client for Pushbridge extension
 * Handles device-specific SMS permanents endpoints
 */

import { PushbulletDevice, getDevices } from './deviceManager';
import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal } from './storage';

// API Response Types
export interface ApiSmsThread {
  id: string;
  recipients: Array<{
    name: string;
    address: string;
    number: string;
  }>;
  latest: {
    id: string;
    type: 'sms' | 'mms';
    timestamp: number;
    direction: 'incoming' | 'outgoing';
    body: string;
    status?: string;
    guid?: string;
  };
}

export interface ApiSmsMessage {
  id: string;
  type: 'sms' | 'mms';
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  body: string;
  status?: string;
  guid?: string;
  recipient_index?: number;
}

export interface ThreadsListResponse {
  threads: ApiSmsThread[];
}

export interface ThreadMessagesResponse {
  thread: ApiSmsMessage[];
}

export class SmsApiClient {
  private token: string | null = null;

  /**
   * Initialize the SMS API client
   */
  async initialize(): Promise<void> {
    const token = await getLocal<string>('pb_token');
    this.token = token || null;
    if (!this.token) {
      throw new Error('No Pushbullet token available');
    }
  }

  /**
   * Get SMS threads list for a specific device
   */
  async getSmsThreadsList(deviceIden: string): Promise<ThreadsListResponse> {
    try {
      if (!this.token) {
        await this.initialize();
      }

      // Verify device exists and has SMS capability
      const device = await this.getDeviceById(deviceIden);
      if (!device) {
        throw new Error(`Device ${deviceIden} not found`);
      }

      if (!device.has_sms) {
        throw new Error(`Device ${deviceIden} is not SMS-capable`);
      }

      const response = await httpClient.fetch(
        `https://api.pushbullet.com/v2/permanents/${deviceIden}_threads`,
        {
          method: 'GET',
          headers: {
            'Access-Token': this.token!,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          await reportError(PBError.TokenRevoked, {
            message: 'Token revoked during SMS threads fetch',
            code: response.status,
          });
          throw new Error('Token is invalid or revoked');
        }

        if (response.status === 404) {
          throw new Error(
            `SMS threads not found for device ${deviceIden} - device may not support SMS or may be offline`
          );
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `SMS threads fetch failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to get SMS threads for device ${deviceIden}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get SMS thread messages for a specific device and thread
   */
  async getSmsThreadMessages(
    deviceIden: string,
    threadId: string
  ): Promise<ThreadMessagesResponse> {
    try {
      console.log(
        `[SmsApiClient] Getting SMS thread messages for device: ${deviceIden}, thread: ${threadId}`
      );

      if (!this.token) {
        console.log(`[SmsApiClient] No token, initializing...`);
        await this.initialize();
      }

      // Verify device exists and has SMS capability
      const device = await this.getDeviceById(deviceIden);
      if (!device) {
        console.error(`[SmsApiClient] Device ${deviceIden} not found`);
        throw new Error(`Device ${deviceIden} not found`);
      }

      if (!device.has_sms) {
        console.error(`[SmsApiClient] Device ${deviceIden} is not SMS-capable`);
        throw new Error(`Device ${deviceIden} is not SMS-capable`);
      }

      console.log(
        `[SmsApiClient] Making API request to: https://api.pushbullet.com/v2/permanents/${deviceIden}_thread_${threadId}`
      );

      const response = await httpClient.fetch(
        `https://api.pushbullet.com/v2/permanents/${deviceIden}_thread_${threadId}`,
        {
          method: 'GET',
          headers: {
            'Access-Token': this.token!,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(
        `[SmsApiClient] Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        console.error(
          `[SmsApiClient] API request failed: ${response.status} ${response.statusText}`
        );

        if (response.status === 401) {
          console.error(
            `[SmsApiClient] Token revoked during SMS thread messages fetch`
          );
          await reportError(PBError.TokenRevoked, {
            message: 'Token revoked during SMS thread messages fetch',
            code: response.status,
          });
          throw new Error('Token is invalid or revoked');
        }

        if (response.status === 404) {
          console.error(
            `[SmsApiClient] SMS thread ${threadId} not found for device ${deviceIden}`
          );
          throw new Error(
            `SMS thread ${threadId} not found for device ${deviceIden}`
          );
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`[SmsApiClient] Error response data:`, errorData);
        throw new Error(
          `SMS thread messages fetch failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const responseData = await response.json();
      console.log(`[SmsApiClient] Successfully retrieved SMS thread data:`, {
        hasThread: !!responseData.thread,
        threadLength: responseData.thread?.length || 0,
        threadKeys: responseData.thread
          ? Object.keys(responseData.thread[0] || {})
          : [],
      });

      return responseData;
    } catch (error) {
      console.error(
        `Failed to get SMS thread messages for device ${deviceIden}, thread ${threadId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get device by ID from device manager cache
   */
  private async getDeviceById(
    deviceIden: string
  ): Promise<PushbulletDevice | null> {
    try {
      const devices = await getDevices();
      return devices.find(d => d.iden === deviceIden) || null;
    } catch (error) {
      console.error(`Failed to get device ${deviceIden}:`, error);
      return null;
    }
  }

  /**
   * Get device display name
   */
  async getDeviceDisplayName(deviceIden: string): Promise<string> {
    try {
      const device = await this.getDeviceById(deviceIden);
      if (device) {
        if (device.nickname) {
          return device.nickname;
        }

        if (device.model && device.manufacturer) {
          return `${device.manufacturer} ${device.model}`;
        }

        if (device.model) {
          return device.model;
        }
      }

      return `Device ${deviceIden.slice(0, 8)}`;
    } catch (error) {
      console.error(
        `Failed to get device display name for ${deviceIden}:`,
        error
      );
      return 'Unknown Device';
    }
  }

  /**
   * Verify device has SMS capability
   */
  async verifyDeviceSmsCapability(deviceIden: string): Promise<boolean> {
    try {
      const device = await this.getDeviceById(deviceIden);
      return device ? device.has_sms === true : false;
    } catch (error) {
      console.error(
        `Failed to verify SMS capability for device ${deviceIden}:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if device is online and accessible
   */
  async isDeviceOnline(deviceIden: string): Promise<boolean> {
    try {
      const device = await this.getDeviceById(deviceIden);
      return device ? device.active === true : false;
    } catch (error) {
      console.error(
        `Failed to check online status for device ${deviceIden}:`,
        error
      );
      return false;
    }
  }
}

// Export singleton instance
export const smsApiClient = new SmsApiClient();
