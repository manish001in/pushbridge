import{w as C,D as w,n as O,d as $}from"./pb-nav.js";import"./storage.js";function p(D){return(D??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}class B{constructor(){this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:w.slice(),hiddenTabs:[],systemTheme:!1,mirrorNotificationsEnabled:!0,autoDismissNotifications:!1},this.devices=[],this.smsDevices=[],this.pendingSmsDeviceChange=null,this.onSchemeChange=()=>{if(!this.settings.systemTheme)return;const e=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=e?"dark":"light"}}ensureThemeListener(){if(!this.settings.systemTheme){this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0);return}this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange))}async init(){await this.loadSettings(),await this.loadDevices(),await this.loadSmsDevices(),this.render(),this.setupEventListeners(),this.ensureThemeListener(),document.documentElement.dataset.theme=this.settings.systemTheme&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}async loadSettings(){try{const e=await chrome.storage.local.get(["pb_settings"]);e.pb_settings?this.settings={...this.settings,...e.pb_settings}:await chrome.storage.local.set({pb_settings:this.settings}),e.pb_settings?.autoOpenPushLinksAsTab!==void 0?this.settings.autoOpenPushLinksAsTab=e.pb_settings.autoOpenPushLinksAsTab:await chrome.storage.local.set({pb_settings:{...this.settings,autoOpenPushLinksAsTab:this.settings.autoOpenPushLinksAsTab}});const n=await chrome.storage.local.get("defaultSmsDevice");n.defaultSmsDevice&&(this.settings.defaultSmsDevice=n.defaultSmsDevice);const s=e.pb_settings?.optionOrder??this.settings.optionOrder,l=e.pb_settings?.hiddenTabs??this.settings.hiddenTabs??[],v=O(s),f=$(l),b=JSON.stringify(s)!==JSON.stringify(v),y=JSON.stringify(l)!==JSON.stringify(f);this.settings.optionOrder=v,this.settings.hiddenTabs=f,(b||y)&&await this.saveSettings()}catch(e){console.error("Failed to load settings:",e)}}async setOptionOrder(e){this.settings.optionOrder=O(e),await this.saveSettings()}async loadDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"getDevices"});e.ok&&(this.devices=e.devices||[])}catch(e){console.error("Failed to load devices:",e)}}async loadSmsDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CAPABLE_DEVICES"});e.success&&(this.smsDevices=e.devices||[])}catch(e){console.error("Failed to load SMS devices:",e)}}getDeviceDisplayName(e){return e.nickname?e.nickname:e.manufacturer&&e.model?`${e.manufacturer} ${e.model}`:e.model?e.model:"Unknown Device"}async saveSettings(){try{await chrome.storage.local.set({pb_settings:this.settings}),this.settings.systemTheme?this.themeMql||(this.themeMql=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMql.addEventListener?this.themeMql.addEventListener("change",this.onSchemeChange):this.themeMql.addListener(this.onSchemeChange)):this.themeMql&&(this.themeMql.removeEventListener?this.themeMql.removeEventListener("change",this.onSchemeChange):this.themeMql.removeListener(this.onSchemeChange),this.themeMql=void 0),this.ensureThemeListener();const e=this.settings.systemTheme?window.matchMedia("(prefers-color-scheme: dark)").matches:!1;document.documentElement.dataset.theme=e?"dark":"light",this.showMessage("Settings saved successfully!","success")}catch(e){console.error("Failed to save settings:",e),this.showMessage("Failed to save settings","error")}}async updateSmsDevice(){if(this.pendingSmsDeviceChange)try{const e=document.getElementById("update-sms-device");e&&(e.disabled=!0,e.textContent="Updating...");const n=await chrome.runtime.sendMessage({cmd:"SET_DEFAULT_SMS_DEVICE",deviceIden:this.pendingSmsDeviceChange});n.success?(this.settings.defaultSmsDevice=this.pendingSmsDeviceChange,this.pendingSmsDeviceChange=null,await chrome.storage.local.set({defaultSmsDevice:this.settings.defaultSmsDevice}),this.showMessage("SMS device updated successfully!","success"),this.render(),this.setupEventListeners()):this.showMessage(`Failed to update SMS device: ${n.error}`,"error")}catch(e){console.error("Failed to update SMS device:",e),this.showMessage("Failed to update SMS device","error")}finally{const e=document.getElementById("update-sms-device");e&&(e.disabled=!1,e.textContent="Update")}}async testWebSocket(){try{const e=await chrome.runtime.sendMessage({cmd:"testWebSocket"});e.ok?this.showMessage(`WebSocket test successful! Last heartbeat: ${e.lastHeartbeat}`,"success"):this.showMessage(`WebSocket test failed: ${e.error}`,"error")}catch{this.showMessage("WebSocket test failed","error")}}async exportDebugLog(){try{const e=await chrome.runtime.sendMessage({cmd:"getDebugLog"});if(e.ok){const n=new Blob([e.log],{type:"text/plain"}),s=URL.createObjectURL(n),l=document.createElement("a");l.href=s,l.download=`pushbridge-debug-${new Date().toISOString().split("T")[0]}.log`,l.click(),URL.revokeObjectURL(s),this.showMessage("Debug log exported successfully!","success")}else this.showMessage("Failed to export debug log","error")}catch{this.showMessage("Failed to export debug log","error")}}showMessage(e,n){const s=document.getElementById("message");s&&(s.textContent=e,s.className=`message ${n}`,s.style.display="block",setTimeout(()=>{s.style.display="none"},3e3))}setupEventListeners(){const e=document.getElementById("sound-toggle");e&&(e.checked=this.settings.soundEnabled,e.addEventListener("change",a=>{this.settings.soundEnabled=a.target.checked,this.saveSettings()}));const n=document.getElementById("notifications-toggle");n&&(n.checked=this.settings.notificationsEnabled,n.addEventListener("change",a=>{this.settings.notificationsEnabled=a.target.checked,this.saveSettings()}));for(const[a,r]of[["mirror-notifications-toggle","mirrorNotificationsEnabled"],["auto-dismiss-toggle","autoDismissNotifications"]]){const h=document.getElementById(a);h&&(h.checked=this.settings[r],h.addEventListener("change",()=>{this.settings[r]=h.checked,this.saveSettings()}))}const s=document.getElementById("option-order");if(s){const a=()=>{const i=this.settings.optionOrder.filter(t=>t!=="SMS/MMS"||this.smsDevices.length>0);s.innerHTML=i.map((t,o)=>{const c=this.settings.hiddenTabs?.includes(t);return`
              <li draggable="true" data-key="${t}" class="dnd-item">
                <span class="handle" aria-hidden="true">⋮⋮</span>
                <span class="label">${t}</span>
                <span class="dnd-actions">
                  <button type="button" class="move-tab" data-key="${t}" data-direction="-1"
                          aria-label="Move ${t} up" ${o===0?"disabled":""}>↑</button>
                  <button type="button" class="move-tab" data-key="${t}" data-direction="1"
                          aria-label="Move ${t} down" ${o===i.length-1?"disabled":""}>↓</button>
                <button type="button"
                        class="toggle-visibility"
                        data-key="${t}"
                        aria-label="${c?"Show":"Hide"} ${t}"
                        data-state="${c?"show":"hide"}">
                  ${c?"Show":"Hide"}
                </button>
                </span>
              </li>
            `}).join("")};a();const r=i=>(this.settings.optionOrder.forEach((t,o)=>{i.includes(t)||i.splice(o,0,t)}),i),h=()=>Array.from(s.querySelectorAll("li")).map(i=>i.getAttribute("data-key"));s.addEventListener("click",async i=>{const t=i.target.closest(".move-tab");if(!t)return;const o=t.dataset.key,c=Number(t.dataset.direction),d=h(),m=d.indexOf(o);d.splice(m,1),d.splice(m+c,0,o),await this.setOptionOrder(r(d)),a();const g=`.move-tab[data-key="${o}"]`;(s.querySelector(`${g}[data-direction="${c}"]:not([disabled])`)??s.querySelector(`${g}:not([disabled])`))?.focus()}),s.addEventListener("click",async i=>{const t=i.target.closest(".toggle-visibility");if(!t)return;i.preventDefault();const o=t.dataset.key;if(!o)return;this.settings.hiddenTabs=Array.isArray(this.settings.hiddenTabs)?this.settings.hiddenTabs:[];const c=new Set(this.settings.hiddenTabs),d=c.has(o),m=w.filter(g=>g==="SMS/MMS"?this.smsDevices.length>0:!0);if(d)c.delete(o);else{if(m.filter(S=>!c.has(S)).length<=1){this.showMessage("At least one tab must remain visible.","error");return}c.add(o)}this.settings.hiddenTabs=Array.from(c),await this.saveSettings(),a()});let u=null;s.addEventListener("dragstart",i=>{if(i.target.closest(".dnd-actions")){i.preventDefault();return}const t=i.target?.closest("li");t&&(u=t,t.classList.add("dragging"),i.dataTransfer?.setData("text/plain",t.dataset.key||""),i.dataTransfer?.setDragImage(t,10,10))}),s.addEventListener("dragover",i=>{i.preventDefault();const t=A(s,i.clientY);u&&(t?s.insertBefore(u,t):s.appendChild(u))}),s.addEventListener("dragend",async()=>{u&&u.classList.remove("dragging"),u=null,await this.setOptionOrder(r(h())),a()});const A=(i,t)=>{const o=Array.from(i.querySelectorAll("li:not(.dragging)"));let c=Number.NEGATIVE_INFINITY,d=null;for(const m of o){const g=m.getBoundingClientRect(),S=t-g.top-g.height/2;S<0&&S>c&&(c=S,d=m)}return d}}const l=document.getElementById("system-theme-toggle");l&&(l.checked=!!this.settings.systemTheme,l.addEventListener("change",a=>{this.settings.systemTheme=a.target.checked,this.saveSettings()}));const v=document.getElementById("auto-reconnect-toggle");v&&(v.checked=this.settings.autoReconnect,v.addEventListener("change",a=>{this.settings.autoReconnect=a.target.checked,this.saveSettings()}));const f=document.getElementById("auto-open-links-toggle");f&&(f.checked=this.settings.autoOpenPushLinksAsTab,f.addEventListener("change",a=>{this.settings.autoOpenPushLinksAsTab=a.target.checked,this.saveSettings()}));const b=document.getElementById("default-device");b&&(b.value=this.settings.defaultDevice,b.addEventListener("change",a=>{this.settings.defaultDevice=a.target.value,this.saveSettings()}));const y=document.getElementById("default-sms-device");y&&(y.value=this.settings.defaultSmsDevice,y.addEventListener("change",a=>{const r=a.target.value;this.pendingSmsDeviceChange=r!==this.settings.defaultSmsDevice?r:null,this.updateSmsDeviceButtonState()}));const E=document.getElementById("test-websocket");E&&E.addEventListener("click",()=>this.testWebSocket());const k=document.getElementById("export-log");k&&k.addEventListener("click",()=>this.exportDebugLog());const M=document.getElementById("reset-settings");M&&M.addEventListener("click",()=>this.resetSettings());const L=document.getElementById("reset-all-data");L&&L.addEventListener("click",()=>this.resetAllData());const T=document.getElementById("update-sms-device");T&&T.addEventListener("click",()=>this.updateSmsDevice())}updateSmsDeviceButtonState(){const e=document.getElementById("update-sms-device");e&&(e.disabled=!this.pendingSmsDeviceChange,e.textContent=(this.pendingSmsDeviceChange,"Update SMS Device"))}async resetSettings(){confirm("Are you sure you want to reset all settings to defaults?")&&(this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:w.slice(),hiddenTabs:[],systemTheme:!1,mirrorNotificationsEnabled:!0,autoDismissNotifications:!1},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners())}async resetAllData(){if(confirm("Are you sure you want to reset ALL data? This will clear all cached data, cursors, and settings. You will need to re-authenticate."))try{if((await chrome.runtime.sendMessage({cmd:"clearAllData"}))?.restarting)return;this.showMessage("All data cleared successfully. Please refresh the page.","success"),this.settings={soundEnabled:!0,defaultDevice:"all",notificationsEnabled:!0,autoReconnect:!0,defaultSmsDevice:"",autoOpenPushLinksAsTab:!1,optionOrder:w.slice(),hiddenTabs:[],systemTheme:!1,mirrorNotificationsEnabled:!0,autoDismissNotifications:!1},this.pendingSmsDeviceChange=null,await this.saveSettings(),await chrome.storage.local.set({defaultSmsDevice:""}),this.render(),this.setupEventListeners()}catch(e){console.error("Failed to reset all data:",e),this.showMessage("Failed to reset all data. Please try again.","error")}}render(){const e=document.querySelector(".container");e&&(e.innerHTML=`
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

        <div class="setting-item">
          <div class="setting-info">
            <label for="mirror-notifications-toggle">Show mirrored notifications</label>
            <p>Show desktop notifications for notifications mirrored from your phone. They still appear in the popup when this is off</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="mirror-notifications-toggle" class="toggle">
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="auto-dismiss-toggle">Auto-dismiss notifications</label>
            <p>Let notifications disappear after a few seconds instead of staying until you close them</p>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="auto-dismiss-toggle" class="toggle">
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
              ${this.devices.map(n=>`<option value="${p(n.iden)}">${p(this.getDeviceDisplayName(n))} (${p(n.type??n.icon??"device")})</option>`).join("")}
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
              ${this.smsDevices.map(n=>`<option value="${p(n.iden)}">${p(this.getDeviceDisplayName(n))} (${p(n.type??n.icon??"device")})</option>`).join("")}
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
        <p>Pushbridge v${chrome.runtime.getManifest().version} · <a href="https://github.com/manish001in/pushbridge" target="_blank">GitHub</a> · <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a></p>
        <p class="disclaimer">This is an unofficial extension and is not affiliated with Pushbullet Inc.</p>
      </div>
    `)}}document.addEventListener("DOMContentLoaded",async()=>{await C(),new B().init()});
