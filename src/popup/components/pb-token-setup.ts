import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('pb-token-setup')
export class PbTokenSetup extends LitElement {
  @property({ type: String })
  token = '';

  @state()
  private isVerifying = false;

  @state()
  private errorMessage = '';

  @state()
  private isSuccess = false;

  static styles = css`
    /* === Light mode base === */
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .container {
      padding: 20px;
      max-width: 400px;
    }

    .header {
      margin-bottom: 20px;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .input {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .input:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .input.error {
      border-color: #ef4444;
    }

    .button {
      padding: 12px 16px;
      background-color: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .button:hover:not(:disabled) {
      background-color: #4338ca;
    }

    .button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .error-message {
      color: #ef4444;
      font-size: 14px;
      margin-top: 8px;
    }

    .success-message {
      color: #10b981;
      font-size: 14px;
      margin-top: 8px;
      text-align: center;
      padding: 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-weight: 500;
    }

    .help-text {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }

    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .container {
        padding: 16px;
        max-width: 100%;
      }

      .title {
        font-size: 16px;
      }

      .subtitle {
        font-size: 13px;
      }

      .form {
        gap: 14px;
      }

      .input-group {
        gap: 6px;
      }

      .label {
        font-size: 13px;
      }

      .input {
        padding: 10px;
        font-size: 13px;
      }

      .help-text {
        font-size: 11px;
      }

      .button {
        padding: 10px 14px;
        font-size: 14px;
      }

      .error-message,
      .success-message {
        font-size: 13px;
      }
    }

    @media (max-width: 360px) {
      .container {
        padding: 12px;
      }

      .title {
        font-size: 15px;
      }

      .subtitle {
        font-size: 12px;
      }

      .input {
        padding: 8px;
        font-size: 12px;
      }

      .button {
        padding: 8px 12px;
        font-size: 13px;
      }
    }

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      background: #121212;
      color: #e6e1e3;
    }

    :host-context(html[data-theme='dark']) .title {
      color: #e6e1e3;
    }

    :host-context(html[data-theme='dark']) .subtitle {
      color: #a1a1aa;
    }

    :host-context(html[data-theme='dark']) .label {
      color: #d4d4d8;
    }

    :host-context(html[data-theme='dark']) .input {
      background: #1e1e1e;
      border-color: #3f3f46;
      color: #e6e1e3;
    }

    :host-context(html[data-theme='dark']) .input:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3);
    }

    :host-context(html[data-theme='dark']) .input.error {
      border-color: #f87171;
    }

    :host-context(html[data-theme='dark']) .button {
      background-color: #8b5cf6;
      color: white;
    }

    :host-context(html[data-theme='dark']) .button:hover:not(:disabled) {
      background-color: #7c3aed;
    }

    :host-context(html[data-theme='dark']) .button:disabled {
      background-color: #52525b;
    }

    :host-context(html[data-theme='dark']) .error-message {
      color: #f87171;
    }

    :host-context(html[data-theme='dark']) .success-message {
      color: #4ade80;
      background: #052e16;
      border-color: #14532d;
    }

    :host-context(html[data-theme='dark']) .help-text {
      color: #a1a1aa;
    }

    :host-context(html[data-theme='dark']) .loading {
      border-color: #e6e1e3;
      border-top-color: transparent;
    }
  `;

  render() {
    if (this.isSuccess) {
      return html`
        <div class="container">
          <div class="success-message">
            ✅ Token verified successfully! Loading your data...
            <div class="loading" style="margin-top: 12px;"></div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="container">
        <div class="header">
          <h1 class="title">Welcome to Pushbridge</h1>
          <p class="subtitle">
            Enter your Pushbullet Access Token to get started. You can find this
            in your
            <a
              href="https://www.pushbullet.com/#settings/account"
              target="_blank"
              >Pushbullet settings</a
            >.
          </p>
        </div>

        <form class="form" @submit=${this.handleSubmit}>
          <div class="input-group">
            <label class="label" for="token-input">Access Token</label>
            <input
              id="token-input"
              class="input ${this.errorMessage ? 'error' : ''}"
              type="password"
              placeholder="Enter your Pushbullet access token"
              .value=${this.token}
              @input=${this.handleTokenInput}
              ?disabled=${this.isVerifying}
            />
            <div class="help-text">
              Your token is stored locally and never sent to our servers.
            </div>
          </div>

          ${this.errorMessage
            ? html` <div class="error-message">${this.errorMessage}</div> `
            : ''}

          <button
            type="submit"
            class="button"
            ?disabled=${!this.token.trim() || this.isVerifying}
          >
            ${this.isVerifying
              ? html`
                  <span class="loading"></span>
                  Verifying...
                `
              : 'Save & Verify'}
          </button>
        </form>
      </div>
    `;
  }

  private handleTokenInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.token = input.value;
    this.errorMessage = '';
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    if (!this.token.trim()) {
      return;
    }

    this.isVerifying = true;
    this.errorMessage = '';

    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'verifyToken',
        token: this.token.trim(),
      });

      if (response.ok) {
        this.isSuccess = true;

        // Show success message briefly before refreshing popup
        setTimeout(() => {
          // Dispatch custom event for parent components
          this.dispatchEvent(
            new CustomEvent('token-verified', {
              detail: { token: this.token.trim() },
            })
          );
        }, 1500); // 1.5 second delay to show success message
      } else {
        this.errorMessage =
          response.error ||
          'Token verification failed. Please check your token and try again.';
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.errorMessage =
        'Failed to verify token. Please check your internet connection and try again.';
    } finally {
      this.isVerifying = false;
    }
  }
}