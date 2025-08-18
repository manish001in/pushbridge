/**
 * File drop component for Pushbridge extension
 * Provides drag-and-drop and file picker functionality for file uploads
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface FileUploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

@customElement('pb-file-drop')
export class PbFileDrop extends LitElement {
  @property({ type: String })
  targetDeviceIden?: string;

  @state()
  private dragOver = false;

  @state()
  private uploadState: FileUploadState = {
    file: null,
    uploading: false,
    progress: 0,
    error: null,
  };

  @state()
  private maxFileSize = 25 * 1024 * 1024; // 25MB

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .file-drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      transition: all 0.2s ease;
      background: #fafafa;
      cursor: pointer;
      position: relative;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .file-drop-zone:hover {
      border-color: #007bff;
      background: #f0f8ff;
    }

    .file-drop-zone.drag-over {
      border-color: #007bff;
      background: #e3f2fd;
      transform: scale(1.02);
    }

    .file-drop-zone.error {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .file-drop-zone.uploading {
      border-color: #28a745;
      background: #f8fff9;
    }

    .drop-icon {
      font-size: 2rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .drop-text {
      color: #666;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .drop-hint {
      color: #999;
      font-size: 0.8rem;
    }

    .file-input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .file-info {
      margin-top: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      width: 100%;
      box-sizing: border-box;
    }

    .file-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 0.25rem;
      word-break: break-all;
    }

    .file-size {
      color: #666;
      font-size: 0.8rem;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: #007bff;
      transition: width 0.3s ease;
      border-radius: 2px;
    }

    .progress-text {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      text-align: center;
    }

    .upload-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      transition: background 0.2s ease;
    }

    .upload-button:hover:not(:disabled) {
      background: #0056b3;
    }

    .upload-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .cancel-button {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      margin-left: 0.5rem;
      transition: background 0.2s ease;
    }

    .cancel-button:hover {
      background: #545b62;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 0.5rem;
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone {
      border-color: #495057;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone:hover {
      border-color: #0d6efd;
      background: #031633;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.drag-over {
      border-color: #0d6efd;
      background: #031633;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.error {
      border-color: #ea868f;
      background: #2c0b0e;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.uploading {
      border-color: #75b798;
      background: #051b11;
    }

    :host-context(html[data-theme='dark']) .drop-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .drop-text {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .drop-hint {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .file-info {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .file-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-size {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .progress-bar {
      background: #495057;
    }

    :host-context(html[data-theme='dark']) .progress-fill {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .progress-text {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-message {
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .upload-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .upload-button:hover:not(:disabled) {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .upload-button:disabled {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark']) .cancel-button {
      background: #6c757d;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .cancel-button:hover {
      background: #5c636a;
    }
  `;

  render() {
    return html`
      <div
        class="file-drop-zone ${this.getZoneClasses()}"
        @click=${this.handleZoneClick}
      >
        <input
          type="file"
          class="file-input"
          @change=${this.handleFileSelect}
          @dragenter=${this.handleDragEnter}
          @dragover=${this.handleDragOver}
          @dragleave=${this.handleDragLeave}
          @drop=${this.handleDrop}
        />

        ${!this.uploadState.file
          ? html`
              <div class="drop-icon">📁</div>
              <div class="drop-text">Drop a file here or click to browse</div>
              <div class="drop-hint">Maximum file size: 25MB</div>
            `
          : html`
              <div class="file-info">
                <div class="file-name">${this.uploadState.file.name}</div>
                <div class="file-size">
                  ${this.formatFileSize(this.uploadState.file.size)}
                </div>

                ${this.uploadState.uploading
                  ? html`
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          style="width: ${this.uploadState.progress}%"
                        ></div>
                      </div>
                      <div class="progress-text">
                        ${this.uploadState.progress}% uploaded
                      </div>
                    `
                  : ''}
                ${this.uploadState.error
                  ? html`
                      <div class="error-message">${this.uploadState.error}</div>
                    `
                  : ''}

                <div class="button-group">
                  ${!this.uploadState.uploading
                    ? html`
                        <button
                          class="upload-button"
                          @click=${this.handleUpload}
                          ?disabled=${!this.isFileValid(this.uploadState.file)}
                        >
                          Send File
                        </button>
                        <button
                          class="cancel-button"
                          @click=${this.handleCancel}
                        >
                          Cancel
                        </button>
                      `
                    : ''}
                </div>
              </div>
            `}
      </div>
    `;
  }

  private getZoneClasses(): string {
    const classes = [];

    if (this.dragOver) classes.push('drag-over');
    if (this.uploadState.error) classes.push('error');
    if (this.uploadState.uploading) classes.push('uploading');

    return classes.join(' ');
  }

  private handleZoneClick(e: Event): void {
    // Don't trigger if clicking on buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    const fileInput = this.shadowRoot?.querySelector(
      '.file-input'
    ) as HTMLInputElement;
    fileInput?.click();
  }

  private handleFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.setFile(file);
    }
  }

  private handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.setFile(files[0]);
    }
  }

  private setFile(file: File): void {
    this.uploadState = {
      file,
      uploading: false,
      progress: 0,
      error: null,
    };

    // Validate file size
    if (!this.isFileValid(file)) {
      this.uploadState.error = `File size (${this.formatFileSize(file.size)}) exceeds the 25MB limit`;
    }
  }

  private isFileValid(file: File): boolean {
    return file.size <= this.maxFileSize;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async handleUpload(): Promise<void> {
    if (!this.uploadState.file || !this.isFileValid(this.uploadState.file)) {
      return;
    }

    this.uploadState.uploading = true;
    this.uploadState.progress = 0;
    this.uploadState.error = null;

    try {
      // Convert File to ArrayBuffer to preserve data through message passing
      const fileBuffer = await this.uploadState.file.arrayBuffer();
      const fileData = {
        name: this.uploadState.file.name,
        type: this.uploadState.file.type,
        size: this.uploadState.file.size,
        lastModified: this.uploadState.file.lastModified,
        buffer: Array.from(new Uint8Array(fileBuffer)), // Convert to regular array for serialization
      };

      // Send message to background script to handle upload
      const response = await chrome.runtime.sendMessage({
        cmd: 'UPLOAD_FILE',
        payload: {
          fileData,
          targetDeviceIden: this.targetDeviceIden,
        },
      });

      if (response.success) {
        // Upload completed successfully
        this.dispatchEvent(
          new CustomEvent('upload-complete', {
            detail: { file: this.uploadState.file },
          })
        );

        // Reset state
        this.uploadState = {
          file: null,
          uploading: false,
          progress: 0,
          error: null,
        };
      } else {
        this.uploadState.error = response.error || 'Upload failed';
        this.uploadState.uploading = false;
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.uploadState.error = 'Upload failed. Please try again.';
      this.uploadState.uploading = false;
    }
  }

  private handleCancel(): void {
    this.uploadState = {
      file: null,
      uploading: false,
      progress: 0,
      error: null,
    };

    // Clear file input
    const fileInput = this.shadowRoot?.querySelector(
      '.file-input'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Public method to update progress (called from background script)
  public updateProgress(progress: number): void {
    if (this.uploadState.uploading) {
      this.uploadState.progress = progress;
    }
  }

  // Public method to set error
  public setError(error: string): void {
    this.uploadState.error = error;
    this.uploadState.uploading = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pb-file-drop': PbFileDrop;
  }
}
