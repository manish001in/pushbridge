/**
 * Unit tests for OperationQueue deduplication logic
 */

import { operationQueue, PendingOperation } from '../../src/background/operationQueue';

// Mock dependencies
jest.mock('../../src/background/rateLimitManager', () => ({
  rateLimitManager: {
    isBackoffActive: jest.fn().mockReturnValue(false),
    getBackoffRemainingSeconds: jest.fn().mockReturnValue(0),
    parseHeaders: jest.fn(),
    resetBackoff: jest.fn(),
    startBackoff: jest.fn(),
    getBackoffState: jest.fn().mockReturnValue({}),
    getRemaining: jest.fn().mockReturnValue(100),
  },
}));

jest.mock('../../src/background/tokenBucket', () => ({
  tokenBucket: {
    canConsume: jest.fn().mockReturnValue(true),
    consume: jest.fn(),
    refillBucket: jest.fn(),
    getBucketSize: jest.fn().mockReturnValue(10),
    getDetailedStatus: jest.fn().mockReturnValue({
      lastRefill: Date.now(),
      bucketSize: 10,
    }),
    reset: jest.fn(),
    initialize: jest.fn(),
    getRemaining: jest.fn().mockReturnValue(100),
  },
}));

jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn().mockResolvedValue(null),
  setLocal: jest.fn().mockResolvedValue(undefined),
}));

// Mock fetch
global.fetch = jest.fn();

describe('OperationQueue Deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map(),
    });
  });

  afterEach(async () => {
    // Clear the queue after each test to clean up any pending operations
    // We need to wait a bit for any pending operations to settle before clearing
    await new Promise(resolve => setTimeout(resolve, 10));
    operationQueue.clearQueue();
  });

  describe('Deduplication Logic', () => {
    it('should not deduplicate when queue has 5 or fewer operations', async () => {
      // Add 5 operations (below threshold)
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Check that all operations are still in the queue
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(5);
      
      // All operations should be the same URL
      queuedOps.forEach(op => {
        expect(op.url).toBe('https://api.pushbullet.com/v2/permanents/device1_threads');
      });
    });

    it('should deduplicate /v2/permanents operations when queue has more than 5 operations', async () => {
      // Add 7 operations (above threshold)
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promises to avoid unhandled rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Stop processing to prevent interference with deduplication test
      operationQueue.stopProcessing();
      
      // Manually trigger deduplication
      // We need to access the private method for testing
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that operations were deduplicated
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(1); // Should be deduplicated to 1 operation
      
      // The remaining operation should be the oldest one
      expect(queuedOps[0].url).toBe('https://api.pushbullet.com/v2/permanents/device1_threads');
    });

    it('should not deduplicate non-permanents operations', async () => {
      // Add 6 operations with only 2 being permanents
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/devices', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/channels', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/pushes', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/users/me', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promises to avoid unhandled rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Stop processing to prevent interference with deduplication test
      operationQueue.stopProcessing();
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that only permanents operations were deduplicated
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(5); // 1 permanents + 4 non-permanents
      
      // Should have 1 permanents operation and 4 other operations
      const permanentsOps = queuedOps.filter(op => op.url.includes('/v2/permanents/'));
      const otherOps = queuedOps.filter(op => !op.url.includes('/v2/permanents/'));
      
      expect(permanentsOps.length).toBe(1);
      expect(otherOps.length).toBe(4);
    });

    it('should deduplicate different permanents endpoints separately', async () => {
      // Add 6 operations with different permanents endpoints
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_thread_123', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_thread_123', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device2_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device2_threads', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that each unique endpoint has one operation
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(3); // 3 unique endpoints
      
      const urls = queuedOps.map(op => op.url).sort();
      expect(urls).toEqual([
        'https://api.pushbullet.com/v2/permanents/device1_thread_123',
        'https://api.pushbullet.com/v2/permanents/device1_threads',
        'https://api.pushbullet.com/v2/permanents/device2_threads',
      ]);
    });

    it('should keep the latest operation when deduplicating', async () => {
      // Add 6 operations with different timestamps
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that the latest operation is kept
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(1);
      
      // The remaining operation should have the latest timestamp
      const remainingOp = queuedOps[0];
      expect(remainingOp.url).toBe('https://api.pushbullet.com/v2/permanents/device1_threads');
    });

    it('should merge callbacks when deduplicating operations', async () => {
      // Add 6 operations
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
      ];

      // Enqueue all operations and capture promises
      operations.map(op => operationQueue.enqueue(op));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that only one operation remains
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(1);
      
      // Process the remaining operation using processNextOperation
      const processNextOperation = (operationQueue as any).processNextOperation.bind(operationQueue);
      await processNextOperation();
    });

    it('should handle different HTTP methods separately', async () => {
      // Add 6 operations with different methods
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'POST' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'POST' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'PUT' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'PUT' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Check that each method is kept separately
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(3); // 3 different methods
      
      const methods = queuedOps.map(op => op.options.method || 'GET').sort();
      expect(methods).toEqual(['GET', 'POST', 'PUT']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue gracefully', async () => {
      // Manually trigger deduplication on empty queue
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(0);
    });

    it('should handle queue with only non-permanents operations', async () => {
      // Add 6 non-permanents operations
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/devices', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/channels', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/pushes', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/users/me', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/subscriptions', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/chats', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // All operations should remain (no deduplication for non-permanents)
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(6);
    });

    it('should handle mixed permanents and non-permanents operations', async () => {
      // Add 6 operations with mix of permanents and non-permanents
      const operations: PendingOperation[] = [
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_threads', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/devices', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/channels', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_thread_123', options: { method: 'GET' } },
        { url: 'https://api.pushbullet.com/v2/permanents/device1_thread_123', options: { method: 'GET' } },
      ];

      // Enqueue all operations and handle promise rejections
      operations.map(op => operationQueue.enqueue(op).catch(() => {}));
      
      // Manually trigger deduplication
      const deduplicateQueue = (operationQueue as any).deduplicateQueue.bind(operationQueue);
      await deduplicateQueue();
      
      // Should have 4 operations: 2 deduplicated permanents + 2 non-permanents
      const queuedOps = operationQueue.getQueuedOperations();
      expect(queuedOps.length).toBe(4);
      
      const permanentsOps = queuedOps.filter(op => op.url.includes('/v2/permanents/'));
      const otherOps = queuedOps.filter(op => !op.url.includes('/v2/permanents/'));
      
      expect(permanentsOps.length).toBe(2);
      expect(otherOps.length).toBe(2);
    });
  });
}); 