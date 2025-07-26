/**
 * Unit tests for pushManager module
 */

import { jest } from '@jest/globals';

import { PushPayload } from '../../src/background/pushManager';

// Mock dependencies
const mockGetLocal = jest.fn();
const mockSetLocal = jest.fn();

jest.mock('../../src/background/storage', () => ({
  getLocal: mockGetLocal,
  setLocal: mockSetLocal,
}));

jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: {
    TokenRevoked: 'token_revoked',
    RateLimited: 'rate_limited',
    Unknown: 'unknown',
  },
}));

// Mock httpClient
const mockHttpClientFetch = jest.fn();
jest.mock('../../src/background/httpClient', () => ({
  httpClient: {
    fetch: mockHttpClientFetch,
  },
}));

// Import the module after mocking
let createPush: any;
let requestUpload: any;
let createFilePush: any;
let getPushHistory: any;
let dismissPush: any;
let deletePush: any;

beforeAll(async () => {
  const module = await import('../../src/background/pushManager');
  createPush = module.createPush;
  requestUpload = module.requestUpload;
  createFilePush = module.createFilePush;
  getPushHistory = module.getPushHistory;
  dismissPush = module.dismissPush;
  deletePush = module.deletePush;
});

describe('pushManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset storage mocks
    (mockGetLocal as any).mockResolvedValue(undefined);
    (mockSetLocal as any).mockResolvedValue(undefined);

    // Reset httpClient fetch mock
    (mockHttpClientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  describe('requestUpload', () => {
    const mockFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    });

    it('should request upload successfully', async () => {
      // Mock the calls that happen in requestUpload:
      // 1. requestUpload() calls getLocal('pb_token')
      (mockGetLocal as any).mockResolvedValueOnce('test-token');

      const mockResponse = {
        upload_url: 'https://s3.amazonaws.com/upload-bucket',
        file_url: 'https://files.pushbullet.com/file123',
        file_type: 'text/plain',
        file_name: 'test.txt',
        data: {
          key: 'uploads/file123',
          bucket: 'pushbullet-files',
          'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
          'X-Amz-Credential': 'test-credential',
          'X-Amz-Date': '20240101T000000Z',
          Policy: 'test-policy',
          'X-Amz-Signature': 'test-signature',
        },
      };

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await requestUpload(mockFile);

      expect(result).toEqual({
        uploadUrl: 'https://s3.amazonaws.com/upload-bucket',
        fileUrl: 'https://files.pushbullet.com/file123',
        s3Fields: mockResponse.data,
      });

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/upload-request',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            file_name: 'test.txt',
            file_type: 'text/plain',
          }),
        })
      );
    });

    it('should reject files larger than 25MB', async () => {
      const largeFile = new File(['x'.repeat(26 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain',
      });

      await expect(requestUpload(largeFile)).rejects.toThrow(
        'File size (26.0MB) exceeds the 25MB limit'
      );
    });

    it('should handle 413 error (file too large)', async () => {
      // Mock token
      (mockGetLocal as any).mockResolvedValueOnce('test-token');

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 413,
        statusText: 'Request Entity Too Large',
      });

      await expect(requestUpload(mockFile)).rejects.toThrow(
        'File too large for upload'
      );
    });

    it('should handle 401 error (token revoked)', async () => {
      // Mock token
      (mockGetLocal as any).mockResolvedValueOnce('test-token');

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(requestUpload(mockFile)).rejects.toThrow(
        'Token is invalid or revoked'
      );
    });

    it('should handle 429 error (rate limited)', async () => {
      // Mock token
      (mockGetLocal as any).mockResolvedValueOnce('test-token');

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: jest.fn().mockReturnValue('60'),
        },
      });

      await expect(requestUpload(mockFile)).rejects.toThrow(
        'Failed to request upload: 429 Too Many Requests'
      );
    });

    it('should handle missing token', async () => {
      (mockGetLocal as any).mockResolvedValueOnce(null);

      await expect(requestUpload(mockFile)).rejects.toThrow(
        'No token available'
      );
    });
  });

  describe('createFilePush', () => {
    it('should create file push successfully', async () => {
      // Mock the calls that happen in createFilePush:
      // 1. createFilePush() calls getLocal('pb_token')
      // 2. createFilePush() calls getLocal('pb_device_iden')
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // pb_token
        .mockResolvedValueOnce('test-device-id'); // pb_device_iden

      (mockHttpClientFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ iden: 'test-push-id', type: 'file' }),
      });

      const result = await createFilePush(
        'https://example.com/file.txt',
        'test.txt',
        'text/plain',
        'target-device-id',
        'Test Title',
        'Test Body',
        'test-channel'
      );

      expect(result).toEqual({ iden: 'test-push-id', type: 'file' });
      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes',
        {
          method: 'POST',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'file',
            file_name: 'test.txt',
            file_type: 'text/plain',
            file_url: 'https://example.com/file.txt',
            source_device_iden: 'test-device-id',
            target_device_iden: 'target-device-id',
            title: 'Test Title',
            body: 'Test Body (File: test.txt)',
            channel_tag: 'test-channel',
          }),
        }
      );
    });

    it('should create file push without target device', async () => {
      // Mock the calls that happen in createFilePush
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // For getLocal('pb_token')
        .mockResolvedValueOnce('device-123'); // For getLocal('pb_device_iden')

      const mockFilePush = {
        iden: 'push-123',
        type: 'file',
        file_name: 'test.txt',
        file_type: 'text/plain',
        file_url: 'https://files.pushbullet.com/file123',
        source_device_iden: 'device-123',
        created: Date.now(),
        modified: Date.now(),
        dismissed: false,
      };

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockFilePush),
      });

      const result = await createFilePush(
        'https://files.pushbullet.com/file123',
        'test.txt',
        'text/plain'
      );

      expect(result).toEqual(mockFilePush);

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes',
        expect.objectContaining({
          body: JSON.stringify({
            type: 'file',
            file_name: 'test.txt',
            file_type: 'text/plain',
            file_url: 'https://files.pushbullet.com/file123',
            source_device_iden: 'device-123',
            // No target_device_iden
          }),
        })
      );
    });

    it('should handle 401 error (token revoked)', async () => {
      // Mock the calls that happen in createFilePush
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // For getLocal('pb_token')
        .mockResolvedValueOnce('device-123'); // For getLocal('pb_device_iden')

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(
        createFilePush(
          'https://files.pushbullet.com/file123',
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Token is invalid or revoked');
    });

    it('should handle 400 error (bad request)', async () => {
      // Mock the calls that happen in createFilePush
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // For getLocal('pb_token')
        .mockResolvedValueOnce('device-123'); // For getLocal('pb_device_iden')

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          error: { message: 'Invalid file push data' },
        }),
      });

      await expect(
        createFilePush(
          'https://files.pushbullet.com/file123',
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Invalid file push data: Invalid file push data');
    });
  });

  describe('createPush', () => {
    it('should create note push successfully', async () => {
      // Mock the calls that happen in createPush:
      // 1. createPush() calls getLocal('pb_token')
      // 2. createPush() calls getLocal('pb_device_iden')
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // For getLocal('pb_token')
        .mockResolvedValueOnce('device-123'); // For getLocal('pb_device_iden')

      const mockPush = {
        iden: 'push-123',
        type: 'note',
        title: 'Test Note',
        body: 'Test body',
        source_device_iden: 'device-123',
        created: Date.now(),
        modified: Date.now(),
        dismissed: false,
      };

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockPush),
      });

      const payload: PushPayload = {
        type: 'note',
        title: 'Test Note',
        body: 'Test body',
      };

      const result = await createPush(payload);

      expect(result).toEqual(mockPush);

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
          body: expect.stringMatching(
            /.*"type":"note".*"source_device_iden":"device-123".*"title":"Test Note".*"body":"Test body".*/
          ),
        })
      );
    });

    it('should create link push successfully', async () => {
      // Mock the calls that happen in createPush
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token') // For getLocal('pb_token')
        .mockResolvedValueOnce('device-123'); // For getLocal('pb_device_iden')

      const mockPush = {
        iden: 'push-123',
        type: 'link',
        title: 'Test Link',
        url: 'https://example.com',
        source_device_iden: 'device-123',
        created: Date.now(),
        modified: Date.now(),
        dismissed: false,
      };

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockPush),
      });

      const payload: PushPayload = {
        type: 'link',
        title: 'Test Link',
        url: 'https://example.com',
      };

      const result = await createPush(payload);

      expect(result).toEqual(mockPush);

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes',
        expect.objectContaining({
          body: expect.stringMatching(
            /.*"type":"link".*"source_device_iden":"device-123".*"title":"Test Link".*"url":"https:\/\/example\.com".*/
          ),
        })
      );
    });

    it('should validate push type', async () => {
      const payload = {
        type: 'invalid' as any,
        title: 'Test',
      };

      await expect(createPush(payload)).rejects.toThrow(
        'Invalid push type. Must be "note", "link", or "broadcast"'
      );
    });

    it('should require URL for link pushes', async () => {
      const payload: PushPayload = {
        type: 'link',
        title: 'Test Link',
        // Missing url
      };

      await expect(createPush(payload)).rejects.toThrow(
        'URL is required for link pushes'
      );
    });

    it('should require channel_tag for broadcast pushes', async () => {
      const payload: PushPayload = {
        type: 'broadcast',
        title: 'Test Broadcast',
        body: 'Test broadcast message',
        // Missing channel_tag
      };

      await expect(createPush(payload)).rejects.toThrow(
        'Channel tag is required for broadcast pushes'
      );
    });

    it('should create broadcast push successfully', async () => {
      // Mock the calls that happen in createPush:
      // 1. createPush() calls getLocal('pb_token')
      // 2. createPush() calls getLocal('pb_device_iden')
      (mockGetLocal as any)
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device-123');

      const mockPushResponse = {
        iden: 'push123',
        type: 'note',
        title: 'Test Broadcast',
        body: 'Test broadcast message',
        channel_tag: 'test-channel',
        created: Date.now() / 1000,
        modified: Date.now() / 1000,
        dismissed: false,
        source_device_iden: 'device-123',
      };

      // Mock httpClient.fetch to return successful response
      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPushResponse),
      });

      const payload: PushPayload = {
        type: 'broadcast',
        title: 'Test Broadcast',
        body: 'Test broadcast message',
        channel_tag: 'test-channel',
      };

      const result = await createPush(payload);

      expect(result).toEqual(mockPushResponse);
      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
        })
      );

      // Verify the request body contains the expected fields
      const callArgs = mockHttpClientFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toEqual({
        type: 'note', // Broadcasts are sent as notes with channel_tag
        title: 'Test Broadcast',
        body: 'Test broadcast message',
        channel_tag: 'test-channel',
        source_device_iden: 'device-123',
      });
    });
  });

  describe('getPushHistory', () => {
    it('should fetch push history successfully', async () => {
      (mockGetLocal as any).mockResolvedValue('test-token');

      const mockHistory = {
        pushes: [
          {
            iden: 'push-123',
            type: 'note',
            title: 'Test Note',
            source_device_iden: 'device-123',
            created: Date.now(),
            modified: Date.now(),
            dismissed: false,
          },
        ],
        cursor: 'next-cursor',
      };

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockHistory),
      });

      const result = await getPushHistory(30, 1234567890, 'cursor-123');

      expect(result).toEqual(mockHistory);

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes?limit=30&modified_after=1234567890&cursor=cursor-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('dismissPush', () => {
    it('should dismiss push successfully', async () => {
      (mockGetLocal as any).mockResolvedValue('test-token');

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await dismissPush('push-123');

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes/push-123',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ dismissed: true }),
        })
      );
    });
  });

  describe('deletePush', () => {
    it('should delete push successfully', async () => {
      (mockGetLocal as any).mockResolvedValue('test-token');

      (mockHttpClientFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await deletePush('push-123');

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes/push-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});
