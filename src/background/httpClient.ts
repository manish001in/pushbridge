/**
 * HTTP Client Wrapper for Pushbridge extension
 * Centralized point for all API calls with rate limiting
 */

// Define RequestInit for Chrome extension context
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  [key: string]: any;
}

import { operationQueue } from './operationQueue';
import { rateLimitManager } from './rateLimitManager';
import { tokenBucket } from './tokenBucket';
import { userFeedback } from './userFeedback';

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class HttpClient {
  // Throttling for log messages
  private lastNoTokensLogTime: number = 0;
  private readonly logThrottleInterval: number = 5000; // 5 seconds

  /**
   * Initialize HTTP client
   */
  async initialize(): Promise<void> {
    console.log('[HTTP] HTTP client initialized');

    // Load rate limit state from storage
    await rateLimitManager.loadState();

    // Initialize operation queue
    await operationQueue.initialize();

    // Ensure token bucket is ready for initial requests
    tokenBucket.initialize();
  }

  /**
   * Make an HTTP request with rate limiting
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to Response
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const method = options.method || 'GET';

    console.log(`🌐 [HTTP-${requestId}] ${method} ${url}`);
    console.log(`📋 [HTTP-${requestId}] Request options:`, {
      method,
      headers: options.headers,
      body: options.body
        ? options.body.length > 200
          ? options.body.substring(0, 200) + '...'
          : options.body
        : undefined,
    });

    // 1. Check if backoff is active
    if (rateLimitManager.isBackoffActive()) {
      const remainingSeconds = rateLimitManager.getBackoffRemainingSeconds();
      console.log(
        `⏳ [HTTP-${requestId}] Backoff active, queuing operation. ${remainingSeconds}s remaining`
      );

      // Show user feedback if not already showing
      if (!userFeedback.isRateLimitNotificationActive()) {
        await userFeedback.showRateLimitNotification(remainingSeconds);
      }

      // Queue the operation
      return operationQueue.enqueue({ url, options });
    }

    // 2. Check token bucket
    if (!tokenBucket.canConsume(1)) {
      // Throttle this log message
      const now = Date.now();
      if (now - this.lastNoTokensLogTime > this.logThrottleInterval) {
        const bucketSize = tokenBucket.getBucketSize();
        console.log(
          `⏳ [HTTP-${requestId}] No tokens available, queuing operation (bucket: ${bucketSize})`
        );
        this.lastNoTokensLogTime = now;
      }

      // Queue the operation
      return operationQueue.enqueue({ url, options });
    }

    // 3. Make the request
    try {
      console.log(`🚀 [HTTP-${requestId}] Making API request`);

      // Consume token
      tokenBucket.consume(1);

      const startTime = Date.now();
      // Use fetch directly - guaranteed in Manifest V3
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;

      console.log(`📡 [HTTP-${requestId}] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // 4. Parse rate limit headers
      rateLimitManager.parseHeaders(response);

      // 5. Refill token bucket with new remaining quota
      tokenBucket.refillBucket(rateLimitManager.getRemaining());

      // 6. Reset backoff on successful request
      rateLimitManager.resetBackoff();

      // 7. Clear rate limit notification if it was showing
      if (userFeedback.isRateLimitNotificationActive()) {
        await userFeedback.clearRateLimitNotification();
      }

      // 8. Handle 429 errors
      if (response.status === 429) {
        console.error(
          `❌ [HTTP-${requestId}] Rate limited (429) - Starting backoff`
        );
        const headers = {
          'X-Ratelimit-Limit': response.headers.get('X-Ratelimit-Limit'),
          'X-Ratelimit-Remaining': response.headers.get(
            'X-Ratelimit-Remaining'
          ),
          'X-Ratelimit-Reset': response.headers.get('X-Ratelimit-Reset'),
        };
        console.log(`[HTTP-${requestId}] Rate limit headers on 429:`, headers);
        await this.handle429Error();
        throw new RateLimitError('Rate limited');
      }

      // Log response body for debugging (if it's JSON and not too large)
      if (
        response.ok &&
        response.headers.get('content-type')?.includes('application/json')
      ) {
        try {
          const responseText = await response.text();
          const responseData = JSON.parse(responseText);

          // Clone the response since we consumed the body
          const clonedResponse = new Response(responseText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

          console.log(`✅ [HTTP-${requestId}] Response data:`, {
            dataType: typeof responseData,
            isArray: Array.isArray(responseData),
            length: Array.isArray(responseData)
              ? responseData.length
              : undefined,
            keys: !Array.isArray(responseData)
              ? Object.keys(responseData)
              : undefined,
            sample:
              Array.isArray(responseData) && responseData.length > 0
                ? responseData[0]
                : responseData,
          });

          return clonedResponse;
        } catch (parseError) {
          console.warn(
            `⚠️ [HTTP-${requestId}] Could not parse JSON response:`,
            parseError
          );
          // Return original response if we can't parse it
          return response;
        }
      }

      console.log(`✅ [HTTP-${requestId}] Request completed successfully`);
      return response;
    } catch (error) {
      // Handle network errors or other fetch failures
      console.error(`❌ [HTTP-${requestId}] HTTP request failed:`, {
        error,
        type: typeof error,
        isResponse: error instanceof Response,
        status: error instanceof Response ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      });

      // If it's a 429 error from the response (shouldn't happen in catch, but just in case)
      if (error instanceof Response && error.status === 429) {
        console.log(
          `[HTTP-${requestId}] 429 error caught in catch block (unexpected)`
        );
        await this.handle429Error();
        throw new RateLimitError('Rate limited');
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Handle 429 rate limit errors
   */
  private async handle429Error(): Promise<void> {
    console.log('[HTTP] Handling 429 error - starting backoff sequence');

    // Start exponential backoff
    rateLimitManager.startBackoff();

    // Show user feedback
    const backoffSeconds = rateLimitManager.getBackoffRemainingSeconds();
    console.log(`[HTTP] Backoff duration: ${backoffSeconds}s`);
    await userFeedback.showRateLimitNotification(backoffSeconds);

    // Stop queue processing (it will resume when backoff expires)
    operationQueue.stopProcessing();
    console.log('[HTTP] Queue processing stopped due to 429 error');
  }

  /**
   * Get current rate limiting status
   */
  getStatus(): {
    rateState: ReturnType<typeof rateLimitManager.getRateState>;
    backoffState: ReturnType<typeof rateLimitManager.getBackoffState>;
    tokenBucket: ReturnType<typeof tokenBucket.getStatus>;
    queueStatus: ReturnType<typeof operationQueue.getQueueStatus>;
  } {
    return {
      rateState: rateLimitManager.getRateState(),
      backoffState: rateLimitManager.getBackoffState(),
      tokenBucket: tokenBucket.getStatus(),
      queueStatus: operationQueue.getQueueStatus(),
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    operationQueue.cleanup();
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
