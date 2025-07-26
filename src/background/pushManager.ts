/**
 * Push manager for Pushbridge extension
 * Handles creating and managing pushes via Pushbullet API
 */

import {
  PushApiResponse,
  PushesApiResponse,
  EnhancedPush,
} from '../types/api-interfaces';
import {
  UploadRequestPayload,
  UploadRequestResponse,
  UploadInfo,
  FilePush,
} from '../types/pushbullet';

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { PushEnricher } from './pushEnricher';
import { getLocal } from './storage';

export interface PushPayload {
  type: 'note' | 'link' | 'broadcast';
  title?: string;
  body?: string;
  url?: string;
  targetDeviceIden?: string; // undefined = All devices
  channel_tag?: string; // For broadcast pushes
}

// Legacy interface for backward compatibility
export interface PushbulletPush extends PushApiResponse {}

export interface PushHistoryResponse {
  pushes: PushbulletPush[];
  cursor?: string;
}

// Enhanced push history response with metadata
export interface EnhancedPushHistoryResponse {
  pushes: EnhancedPush[];
  cursor?: string;
}

// Rate limiting is now handled by httpClient

/**
 * Create a push (note, link, or broadcast)
 * @param payload - The push payload
 * @returns Promise resolving to the created push
 */
export async function createPush(
  payload: PushPayload
): Promise<PushbulletPush> {
  try {
    // Validate payload
    if (
      !payload.type ||
      !['note', 'link', 'broadcast'].includes(payload.type)
    ) {
      throw new Error(
        'Invalid push type. Must be "note", "link", or "broadcast"'
      );
    }

    if (payload.type === 'link' && !payload.url) {
      throw new Error('URL is required for link pushes');
    }

    if (payload.type === 'broadcast' && !payload.channel_tag) {
      throw new Error('Channel tag is required for broadcast pushes');
    }

    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    const sourceDeviceIden = await getLocal<string>('pb_device_iden');
    if (!sourceDeviceIden) {
      throw new Error('Chrome device not registered');
    }

    // Prepare push data
    const pushData: Record<string, unknown> = {
      type: payload.type === 'broadcast' ? 'note' : payload.type, // Broadcasts are sent as notes with channel_tag
      source_device_iden: sourceDeviceIden,
    };

    if (payload.title) {
      pushData.title = payload.title;
    }

    if (payload.body) {
      pushData.body = payload.body;
    }

    if (payload.type === 'link') {
      pushData.url = payload.url;
    }

    // Handle broadcast vs regular push targeting
    if (payload.type === 'broadcast') {
      pushData.channel_tag = payload.channel_tag;
    } else if (payload.targetDeviceIden) {
      pushData.target_device_iden = payload.targetDeviceIden;
    }

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/pushes',
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushData),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while creating push',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(
          `Invalid push data: ${errorData.error?.message || 'Bad request'}`
        );
      }

      throw new Error(
        `Failed to create push: ${response.status} ${response.statusText}`
      );
    }

    const push: PushbulletPush = await response.json();
    return push;
  } catch (error) {
    await reportError(PBError.Unknown, {
      message: 'Failed to create push',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Request file upload from Pushbullet API
 * @param file - The file to upload
 * @returns Promise resolving to upload information
 */
export async function requestUpload(file: File): Promise<UploadInfo> {
  try {
    // Validate file size (25MB limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 25MB limit`
      );
    }

    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Prepare upload request payload
    const payload: UploadRequestPayload = {
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
    };

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/upload-request',
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while requesting upload',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }

      if (response.status === 413) {
        throw new Error('File too large for upload');
      }

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(
          `Invalid upload request: ${errorData.error?.message || 'Bad request'}`
        );
      }

      throw new Error(
        `Failed to request upload: ${response.status} ${response.statusText}`
      );
    }

    const uploadResponse: UploadRequestResponse = await response.json();

    // Return standardized upload info
    const uploadInfo: UploadInfo = {
      uploadUrl: uploadResponse.upload_url,
      fileUrl: uploadResponse.file_url,
      s3Fields: uploadResponse.data,
    };

    console.log('Upload request successful:', uploadInfo.fileUrl);
    return uploadInfo;
  } catch (error) {
    console.error('Failed to request upload:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to request file upload',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Create a file push after successful upload
 * @param fileUrl - The uploaded file URL
 * @param fileName - The file name
 * @param fileType - The file MIME type
 * @param targetDeviceIden - Target device iden (optional)
 * @returns Promise resolving to the created file push
 */
export async function createFilePush(
  fileUrl: string,
  fileName: string,
  fileType: string,
  targetDeviceIden?: string,
  title?: string,
  body?: string,
  channel_tag?: string
): Promise<FilePush> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    const sourceDeviceIden = await getLocal<string>('pb_device_iden');
    if (!sourceDeviceIden) {
      throw new Error('Chrome device not registered');
    }

    // Prepare file push data
    const pushData: Record<string, unknown> = {
      type: 'file',
      file_name: fileName,
      file_type: fileType,
      file_url: fileUrl,
      source_device_iden: sourceDeviceIden,
    };

    if (targetDeviceIden) {
      pushData.target_device_iden = targetDeviceIden;
    }

    if (title) {
      pushData.title = title;
    }

    if (body) {
      pushData.body = body + ' (File: ' + fileName + ')';
    }

    if (channel_tag) {
      pushData.channel_tag = channel_tag;
    }

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/pushes',
      {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushData),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while creating file push',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(
          `Invalid file push data: ${errorData.error?.message || 'Bad request'}`
        );
      }

      throw new Error(
        `Failed to create file push: ${response.status} ${response.statusText}`
      );
    }

    const filePush: FilePush = await response.json();
    console.log('File push created successfully:', filePush.iden);
    return filePush;
  } catch (error) {
    console.error('Failed to create file push:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to create file push',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Get push history with pagination
 * @param limit - Number of pushes to fetch (max 500)
 * @param modifiedAfter - Only fetch pushes modified after this timestamp
 * @param cursor - Pagination cursor
 * @returns Promise resolving to push history
 */
export async function getPushHistory(
  limit = 200,
  modifiedAfter?: number,
  cursor?: string
): Promise<PushHistoryResponse> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    if (modifiedAfter) {
      params.append('modified_after', modifiedAfter.toString());
    }

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/pushes?${params}`,
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
          message: 'Token revoked while fetching push history',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch push history: ${response.status} ${response.statusText}`
      );
    }

    const data: PushesApiResponse = await response.json();

    // Convert to legacy format for backward compatibility
    return {
      pushes: data.pushes as PushbulletPush[],
      cursor: data.cursor,
    };
  } catch (error) {
    await reportError(PBError.Unknown, {
      message: 'Failed to fetch push history',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Get enhanced push history with metadata
 * @param limit - Number of pushes to fetch
 * @param modifiedAfter - Only fetch pushes modified after this timestamp
 * @param cursor - Pagination cursor
 * @param trigger - Context refresh trigger
 * @returns Promise resolving to enhanced push history
 */
export async function getEnhancedPushHistory(
  trigger: {
    type: 'popup_open' | 'unknown_source' | 'periodic' | 'manual';
    timestamp: number;
    reason?: string;
  },
  limit = 200,
  modifiedAfter?: number,
  cursor?: string
): Promise<EnhancedPushHistoryResponse> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    if (modifiedAfter) {
      params.append('modified_after', modifiedAfter.toString());
    }

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await httpClient.fetch(
      `https://api.pushbullet.com/v2/pushes?${params}`,
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
          message: 'Token revoked while fetching push history',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to fetch push history: ${response.status} ${response.statusText}`
      );
    }

    const data: PushesApiResponse = await response.json();

    // Enrich pushes with metadata
    const enrichedPushes = await PushEnricher.enrichPushesWithContextRefresh(
      data.pushes,
      trigger
    );

    return {
      pushes: enrichedPushes,
      cursor: data.cursor,
    };
  } catch (error) {
    await reportError(PBError.Unknown, {
      message: 'Failed to fetch enhanced push history',
      code: error instanceof Error ? undefined : 500,
    });
    throw error;
  }
}

/**
 * Dismiss a push
 * @param pushIden - The push iden to dismiss
 * @returns Promise resolving when dismissed
 */
export async function dismissPush(pushIden: string): Promise<void> {
  const token = await getLocal<string>('pb_token');
  if (!token) {
    throw new Error('No token available');
  }

  const response = await httpClient.fetch(
    `https://api.pushbullet.com/v2/pushes/${pushIden}`,
    {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dismissed: true }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      await reportError(PBError.TokenRevoked, {
        message: 'Token revoked while dismissing push',
        code: response.status,
      });
      throw new Error('Token is invalid or revoked');
    }
    throw new Error(
      `Failed to dismiss push: ${response.status} ${response.statusText}`
    );
  }
}

/**
 * Delete a push
 * @param pushIden - The push iden to delete
 * @returns Promise resolving when deleted
 */
export async function deletePush(pushIden: string): Promise<void> {
  const token = await getLocal<string>('pb_token');
  if (!token) {
    throw new Error('No token available');
  }

  const response = await httpClient.fetch(
    `https://api.pushbullet.com/v2/pushes/${pushIden}`,
    {
      method: 'DELETE',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      await reportError(PBError.TokenRevoked, {
        message: 'Token revoked while deleting push',
        code: response.status,
      });
      throw new Error('Token is invalid or revoked');
    }
    throw new Error(
      `Failed to delete push: ${response.status} ${response.statusText}`
    );
  }
}
