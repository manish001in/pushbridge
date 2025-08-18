// Popup entry point
console.log('Pushbridge popup loaded');

// Import theme component
import { bootTheme } from './components/pb-theme';
bootTheme();

// Import components
import './components/pb-token-setup';
import './components/pb-composer';
import './components/pb-recent-pushes';
import './components/pb-mirror-list';
import './components/pb-file-drop';
import './components/pb-sms-thread';
import './components/pb-conversation-list';
import './components/pb-channels';
import {
  hasSmsCapableDevices,
  getDefaultSmsDevice,
} from '../background/deviceManager';

import { getLocal } from '../background/storage';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🪟 [Popup] Popup opened, sending POPUP_OPEN message');

  // Send POPUP_OPEN message to clear push notifications from badge
  try {
    await chrome.runtime.sendMessage({ cmd: 'POPUP_OPEN' });
    console.log('🪟 [Popup] POPUP_OPEN message sent successfully');
  } catch (error) {
    console.error('🪟 [Popup] Failed to send POPUP_OPEN message:', error);
  }

  await initializePopup();
});

/**
 * Initialize the popup UI based on token status
 */
async function initializePopup() {
  const container = document.querySelector('.container');
  if (!container) {
    console.error('Container element not found');
    return;
  }

  try {
    const token = await getLocal<string>('pb_token');

    if (!token) {
      // Show token setup UI
      container.innerHTML = '<pb-token-setup></pb-token-setup>';

      // Add event listener for token verification
      const tokenSetup = document.querySelector('pb-token-setup');
      if (tokenSetup) {
        tokenSetup.addEventListener('token-verified', async () => {
          console.log('🪟 [Popup] Token verified, refreshing popup...');
          // Re-initialize popup to show main UI
          await initializePopup();
        });
      }
    } else {
      // Check if user has SMS-capable devices
      const hasSms = await hasSmsCapableDevices();
      const defaultSmsDevice = hasSms ? await getDefaultSmsDevice() : null;
      // Show main UI with tabs
      container.innerHTML = `
        <div class="popup-container">
          <div class="popup-header">
            <h2 class="popup-title">Pushbridge</h2>
            <div class="tab-navigation">
              <button class="tab-button active" data-tab="composer">Send</button>
              <button class="tab-button" data-tab="pushes">Messages</button>
              <button class="tab-button" data-tab="notifications">Notifications Mirroring</button>
              <button class="tab-button" data-tab="channels">Subscriptions</button>
              ${hasSms ? '<button class="tab-button" data-tab="messages">SMS/MMS</button>' : ''}
            </div>
          </div>
          <div class="tab-content">
              <div class="tab-pane active" data-tab="composer">
                <pb-composer></pb-composer>
              </div>
              <div class="tab-pane" data-tab="pushes">
                <pb-recent-pushes></pb-recent-pushes>
              </div>
              <div class="tab-pane" data-tab="notifications">
                <pb-mirror-list></pb-mirror-list>
              </div>

              <div class="tab-pane" data-tab="channels">
                <pb-channels></pb-channels>
              </div>
              ${
                hasSms
                  ? `<div class="tab-pane" data-tab="messages">
                <div class="sms-interface">
                  <div class="sms-view conversation-list-view active">
                    <pb-conversation-list id="conversation-list"></pb-conversation-list>
                  </div>
                  <div class="sms-view sms-thread-view">
                    <div class="sms-thread-header">
                      <button class="back-button" id="sms-back-button">← Back</button>
                      <span class="conversation-title" id="conversation-title">Conversation</span>
                    </div>
                    <pb-sms-thread id="sms-thread" device-iden="${defaultSmsDevice?.iden || ''}"></pb-sms-thread>
                  </div>
                </div>
              </div>`
                  : ''
              }
            </div>
            <div class="popup-footer">
              <div class="footer-content">
                <span class="copyright">© 2025 Pushbridge</span>
                <span class="disclaimer">· Unofficial</span>
                <button class="about-button" id="about-button">About</button>
                <button id="open-window-btn" class="about-button">
                  Open in Window
                </button>
              </div>
            </div>
        </div>
      `;

      // Initialize tab switching
      setupTabNavigation();

      // Setup SMS interface if available
      if (hasSms) {
        setupSmsInterface();
      }

      // Setup About dialog
      setupAboutDialog();

      setupOpenInWindowButton();
    }
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        <div>Failed to load popup</div>
        <div style="font-size: 12px; margin-top: 8px;">${error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    `;
  }
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active tab pane
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.getAttribute('data-tab') === targetTab) {
          pane.classList.add('active');
        }
      });
    });
  });
}

/**
 * Setup SMS interface with device information
 */
async function setupSmsInterface(): Promise<void> {
  try {
    const defaultDevice = await getDefaultSmsDevice();
    if (defaultDevice) {
      const deviceName =
        defaultDevice.nickname ||
        defaultDevice.model ||
        `Device ${defaultDevice.iden.slice(0, 8)}`;

      // Update SMS tab header
      const smsTab = document.querySelector('[data-tab="messages"]');
      if (smsTab) {
        smsTab.innerHTML = `
          <div class="sms-header">
            <span class="sms-title">SMS/MMS</span>
            <span class="device-info">from ${deviceName}</span>
          </div>
        `;
      }
    }

    // Setup conversation list and thread components
    const conversationList = document.getElementById(
      'conversation-list'
    ) as any;
    const smsThread = document.getElementById('sms-thread') as any;
    const backButton = document.getElementById(
      'sms-back-button'
    ) as HTMLButtonElement;
    const conversationTitle = document.getElementById(
      'conversation-title'
    ) as HTMLSpanElement;
    const conversationListView = document.querySelector(
      '.conversation-list-view'
    ) as HTMLElement;
    const smsThreadView = document.querySelector(
      '.sms-thread-view'
    ) as HTMLElement;

    if (
      conversationList &&
      smsThread &&
      backButton &&
      conversationTitle &&
      conversationListView &&
      smsThreadView
    ) {
      // Listen for conversation selection
      conversationList.addEventListener(
        'conversation-selected',
        (e: CustomEvent) => {
          const { conversationId, conversationName } = e.detail;
          smsThread.conversationId = conversationId;
          conversationTitle.textContent = conversationName || 'Conversation';

          // Switch to SMS thread view
          conversationListView.classList.remove('active');
          smsThreadView.classList.add('active');

          // Scroll to bottom after view switch
          setTimeout(() => {
            if (smsThread.scrollToBottom) {
              smsThread.scrollToBottom();
            }
          }, 300);
        }
      );

      // Listen for back button click
      backButton.addEventListener('click', () => {
        // Switch back to conversation list view
        smsThreadView.classList.remove('active');
        conversationListView.classList.add('active');

        // Clear the conversation selection
        conversationList.selectedConversationId = '';
      });
    }
  } catch (error) {
    console.error('Failed to setup SMS interface:', error);
  }
}

function setupAboutDialog() {
  const aboutButton = document.getElementById('about-button');
  if (aboutButton) {
    aboutButton.addEventListener('click', () => {
      showAboutDialog();
    });
  }
}

function showAboutDialog() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'about-overlay';
  overlay.innerHTML = `
    <div class="about-dialog">
      <div class="about-header">
        <h3>About Pushbridge</h3>
        <button class="close-button" id="close-about">&times;</button>
      </div>
      <div class="about-content">
        <p><strong>Pushbridge</strong> is an unofficial Chrome extension that replicates core Pushbullet functionality via the official Pushbullet REST & WebSocket APIs.</p>
        <p>This extension is not affiliated with or endorsed by Pushbullet.</p>
        <div class="about-links">
          <a href="https://github.com/manish001in/pushbridge" target="_blank" rel="noopener">GitHub Repository</a>
          <a href="https://docs.pushbullet.com/" target="_blank" rel="noopener">Pushbullet API Docs</a>
        </div>
        <div class="license-info">
          <p><strong>License:</strong> MIT License</p>
          <p>Copyright (c) 2024 Pushbridge Contributors</p>
          <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">View MIT License</a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Handle close button
  const closeButton = overlay.querySelector('#close-about');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }

  // Handle overlay click to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

async function setupOpenInWindowButton() {
  const windowButton = document.getElementById('open-window-btn');
  if (!windowButton) return;

  // hide if running in a tab instead of the extension popup panel
  const tab = await chrome.tabs.getCurrent();
  if (tab) {
    windowButton.style.display = 'none';
    return;
  }

  windowButton.addEventListener('click', launchOpenInWindowButton);
}

async function launchOpenInWindowButton() {
  const url = chrome.runtime.getURL('popup.html?windowMode=1');

  try {
    const wins = await chrome.windows.getAll({ populate: true });
    const existing = wins.find(w => w.tabs?.some(t => t.url?.startsWith(url)));

    if (existing) {
      await chrome.windows.update(existing.id!, {
        focused: true,
        drawAttention: true,
      });
    } else {
      await chrome.windows.create({
        url,
        type: 'popup',
        width: 500,
        height: 700,
      });
    }
  } finally {
    // Always close current popup
    window.close();
  }
}

// Add styles for the popup
const style = document.createElement('style');
style.textContent = `
  /* === Light mode base === */

  /* Scrollbar styling for consistent appearance */
  * {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }

  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  *::-webkit-scrollbar-track {
    background: #f7fafc;
    border-radius: 3px;
  }

  *::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
    transition: background 0.2s;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }

  /* Smooth scrolling for all scrollable elements */
  * {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .popup-container {
    width: 100%;
    min-width: 450px;
    max-width: 650px;
    min-height: 500px;
    max-height: 750px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
  }

  .popup-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    flex-shrink: 0;
  }

  .popup-title {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .tab-navigation {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 2px;
    background: white;
    border-radius: 8px;
    border: 1px solid #ddd;
    width: 100%;
  }

  .tab-navigation .tab-button:nth-child(4),
  .tab-navigation .tab-button:nth-child(5) {
    grid-column: span 1.5;
  }

  .tab-button {
    padding: 6px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    border-radius: 6px;
    transition: all 0.2s;
    white-space: nowrap;
    text-align: center;
  }

  .sms-header {
    white-space: normal;
    word-break: break-word;
  }

  .tab-button.active {
    background: #007bff;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
  }

  .tab-button:hover:not(.active) {
    background: #f8f9fa;
    color: #333;
  }

  .tab-content {
    position: relative;
    flex: 1;
    overflow: visible;
    min-height: 0;
  }

  .tab-pane {
    display: none;
    height: 100%;
    overflow: hidden;
  }

  .tab-pane.active {
    display: flex;
    flex-direction: column;
  }

  .sms-interface {
    display: flex;
    height: 100%;
    min-height: 400px;
    overflow: hidden;
  }

  .sms-view {
    display: none;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .sms-view.active {
    display: flex;
  }

  .conversation-list-view.active {
    display: flex;
    min-height: 0;
  }

  .sms-thread-view {
    display: none;
  }

  .sms-thread-view.active {
    display: flex;
    min-height: 0;
  }

  .sms-thread-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e9ecef;
    flex-shrink: 0;
  }

  .back-button {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 6px;
    margin-right: 12px;
    transition: background-color 0.2s;
  }

  .back-button:hover {
    background: #f8f9fa;
  }

  .conversation-title {
    font-weight: 600;
    font-size: 16px;
    color: #333;
    flex: 1;
  }

  .sms-interface pb-conversation-list {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .sms-interface pb-sms-thread {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .popup-footer {
    padding: 12px 20px;
    border-top: 1px solid #eee;
    background: #f8f9fa;
    font-size: 12px;
    color: #666;
    flex-shrink: 0;
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .copyright {
    font-weight: 500;
  }

  .disclaimer {
    color: #999;
  }

  .about-button {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 11px;
    text-decoration: underline;
    padding: 0;
  }

  .about-button:hover {
    color: #0056b3;
  }

  .about-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .about-dialog {
    background: white;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .about-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
  }

  .about-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    color: #333;
  }

  .about-content {
    padding: 20px;
  }

  .about-content p {
    margin: 0 0 12px 0;
    line-height: 1.5;
    color: #333;
  }

  .about-links {
    margin: 16px 0;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .about-links a {
    color: #007bff;
    text-decoration: none;
    font-size: 14px;
  }

  .about-links a:hover {
    text-decoration: underline;
  }

  .license-info {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }

  .license-info p {
    margin: 0 0 8px 0;
    font-size: 13px;
  }

  .license-info a {
    color: #007bff;
    text-decoration: none;
    font-size: 13px;
  }

  .license-info a:hover {
    text-decoration: underline;
  }

  /* Responsive design for smaller screens */
  @media (max-width: 500px) {
    .popup-container {
      min-height: 450px;
      max-height: 650px;
    }

    .popup-title {
      font-size: 18px;
      margin-bottom: 12px;
    }

    .tab-navigation {
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 2px;
    }

    .tab-button {
      min-width: 80px;
      padding: 6px;
      font-size: 12px;
    }

    .footer-content {
      flex-direction: column;
      text-align: center;
      gap: 6px;
    }

    .sms-interface {
      flex-direction: column;
      min-height: 350px;
    }

    .sms-interface pb-conversation-list {
      flex: 1;
      min-width: 0;
      border-right: none;
      border-bottom: 1px solid #e9ecef;
    }

    .sms-interface pb-sms-thread {
      flex: 1;
      min-height: 170px;
    }

    .about-links {
      flex-direction: column;
      gap: 8px;
    }
  }

  @media (min-width: 500px) {
    .popup-container {
      max-width: 500px;
    }

    .popup-header {
      padding: 18px 22px;
    }

    .popup-title {
      font-size: 21px;
      margin-bottom: 18px;
    }

    .tab-button {
      padding: 6px;
      font-size: 13px;
    }

    .popup-footer {
      padding: 14px 22px;
      font-size: 12px;
    }

    .about-button {
      font-size: 11px;
    }
  }

  @media (min-width: 600px) {
    .popup-container {
      max-width: 600px;
    }

    .popup-title {
      font-size: 22px;
    }

    .tab-button {
      padding: 6px;
      font-size: 14px;
    }

    .sms-interface pb-conversation-list {
      flex: 1;
      min-width: 0;
    }
  }

  /* === Dark mode overrides === */
  :host-context(html[data-theme='dark']) {
    --scrollbar-track: #1e1e1e;
    --scrollbar-thumb: #4b5563;
    --scrollbar-thumb-hover: #6b7280;
    --surface: #121212;
    --surface-alt: #1e1e1e;
    --border-color: #2d2d2d;
    --text-primary: #e6e1e3;
    --text-secondary: #a1a1aa;
    --accent: #8b5cf6;
    --accent-hover: #7c3aed;
  }

  :host-context(html[data-theme='dark']) * {
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }

  :host-context(html[data-theme='dark']) *::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  :host-context(html[data-theme='dark']) *::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
  }

  :host-context(html[data-theme='dark']) *::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }

  :host-context(html[data-theme='dark']) .popup-header {
    background: var(--surface-alt);
    border-bottom-color: var(--border-color);
  }

  :host-context(html[data-theme='dark']) .popup-title {
    color: var(--text-primary);
  }

  :host-context(html[data-theme='dark']) .tab-navigation {
    background: var(--surface) !important;
    border-color: var(--border-color) !important;
  }

  :host-context(html[data-theme='dark']) .tab-button {
    color: var(--text-secondary);
  }

  :host-context(html[data-theme='dark']) .tab-button.active {
    background: var(--accent);
    color: white;
  }

  :host-context(html[data-theme='dark']) .tab-button:hover:not(.active) {
    background: #1f1f1f;
    color: var(--text-primary);
  }

  :host-context(html[data-theme='dark']) .sms-thread-header {
    background: var(--surface-alt);
    border-bottom-color: var(--border-color);
  }

  :host-context(html[data-theme='dark']) .conversation-title {
    color: var(--text-primary);
  }

  :host-context(html[data-theme='dark']) .popup-footer {
    background: var(--surface-alt);
    border-top-color: var(--border-color);
    color: var(--text-secondary);
  }

  :host-context(html[data-theme='dark']) .about-dialog {
    background: var(--surface-alt);
    color: var(--text-primary);
  }

  :host-context(html[data-theme='dark']) .about-header h3 {
    color: var(--text-primary);
  }

  :host-context(html[data-theme='dark']) .about-content p {
    color: var(--text-secondary);
  }

  :host-context(html[data-theme='dark']) .about-links a {
    color: var(--accent);
  }

  :host-context(html[data-theme='dark']) .about-links a:hover {
    color: var(--accent-hover);
  }

  :host-context(html[data-theme='dark']) .license-info a {
    color: var(--accent);
  }
`;
document.head.appendChild(style);
