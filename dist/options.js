console.log("Pushbridge options page loaded");const m=["Send","Messages","Notifications","Subscriptions","SMS/MMS"];class L{constructor(){this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:m.slice(),hiddenTabs:[]},this.devices=[],this.smsDevices=[],this.pendingSmsDeviceChange=null,this.onSchemeChange=()=>{if(!this.settings.systemTheme)return;const e=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=e?"dark":"light"}}ensureThemeListener(){if(!this.settings.systemTheme){this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0);return}this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange))}async init(){await this.loadSettings(),await this.loadDevices(),await this.loadSmsDevices(),this.render(),this.setupEventListeners(),this.ensureThemeListener(),document.documentElement.dataset.theme=this.settings.systemTheme&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}async loadSettings(){try{const e=await chrome.storage.local.get(["pb_settings"]);e.pb_settings?this.settings={...this.settings,...e.pb_settings}:await chrome.storage.local.set({pb_settings:this.settings}),e.pb_settings?.autoOpenPushLinksAsTab!==void 0?this.settings.autoOpenPushLinksAsTab=e.pb_settings.autoOpenPushLinksAsTab:await chrome.storage.local.set({pb_settings:{...this.settings,autoOpenPushLinksAsTab:this.settings.autoOpenPushLinksAsTab}});const t=await chrome.storage.local.get("defaultSmsDevice");t.defaultSmsDevice&&(this.settings.defaultSmsDevice=t.defaultSmsDevice);const a=new Set(m),s=g=>{const d=new Set,i=[];if(Array.isArray(g)){for(const l of g)if(typeof l=="string"&&a.has(l)&&!d.has(l)){const c=l;d.add(c),i.push(c)}}for(const l of m)d.has(l)||i.push(l);return i},v=g=>{if(!Array.isArray(g))return[];const d=new Set;for(const i of g)typeof i=="string"&&a.has(i)&&d.add(i);return Array.from(d)},h=e.pb_settings?.optionOrder??this.settings.optionOrder,f=e.pb_settings?.hiddenTabs??this.settings.hiddenTabs??[],p=s(h),b=v(f),D=JSON.stringify(h)!==JSON.stringify(p),w=JSON.stringify(f)!==JSON.stringify(b);this.settings.optionOrder=p,this.settings.hiddenTabs=b,(D||w)&&await this.saveSettings()}catch(e){console.error("Failed to load settings:",e)}}async setOptionOrder(e){const t=new Set(m),a=e.filter((s,v,h)=>typeof s=="string"&&t.has(s)&&h.indexOf(s)===v);for(const s of m)a.includes(s)||a.push(s);this.settings.optionOrder=a,await this.saveSettings()}async loadDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"getDevices"});e.ok&&(this.devices=e.devices||[])}catch(e){console.error("Failed to load devices:",e)}}async loadSmsDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CAPABLE_DEVICES"});e.success&&(this.smsDevices=e.devices||[])}catch(e){console.error("Failed to load SMS devices:",e)}}getDeviceDisplayName(e){return e.nickname?e.nickname:e.manufacturer&&e.model?`${e.manufacturer} ${e.model}`:e.model?e.model:"Unknown Device"}async saveSettings(){try{await chrome.storage.local.set({pb_settings:this.settings}),this.settings.systemTheme?this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange)):this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0),this.ensureThemeListener();const e=this.settings.systemTheme?window.matchMedia("(prefers-color-scheme: dark)").matches:!1;document.documentElement.dataset.theme=e?"dark":"light",this.showMessage("Settings saved successfully!","success")}catch(e){console.error("Failed to save settings:",e),this.showMessage("Failed to save settings","error")}}async updateSmsDevice(){if(this.pendingSmsDeviceChange)try{const e=document.getElementById("update-sms-device");e&&(e.disabled=!0,e.textContent="Updating...");const t=await chrome.runtime.sendMessage({cmd:"SET_DEFAULT_SMS_DEVICE",deviceIden:this.pendingSmsDeviceChange});t.success?(this.settings.defaultSmsDevice=this.pendingSmsDeviceChange,this.pendingSmsDeviceChange=null,await chrome.storage.local.set({defaultSmsDevice:this.settings.defaultSmsDevice}),this.showMessage("SMS device updated successfully!","success"),this.render(),this.setupEventListeners()):this.showMessage(`Failed to update SMS device: ${t.error}`,"error")}catch(e){console.error("Failed to update SMS device:",e),this.showMessage("Failed to update SMS device","error")}finally{const e=document.getElementById("update-sms-device");e&&(e.disabled=!1,e.textContent="Update")}}async testWebSocket(){try{const e=await chrome.runtime.sendMessage({cmd:"testWebSocket"});e.ok?this.showMessage(`WebSocket test successful! Last heartbeat: ${e.lastHeartbeat}`,"success"):this.showMessage(`WebSocket test failed: ${e.error}`,"error")}catch{this.showMessage("WebSocket test failed","error")}}async exportDebugLog(){try{const e=await chrome.runtime.sendMessage({cmd:"getDebugLog"});if(e.ok){const t=new Blob([e.log],{type:"text/plain"}),a=URL.createObjectURL(t),s=document.createElement("a");s.href=a,s.download=`pushbridge-debug-${new Date().toISOString().split("T")[0]}.log`,s.click(),URL.revokeObjectURL(a),this.showMessage("Debug log exported successfully!","success")}else this.showMessage("Failed to export debug log","error")}catch{this.showMessage("Failed to export debug log","error")}}showMessage(e,t){const a=document.getElementById("message");a&&(a.textContent=e,a.className=`message ${t}`,a.style.display="block",setTimeout(()=>{a.style.display="none"},3e3))}setupEventListeners(){const e=document.getElementById("sound-toggle");e&&(e.checked=this.settings.soundEnabled,e.addEventListener("change",i=>{this.settings.soundEnabled=i.target.checked,this.saveSettings()}));const t=document.getElementById("notifications-toggle");t&&(t.checked=this.settings.notificationsEnabled,t.addEventListener("change",i=>{this.settings.notificationsEnabled=i.target.checked,this.saveSettings()}));const a=document.getElementById("system-theme-toggle");a&&(a.checked=!!this.settings.systemTheme,a.addEventListener("change",i=>{this.settings.systemTheme=i.target.checked,this.saveSettings()}));const s=document.getElementById("option-order");if(s){let i=function(o,n){const r=Array.from(o.querySelectorAll("li:not(.dragging)"));let u=Number.NEGATIVE_INFINITY,E=null;for(const M of r){const y=M.getBoundingClientRect(),S=n-y.top-y.height/2;S<0&&S>u&&(u=S,E=M)}return E};const l=()=>{const o=this.settings.optionOrder.filter(n=>n!=="SMS/MMS"||this.smsDevices.length>0);s.innerHTML=o.map(n=>{const r=this.settings.hiddenTabs?.includes(n);return`
              <li draggable="true" data-key="${n}" class="dnd-item">
                <span class="handle" aria-hidden="true">⋮⋮</span>
                <span class="label">${n}</span>
                <button type="button"
                        class="toggle-visibility"
                        data-key="${n}"
                        data-state="${r?"show":"hide"}">
                  ${r?'<span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>':'<span class="material-symbols-outlined" style="font-size: 14px;">visibility_off</span>'}
                </button>
              </li>
            `}).join("")};l(),s.addEventListener("click",async o=>{const n=o.target.closest(".toggle-visibility");if(!n)return;o.preventDefault();const r=n.dataset.key;if(!r)return;this.settings.hiddenTabs=Array.isArray(this.settings.hiddenTabs)?this.settings.hiddenTabs:[];const u=new Set(this.settings.hiddenTabs),E=u.has(r),M=m.filter(y=>y==="SMS/MMS"?this.smsDevices.length>0:!0);if(E)u.delete(r);else{if(M.filter(S=>!u.has(S)).length<=1){this.showMessage("At least one tab must remain visible.","error");return}u.add(r)}this.settings.hiddenTabs=Array.from(u),await this.saveSettings(),l()});let c=null;s.addEventListener("dragstart",o=>{if(o.target.closest(".toggle-visibility")){o.preventDefault();return}const n=o.target?.closest("li");n&&(c=n,n.classList.add("dragging"),o.dataTransfer?.setData("text/plain",n.dataset.key||""),o.dataTransfer?.setDragImage(n,10,10))}),s.addEventListener("dragover",o=>{o.preventDefault();const n=i(s,o.clientY);c&&(n?s.insertBefore(c,n):s.appendChild(c))}),s.addEventListener("dragend",async()=>{c&&c.classList.remove("dragging"),c=null;const o=Array.from(s.querySelectorAll("li")).map(n=>n.getAttribute("data-key"));await this.setOptionOrder(o),l()})}const v=document.getElementById("auto-reconnect-toggle");v&&(v.checked=this.settings.autoReconnect,v.addEventListener("change",i=>{this.settings.autoReconnect=i.target.checked,this.saveSettings()}));const h=document.getElementById("auto-open-links-toggle");h&&(h.checked=this.settings.autoOpenPushLinksAsTab,h.addEventListener("change",i=>{this.settings.autoOpenPushLinksAsTab=i.target.checked,this.saveSettings()}));const f=document.getElementById("default-device");f&&(f.value=this.settings.defaultDevice,f.addEventListener("change",i=>{this.settings.defaultDevice=i.target.value,this.saveSettings()}));const p=document.getElementById("default-sms-device");p&&(p.value=this.settings.defaultSmsDevice,p.addEventListener("change",i=>{const l=i.target.value;this.pendingSmsDeviceChange=l!==this.settings.defaultSmsDevice?l:null,this.updateSmsDeviceButtonState()}));const b=document.getElementById("test-websocket");b&&b.addEventListener("click",()=>this.testWebSocket());const D=document.getElementById("export-log");D&&D.addEventListener("click",()=>this.exportDebugLog());const w=document.getElementById("reset-settings");w&&w.addEventListener("click",()=>this.resetSettings());const g=document.getElementById("reset-all-data");g&&g.addEventListener("click",()=>this.resetAllData());const d=document.getElementById("update-sms-device");d&&d.addEventListener("click",()=>this.updateSmsDevice())}updateSmsDeviceButtonState(){const e=document.getElementById("update-sms-device");e&&(e.disabled=!this.pendingSmsDeviceChange,e.textContent=(this.pendingSmsDeviceChange,"Update SMS Device"))}async resetSettings(){confirm("Are you sure you want to reset all settings to defaults?")&&(this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:m.slice(),hiddenTabs:[]},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners())}async resetAllData(){if(confirm("Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate."))try{await chrome.runtime.sendMessage({cmd:"clearAllData"}),this.showMessage("All data cleared successfully. Please refresh the page.","success"),this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,systemTheme:!1,optionOrder:m.slice(),hiddenTabs:[]},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners()}catch(e){console.error("Failed to reset all data:",e),this.showMessage("Failed to reset all data. Please try again.","error")}}render(){const e=document.querySelector(".container");e&&(e.innerHTML=`
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
            <p>Drag to rearrange and click the eye icon to toggle visibility</p>
          </div>
          <div class="setting-control">
            <ul id="option-order" class="dnd-list"></ul>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="system-theme-toggle">Match system theme</label>
            <p>Automatically switch between light and dark mode based on your system settings</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="system-theme-toggle" class="toggle" checked="${this.settings.systemTheme}">
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
        <p>Pushbridge v1.3.1 · <a href="https://github.com/manish001in/pushbridge" target="_blank">GitHub</a> · <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a></p>
        <p class="disclaimer">This is an unofficial extension and is not affiliated with Pushbullet Inc.</p>
      </div>
    `)}}document.addEventListener("DOMContentLoaded",()=>{console.log("Options DOM ready"),new L().init()});