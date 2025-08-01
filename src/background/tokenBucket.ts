/**
 * Token Bucket Manager for Pushbridge extension
 * Implements token bucket algorithm for rate limiting
 */

export interface TokenBucketStatus {
  bucket: number; // Current tokens in bucket
  remaining: number; // Remaining quota from API
  lastRefill: number; // Last refill timestamp
}

class TokenBucket {
  private bucket: number = 60; // Start with reasonable tokens for initial requests
  private lastRefill: number = 0;
  private readonly maxBucketSize: number = 240; // Maximum bucket size
  private lastKnownRemaining: number = 0; // Track last known remaining quota from API
  private lastTimeBasedRefill: number = 0; // Track last time-based refill

  // Throttling for consume logging
  private lastConsumeLogTime: number = 0;
  private readonly consumeLogThrottleInterval: number = 5000; // 5 seconds

  /**
   * Initialize the token bucket with default tokens
   * This allows initial API requests to proceed
   */
  initialize(): void {
    if (this.bucket === 0 && this.lastRefill === 0) {
      this.bucket = 120; // Start with 120 tokens (half of max)
      this.lastRefill = Date.now();
      console.log(
        `[TokenBucket] Initialized with ${this.bucket} tokens for startup`
      );
    }
  }

  /**
   * Refill bucket at start of each minute
   * @param remaining - Remaining quota from API
   */
  refillBucket(remaining: number): void {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000; // Start of current minute

    // Update last known remaining quota
    this.lastKnownRemaining = remaining;

    // Handle first refill (initialization case)
    if (this.lastRefill === 0) {
      this.bucket = Math.min(remaining, this.maxBucketSize);
      this.lastRefill = minuteStart;
      console.log(
        `[TokenBucket] First refill: 0 → ${this.bucket} tokens (API remaining: ${remaining})`
      );
      return;
    }

    if (this.lastRefill < minuteStart) {
      const previousBucket = this.bucket;
      // Set bucket to min(remaining, 120) as per the plan
      this.bucket = Math.min(remaining, this.maxBucketSize);
      this.lastRefill = minuteStart;

      console.log(
        `[TokenBucket] Response-based refill: ${previousBucket} → ${this.bucket} tokens (API remaining: ${remaining}, minute: ${new Date(minuteStart).toISOString()})`
      );
    } else {
      // Log when we try to refill but it's not time yet
      const timeUntilRefill = minuteStart + 60000 - now;
      if (this.bucket <= 5) {
        // Only log when bucket is low
        console.log(
          `[TokenBucket] Refill not due yet - ${Math.ceil(timeUntilRefill / 1000)}s remaining (bucket: ${this.bucket})`
        );
      }
    }
  }

  /**
   * Check if time-based refill is due and perform it
   * This method can be called independently of API responses
   */
  checkAndRefill(): boolean {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000;

    // Check if refill is due
    if (this.lastRefill < minuteStart) {
      const estimatedRemaining = this.getEstimatedRemaining();
      const previousBucket = this.bucket;
      
      this.bucket = Math.min(estimatedRemaining, this.maxBucketSize);
      this.lastRefill = minuteStart;
      this.lastTimeBasedRefill = now;

      console.log(
        `[TokenBucket] Time-based refill: ${previousBucket} → ${this.bucket} tokens (estimated remaining: ${estimatedRemaining}, minute: ${new Date(minuteStart).toISOString()})`
      );
      
      return true; // Refill occurred
    }

    return false; // No refill needed
  }

  /**
   * Force a time-based refill (for emergency situations)
   */
  forceTimeBasedRefill(): void {
    const estimatedRemaining = this.getEstimatedRemaining();
    const previousBucket = this.bucket;
    
    this.bucket = Math.min(estimatedRemaining, this.maxBucketSize);
    this.lastRefill = Date.now();
    this.lastTimeBasedRefill = Date.now();

    console.log(
      `[TokenBucket] Emergency time-based refill: ${previousBucket} → ${this.bucket} tokens (estimated remaining: ${estimatedRemaining})`
    );
  }

  /**
   * Get estimated remaining quota for time-based refills
   * Uses last known API remaining or conservative estimate
   */
  private getEstimatedRemaining(): number {
    // If we have recent API data, use it
    if (this.lastKnownRemaining > 0) {
      return this.lastKnownRemaining;
    }

    // Conservative estimate: assume we get 60 tokens per minute
    // This is based on typical API rate limits
    const conservativeEstimate = 60;
    
    console.log(
      `[TokenBucket] No recent API data, using conservative estimate: ${conservativeEstimate} tokens`
    );
    
    return conservativeEstimate;
  }

  /**
   * Check if operation can consume tokens
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns true if enough tokens available
   */
  canConsume(tokens: number = 1): boolean {
    return this.bucket >= tokens;
  }

  /**
   * Consume tokens from bucket
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed successfully
   */
  consume(tokens: number = 1): boolean {
    if (!this.canConsume(tokens)) {
      return false;
    }

    this.bucket -= tokens;

    // Throttle consume logging to prevent spam
    const now = Date.now();
    if (now - this.lastConsumeLogTime > this.consumeLogThrottleInterval) {
      console.log(`Consumed ${tokens} token(s), ${this.bucket} remaining`);
      this.lastConsumeLogTime = now;
    }

    return true;
  }

  /**
   * Get current bucket status
   */
  getStatus(): TokenBucketStatus {
    return {
      bucket: this.bucket,
      remaining: this.lastKnownRemaining,
      lastRefill: this.lastRefill,
    };
  }

  /**
   * Get current bucket size
   */
  getBucketSize(): number {
    return this.bucket;
  }

  /**
   * Get last refill time
   */
  getLastRefill(): number {
    return this.lastRefill;
  }

  /**
   * Force refill bucket (for testing or manual override)
   * @param remaining - Remaining quota from API
   */
  forceRefill(remaining: number): void {
    this.bucket = Math.min(remaining, this.maxBucketSize);
    this.lastRefill = Date.now();
    this.lastKnownRemaining = remaining;
    console.log(`Token bucket force refilled: ${this.bucket} tokens`);
  }

  /**
   * Reset bucket (for testing or reset scenarios)
   */
  reset(): void {
    this.bucket = 0;
    this.lastRefill = 0;
    this.lastKnownRemaining = 0;
    this.lastTimeBasedRefill = 0;
    console.log('Token bucket reset');
  }

  /**
   * Get time until next refill (in milliseconds)
   */
  getTimeUntilNextRefill(): number {
    const now = Date.now();
    const currentMinuteStart = Math.floor(now / 60000) * 60000;
    const nextMinuteStart = currentMinuteStart + 60000;
    return nextMinuteStart - now;
  }

  /**
   * Check if bucket needs refill
   */
  needsRefill(): boolean {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000;
    return this.lastRefill < minuteStart;
  }

  /**
   * Get detailed bucket status for debugging
   */
  getDetailedStatus(): {
    bucket: number;
    maxBucketSize: number;
    lastRefill: number;
    lastRefillDate: string;
    nextRefillIn: number;
    canConsume1: boolean;
    lastKnownRemaining: number;
    lastTimeBasedRefill: number;
  } {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000;
    const nextRefill = minuteStart + 60000;

    return {
      bucket: this.bucket,
      maxBucketSize: this.maxBucketSize,
      lastRefill: this.lastRefill,
      lastRefillDate: new Date(this.lastRefill).toISOString(),
      nextRefillIn: Math.ceil((nextRefill - now) / 1000),
      canConsume1: this.canConsume(1),
      lastKnownRemaining: this.lastKnownRemaining,
      lastTimeBasedRefill: this.lastTimeBasedRefill,
    };
  }
}

// Export singleton instance
export const tokenBucket = new TokenBucket();
