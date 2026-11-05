import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { EnhancedPush } from '../../types/api-interfaces';

// Legacy interface for backward compatibility
interface PushbulletPush {
  iden: string;
  type: string;
  title?: string;
  body?: string;
  url?: string;
  source_device_iden: string;
  target_device_iden?: string;
  created: number;
  modified: number;
  dismissed: boolean;
  receiver_iden?: string;
  channel_iden?: string; // Channel iden for pushes received from channels
  isChannelPush?: boolean;
  // File-specific fields for legacy compatibility
  file_name?: string;
  file_type?: string;
  file_url?: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
}

interface PushbulletDevice {
  iden: string;
  nickname: string;
  type: string;
  active: boolean;
  created: number;
  modified: number;
  model?: string;
  pushable?: boolean;
  has_sms?: boolean;
}

interface StoredState {
  pushes: EnhancedPush[];
  cursor?: string;
  hasMore: boolean;
  lastModified?: number;
  activeSubtab: 'channels' | 'devices';
}

@customElement('pb-recent-pushes')
export class RecentPushes extends LitElement {
  @state()
  private pushes: EnhancedPush[] = [];

  @state()
  private isLoading = false;

  @state()
  private errorMessage = '';

  @state()
  private hasMore = false;

  @state()
  private cursor?: string;

  @state()
  private activeSubtab: 'channels' | 'devices' = 'devices';

  @state()
  private devices: PushbulletDevice[] = [];

  @state()
  private lastModified?: number;

  private currentDeviceIden?: string;

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
    }

    .pushes-container {
      padding: 16px;
      max-width: 500px;
      height: 100%;
      max-height: 500px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
    }

    .pushes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee;
    }

    .pushes-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-top: 0px;
      margin-bottom: 4px;
    }

    .refresh-button {
      background: none;
      border: none;
      color: #007bff;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .refresh-button:hover {
      background: #f8f9fa;
    }

    .refresh-button:disabled {
      color: #6c757d;
      cursor: not-allowed;
    }

    .subtab-navigation {
      display: flex;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
    }

    .subtab-button {
      background: none;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .subtab-button.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .subtab-button:hover:not(.active) {
      color: #333;
      background: #f8f9fa;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .push-list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      min-height: 0;
      padding-bottom: 8px;
    }

    .push-item {
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 8px;
      background: white;
      transition: box-shadow 0.2s;
    }

    .push-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .push-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .push-title {
      font-weight: 500;
      color: #333;
      margin: 0;
      flex: 1;
      margin-right: 8px;
    }

    .push-actions {
      display: flex;
      gap: 4px;
    }

    .action-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 12px;
      transition: background 0.2s;
    }

    .action-button:hover {
      background: #f8f9fa;
    }

    .action-button.dismiss {
      color: #6c757d;
    }

    .action-button.delete {
      color: #dc3545;
    }

    .action-button.delete:disabled {
      color: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .push-body {
      color: #666;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .push-url {
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
      word-break: break-all;
    }

    .push-url:hover {
      text-decoration: underline;
    }

    .push-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }

    .push-type {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 500;
    }

    .push-time {
      color: #999;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .ownership-info {
      color: #007bff;
      font-style: italic;
    }

    .device-icon {
      font-size: 12px;
    }

    /* File display styles */
    .file-display {
      margin: 12px 0;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      overflow: hidden;
      background: #f8f9fa;
    }

    .file-thumbnail {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }

    .file-info {
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .file-details {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      font-weight: 500;
      font-size: 14px;
      color: #333;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .file-type {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .file-download {
      background: #007bff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      flex-shrink: 0;
    }

    .file-download:hover {
      background: #0056b3;
    }

    .file-preview {
      position: relative;
      cursor: pointer;
    }

    .file-preview:hover::after {
      content: '🔍 Click to view';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    .channel-badge {
      background: #007bff;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    .error {
      padding: 12px;
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .load-more {
      width: 100%;
      padding: 4px 6px;
      background: #007bff;
      border: 1px solid #007bff;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin-top: 12px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .load-more:hover:not(:disabled) {
      background: #0056b3;
      border-color: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    }

    .load-more:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(0, 123, 255, 0.3);
    }

    .load-more:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #6c757d;
      border-color: #6c757d;
      transform: none;
      box-shadow: none;
    }

    .load-more-container {
      flex: 0 0 auto;
      padding: 0 6px;
      margin-top: 2px;
      margin-bottom: 2px;
    }

    .load-more-icon {
      font-size: 16px;
    }

    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .pushes-container {
        padding: 12px;
        max-height: 450px;
      }

      .pushes-header {
        margin-bottom: 12px;
        padding-bottom: 8px;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .pushes-title {
        font-size: 16px;
      }

      .refresh-button {
        font-size: 13px;
        padding: 6px 10px;
        align-self: flex-end;
      }

      .push-list {
        flex: 1;
        min-height: 0;
      }

      .push-item {
        padding: 10px;
        margin-bottom: 6px;
      }

      .push-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }

      .push-title {
        font-size: 14px;
        margin-right: 0;
      }

      .push-actions {
        align-self: flex-end;
      }

      .push-body {
        font-size: 13px;
      }

      .push-url {
        font-size: 13px;
      }

      .push-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        font-size: 11px;
      }

      .empty-state {
        padding: 30px 16px;
      }

      .empty-state-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .load-more {
        font-size: 13px;
        padding: 6px 8px;
      }

      .load-more-container {
        padding: 0 12px;
      }
    }

    @media (max-width: 360px) {
      .pushes-container {
        padding: 8px;
        max-height: 400px;
      }

      .pushes-title {
        font-size: 15px;
      }

      .push-item {
        padding: 8px;
      }

      .push-title {
        font-size: 13px;
      }

      .push-body {
        font-size: 12px;
      }

      .push-url {
        font-size: 12px;
      }

      .action-button {
        padding: 3px;
        font-size: 11px;
      }
    }

    @media (min-width: 500px) {
      .pushes-container {
        padding: 20px;
        max-width: 550px;
        max-height: 500px;
      }

      .pushes-title {
        font-size: 18px;
      }

      .push-list {
        flex: 1;
        min-height: 0;
      }

      .push-item {
        padding: 14px;
      }

      .push-title {
        font-size: 15px;
      }

      .push-body {
        font-size: 14px;
      }

      .load-more {
        font-size: 14px;
        padding: 6px 8px;
      }

      .load-more-container {
        padding: 0 8px;
      }
    }

    @media (min-width: 600px) {
      .pushes-container {
        max-width: 600px;
        padding: 24px;
        max-height: 500px;
      }

      .pushes-title {
        font-size: 20px;
      }

      .push-item {
        padding: 16px;
      }

      .push-title {
        font-size: 16px;
      }

      .push-body {
        font-size: 15px;
      }

      .load-more {
        font-size: 15px;
        padding: 14px 18px;
      }
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .pushes-header {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .pushes-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .refresh-button:hover {
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .refresh-button:disabled {
      color: #6c757d;
    }

    :host-context(html[data-theme='dark']) .subtab-navigation {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .subtab-button {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subtab-button.active {
      color: #6ea8fe;
      border-bottom-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .subtab-button:hover:not(.active) {
      color: #dee2e6;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .push-item {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .push-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .push-body {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .push-url {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .push-url:hover {
      color: #9ec5fe;
    }

    :host-context(html[data-theme='dark']) .push-meta,
    :host-context(html[data-theme='dark']) .push-time {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .push-type {
      background: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .device-info {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .ownership-info {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .file-display {
      background: #2b3035;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .file-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-type {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-download {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .file-download:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .channel-badge {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error {
      background: #2c0b0e;
      color: #ea868f;
      border-color: #842029;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .load-more {
      background: #0d6efd;
      border-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .load-more:hover:not(:disabled) {
      background: #0b5ed7;
      border-color: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .load-more:disabled {
      background: #6c757d;
      border-color: #6c757d;
    }

    :host-context(html[data-theme='dark']) .loading-spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadStoredState();
    this.loadDevices();
    // Always refresh pushes when the component connects to ensure we have the latest data
    this.loadPushes(true);

    // Listen for WebSocket sync updates and push creation events
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove message listener
    chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
  }

  private async loadStoredState(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get('pb_recent_pushes_state');
      if (stored.pb_recent_pushes_state) {
        const state: StoredState = stored.pb_recent_pushes_state;
        // Since we're now using enhanced pushes, we can directly use the stored pushes
        // The metadata should already be properly computed by PushEnricher
        this.pushes = state.pushes || [];
        this.cursor = state.cursor;
        this.hasMore = state.hasMore || false;
        this.lastModified = state.lastModified;
        this.activeSubtab = state.activeSubtab || 'devices';
        console.log('🔄 [RecentPushes] Restored state:', {
          pushesCount: this.pushes.length,
          cursor: this.cursor,
          hasMore: this.hasMore,
          activeSubtab: this.activeSubtab,
        });
      }
    } catch (error) {
      console.error('Failed to load stored state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state: StoredState = {
        pushes: this.pushes,
        cursor: this.cursor,
        hasMore: this.hasMore,
        lastModified: this.lastModified,
        activeSubtab: this.activeSubtab,
      };
      await chrome.storage.local.set({ pb_recent_pushes_state: state });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  private async loadDevices(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'getDevices',
      });
      if (response.ok) {
        this.devices = response.devices || [];
      }

      // Load current device ID from storage
      const stored = await chrome.storage.local.get('pb_device_iden');
      this.currentDeviceIden = stored.pb_device_iden;
      console.log(
        '🔄 [RecentPushes] Current device ID:',
        this.currentDeviceIden
      );
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  }

  async loadPushes(refresh = false) {
    console.log('🔄 [RecentPushes] loadPushes called with refresh:', refresh);

    if (this.isLoading) {
      console.log('⚠️ [RecentPushes] Already loading, skipping request');
      return;
    }

    console.log('🔄 [RecentPushes] Setting isLoading to true');
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const lastModified = refresh ? undefined : this.lastModified;
      console.log('📋 [RecentPushes] Request params:', {
        refresh,
        lastModified,
        cursor: refresh ? 'undefined' : this.cursor,
        currentPushesCount: this.pushes.length,
      });

      const response = await chrome.runtime.sendMessage({
        cmd: 'getEnhancedPushHistory',
        limit: 100,
        modifiedAfter: lastModified,
        cursor: refresh ? undefined : this.cursor,
        trigger: {
          type: 'popup_open',
          timestamp: Date.now(),
        },
      });

      console.log('📡 [RecentPushes] Response received:', {
        ok: response.ok,
        error: response.error,
        pushesCount: response.history?.pushes?.length || 0,
        hasCursor: !!response.history?.cursor,
      });

      if (response.ok) {
        if (refresh) {
          console.log('🔄 [RecentPushes] Refreshing pushes list');
          this.pushes = response.history.pushes;
        } else {
          console.log(
            '➕ [RecentPushes] Appending pushes to existing list with deduplication'
          );
          // Create a map of existing pushes by iden for efficient lookup
          const existingPushesMap = new Map(
            this.pushes.map(push => [push.iden, push])
          );

          // Filter out duplicates and add new pushes
          const newPushes = response.history.pushes.filter(
            (push: EnhancedPush) => !existingPushesMap.has(push.iden)
          );

          if (newPushes.length > 0) {
            console.log(
              `➕ [RecentPushes] Adding ${newPushes.length} new pushes (filtered out ${response.history.pushes.length - newPushes.length} duplicates)`
            );
            this.pushes = [...this.pushes, ...newPushes];
          } else {
            console.log(
              'ℹ️ [RecentPushes] No new pushes to add (all were duplicates)'
            );
          }
        }

        // Sort pushes by created timestamp (newest first) to maintain chronological order
        this.pushes.sort((a, b) => b.created - a.created);

        this.cursor = response.history.cursor;
        this.hasMore = !!response.history.cursor;

        // Update last modified timestamp
        if (response.history.pushes.length > 0) {
          const highestModified = Math.max(
            ...response.history.pushes.map((p: PushbulletPush) => p.modified)
          );
          this.lastModified = highestModified;
        }

        // Save state after successful load
        await this.saveState();

        console.log('✅ [RecentPushes] Successfully updated pushes:', {
          totalPushes: this.pushes.length,
          newCursor: this.cursor,
          hasMore: this.hasMore,
        });
      } else {
        console.error('❌ [RecentPushes] API returned error:', response.error);
        this.errorMessage = response.error || 'Failed to load pushes';
      }
    } catch (error) {
      console.error('❌ [RecentPushes] Exception occurred:', error);
      this.errorMessage = 'Failed to load pushes';
    } finally {
      console.log('🔄 [RecentPushes] Setting isLoading to false');
      this.isLoading = false;
    }
  }

  private async handleDismiss(pushIden: string) {
    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'dismissPush',
        pushIden,
      });

      if (response.ok) {
        // Remove from local list
        this.pushes = this.pushes.filter(p => p.iden !== pushIden);
        await this.saveState();
      } else {
        this.errorMessage = 'Failed to dismiss push';
      }
    } catch (error) {
      this.errorMessage = 'Failed to dismiss push';
      console.error('Failed to dismiss push:', error);
    }
  }

  private async handleDelete(pushIden: string) {
    try {
      // Find the push to check ownership
      const push = this.pushes.find(p => p.iden === pushIden);
      if (!push) {
        this.errorMessage = 'Push not found';
        return;
      }

      // Check device ownership before allowing deletion
      if (!this.isPushOwnedByCurrentDevice(push)) {
        this.errorMessage = 'Cannot delete - you do not own this push';
        return;
      }

      const response = await chrome.runtime.sendMessage({
        cmd: 'deletePush',
        pushIden,
      });

      if (response.ok) {
        // Remove from local list
        this.pushes = this.pushes.filter(p => p.iden !== pushIden);
        await this.saveState();
      } else {
        this.errorMessage = 'Failed to delete push';
      }
    } catch (error) {
      this.errorMessage = 'Failed to delete push';
      console.error('Failed to delete push:', error);
    }
  }

  private handleRefresh() {
    this.loadPushes(true);
  }

  private handleLoadMore() {
    this.loadPushes(false);
  }

  private handleSubtabChange(subtab: 'channels' | 'devices') {
    this.activeSubtab = subtab;
    this.saveState();
  }

  private handleMessage(message: any): void {
    // Handle WebSocket sync updates
    if (
      message.cmd === 'syncHistory' &&
      (message.source === 'tickle' || message.source === 'background')
    ) {
      // Reload pushes when WebSocket tickle or background sync is received
      // Use refresh mode to ensure we get the latest data and avoid duplicates
      console.log('🔄 [RecentPushes] Received sync message:', message);
      this.loadPushes(true);
    }

    // Handle push creation events
    if (message.cmd === 'pushCreated') {
      console.log(
        '🔔 [RecentPushes] Received pushCreated message, refreshing pushes.'
      );
      this.loadPushes(true);
    }
  }

  private getFilteredPushes(): EnhancedPush[] {
    if (this.activeSubtab === 'channels') {
      // Show channel pushes but exclude subscription posts
      // (subscription posts would come from subscribed channels, not owned channels)
      return this.pushes.filter(
        push => push.channel_iden && !push.receiver_iden // Exclude pushes received from subscriptions
      );
    } else {
      // Show pushes to/from own devices (excluding channel pushes)
      return this.pushes.filter(push => !push.channel_iden);
    }
  }

  private getDeviceName(deviceIden: string): string {
    const device = this.devices.find(d => d.iden === deviceIden);
    return device ? device.nickname : 'Unknown Device';
  }

  private getDeviceType(deviceIden: string): string {
    const device = this.devices.find(d => d.iden === deviceIden);
    return device ? device.type : 'unknown';
  }

  private getEmptyStateMessage(): string {
    if (this.activeSubtab === 'channels') {
      return 'channel pushes yet';
    } else {
      return 'device pushes yet';
    }
  }

  private getEmptyStateSubMessage(): string {
    if (this.activeSubtab === 'channels') {
      return 'Subscribe to channels to see posts here!';
    } else {
      return 'Send your first push to get started!';
    }
  }

  private isPushOwnedByCurrentDevice(push: EnhancedPush): boolean {
    // Use the enhanced metadata that's already computed by PushEnricher
    return push.metadata?.is_owned_by_user || false;
  }

  private getDeviceIcon(deviceType: string): string {
    switch (deviceType) {
      case 'android':
        return '📱';
      case 'ios':
        return '📱';
      case 'chrome':
        return '🌐';
      case 'firefox':
        return '🦊';
      case 'safari':
        return '🍎';
      case 'opera':
        return '🔴';
      case 'edge':
        return '🔵';
      default:
        return '💻';
    }
  }

  private formatTime(timestamp: number): string {
    // Convert Unix timestamp (seconds) to milliseconds
    const timestampMs = timestamp * 1000;
    const now = Date.now();
    const diff = now - timestampMs;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestampMs).toLocaleDateString();
  }

  private getPushIcon(type: string): string {
    switch (type) {
      case 'note':
        return '📝';
      case 'link':
        return '🔗';
      case 'file':
        return '📎';
      case 'address':
        return '📍';
      case 'list':
        return '📋';
      default:
        return '📄';
    }
  }

  // File handling methods
  private getFileIcon(fileType?: string, fileName?: string): string {
    if (!fileType && !fileName) return '📎';

    const type = fileType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';

    // Image types
    if (
      type.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(name)
    ) {
      return '🖼️';
    }

    // Video types
    if (
      type.startsWith('video/') ||
      /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(name)
    ) {
      return '🎥';
    }

    // Audio types
    if (
      type.startsWith('audio/') ||
      /\.(mp3|wav|flac|aac|ogg|m4a)$/.test(name)
    ) {
      return '🎵';
    }

    // Document types
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄';
    if (type.includes('word') || /\.(doc|docx)$/.test(name)) return '📝';
    if (type.includes('excel') || /\.(xls|xlsx)$/.test(name)) return '📊';
    if (type.includes('powerpoint') || /\.(ppt|pptx)$/.test(name)) return '📊';

    // Archive types
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return '📦';

    // Code types
    if (/\.(js|ts|html|css|json|xml|py|java|cpp|c|h)$/.test(name)) return '💻';

    return '📎';
  }

  private isImageFile(push: EnhancedPush): boolean {
    if (push.image_url) return true;
    if (!push.file_type && !push.file_name) return false;

    const type = push.file_type?.toLowerCase() || '';
    const name = push.file_name?.toLowerCase() || '';

    return (
      type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/.test(name)
    );
  }

  private handleFileDownload(push: EnhancedPush) {
    if (push.file_url) {
      // Use chrome.downloads API if available (for extensions)
      if (chrome?.downloads) {
        chrome.downloads.download({
          url: push.file_url,
          filename: push.file_name || 'download',
        });
      } else {
        // Fallback to opening URL
        window.open(push.file_url, '_blank');
      }
    }
  }

  private renderFileDisplay(push: EnhancedPush) {
    if (push.type !== 'file') return '';

    return html`
      <div class="file-display">
        ${this.isImageFile(push) && push.image_url
          ? html`
              <div
                class="file-preview"
                @click=${() => window.open(push.image_url, '_blank')}
              >
                <img
                  src="${push.image_url}"
                  alt="${push.file_name || 'Image'}"
                  class="file-thumbnail"
                  loading="lazy"
                />
              </div>
            `
          : ''}

        <div class="file-info">
          <span class="file-icon"
            >${this.getFileIcon(push.file_type, push.file_name)}</span
          >
          <div class="file-details">
            <div class="file-name">${push.file_name || 'Unknown File'}</div>
            <div class="file-type">${push.file_type || 'Unknown Type'}</div>
          </div>
          ${push.file_url
            ? html`
                <button
                  class="file-download"
                  @click=${() => this.handleFileDownload(push)}
                  title="Download file"
                >
                  📥 Download
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }

  render() {
    const filteredPushes = this.getFilteredPushes();

    return html`
      <div class="pushes-container">
        <div class="pushes-header">
          <h3 class="pushes-title">Recent Pushes</h3>
          <button
            class="refresh-button"
            @click=${this.handleRefresh}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading
              ? html` <span class="loading-spinner"></span> `
              : ''}
            Refresh
          </button>
        </div>

        <div class="subtab-navigation">
          <button
            class="subtab-button ${this.activeSubtab === 'devices'
              ? 'active'
              : ''}"
            @click=${() => this.handleSubtabChange('devices')}
          >
            Own Devices & Contacts
          </button>
          <button
            class="subtab-button ${this.activeSubtab === 'channels'
              ? 'active'
              : ''}"
            @click=${() => this.handleSubtabChange('channels')}
          >
            Channels & Subs
          </button>
        </div>

        ${this.errorMessage
          ? html` <div class="error">${this.errorMessage}</div> `
          : ''}

        <div class="content-area">
          <div class="push-list">
            ${filteredPushes.length === 0 && !this.isLoading
              ? html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No ${this.getEmptyStateMessage()}</p>
                    <p>${this.getEmptyStateSubMessage()}</p>
                  </div>
                `
              : ''}
            ${filteredPushes.map(
              push => html`
                <div class="push-item">
                  <div class="push-header">
                    <h4 class="push-title">
                      ${push.type === 'file'
                        ? this.getFileIcon(push.file_type, push.file_name)
                        : this.getPushIcon(push.type)}
                      ${push.title ||
                      (push.type === 'link'
                        ? push.url
                        : push.type === 'file'
                          ? push.file_name || 'File'
                          : 'Untitled')}
                      ${push.sender_name
                        ? html`<span
                            style="font-weight: normal; color: #666; font-size: 12px;"
                          >
                            • from ${push.sender_name}</span
                          >`
                        : ''}
                    </h4>
                    <div class="push-actions">
                      <button
                        class="action-button dismiss"
                        @click=${() => this.handleDismiss(push.iden)}
                        title="Dismiss"
                      >
                        ✓
                      </button>
                      ${this.isPushOwnedByCurrentDevice(push)
                        ? html`
                            <button
                              class="action-button delete"
                              @click=${() => this.handleDelete(push.iden)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          `
                        : ''}
                    </div>
                  </div>

                  ${push.body
                    ? html` <div class="push-body">${push.body}</div> `
                    : ''}
                  ${push.url
                    ? html`
                        <a href=${push.url} class="push-url" target="_blank">
                          ${push.url}
                        </a>
                      `
                    : ''}
                  ${this.renderFileDisplay(push)}

                  <div class="push-meta">
                    <div class="push-info">
                      <span class="push-type">${push.type}</span>
                      ${push.channel_iden
                        ? html`<span class="channel-badge"
                            >${push.metadata?.source_channel_name ||
                            push.channel_iden}</span
                          >`
                        : ''}
                    </div>
                    <span class="push-time"
                      >${this.formatTime(push.created)}</span
                    >
                  </div>

                  <div class="device-info">
                    <span class="device-icon"
                      >${this.getDeviceIcon(
                        this.getDeviceType(push.source_device_iden)
                      )}</span
                    >
                    <span
                      >${push.metadata?.display_source ||
                      `From: ${this.getDeviceName(push.source_device_iden)}`}</span
                    >
                    ${push.metadata?.ownership_reason
                      ? html`<span class="ownership-info"
                          >• ${push.metadata.ownership_reason}</span
                        >`
                      : ''}
                  </div>
                </div>
              `
            )}
            ${this.isLoading
              ? html`
                  <div class="loading">
                    <span class="loading-spinner"></span>
                    Loading pushes...
                  </div>
                `
              : ''}
          </div>
          ${this.hasMore && !this.isLoading
            ? html`
                <div class="load-more-container">
                  <button class="load-more" @click=${this.handleLoadMore}>
                    <span class="load-more-icon">📄</span>
                    Load More Pushes
                  </button>
                </div>
              `
            : ''}
          ${this.isLoading && this.hasMore
            ? html`
                <div class="load-more-container">
                  <button class="load-more" disabled>
                    <span class="loading-spinner"></span>
                    Loading More...
                  </button>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}
