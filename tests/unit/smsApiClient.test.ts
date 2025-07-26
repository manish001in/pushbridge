/**
 * Unit tests for SMS API Client
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/background/errorManager');
jest.mock('../../src/background/httpClient');
jest.mock('../../src/background/storage');
jest.mock('../../src/background/deviceManager');

// Import after mocking
import { getDevices } from '../../src/background/deviceManager';
import { reportError } from '../../src/background/errorManager';
import { httpClient } from '../../src/background/httpClient';
import { SmsApiClient } from '../../src/background/smsApiClient';
import { getLocal } from '../../src/background/storage';

// Mock fetch
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Mock storage functions
const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockReportError = reportError as jest.MockedFunction<typeof reportError>;
const mockHttpClientFetch = httpClient.fetch as jest.MockedFunction<
  typeof httpClient.fetch
>;
const mockGetDevices = getDevices as jest.MockedFunction<typeof getDevices>;

describe('SmsApiClient', () => {
  let smsApiClient: SmsApiClient;

  beforeEach(() => {
    smsApiClient = new SmsApiClient();
    jest.clearAllMocks();

    // Default mocks
    mockGetLocal.mockResolvedValue('test-token');
    mockHttpClientFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ threads: [] }),
    });
    mockGetDevices.mockResolvedValue([
      {
        iden: 'test-device',
        nickname: 'Test Device',
        type: 'android',
        active: true,
        created: 1234567890,
        modified: 1234567890,
        has_sms: true,
      },
    ]);
  });

  describe('initialize', () => {
    it('should initialize with valid token', async () => {
      mockGetLocal.mockResolvedValue('valid-token');

      await smsApiClient.initialize();

      expect(mockGetLocal).toHaveBeenCalledWith('pb_token');
    });

    it('should throw error when no token available', async () => {
      mockGetLocal.mockResolvedValue(null);

      await expect(smsApiClient.initialize()).rejects.toThrow(
        'No Pushbullet token available'
      );
    });
  });

  describe('getSmsThreadsList', () => {
    it('should fetch SMS threads for valid device', async () => {
      const mockResponse = {
        threads: [
          {
            id: 'thread1',
            recipients: [
              {
                name: 'John Doe',
                address: '+1234567890',
                number: '+1234567890',
              },
            ],
            latest: {
              id: 'msg1',
              type: 'sms' as const,
              timestamp: 1640995200,
              direction: 'incoming' as const,
              body: 'Hello',
            },
          },
        ],
      };

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await smsApiClient.getSmsThreadsList('test-device');

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/permanents/test-device_threads',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle device not found', async () => {
      mockGetDevices.mockResolvedValue([]);

      await expect(
        smsApiClient.getSmsThreadsList('invalid-device')
      ).rejects.toThrow('Device invalid-device not found');
    });

    it('should handle device without SMS capability', async () => {
      mockGetDevices.mockResolvedValue([
        {
          iden: 'test-device',
          nickname: 'Test Device',
          type: 'android',
          active: true,
          created: 1234567890,
          modified: 1234567890,
          has_sms: false,
        },
      ]);

      await expect(
        smsApiClient.getSmsThreadsList('test-device')
      ).rejects.toThrow('Device test-device is not SMS-capable');
    });

    it('should handle 401 unauthorized', async () => {
      mockHttpClientFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(
        smsApiClient.getSmsThreadsList('test-device')
      ).rejects.toThrow('Token is invalid or revoked');

      expect(mockReportError).toHaveBeenCalled();
    });

    it('should handle 404 not found', async () => {
      mockHttpClientFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        smsApiClient.getSmsThreadsList('test-device')
      ).rejects.toThrow(
        'SMS threads not found for device test-device - device may not support SMS or may be offline'
      );
    });
  });

  describe('getSmsThreadMessages', () => {
    it('should fetch SMS thread messages for valid device and thread', async () => {
      const mockResponse = {
        thread: [
          {
            id: 'msg1',
            type: 'sms' as const,
            timestamp: 1640995200,
            direction: 'incoming' as const,
            body: 'Hello',
          },
          {
            id: 'msg2',
            type: 'sms' as const,
            timestamp: 1640995300,
            direction: 'outgoing' as const,
            body: 'Hi there',
          },
        ],
      };

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await smsApiClient.getSmsThreadMessages(
        'test-device',
        'thread1'
      );

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/permanents/test-device_thread_thread1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 thread not found', async () => {
      mockHttpClientFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        smsApiClient.getSmsThreadMessages('test-device', 'invalid-thread')
      ).rejects.toThrow(
        'SMS thread invalid-thread not found for device test-device'
      );
    });
  });

  describe('getDeviceDisplayName', () => {
    it('should return device nickname when available', async () => {
      const name = await smsApiClient.getDeviceDisplayName('test-device');
      expect(name).toBe('Test Device');
    });

    it('should return manufacturer and model when nickname not available', async () => {
      mockGetDevices.mockResolvedValue([
        {
          iden: 'test-device',
          nickname: '',
          type: 'android',
          active: true,
          created: 1234567890,
          modified: 1234567890,
          has_sms: true,
          manufacturer: 'Samsung',
          model: 'Galaxy S21',
        },
      ]);

      const name = await smsApiClient.getDeviceDisplayName('test-device');
      expect(name).toBe('Samsung Galaxy S21');
    });

    it('should return fallback name when device not found', async () => {
      mockGetDevices.mockResolvedValue([]);

      const name = await smsApiClient.getDeviceDisplayName('invalid-device');
      expect(name).toBe('Device invalid-');
    });
  });

  describe('verifyDeviceSmsCapability', () => {
    it('should return true for SMS-capable device', async () => {
      const hasSms =
        await smsApiClient.verifyDeviceSmsCapability('test-device');
      expect(hasSms).toBe(true);
    });

    it('should return false for device without SMS capability', async () => {
      mockGetDevices.mockResolvedValue([
        {
          iden: 'test-device',
          nickname: 'Test Device',
          type: 'android',
          active: true,
          created: 1234567890,
          modified: 1234567890,
          has_sms: false,
        },
      ]);

      const hasSms =
        await smsApiClient.verifyDeviceSmsCapability('test-device');
      expect(hasSms).toBe(false);
    });

    it('should return false for device not found', async () => {
      mockGetDevices.mockResolvedValue([]);

      const hasSms =
        await smsApiClient.verifyDeviceSmsCapability('invalid-device');
      expect(hasSms).toBe(false);
    });
  });

  describe('isDeviceOnline', () => {
    it('should return true for active device', async () => {
      const isOnline = await smsApiClient.isDeviceOnline('test-device');
      expect(isOnline).toBe(true);
    });

    it('should return false for inactive device', async () => {
      mockGetDevices.mockResolvedValue([
        {
          iden: 'test-device',
          nickname: 'Test Device',
          type: 'android',
          active: false,
          created: 1234567890,
          modified: 1234567890,
          has_sms: true,
        },
      ]);

      const isOnline = await smsApiClient.isDeviceOnline('test-device');
      expect(isOnline).toBe(false);
    });
  });
});
