/**
 * Subscriptions Component
 * Implements M6-02: Channel Subscription Management & Recent Posts
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface ChannelInfo {
  iden: string;
  tag: string;
  name: string;
  description: string;
  image_url?: string;
}

interface ChannelSubscription {
  iden: string;
  created: number;
  modified: number;
  active: boolean;
  channel: ChannelInfo;
}

@customElement('pb-channels')
export class PbChannels extends LitElement {
  @property({ type: Array }) subscriptions: ChannelSubscription[] = [];
  @state() private searchQuery = '';
  @state() private searchResults: ChannelInfo[] = [];
  @state() private isLoading = false;
  @state() private isSearching = false;
  @state() private errorMessage = '';
  @state() private successMessage = '';
  @state() private activeSubtab: 'discover' | 'recent' = 'discover';
  @state() private subscriptionPosts: any[] = [];
  @state() private isLoadingPosts = false;

  private searchTimeout: number | null = null;

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      padding: 16px;
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    .channels-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .search-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .search-input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #007bff;
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
    .recent-pushes-section {
      padding: 16px 0;
    }
    .recent-pushes-content {
      padding: 20px;
      text-align: center;
      color: #666;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .loading-indicator {
      text-align: center;
      padding: 20px;
      color: #666;
      font-style: italic;
    }
    .subscription-posts {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .post-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }
    .post-card:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    }
    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .post-header .channel-name {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .post-date {
      color: #666;
    }
    .post-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .post-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .post-body {
      margin: 0;
      font-size: 13px;
      color: #555;
      line-height: 1.4;
    }
    .post-link {
      color: #007bff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    .post-link:hover {
      text-decoration: underline;
    }
    .search-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    .channel-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: white;
      transition: all 0.2s;
    }
    .channel-card:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    }
    .channel-icon {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      object-fit: cover;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #6c757d;
    }
    .channel-info {
      flex: 1;
      min-width: 0;
    }
    .channel-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .channel-description {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .channel-tag {
      font-size: 11px;
      color: #999;
      font-family: monospace;
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }
    .subscribe-button {
      padding: 6px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }
    .subscribe-button:hover {
      background: #0056b3;
    }
    .subscribe-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    .subscribed-badge {
      padding: 6px 12px;
      background: #28a745;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }
    .subscriptions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .refresh-button {
      padding: 6px 12px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .refresh-button:hover:not(:disabled) {
      background: #5a6268;
    }
    .refresh-button:disabled {
      background: #adb5bd;
      cursor: not-allowed;
    }
    .subscription-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: white;
    }
    .unsubscribe-button {
      padding: 6px 12px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .unsubscribe-button:hover {
      background: #c82333;
    }
    .loading {
      text-align: center;
      color: #666;
      font-size: 14px;
      padding: 20px;
    }
    .error-message {
      color: #dc3545;
      font-size: 14px;
      padding: 8px 12px;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .success-message {
      color: #155724;
      font-size: 14px;
      padding: 8px 12px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .empty-state {
      text-align: center;
      color: #666;
      font-size: 14px;
      padding: 40px 20px;
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
      background: #212529;
    }

    :host-context(html[data-theme='dark']) .search-input {
      background: #343a40;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input::placeholder {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subtab-navigation {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .subtab-button {
      color: rgba(222, 226, 230, 0.75);
    }

    :host-context(html[data-theme='dark']) .subtab-button.active {
      color: #6ea8fe;
      border-bottom-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .subtab-button:hover:not(.active) {
      color: #dee2e6;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .post-card {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .post-card:hover {
      border-color: #6ea8fe;
      box-shadow: 0 2px 8px rgba(13, 110, 253, 0.15);
    }

    :host-context(html[data-theme='dark']) .post-title {
      color: #e9ecef;
    }

    :host-context(html[data-theme='dark']) .post-body {
      color: #ced4da;
    }

    :host-context(html[data-theme='dark']) .post-date {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .post-link {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .post-link:hover {
      color: #9ec5fe;
    }

    :host-context(html[data-theme='dark']) .channel-card {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .channel-card:hover {
      border-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .channel-icon {
      background: #2b3035;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .channel-name {
      color: #e9ecef;
    }

    :host-context(html[data-theme='dark']) .channel-description {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .channel-tag {
      background: #2b3035;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subscribe-button {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .subscribe-button:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark'])
      .refresh-button:hover:not(:disabled) {
      background: #5c636a;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button {
      background: #dc3545;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:hover {
      background: #bb2d3b;
    }

    :host-context(html[data-theme='dark']) .error-message {
      background: #2c0b0e;
      border-color: #842029;
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .success-message {
      background: #051b11;
      border-color: #0f5132;
      color: #75b798;
    }

    :host-context(html[data-theme='dark']) .loading,
    :host-context(html[data-theme='dark']) .empty-state {
      color: rgba(222, 226, 230, 0.75);
    }

    :host-context(html[data-theme='dark']) .subscribe-button {
      padding: 6px 12px;
      background: rgb(11, 94, 215);
      color: #e6e1e3;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    :host-context(html[data-theme='dark'])
      .subscribe-button:hover:not(:disabled) {
      background: #003366;
    }

    :host-context(html[data-theme='dark']) .subscribe-button:disabled {
      background: #55515a;
      color: #a1a1aa;
      cursor: not-allowed;
    }

    :host-context(html[data-theme='dark']) .subscribed-badge {
      padding: 6px 12px;
      background: #4ade80; /* success green */
      color: #052e16;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    :host-context(html[data-theme='dark']) .subscriptions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    :host-context(html[data-theme='dark']) .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #e6e1e3;
      margin: 0;
    }

    :host-context(html[data-theme='dark']) .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    /* Container */
    :host-context(html[data-theme='dark']) .subscriptions-section {
      gap: 12px;
    }

    /* Card */
    :host-context(html[data-theme='dark']) .subscription-item {
      background: rgb(52, 58, 64); /* #343a40 */
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    }

    :host-context(html[data-theme='dark']) .subscription-item:hover {
      background: #2b3035;
      border-color: #5a5f66;
    }

    /* Channel icon */
    :host-context(html[data-theme='dark']) .channel-icon {
      background: #2b3035;
      color: #adb5bd;
      border: 1px solid #495057;
      border-radius: 8px;
    }

    /* Text hierarchy */
    :host-context(html[data-theme='dark']) .channel-info h1,
    :host-context(html[data-theme='dark']) .channel-info h2,
    :host-context(html[data-theme='dark']) .channel-info h3,
    :host-context(html[data-theme='dark']) .channel-info h4,
    :host-context(html[data-theme='dark']) .channel-info .channel-name,
    :host-context(html[data-theme='dark']) .channel-info .title {
      color: #e6e1e3;
    }

    :host-context(html[data-theme='dark']) .channel-info .channel-description,
    :host-context(html[data-theme='dark']) .channel-info .desc {
      color: #adb5bd;
    }

    /* Handle pill (e.g., @jessetautulli) */
    :host-context(html[data-theme='dark']) .channel-handle,
    :host-context(html[data-theme='dark']) .handle {
      display: inline-block;
      background: #1f2326;
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 12px;
    }

    /* Unsubscribe button */
    :host-context(html[data-theme='dark']) .unsubscribe-button {
      background: #dc3545;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    :host-context(html[data-theme='dark'])
      .unsubscribe-button:hover:not(:disabled) {
      background: #bb2d3b;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:focus-visible {
      outline: 0;
      box-shadow: 0 0 0 3px rgba(159, 134, 255, 0.35);
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    /* Refresh button in header (from your screenshot) */
    :host-context(html[data-theme='dark']) .refresh-button {
      background: #2b3035;
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 8px;
      padding: 6px 10px;
    }

    :host-context(html[data-theme='dark'])
      .refresh-button:hover:not(:disabled) {
      background: #343a40;
    }

    /* Optional: layout helpers inside the card */
    :host-context(html[data-theme='dark']) .subscription-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    :host-context(html[data-theme='dark']) .channel-info {
      flex: 1;
      min-width: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadSubscriptions();
  }

  async loadSubscriptions() {
    try {
      this.isLoading = true;
      const response = await chrome.runtime.sendMessage({
        cmd: 'GET_CHANNEL_SUBSCRIPTIONS',
        forceRefresh: false,
      });

      if (response.success) {
        this.subscriptions = response.subscriptions;
      } else {
        this.errorMessage = response.error || 'Failed to load subscriptions';
      }
    } catch (error) {
      this.errorMessage = 'Failed to load subscriptions';
      console.error('Failed to load subscriptions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private onSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value.trim();

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Clear results if query is empty
    if (!this.searchQuery) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    // Debounce search (250ms as specified in M6-02)
    this.searchTimeout = window.setTimeout(() => {
      this.searchChannels();
    }, 250);
  }

  private async searchChannels() {
    if (!this.searchQuery) return;

    try {
      this.isSearching = true;
      this.errorMessage = '';

      const response = await chrome.runtime.sendMessage({
        cmd: 'GET_CHANNEL_INFO',
        channelTag: this.searchQuery,
      });

      if (response.success) {
        this.searchResults = [response.channelInfo];
      } else if (response.error === 'Channel not found') {
        this.searchResults = [];
      } else {
        this.errorMessage = response.error || 'Failed to search channels';
        this.searchResults = [];
      }
    } catch (error) {
      this.errorMessage = 'Failed to search channels';
      this.searchResults = [];
      console.error('Failed to search channels:', error);
    } finally {
      this.isSearching = false;
    }
  }

  private async subscribeToChannel(channelTag: string) {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      const response = await chrome.runtime.sendMessage({
        cmd: 'SUBSCRIBE_TO_CHANNEL',
        channelTag: channelTag,
      });

      if (response.success) {
        this.successMessage = `Successfully subscribed to ${channelTag}`;
        // Refresh subscriptions list
        await this.loadSubscriptions();
        // Clear search results
        this.searchResults = [];
        this.searchQuery = '';
      } else {
        this.errorMessage = response.error || 'Failed to subscribe to channel';
      }
    } catch (error) {
      this.errorMessage = 'Failed to subscribe to channel';
      console.error('Failed to subscribe to channel:', error);
    }
  }

  private async unsubscribeFromChannel(subscriptionIden: string) {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      const response = await chrome.runtime.sendMessage({
        cmd: 'UNSUBSCRIBE_FROM_CHANNEL',
        subscriptionIden: subscriptionIden,
      });

      if (response.success) {
        this.successMessage = 'Successfully unsubscribed from channel';
        // Refresh subscriptions list
        await this.loadSubscriptions();
      } else {
        this.errorMessage =
          response.error || 'Failed to unsubscribe from channel';
      }
    } catch (error) {
      this.errorMessage = 'Failed to unsubscribe from channel';
      console.error('Failed to unsubscribe from channel:', error);
    }
  }

  private isSubscribedToChannel(channelTag: string): boolean {
    return this.subscriptions.some(
      sub => sub.channel?.tag === channelTag && sub.active
    );
  }

  private handleSubtabChange(subtab: 'discover' | 'recent') {
    this.activeSubtab = subtab;
    if (subtab === 'recent') {
      this.loadSubscriptionPosts();
    }
  }

  private async loadSubscriptionPosts() {
    try {
      this.isLoadingPosts = true;
      this.errorMessage = '';

      const response = await chrome.runtime.sendMessage({
        cmd: 'GET_SUBSCRIPTION_POSTS',
      });

      if (response.success) {
        this.subscriptionPosts = response.posts;
      } else {
        this.errorMessage =
          response.error || 'Failed to load subscription posts';
      }
    } catch (error) {
      this.errorMessage = 'Failed to load subscription posts';
      console.error('Failed to load subscription posts:', error);
    } finally {
      this.isLoadingPosts = false;
    }
  }

  private async refreshSubscriptions() {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await chrome.runtime.sendMessage({
        cmd: 'REFRESH_CHANNEL_DATA',
      });

      if (response.success) {
        this.successMessage = 'Subscriptions refreshed successfully';
        // Reload subscriptions after refresh
        await this.loadSubscriptions();
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } else {
        this.errorMessage = response.error || 'Failed to refresh subscriptions';
      }
    } catch (error) {
      this.errorMessage = 'Failed to refresh subscriptions';
      console.error('Failed to refresh subscriptions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // private getSubscriptionIden(channelTag: string): string | undefined {
  //   const subscription = this.subscriptions.find(sub =>
  //     sub.channel.tag === channelTag && sub.active
  //   );
  //   return subscription?.iden;
  // }

  private renderChannelIcon(channel: ChannelInfo | null | undefined) {
    // Handle null/undefined channel
    if (!channel) {
      return html`<div class="channel-icon">?</div>`;
    }

    if (channel.image_url) {
      return html`<img
        src="${channel.image_url}"
        alt="${channel.name || 'Channel'}"
        class="channel-icon"
      />`;
    }
    return html`<div class="channel-icon">
      ${channel.name ? channel.name.charAt(0).toUpperCase() : '?'}
    </div>`;
  }

  private renderSearchResults() {
    if (this.isSearching) {
      return html`<div class="loading">Searching...</div>`;
    }

    if (this.searchResults.length === 0 && this.searchQuery) {
      return html`<div class="empty-state">
        No channels found for "${this.searchQuery}"
      </div>`;
    }

    return html`
      <div class="search-results">
        ${this.searchResults.map(channel => {
          const isSubscribed = this.isSubscribedToChannel(channel?.tag || '');
          // const subscriptionIden = this.getSubscriptionIden(channel.tag);

          return html`
            <div class="channel-card">
              ${this.renderChannelIcon(channel)}
              <div class="channel-info">
                <div class="channel-name">
                  ${channel?.name || 'Unknown Channel'}
                </div>
                <div class="channel-description">
                  ${channel?.description || 'No description available'}
                </div>
                <div class="channel-tag">@${channel?.tag || 'unknown'}</div>
              </div>
              ${isSubscribed
                ? html`<div class="subscribed-badge">Subscribed</div>`
                : html`<button
                    class="subscribe-button"
                    @click=${() => this.subscribeToChannel(channel?.tag || '')}
                  >
                    Subscribe
                  </button>`}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderSubscriptions() {
    if (this.isLoading) {
      return html`<div class="loading">Loading subscriptions...</div>`;
    }

    if (this.subscriptions.length === 0) {
      return html`<div class="empty-state">No channel subscriptions yet</div>`;
    }

    return html`
      <div class="subscriptions-section">
        <div class="section-header">
          <h3 class="section-title">Your Subscriptions</h3>
          <button
            class="refresh-button"
            @click=${this.refreshSubscriptions}
            ?disabled=${this.isLoading}
            title="Refresh subscriptions"
          >
            🔄 Refresh
          </button>
        </div>
        ${this.subscriptions.map(
          subscription => html`
            <div class="subscription-item">
              ${this.renderChannelIcon(subscription.channel)}
              <div class="channel-info">
                <div class="channel-name">
                  ${subscription.channel?.name || 'Unknown Channel'}
                </div>
                <div class="channel-description">
                  ${subscription.channel?.description ||
                  'No description available'}
                </div>
                <div class="channel-tag">
                  @${subscription.channel?.tag || 'unknown'}
                </div>
              </div>
              <button
                class="unsubscribe-button"
                @click=${() => this.unsubscribeFromChannel(subscription.iden)}
              >
                Unsubscribe
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderRecentChannelPushes() {
    return html`
      <div class="recent-pushes-section">
        <h3 class="section-title">Recent Subscription Posts</h3>
        ${this.isLoadingPosts
          ? html`
              <div class="loading-indicator">Loading subscription posts...</div>
            `
          : ''}
        ${this.subscriptionPosts.length === 0 && !this.isLoadingPosts
          ? html`
              <div class="recent-pushes-content">
                <p>No recent subscription posts found.</p>
                <p>
                  Posts from channels you're subscribed to will appear here.
                </p>
              </div>
            `
          : ''}
        ${this.subscriptionPosts.length > 0
          ? html`
              <div class="subscription-posts">
                ${this.subscriptionPosts.map(
                  post => html`
                    <div class="post-card">
                      <div class="post-header">
                        <span class="channel-name">${post.channel_tag}</span>
                        <span class="post-date"
                          >${new Date(
                            post.created * 1000
                          ).toLocaleDateString()}</span
                        >
                      </div>
                      <div class="post-content">
                        ${post.title
                          ? html`<h4 class="post-title">${post.title}</h4>`
                          : ''}
                        ${post.body
                          ? html`<p class="post-body">${post.body}</p>`
                          : ''}
                        ${post.url
                          ? html`<a
                              href="${post.url}"
                              target="_blank"
                              class="post-link"
                              >🔗 ${post.url}</a
                            >`
                          : ''}
                      </div>
                    </div>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    return html`
      <div class="channels-container">
        ${this.errorMessage
          ? html`<div class="error-message">${this.errorMessage}</div>`
          : ''}
        ${this.successMessage
          ? html`<div class="success-message">${this.successMessage}</div>`
          : ''}

        <div class="subtab-navigation">
          <button
            class="subtab-button ${this.activeSubtab === 'discover'
              ? 'active'
              : ''}"
            @click=${() => this.handleSubtabChange('discover')}
          >
            Discover New Subscriptions
          </button>
          <button
            class="subtab-button ${this.activeSubtab === 'recent'
              ? 'active'
              : ''}"
            @click=${() => this.handleSubtabChange('recent')}
          >
            Recent Subscription Posts
          </button>
        </div>

        ${this.activeSubtab === 'discover'
          ? html`
              <div class="search-section">
                <h3 class="section-title">Discover New Subscriptions</h3>
                <input
                  type="text"
                  class="search-input"
                  placeholder="Enter channel tag (e.g., pushbullet)"
                  .value=${this.searchQuery}
                  @input=${this.onSearchInput}
                />
                ${this.renderSearchResults()}
              </div>

              ${this.renderSubscriptions()}
            `
          : this.renderRecentChannelPushes()}
      </div>
    `;
  }
}
