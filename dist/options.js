import{D as b,n as w,d as M}from"./pb-nav.js";import"./storage.js";console.log("Pushbridge options page loaded");class T{constructor(){this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:b.slice(),hiddenTabs:[]},this.devices=[],this.smsDevices=[],this.pendingSmsDeviceChange=null}async init(){await this.loadSettings(),await this.loadDevices(),await this.loadSmsDevices(),this.render(),this.setupEventListeners()}async loadSettings(){try{const e=await chrome.storage.local.get(["pb_settings"]);e.pb_settings?this.settings={...this.settings,...e.pb_settings}:await chrome.storage.local.set({pb_settings:this.settings}),e.pb_settings?.autoOpenPushLinksAsTab!==void 0?this.settings.autoOpenPushLinksAsTab=e.pb_settings.autoOpenPushLinksAsTab:await chrome.storage.local.set({pb_settings:{...this.settings,autoOpenPushLinksAsTab:this.settings.autoOpenPushLinksAsTab}});const i=await chrome.storage.local.get("defaultSmsDevice");i.defaultSmsDevice&&(this.settings.defaultSmsDevice=i.defaultSmsDevice);const s=e.pb_settings?.optionOrder??this.settings.optionOrder,o=e.pb_settings?.hiddenTabs??this.settings.hiddenTabs??[],r=w(s),g=M(o),u=JSON.stringify(s)!==JSON.stringify(r),p=JSON.stringify(o)!==JSON.stringify(g);this.settings.optionOrder=r,this.settings.hiddenTabs=g,(u||p)&&await this.saveSettings()}catch(e){console.error("Failed to load settings:",e)}}async setOptionOrder(e){this.settings.optionOrder=w(e),await this.saveSettings()}async loadDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"getDevices"});e.ok&&(this.devices=e.devices||[])}catch(e){console.error("Failed to load devices:",e)}}async loadSmsDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CAPABLE_DEVICES"});e.success&&(this.smsDevices=e.devices||[])}catch(e){console.error("Failed to load SMS devices:",e)}}getDeviceDisplayName(e){return e.nickname?e.nickname:e.manufacturer&&e.model?`${e.manufacturer} ${e.model}`:e.model?e.model:"Unknown Device"}async saveSettings(){try{await chrome.storage.local.set({pb_settings:this.settings}),this.showMessage("Settings saved successfully!","success")}catch(e){console.error("Failed to save settings:",e),this.showMessage("Failed to save settings","error")}}async updateSmsDevice(){if(this.pendingSmsDeviceChange)try{const e=document.getElementById("update-sms-device");e&&(e.disabled=!0,e.textContent="Updating...");const i=await chrome.runtime.sendMessage({cmd:"SET_DEFAULT_SMS_DEVICE",deviceIden:this.pendingSmsDeviceChange});i.success?(this.settings.defaultSmsDevice=this.pendingSmsDeviceChange,this.pendingSmsDeviceChange=null,await chrome.storage.local.set({defaultSmsDevice:this.settings.defaultSmsDevice}),this.showMessage("SMS device updated successfully!","success"),this.render(),this.setupEventListeners()):this.showMessage(`Failed to update SMS device: ${i.error}`,"error")}catch(e){console.error("Failed to update SMS device:",e),this.showMessage("Failed to update SMS device","error")}finally{const e=document.getElementById("update-sms-device");e&&(e.disabled=!1,e.textContent="Update")}}async testWebSocket(){try{const e=await chrome.runtime.sendMessage({cmd:"testWebSocket"});e.ok?this.showMessage(`WebSocket test successful! Last heartbeat: ${e.lastHeartbeat}`,"success"):this.showMessage(`WebSocket test failed: ${e.error}`,"error")}catch{this.showMessage("WebSocket test failed","error")}}async exportDebugLog(){try{const e=await chrome.runtime.sendMessage({cmd:"getDebugLog"});if(e.ok){const i=new Blob([e.log],{type:"text/plain"}),s=URL.createObjectURL(i),o=document.createElement("a");o.href=s,o.download=`pushbridge-debug-${new Date().toISOString().split("T")[0]}.log`,o.click(),URL.revokeObjectURL(s),this.showMessage("Debug log exported successfully!","success")}else this.showMessage("Failed to export debug log","error")}catch{this.showMessage("Failed to export debug log","error")}}showMessage(e,i){const s=document.getElementById("message");s&&(s.textContent=e,s.className=`message ${i}`,s.style.display="block",setTimeout(()=>{s.style.display="none"},3e3))}setupEventListeners(){const e=document.getElementById("sound-toggle");e&&(e.checked=this.settings.soundEnabled,e.addEventListener("change",a=>{this.settings.soundEnabled=a.target.checked,this.saveSettings()}));const i=document.getElementById("notifications-toggle");i&&(i.checked=this.settings.notificationsEnabled,i.addEventListener("change",a=>{this.settings.notificationsEnabled=a.target.checked,this.saveSettings()}));const s=document.getElementById("option-order");if(s){const a=()=>{const n=this.settings.optionOrder.filter(t=>t!=="SMS/MMS"||this.smsDevices.length>0);s.innerHTML=n.map(t=>{const d=this.settings.hiddenTabs?.includes(t);return`
              <li draggable="true" data-key="${t}" class="dnd-item">
                <span class="handle" aria-hidden="true">⋮⋮</span>
                <span class="label">${t}</span>
                <button type="button"
                        class="toggle-visibility"
                        data-key="${t}"
                        aria-label="${d?"Show":"Hide"} ${t}"
                        data-state="${d?"show":"hide"}">
                  ${d?"Show":"Hide"}
                </button>
              </li>
            `}).join("")};a(),s.addEventListener("click",async n=>{const t=n.target.closest(".toggle-visibility");if(!t)return;n.preventDefault();const d=t.dataset.key;if(!d)return;this.settings.hiddenTabs=Array.isArray(this.settings.hiddenTabs)?this.settings.hiddenTabs:[];const c=new Set(this.settings.hiddenTabs),m=c.has(d),f=b.filter(h=>h==="SMS/MMS"?this.smsDevices.length>0:!0);if(m)c.delete(d);else{if(f.filter(v=>!c.has(v)).length<=1){this.showMessage("At least one tab must remain visible.","error");return}c.add(d)}this.settings.hiddenTabs=Array.from(c),await this.saveSettings(),a()});let l=null;s.addEventListener("dragstart",n=>{if(n.target.closest(".toggle-visibility")){n.preventDefault();return}const t=n.target?.closest("li");t&&(l=t,t.classList.add("dragging"),n.dataTransfer?.setData("text/plain",t.dataset.key||""),n.dataTransfer?.setDragImage(t,10,10))}),s.addEventListener("dragover",n=>{n.preventDefault();const t=L(s,n.clientY);l&&(t?s.insertBefore(l,t):s.appendChild(l))}),s.addEventListener("dragend",async()=>{l&&l.classList.remove("dragging"),l=null;const n=Array.from(s.querySelectorAll("li")).map(t=>t.getAttribute("data-key"));await this.setOptionOrder(n),a()});const L=(n,t)=>{const d=Array.from(n.querySelectorAll("li:not(.dragging)"));let c=Number.NEGATIVE_INFINITY,m=null;for(const f of d){const h=f.getBoundingClientRect(),v=t-h.top-h.height/2;v<0&&v>c&&(c=v,m=f)}return m}}const o=document.getElementById("auto-reconnect-toggle");o&&(o.checked=this.settings.autoReconnect,o.addEventListener("change",a=>{this.settings.autoReconnect=a.target.checked,this.saveSettings()}));const r=document.getElementById("auto-open-links-toggle");r&&(r.checked=this.settings.autoOpenPushLinksAsTab,r.addEventListener("change",a=>{this.settings.autoOpenPushLinksAsTab=a.target.checked,this.saveSettings()}));const g=document.getElementById("default-device");g&&(g.value=this.settings.defaultDevice,g.addEventListener("change",a=>{this.settings.defaultDevice=a.target.value,this.saveSettings()}));const u=document.getElementById("default-sms-device");u&&(u.value=this.settings.defaultSmsDevice,u.addEventListener("change",a=>{const l=a.target.value;this.pendingSmsDeviceChange=l!==this.settings.defaultSmsDevice?l:null,this.updateSmsDeviceButtonState()}));const p=document.getElementById("test-websocket");p&&p.addEventListener("click",()=>this.testWebSocket());const S=document.getElementById("export-log");S&&S.addEventListener("click",()=>this.exportDebugLog());const y=document.getElementById("reset-settings");y&&y.addEventListener("click",()=>this.resetSettings());const D=document.getElementById("reset-all-data");D&&D.addEventListener("click",()=>this.resetAllData());const E=document.getElementById("update-sms-device");E&&E.addEventListener("click",()=>this.updateSmsDevice())}updateSmsDeviceButtonState(){const e=document.getElementById("update-sms-device");e&&(e.disabled=!this.pendingSmsDeviceChange,e.textContent=(this.pendingSmsDeviceChange,"Update SMS Device"))}async resetSettings(){confirm("Are you sure you want to reset all settings to defaults?")&&(this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:b.slice(),hiddenTabs:[]},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners())}async resetAllData(){if(confirm("Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate."))try{await chrome.runtime.sendMessage({cmd:"clearAllData"}),this.showMessage("All data cleared successfully. Please refresh the page.","success"),this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:b.slice(),hiddenTabs:[]},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners()}catch(e){console.error("Failed to reset all data:",e),this.showMessage("Failed to reset all data. Please try again.","error")}}render(){const e=document.querySelector(".container");e&&(e.innerHTML=`
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
            <label>Navigation order</label>
            <p>Drag to rearrange tabs. Use Show or Hide to change visibility.</p>
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
              ${this.devices.map(i=>`<option value="${i.iden}">${this.getDeviceDisplayName(i)} (${i.type})</option>`).join("")}
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
              ${this.smsDevices.map(i=>`<option value="${i.iden}">${this.getDeviceDisplayName(i)} (${i.type})</option>`).join("")}
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
    `)}}document.addEventListener("DOMContentLoaded",()=>{console.log("Options DOM ready"),new T().init()});
