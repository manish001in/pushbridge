console.log("Pushbridge options page loaded");const g=["Send","Messages","Notifications","Subscriptions","SMS/MMS"];class M{constructor(){this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:g.slice()},this.devices=[],this.smsDevices=[],this.pendingSmsDeviceChange=null,this.onSchemeChange=()=>{if(!this.settings.systemTheme)return;const e=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=e?"dark":"light"}}ensureThemeListener(){if(!this.settings.systemTheme){this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0);return}this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange))}async init(){await this.loadSettings(),await this.loadDevices(),await this.loadSmsDevices(),this.render(),this.setupEventListeners(),this.ensureThemeListener(),document.documentElement.dataset.theme=this.settings.systemTheme&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}async loadSettings(){try{const e=await chrome.storage.local.get(["pb_settings"]);e.pb_settings?this.settings={...this.settings,...e.pb_settings}:await chrome.storage.local.set({pb_settings:this.settings}),e.pb_settings.autoOpenPushLinksAsTab!==void 0?this.settings.autoOpenPushLinksAsTab=e.pb_settings.autoOpenPushLinksAsTab:await chrome.storage.local.set({pb_settings:{...this.settings,autoOpenPushLinksAsTab:this.settings.autoOpenPushLinksAsTab}});const t=await chrome.storage.local.get("defaultSmsDevice");t.defaultSmsDevice&&(this.settings.defaultSmsDevice=t.defaultSmsDevice);const i=h=>{const v=new Set(g),u=new Set,m=[];if(Array.isArray(h)){for(const c of h)if(typeof c=="string"&&v.has(c)&&!u.has(c)){const p=c;u.add(p),m.push(p)}}for(const c of g)u.has(c)||m.push(c);return m},s=e.pb_settings?.optionOrder??this.settings.optionOrder,l=i(s),d=JSON.stringify(e.pb_settings?.optionOrder)!==JSON.stringify(l);this.settings.optionOrder=l,d&&await this.saveSettings()}catch(e){console.error("Failed to load settings:",e)}}async setOptionOrder(e){const t=new Set(g),i=e.filter((s,l,d)=>typeof s=="string"&&t.has(s)&&d.indexOf(s)===l);for(const s of g)i.includes(s)||i.push(s);this.settings.optionOrder=i,await this.saveSettings()}async loadDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"getDevices"});e.ok&&(this.devices=e.devices||[])}catch(e){console.error("Failed to load devices:",e)}}async loadSmsDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CAPABLE_DEVICES"});e.success&&(this.smsDevices=e.devices||[])}catch(e){console.error("Failed to load SMS devices:",e)}}getDeviceDisplayName(e){return e.nickname?e.nickname:e.manufacturer&&e.model?`${e.manufacturer} ${e.model}`:e.model?e.model:"Unknown Device"}async saveSettings(){try{await chrome.storage.local.set({pb_settings:this.settings}),this.settings.systemTheme?this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange)):this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0),this.ensureThemeListener();const e=this.settings.systemTheme?window.matchMedia("(prefers-color-scheme: dark)").matches:!1;document.documentElement.dataset.theme=e?"dark":"light",this.showMessage("Settings saved successfully!","success")}catch(e){console.error("Failed to save settings:",e),this.showMessage("Failed to save settings","error")}}async updateSmsDevice(){if(this.pendingSmsDeviceChange)try{const e=document.getElementById("update-sms-device");e&&(e.disabled=!0,e.textContent="Updating...");const t=await chrome.runtime.sendMessage({cmd:"SET_DEFAULT_SMS_DEVICE",deviceIden:this.pendingSmsDeviceChange});t.success?(this.settings.defaultSmsDevice=this.pendingSmsDeviceChange,this.pendingSmsDeviceChange=null,await chrome.storage.local.set({defaultSmsDevice:this.settings.defaultSmsDevice}),this.showMessage("SMS device updated successfully!","success"),this.render(),this.setupEventListeners()):this.showMessage(`Failed to update SMS device: ${t.error}`,"error")}catch(e){console.error("Failed to update SMS device:",e),this.showMessage("Failed to update SMS device","error")}finally{const e=document.getElementById("update-sms-device");e&&(e.disabled=!1,e.textContent="Update")}}async testWebSocket(){try{const e=await chrome.runtime.sendMessage({cmd:"testWebSocket"});e.ok?this.showMessage(`WebSocket test successful! Last heartbeat: ${e.lastHeartbeat}`,"success"):this.showMessage(`WebSocket test failed: ${e.error}`,"error")}catch{this.showMessage("WebSocket test failed","error")}}async exportDebugLog(){try{const e=await chrome.runtime.sendMessage({cmd:"getDebugLog"});if(e.ok){const t=new Blob([e.log],{type:"text/plain"}),i=URL.createObjectURL(t),s=document.createElement("a");s.href=i,s.download=`pushbridge-debug-${new Date().toISOString().split("T")[0]}.log`,s.click(),URL.revokeObjectURL(i),this.showMessage("Debug log exported successfully!","success")}else this.showMessage("Failed to export debug log","error")}catch{this.showMessage("Failed to export debug log","error")}}showMessage(e,t){const i=document.getElementById("message");i&&(i.textContent=e,i.className=`message ${t}`,i.style.display="block",setTimeout(()=>{i.style.display="none"},3e3))}setupEventListeners(){const e=document.getElementById("sound-toggle");e&&(e.checked=this.settings.soundEnabled,e.addEventListener("change",n=>{this.settings.soundEnabled=n.target.checked,this.saveSettings()}));const t=document.getElementById("notifications-toggle");t&&(t.checked=this.settings.notificationsEnabled,t.addEventListener("change",n=>{this.settings.notificationsEnabled=n.target.checked,this.saveSettings()}));const i=document.getElementById("system-theme-toggle");i&&(i.checked=!!this.settings.systemTheme,i.addEventListener("change",n=>{this.settings.systemTheme=n.target.checked,this.saveSettings()}));const s=document.getElementById("option-order");if(s){let n=function(a,o){const L=Array.from(a.querySelectorAll("li:not(.dragging)"));let y=Number.NEGATIVE_INFINITY,D=null;for(const E of L){const w=E.getBoundingClientRect(),b=o-w.top-w.height/2;b<0&&b>y&&(y=b,D=E)}return D};const f=()=>{s.innerHTML=this.settings.optionOrder.map(a=>`<li draggable="true" data-key="${a}" class="dnd-item">
                   <span class="handle" aria-hidden="true">⋮⋮</span>
                   <span class="label">${a}</span>
                 </li>`).join("")};f();let r=null;s.addEventListener("dragstart",a=>{const o=a.target?.closest("li");o&&(r=o,o.classList.add("dragging"),a.dataTransfer?.setData("text/plain",o.dataset.key||""),a.dataTransfer?.setDragImage(o,10,10))}),s.addEventListener("dragover",a=>{a.preventDefault();const o=n(s,a.clientY);r&&(o?s.insertBefore(r,o):s.appendChild(r))}),s.addEventListener("dragend",async()=>{r&&r.classList.remove("dragging"),r=null;const a=Array.from(s.querySelectorAll("li")).map(o=>o.getAttribute("data-key"));await this.setOptionOrder(a),f()})}const l=document.getElementById("auto-reconnect-toggle");l&&(l.checked=this.settings.autoReconnect,l.addEventListener("change",n=>{this.settings.autoReconnect=n.target.checked,this.saveSettings()}));const d=document.getElementById("auto-open-links-toggle");d&&(d.checked=this.settings.autoOpenPushLinksAsTab,d.addEventListener("change",n=>{this.settings.autoOpenPushLinksAsTab=n.target.checked,this.saveSettings()}));const h=document.getElementById("default-device");h&&(h.value=this.settings.defaultDevice,h.addEventListener("change",n=>{this.settings.defaultDevice=n.target.value,this.saveSettings()}));const v=document.getElementById("default-sms-device");v&&(v.value=this.settings.defaultSmsDevice,v.addEventListener("change",n=>{const f=n.target.value;this.pendingSmsDeviceChange=f!==this.settings.defaultSmsDevice?f:null,this.updateSmsDeviceButtonState()}));const u=document.getElementById("test-websocket");u&&u.addEventListener("click",()=>this.testWebSocket());const m=document.getElementById("export-log");m&&m.addEventListener("click",()=>this.exportDebugLog());const c=document.getElementById("reset-settings");c&&c.addEventListener("click",()=>this.resetSettings());const p=document.getElementById("reset-all-data");p&&p.addEventListener("click",()=>this.resetAllData());const S=document.getElementById("update-sms-device");S&&S.addEventListener("click",()=>this.updateSmsDevice())}updateSmsDeviceButtonState(){const e=document.getElementById("update-sms-device");e&&(e.disabled=!this.pendingSmsDeviceChange,e.textContent=(this.pendingSmsDeviceChange,"Update SMS Device"))}async resetSettings(){confirm("Are you sure you want to reset all settings to defaults?")&&(this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:g.slice()},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners())}async resetAllData(){if(confirm("Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate."))try{await chrome.runtime.sendMessage({cmd:"clearAllData"}),this.showMessage("All data cleared successfully. Please refresh the page.","success"),this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:g.slice()},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners()}catch(e){console.error("Failed to reset all data:",e),this.showMessage("Failed to reset all data. Please try again.","error")}}render(){const e=document.querySelector(".container");e&&(e.innerHTML=`
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
        <h2>Customization</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label for="system-theme-toggle">Match system theme</label>
            <p>Automatically switch between light and dark mode based on your system settings</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="system-theme-toggle" class="toggle" checked="${this.settings.systemTheme}">
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>Navigation order</label>
            <p>Drag to rearrange.</p>
          </div>
          <div class="setting-control">
            <ul id="option-order" class="dnd-list"></ul>
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
              ${this.devices.map(t=>`<option value="${t.iden}">${this.getDeviceDisplayName(t)} (${t.type})</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="default-sms-device">Default SMS device</label>
            <p>Choose which device to use for SMS functionality</p>
          </div>
          <div class="setting-control sms-device-control">
            <select id="default-sms-device" class="select">
              <option value="">No SMS device selected</option>
              ${this.smsDevices.map(t=>`<option value="${t.iden}">${this.getDeviceDisplayName(t)} (${t.type})</option>`).join("")}
            </select>
            <button id="update-sms-device" class="button secondary" disabled>
              Update SMS Device
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="auto-open-links-toggle">Auto Open Push Links as Tabs</label>
            <p>Automatically open link pushes in new browser tabs when received</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="auto-open-links-toggle" class="toggle">
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
    `)}}document.addEventListener("DOMContentLoaded",()=>{console.log("Options DOM ready"),new M().init()});
