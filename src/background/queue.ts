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
  /** Set while a send is in flight; survives if the worker stops mid-send. */
  attemptStartedAt?: number;
  nextAttemptAt?: number;
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
const RETRY_BASE_DELAY = 30 * 1000;
const RETRY_MAX_DELAY = 60 * 60 * 1000;
const MAX_OP_AGE = 7 * 24 * 60 * 60 * 1000;

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

    await updatePendingOps(ops => [...ops, operation]);

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

let pendingOpsWrite: Promise<unknown> = Promise.resolve();

/**
 * Apply a change to the stored queue, one at a time, always from its current
 * contents. Writing back an older snapshot would resend finished operations and
 * drop ones added meanwhile.
 */
function updatePendingOps(
  change: (ops: PushbridgeOp[]) => PushbridgeOp[]
): Promise<void> {
  const write = pendingOpsWrite.then(async () => {
    const ops = (await getLocal<PushbridgeOp[]>('pb_pending_ops')) || [];
    await setLocal('pb_pending_ops', change(ops));
  });
  pendingOpsWrite = write.catch(() => undefined);
  return write;
}

// Sent, but the removal from storage may not have saved. Never send these again.
const deliveredOps = new Set<string>();
// Started by this worker. A marked operation not listed here was in flight when an
// earlier worker stopped, so it may already have been delivered.
const startedOps = new Set<string>();

async function discardOp(op: PushbridgeOp, message: string): Promise<void> {
  await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
  await reportError(PBError.Unknown, { message, code: 1002 });
}

/** Rejected by the server or unsupported, so trying again can't help. */
function isPermanentFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /not yet implemented|unknown operation|required/i.test(message) ||
    /\b4(?!29)\d\d\b/.test(message)
  );
}

async function processPendingOp(op: PushbridgeOp): Promise<void> {
  if (deliveredOps.has(op.id)) {
    await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
    return;
  }
  if (op.nextAttemptAt && Date.now() < op.nextAttemptAt) {
    return;
  }

  const age = Date.now() - op.timestamp;
  if (age > MAX_OP_AGE) {
    await discardOp(op, `A queued ${op.type} was too old to send and was dropped`);
    return;
  }

  // Better to report a possibly unsent message than to risk sending it twice.
  if (op.attemptStartedAt && !startedOps.has(op.id)) {
    await discardOp(
      op,
      'A queued message was interrupted while sending and may not have been delivered. Please check and send it again if needed.'
    );
    return;
  }

  startedOps.add(op.id);
  const attemptStartedAt = Date.now();
  await updatePendingOps(ops =>
    ops.map(p => (p.id === op.id ? { ...p, attemptStartedAt } : p))
  );

  try {
    await processOperation(op);
  } catch (error) {
    console.error('Failed to process operation:', op.id, error);
    startedOps.delete(op.id);

    if (isPermanentFailure(error)) {
      await discardOp(op, `A queued ${op.type} could not be sent`);
      return;
    }

    // Being offline isn't the message's fault: keep it and try again later.
    const retryCount = op.retryCount + 1;
    const delay = Math.min(RETRY_BASE_DELAY * 2 ** retryCount, RETRY_MAX_DELAY);
    await updatePendingOps(ops =>
      ops.map(p =>
        p.id === op.id
          ? {
              ...p,
              retryCount,
              nextAttemptAt: Date.now() + delay,
              attemptStartedAt: undefined,
            }
          : p
      )
    );
    return;
  }

  deliveredOps.add(op.id);
  await updatePendingOps(ops => ops.filter(p => p.id !== op.id));

  // Rate limiting delay
  await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL));
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
      await processPendingOp(op);
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
