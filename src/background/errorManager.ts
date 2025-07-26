/**
 * Central error manager for Pushbridge extension
 * Provides unified error handling with taxonomy and user notifications
 */

export enum PBError {
  TokenRevoked = 'TOKEN_REVOKED',
  QuotaExceeded = 'QUOTA_EXCEEDED',
  WSMaxRetries = 'WS_MAX_RETRIES',
  UploadInterrupted = 'UPLOAD_INTERRUPTED',
  RateLimited = 'RATE_LIMITED',
  QuotaExhausted = 'QUOTA_EXHAUSTED',
  BackoffActive = 'BACKOFF_ACTIVE',
  QueueFull = 'QUEUE_FULL',
  FileTooLarge = 'FILE_TOO_LARGE',
  InvalidUpload = 'INVALID_UPLOAD',
  NetworkError = 'NETWORK_ERROR',
  Timeout = 'TIMEOUT',
  Unknown = 'UNKNOWN',
}

export interface ErrorDetails {
  message?: string;
  code?: number;
  retryable?: boolean;
  timestamp?: number;
}

export interface ErrorReport {
  error: PBError;
  details?: ErrorDetails;
  shouldRetry: boolean;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Report an error to the central error manager
 * @param error - The error type from PBError enum
 * @param details - Optional error details
 * @returns Promise resolving to whether the operation should be retried
 */
export async function reportError(
  error: PBError,
  details?: ErrorDetails
): Promise<boolean> {
  const report = createErrorReport(error, details);

  // Log to console with properly formatted details
  if (details && typeof details === 'object') {
    console.error(
      `[Pushbridge Error] ${error}:`,
      JSON.stringify(details, null, 2)
    );
  } else {
    console.error(`[Pushbridge Error] ${error}:`, details);
  }

  // Show user notification for warnings and errors
  if (report.severity !== 'info') {
    await showUserNotification(report);
  }

  return report.shouldRetry;
}

/**
 * Create an error report with appropriate severity and retry logic
 */
function createErrorReport(
  error: PBError,
  details?: ErrorDetails
): ErrorReport {
  const timestamp = Date.now();

  switch (error) {
    case PBError.TokenRevoked:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'error',
      };

    case PBError.QuotaExceeded:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'warning',
      };

    case PBError.WSMaxRetries:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'error',
      };

    case PBError.UploadInterrupted:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.RateLimited:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.QuotaExhausted:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.BackoffActive:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.QueueFull:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.FileTooLarge:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'warning',
      };

    case PBError.InvalidUpload:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'error',
      };

    case PBError.NetworkError:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.Timeout:
      return {
        error,
        details: { ...details, timestamp, retryable: true },
        shouldRetry: true,
        severity: 'warning',
      };

    case PBError.Unknown:
    default:
      return {
        error,
        details: { ...details, timestamp },
        shouldRetry: false,
        severity: 'error',
      };
  }
}

/**
 * Show a Chrome notification to the user
 */
async function showUserNotification(report: ErrorReport): Promise<void> {
  const message = getErrorMessage(report);

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/48.png',
      title: 'Pushbridge Error',
      message: message,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(report: ErrorReport): string {
  switch (report.error) {
    case PBError.TokenRevoked:
      return 'Your Pushbullet token has been revoked. Please update your token in the extension settings.';

    case PBError.QuotaExceeded:
      return 'Storage quota exceeded. Old data has been cleaned up automatically.';

    case PBError.WSMaxRetries:
      return 'Connection to Pushbullet failed after multiple attempts. Please check your internet connection.';

    case PBError.UploadInterrupted:
      return 'File upload was interrupted. You can retry the upload.';

    case PBError.RateLimited:
      return 'Rate limit exceeded. Please wait a moment before retrying.';

    case PBError.QuotaExhausted:
      return 'API quota exhausted. Operations are being queued.';

    case PBError.BackoffActive:
      return 'Rate limit backoff active. Please wait before retrying.';

    case PBError.QueueFull:
      return 'Operation queue is full. Please wait for processing to complete.';

    case PBError.FileTooLarge:
      return 'File is too large. Maximum file size is 25MB.';

    case PBError.InvalidUpload:
      return 'Invalid upload request. Please try again with a different file.';

    case PBError.NetworkError:
      return 'Network error during upload. Please check your connection and try again.';

    case PBError.Timeout:
      return 'Upload timed out. Please try again.';

    case PBError.Unknown:
    default:
      return (
        report.details?.message ||
        'An unexpected error occurred. Please try again.'
      );
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: PBError): boolean {
  return (
    error === PBError.UploadInterrupted ||
    error === PBError.RateLimited ||
    error === PBError.QuotaExhausted ||
    error === PBError.BackoffActive ||
    error === PBError.QueueFull ||
    error === PBError.NetworkError ||
    error === PBError.Timeout
  );
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: PBError): 'info' | 'warning' | 'error' {
  switch (error) {
    case PBError.QuotaExceeded:
    case PBError.UploadInterrupted:
    case PBError.RateLimited:
    case PBError.QuotaExhausted:
    case PBError.BackoffActive:
    case PBError.QueueFull:
    case PBError.FileTooLarge:
    case PBError.NetworkError:
    case PBError.Timeout:
      return 'warning';
    case PBError.TokenRevoked:
    case PBError.WSMaxRetries:
    case PBError.InvalidUpload:
    case PBError.Unknown:
    default:
      return 'error';
  }
}
