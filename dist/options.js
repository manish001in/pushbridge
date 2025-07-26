console.log('Pushbridge options page loaded');
class r {
  constructor() {
    ((this.settings = {
      soundEnabled: !0,
      defaultDevice: 'all',
      notificationsEnabled: !0,
      autoReconnect: !0,
    }),
      (this.devices = []));
  }
  async init() {
    (await this.loadSettings(),
      await this.loadDevices(),
      this.render(),
      this.setupEventListeners());
  }
  async loadSettings() {
    try {
      const e = await chrome.storage.local.get('pb_settings');
      e.pb_settings && (this.settings = { ...this.settings, ...e.pb_settings });
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }
  async loadDevices() {
    try {
      const e = await chrome.runtime.sendMessage({ cmd: 'getDevices' });
      e.ok && (this.devices = e.devices || []);
    } catch (e) {
      console.error('Failed to load devices:', e);
    }
  }
  async saveSettings() {
    try {
      (await chrome.storage.local.set({ pb_settings: this.settings }),
        this.showMessage('Settings saved successfully!', 'success'));
    } catch (e) {
      (console.error('Failed to save settings:', e),
        this.showMessage('Failed to save settings', 'error'));
    }
  }
  async testWebSocket() {
    try {
      const e = await chrome.runtime.sendMessage({ cmd: 'testWebSocket' });
      e.ok
        ? this.showMessage(
            `WebSocket test successful! Last heartbeat: ${e.lastHeartbeat}`,
            'success'
          )
        : this.showMessage(`WebSocket test failed: ${e.error}`, 'error');
    } catch {
      this.showMessage('WebSocket test failed', 'error');
    }
  }
  async exportDebugLog() {
    try {
      const e = await chrome.runtime.sendMessage({ cmd: 'getDebugLog' });
      if (e.ok) {
        const s = new Blob([e.log], { type: 'text/plain' }),
          t = URL.createObjectURL(s),
          i = document.createElement('a');
        ((i.href = t),
          (i.download = `pushbridge-debug-${new Date().toISOString().split('T')[0]}.log`),
          i.click(),
          URL.revokeObjectURL(t),
          this.showMessage('Debug log exported successfully!', 'success'));
      } else this.showMessage('Failed to export debug log', 'error');
    } catch {
      this.showMessage('Failed to export debug log', 'error');
    }
  }
  showMessage(e, s) {
    const t = document.getElementById('message');
    t &&
      ((t.textContent = e),
      (t.className = `message ${s}`),
      (t.style.display = 'block'),
      setTimeout(() => {
        t.style.display = 'none';
      }, 3e3));
  }
  setupEventListeners() {
    const e = document.getElementById('sound-toggle');
    e &&
      ((e.checked = this.settings.soundEnabled),
      e.addEventListener('change', n => {
        ((this.settings.soundEnabled = n.target.checked), this.saveSettings());
      }));
    const s = document.getElementById('notifications-toggle');
    s &&
      ((s.checked = this.settings.notificationsEnabled),
      s.addEventListener('change', n => {
        ((this.settings.notificationsEnabled = n.target.checked),
          this.saveSettings());
      }));
    const t = document.getElementById('auto-reconnect-toggle');
    t &&
      ((t.checked = this.settings.autoReconnect),
      t.addEventListener('change', n => {
        ((this.settings.autoReconnect = n.target.checked), this.saveSettings());
      }));
    const i = document.getElementById('default-device');
    i &&
      ((i.value = this.settings.defaultDevice),
      i.addEventListener('change', n => {
        ((this.settings.defaultDevice = n.target.value), this.saveSettings());
      }));
    const o = document.getElementById('test-websocket');
    o && o.addEventListener('click', () => this.testWebSocket());
    const a = document.getElementById('export-log');
    a && a.addEventListener('click', () => this.exportDebugLog());
    const c = document.getElementById('reset-settings');
    c && c.addEventListener('click', () => this.resetSettings());
    const l = document.getElementById('reset-all-data');
    l && l.addEventListener('click', () => this.resetAllData());
  }
  async resetSettings() {
    confirm('Are you sure you want to reset all settings to defaults?') &&
      ((this.settings = {
        soundEnabled: !0,
        defaultDevice: 'all',
        notificationsEnabled: !0,
        autoReconnect: !0,
      }),
      await this.saveSettings(),
      this.render(),
      this.setupEventListeners());
  }
  async resetAllData() {
    if (
      confirm(
        'Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate.'
      )
    )
      try {
        (await chrome.runtime.sendMessage({ cmd: 'clearAllData' }),
          this.showMessage(
            'All data cleared successfully. Please refresh the page.',
            'success'
          ),
          (this.settings = {
            soundEnabled: !0,
            defaultDevice: 'all',
            notificationsEnabled: !0,
            autoReconnect: !0,
          }),
          await this.saveSettings(),
          this.render(),
          this.setupEventListeners());
      } catch (e) {
        (console.error('Failed to reset all data:', e),
          this.showMessage(
            'Failed to reset all data. Please try again.',
            'error'
          ));
      }
  }
  render() {
    const e = document.querySelector('.container');
    e &&
      (e.innerHTML = `
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
              ${this.devices.map(s => `<option value="${s.iden}">${s.nickname} (${s.type})</option>`).join('')}
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
    `);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  (console.log('Options DOM ready'), new r().init());
});
