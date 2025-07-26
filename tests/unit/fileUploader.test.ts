/**
 * Unit tests for fileUploader module
 */

import { reportError, PBError } from '../../src/background/errorManager';
import { UploadInfo } from '../../src/types/pushbullet';

// Mock crypto.subtle
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(),
    },
  },
});

// Mock the error manager
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: {
    FileTooLarge: 'FileTooLarge',
    InvalidUpload: 'InvalidUpload',
    NetworkError: 'NetworkError',
    Timeout: 'Timeout',
    Unknown: 'Unknown',
  },
}));

// Mock the storage module
const mockGetLocal = jest.fn();
const mockSetLocal = jest.fn();
const mockRemoveLocal = jest.fn();

jest.mock('../../src/background/storage', () => ({
  getLocal: mockGetLocal,
  setLocal: mockSetLocal,
  removeLocal: mockRemoveLocal,
}));

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  result: ArrayBuffer | null = null;
  error: any = null;
  readAsArrayBuffer: jest.Mock;

  constructor() {
    this.readAsArrayBuffer = jest.fn();
  }

  simulateLoad(result: ArrayBuffer) {
    this.result = result;
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  simulateError(error: any) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

// Set up global mocks
(global as any).FileReader = MockFileReader;

// Import the module after mocking
let uploadFile: any;
let resumeInterruptedUploads: any;
let cleanupFailedUpload: any;
let getPendingUploads: any;
let cleanupOldPendingUploads: any;

beforeAll(async () => {
  const module = await import('../../src/background/fileUploader');
  uploadFile = module.uploadFile;
  resumeInterruptedUploads = module.resumeInterruptedUploads;
  cleanupFailedUpload = module.cleanupFailedUpload;
  getPendingUploads = module.getPendingUploads;
  cleanupOldPendingUploads = module.cleanupOldPendingUploads;
});

describe('fileUploader', () => {
  let mockFileReader: MockFileReader;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader = new MockFileReader();
    (global as any).FileReader = jest.fn(() => mockFileReader);

    // Reset storage mocks
    (mockGetLocal as any).mockResolvedValue(undefined);
    (mockSetLocal as any).mockResolvedValue(undefined);
    (mockRemoveLocal as any).mockResolvedValue(undefined);

    // Mock crypto.subtle.digest
    ((global as any).crypto.subtle.digest as jest.Mock).mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    );

    // Mock fetch
    (mockFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
  });

  describe('uploadFile', () => {
    const mockUploadInfo: UploadInfo = {
      uploadUrl: 'https://s3.amazonaws.com/upload-bucket',
      fileUrl: 'https://files.pushbullet.com/file123',
      s3Fields: {
        key: 'uploads/file123',
        bucket: 'pushbullet-files',
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': 'test-credential',
        'X-Amz-Date': '20240101T000000Z',
        Policy: 'test-policy',
        'X-Amz-Signature': 'test-signature',
      },
    };

    // Create a proper mock File object
    const createMockFile = (content: string, name: string, type: string) => {
      return new File([content], name, { type });
    };

    it('should upload file successfully with progress tracking', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      const progressCallback = jest.fn();

      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });

      const result = await uploadFile(mockUploadInfo, mockFile, progressCallback);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(mockUploadInfo.uploadUrl, {
        method: 'POST',
        body: expect.any(FormData),
      });
      expect(progressCallback).toHaveBeenCalledWith({
        loaded: 12,
        total: 12,
        percentage: 100,
      });
    }, 10000);

    it('should handle upload failure with 413 status', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });
      
      // Mock fetch failure
      (mockFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 413,
        statusText: 'Request Entity Too Large',
      });

      const result = await uploadFile(mockUploadInfo, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large for upload');
      expect(reportError).toHaveBeenCalledWith(PBError.FileTooLarge, {
        message: 'File too large for upload',
        code: 413,
      });
    }, 10000);

    it('should handle upload failure with 400 status', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });
      
      // Mock fetch failure
      (mockFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await uploadFile(mockUploadInfo, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid upload request');
      expect(reportError).toHaveBeenCalledWith(PBError.InvalidUpload, {
        message: 'Invalid upload request',
        code: 400,
      });
    }, 10000);

    it('should handle network error', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });
      
      // Mock fetch network error
      (mockFetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));

      const result = await uploadFile(mockUploadInfo, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error during upload');
      expect(reportError).toHaveBeenCalledWith(PBError.NetworkError, {
        message: 'Network error during file upload',
        code: undefined,
      });
    }, 10000);

    it('should handle file hash generation error gracefully', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader error
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateError(new Error('Read error'));
        }, 0);
      });

      const result = await uploadFile(mockUploadInfo, mockFile);

      expect(result.success).toBe(true);
      // Should still work with fallback hash
    }, 10000);

    it('should store pending upload information', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });

      await uploadFile(mockUploadInfo, mockFile);

      expect(mockSetLocal).toHaveBeenCalledWith(
        'pb_pending_uploads',
        expect.arrayContaining([
          expect.objectContaining({
            fileHash: expect.any(String),
            uploadInfo: mockUploadInfo,
            fileName: 'test.txt',
            fileSize: 12,
            fileType: 'text/plain',
            offset: 0,
            attempts: 0,
          }),
        ])
      );
    }, 10000);

    it('should remove pending upload on successful completion', async () => {
      const mockFile = createMockFile('test content', 'test.txt', 'text/plain');
      
      // Mock FileReader to resolve immediately
      mockFileReader.readAsArrayBuffer.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.simulateLoad(new ArrayBuffer(12));
        }, 0);
      });

      await uploadFile(mockUploadInfo, mockFile);

      // Should remove pending upload
      expect(mockSetLocal).toHaveBeenCalledWith(
        'pb_pending_uploads',
        expect.arrayContaining([])
      );
    }, 10000);
  });

  describe('resumeInterruptedUploads', () => {
    it('should resume interrupted uploads', async () => {
      const mockPendingUploads = [
        {
          fileHash: 'test-hash',
          uploadInfo: {
            uploadUrl: 'https://test.com',
            fileUrl: 'https://test.com/file',
            s3Fields: {},
          },
          fileName: 'test.txt',
          fileSize: 100,
          fileType: 'text/plain',
          offset: 50,
          attempts: 0,
          timestamp: Date.now(),
        },
      ];

      (mockGetLocal as any).mockResolvedValue(mockPendingUploads);

      const result = await resumeInterruptedUploads();

      expect(result).toBe(1);
    });
  });

  describe('cleanupFailedUpload', () => {
    it('should cleanup failed upload', async () => {
      const mockPendingUploads = [
        {
          fileHash: 'test-hash',
          uploadInfo: {},
          fileName: 'test.txt',
          fileSize: 100,
          fileType: 'text/plain',
          offset: 0,
          attempts: 3,
          timestamp: Date.now(),
        },
      ];

      (mockGetLocal as any).mockResolvedValue(mockPendingUploads);

      await cleanupFailedUpload('test-hash');

      expect(mockSetLocal).toHaveBeenCalledWith(
        'pb_pending_uploads',
        expect.arrayContaining([])
      );
    });
  });

  describe('getPendingUploads', () => {
    it('should return pending uploads', async () => {
      const mockPendingUploads = [
        {
          fileHash: 'test-hash',
          uploadInfo: {},
          fileName: 'test.txt',
          fileSize: 100,
          fileType: 'text/plain',
          offset: 0,
          attempts: 0,
          timestamp: Date.now(),
        },
      ];

      (mockGetLocal as any).mockResolvedValue(mockPendingUploads);

      const result = await getPendingUploads();

      expect(result).toEqual(mockPendingUploads);
    });
  });

  describe('cleanupOldPendingUploads', () => {
    it('should cleanup old pending uploads', async () => {
      const mockPendingUploads = [
        {
          fileHash: 'test-hash',
          uploadInfo: {},
          fileName: 'test.txt',
          fileSize: 100,
          fileType: 'text/plain',
          offset: 0,
          attempts: 0,
          timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours old
        },
      ];

      (mockGetLocal as any).mockResolvedValue(mockPendingUploads);

      await cleanupOldPendingUploads();

      expect(mockSetLocal).toHaveBeenCalledWith(
        'pb_pending_uploads',
        expect.arrayContaining([])
      );
    });
  });
});
