/**
 * Unit tests for Token Bucket
 */

import { tokenBucket } from '../../src/background/tokenBucket';

describe('Token Bucket', () => {
  beforeEach(() => {
    tokenBucket.reset();
  });

  describe('refillBucket', () => {
    it('should refill bucket at start of each minute', () => {
      const remaining = 100;
      tokenBucket.refillBucket(remaining);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(100); // min(100, 120)
      expect(status.lastRefill).toBeGreaterThan(0);
    });

    it('should not refill if already refilled in current minute', () => {
      const remaining = 100;
      tokenBucket.refillBucket(remaining);

      const firstRefill = tokenBucket.getLastRefill();

      // Try to refill again immediately
      tokenBucket.refillBucket(remaining);

      const secondRefill = tokenBucket.getLastRefill();
      expect(secondRefill).toBe(firstRefill); // Should not change
    });

    it('should cap bucket at maximum size', () => {
      const remaining = 300; // More than max bucket size (240)
      tokenBucket.refillBucket(remaining);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(240); // Should be capped at 240
    });

    it('should refill when minute changes', () => {
      const remaining = 100;
      tokenBucket.refillBucket(remaining);

      // Simulate time passing to next minute
      const originalRefill = tokenBucket.getLastRefill();
      const nextMinute = Math.floor(originalRefill / 60000) * 60000 + 60000;

      // Mock Date.now to return next minute
      const originalNow = Date.now;
      Date.now = jest.fn(() => nextMinute);

      tokenBucket.refillBucket(remaining);

      const newRefill = tokenBucket.getLastRefill();
      expect(newRefill).toBe(nextMinute);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('token consumption', () => {
    it('should consume tokens successfully', () => {
      tokenBucket.refillBucket(100);

      expect(tokenBucket.canConsume(1)).toBe(true);
      expect(tokenBucket.consume(1)).toBe(true);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(99);
    });

    it('should not consume more tokens than available', () => {
      tokenBucket.refillBucket(10);

      expect(tokenBucket.canConsume(15)).toBe(false);
      expect(tokenBucket.consume(15)).toBe(false);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(10); // Should remain unchanged
    });

    it('should consume multiple tokens', () => {
      tokenBucket.refillBucket(100);

      expect(tokenBucket.consume(5)).toBe(true);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(95);
    });

    it('should check if can consume tokens', () => {
      tokenBucket.refillBucket(10);

      expect(tokenBucket.canConsume(5)).toBe(true);
      expect(tokenBucket.canConsume(10)).toBe(true);
      expect(tokenBucket.canConsume(15)).toBe(false);
    });

    it('should handle zero token consumption', () => {
      tokenBucket.refillBucket(100);

      expect(tokenBucket.canConsume(0)).toBe(true);
      expect(tokenBucket.consume(0)).toBe(true);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(100); // Should remain unchanged
    });
  });

  describe('status and information', () => {
    it('should get current bucket status', () => {
      tokenBucket.refillBucket(100);
      tokenBucket.consume(20);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(80);
      expect(status.lastRefill).toBeGreaterThan(0);
    });

    it('should get bucket size', () => {
      tokenBucket.refillBucket(100);
      expect(tokenBucket.getBucketSize()).toBe(100);

      tokenBucket.consume(30);
      expect(tokenBucket.getBucketSize()).toBe(70);
    });

    it('should get last refill time', () => {
      tokenBucket.refillBucket(100);

      const lastRefill = tokenBucket.getLastRefill();
      expect(lastRefill).toBeGreaterThan(0);

      // Should be set to start of current minute
      const currentMinuteStart = Math.floor(Date.now() / 60000) * 60000;
      expect(lastRefill).toBe(currentMinuteStart);
    });

    it('should calculate time until next refill', () => {
      const timeUntilNext = tokenBucket.getTimeUntilNextRefill();
      expect(timeUntilNext).toBeGreaterThan(0);
      expect(timeUntilNext).toBeLessThanOrEqual(60000); // Should be <= 1 minute
    });

    it('should check if bucket needs refill', () => {
      expect(tokenBucket.needsRefill()).toBe(true); // No refill yet

      tokenBucket.refillBucket(100);
      expect(tokenBucket.needsRefill()).toBe(false); // Just refilled
    });
  });

  describe('force refill', () => {
    it('should force refill bucket', () => {
      tokenBucket.refillBucket(100);
      tokenBucket.consume(50);

      const beforeForce = tokenBucket.getBucketSize();
      expect(beforeForce).toBe(50);

      tokenBucket.forceRefill(80);

      const afterForce = tokenBucket.getBucketSize();
      expect(afterForce).toBe(80); // Should be set to min(80, 120)
    });

    it('should update last refill time on force refill', () => {
      const originalRefill = tokenBucket.getLastRefill();

      // Wait a bit
      setTimeout(() => {}, 10);

      tokenBucket.forceRefill(100);

      const newRefill = tokenBucket.getLastRefill();
      expect(newRefill).toBeGreaterThan(originalRefill);
    });
  });

  describe('reset', () => {
    it('should reset bucket to initial state', () => {
      tokenBucket.refillBucket(100);
      tokenBucket.consume(30);
      tokenBucket.forceRefill(50);

      tokenBucket.reset();

      expect(tokenBucket.getBucketSize()).toBe(0);
      expect(tokenBucket.getLastRefill()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle negative remaining quota', () => {
      tokenBucket.refillBucket(-10);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(-10); // Should allow negative values
    });

    it('should handle zero remaining quota', () => {
      tokenBucket.refillBucket(0);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(0);

      expect(tokenBucket.canConsume(1)).toBe(false);
      expect(tokenBucket.consume(1)).toBe(false);
    });

    it('should handle very large remaining quota', () => {
      tokenBucket.refillBucket(1000000);

      const status = tokenBucket.getStatus();
      expect(status.bucket).toBe(240); // Should be capped at max bucket size
    });
  });
});
