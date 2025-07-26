/**
 * Unit tests for Rate Limit Manager
 */

import {
  rateLimitManager,
  RateState,
  BackoffState,
} from '../../src/background/rateLimitManager';

// Mock storage
const mockStorage = new Map<string, any>();

jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn((key: string) => Promise.resolve(mockStorage.get(key))),
  setLocal: jest.fn((key: string, value: any) =>
    Promise.resolve(mockStorage.set(key, value))
  ),
}));

describe('Rate Limit Manager', () => {
  beforeEach(() => {
    mockStorage.clear();
    rateLimitManager.clearState();
  });

  describe('parseHeaders', () => {
    it('should parse valid rate limit headers', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return '32768';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return '1432447070';
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);

      const rateState = rateLimitManager.getRateState();
      expect(rateState).toEqual({
        limit: 32768,
        remaining: 32765,
        reset: 1432447070,
        lastUpdated: expect.any(Number),
      });
    });

    it('should not parse headers if any are missing', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return '32768';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return null; // Missing
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);

      const rateState = rateLimitManager.getRateState();
      expect(rateState).toBeNull();
    });

    it('should handle invalid header values', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return 'invalid';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return '1432447070';
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);

      const rateState = rateLimitManager.getRateState();
      expect(rateState).toEqual({
        limit: NaN,
        remaining: 32765,
        reset: 1432447070,
        lastUpdated: expect.any(Number),
      });
    });
  });

  describe('backoff management', () => {
    it('should start backoff correctly', () => {
      rateLimitManager.startBackoff();

      const backoffState = rateLimitManager.getBackoffState();
      expect(backoffState.isActive).toBe(true);
      expect(backoffState.backoffSeconds).toBe(30); // Doubled from initial 15
      expect(backoffState.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should increase backoff exponentially', () => {
      rateLimitManager.startBackoff(); // 15 -> 30
      rateLimitManager.startBackoff(); // 30 -> 60
      rateLimitManager.startBackoff(); // 60 -> 120
      rateLimitManager.startBackoff(); // 120 -> 240
      rateLimitManager.startBackoff(); // 240 -> 300 (max)

      const backoffState = rateLimitManager.getBackoffState();
      expect(backoffState.backoffSeconds).toBe(300);
    });

    it('should not exceed maximum backoff', () => {
      // Start with maximum backoff by calling startBackoff multiple times
      rateLimitManager.startBackoff(); // 15 -> 30
      rateLimitManager.startBackoff(); // 30 -> 60
      rateLimitManager.startBackoff(); // 60 -> 120
      rateLimitManager.startBackoff(); // 120 -> 240
      rateLimitManager.startBackoff(); // 240 -> 300
      rateLimitManager.startBackoff(); // 300 -> 300 (should not exceed)

      const newBackoffState = rateLimitManager.getBackoffState();
      expect(newBackoffState.backoffSeconds).toBe(300); // Should not exceed 300
    });

    it('should reset backoff correctly', () => {
      rateLimitManager.startBackoff();
      rateLimitManager.resetBackoff();

      const backoffState = rateLimitManager.getBackoffState();
      expect(backoffState.isActive).toBe(false);
      expect(backoffState.backoffSeconds).toBe(15); // Reset to initial value
      expect(backoffState.expiresAt).toBe(0);
    });

    it('should check if backoff is active', () => {
      expect(rateLimitManager.isBackoffActive()).toBe(false);

      rateLimitManager.startBackoff();
      expect(rateLimitManager.isBackoffActive()).toBe(true);
    });

    it('should calculate remaining backoff time', () => {
      rateLimitManager.startBackoff();

      const remaining = rateLimitManager.getBackoffRemainingSeconds();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30); // Should be <= backoff duration
    });
  });

  describe('state persistence', () => {
    it('should load state from storage', async () => {
      const mockRateState: RateState = {
        limit: 32768,
        remaining: 32765,
        reset: 1432447070,
        lastUpdated: Date.now(),
      };

      const mockBackoffState: BackoffState = {
        isActive: true,
        backoffSeconds: 30,
        expiresAt: Date.now() + 30000,
      };

      mockStorage.set('pb_rate_state', mockRateState);
      mockStorage.set('pb_backoff_state', mockBackoffState);

      await rateLimitManager.loadState();

      expect(rateLimitManager.getRateState()).toEqual(mockRateState);
      expect(rateLimitManager.getBackoffState()).toEqual(mockBackoffState);
    });

    it('should handle missing storage data', async () => {
      await rateLimitManager.loadState();

      expect(rateLimitManager.getRateState()).toBeNull();
      expect(rateLimitManager.getBackoffState()).toEqual({
        isActive: false,
        backoffSeconds: 15,
        expiresAt: 0,
      });
    });
  });

  describe('utility methods', () => {
    it('should get remaining quota', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return '32768';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return '1432447070';
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);
      expect(rateLimitManager.getRemaining()).toBe(32765);
    });

    it('should get quota limit', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return '32768';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return '1432447070';
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);
      expect(rateLimitManager.getLimit()).toBe(32768);
    });

    it('should get reset time', () => {
      const mockResponse = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'X-Ratelimit-Limit':
                return '32768';
              case 'X-Ratelimit-Remaining':
                return '32765';
              case 'X-Ratelimit-Reset':
                return '1432447070';
              default:
                return null;
            }
          }),
        },
      } as any;

      rateLimitManager.parseHeaders(mockResponse);
      expect(rateLimitManager.getResetTime()).toBe(1432447070);
    });

    it('should return 0 for missing state', () => {
      expect(rateLimitManager.getRemaining()).toBe(0);
      expect(rateLimitManager.getLimit()).toBe(0);
      expect(rateLimitManager.getResetTime()).toBe(0);
    });
  });
});
