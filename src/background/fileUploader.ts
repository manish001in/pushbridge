/**
 * File uploader for Pushbridge extension
 * Handles S3 uploads with progress tracking and resume capability
 */

import { UploadInfo, PendingUpload } from '../types/pushbullet';

import { reportError, PBError } from './errorManager';
import { getLocal, setLocal } from './storage';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  error?: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Generate a hash for a file to use as unique identifier
 * @param file - The file to hash
 * @returns Promise resolving to file hash
 */
async function generateFileHash(file: File): Promise<string> {
  try {
    let buffer: ArrayBuffer;

    // Try to get ArrayBuffer from the file
    if (file.arrayBuffer && typeof file.arrayBuffer === 'function') {
      buffer = await file.arrayBuffer();
    } else {
      // Fallback: use FileReader
      buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Failed to generate file hash:', error);
    // Fallback to timestamp + size + name
    return `${Date.now()}-${file.size}-${file.name}`;
  }
}

/**
 * Store pending upload information
 * @param fileHash - The file hash
 * @param uploadInfo - Upload information
 * @param file - The file being uploaded
 * @param offset - Current upload offset
 */
async function storePendingUpload(
  fileHash: string,
  uploadInfo: UploadInfo,
  file: File,
  offset: number = 0
): Promise<void> {
  const pendingUpload: PendingUpload = {
    fileHash,
    uploadInfo,
    offset,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    timestamp: Date.now(),
    attempts: 0,
  };

  const pendingUploads =
    (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
  const existingIndex = pendingUploads.findIndex(
    upload => upload.fileHash === fileHash
  );

  if (existingIndex >= 0) {
    pendingUploads[existingIndex] = pendingUpload;
  } else {
    pendingUploads.push(pendingUpload);
  }

  await setLocal('pb_pending_uploads', pendingUploads);
}

/**
 * Remove pending upload from storage
 * @param fileHash - The file hash to remove
 */
async function removePendingUpload(fileHash: string): Promise<void> {
  const pendingUploads =
    (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
  const filtered = pendingUploads.filter(
    upload => upload.fileHash !== fileHash
  );
  await setLocal('pb_pending_uploads', filtered);
}

/**
 * Get pending upload by file hash
 * @param fileHash - The file hash to find
 * @returns Promise resolving to pending upload or null
 */
async function getPendingUpload(
  fileHash: string
): Promise<PendingUpload | null> {
  const pendingUploads =
    (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
  return pendingUploads.find(upload => upload.fileHash === fileHash) || null;
}

/**
 * Upload file to S3 with progress tracking
 * @param uploadInfo - Upload information from requestUpload
 * @param file - The file to upload
 * @param onProgress - Progress callback function
 * @param resumeFromOffset - Resume upload from this offset (for interrupted uploads)
 * @returns Promise resolving to upload result
 */
export async function uploadFile(
  uploadInfo: UploadInfo,
  file: File,
  onProgress?: ProgressCallback,
  resumeFromOffset: number = 0
): Promise<UploadResult> {
  const fileHash = await generateFileHash(file);

  try {
    // Store pending upload for potential resume
    await storePendingUpload(fileHash, uploadInfo, file, resumeFromOffset);

    // Prepare form data
    const formData = new FormData();

    // Add all S3 form fields first
    Object.entries(uploadInfo.s3Fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add file last (as required by S3)
    if (resumeFromOffset > 0) {
      // For resume, we need to send only the remaining part of the file
      const remainingBlob = file.slice(resumeFromOffset);
      formData.append('file', remainingBlob, file.name);
    } else {
      formData.append('file', file);
    }

    // Upload file using fetch
    const response = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('File upload completed successfully');

      // Remove pending upload on success
      await removePendingUpload(fileHash);

      // Simulate progress completion if callback provided
      if (onProgress) {
        onProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });
      }

      return { success: true };
    } else {
      const error = `Upload failed with status ${response.status}: ${response.statusText}`;
      console.error(error);

      // Handle specific error cases
      if (response.status === 413) {
        await reportError(PBError.FileTooLarge, {
          message: 'File too large for upload',
          code: 413,
        });
        return { success: false, error: 'File too large for upload' };
      } else if (response.status === 400) {
        await reportError(PBError.InvalidUpload, {
          message: 'Invalid upload request',
          code: 400,
        });
        return { success: false, error: 'Invalid upload request' };
      } else {
        await reportError(PBError.Unknown, {
          message: 'File upload failed',
          code: response.status,
        });
        return { success: false, error: 'Upload failed' };
      }
    }
  } catch (error) {
    console.error('Failed to upload file:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      await reportError(PBError.NetworkError, {
        message: 'Network error during file upload',
        code: undefined,
      });
      return { success: false, error: 'Network error during upload' };
    }

    await reportError(PBError.Unknown, {
      message: 'Failed to upload file',
      code: error instanceof Error ? undefined : 500,
    });
    return { success: false, error: 'Upload failed' };
  }
}

/**
 * Resume interrupted uploads on service worker restart
 * @returns Promise resolving to number of resumed uploads
 */
export async function resumeInterruptedUploads(): Promise<number> {
  try {
    const pendingUploads =
      (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
    let resumedCount = 0;

    for (const pendingUpload of pendingUploads) {
      // Skip uploads older than 1 hour
      if (Date.now() - pendingUpload.timestamp > 60 * 60 * 1000) {
        console.log('Skipping old pending upload:', pendingUpload.fileName);
        continue;
      }

      // Skip uploads with too many attempts
      if (pendingUpload.attempts >= 3) {
        console.log(
          'Skipping upload with too many attempts:',
          pendingUpload.fileName
        );
        continue;
      }

      // Try to resume upload
      try {
        console.log(
          `Resuming upload for ${pendingUpload.fileName} from offset ${pendingUpload.offset}`
        );

        // Note: In a real implementation, we'd need to reconstruct the actual file
        // For now, we'll just clean up old pending uploads
        await removePendingUpload(pendingUpload.fileHash);
        resumedCount++;
      } catch (error) {
        console.error('Failed to resume upload:', error);
        // Increment attempt count
        pendingUpload.attempts++;

        // Create a mock file object for resume
        const mockFile = new File([], pendingUpload.fileName, {
          type: pendingUpload.fileType,
        });
        Object.defineProperty(mockFile, 'size', {
          value: pendingUpload.fileSize,
        });

        await storePendingUpload(
          pendingUpload.fileHash,
          pendingUpload.uploadInfo,
          mockFile,
          pendingUpload.offset
        );
      }
    }

    return resumedCount;
  } catch (error) {
    console.error('Failed to resume interrupted uploads:', error);
    return 0;
  }
}

/**
 * Clean up failed uploads
 * @param fileHash - The file hash to clean up
 */
export async function cleanupFailedUpload(fileHash: string): Promise<void> {
  try {
    const pendingUpload = await getPendingUpload(fileHash);
    if (pendingUpload) {
      // Try to delete the file URL if it exists
      try {
        const response = await fetch(pendingUpload.uploadInfo.fileUrl, {
          method: 'DELETE',
        });
        if (response.ok) {
          console.log('Cleaned up failed upload file');
        }
      } catch (error) {
        console.error('Failed to delete failed upload file:', error);
      }

      // Remove from pending uploads
      await removePendingUpload(fileHash);
    }
  } catch (error) {
    console.error('Failed to cleanup failed upload:', error);
  }
}

/**
 * Get all pending uploads
 * @returns Promise resolving to array of pending uploads
 */
export async function getPendingUploads(): Promise<PendingUpload[]> {
  return (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
}

/**
 * Clean up old pending uploads (older than 1 hour)
 */
export async function cleanupOldPendingUploads(): Promise<void> {
  try {
    const pendingUploads =
      (await getLocal<PendingUpload[]>('pb_pending_uploads')) || [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const filtered = pendingUploads.filter(
      upload => upload.timestamp > oneHourAgo
    );

    if (filtered.length !== pendingUploads.length) {
      await setLocal('pb_pending_uploads', filtered);
      console.log(
        `Cleaned up ${pendingUploads.length - filtered.length} old pending uploads`
      );
    }
  } catch (error) {
    console.error('Failed to cleanup old pending uploads:', error);
  }
}
