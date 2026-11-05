/**
 * Operation queue system for Pushbridge extension
 * Handles queuing operations during connectivity issues
 */

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
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
  /** The account that wrote it. */
  accountIden?: string;
  /** A send already tried before queueing, whose outcome is unknown. */
  mayHaveBeenSent?: boolean;
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
): Promise<EnqueueOutcome> {
  try {
    const id = generateOperationId();
    const operation: PushbridgeOp = {
      ...op,
      // Identifies the send, so a later attempt can check whether this one got through.
      payload: { ...op.payload, guid: op.payload?.guid ?? id },
      accountIden: await getLocal<string>('pb_user_iden'),
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await updatePendingOps(ops => [...ops, operation]);

    console.log('Operation queued:', operation.type, operation.id);

    // Try to process queue if online
    if (queueState.isOnline) {
      await processQueue();
    }

    const outcome = opOutcomes.get(id) ?? { status: 'queued' as const };
    opOutcomes.delete(id);
    return outcome;
  } catch (error) {
    console.error('Failed to enqueue operation:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to queue operation',
      code: error instanceof Error ? undefined : 500,
    });
    // The caller must not tell the user this was saved.
    throw error;
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

/** Find out whether an earlier attempt reached the server before its response was lost. */
export async function wasGuidDelivered(guid: string): Promise<boolean> {
  const token = await getLocal<string>('pb_token');
  const response = await httpClient.fetch(
    'https://api.pushbullet.com/v2/pushes?limit=100',
    { method: 'GET', headers: { 'Access-Token': token as string } }
  );
  if (!response.ok) {
    throw new Error(`Could not check for an earlier send: ${response.status}`);
  }
  const { pushes } = await response.json();
  return (pushes ?? []).some((push: any) => push.guid === guid);
}

export type EnqueueOutcome =
  | { status: 'sent' }
  | { status: 'queued' }
  | { status: 'rejected'; error: string };

const opOutcomes = new Map<string, EnqueueOutcome>();

async function discardOp(op: PushbridgeOp, message: string): Promise<void> {
  await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
  await reportError(PBError.Unknown, { message, code: 1002 });
}

/** Rejected by the server or unsendable, so trying again can't help. */
function isPermanentFailure(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number') {
    return status >= 400 && status < 500 && status !== 429;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /not yet implemented|unknown operation|is required|not registered|no token/i.test(
    message
  );
}

/** Returns false if later operations must wait, so messages stay in order. */
async function processPendingOp(op: PushbridgeOp): Promise<boolean> {
  if (deliveredOps.has(op.id)) {
    await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
    return true;
  }

  // Reset or a sign-in may have happened since this pass started.
  const current = (await getLocal<PushbridgeOp[]>('pb_pending_ops')) || [];
  if (!current.some(p => p.id === op.id)) {
    return true;
  }

  // Never send one account's message from another.
  const account = await getLocal<string>('pb_user_iden');
  if (op.accountIden && op.accountIden !== account) {
    await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
    return true;
  }

  if (op.nextAttemptAt && Date.now() < op.nextAttemptAt) {
    return false;
  }

  const age = Date.now() - op.timestamp;
  if (age > MAX_OP_AGE) {
    await discardOp(op, `A queued ${op.type} was too old to send and was dropped`);
    return true;
  }

  // An attempt marked by an earlier worker may or may not have left: it could have
  // been waiting out a rate limit. Its send ID settles it below, so it is neither
  // lost nor sent twice. Without an ID there's no way to know, so report it.
  const interrupted = !!op.attemptStartedAt && !startedOps.has(op.id);
  if (interrupted && !op.payload?.guid) {
    await discardOp(
      op,
      'A queued message was interrupted while sending and may not have been delivered. Please check and send it again if needed.'
    );
    return true;
  }

  startedOps.add(op.id);
  const attemptStartedAt = Date.now();
  await updatePendingOps(ops =>
    ops.map(p => (p.id === op.id ? { ...p, attemptStartedAt } : p))
  );

  try {
    // An earlier attempt may have reached the server before its response was lost.
    if (
      op.payload?.guid &&
      (op.retryCount > 0 || op.mayHaveBeenSent || interrupted) &&
      (await wasGuidDelivered(op.payload.guid))
    ) {
      deliveredOps.add(op.id);
      opOutcomes.set(op.id, { status: 'sent' });
      await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
      return true;
    }
    await processOperation(op);
    opOutcomes.set(op.id, { status: 'sent' });
  } catch (error) {
    console.error('Failed to process operation:', op.id, error);
    startedOps.delete(op.id);

    if (isPermanentFailure(error)) {
      opOutcomes.set(op.id, {
        status: 'rejected',
        error: error instanceof Error ? error.message : 'Could not be sent',
      });
      await discardOp(op, `A queued ${op.type} could not be sent`);
      return true;
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
    return false;
  }

  deliveredOps.add(op.id);
  await updatePendingOps(ops => ops.filter(p => p.id !== op.id));
  return true;
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
    let isFirst = true;
    for (const op of pendingOps) {
      // Rate limiting delay between operations
      if (!isFirst) {
        await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL));
      }
      isFirst = false;
      if (!(await processPendingOp(op))) {
        break;
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
      await createPush(op.payload as PushPayload, { silent: true });
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
  // Through the same queue as other writes, so one in progress can't restore it.
  await updatePendingOps(() => []);
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
