/**
 * SMS Thread Component
 * Displays a conversation with messages and allows sending new messages
 * Supports group messaging and MMS attachments
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { SmsThread } from '../../types/pushbullet';

interface Recipient {
  number: string;
  name: string;
}

@customElement('pb-sms-thread')
export class PbSmsThread extends LitElement {
  @property({ type: String })
  conversationId: string = '';

  @property({ type: String })
  deviceIden: string = '';

  @property({ type: Boolean })
  isGroupConversation: boolean = false;

  @state()
  private thread: SmsThread | null = null;

  @state()
  private messageText: string = '';

  @state()
  private isLoading: boolean = false;

  @state()
  private isSending: boolean = false;

  @state()
  private selectedFile: File | null = null;

  @state()
  private recipients: Recipient[] = [];

  @state()
  private newRecipientNumber: string = '';

  @state()
  private isLoadingOlder: boolean = false;

  @state()
  private hasMoreMessages: boolean = true;

  @state()
  private messageCursor: string | null = null;

  @state()
  private conversationNotFound: boolean = false;

  @state()
  private isReloading: boolean = false;

  // Storage key for SMS cursor persistence
  private get smsCursorStorageKey(): string {
    return `pb_sms_thread_cursor_${this.conversationId}`;
  }

  static styles = css`
    /* === Light mode base === */
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
    }

    .thread-header {
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .contact-name {
      font-weight: 600;
      font-size: 16px;
      color: #333;
    }

    .unread-badge {
      background: #007bff;
      color: white;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      min-height: 0;
    }

    .message {
      display: flex;
      margin-bottom: 8px;
    }

    .message.inbound {
      justify-content: flex-start;
    }

    .message.outbound {
      justify-content: flex-end;
    }

    .message-bubble {
      max-width: 70%;
      padding: 8px 12px;
      border-radius: 18px;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.4;
    }

    .message.inbound .message-bubble {
      background: white;
      color: #333;
      border: 1px solid #e9ecef;
    }

    .message.outbound .message-bubble {
      background: #007bff;
      color: white;
    }

    .message-time {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
      text-align: center;
    }

    .message-image {
      max-width: 200px;
      max-height: 200px;
      border-radius: 8px;
      margin-top: 4px;
      cursor: pointer;
    }

    .input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #e9ecef;
    }

    .recipients-container {
      margin-bottom: 12px;
    }

    .recipients-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .recipients-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .recipient-chip {
      display: flex;
      align-items: center;
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 12px;
      gap: 4px;
    }

    .recipient-chip .remove-btn {
      background: none;
      border: none;
      color: #1976d2;
      cursor: pointer;
      padding: 0;
      font-size: 14px;
      line-height: 1;
    }

    .recipient-chip .remove-btn:hover {
      color: #d32f2f;
    }

    .add-recipient-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .recipient-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 12px;
    }

    .recipient-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .add-recipient-btn {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
    }

    .add-recipient-btn:hover:not(:disabled) {
      background: #0056b3;
    }

    .add-recipient-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .attachment-area {
      margin-bottom: 12px;
    }

    .file-input-container {
      position: relative;
    }

    .file-input {
      display: none;
    }

    .file-select-btn {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: background-color 0.2s;
    }

    .file-select-btn:hover {
      background: #e9ecef;
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 8px;
    }

    .file-icon {
      width: 16px;
      height: 16px;
      color: #666;
    }

    .file-info {
      flex: 1;
      font-size: 12px;
      color: #333;
    }

    .file-size {
      font-size: 11px;
      color: #999;
    }

    .remove-file-btn {
      background: none;
      border: none;
      color: #d32f2f;
      cursor: pointer;
      padding: 2px;
      font-size: 16px;
    }

    .remove-file-btn:hover {
      color: #b71c1c;
    }

    .input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .message-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 14px;
      resize: none;
      min-height: 40px;
      max-height: 120px;
      font-family: inherit;
    }

    .message-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .send-button {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .send-button:hover:not(:disabled) {
      background: #0056b3;
    }

    .send-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .send-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .load-older-btn {
      width: 100%;
      padding: 8px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      color: #495057;
      cursor: pointer;
      font-size: 12px;
      margin-bottom: 16px;
      transition: background-color 0.2s;
    }

    .load-older-btn:hover:not(:disabled) {
      background: #e9ecef;
    }

    .load-older-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
      padding: 32px;
    }

    .error-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
      color: #dc3545;
    }

    .error-subtitle {
      font-size: 14px;
      margin-top: 8px;
      margin-bottom: 24px;
      opacity: 0.8;
    }

    .reload-button {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .reload-button:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .reload-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
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

    /* Responsive design */
    @media (max-width: 480px) {
      .thread-header {
        padding: 8px 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .contact-name {
        font-size: 14px;
      }

      .messages-container {
        padding: 12px;
        gap: 6px;
      }

      .message-bubble {
        max-width: 85%;
        padding: 6px 10px;
        font-size: 13px;
      }

      .message-image {
        max-width: 150px;
        max-height: 150px;
      }

      .input-container {
        padding: 12px;
      }

      .recipients-list {
        gap: 4px;
      }

      .recipient-chip {
        font-size: 11px;
        padding: 3px 6px;
      }

      .add-recipient-row {
        flex-direction: column;
        gap: 6px;
      }

      .recipient-input {
        padding: 8px 10px;
        font-size: 13px;
      }

      .add-recipient-btn {
        padding: 8px 12px;
        font-size: 13px;
        align-self: flex-start;
      }

      .message-input {
        padding: 8px 12px;
        font-size: 13px;
        min-height: 36px;
        max-height: 100px;
      }

      .send-button {
        width: 36px;
        height: 36px;
      }

      .send-icon {
        width: 14px;
        height: 14px;
      }

      .file-select-btn {
        padding: 6px 10px;
        font-size: 11px;
      }
    }

    @media (max-width: 360px) {
      .messages-container {
        padding: 8px;
      }

      .message-bubble {
        max-width: 90%;
        padding: 5px 8px;
        font-size: 12px;
      }

      .input-container {
        padding: 8px;
      }

      .message-input {
        padding: 6px 10px;
        font-size: 12px;
        min-height: 32px;
      }

      .send-button {
        width: 32px;
        height: 32px;
      }

      .send-icon {
        width: 12px;
        height: 12px;
      }
    }

    @media (min-width: 500px) {
      .messages-container {
        padding: 20px;
        gap: 10px;
      }

      .message-bubble {
        max-width: 65%;
        padding: 10px 14px;
        font-size: 15px;
      }

      .input-container {
        padding: 20px;
      }

      .message-input {
        padding: 10px 18px;
        font-size: 15px;
        min-height: 44px;
      }

      .send-button {
        width: 44px;
        height: 44px;
      }

      .send-icon {
        width: 18px;
        height: 18px;
      }
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      background: #212529;
      color: #dee2e6;
    }

    /* Header */
    :host-context(html[data-theme='dark']) .thread-header {
      background: #343a40;
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .contact-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .unread-badge {
      background: #0d6efd;
      color: #fff;
    }

    /* Messages */
    :host-context(html[data-theme='dark']) .message.inbound .message-bubble {
      background: #343a40;
      color: #dee2e6;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .message.outbound .message-bubble {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .message-time {
      color: #868e96;
    }

    /* Input area */
    :host-context(html[data-theme='dark']) .input-container {
      background: #343a40;
      border-top-color: #495057;
    }

    :host-context(html[data-theme='dark']) .recipients-label,
    :host-context(html[data-theme='dark']) .device-info {
      color: #adb5bd;
    }

    /* Recipient chips */
    :host-context(html[data-theme='dark']) .recipient-chip {
      background: #031633; /* primary-bg-subtle */
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .recipient-chip .remove-btn {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .recipient-chip .remove-btn:hover {
      color: #ea868f;
    }

    /* Text inputs */
    :host-context(html[data-theme='dark']) .recipient-input,
    :host-context(html[data-theme='dark']) .message-input {
      background: #2b3035;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .recipient-input:focus,
    :host-context(html[data-theme='dark']) .message-input:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
      outline: 0;
    }

    /* Buttons */
    :host-context(html[data-theme='dark']) .add-recipient-btn,
    :host-context(html[data-theme='dark']) .send-button,
    :host-context(html[data-theme='dark']) .reload-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark'])
      .add-recipient-btn:hover:not(:disabled),
    :host-context(html[data-theme='dark']) .send-button:hover:not(:disabled),
    :host-context(html[data-theme='dark']) .reload-button:hover:not(:disabled) {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .add-recipient-btn:disabled,
    :host-context(html[data-theme='dark']) .send-button:disabled,
    :host-context(html[data-theme='dark']) .reload-button:disabled {
      background: #6c757d;
      color: #fff;
    }

    /* File select and selected file */
    :host-context(html[data-theme='dark']) .file-select-btn,
    :host-context(html[data-theme='dark']) .selected-file {
      background: #2b3035;
      border-color: #495057;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-select-btn:hover {
      background: #343a40;
    }

    :host-context(html[data-theme='dark']) .file-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-info {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-size {
      color: #868e96;
    }

    /* Load older */
    :host-context(html[data-theme='dark']) .load-older-btn {
      background: #2b3035;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark'])
      .load-older-btn:hover:not(:disabled) {
      background: #343a40;
    }

    /* States */
    :host-context(html[data-theme='dark']) .empty-state,
    :host-context(html[data-theme='dark']) .error-state,
    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-icon {
      color: #ea868f;
    }

    /* Spinners */
    :host-context(html[data-theme='dark']) .spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .spinner-small {
      color: #6ea8fe;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadThread();
    this.initializeRecipients();

    // Scroll to bottom when component is first connected
    setTimeout(() => this.scrollToBottom(), 200);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('conversationId') && this.conversationId) {
      this.loadThread();
      this.initializeRecipients();
    }

    // Scroll to bottom when thread data changes (after loading)
    if (changedProperties.has('thread') && this.thread) {
      this.scrollToBottom();
    }
  }

  initializeRecipients() {
    if (this.conversationId && this.isGroupConversation) {
      // Parse group conversation ID (comma-separated numbers)
      const numbers = this.conversationId.split(',').map(n => n.trim());
      this.recipients = numbers.map(number => ({
        number,
        name: number, // Will be resolved to contact names later
      }));
    } else if (this.conversationId && !this.isGroupConversation) {
      // Single recipient
      this.recipients = [
        {
          number: this.conversationId,
          name: this.conversationId,
        },
      ];
    } else {
      this.recipients = [];
    }
  }

  async loadThread() {
    if (!this.conversationId) {
      this.thread = null;
      return;
    }

    this.isLoading = true;
    try {
      console.log(
        '💬 [SmsThread] Loading conversation from API:',
        this.conversationId
      );

      // Get device ID - use provided deviceIden or get default SMS device
      let deviceIden = this.deviceIden;
      if (!deviceIden) {
        console.log(
          '💬 [SmsThread] No device ID provided, getting default SMS device'
        );
        try {
          const response = await chrome.runtime.sendMessage({
            cmd: 'GET_DEFAULT_SMS_DEVICE',
          });
          console.log(
            '💬 [SmsThread] GET_DEFAULT_SMS_DEVICE response:',
            response
          );

          if (response.success && response.device) {
            deviceIden = response.device.iden;
            console.log('💬 [SmsThread] Got default SMS device:', deviceIden);
          } else {
            console.error(
              '💬 [SmsThread] Failed to get default SMS device:',
              response.error
            );
            throw new Error(response.error || 'No SMS device available');
          }
        } catch (error) {
          console.error(
            '💬 [SmsThread] Error getting default SMS device:',
            error
          );
          throw new Error('No SMS device available');
        }
      } else {
        console.log('💬 [SmsThread] Using provided device ID:', deviceIden);
      }

      // Update the component property with the resolved device ID
      this.deviceIden = deviceIden;

      // Load stored cursor for this conversation
      await this.loadStoredCursor();

      // Send message to background script to load full thread
      const response = await chrome.runtime.sendMessage({
        cmd: 'LOAD_FULL_SMS_THREAD',
        conversationId: this.conversationId,
        deviceIden: deviceIden,
      });

      if (response.success) {
        this.thread = response.thread;
        this.messageCursor = response.cursor || null;
        this.hasMoreMessages = response.hasMore || false;

        // Save cursor to storage
        await this.saveStoredCursor();

        // Clear SMS notifications from badge when conversation is opened
        console.log(
          '💬 [SmsThread] Conversation opened, clearing SMS notifications from badge'
        );
        try {
          await chrome.runtime.sendMessage({ cmd: 'CLEAR_SMS_NOTIFICATIONS' });
          console.log('💬 [SmsThread] SMS notifications cleared from badge');
        } catch (error) {
          console.error(
            '💬 [SmsThread] Failed to clear SMS notifications:',
            error
          );
        }

        // Scroll to bottom with a single delay to ensure content is rendered
        this.scrollToBottom();
        setTimeout(() => this.scrollToBottom(), 300);

        console.log('💬 [SmsThread] Loaded conversation from API:', {
          conversationId: this.conversationId,
          deviceIden: this.deviceIden,
          messageCount: this.thread?.messages?.length || 0,
        });
      } else {
        console.error(
          '💬 [SmsThread] Failed to load thread from API:',
          response.error
        );
      }
    } catch (error) {
      console.error('💬 [SmsThread] Failed to load thread from API:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadOlderMessages() {
    if (!this.conversationId || this.isLoadingOlder || !this.hasMoreMessages) {
      return;
    }

    this.isLoadingOlder = true;
    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'GET_SMS_THREAD_PAGED',
        conversationId: this.conversationId,
        cursor: this.messageCursor,
      });

      if (response.success && this.thread) {
        // Prepend older messages to the thread
        const olderMessages = response.messages || [];
        this.thread = {
          ...this.thread,
          messages: [...olderMessages, ...this.thread.messages],
        };
        this.messageCursor = response.cursor || null;
        this.hasMoreMessages = response.hasMore || false;

        // Save updated cursor to storage
        await this.saveStoredCursor();
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      this.isLoadingOlder = false;
    }
  }

  public scrollToBottom() {
    console.log('🔄 [SmsThread] scrollToBottom called');

    this.updateComplete.then(() => {
      const container = this.shadowRoot?.querySelector('.messages-container');
      console.log('🔄 [SmsThread] Container found:', !!container);

      if (container) {
        const containerElement = container as HTMLElement;
        console.log('🔄 [SmsThread] Container dimensions:', {
          scrollHeight: containerElement.scrollHeight,
          clientHeight: containerElement.clientHeight,
          scrollTop: containerElement.scrollTop,
          offsetHeight: containerElement.offsetHeight,
        });

        // Wait for images to load before scrolling
        const images = container.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
          if (img.complete) {
            return Promise.resolve();
          }
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });

        Promise.all(imagePromises).then(() => {
          // Check if there's actually content to scroll
          if (containerElement.scrollHeight <= containerElement.clientHeight) {
            console.log(
              '🔄 [SmsThread] No scrollable content - scrollHeight <= clientHeight'
            );
            return;
          }

          // Use requestAnimationFrame to ensure DOM is fully rendered
          requestAnimationFrame(() => {
            console.log('🔄 [SmsThread] Scrolling to bottom...');

            // Calculate the maximum scrollable position
            const maxScrollTop =
              containerElement.scrollHeight - containerElement.clientHeight;
            containerElement.scrollTop = maxScrollTop;

            // Verify scroll position after a brief delay
            setTimeout(() => {
              const currentScrollTop = containerElement.scrollTop;
              const targetScrollTop =
                containerElement.scrollHeight - containerElement.clientHeight;

              if (Math.abs(currentScrollTop - targetScrollTop) > 5) {
                console.log(
                  `🔄 [SmsThread] Final scroll adjustment - current: ${currentScrollTop}, target: ${targetScrollTop}`
                );
                containerElement.scrollTop = targetScrollTop;
              } else {
                console.log('🔄 [SmsThread] Successfully scrolled to bottom');
              }
            }, 100);
          });
        });
      }
    });
  }

  handleScrollTop() {
    const container = this.shadowRoot?.querySelector('.messages-container');
    if (container && container.scrollTop === 0 && this.hasMoreMessages) {
      this.loadOlderMessages();
    }
  }

  /**
   * Load stored cursor for this conversation from localStorage
   */
  private async loadStoredCursor(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(this.smsCursorStorageKey);
      if (stored[this.smsCursorStorageKey]) {
        this.messageCursor = stored[this.smsCursorStorageKey];
        console.log(
          `📱 [SMS Thread] Loaded stored cursor for ${this.conversationId}:`,
          this.messageCursor
        );
      }
    } catch (error) {
      console.error('Failed to load stored SMS cursor:', error);
    }
  }

  /**
   * Save current cursor for this conversation to localStorage
   */
  private async saveStoredCursor(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.smsCursorStorageKey]: this.messageCursor,
      });
      console.log(
        `📱 [SMS Thread] Saved cursor for ${this.conversationId}:`,
        this.messageCursor
      );
    } catch (error) {
      console.error('Failed to save SMS cursor:', error);
    }
  }

  handleInputChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.messageText = target.value;

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  handleRecipientInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.newRecipientNumber = target.value;
  }

  handleRecipientInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addRecipient();
    }
  }

  addRecipient() {
    const number = this.newRecipientNumber.trim();
    if (!number) return;

    // Basic phone number validation
    if (!/^\+?[\d\s\-()]+$/.test(number)) {
      // TODO: Show error to user
      return;
    }

    // Check if already exists
    if (this.recipients.some(r => r.number === number)) {
      this.newRecipientNumber = '';
      return;
    }

    this.recipients = [...this.recipients, { number, name: number }];
    this.newRecipientNumber = '';
    this.updateGroupConversationId();
  }

  removeRecipient(number: string) {
    this.recipients = this.recipients.filter(r => r.number !== number);
    this.updateGroupConversationId();
  }

  updateGroupConversationId() {
    if (this.recipients.length > 1) {
      this.conversationId = this.recipients.map(r => r.number).join(',');
      this.isGroupConversation = true;
    } else if (this.recipients.length === 1) {
      this.conversationId = this.recipients[0].number;
      this.isGroupConversation = false;
    } else {
      this.conversationId = '';
      this.isGroupConversation = false;
    }
  }

  handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      // Check file size (max 25MB as per Pushbullet limits)
      if (file.size > 25 * 1024 * 1024) {
        // TODO: Show error to user
        console.error('File too large. Maximum size is 25MB.');
        return;
      }

      // Check file type (images for MMS)
      if (!file.type.startsWith('image/')) {
        // TODO: Show error to user
        console.error('Only image files are supported for MMS.');
        return;
      }

      this.selectedFile = file;
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
    const fileInput = this.shadowRoot?.querySelector(
      '.file-input'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async sendMessage() {
    console.log('💬 [SmsThread] sendMessage called', {
      messageText: this.messageText,
      selectedFile: !!this.selectedFile,
      conversationId: this.conversationId,
      deviceIden: this.deviceIden,
      isSending: this.isSending,
    });

    if (
      (!this.messageText.trim() && !this.selectedFile) ||
      !this.conversationId ||
      !this.deviceIden ||
      this.isSending
    ) {
      console.log(
        '💬 [SmsThread] sendMessage early return - conditions not met'
      );
      return;
    }

    this.isSending = true;
    try {
      let attachments:
        | Array<{ content_type: string; name: string; url: string }>
        | undefined;

      // Handle file attachment if present
      if (this.selectedFile) {
        // Convert File to ArrayBuffer to preserve data through message passing
        const fileBuffer = await this.selectedFile.arrayBuffer();
        const fileData = {
          name: this.selectedFile.name,
          type: this.selectedFile.type,
          size: this.selectedFile.size,
          lastModified: this.selectedFile.lastModified,
          buffer: Array.from(new Uint8Array(fileBuffer)), // Convert to regular array for serialization
        };

        // Upload file for SMS/MMS (without creating a push notification)
        const uploadResponse = await chrome.runtime.sendMessage({
          cmd: 'UPLOAD_FILE_FOR_SMS',
          payload: {
            fileData,
            targetDeviceIden: this.deviceIden,
          },
        });

        if (!uploadResponse.success) {
          console.error('Failed to upload file:', uploadResponse.error);
          // TODO: Show error to user
          return;
        }

        // Create attachment object
        attachments = [
          {
            content_type: this.selectedFile.type,
            name: this.selectedFile.name,
            url: uploadResponse.fileUrl,
          },
        ];
      }

      // Send SMS with or without attachments
      const response = await chrome.runtime.sendMessage({
        cmd: 'SEND_SMS',
        payload: {
          conversationId: this.conversationId,
          message: this.messageText,
          deviceIden: this.deviceIden,
          attachments,
        },
      });

      if (response.success) {
        // Clear the message and file
        this.messageText = '';
        this.selectedFile = null;
        this.requestUpdate();

        // Reload the thread to show the newly sent message
        console.log(
          '💬 [SmsThread] Message sent successfully, reloading thread to show new message'
        );
        await this.loadThread();

        // Trigger refresh of the conversation
        this.dispatchEvent(
          new CustomEvent('message-sent', {
            detail: { conversationId: this.conversationId },
            bubbles: true,
          })
        );
      } else {
        console.error('Failed to send SMS:', response.error);

        // Check if it's a conversation not found error
        if (
          response.error &&
          response.error.includes('CONVERSATION_NOT_FOUND:')
        ) {
          this.conversationNotFound = true;
          console.log(
            '💬 [SmsThread] Conversation not found, showing reload option'
          );
        }

        // TODO: Show other errors to user
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error to user
    } finally {
      this.isSending = false;
    }
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async reloadThread() {
    if (!this.conversationId || !this.deviceIden || this.isReloading) {
      return;
    }

    console.log('💬 [SmsThread] Reloading thread:', this.conversationId);
    this.isReloading = true;
    this.conversationNotFound = false;

    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'RELOAD_SMS_THREAD',
        deviceIden: this.deviceIden,
        threadId: this.conversationId,
      });

      if (response.success && response.thread) {
        console.log('💬 [SmsThread] Thread reloaded successfully');
        this.thread = response.thread;
        this.conversationNotFound = false;

        // Trigger a refresh of the conversations list too
        this.dispatchEvent(
          new CustomEvent('thread-reloaded', {
            detail: { conversationId: this.conversationId },
            bubbles: true,
          })
        );
      } else {
        console.error(
          '💬 [SmsThread] Failed to reload thread:',
          response.error
        );
        // Keep showing the reload button
      }
    } catch (error) {
      console.error('💬 [SmsThread] Error reloading thread:', error);
      // Keep showing the reload button
    } finally {
      this.isReloading = false;
    }
  }

  openImage(url: string) {
    chrome.tabs.create({ url });
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversation...
        </div>
      `;
    }

    if (!this.thread) {
      return html`
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
          </svg>
          <p>Select a conversation to start messaging</p>
        </div>
      `;
    }

    // Show conversation not found state
    if (this.conversationNotFound) {
      return html`
        <div class="error-state">
          <svg class="error-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          <p>This conversation could not be found.</p>
          <p class="error-subtitle">
            The conversation may have been deleted or the data needs to be
            refreshed.
          </p>
          <button
            class="reload-button"
            @click="${this.reloadThread}"
            ?disabled="${this.isReloading}"
          >
            ${this.isReloading
              ? html`<div class="spinner-small"></div>
                  Reloading...`
              : 'Reload Conversation'}
          </button>
        </div>
      `;
    }

    return html`
      <div class="thread-header">
        <div class="contact-name">${this.thread.name}</div>
        ${this.thread.unreadCount > 0
          ? html` <div class="unread-badge">${this.thread.unreadCount}</div> `
          : ''}
      </div>

      <div
        class="messages-container"
        role="log"
        aria-label="Message history"
        @scroll="${this.handleScrollTop}"
      >
        ${this.hasMoreMessages
          ? html`
              <button
                class="load-older-btn"
                @click=${this.loadOlderMessages}
                ?disabled=${this.isLoadingOlder}
              >
                ${this.isLoadingOlder
                  ? html`
                      <div
                        class="spinner"
                        style="width: 14px; height: 14px; margin-right: 6px;"
                      ></div>
                      Loading older messages...
                    `
                  : 'Load older messages'}
              </button>
            `
          : ''}
        ${this.thread.messages.map(
          msg => html`
            <div class="message ${msg.inbound ? 'inbound' : 'outbound'}">
              <div class="message-bubble">
                <div>${msg.text}</div>
                ${msg.image_url
                  ? html`
                      <img
                        class="message-image"
                        src="${msg.image_url}"
                        alt="Message attachment"
                        @click=${() => this.openImage(msg.image_url!)}
                      />
                    `
                  : ''}
                <div class="message-time">
                  ${this.formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          `
        )}
      </div>

      <div class="input-container">
        ${this.isGroupConversation || this.recipients.length === 0
          ? html`
              <div class="recipients-container">
                <div class="recipients-label">Recipients:</div>

                ${this.recipients.length > 0
                  ? html`
                      <div class="recipients-list">
                        ${this.recipients.map(
                          recipient => html`
                            <div class="recipient-chip">
                              <span>${recipient.name}</span>
                              <button
                                class="remove-btn"
                                @click=${() =>
                                  this.removeRecipient(recipient.number)}
                                title="Remove recipient"
                              >
                                ×
                              </button>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : ''}

                <div class="add-recipient-row">
                  <input
                    class="recipient-input"
                    type="text"
                    placeholder="Enter phone number..."
                    .value=${this.newRecipientNumber}
                    @input=${this.handleRecipientInputChange}
                    @keydown=${this.handleRecipientInputKeyDown}
                  />
                  <button
                    class="add-recipient-btn"
                    @click=${this.addRecipient}
                    ?disabled=${!this.newRecipientNumber.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            `
          : ''}

        <div class="attachment-area">
          <div class="file-input-container">
            <input
              class="file-input"
              type="file"
              accept="image/*"
              @change=${this.handleFileSelect}
            />
            <button
              class="file-select-btn"
              @click=${() =>
                (
                  this.shadowRoot?.querySelector(
                    '.file-input'
                  ) as HTMLInputElement
                )?.click()}
            >
              📎 Attach Image
            </button>
          </div>

          ${this.selectedFile
            ? html`
                <div class="selected-file">
                  <svg class="file-icon" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                    />
                  </svg>
                  <div class="file-info">
                    <div>${this.selectedFile.name}</div>
                    <div class="file-size">
                      ${this.formatFileSize(this.selectedFile.size)}
                    </div>
                  </div>
                  <button
                    class="remove-file-btn"
                    @click=${this.removeSelectedFile}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              `
            : ''}
        </div>

        <div class="input-row">
          <textarea
            class="message-input"
            placeholder="Type a message..."
            .value=${this.messageText}
            @input=${this.handleInputChange}
            @keydown=${this.handleKeyDown}
            ?disabled="${this.isSending}"
          ></textarea>
          <button
            class="send-button"
            @click=${this.sendMessage}
            ?disabled=${(!this.messageText.trim() && !this.selectedFile) ||
            this.isSending ||
            !this.conversationId ||
            !this.deviceIden}
            aria-label="Send message"
          >
            <svg class="send-icon" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}
