/**
 * Unit tests for HTTP Client
 */

import { httpClient, RateLimitError } from '../../src/background/httpClient';
import { operationQueue } from '../../src/background/operationQueue';
import { rateLimitManager } from '../../src/background/rateLimitManager';
import { tokenBucket } from '../../src/background/tokenBucket';
import { userFeedback } from '../../src/background/userFeedback';

// Mock dependencies
jest.mock('../../src/background/rateLimitManager');
jest.mock('../../src/background/tokenBucket');
jest.mock('../../src/background/operationQueue');
jest.mock('../../src/background/userFeedback');

const mockRateLimitManager = rateLimitManager as jest.Mocked<
  typeof rateLimitManager
>;
const mockTokenBucket = tokenBucket as jest.Mocked<typeof tokenBucket>;
const mockOperationQueue = operationQueue as jest.Mocked<typeof operationQueue>;
const mockUserFeedback = userFeedback as jest.Mocked<typeof userFeedback>;

// Mock global fetch
global.fetch = jest.fn();

describe('HTTP Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks to default behavior
    mockRateLimitManager.isBackoffActive.mockReturnValue(false);
    mockRateLimitManager.getBackoffRemainingSeconds.mockReturnValue(0);
    mockRateLimitManager.getRemaining.mockReturnValue(32765);
    mockRateLimitManager.resetBackoff.mockImplementation(() => {});
    mockRateLimitManager.parseHeaders.mockImplementation(() => {});

    mockTokenBucket.canConsume.mockReturnValue(true);
    mockTokenBucket.consume.mockReturnValue(true);
    mockTokenBucket.refillBucket.mockImplementation(() => {});

    mockOperationQueue.enqueue.mockResolvedValue(new Response());

    mockUserFeedback.isRateLimitNotificationActive.mockReturnValue(false);
    mockUserFeedback.showRateLimitNotification.mockResolvedValue();
    mockUserFeedback.clearRateLimitNotification.mockResolvedValue();
  });

  describe('fetch', () => {
    it('should make successful API call when no rate limiting is active', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'X-Ratelimit-Limit': '32768',
          'X-Ratelimit-Remaining': '32765',
          'X-Ratelimit-Reset': '1432447070',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await httpClient.fetch(
        'https://api.pushbullet.com/v2/test'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/test',
        {}
      );
      expect(mockRateLimitManager.parseHeaders).toHaveBeenCalledWith(
        mockResponse
      );
      expect(mockTokenBucket.refillBucket).toHaveBeenCalledWith(32765);
      expect(mockRateLimitManager.resetBackoff).toHaveBeenCalled();
      expect(result).toBe(mockResponse);
    });

    it('should queue operation when backoff is active', async () => {
      mockRateLimitManager.isBackoffActive.mockReturnValue(true);
      mockRateLimitManager.getBackoffRemainingSeconds.mockReturnValue(30);
      mockUserFeedback.isRateLimitNotificationActive.mockReturnValue(false);

      const mockQueuedResponse = new Response(JSON.stringify({ queued: true }));
      mockOperationQueue.enqueue.mockResolvedValue(mockQueuedResponse);

      const result = await httpClient.fetch(
        'https://api.pushbullet.com/v2/test'
      );

      expect(mockOperationQueue.enqueue).toHaveBeenCalledWith({
        url: 'https://api.pushbullet.com/v2/test',
        options: {},
      });
      expect(mockUserFeedback.showRateLimitNotification).toHaveBeenCalledWith(
        30
      );
      expect(result).toBe(mockQueuedResponse);
    });

    it('should not show notification if already showing', async () => {
      mockRateLimitManager.isBackoffActive.mockReturnValue(true);
      mockRateLimitManager.getBackoffRemainingSeconds.mockReturnValue(30);
      mockUserFeedback.isRateLimitNotificationActive.mockReturnValue(true);

      const mockQueuedResponse = new Response(JSON.stringify({ queued: true }));
      mockOperationQueue.enqueue.mockResolvedValue(mockQueuedResponse);

      await httpClient.fetch('https://api.pushbullet.com/v2/test');

      expect(mockUserFeedback.showRateLimitNotification).not.toHaveBeenCalled();
    });

    it('should queue operation when no tokens available', async () => {
      mockTokenBucket.canConsume.mockReturnValue(false);

      const mockQueuedResponse = new Response(JSON.stringify({ queued: true }));
      mockOperationQueue.enqueue.mockResolvedValue(mockQueuedResponse);

      const result = await httpClient.fetch(
        'https://api.pushbullet.com/v2/test'
      );

      expect(mockOperationQueue.enqueue).toHaveBeenCalledWith({
        url: 'https://api.pushbullet.com/v2/test',
        options: {},
      });
      expect(result).toBe(mockQueuedResponse);
    });

    it('should handle 429 errors correctly', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: 'rate limited' }),
        {
          status: 429,
          headers: {},
        }
      );

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        httpClient.fetch('https://api.pushbullet.com/v2/test')
      ).rejects.toThrow(RateLimitError);

      expect(mockRateLimitManager.startBackoff).toHaveBeenCalled();
      expect(mockUserFeedback.showRateLimitNotification).toHaveBeenCalled();
      expect(mockOperationQueue.stopProcessing).toHaveBeenCalled();
    });

    it('should clear rate limit notification on successful request', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'X-Ratelimit-Limit': '32768',
          'X-Ratelimit-Remaining': '32765',
          'X-Ratelimit-Reset': '1432447070',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      mockUserFeedback.isRateLimitNotificationActive.mockReturnValue(true);

      await httpClient.fetch('https://api.pushbullet.com/v2/test');

      expect(mockUserFeedback.clearRateLimitNotification).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(
        httpClient.fetch('https://api.pushbullet.com/v2/test')
      ).rejects.toThrow('Network error');
    });

    it('should handle 429 errors from network failures', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: 'rate limited' }),
        {
          status: 429,
          headers: {},
        }
      );

      const networkError = new Error('Network error');
      (networkError as any).response = mockResponse;
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(
        httpClient.fetch('https://api.pushbullet.com/v2/test')
      ).rejects.toThrow('Network error');
    });

    it('should consume token before making request', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'X-Ratelimit-Limit': '32768',
          'X-Ratelimit-Remaining': '32765',
          'X-Ratelimit-Reset': '1432447070',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await httpClient.fetch('https://api.pushbullet.com/v2/test');

      expect(mockTokenBucket.consume).toHaveBeenCalledWith(1);
    });

    it('should pass request options correctly', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'X-Ratelimit-Limit': '32768',
          'X-Ratelimit-Remaining': '32765',
          'X-Ratelimit-Reset': '1432447070',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await httpClient.fetch('https://api.pushbullet.com/v2/test', options);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/test',
        options
      );
    });
  });

  describe('getStatus', () => {
    it('should return current rate limiting status', () => {
      const mockRateState = {
        limit: 32768,
        remaining: 32765,
        reset: 1432447070,
        lastUpdated: Date.now(),
      };
      const mockBackoffState = {
        isActive: false,
        backoffSeconds: 15,
        expiresAt: 0,
      };
      const mockTokenBucketStatus = {
        bucket: 100,
        remaining: 0,
        lastRefill: Date.now(),
      };
      const mockQueueStatus = { pending: 0, processing: false };

      mockRateLimitManager.getRateState.mockReturnValue(mockRateState);
      mockRateLimitManager.getBackoffState.mockReturnValue(mockBackoffState);
      mockTokenBucket.getStatus.mockReturnValue(mockTokenBucketStatus);
      mockOperationQueue.getQueueStatus.mockReturnValue(mockQueueStatus);

      const status = httpClient.getStatus();

      expect(status).toEqual({
        rateState: mockRateState,
        backoffState: mockBackoffState,
        tokenBucket: mockTokenBucketStatus,
        queueStatus: mockQueueStatus,
      });
    });
  });

  describe('initialization', () => {
    it('should initialize rate limit manager and operation queue', async () => {
      await httpClient.initialize();

      expect(mockRateLimitManager.loadState).toHaveBeenCalled();
      expect(mockOperationQueue.initialize).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup operation queue', () => {
      httpClient.cleanup();

      expect(mockOperationQueue.cleanup).toHaveBeenCalled();
    });
  });
});
