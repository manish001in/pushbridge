import {
  reportError,
  PBError,
  isRetryableError,
  getErrorSeverity,
} from '../../src/background/errorManager';

describe('Error Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reportError should create Chrome notification for TokenRevoked', async () => {
    const mockCreate = chrome.notifications.create as jest.Mock;
    mockCreate.mockResolvedValue(undefined);

    const shouldRetry = await reportError(PBError.TokenRevoked);

    expect(shouldRetry).toBe(false);
    expect(mockCreate).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: 'icons/48.png',
      title: 'Pushbridge Error',
      message:
        'Your Pushbullet token has been revoked. Please update your token in the extension settings.',
    });
  });

  test('reportError should create Chrome notification for QuotaExceeded', async () => {
    const mockCreate = chrome.notifications.create as jest.Mock;
    mockCreate.mockResolvedValue(undefined);

    const shouldRetry = await reportError(PBError.QuotaExceeded);

    expect(shouldRetry).toBe(false);
    expect(mockCreate).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: 'icons/48.png',
      title: 'Pushbridge Error',
      message:
        'Storage quota exceeded. Old data has been cleaned up automatically.',
    });
  });

  test('reportError should return true for retryable errors', async () => {
    const mockCreate = chrome.notifications.create as jest.Mock;
    mockCreate.mockResolvedValue(undefined);

    const shouldRetry = await reportError(PBError.UploadInterrupted);

    expect(shouldRetry).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
  });

  test('isRetryableError should return true for UploadInterrupted', () => {
    expect(isRetryableError(PBError.UploadInterrupted)).toBe(true);
    expect(isRetryableError(PBError.TokenRevoked)).toBe(false);
  });

  test('getErrorSeverity should return correct severity levels', () => {
    expect(getErrorSeverity(PBError.TokenRevoked)).toBe('error');
    expect(getErrorSeverity(PBError.QuotaExceeded)).toBe('warning');
    expect(getErrorSeverity(PBError.UploadInterrupted)).toBe('warning');
    expect(getErrorSeverity(PBError.WSMaxRetries)).toBe('error');
    expect(getErrorSeverity(PBError.Unknown)).toBe('error');
  });
});
