/**
 * Operation queue system for Pushbridge extension
 * Handles queuing operations during connectivity issues
 */

import { reportError, PBError } from './errorManager';
import { createPush, PushPayload } from './pushManager';
import { getLocal, setLocal } from './storage';

export interface PushbridgeOp {
  id: string;
  type: 'pushSend' | 'smsSend' | 'dismissal';
  payload: any;
  timestamp: number;
  retryCount: number;
}

interface QueueState {
  isOnline: boolean;
  isProcessing: boolean;
  processingInterval: ReturnType<typeof setInterval> | null;
}

// Queue state
const queueState: QueueState = {
  isOnline: true,
  isProcessing: false,
  processingInterval: null,
};

// Constants
const PROCESSING_INTERVAL = 5000; // 5 seconds between operations (rate limiting)
const MAX_RETRY_COUNT = 3;

/**
 * Enqueue an operation for later processing
 * @param op - The operation to enqueue
 */
export async function enqueue(
  op: Omit<PushbridgeOp, 'id' | 'timestamp' | 'retryCount'>
): Promise<void> {
  try {
    const operation: PushbridgeOp = {
      ...op,
      id: generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    const pendingOps = (await getLocal<PushbridgeOp[]>('pb_pending_ops')) || [];
    pendingOps.push(operation);
    await setLocal('pb_pending_ops', pendingOps);

    console.log('Operation queued:', operation.type, operation.id);

    // Try to process queue if online
    if (queueState.isOnline) {
      await processQueue();
    }
  } catch (error) {
    console.error('Failed to enqueue operation:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to queue operation',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Process all pending operations in the queue
 */
export async function processQueue(): Promise<void> {
  if (queueState.isProcessing || !queueState.isOnline) {
    return;
  }

  queueState.isProcessing = true;

  try {
    const pendingOps = (await getLocal<PushbridgeOp[]>('pb_pending_ops')) || [];

    if (pendingOps.length === 0) {
      return;
    }

    console.log(`Processing ${pendingOps.length} queued operations`);

    // Process operations one by one with rate limiting
    for (const op of pendingOps) {
      try {
        await processOperation(op);

        // Remove successful operation from queue
        const updatedOps = pendingOps.filter(p => p.id !== op.id);
        await setLocal('pb_pending_ops', updatedOps);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL));
      } catch (error) {
        console.error('Failed to process operation:', op.id, error);

        // Increment retry count
        op.retryCount++;

        if (op.retryCount >= MAX_RETRY_COUNT) {
          console.log(
            'Operation exceeded max retries, removing from queue:',
            op.id
          );
          const updatedOps = pendingOps.filter(p => p.id !== op.id);
          await setLocal('pb_pending_ops', updatedOps);

          await reportError(PBError.Unknown, {
            message: `Operation failed after ${MAX_RETRY_COUNT} retries: ${op.type}`,
            code: 1002,
          });
        } else {
          // Update operation in queue with new retry count
          const updatedOps = pendingOps.map(p => (p.id === op.id ? op : p));
          await setLocal('pb_pending_ops', updatedOps);
        }
      }
    }
  } catch (error) {
    console.error('Failed to process queue:', error);
  } finally {
    queueState.isProcessing = false;
  }
}

/**
 * Process a single operation
 */
async function processOperation(op: PushbridgeOp): Promise<void> {
  switch (op.type) {
    case 'pushSend':
      await createPush(op.payload as PushPayload);
      break;

    case 'smsSend':
      // TODO: Implement SMS sending in M5
      throw new Error('SMS sending not yet implemented');

    case 'dismissal':
      // TODO: Implement dismissal in M3
      throw new Error('Dismissal not yet implemented');

    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}

/**
 * Flush queue when connection is restored
 */
export async function flushWhenOnline(): Promise<void> {
  if (!queueState.isOnline) {
    queueState.isOnline = true;
    console.log('Connection restored, flushing operation queue');
    await processQueue();
  }
}

/**
 * Mark system as offline (stop processing queue)
 */
export function markOffline(): void {
  queueState.isOnline = false;
  console.log('System marked as offline, operations will be queued');
}

/**
 * Mark system as online (resume processing queue)
 */
export async function markOnline(): Promise<void> {
  if (!queueState.isOnline) {
    queueState.isOnline = true;
    console.log('System marked as online, resuming queue processing');
    await processQueue();
  }
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{
  pendingCount: number;
  isOnline: boolean;
  isProcessing: boolean;
}> {
  const pendingOps = (await getLocal<PushbridgeOp[]>('pb_pending_ops')) || [];

  return {
    pendingCount: pendingOps.length,
    isOnline: queueState.isOnline,
    isProcessing: queueState.isProcessing,
  };
}

/**
 * Clear all pending operations
 */
export async function clearQueue(): Promise<void> {
  await setLocal('pb_pending_ops', []);
  console.log('Operation queue cleared');
}

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize queue processing
 */
export function initializeQueue(): void {
  // Start periodic queue processing
  queueState.processingInterval = setInterval(() => {
    if (queueState.isOnline && !queueState.isProcessing) {
      processQueue();
    }
  }, 5000) as any; // Check every 5 seconds

  console.log('Operation queue system initialized');
}

/**
 * Cleanup queue system
 */
export function cleanupQueue(): void {
  if (queueState.processingInterval) {
    clearInterval(queueState.processingInterval);
    queueState.processingInterval = null;
  }

  queueState.isProcessing = false;
  console.log('Operation queue system cleaned up');
}
