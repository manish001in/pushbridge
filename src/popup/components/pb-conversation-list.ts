/**
 * Conversation List Component
 * Displays a list of SMS conversations with search functionality
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { SmsThread } from '../../types/pushbullet';

@customElement('pb-conversation-list')
export class PbConversationList extends LitElement {
  @property({ type: String })
  selectedConversationId: string = '';

  @state()
  private conversations: SmsThread[] = [];

  @state()
  private searchQuery: string = '';

  @state()
  private isLoading: boolean = false;

  @state()
  private filteredConversations: SmsThread[] = [];

  static styles = css`
    /* === Light mode base === */
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 12px 0;
    }

    .search-container {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #666;
    }

    .conversations-container {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      min-height: 0;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f8f9fa;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .conversation-item:hover {
      background: #f8f9fa;
    }

    .conversation-item.selected {
      background: #e3f2fd;
      border-left: 3px solid #007bff;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #007bff;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .conversation-content {
      flex: 1;
      min-width: 0;
    }

    .contact-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .last-message {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .timestamp {
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
    }

    .unread-badge {
      background: #007bff;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
      padding: 32px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
    }

    .spinner {
      width: 20px;
      height: 20px;
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

    .no-results {
      padding: 32px 16px;
      text-align: center;
      color: #666;
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      background: #212529;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .header {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input {
      background: #343a40;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }

    :host-context(html[data-theme='dark']) .search-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .conversation-item {
      border-bottom-color: #2b3035;
    }

    :host-context(html[data-theme='dark']) .conversation-item:hover {
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .conversation-item.selected {
      background: #031633;
      border-left-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .avatar {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .contact-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .last-message {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .timestamp {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .unread-badge {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .no-results {
      color: #adb5bd;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadConversations();
  }

  async loadConversations() {
    this.isLoading = true;
    try {
      console.log('[ConversationList] Starting to load conversations from API');

      // Send message to background script to get conversations from API
      const response = await chrome.runtime.sendMessage({
        cmd: 'GET_SMS_CONVERSATIONS_FROM_API',
      });

      console.log('[ConversationList] Received response:', response);
      console.log('[ConversationList] Response type:', typeof response);
      console.log('[ConversationList] Response success:', response?.success);

      // Handle case where response is undefined (communication failure)
      if (!response) {
        console.error('[ConversationList] No response from background script');
        this.conversations = [];
        this.filterConversations();
        return;
      }

      if (response.success) {
        console.log(
          `[ConversationList] Successfully loaded ${response.conversations?.length || 0} conversations from API`
        );
        this.conversations = response.conversations || [];
        this.filterConversations();
      } else {
        const errorMsg = response.error || 'Unknown error occurred';
        console.error(
          '[ConversationList] Failed to load conversations from API:',
          errorMsg
        );
        console.error('[ConversationList] Full error response:', response);
        this.conversations = [];
        this.filterConversations();
      }
    } catch (error) {
      console.error(
        '[ConversationList] Exception while loading conversations from API:',
        error
      );
      this.conversations = [];
      this.filterConversations();
    } finally {
      console.log(
        '[ConversationList] Loading complete, setting isLoading=false'
      );
      this.isLoading = false;
    }
  }

  filterConversations() {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = this.conversations;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredConversations = this.conversations.filter(
        conversation =>
          conversation.name.toLowerCase().includes(query) ||
          conversation.id.toLowerCase().includes(query)
      );
    }
  }

  handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.filterConversations();
  }

  selectConversation(conversationId: string) {
    this.selectedConversationId = conversationId;

    // Find the conversation to get its name
    const conversation = this.conversations.find(c => c.id === conversationId);
    const conversationName =
      conversation?.name ||
      conversation?.recipients?.map(r => r.name).join(', ') ||
      'Unknown';

    // Dispatch custom event to parent
    this.dispatchEvent(
      new CustomEvent('conversation-selected', {
        detail: { conversationId, conversationName },
        bubbles: true,
        composed: true,
      })
    );

    // Mark conversation as read
    chrome.runtime.sendMessage({
      cmd: 'MARK_CONVERSATION_READ',
      conversationId,
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  getLastMessage(conversation: SmsThread): string {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) {
      return 'No messages';
    }

    if (lastMessage.image_url) {
      return lastMessage.inbound ? '📷 Image' : '📷 You sent an image';
    }

    return lastMessage.text || 'No text';
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversations...
        </div>
      `;
    }

    if (this.conversations.length === 0) {
      return html`
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
          </svg>
          <p>No conversations yet</p>
          <p style="font-size: 12px; margin-top: 8px;">
            SMS conversations will appear here
          </p>
        </div>
      `;
    }

    return html`
      <div class="header">
        <h2 class="title">Messages</h2>
        <div class="search-container">
          <svg class="search-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="Search conversations..."
            .value="${this.searchQuery}"
            @input="${this.handleSearchInput}"
          />
        </div>
      </div>

      <div class="conversations-container">
        ${this.filteredConversations.length === 0 && this.searchQuery
          ? html`
              <div class="no-results">
                <p>No conversations found for "${this.searchQuery}"</p>
              </div>
            `
          : ''}
        ${this.filteredConversations.map(
          conversation => html`
            <div
              class="conversation-item ${conversation.id ===
              this.selectedConversationId
                ? 'selected'
                : ''}"
              @click="${() => this.selectConversation(conversation.id)}"
            >
              <div class="avatar">${this.getInitials(conversation.name)}</div>

              <div class="conversation-content">
                <div class="contact-name">${conversation.name}</div>
                <div class="last-message">
                  ${this.getLastMessage(conversation)}
                </div>
              </div>

              <div class="conversation-meta">
                <div class="timestamp">
                  ${this.formatTime(conversation.lastMessageTime)}
                </div>
                ${conversation.unreadCount > 0
                  ? html`
                      <div class="unread-badge">
                        ${conversation.unreadCount}
                      </div>
                    `
                  : ''}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}
