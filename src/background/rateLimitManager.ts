/**
 * Rate Limit State Manager for Pushbridge extension
 * Handles parsing of X-Ratelimit-* headers and manages rate limiting state
 */

import { getLocal, setLocal } from './storage';

export interface RateState {
  limit: number; // X-Ratelimit-Limit
  remaining: number; // X-Ratelimit-Remaining
  reset: number; // X-Ratelimit-Reset (Unix timestamp)
  lastUpdated: number; // When headers were last parsed
}

export interface BackoffState {
  isActive: boolean;
  backoffSeconds: number; // Current backoff duration (15s → 30s → 60s → 120s → 240s → 300s)
  expiresAt: number; // When backoff expires
}

class RateLimitManager {
  private rateState: RateState | null = null;
  private backoffState: BackoffState = {
    isActive: false,
    backoffSeconds: 15,
    expiresAt: 0, // This is fine when isActive=false
  };

  /**
   * Parse rate limit headers from API response
   */
  parseHeaders(response: Response): void {
    const limit = response.headers.get('X-Ratelimit-Limit');
    const remaining = response.headers.get('X-Ratelimit-Remaining');
    const reset = response.headers.get('X-Ratelimit-Reset');

    console.log(
      `[RateLimit] Parsing headers - Status: ${response.status}, Limit: ${limit}, Remaining: ${remaining}, Reset: ${reset}`
    );

    if (limit && remaining && reset) {
      this.rateState = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        lastUpdated: Date.now(),
      };

      // Persist state
      this.persistState();

      console.log('[RateLimit] Rate limit headers parsed:', this.rateState);
    } else {
      console.log(
        '[RateLimit] No rate limit headers found or incomplete headers'
      );
    }
  }

  /**
   * Get current rate state
   */
  getRateState(): RateState | null {
    return this.rateState;
  }

  /**
   * Get remaining quota
   */
  getRemaining(): number {
    return this.rateState?.remaining || 0;
  }

  /**
   * Get quota limit
   */
  getLimit(): number {
    return this.rateState?.limit || 0;
  }

  /**
   * Get reset time
   */
  getResetTime(): number {
    return this.rateState?.reset || 0;
  }

  /**
   * Check if backoff is currently active
   */
  isBackoffActive(): boolean {
    console.log(
      `[RateLimit] Checking backoff state: isActive=${this.backoffState.isActive}, expiresAt=${this.backoffState.expiresAt}, now=${Date.now()}`
    );

    if (!this.backoffState.isActive) {
      return false;
    }

    // Validate that we have a valid expiresAt when active
    if (this.backoffState.expiresAt <= 0) {
      console.error(
        `[RateLimit] INVALID STATE: backoff is active but expiresAt=${this.backoffState.expiresAt}. Deactivating.`
      );
      this.backoffState.isActive = false;
      this.persistBackoffState();
      return false;
    }

    // Check if backoff has expired
    if (Date.now() > this.backoffState.expiresAt) {
      console.log('[RateLimit] Backoff expired, deactivating');
      this.backoffState.isActive = false;
      this.persistBackoffState();
      return false;
    }

    const remainingMs = this.backoffState.expiresAt - Date.now();
    console.log(
      `[RateLimit] Backoff still active, ${Math.ceil(remainingMs / 1000)}s remaining`
    );
    return true;
  }

  /**
   * Get backoff state
   */
  getBackoffState(): BackoffState {
    return { ...this.backoffState };
  }

  /**
   * Calculate time until backoff expires (in seconds)
   */
  getBackoffRemainingSeconds(): number {
    if (!this.backoffState.isActive) {
      return 0;
    }

    const remaining = Math.ceil(
      (this.backoffState.expiresAt - Date.now()) / 1000
    );
    return Math.max(0, remaining);
  }

  /**
   * Start exponential backoff
   */
  startBackoff(): void {
    console.log(
      `[RateLimit] Starting backoff - Current state:`,
      this.backoffState
    );

    const currentBackoffDuration = this.backoffState.backoffSeconds;
    const expiresAt = Date.now() + currentBackoffDuration * 1000;

    this.backoffState.isActive = true;
    this.backoffState.expiresAt = expiresAt;

    // Increase backoff for next time (exponential: 15s → 30s → 60s → 120s → 240s → 300s)
    this.backoffState.backoffSeconds = Math.min(
      this.backoffState.backoffSeconds * 2,
      300
    );

    // Validate the state before persisting
    if (this.backoffState.isActive && this.backoffState.expiresAt <= 0) {
      console.error(
        `[RateLimit] CRITICAL BUG: About to persist invalid backoff state!`,
        this.backoffState
      );
    }

    this.persistBackoffState();

    console.log(
      `[RateLimit] Backoff started: ${currentBackoffDuration}s active until ${new Date(expiresAt).toISOString()}, next backoff will be ${this.backoffState.backoffSeconds}s`
    );
  }

  /**
   * Reset backoff (when successful request is made)
   * Only resets if we were actually in backoff state
   */
  resetBackoff(): void {
    const wasActive = this.backoffState.isActive;

    // Only reset if we were actually in backoff
    if (!wasActive) {
      return;
    }

    console.log(
      '[RateLimit] Resetting backoff state due to successful request'
    );

    this.backoffState.isActive = false;
    this.backoffState.backoffSeconds = 15; // Reset to initial value
    this.backoffState.expiresAt = 0; // Safe to set to 0 when isActive=false

    this.persistBackoffState();

    console.log(
      '[RateLimit] Backoff reset due to successful request after being active'
    );
  }

  /**
   * Persist rate state to storage
   */
  private async persistState(): Promise<void> {
    try {
      await setLocal('pb_rate_state', this.rateState);
    } catch (error) {
      console.error('Failed to persist rate state:', error);
    }
  }

  /**
   * Persist backoff state to storage
   */
  private async persistBackoffState(): Promise<void> {
    try {
      await setLocal('pb_backoff_state', this.backoffState);
    } catch (error) {
      console.error('Failed to persist backoff state:', error);
    }
  }

  /**
   * Load state from storage
   */
  async loadState(): Promise<void> {
    try {
      console.log('[RateLimit] Loading state from storage...');

      const [rateState, backoffState] = await Promise.all([
        getLocal<RateState>('pb_rate_state'),
        getLocal<BackoffState>('pb_backoff_state'),
      ]);

      console.log('[RateLimit] Retrieved from storage:', {
        rateState,
        backoffState,
      });

      if (rateState) {
        this.rateState = rateState;
        console.log('[RateLimit] Rate state loaded from storage');
      } else {
        console.log('[RateLimit] No rate state found in storage');
      }

      if (backoffState) {
        this.backoffState = backoffState;
        console.log(
          '[RateLimit] Backoff state loaded from storage:',
          backoffState
        );

        // Check if the loaded backoff is still valid
        if (backoffState.isActive && Date.now() > backoffState.expiresAt) {
          console.log('[RateLimit] Loaded backoff was expired, deactivating');
          this.backoffState.isActive = false;
          this.backoffState.expiresAt = 0;
          this.persistBackoffState();
        }

        // Validate the loaded state for consistency
        this.validateBackoffState();
      } else {
        console.log(
          '[RateLimit] No backoff state found in storage, using defaults'
        );
      }

      console.log('[RateLimit] Final state after loading:', {
        rateState: this.rateState,
        backoffState: this.backoffState,
      });
    } catch (error) {
      console.error('[RateLimit] Failed to load rate limit state:', error);
    }
  }

  /**
   * Clear all state (for testing or reset)
   */
  async clearState(): Promise<void> {
    this.rateState = null;
    this.backoffState = {
      isActive: false,
      backoffSeconds: 15,
      expiresAt: 0,
    };

    try {
      await Promise.all([
        setLocal('pb_rate_state', null),
        setLocal('pb_backoff_state', null),
      ]);
    } catch (error) {
      console.error('Failed to clear rate limit state:', error);
    }
  }

  /**
   * Get debug information about current state
   */
  getDebugInfo(): {
    backoffState: BackoffState;
    rateState: RateState | null;
    isBackoffActive: boolean;
    remainingSeconds: number;
    currentTime: number;
  } {
    return {
      backoffState: { ...this.backoffState },
      rateState: this.rateState ? { ...this.rateState } : null,
      isBackoffActive: this.isBackoffActive(),
      remainingSeconds: this.getBackoffRemainingSeconds(),
      currentTime: Date.now(),
    };
  }

  /**
   * Validate and fix backoff state consistency
   */
  private validateBackoffState(): void {
    // If active but no valid expiration time, fix it
    if (this.backoffState.isActive && this.backoffState.expiresAt <= 0) {
      console.error(
        '[RateLimit] FIXING INVALID STATE: backoff active but expiresAt <= 0'
      );

      // Either deactivate or set a reasonable expiration
      if (this.backoffState.backoffSeconds > 0) {
        // Set expiration based on current backoff duration
        this.backoffState.expiresAt =
          Date.now() + this.backoffState.backoffSeconds * 1000;
        console.log(
          `[RateLimit] Fixed by setting expiresAt to ${new Date(this.backoffState.expiresAt).toISOString()}`
        );
      } else {
        // Deactivate if we don't have a valid duration
        this.backoffState.isActive = false;
        this.backoffState.expiresAt = 0;
        console.log('[RateLimit] Fixed by deactivating backoff');
      }

      this.persistBackoffState();
    }
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();
