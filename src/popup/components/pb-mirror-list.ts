/**
 * Mirror List Component for Pushbridge
 * Displays active mirrored notifications from phone
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface MirrorNotification {
  id: string;
  meta: {
    title: string;
    body: string;
    application_name?: string;
    package_name: string;
    icon_url?: string;
    expiresAt: number;
  };
}

@customElement('pb-mirror-list')
export class PbMirrorList extends LitElement {
  @property({ type: Boolean }) loading = false;
  @state() private mirrors: MirrorNotification[] = [];
  @state() private error: string | null = null;

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      width: 100%;
    }

    .mirror-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    .mirror-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .mirror-item:last-child {
      border-bottom: none;
    }

    .mirror-item:hover {
      background-color: #f0f0f0;
    }

    .mirror-item:active {
      background-color: #e0e0e0;
    }

    .app-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      margin-right: 12px;
      flex-shrink: 0;
      background: #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #666;
    }

    .mirror-content {
      flex: 1;
      min-width: 0;
    }

    .app-name {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-body {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .empty-state {
      padding: 24px;
      text-align: center;
      color: #666;
    }

    .empty-state-icon {
      font-size: 24px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .loading-state {
      padding: 24px;
      text-align: center;
      color: #666;
    }

    .error-state {
      padding: 16px;
      background: #ffebee;
      border: 1px solid #ffcdd2;
      border-radius: 6px;
      color: #c62828;
      font-size: 12px;
      margin: 8px 0;
    }

    .refresh-button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 8px;
    }

    .refresh-button:hover {
      background: #1976d2;
    }

    .refresh-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .shortcut-hint {
      text-align: center;
      color: #6b7280;
      font-size: 11px;
      font-style: italic;
      margin-bottom: 20px;
      padding: 2px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .mirror-list {
      border-color: #495057;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .mirror-item {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .mirror-item:hover {
      background-color: #343a40;
    }

    :host-context(html[data-theme='dark']) .mirror-item:active {
      background-color: #495057;
    }

    :host-context(html[data-theme='dark']) .app-icon {
      background: #495057;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .app-name {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .notification-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .notification-body {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .loading-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-state {
      background: #2c0b0e;
      border-color: #842029;
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .refresh-button:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .refresh-button:disabled {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark']) .shortcut-hint {
      color: rgba(222, 226, 230, 0.75);
      background: #2b3035;
      border-color: #495057;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadMirrors();
  }

  async loadMirrors() {
    this.loading = true;
    this.error = null;

    try {
      console.log('🔍 [MirrorList] Loading active mirrors');
      const response = await chrome.runtime.sendMessage({
        cmd: 'getActiveMirrors',
      });

      if (response.success) {
        this.mirrors = response.mirrors || [];
        console.log('🔍 [MirrorList] Loaded mirrors:', {
          count: this.mirrors.length,
          mirrors: this.mirrors.map(m => ({
            id: m.id,
            app: m.meta.application_name,
            title: m.meta.title,
          })),
        });
      } else {
        this.error = response.error || 'Failed to load notifications';
        console.error(
          '🔍 [MirrorList] Failed to load mirrors:',
          response.error
        );
      }
    } catch (error) {
      console.error('🔍 [MirrorList] Failed to load mirrors:', error);
      this.error = 'Failed to load notifications';
    } finally {
      this.loading = false;
    }
  }

  async handleMirrorClick(mirror: MirrorNotification) {
    try {
      console.log('👆 [MirrorList] Mirror clicked:', {
        id: mirror.id,
        app: mirror.meta.application_name,
        title: mirror.meta.title,
      });

      // Focus the corresponding Chrome notification
      await chrome.notifications.update(mirror.id, {
        priority: 2, // High priority to highlight
      });

      // Clear the highlight after a short delay
      setTimeout(() => {
        chrome.notifications.update(mirror.id, {
          priority: 0,
        });
      }, 2000);
    } catch (error) {
      console.error('👆 [MirrorList] Failed to focus notification:', error);
    }
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <div>Loading notifications...</div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="error-state">
          <div>${this.error}</div>
          <button
            class="refresh-button"
            @click=${this.loadMirrors}
            ?disabled=${this.loading}
          >
            Retry
          </button>
        </div>
      `;
    }

    if (this.mirrors.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div>No active notifications</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Phone notifications will appear here
          </div>
        </div>
      `;
    }

    return html`
      <div class="mirror-list">
        ${this.mirrors.map(
          mirror => html`
            <div class="shortcut-hint">Dismiss on origin device</div>
            <div
              class="mirror-item"
              @click=${() => this.handleMirrorClick(mirror)}
              title="Click to focus notification"
            >
              <div class="app-icon">
                ${mirror.meta.icon_url
                  ? html`
                      <img
                        src="${mirror.meta.icon_url}"
                        alt="${mirror.meta.application_name || 'App'}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                      />
                    `
                  : html`
                      ${(mirror.meta.application_name || 'A')
                        .charAt(0)
                        .toUpperCase()}
                    `}
              </div>
              <div class="mirror-content">
                <div class="app-name">
                  ${mirror.meta.application_name || mirror.meta.package_name}
                </div>
                <div class="notification-title">${mirror.meta.title}</div>
                <div class="notification-body">${mirror.meta.body}</div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pb-mirror-list': PbMirrorList;
  }
}
