import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('pb-composer')
export class PushComposer extends LitElement {
  @property({ type: String })
  defaultUrl = '';

  @state()
  private pushTitle = '';

  @state()
  private body = '';

  @state()
  private sendTo = 'all';

  @state()
  private sendTargets: Array<{
    id: string;
    name: string;
    type: 'device' | 'channel' | 'contact';
    icon?: string;
  }> = [];

  @state()
  private selectedFile: File | null = null;

  @state()
  private isLoading = false;

  @state()
  private isSending = false;

  @state()
  private errorMessage = '';

  @state()
  private successMessage = '';

  @state()
  private messageTimeout: number | null = null;

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
      height: 100%;
      overflow: hidden;
    }

    .composer-container {
      padding: 16px 16px 32px 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      box-sizing: border-box;
    }

    .device-selector,
    .channel-input {
      margin-bottom: 16px;
    }

    .device-selector label,
    .channel-input label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #374151;
      font-size: 14px;
    }

    .device-selector select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      color: #374151;
      transition:
        border-color 0.2s,
        box-shadow 0.2s;
    }

    .device-selector select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #374151;
      font-size: 14px;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      transition:
        border-color 0.2s,
        box-shadow 0.2s;
      background: white;
      color: #374151;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 100px;
      max-height: 200px;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-group input::placeholder,
    .form-group textarea::placeholder {
      color: #9ca3af;
    }

    .form-text {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #666;
    }

    .send-button {
      width: 100%;
      padding: 6px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 4px;
    }

    .send-button:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .send-button:active:not(:disabled) {
      transform: translateY(0);
    }

    .send-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .message {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 500;
      position: relative;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .message.error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
    }

    .message.success {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
    }

    .message::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: currentColor;
      animation: countdown 10s linear;
      border-radius: 0 0 8px 8px;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes countdown {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .shortcut-hint {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      font-style: italic;
      margin-top: 16px;
      margin-bottom: 20px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
      .composer-container {
        padding: 12px;
      }

      .device-selector {
        margin-bottom: 4px;
      }

      .form-group {
        margin-bottom: 4px;
      }

      .form-group input,
      .form-group textarea {
        padding: 10px 12px;
        font-size: 13px;
      }

      .form-group textarea {
        min-height: 80px;
        max-height: 150px;
      }

      .send-button {
        padding: 6px 16px;
        font-size: 14px;
        font-weight: 600;
      }

      .shortcut-hint {
        font-size: 11px;
      }
    }

    @media (max-width: 360px) {
      .composer-container {
        padding: 8px;
      }

      .form-group input,
      .form-group textarea {
        padding: 8px 10px;
        font-size: 12px;
      }

      .send-button {
        padding: 6px 14px;
        font-size: 13px;
      }
    }

    @media (min-width: 500px) {
      .composer-container {
        padding: 20px;
      }

      .send-button {
        padding: 6px 24px;
        font-size: 16px;
      }
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
      background: #212529;
    }

    :host-context(html[data-theme='dark']) .device-selector label,
    :host-context(html[data-theme='dark']) .channel-input label,
    :host-context(html[data-theme='dark']) .form-group label {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .device-selector select,
    :host-context(html[data-theme='dark']) .form-group input,
    :host-context(html[data-theme='dark']) .form-group textarea {
      background: #343a40;
      color: #dee2e6;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .form-group input::placeholder,
    :host-context(html[data-theme='dark']) .form-group textarea::placeholder {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .form-group input:focus,
    :host-context(html[data-theme='dark']) .form-group textarea:focus,
    :host-context(html[data-theme='dark']) .device-selector select:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }

    :host-context(html[data-theme='dark']) .form-text {
      color: rgba(222, 226, 230, 0.75);
    }

    :host-context(html[data-theme='dark']) .send-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .send-button:hover:not(:disabled) {
      background: #0b5ed7;
      box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
    }

    :host-context(html[data-theme='dark']) .send-button:disabled {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark']) .message.error {
      background: #2c0b0e;
      color: #ea868f;
      border-color: #842029;
      border-left-color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .message.success {
      background: #051b11;
      color: #75b798;
      border-color: #0f5132;
      border-left-color: #75b798;
    }

    :host-context(html[data-theme='dark']) .shortcut-hint {
      color: rgba(222, 226, 230, 0.75);
      background: #2b3035;
      border-color: #495057;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadSendTargets();

    // Pre-fill URL if provided
    if (this.defaultUrl) {
      this.body = this.defaultUrl;
    }
  }

  // Smart push type detection
  private determinePushType(
    message: string,
    file?: File
  ): 'note' | 'link' | 'file' {
    if (file) return 'file';

    // Strip whitespace from message
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return 'note';

    // Extract URLs from message using improved regex
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = trimmedMessage.match(urlRegex);

    // If exactly one URL and message is just that URL (after trimming), it's a link
    if (urls?.length === 1 && trimmedMessage === urls[0]) {
      return 'link';
    }

    // Otherwise it's a note (including multiple URLs or text with URLs)
    return 'note';
  }

  // Load combined send targets (devices + owned channels + contacts)
  private async loadSendTargets() {
    try {
      // Get devices, owned channels, and contacts in parallel
      const [devicesResponse, channelsResponse, contactsResponse] =
        await Promise.all([
          chrome.runtime.sendMessage({ cmd: 'getDevices' }),
          chrome.runtime.sendMessage({ cmd: 'GET_OWNED_CHANNELS' }),
          chrome.runtime.sendMessage({ cmd: 'getContacts' }),
        ]);

      const devices = devicesResponse.ok ? devicesResponse.devices : [];
      const channels = channelsResponse.success
        ? channelsResponse.ownedChannels
        : [];
      const contacts = contactsResponse.ok ? contactsResponse.contacts : [];

      console.log(
        'Loaded devices:',
        devices.length,
        'channels:',
        channels.length,
        'contacts:',
        contacts.length
      );

      // Combine into send targets array
      this.sendTargets = [
        ...devices.map((dev: any) => ({
          id: dev.iden,
          name: dev.nickname || 'Unknown Device',
          type: 'device' as const,
          icon: this.getDeviceIcon(dev.type),
        })),
        ...contacts.map((contact: any) => ({
          id: contact.email,
          name: contact.name,
          type: 'contact' as const,
          icon: '👤',
        })),
        ...channels.map((ch: any) => ({
          id: ch.tag,
          name: ch.name,
          type: 'channel' as const,
          icon: '📢',
        })),
      ];

      console.log('Total send targets:', this.sendTargets.length);
    } catch (error) {
      console.error('Failed to load send targets:', error);
    }
  }

  private getDeviceIcon(deviceType: string): string {
    switch (deviceType) {
      case 'android':
        return '📱';
      case 'ios':
        return '📱';
      case 'chrome':
        return '💻';
      case 'firefox':
        return '🦊';
      case 'windows':
        return '🖥️';
      case 'mac':
        return '🖥️';
      default:
        return '📱';
    }
  }

  private handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const field = input.name;

    if (field === 'title') {
      this.pushTitle = input.value;
    } else if (field === 'body') {
      this.body = input.value;
    }

    // Don't clear messages when user types - let them auto-dismiss
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';

    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
  }

  private setMessageWithTimeout(message: string, isError: boolean = false) {
    console.log('Setting message:', message, 'isError:', isError);

    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    // Set the message
    if (isError) {
      this.errorMessage = message;
      this.successMessage = '';
    } else {
      this.successMessage = message;
      this.errorMessage = '';
    }

    console.log(
      'Message set - errorMessage:',
      this.errorMessage,
      'successMessage:',
      this.successMessage
    );

    // Set timeout to clear message after 10 seconds
    this.messageTimeout = window.setTimeout(() => {
      console.log('Clearing message after timeout');
      this.clearMessages();
    }, 10000);
  }

  private validateForm(): boolean {
    // Ensure there's some content (title, message, or file)
    if (!this.pushTitle.trim() && !this.body.trim() && !this.selectedFile) {
      this.setMessageWithTimeout(
        'Please provide a title, message, or file',
        true
      );
      return false;
    }

    return true;
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
    // Don't clear messages when file is selected - let them auto-dismiss
  }

  private handleSendToChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.sendTo = select.value;
  }

  private async handleSend() {
    if (!this.validateForm()) {
      return;
    }

    this.isSending = true;
    this.clearMessages();

    try {
      // Determine the actual push type using smart detection
      const actualPushType = this.determinePushType(
        this.body,
        this.selectedFile || undefined
      );

      // Find the selected target
      const selectedTarget = this.sendTargets.find(
        target => target.id === this.sendTo
      );
      if (!selectedTarget && this.sendTo !== 'all') {
        this.setMessageWithTimeout('Please select a valid send target', true);
        this.isSending = false;
        return;
      }

      let payload: any = {
        type: actualPushType,
        title: this.pushTitle.trim() || undefined,
        body: this.body.trim() || undefined,
      };

      // Add URL for link type
      if (actualPushType === 'link') {
        payload.url = this.body.trim(); // For single URLs, body contains the URL
      }

      // Handle targeting
      if (selectedTarget?.type === 'channel') {
        payload.channel_tag = selectedTarget.id;
      } else if (selectedTarget?.type === 'contact') {
        payload.email = selectedTarget.id; // For contacts, id is the email
      } else if (this.sendTo !== 'all') {
        payload.targetDeviceIden = selectedTarget?.id;
      }

      // Handle file upload if present
      if (this.selectedFile && actualPushType === 'file') {
        // Convert File to ArrayBuffer to preserve data through message passing
        const fileBuffer = await this.selectedFile.arrayBuffer();
        const fileData = {
          name: this.selectedFile.name,
          type: this.selectedFile.type,
          size: this.selectedFile.size,
          lastModified: this.selectedFile.lastModified,
          buffer: Array.from(new Uint8Array(fileBuffer)), // Convert to regular array for serialization
        };

        const uploadResponse = await chrome.runtime.sendMessage({
          cmd: 'UPLOAD_FILE',
          payload: {
            fileData,
            targetDeviceIden:
              selectedTarget?.type === 'device' ? selectedTarget.id : undefined,
            email:
              selectedTarget?.type === 'contact'
                ? selectedTarget.id
                : undefined,
            // Include push metadata for file pushes
            title: this.pushTitle.trim() || undefined,
            body: this.body.trim() || undefined,
            channel_tag:
              selectedTarget?.type === 'channel'
                ? selectedTarget.id
                : undefined,
          },
        });

        if (uploadResponse.success) {
          this.setMessageWithTimeout('File sent successfully!');
          this.resetForm();
        } else {
          this.setMessageWithTimeout(
            uploadResponse.error || 'Failed to send file',
            true
          );
        }
        this.isSending = false;
        return;
      }

      // Send regular push
      const response = await chrome.runtime.sendMessage({
        cmd: 'createPush',
        payload,
      });

      if (response.ok) {
        this.setMessageWithTimeout('Push sent successfully!');
        this.resetForm();
      } else {
        this.setMessageWithTimeout(
          response.error || 'Failed to send push',
          true
        );
      }
    } catch (error) {
      console.error('Failed to send push:', error);
      this.setMessageWithTimeout(
        'Failed to send push. Please try again.',
        true
      );
    } finally {
      this.isSending = false;
    }
  }

  private resetForm() {
    this.pushTitle = '';
    this.body = '';
    this.selectedFile = null;
    // Don't clear messages here - let them auto-dismiss after 10 seconds

    // Clear the file input element
    const fileInput = this.shadowRoot?.querySelector(
      '#file-input'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.handleSend();
    }
  }

  render() {
    console.log(
      'Rendering - errorMessage:',
      this.errorMessage,
      'successMessage:',
      this.successMessage
    );

    return html`
      <div class="composer-container" @keydown=${this.handleKeyDown}>
        ${this.errorMessage
          ? html` <div class="message error">${this.errorMessage}</div> `
          : ''}
        ${this.successMessage
          ? html` <div class="message success">${this.successMessage}</div> `
          : ''}

        <!-- Unified Send Target Selector -->
        <div class="device-selector">
          <label for="send-to-select">Send to:</label>
          <select
            id="send-to-select"
            .value=${this.sendTo}
            @change=${this.handleSendToChange}
            ?disabled=${this.isLoading}
          >
            <option value="all">All Devices</option>
            ${this.sendTargets.map(
              target => html`
                <option value=${target.id}>
                  ${target.icon} ${target.name}
                  ${target.type === 'channel' ? '(Channel)' : ''}
                </option>
              `
            )}
          </select>
        </div>

        <!-- File Input (always visible) -->
        <div class="form-group">
          <label for="file-input">File (optional):</label>
          <input id="file-input" type="file" @change=${this.handleFileSelect} />
          ${this.selectedFile
            ? html`
                <small class="form-text">
                  Selected: ${this.selectedFile.name}
                  (${(this.selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </small>
              `
            : ''}
        </div>

        <div class="form-group">
          <label for="title">Title (optional):</label>
          <input
            id="title"
            name="title"
            type="text"
            .value=${this.pushTitle}
            @input=${this.handleInputChange}
            placeholder="Enter title..."
          />
        </div>

        <div class="form-group">
          <label for="body">Message:</label>
          <textarea
            id="body"
            name="body"
            .value=${this.body}
            @input=${this.handleInputChange}
            placeholder="Enter your message or URL..."
          ></textarea>
        </div>

        <button
          class="send-button"
          @click=${this.handleSend}
          ?disabled=${this.isSending || this.isLoading}
        >
          ${this.isSending ? html` <span class="loading"></span> ` : ''}
          ${this.isSending ? 'Sending...' : 'Send Push'}
        </button>

        <div class="shortcut-hint">Press Ctrl+Enter to send quickly</div>
      </div>
    `;
  }
}
