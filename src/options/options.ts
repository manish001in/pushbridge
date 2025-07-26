// Options page entry point
console.log('Pushbridge options page loaded');

interface Settings {
  soundEnabled: boolean;
  defaultDevice: string;
  notificationsEnabled: boolean;
  autoReconnect: boolean;
}

class OptionsPage {
  private settings: Settings = {
    soundEnabled: true,
    defaultDevice: 'all',
    notificationsEnabled: true,
    autoReconnect: true,
  };

  private devices: Array<{ iden: string; nickname: string; type: string }> = [];

  async init() {
    await this.loadSettings();
    await this.loadDevices();
    this.render();
    this.setupEventListeners();
  }

  private async loadSettings() {
    try {
      const stored = await chrome.storage.local.get('pb_settings');
      if (stored.pb_settings) {
        this.settings = { ...this.settings, ...stored.pb_settings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private async loadDevices() {
    try {
      const response = await chrome.runtime.sendMessage({ cmd: 'getDevices' });
      if (response.ok) {
        this.devices = response.devices || [];
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  }

  private async saveSettings() {
    try {
      await chrome.storage.local.set({ pb_settings: this.settings });
      this.showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }

  private async testWebSocket() {
    try {
      const response = await chrome.runtime.sendMessage({
        cmd: 'testWebSocket',
      });
      if (response.ok) {
        this.showMessage(
          `WebSocket test successful! Last heartbeat: ${response.lastHeartbeat}`,
          'success'
        );
      } else {
        this.showMessage(`WebSocket test failed: ${response.error}`, 'error');
      }
    } catch {
      this.showMessage('WebSocket test failed', 'error');
    }
  }

  private async exportDebugLog() {
    try {
      const response = await chrome.runtime.sendMessage({ cmd: 'getDebugLog' });
      if (response.ok) {
        const blob = new Blob([response.log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pushbridge-debug-${new Date().toISOString().split('T')[0]}.log`;
        a.click();
        URL.revokeObjectURL(url);
        this.showMessage('Debug log exported successfully!', 'success');
      } else {
        this.showMessage('Failed to export debug log', 'error');
      }
    } catch {
      this.showMessage('Failed to export debug log', 'error');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${type}`;
      messageEl.style.display = 'block';
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 3000);
    }
  }

  private setupEventListeners() {
    // Sound toggle
    const soundToggle = document.getElementById(
      'sound-toggle'
    ) as HTMLInputElement;
    if (soundToggle) {
      soundToggle.checked = this.settings.soundEnabled;
      soundToggle.addEventListener('change', e => {
        this.settings.soundEnabled = (e.target as HTMLInputElement).checked;
        this.saveSettings();
      });
    }

    // Notifications toggle
    const notificationsToggle = document.getElementById(
      'notifications-toggle'
    ) as HTMLInputElement;
    if (notificationsToggle) {
      notificationsToggle.checked = this.settings.notificationsEnabled;
      notificationsToggle.addEventListener('change', e => {
        this.settings.notificationsEnabled = (
          e.target as HTMLInputElement
        ).checked;
        this.saveSettings();
      });
    }

    // Auto reconnect toggle
    const autoReconnectToggle = document.getElementById(
      'auto-reconnect-toggle'
    ) as HTMLInputElement;
    if (autoReconnectToggle) {
      autoReconnectToggle.checked = this.settings.autoReconnect;
      autoReconnectToggle.addEventListener('change', e => {
        this.settings.autoReconnect = (e.target as HTMLInputElement).checked;
        this.saveSettings();
      });
    }

    // Default device selection
    const defaultDeviceSelect = document.getElementById(
      'default-device'
    ) as HTMLSelectElement;
    if (defaultDeviceSelect) {
      defaultDeviceSelect.value = this.settings.defaultDevice;
      defaultDeviceSelect.addEventListener('change', e => {
        this.settings.defaultDevice = (e.target as HTMLSelectElement).value;
        this.saveSettings();
      });
    }

    // Test WebSocket button
    const testWebSocketBtn = document.getElementById('test-websocket');
    if (testWebSocketBtn) {
      testWebSocketBtn.addEventListener('click', () => this.testWebSocket());
    }

    // Export debug log button
    const exportLogBtn = document.getElementById('export-log');
    if (exportLogBtn) {
      exportLogBtn.addEventListener('click', () => this.exportDebugLog());
    }

    // Reset settings button
    const resetBtn = document.getElementById('reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }

    // Reset all data button
    const resetAllBtn = document.getElementById('reset-all-data');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => this.resetAllData());
    }
  }

  private async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settings = {
        soundEnabled: true,
        defaultDevice: 'all',
        notificationsEnabled: true,
        autoReconnect: true,
      };
      await this.saveSettings();
      this.render();
      this.setupEventListeners();
    }
  }

  private async resetAllData() {
    if (confirm('Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate.')) {
      try {
        // Clear all data including cursors
        await chrome.runtime.sendMessage({ cmd: 'clearAllData' });
        this.showMessage('All data cleared successfully. Please refresh the page.', 'success');
        
        // Reset settings to defaults
        this.settings = {
          soundEnabled: true,
          defaultDevice: 'all',
          notificationsEnabled: true,
          autoReconnect: true,
        };
        await this.saveSettings();
        this.render();
        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to reset all data:', error);
        this.showMessage('Failed to reset all data. Please try again.', 'error');
      }
    }
  }

  private render() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.innerHTML = `
      <div class="options-header">
        <h1>Pushbridge Settings</h1>
        <p class="subtitle">Configure your Pushbridge extension preferences</p>
      </div>

      <div id="message" class="message" style="display: none;"></div>

      <div class="settings-section">
        <h2>Notifications</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="notifications-toggle">Enable notifications</label>
            <p>Show Chrome notifications for incoming pushes and mirrored notifications</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="notifications-toggle" class="toggle">
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="sound-toggle">Play notification sound</label>
            <p>Play a sound when receiving notifications</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="sound-toggle" class="toggle">
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Default Settings</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="default-device">Default target device</label>
            <p>Choose which device receives pushes by default</p>
          </div>
          <div class="setting-control">
            <select id="default-device" class="select">
              <option value="all">All devices</option>
              ${this.devices
                .map(
                  device =>
                    `<option value="${device.iden}">${device.nickname} (${device.type})</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Connection</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="auto-reconnect-toggle">Auto-reconnect</label>
            <p>Automatically reconnect to Pushbullet when connection is lost</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="auto-reconnect-toggle" class="toggle">
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Diagnostics</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>WebSocket connection</label>
            <p>Test the connection to Pushbullet's real-time stream</p>
          </div>
          <div class="setting-control">
            <button id="test-websocket" class="button secondary">Test Connection</button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>Debug log</label>
            <p>Export debug information for troubleshooting</p>
          </div>
          <div class="setting-control">
            <button id="export-log" class="button secondary">Export Log</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Advanced</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>Reset settings</label>
            <p>Reset all settings to their default values</p>
          </div>
          <div class="setting-control">
            <button id="reset-settings" class="button danger">Reset All Settings</button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>Reset all data</label>
            <p>Clear all cached data, cursors, and settings. You will need to re-authenticate.</p>
          </div>
          <div class="setting-control">
            <button id="reset-all-data" class="button danger">Reset All Data</button>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Pushbridge v1.0.0 · <a href="https://github.com/manish001in/pushbridge" target="_blank">GitHub</a> · <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a></p>
        <p class="disclaimer">This is an unofficial extension and is not affiliated with Pushbullet Inc.</p>
      </div>
    `;
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options DOM ready');
  const optionsPage = new OptionsPage();
  optionsPage.init();
});
