/**
 * Operation Queue for Pushbridge extension
 * Handles queuing operations when rate limited and processing them when quota is available
 */

// Define RequestInit for Chrome extension context
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  [key: string]: any;
}

import { rateLimitManager } from './rateLimitManager';
import { getLocal, setLocal } from './storage';
import { tokenBucket } from './tokenBucket';

export interface QueuedOperation {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

export interface PendingOperation {
  url: string;
  options: RequestInit;
}

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxRetryCount: number = 3;
  private readonly processingDelay: number = 5000; // 5 seconds between operations
  private readonly deduplicationThreshold: number = 5; // Deduplicate when queue has more than 5 operations

  // Throttling for log messages
  private lastNoTokensLogTime: number = 0;
  private lastBackoffLogTime: number = 0;
  private readonly logThrottleInterval: number = 5000; // 5 seconds

  // Track if we've made any successful requests yet (for bootstrap)
  private hasBootstrapped: boolean = false;

  /**
   * Check if a URL is eligible for deduplication
   * Currently includes /v2/permanents endpoints and GET /v2/pushes?limit=50
   */
  private isDeduplicatableEndpoint(url: string): boolean {
    return url.includes('/v2/permanents/') || url.includes('/v2/pushes?limit=50');
  }

  /**
   * Merge callbacks from source operation into target operation
   */
  private mergeCallbacks(target: QueuedOperation, source: QueuedOperation): void {
    // Create wrapper functions to call both the original and the merged callbacks
    const originalResolve = target.resolve;
    const originalReject = target.reject;

    target.resolve = (response: Response) => {
      originalResolve(response);
      source.resolve(response);
    };

    target.reject = (error: Error) => {
      originalReject(error);
      source.reject(error);
    };
  }

  /**
   * Deduplicate eligible operations in the queue
   * Currently deduplicates /v2/permanents operations and GET /v2/pushes?limit=50 requests
   */
  private async deduplicateQueue(): Promise<void> {
    if (this.queue.length <= this.deduplicationThreshold) {
      return; // No need to deduplicate
    }

    console.log(`[OperationQueue] Deduplicating queue with ${this.queue.length} operations`);

    // Group operations by URL + method
    const groups = new Map<string, QueuedOperation[]>();

    for (const op of this.queue) {
      if (this.isDeduplicatableEndpoint(op.url)) {
        const method = op.options.method || 'GET';
        
        // For /v2/pushes?limit=50, only deduplicate GET requests
        if (op.url.includes('/v2/pushes?limit=50') && method !== 'GET') {
          continue;
        }
        
        const key = `${op.url}|${method}`;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(op);
      }
    }

    // For each group with duplicates, keep the latest operation
    const deduplicatedQueue: QueuedOperation[] = [];
    let deduplicationCount = 0;

    for (const [key, operations] of groups) {
      if (operations.length > 1) {
        // Sort by timestamp, keep the latest
        operations.sort((a, b) => b.timestamp - a.timestamp);
        const latestOp = operations[0];

        // Merge callbacks from all duplicate operations into the latest one
        for (let i = 1; i < operations.length; i++) {
          this.mergeCallbacks(latestOp, operations[i]);
          deduplicationCount++;
        }

        deduplicatedQueue.push(latestOp);
        console.log(`[OperationQueue] Deduplicated ${operations.length} operations for ${key}`);
      } else {
        // No duplicates, keep as-is
        deduplicatedQueue.push(operations[0]);
      }
    }

    // Add non-deduplicatable operations back
    for (const op of this.queue) {
      if (!this.isDeduplicatableEndpoint(op.url)) {
        deduplicatedQueue.push(op);
      } else if (op.url.includes('/v2/pushes?limit=50') && (op.options.method || 'GET') !== 'GET') {
        // Add back non-GET requests to /v2/pushes?limit=50
        deduplicatedQueue.push(op);
      }
    }

    this.queue = deduplicatedQueue;
    
    if (deduplicationCount > 0) {
      console.log(`[OperationQueue] Deduplication complete: removed ${deduplicationCount} duplicate operations, queue now has ${this.queue.length} operations`);
      await this.persistQueue();
    }
  }

  /**
   * Enqueue an operation for later processing
   */
  enqueue(operation: PendingOperation): Promise<Response> {
    return new Promise((resolve, reject) => {
      const queuedOp: QueuedOperation = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: operation.url,
        options: operation.options,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      this.queue.push(queuedOp);
      this.persistQueue();

      console.log(
        `Operation queued: ${queuedOp.id} (${this.queue.length} pending)`
      );

      // Start processing if not already running
      this.startProcessing();
    });
  }

  /**
   * Dequeue the next operation
   */
  dequeue(): QueuedOperation | null {
    return this.queue.shift() || null;
  }

  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.isProcessing || this.processingInterval) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNextOperation();
    }, this.processingDelay) as any;

    console.log(
      `Queue processing started (interval: ${this.processingDelay}ms)`
    );

    // Log current backoff state when starting
    const backoffState = rateLimitManager.getBackoffState();
    console.log(`[OperationQueue] Starting with backoff state:`, backoffState);
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('Queue processing stopped');
  }

  /**
   * Process the next operation in the queue
   */
  private async processNextOperation(): Promise<void> {
    const now = Date.now();

    // Check if backoff is active
    if (rateLimitManager.isBackoffActive()) {
      // Throttle this log message
      if (now - this.lastBackoffLogTime > this.logThrottleInterval) {
        const remainingSeconds = rateLimitManager.getBackoffRemainingSeconds();
        console.log(
          `Skipping queue processing - backoff active (${remainingSeconds}s remaining, ${this.queue.length} queued)`
        );
        this.lastBackoffLogTime = now;
      }
      return;
    }

    // Check if we need to deduplicate (only when queue is large)
    if (this.queue.length > this.deduplicationThreshold) {
      await this.deduplicateQueue();
    }

    // Check if we have tokens available
    if (!tokenBucket.canConsume(1)) {
      // Allow a few bootstrap requests if we haven't gotten rate limit headers yet
      const bucketStatus = tokenBucket.getDetailedStatus();
      const canBootstrap =
        !this.hasBootstrapped &&
        bucketStatus.lastRefill === 0 &&
        this.queue.length > 0;

      if (canBootstrap) {
        console.log(
          `[OperationQueue] Bootstrap mode: allowing request despite no tokens (never been refilled)`
        );
        // Continue to process the operation for bootstrap
      } else {
        // Throttle this log message
        if (now - this.lastNoTokensLogTime > this.logThrottleInterval) {
          const bucketSize = tokenBucket.getBucketSize();
          const backoffState = rateLimitManager.getBackoffState();
          console.log(
            `Skipping queue processing - no tokens available (bucket: ${bucketSize}, ${this.queue.length} queued)`
          );
          console.log(
            `[OperationQueue] Debug - backoff state when no tokens:`,
            backoffState
          );

          // Log some queue details
          if (this.queue.length > 0) {
            console.log(
              `[OperationQueue] Queued operations:`,
              this.queue.map(op => ({
                id: op.id,
                url: op.url,
                retryCount: op.retryCount,
              }))
            );
          }

          this.lastNoTokensLogTime = now;
        }
        return;
      }
    }

    const operation = this.dequeue();
    if (!operation) {
      // No operations in queue, stop processing
      this.stopProcessing();
      return;
    }

    try {
      const bucketSize = tokenBucket.getBucketSize();
      console.log(
        `Processing queued operation: ${operation.id} (bucket: ${bucketSize}, ${this.queue.length} remaining)`
      );

      // Consume token
      tokenBucket.consume(1);

      // Make the request using fetch
      const response = await fetch(operation.url, operation.options);

      console.log(
        `[OperationQueue] Response status: ${response.status} for operation ${operation.id}`
      );

      // Handle 429 errors BEFORE parsing headers
      if (response.status === 429) {
        console.error(
          `[OperationQueue] Rate limited (429) for operation ${operation.id}`
        );
        rateLimitManager.startBackoff();
        this.stopProcessing();

        // Re-queue the operation if retry count not exceeded
        if (operation.retryCount < this.maxRetryCount) {
          operation.retryCount++;
          this.queue.unshift(operation); // Add back to front of queue
          console.log(
            `Re-queued operation ${operation.id} (retry ${operation.retryCount}/${this.maxRetryCount}) due to 429`
          );
          this.persistQueue();
          return; // Don't resolve/reject, operation is re-queued
        } else {
          operation.reject(
            new Error(
              `Operation failed after ${this.maxRetryCount} retries due to rate limiting`
            )
          );
          this.persistQueue();
          return;
        }
      }

      // Parse rate limit headers
      rateLimitManager.parseHeaders(response);

      // Refill token bucket with new remaining quota
      tokenBucket.refillBucket(rateLimitManager.getRemaining());

      // Mark as bootstrapped after first successful request
      if (!this.hasBootstrapped) {
        this.hasBootstrapped = true;
        console.log(
          `[OperationQueue] System bootstrapped after first successful API response`
        );
      }

      // Reset backoff on successful request
      rateLimitManager.resetBackoff();

      // Resolve the operation
      operation.resolve(response);

      console.log(`Queued operation completed: ${operation.id}`);
    } catch (error) {
      console.error(`Queued operation failed: ${operation.id}`, error);

      // Network errors or other fetch failures
      operation.reject(error as Error);
    }

    // Persist updated queue
    this.persistQueue();
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
    };
  }

  /**
   * Get all queued operations (for debugging)
   */
  getQueuedOperations(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Clear the queue (for testing or reset scenarios)
   */
  clearQueue(): void {
    // Reject all pending operations
    this.queue.forEach(op => {
      op.reject(new Error('Queue cleared'));
    });

    this.queue = [];
    this.stopProcessing();
    this.persistQueue();

    console.log('Operation queue cleared');
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      // Only persist operation data, not resolve/reject functions
      const queueData = this.queue.map(op => ({
        id: op.id,
        url: op.url,
        options: op.options,
        timestamp: op.timestamp,
        retryCount: op.retryCount,
      }));

      await setLocal('pb_operation_queue', queueData);
    } catch (error) {
      console.error('Failed to persist operation queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  async loadQueue(): Promise<void> {
    try {
      const queueData =
        await getLocal<Array<Omit<QueuedOperation, 'resolve' | 'reject'>>>(
          'pb_operation_queue'
        );

      if (queueData && Array.isArray(queueData)) {
        // Convert back to QueuedOperation format (without resolve/reject)
        this.queue = queueData.map(op => ({
          ...op,
          resolve: () => {}, // Placeholder - these operations will be lost on restart
          reject: () => {}, // This is expected behavior for service worker restarts
        }));

        console.log(`Loaded ${this.queue.length} operations from storage`);

        // Start processing if there are operations
        if (this.queue.length > 0) {
          this.startProcessing();
        }
      }
    } catch (error) {
      console.error('Failed to load operation queue:', error);
    }
  }

  /**
   * Initialize the queue system
   */
  async initialize(): Promise<void> {
    await this.loadQueue();
    console.log('Operation queue initialized');
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    this.stopProcessing();
    this.persistQueue();
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();
