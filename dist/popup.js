import{g as Ce,o as ze,e as ve}from"./notificationBadge.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Y=globalThis,ie=Y.ShadowRoot&&(Y.ShadyCSS===void 0||Y.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,oe=Symbol(),de=new WeakMap;let ye=class{constructor(t,s,i){if(this._$cssResult$=!0,i!==oe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=s}get styleSheet(){let t=this.o;const s=this.t;if(ie&&t===void 0){const i=s!==void 0&&s.length===1;i&&(t=de.get(s)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&de.set(s,t))}return t}toString(){return this.cssText}};const Te=e=>new ye(typeof e=="string"?e:e+"",void 0,oe),T=(e,...t)=>{const s=e.length===1?e[0]:t.reduce((i,o,r)=>i+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+e[r+1],e[0]);return new ye(s,e,oe)},Pe=(e,t)=>{if(ie)e.adoptedStyleSheets=t.map(s=>s instanceof CSSStyleSheet?s:s.styleSheet);else for(const s of t){const i=document.createElement("style"),o=Y.litNonce;o!==void 0&&i.setAttribute("nonce",o),i.textContent=s.cssText,e.appendChild(i)}},ce=ie?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let s="";for(const i of t.cssRules)s+=i.cssText;return Te(s)})(e):e;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Ae,defineProperty:Ee,getOwnPropertyDescriptor:Fe,getOwnPropertyNames:Le,getOwnPropertySymbols:Ie,getPrototypeOf:Re}=Object,X=globalThis,pe=X.trustedTypes,De=pe?pe.emptyScript:"",Oe=X.reactiveElementPolyfillSupport,j=(e,t)=>e,Z={toAttribute(e,t){switch(t){case Boolean:e=e?De:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let s=e;switch(t){case Boolean:s=e!==null;break;case Number:s=e===null?null:Number(e);break;case Object:case Array:try{s=JSON.parse(e)}catch{s=null}}return s}},re=(e,t)=>!Ae(e,t),he={attribute:!0,type:String,converter:Z,reflect:!1,useDefault:!1,hasChanged:re};Symbol.metadata??=Symbol("metadata"),X.litPropertyMetadata??=new WeakMap;let R=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=he){if(s.state&&(s.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=!0),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(t,i,s);o!==void 0&&Ee(this.prototype,t,o)}}static getPropertyDescriptor(t,s,i){const{get:o,set:r}=Fe(this.prototype,t)??{get(){return this[s]},set(n){this[s]=n}};return{get:o,set(n){const c=o?.call(this);r?.call(this,n),this.requestUpdate(t,c,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??he}static _$Ei(){if(this.hasOwnProperty(j("elementProperties")))return;const t=Re(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(j("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(j("properties"))){const s=this.properties,i=[...Le(s),...Ie(s)];for(const o of i)this.createProperty(o,s[o])}const t=this[Symbol.metadata];if(t!==null){const s=litPropertyMetadata.get(t);if(s!==void 0)for(const[i,o]of s)this.elementProperties.set(i,o)}this._$Eh=new Map;for(const[s,i]of this.elementProperties){const o=this._$Eu(s,i);o!==void 0&&this._$Eh.set(o,s)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const s=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const o of i)s.unshift(ce(o))}else t!==void 0&&s.push(ce(t));return s}static _$Eu(t,s){const i=s.attribute;return i===!1?void 0:typeof i=="string"?i:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Pe(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,s,i){this._$AK(t,i)}_$ET(t,s){const i=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,i);if(o!==void 0&&i.reflect===!0){const r=(i.converter?.toAttribute!==void 0?i.converter:Z).toAttribute(s,i.type);this._$Em=t,r==null?this.removeAttribute(o):this.setAttribute(o,r),this._$Em=null}}_$AK(t,s){const i=this.constructor,o=i._$Eh.get(t);if(o!==void 0&&this._$Em!==o){const r=i.getPropertyOptions(o),n=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:Z;this._$Em=o;const c=n.fromAttribute(s,r.type);this[o]=c??this._$Ej?.get(o)??c,this._$Em=null}}requestUpdate(t,s,i){if(t!==void 0){const o=this.constructor,r=this[t];if(i??=o.getPropertyOptions(t),!((i.hasChanged??re)(r,s)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,i))))return;this.C(t,s,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,s,{useDefault:i,reflect:o,wrapped:r},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??s??this[t]),r!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),o===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(s){Promise.reject(s)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[o,r]of this._$Ep)this[o]=r;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[o,r]of i){const{wrapped:n}=r,c=this[o];n!==!0||this._$AL.has(o)||c===void 0||this.C(o,void 0,r,c)}}let t=!1;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(s)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(s)}willUpdate(t){}_$AE(t){this._$EO?.forEach(s=>s.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(s=>this._$ET(s,this[s])),this._$EM()}updated(t){}firstUpdated(t){}};R.elementStyles=[],R.shadowRootOptions={mode:"open"},R[j("elementProperties")]=new Map,R[j("finalized")]=new Map,Oe?.({ReactiveElement:R}),(X.reactiveElementVersions??=[]).push("2.1.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ne=globalThis,J=ne.trustedTypes,ue=J?J.createPolicy("lit-html",{createHTML:e=>e}):void 0,we="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,$e="?"+C,Ne=`<${$e}>`,F=document,B=()=>F.createComment(""),V=e=>e===null||typeof e!="object"&&typeof e!="function",ae=Array.isArray,Ue=e=>ae(e)||typeof e?.[Symbol.iterator]=="function",se=`[ 	
\f\r]`,H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ge=/-->/g,fe=/>/g,A=RegExp(`>|${se}(?:([^\\s"'>=/]+)(${se}*=${se}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),me=/'/g,be=/"/g,Se=/^(?:script|style|textarea|title)$/i,He=e=>(t,...s)=>({_$litType$:e,strings:t,values:s}),a=He(1),D=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),xe=new WeakMap,E=F.createTreeWalker(F,129);function _e(e,t){if(!ae(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return ue!==void 0?ue.createHTML(t):t}const je=(e,t)=>{const s=e.length-1,i=[];let o,r=t===2?"<svg>":t===3?"<math>":"",n=H;for(let c=0;c<s;c++){const d=e[c];let h,f,p=-1,_=0;for(;_<d.length&&(n.lastIndex=_,f=n.exec(d),f!==null);)_=n.lastIndex,n===H?f[1]==="!--"?n=ge:f[1]!==void 0?n=fe:f[2]!==void 0?(Se.test(f[2])&&(o=RegExp("</"+f[2],"g")),n=A):f[3]!==void 0&&(n=A):n===A?f[0]===">"?(n=o??H,p=-1):f[1]===void 0?p=-2:(p=n.lastIndex-f[2].length,h=f[1],n=f[3]===void 0?A:f[3]==='"'?be:me):n===be||n===me?n=A:n===ge||n===fe?n=H:(n=A,o=void 0);const M=n===A&&e[c+1].startsWith("/>")?" ":"";r+=n===H?d+Ne:p>=0?(i.push(h),d.slice(0,p)+we+d.slice(p)+C+M):d+C+(p===-2?c:M)}return[_e(e,r+(e[s]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),i]};class q{constructor({strings:t,_$litType$:s},i){let o;this.parts=[];let r=0,n=0;const c=t.length-1,d=this.parts,[h,f]=je(t,s);if(this.el=q.createElement(h,i),E.currentNode=this.el.content,s===2||s===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(o=E.nextNode())!==null&&d.length<c;){if(o.nodeType===1){if(o.hasAttributes())for(const p of o.getAttributeNames())if(p.endsWith(we)){const _=f[n++],M=o.getAttribute(p).split(C),Q=/([.?@])?(.*)/.exec(_);d.push({type:1,index:r,name:Q[2],strings:M,ctor:Q[1]==="."?Ve:Q[1]==="?"?qe:Q[1]==="@"?We:ee}),o.removeAttribute(p)}else p.startsWith(C)&&(d.push({type:6,index:r}),o.removeAttribute(p));if(Se.test(o.tagName)){const p=o.textContent.split(C),_=p.length-1;if(_>0){o.textContent=J?J.emptyScript:"";for(let M=0;M<_;M++)o.append(p[M],B()),E.nextNode(),d.push({type:2,index:++r});o.append(p[_],B())}}}else if(o.nodeType===8)if(o.data===$e)d.push({type:2,index:r});else{let p=-1;for(;(p=o.data.indexOf(C,p+1))!==-1;)d.push({type:7,index:r}),p+=C.length-1}r++}}static createElement(t,s){const i=F.createElement("template");return i.innerHTML=t,i}}function O(e,t,s=e,i){if(t===D)return t;let o=i!==void 0?s._$Co?.[i]:s._$Cl;const r=V(t)?void 0:t._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),r===void 0?o=void 0:(o=new r(e),o._$AT(e,s,i)),i!==void 0?(s._$Co??=[])[i]=o:s._$Cl=o),o!==void 0&&(t=O(e,o._$AS(e,t.values),o,i)),t}class Be{constructor(t,s){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:s},parts:i}=this._$AD,o=(t?.creationScope??F).importNode(s,!0);E.currentNode=o;let r=E.nextNode(),n=0,c=0,d=i[0];for(;d!==void 0;){if(n===d.index){let h;d.type===2?h=new W(r,r.nextSibling,this,t):d.type===1?h=new d.ctor(r,d.name,d.strings,this,t):d.type===6&&(h=new Ge(r,this,t)),this._$AV.push(h),d=i[++c]}n!==d?.index&&(r=E.nextNode(),n++)}return E.currentNode=F,o}p(t){let s=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(t,i,s),s+=i.strings.length-2):i._$AI(t[s])),s++}}class W{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,s,i,o){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=s,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const s=this._$AM;return s!==void 0&&t?.nodeType===11&&(t=s.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,s=this){t=O(this,t,s),V(t)?t===u||t==null||t===""?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==D&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Ue(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==u&&V(this._$AH)?this._$AA.nextSibling.data=t:this.T(F.createTextNode(t)),this._$AH=t}$(t){const{values:s,_$litType$:i}=t,o=typeof i=="number"?this._$AC(t):(i.el===void 0&&(i.el=q.createElement(_e(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(s);else{const r=new Be(o,this),n=r.u(this.options);r.p(s),this.T(n),this._$AH=r}}_$AC(t){let s=xe.get(t.strings);return s===void 0&&xe.set(t.strings,s=new q(t)),s}k(t){ae(this._$AH)||(this._$AH=[],this._$AR());const s=this._$AH;let i,o=0;for(const r of t)o===s.length?s.push(i=new W(this.O(B()),this.O(B()),this,this.options)):i=s[o],i._$AI(r),o++;o<s.length&&(this._$AR(i&&i._$AB.nextSibling,o),s.length=o)}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(!1,!0,s);t!==this._$AB;){const i=t.nextSibling;t.remove(),t=i}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,s,i,o,r){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=s,this._$AM=o,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=u}_$AI(t,s=this,i,o){const r=this.strings;let n=!1;if(r===void 0)t=O(this,t,s,0),n=!V(t)||t!==this._$AH&&t!==D,n&&(this._$AH=t);else{const c=t;let d,h;for(t=r[0],d=0;d<r.length-1;d++)h=O(this,c[i+d],s,d),h===D&&(h=this._$AH[d]),n||=!V(h)||h!==this._$AH[d],h===u?t=u:t!==u&&(t+=(h??"")+r[d+1]),this._$AH[d]=h}n&&!o&&this.j(t)}j(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Ve extends ee{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===u?void 0:t}}class qe extends ee{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==u)}}class We extends ee{constructor(t,s,i,o,r){super(t,s,i,o,r),this.type=5}_$AI(t,s=this){if((t=O(this,t,s,0)??u)===D)return;const i=this._$AH,o=t===u&&i!==u||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==u&&(i===u||o);o&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Ge{constructor(t,s,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=s,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){O(this,t)}}const Ke=ne.litHtmlPolyfillSupport;Ke?.(q,W),(ne.litHtmlVersions??=[]).push("3.3.1");const Qe=(e,t,s)=>{const i=s?.renderBefore??t;let o=i._$litPart$;if(o===void 0){const r=s?.renderBefore??null;i._$litPart$=o=new W(t.insertBefore(B(),r),r,void 0,s??{})}return o._$AI(e),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const le=globalThis;class v extends R{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const s=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Qe(s,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return D}}v._$litElement$=!0,v.finalized=!0,le.litElementHydrateSupport?.({LitElement:v});const Ye=le.litElementPolyfillSupport;Ye?.({LitElement:v});(le.litElementVersions??=[]).push("4.2.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const P=e=>(t,s)=>{s!==void 0?s.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ze={attribute:!0,type:String,converter:Z,reflect:!1,hasChanged:re},Je=(e=Ze,t,s)=>{const{kind:i,metadata:o}=s;let r=globalThis.litPropertyMetadata.get(o);if(r===void 0&&globalThis.litPropertyMetadata.set(o,r=new Map),i==="setter"&&((e=Object.create(e)).wrapped=!0),r.set(s.name,e),i==="accessor"){const{name:n}=s;return{set(c){const d=t.get.call(this);t.set.call(this,c),this.requestUpdate(n,d,e)},init(c){return c!==void 0&&this.C(n,void 0,e,c),c}}}if(i==="setter"){const{name:n}=s;return function(c){const d=this[n];t.call(this,c),this.requestUpdate(n,d,e)}}throw Error("Unsupported decorator location: "+i)};function S(e){return(t,s)=>typeof s=="object"?Je(e,t,s):((i,o,r)=>{const n=o.hasOwnProperty(r);return o.constructor.createProperty(r,i),n?Object.getOwnPropertyDescriptor(o,r):void 0})(e,t,s)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function l(e){return S({...e,state:!0,attribute:!1})}var Xe=Object.defineProperty,et=Object.getOwnPropertyDescriptor,G=(e,t,s,i)=>{for(var o=i>1?void 0:i?et(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&Xe(t,s,o),o};let L=class extends v{constructor(){super(...arguments),this.token="",this.isVerifying=!1,this.errorMessage="",this.isSuccess=!1}render(){return this.isSuccess?a`
        <div class="container">
          <div class="success-message">
            ✅ Token verified successfully! Loading your data...
            <div class="loading" style="margin-top: 12px;"></div>
          </div>
        </div>
      `:a`
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
              class="input ${this.errorMessage?"error":""}"
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

          ${this.errorMessage?a` <div class="error-message">${this.errorMessage}</div> `:""}

          <button
            type="submit"
            class="button"
            ?disabled=${!this.token.trim()||this.isVerifying}
          >
            ${this.isVerifying?a`
                  <span class="loading"></span>
                  Verifying...
                `:"Save & Verify"}
          </button>
        </form>
      </div>
    `}handleTokenInput(e){const t=e.target;this.token=t.value,this.errorMessage=""}async handleSubmit(e){if(e.preventDefault(),!!this.token.trim()){this.isVerifying=!0,this.errorMessage="";try{const t=await chrome.runtime.sendMessage({cmd:"verifyToken",token:this.token.trim()});t.ok?(this.isSuccess=!0,setTimeout(()=>{this.dispatchEvent(new CustomEvent("token-verified",{detail:{token:this.token.trim()}}))},1500)):this.errorMessage=t.error||"Token verification failed. Please check your token and try again."}catch(t){console.error("Token verification error:",t),this.errorMessage="Failed to verify token. Please check your internet connection and try again."}finally{this.isVerifying=!1}}}};L.styles=T`
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
  `;G([S({type:String})],L.prototype,"token",2);G([l()],L.prototype,"isVerifying",2);G([l()],L.prototype,"errorMessage",2);G([l()],L.prototype,"isSuccess",2);L=G([P("pb-token-setup")],L);var tt=Object.defineProperty,st=Object.getOwnPropertyDescriptor,y=(e,t,s,i)=>{for(var o=i>1?void 0:i?st(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&tt(t,s,o),o};let b=class extends v{constructor(){super(...arguments),this.defaultUrl="",this.pushTitle="",this.body="",this.sendTo="all",this.sendTargets=[],this.selectedFile=null,this.isLoading=!1,this.isSending=!1,this.errorMessage="",this.successMessage="",this.messageTimeout=null}connectedCallback(){super.connectedCallback(),this.loadSendTargets(),this.defaultUrl&&(this.body=this.defaultUrl)}determinePushType(e,t){if(t)return"file";const s=e.trim();if(!s)return"note";const i=/https?:\/\/[^\s]+/g,o=s.match(i);return o?.length===1&&s===o[0]?"link":"note"}async loadSendTargets(){try{const[e,t,s]=await Promise.all([chrome.runtime.sendMessage({cmd:"getDevices"}),chrome.runtime.sendMessage({cmd:"GET_OWNED_CHANNELS"}),chrome.runtime.sendMessage({cmd:"getContacts"})]),i=e.ok?e.devices:[],o=t.success?t.ownedChannels:[],r=s.ok?s.contacts:[];console.log("Loaded devices:",i.length,"channels:",o.length,"contacts:",r.length),this.sendTargets=[...i.map(n=>({id:n.iden,name:n.nickname,type:"device",icon:this.getDeviceIcon(n.type)})),...r.map(n=>({id:n.email,name:n.name,type:"contact",icon:"👤"})),...o.map(n=>({id:n.tag,name:n.name,type:"channel",icon:"📢"}))],console.log("Total send targets:",this.sendTargets.length)}catch(e){console.error("Failed to load send targets:",e)}}getDeviceIcon(e){switch(e){case"android":return"📱";case"ios":return"📱";case"chrome":return"💻";case"firefox":return"🦊";case"windows":return"🖥️";case"mac":return"🖥️";default:return"📱"}}handleInputChange(e){const t=e.target,s=t.name;s==="title"?this.pushTitle=t.value:s==="body"&&(this.body=t.value)}clearMessages(){this.errorMessage="",this.successMessage="",this.messageTimeout&&(clearTimeout(this.messageTimeout),this.messageTimeout=null)}setMessageWithTimeout(e,t=!1){console.log("Setting message:",e,"isError:",t),this.messageTimeout&&clearTimeout(this.messageTimeout),t?(this.errorMessage=e,this.successMessage=""):(this.successMessage=e,this.errorMessage=""),console.log("Message set - errorMessage:",this.errorMessage,"successMessage:",this.successMessage),this.messageTimeout=window.setTimeout(()=>{console.log("Clearing message after timeout"),this.clearMessages()},1e4)}validateForm(){return!this.pushTitle.trim()&&!this.body.trim()&&!this.selectedFile?(this.setMessageWithTimeout("Please provide a title, message, or file",!0),!1):!0}handleFileSelect(e){const t=e.target;t.files&&t.files[0]?this.selectedFile=t.files[0]:this.selectedFile=null}handleSendToChange(e){const t=e.target;this.sendTo=t.value}async handleSend(){if(this.validateForm()){this.isSending=!0,this.clearMessages();try{const e=this.determinePushType(this.body,this.selectedFile||void 0),t=this.sendTargets.find(o=>o.id===this.sendTo);if(!t&&this.sendTo!=="all"){this.setMessageWithTimeout("Please select a valid send target",!0),this.isSending=!1;return}let s={type:e,title:this.pushTitle.trim()||void 0,body:this.body.trim()||void 0};if(e==="link"&&(s.url=this.body.trim()),t?.type==="channel"?s.channel_tag=t.id:t?.type==="contact"?s.email=t.id:this.sendTo!=="all"&&(s.targetDeviceIden=t?.id),this.selectedFile&&e==="file"){const o=await this.selectedFile.arrayBuffer(),r={name:this.selectedFile.name,type:this.selectedFile.type,size:this.selectedFile.size,lastModified:this.selectedFile.lastModified,buffer:Array.from(new Uint8Array(o))},n=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE",payload:{fileData:r,targetDeviceIden:t?.type==="device"?t.id:void 0,email:t?.type==="contact"?t.id:void 0,title:this.pushTitle.trim()||void 0,body:this.body.trim()||void 0,channel_tag:t?.type==="channel"?t.id:void 0}});n.success?(this.setMessageWithTimeout("File sent successfully!"),this.resetForm()):this.setMessageWithTimeout(n.error||"Failed to send file",!0),this.isSending=!1;return}const i=await chrome.runtime.sendMessage({cmd:"createPush",payload:s});i.ok?(this.setMessageWithTimeout("Push sent successfully!"),this.resetForm()):this.setMessageWithTimeout(i.error||"Failed to send push",!0)}catch(e){console.error("Failed to send push:",e),this.setMessageWithTimeout("Failed to send push. Please try again.",!0)}finally{this.isSending=!1}}}resetForm(){this.pushTitle="",this.body="",this.selectedFile=null;const e=this.shadowRoot?.querySelector("#file-input");e&&(e.value="")}handleKeyDown(e){(e.ctrlKey||e.metaKey)&&e.key==="Enter"&&(e.preventDefault(),this.handleSend())}render(){return console.log("Rendering - errorMessage:",this.errorMessage,"successMessage:",this.successMessage),a`
      <div class="composer-container" @keydown=${this.handleKeyDown}>
        ${this.errorMessage?a` <div class="message error">${this.errorMessage}</div> `:""}
        ${this.successMessage?a` <div class="message success">${this.successMessage}</div> `:""}

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
            ${this.sendTargets.map(e=>a`
                <option value=${e.id}>
                  ${e.icon} ${e.name}
                  ${e.type==="channel"?"(Channel)":""}
                </option>
              `)}
          </select>
        </div>

        <!-- File Input (always visible) -->
        <div class="form-group">
          <label for="file-input">File (optional):</label>
          <input id="file-input" type="file" @change=${this.handleFileSelect} />
          ${this.selectedFile?a`
                <small class="form-text">
                  Selected: ${this.selectedFile.name}
                  (${(this.selectedFile.size/1024/1024).toFixed(2)} MB)
                </small>
              `:""}
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
          ?disabled=${this.isSending||this.isLoading}
        >
          ${this.isSending?a` <span class="loading"></span> `:""}
          ${this.isSending?"Sending...":"Send Push"}
        </button>

        <div class="shortcut-hint">Press Ctrl+Enter to send quickly</div>
      </div>
    `}};b.styles=T`
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
  `;y([S({type:String})],b.prototype,"defaultUrl",2);y([l()],b.prototype,"pushTitle",2);y([l()],b.prototype,"body",2);y([l()],b.prototype,"sendTo",2);y([l()],b.prototype,"sendTargets",2);y([l()],b.prototype,"selectedFile",2);y([l()],b.prototype,"isLoading",2);y([l()],b.prototype,"isSending",2);y([l()],b.prototype,"errorMessage",2);y([l()],b.prototype,"successMessage",2);y([l()],b.prototype,"messageTimeout",2);b=y([P("pb-composer")],b);var it=Object.defineProperty,ot=Object.getOwnPropertyDescriptor,k=(e,t,s,i)=>{for(var o=i>1?void 0:i?ot(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&it(t,s,o),o};let w=class extends v{constructor(){super(...arguments),this.pushes=[],this.isLoading=!1,this.errorMessage="",this.hasMore=!1,this.activeSubtab="devices",this.devices=[]}connectedCallback(){super.connectedCallback(),this.loadStoredState(),this.loadDevices(),this.loadPushes(!0),chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))}disconnectedCallback(){super.disconnectedCallback(),chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this))}async loadStoredState(){try{const e=await chrome.storage.local.get("pb_recent_pushes_state");if(e.pb_recent_pushes_state){const t=e.pb_recent_pushes_state;this.pushes=t.pushes||[],this.cursor=t.cursor,this.hasMore=t.hasMore||!1,this.lastModified=t.lastModified,this.activeSubtab=t.activeSubtab||"devices",console.log("🔄 [RecentPushes] Restored state:",{pushesCount:this.pushes.length,cursor:this.cursor,hasMore:this.hasMore,activeSubtab:this.activeSubtab})}}catch(e){console.error("Failed to load stored state:",e)}}async saveState(){try{const e={pushes:this.pushes,cursor:this.cursor,hasMore:this.hasMore,lastModified:this.lastModified,activeSubtab:this.activeSubtab};await chrome.storage.local.set({pb_recent_pushes_state:e})}catch(e){console.error("Failed to save state:",e)}}async loadDevices(){try{const e=await chrome.runtime.sendMessage({cmd:"getDevices"});e.ok&&(this.devices=e.devices||[]);const t=await chrome.storage.local.get("pb_device_iden");this.currentDeviceIden=t.pb_device_iden,console.log("🔄 [RecentPushes] Current device ID:",this.currentDeviceIden)}catch(e){console.error("Failed to load devices:",e)}}async loadPushes(e=!1){if(console.log("🔄 [RecentPushes] loadPushes called with refresh:",e),this.isLoading){console.log("⚠️ [RecentPushes] Already loading, skipping request");return}console.log("🔄 [RecentPushes] Setting isLoading to true"),this.isLoading=!0,this.errorMessage="";try{const t=e?void 0:this.lastModified;console.log("📋 [RecentPushes] Request params:",{refresh:e,lastModified:t,cursor:e?"undefined":this.cursor,currentPushesCount:this.pushes.length});const s=await chrome.runtime.sendMessage({cmd:"getEnhancedPushHistory",limit:100,modifiedAfter:t,cursor:e?void 0:this.cursor,trigger:{type:"popup_open",timestamp:Date.now()}});if(console.log("📡 [RecentPushes] Response received:",{ok:s.ok,error:s.error,pushesCount:s.history?.pushes?.length||0,hasCursor:!!s.history?.cursor}),s.ok){if(e)console.log("🔄 [RecentPushes] Refreshing pushes list"),this.pushes=s.history.pushes;else{console.log("➕ [RecentPushes] Appending pushes to existing list with deduplication");const i=new Map(this.pushes.map(r=>[r.iden,r])),o=s.history.pushes.filter(r=>!i.has(r.iden));o.length>0?(console.log(`➕ [RecentPushes] Adding ${o.length} new pushes (filtered out ${s.history.pushes.length-o.length} duplicates)`),this.pushes=[...this.pushes,...o]):console.log("ℹ️ [RecentPushes] No new pushes to add (all were duplicates)")}if(this.pushes.sort((i,o)=>o.created-i.created),this.cursor=s.history.cursor,this.hasMore=!!s.history.cursor,s.history.pushes.length>0){const i=Math.max(...s.history.pushes.map(o=>o.modified));this.lastModified=i}await this.saveState(),console.log("✅ [RecentPushes] Successfully updated pushes:",{totalPushes:this.pushes.length,newCursor:this.cursor,hasMore:this.hasMore})}else console.error("❌ [RecentPushes] API returned error:",s.error),this.errorMessage=s.error||"Failed to load pushes"}catch(t){console.error("❌ [RecentPushes] Exception occurred:",t),this.errorMessage="Failed to load pushes"}finally{console.log("🔄 [RecentPushes] Setting isLoading to false"),this.isLoading=!1}}async handleDismiss(e){try{(await chrome.runtime.sendMessage({cmd:"dismissPush",pushIden:e})).ok?(this.pushes=this.pushes.filter(s=>s.iden!==e),await this.saveState()):this.errorMessage="Failed to dismiss push"}catch(t){this.errorMessage="Failed to dismiss push",console.error("Failed to dismiss push:",t)}}async handleDelete(e){try{const t=this.pushes.find(i=>i.iden===e);if(!t){this.errorMessage="Push not found";return}if(!this.isPushOwnedByCurrentDevice(t)){this.errorMessage="Cannot delete - you do not own this push";return}(await chrome.runtime.sendMessage({cmd:"deletePush",pushIden:e})).ok?(this.pushes=this.pushes.filter(i=>i.iden!==e),await this.saveState()):this.errorMessage="Failed to delete push"}catch(t){this.errorMessage="Failed to delete push",console.error("Failed to delete push:",t)}}handleRefresh(){this.loadPushes(!0)}handleLoadMore(){this.loadPushes(!1)}handleSubtabChange(e){this.activeSubtab=e,this.saveState()}handleMessage(e){e.cmd==="syncHistory"&&(e.source==="tickle"||e.source==="background")&&(console.log("🔄 [RecentPushes] Received sync message:",e),this.loadPushes(!0)),e.cmd==="pushCreated"&&(console.log("🔔 [RecentPushes] Received pushCreated message, refreshing pushes."),this.loadPushes(!0))}getFilteredPushes(){return this.activeSubtab==="channels"?this.pushes.filter(e=>e.channel_iden&&!e.receiver_iden):this.pushes.filter(e=>!e.channel_iden)}getDeviceName(e){const t=this.devices.find(s=>s.iden===e);return t?t.nickname:"Unknown Device"}getDeviceType(e){const t=this.devices.find(s=>s.iden===e);return t?t.type:"unknown"}getEmptyStateMessage(){return this.activeSubtab==="channels"?"channel pushes yet":"device pushes yet"}getEmptyStateSubMessage(){return this.activeSubtab==="channels"?"Subscribe to channels to see posts here!":"Send your first push to get started!"}isPushOwnedByCurrentDevice(e){return e.metadata?.is_owned_by_user||!1}getDeviceIcon(e){switch(e){case"android":return"📱";case"ios":return"📱";case"chrome":return"🌐";case"firefox":return"🦊";case"safari":return"🍎";case"opera":return"🔴";case"edge":return"🔵";default:return"💻"}}formatTime(e){const t=e*1e3,i=Date.now()-t,o=Math.floor(i/6e4),r=Math.floor(i/36e5),n=Math.floor(i/864e5);return o<1?"Just now":o<60?`${o}m ago`:r<24?`${r}h ago`:n<7?`${n}d ago`:new Date(t).toLocaleDateString()}getPushIcon(e){switch(e){case"note":return"📝";case"link":return"🔗";case"file":return"📎";case"address":return"📍";case"list":return"📋";default:return"📄"}}getFileIcon(e,t){if(!e&&!t)return"📎";const s=e?.toLowerCase()||"",i=t?.toLowerCase()||"";return s.startsWith("image/")||/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(i)?"🖼️":s.startsWith("video/")||/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(i)?"🎥":s.startsWith("audio/")||/\.(mp3|wav|flac|aac|ogg|m4a)$/.test(i)?"🎵":s.includes("pdf")||i.endsWith(".pdf")?"📄":s.includes("word")||/\.(doc|docx)$/.test(i)?"📝":s.includes("excel")||/\.(xls|xlsx)$/.test(i)||s.includes("powerpoint")||/\.(ppt|pptx)$/.test(i)?"📊":/\.(zip|rar|7z|tar|gz)$/.test(i)?"📦":/\.(js|ts|html|css|json|xml|py|java|cpp|c|h)$/.test(i)?"💻":"📎"}isImageFile(e){if(e.image_url)return!0;if(!e.file_type&&!e.file_name)return!1;const t=e.file_type?.toLowerCase()||"",s=e.file_name?.toLowerCase()||"";return t.startsWith("image/")||/\.(jpg|jpeg|png|gif|bmp|webp)$/.test(s)}handleFileDownload(e){e.file_url&&(chrome?.downloads?chrome.downloads.download({url:e.file_url,filename:e.file_name||"download"}):window.open(e.file_url,"_blank"))}renderFileDisplay(e){return e.type!=="file"?"":a`
      <div class="file-display">
        ${this.isImageFile(e)&&e.image_url?a`
              <div
                class="file-preview"
                @click=${()=>window.open(e.image_url,"_blank")}
              >
                <img
                  src="${e.image_url}"
                  alt="${e.file_name||"Image"}"
                  class="file-thumbnail"
                  loading="lazy"
                />
              </div>
            `:""}

        <div class="file-info">
          <span class="file-icon"
            >${this.getFileIcon(e.file_type,e.file_name)}</span
          >
          <div class="file-details">
            <div class="file-name">${e.file_name||"Unknown File"}</div>
            <div class="file-type">${e.file_type||"Unknown Type"}</div>
          </div>
          ${e.file_url?a`
                <button
                  class="file-download"
                  @click=${()=>this.handleFileDownload(e)}
                  title="Download file"
                >
                  📥 Download
                </button>
              `:""}
        </div>
      </div>
    `}render(){const e=this.getFilteredPushes();return a`
      <div class="pushes-container">
        <div class="pushes-header">
          <h3 class="pushes-title">Recent Pushes</h3>
          <button
            class="refresh-button"
            @click=${this.handleRefresh}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading?a` <span class="loading-spinner"></span> `:""}
            Refresh
          </button>
        </div>

        <div class="subtab-navigation">
          <button
            class="subtab-button ${this.activeSubtab==="devices"?"active":""}"
            @click=${()=>this.handleSubtabChange("devices")}
          >
            Own Devices & Contacts
          </button>
          <button
            class="subtab-button ${this.activeSubtab==="channels"?"active":""}"
            @click=${()=>this.handleSubtabChange("channels")}
          >
            Channels & Subs
          </button>
        </div>

        ${this.errorMessage?a` <div class="error">${this.errorMessage}</div> `:""}

        <div class="content-area">
          <div class="push-list">
            ${e.length===0&&!this.isLoading?a`
                  <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No ${this.getEmptyStateMessage()}</p>
                    <p>${this.getEmptyStateSubMessage()}</p>
                  </div>
                `:""}
            ${e.map(t=>a`
                <div class="push-item">
                  <div class="push-header">
                    <h4 class="push-title">
                      ${t.type==="file"?this.getFileIcon(t.file_type,t.file_name):this.getPushIcon(t.type)}
                      ${t.title||(t.type==="link"?t.url:t.type==="file"?t.file_name||"File":"Untitled")}
                      ${t.sender_name?a`<span style="font-weight: normal; color: #666; font-size: 12px;"> • from ${t.sender_name}</span>`:""}
                    </h4>
                    <div class="push-actions">
                      <button
                        class="action-button dismiss"
                        @click=${()=>this.handleDismiss(t.iden)}
                        title="Dismiss"
                      >
                        ✓
                      </button>
                      ${this.isPushOwnedByCurrentDevice(t)?a`
                            <button
                              class="action-button delete"
                              @click=${()=>this.handleDelete(t.iden)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          `:""}
                    </div>
                  </div>

                  ${t.body?a` <div class="push-body">${t.body}</div> `:""}
                  ${t.url?a`
                        <a href=${t.url} class="push-url" target="_blank">
                          ${t.url}
                        </a>
                      `:""}
                  ${this.renderFileDisplay(t)}

                  <div class="push-meta">
                    <div class="push-info">
                      <span class="push-type">${t.type}</span>
                      ${t.channel_iden?a`<span class="channel-badge"
                            >${t.metadata?.source_channel_name||t.channel_iden}</span
                          >`:""}
                    </div>
                    <span class="push-time"
                      >${this.formatTime(t.created)}</span
                    >
                  </div>

                  <div class="device-info">
                    <span class="device-icon"
                      >${this.getDeviceIcon(this.getDeviceType(t.source_device_iden))}</span
                    >
                    <span
                      >${t.metadata?.display_source||`From: ${this.getDeviceName(t.source_device_iden)}`}</span
                    >
                    ${t.metadata?.ownership_reason?a`<span class="ownership-info"
                          >• ${t.metadata.ownership_reason}</span
                        >`:""}
                  </div>
                </div>
              `)}
            ${this.isLoading?a`
                  <div class="loading">
                    <span class="loading-spinner"></span>
                    Loading pushes...
                  </div>
                `:""}
          </div>
          ${this.hasMore&&!this.isLoading?a`
                <div class="load-more-container">
                  <button class="load-more" @click=${this.handleLoadMore}>
                    <span class="load-more-icon">📄</span>
                    Load More Pushes
                  </button>
                </div>
              `:""}
          ${this.isLoading&&this.hasMore?a`
                <div class="load-more-container">
                  <button class="load-more" disabled>
                    <span class="loading-spinner"></span>
                    Loading More...
                  </button>
                </div>
              `:""}
        </div>
      </div>
    `}};w.styles=T`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
    }

    .pushes-container {
      padding: 16px;
      max-width: 500px;
      height: 100%;
      max-height: 500px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
    }

    .pushes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee;
    }

    .pushes-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-top: 0px;
      margin-bottom: 4px;
    }

    .refresh-button {
      background: none;
      border: none;
      color: #007bff;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .refresh-button:hover {
      background: #f8f9fa;
    }

    .refresh-button:disabled {
      color: #6c757d;
      cursor: not-allowed;
    }

    .subtab-navigation {
      display: flex;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
    }

    .subtab-button {
      background: none;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .subtab-button.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .subtab-button:hover:not(.active) {
      color: #333;
      background: #f8f9fa;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .push-list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      min-height: 0;
      padding-bottom: 8px;
    }

    .push-item {
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 8px;
      background: white;
      transition: box-shadow 0.2s;
    }

    .push-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .push-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .push-title {
      font-weight: 500;
      color: #333;
      margin: 0;
      flex: 1;
      margin-right: 8px;
    }

    .push-actions {
      display: flex;
      gap: 4px;
    }

    .action-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 12px;
      transition: background 0.2s;
    }

    .action-button:hover {
      background: #f8f9fa;
    }

    .action-button.dismiss {
      color: #6c757d;
    }

    .action-button.delete {
      color: #dc3545;
    }

    .action-button.delete:disabled {
      color: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .push-body {
      color: #666;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .push-url {
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
      word-break: break-all;
    }

    .push-url:hover {
      text-decoration: underline;
    }

    .push-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }

    .push-type {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 500;
    }

    .push-time {
      color: #999;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .ownership-info {
      color: #007bff;
      font-style: italic;
    }

    .device-icon {
      font-size: 12px;
    }

    /* File display styles */
    .file-display {
      margin: 12px 0;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      overflow: hidden;
      background: #f8f9fa;
    }

    .file-thumbnail {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }

    .file-info {
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .file-details {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      font-weight: 500;
      font-size: 14px;
      color: #333;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .file-type {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .file-download {
      background: #007bff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      flex-shrink: 0;
    }

    .file-download:hover {
      background: #0056b3;
    }

    .file-preview {
      position: relative;
      cursor: pointer;
    }

    .file-preview:hover::after {
      content: '🔍 Click to view';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    .channel-badge {
      background: #007bff;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    .error {
      padding: 12px;
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .load-more {
      width: 100%;
      padding: 4px 6px;
      background: #007bff;
      border: 1px solid #007bff;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin-top: 12px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .load-more:hover:not(:disabled) {
      background: #0056b3;
      border-color: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    }

    .load-more:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(0, 123, 255, 0.3);
    }

    .load-more:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #6c757d;
      border-color: #6c757d;
      transform: none;
      box-shadow: none;
    }

    .load-more-container {
      flex: 0 0 auto;
      padding: 0 6px;
      margin-top: 2px;
      margin-bottom: 2px;
    }

    .load-more-icon {
      font-size: 16px;
    }

    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
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
      .pushes-container {
        padding: 12px;
        max-height: 450px;
      }

      .pushes-header {
        margin-bottom: 12px;
        padding-bottom: 8px;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .pushes-title {
        font-size: 16px;
      }

      .refresh-button {
        font-size: 13px;
        padding: 6px 10px;
        align-self: flex-end;
      }

      .push-list {
        flex: 1;
        min-height: 0;
      }

      .push-item {
        padding: 10px;
        margin-bottom: 6px;
      }

      .push-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }

      .push-title {
        font-size: 14px;
        margin-right: 0;
      }

      .push-actions {
        align-self: flex-end;
      }

      .push-body {
        font-size: 13px;
      }

      .push-url {
        font-size: 13px;
      }

      .push-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        font-size: 11px;
      }

      .empty-state {
        padding: 30px 16px;
      }

      .empty-state-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .load-more {
        font-size: 13px;
        padding: 6px 8px;
      }

      .load-more-container {
        padding: 0 12px;
      }
    }

    @media (max-width: 360px) {
      .pushes-container {
        padding: 8px;
        max-height: 400px;
      }

      .pushes-title {
        font-size: 15px;
      }

      .push-item {
        padding: 8px;
      }

      .push-title {
        font-size: 13px;
      }

      .push-body {
        font-size: 12px;
      }

      .push-url {
        font-size: 12px;
      }

      .action-button {
        padding: 3px;
        font-size: 11px;
      }
    }

    @media (min-width: 500px) {
      .pushes-container {
        padding: 20px;
        max-width: 550px;
        max-height: 500px;
      }

      .pushes-title {
        font-size: 18px;
      }

      .push-list {
        flex: 1;
        min-height: 0;
      }

      .push-item {
        padding: 14px;
      }

      .push-title {
        font-size: 15px;
      }

      .push-body {
        font-size: 14px;
      }

      .load-more {
        font-size: 14px;
        padding: 6px 8px;
      }

      .load-more-container {
        padding: 0 8px;
      }
    }

    @media (min-width: 600px) {
      .pushes-container {
        max-width: 600px;
        padding: 24px;
        max-height: 500px;
      }

      .pushes-title {
        font-size: 20px;
      }

      .push-item {
        padding: 16px;
      }

      .push-title {
        font-size: 16px;
      }

      .push-body {
        font-size: 15px;
      }

      .load-more {
        font-size: 15px;
        padding: 14px 18px;
      }
    }
  `;k([l()],w.prototype,"pushes",2);k([l()],w.prototype,"isLoading",2);k([l()],w.prototype,"errorMessage",2);k([l()],w.prototype,"hasMore",2);k([l()],w.prototype,"cursor",2);k([l()],w.prototype,"activeSubtab",2);k([l()],w.prototype,"devices",2);k([l()],w.prototype,"lastModified",2);w=k([P("pb-recent-pushes")],w);var rt=Object.defineProperty,nt=Object.getOwnPropertyDescriptor,te=(e,t,s,i)=>{for(var o=i>1?void 0:i?nt(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&rt(t,s,o),o};let N=class extends v{constructor(){super(...arguments),this.loading=!1,this.mirrors=[],this.error=null}connectedCallback(){super.connectedCallback(),this.loadMirrors()}async loadMirrors(){this.loading=!0,this.error=null;try{console.log("🔍 [MirrorList] Loading active mirrors");const e=await chrome.runtime.sendMessage({cmd:"getActiveMirrors"});e.success?(this.mirrors=e.mirrors||[],console.log("🔍 [MirrorList] Loaded mirrors:",{count:this.mirrors.length,mirrors:this.mirrors.map(t=>({id:t.id,app:t.meta.application_name,title:t.meta.title}))})):(this.error=e.error||"Failed to load notifications",console.error("🔍 [MirrorList] Failed to load mirrors:",e.error))}catch(e){console.error("🔍 [MirrorList] Failed to load mirrors:",e),this.error="Failed to load notifications"}finally{this.loading=!1}}async handleMirrorClick(e){try{console.log("👆 [MirrorList] Mirror clicked:",{id:e.id,app:e.meta.application_name,title:e.meta.title}),await chrome.notifications.update(e.id,{priority:2}),setTimeout(()=>{chrome.notifications.update(e.id,{priority:0})},2e3)}catch(t){console.error("👆 [MirrorList] Failed to focus notification:",t)}}render(){return this.loading?a`
        <div class="loading-state">
          <div>Loading notifications...</div>
        </div>
      `:this.error?a`
        <div class="error-state">
          <div>${this.error}</div>
          <button
            class="refresh-button"
            @click=${this.loadMirrors}
            ?disabled=${this.loading}
          >
            Retry
          </button>
        </div>
      `:this.mirrors.length===0?a`
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div>No active notifications</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Phone notifications will appear here
          </div>
        </div>
      `:a`
      <div class="mirror-list">
        ${this.mirrors.map(e=>a`
            <div class="shortcut-hint">Dismiss on origin device</div>
            <div
              class="mirror-item"
              @click=${()=>this.handleMirrorClick(e)}
              title="Click to focus notification"
            >
              <div class="app-icon">
                ${e.meta.icon_url?a`
                      <img
                        src="${e.meta.icon_url}"
                        alt="${e.meta.application_name||"App"}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                      />
                    `:a`
                      ${(e.meta.application_name||"A").charAt(0).toUpperCase()}
                    `}
              </div>
              <div class="mirror-content">
                <div class="app-name">
                  ${e.meta.application_name||e.meta.package_name}
                </div>
                <div class="notification-title">${e.meta.title}</div>
                <div class="notification-body">${e.meta.body}</div>
              </div>
            </div>
          `)}
      </div>
    `}};N.styles=T`
    :host {
      display: block;
      width: 100%;
    }

    .mirror-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    .mirror-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .mirror-item:last-child {
      border-bottom: none;
    }

    .mirror-item:hover {
      background-color: #f0f0f0;
    }

    .mirror-item:active {
      background-color: #e0e0e0;
    }

    .app-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      margin-right: 12px;
      flex-shrink: 0;
      background: #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #666;
    }

    .mirror-content {
      flex: 1;
      min-width: 0;
    }

    .app-name {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-body {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .empty-state {
      padding: 24px;
      text-align: center;
      color: #666;
    }

    .empty-state-icon {
      font-size: 24px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .loading-state {
      padding: 24px;
      text-align: center;
      color: #666;
    }

    .error-state {
      padding: 16px;
      background: #ffebee;
      border: 1px solid #ffcdd2;
      border-radius: 6px;
      color: #c62828;
      font-size: 12px;
      margin: 8px 0;
    }

    .refresh-button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 8px;
    }

    .refresh-button:hover {
      background: #1976d2;
    }

    .refresh-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .shortcut-hint {
      text-align: center;
      color: #6b7280;
      font-size: 11px;
      font-style: italic;
      margin-bottom: 20px;
      padding: 2px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }
  `;te([S({type:Boolean})],N.prototype,"loading",2);te([l()],N.prototype,"mirrors",2);te([l()],N.prototype,"error",2);N=te([P("pb-mirror-list")],N);var at=Object.defineProperty,lt=Object.getOwnPropertyDescriptor,K=(e,t,s,i)=>{for(var o=i>1?void 0:i?lt(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&at(t,s,o),o};let I=class extends v{constructor(){super(...arguments),this.dragOver=!1,this.uploadState={file:null,uploading:!1,progress:0,error:null},this.maxFileSize=25*1024*1024}render(){return a`
      <div
        class="file-drop-zone ${this.getZoneClasses()}"
        @click=${this.handleZoneClick}
      >
        <input
          type="file"
          class="file-input"
          @change=${this.handleFileSelect}
          @dragenter=${this.handleDragEnter}
          @dragover=${this.handleDragOver}
          @dragleave=${this.handleDragLeave}
          @drop=${this.handleDrop}
        />

        ${this.uploadState.file?a`
              <div class="file-info">
                <div class="file-name">${this.uploadState.file.name}</div>
                <div class="file-size">
                  ${this.formatFileSize(this.uploadState.file.size)}
                </div>

                ${this.uploadState.uploading?a`
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          style="width: ${this.uploadState.progress}%"
                        ></div>
                      </div>
                      <div class="progress-text">
                        ${this.uploadState.progress}% uploaded
                      </div>
                    `:""}
                ${this.uploadState.error?a`
                      <div class="error-message">${this.uploadState.error}</div>
                    `:""}

                <div class="button-group">
                  ${this.uploadState.uploading?"":a`
                        <button
                          class="upload-button"
                          @click=${this.handleUpload}
                          ?disabled=${!this.isFileValid(this.uploadState.file)}
                        >
                          Send File
                        </button>
                        <button
                          class="cancel-button"
                          @click=${this.handleCancel}
                        >
                          Cancel
                        </button>
                      `}
                </div>
              </div>
            `:a`
              <div class="drop-icon">📁</div>
              <div class="drop-text">Drop a file here or click to browse</div>
              <div class="drop-hint">Maximum file size: 25MB</div>
            `}
      </div>
    `}getZoneClasses(){const e=[];return this.dragOver&&e.push("drag-over"),this.uploadState.error&&e.push("error"),this.uploadState.uploading&&e.push("uploading"),e.join(" ")}handleZoneClick(e){if(e.target.tagName==="BUTTON")return;this.shadowRoot?.querySelector(".file-input")?.click()}handleFileSelect(e){const s=e.target.files?.[0];s&&this.setFile(s)}handleDragEnter(e){e.preventDefault(),this.dragOver=!0}handleDragOver(e){e.preventDefault(),this.dragOver=!0}handleDragLeave(e){e.preventDefault(),this.dragOver=!1}handleDrop(e){e.preventDefault(),this.dragOver=!1;const t=e.dataTransfer?.files;t&&t.length>0&&this.setFile(t[0])}setFile(e){this.uploadState={file:e,uploading:!1,progress:0,error:null},this.isFileValid(e)||(this.uploadState.error=`File size (${this.formatFileSize(e.size)}) exceeds the 25MB limit`)}isFileValid(e){return e.size<=this.maxFileSize}formatFileSize(e){if(e===0)return"0 Bytes";const t=1024,s=["Bytes","KB","MB","GB"],i=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,i)).toFixed(2))+" "+s[i]}async handleUpload(){if(!(!this.uploadState.file||!this.isFileValid(this.uploadState.file))){this.uploadState.uploading=!0,this.uploadState.progress=0,this.uploadState.error=null;try{const e=await this.uploadState.file.arrayBuffer(),t={name:this.uploadState.file.name,type:this.uploadState.file.type,size:this.uploadState.file.size,lastModified:this.uploadState.file.lastModified,buffer:Array.from(new Uint8Array(e))},s=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE",payload:{fileData:t,targetDeviceIden:this.targetDeviceIden}});s.success?(this.dispatchEvent(new CustomEvent("upload-complete",{detail:{file:this.uploadState.file}})),this.uploadState={file:null,uploading:!1,progress:0,error:null}):(this.uploadState.error=s.error||"Upload failed",this.uploadState.uploading=!1)}catch(e){console.error("Upload error:",e),this.uploadState.error="Upload failed. Please try again.",this.uploadState.uploading=!1}}}handleCancel(){this.uploadState={file:null,uploading:!1,progress:0,error:null};const e=this.shadowRoot?.querySelector(".file-input");e&&(e.value="")}updateProgress(e){this.uploadState.uploading&&(this.uploadState.progress=e)}setError(e){this.uploadState.error=e,this.uploadState.uploading=!1}};I.styles=T`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .file-drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      transition: all 0.2s ease;
      background: #fafafa;
      cursor: pointer;
      position: relative;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .file-drop-zone:hover {
      border-color: #007bff;
      background: #f0f8ff;
    }

    .file-drop-zone.drag-over {
      border-color: #007bff;
      background: #e3f2fd;
      transform: scale(1.02);
    }

    .file-drop-zone.error {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .file-drop-zone.uploading {
      border-color: #28a745;
      background: #f8fff9;
    }

    .drop-icon {
      font-size: 2rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .drop-text {
      color: #666;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .drop-hint {
      color: #999;
      font-size: 0.8rem;
    }

    .file-input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .file-info {
      margin-top: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      width: 100%;
      box-sizing: border-box;
    }

    .file-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 0.25rem;
      word-break: break-all;
    }

    .file-size {
      color: #666;
      font-size: 0.8rem;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: #007bff;
      transition: width 0.3s ease;
      border-radius: 2px;
    }

    .progress-text {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      text-align: center;
    }

    .upload-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      transition: background 0.2s ease;
    }

    .upload-button:hover:not(:disabled) {
      background: #0056b3;
    }

    .upload-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .cancel-button {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      margin-left: 0.5rem;
      transition: background 0.2s ease;
    }

    .cancel-button:hover {
      background: #545b62;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 0.5rem;
    }
  `;K([S({type:String})],I.prototype,"targetDeviceIden",2);K([l()],I.prototype,"dragOver",2);K([l()],I.prototype,"uploadState",2);K([l()],I.prototype,"maxFileSize",2);I=K([P("pb-file-drop")],I);var dt=Object.defineProperty,ct=Object.getOwnPropertyDescriptor,m=(e,t,s,i)=>{for(var o=i>1?void 0:i?ct(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&dt(t,s,o),o};let g=class extends v{constructor(){super(...arguments),this.conversationId="",this.deviceIden="",this.isGroupConversation=!1,this.thread=null,this.messageText="",this.isLoading=!1,this.isSending=!1,this.selectedFile=null,this.recipients=[],this.newRecipientNumber="",this.isLoadingOlder=!1,this.hasMoreMessages=!0,this.messageCursor=null,this.conversationNotFound=!1,this.isReloading=!1}get smsCursorStorageKey(){return`pb_sms_thread_cursor_${this.conversationId}`}connectedCallback(){super.connectedCallback(),this.loadThread(),this.initializeRecipients(),setTimeout(()=>this.scrollToBottom(),200)}updated(e){e.has("conversationId")&&this.conversationId&&(this.loadThread(),this.initializeRecipients()),e.has("thread")&&this.thread&&this.scrollToBottom()}initializeRecipients(){if(this.conversationId&&this.isGroupConversation){const e=this.conversationId.split(",").map(t=>t.trim());this.recipients=e.map(t=>({number:t,name:t}))}else this.conversationId&&!this.isGroupConversation?this.recipients=[{number:this.conversationId,name:this.conversationId}]:this.recipients=[]}async loadThread(){if(!this.conversationId){this.thread=null;return}this.isLoading=!0;try{console.log("💬 [SmsThread] Loading conversation from API:",this.conversationId);let e=this.deviceIden;if(e)console.log("💬 [SmsThread] Using provided device ID:",e);else{console.log("💬 [SmsThread] No device ID provided, getting default SMS device");try{const s=await chrome.runtime.sendMessage({cmd:"GET_DEFAULT_SMS_DEVICE"});if(console.log("💬 [SmsThread] GET_DEFAULT_SMS_DEVICE response:",s),s.success&&s.device)e=s.device.iden,console.log("💬 [SmsThread] Got default SMS device:",e);else throw console.error("💬 [SmsThread] Failed to get default SMS device:",s.error),new Error(s.error||"No SMS device available")}catch(s){throw console.error("💬 [SmsThread] Error getting default SMS device:",s),new Error("No SMS device available")}}this.deviceIden=e,await this.loadStoredCursor();const t=await chrome.runtime.sendMessage({cmd:"LOAD_FULL_SMS_THREAD",conversationId:this.conversationId,deviceIden:e});if(t.success){this.thread=t.thread,this.messageCursor=t.cursor||null,this.hasMoreMessages=t.hasMore||!1,await this.saveStoredCursor(),console.log("💬 [SmsThread] Conversation opened, clearing SMS notifications from badge");try{await chrome.runtime.sendMessage({cmd:"CLEAR_SMS_NOTIFICATIONS"}),console.log("💬 [SmsThread] SMS notifications cleared from badge")}catch(s){console.error("💬 [SmsThread] Failed to clear SMS notifications:",s)}this.scrollToBottom(),setTimeout(()=>this.scrollToBottom(),300),console.log("💬 [SmsThread] Loaded conversation from API:",{conversationId:this.conversationId,deviceIden:this.deviceIden,messageCount:this.thread?.messages?.length||0})}else console.error("💬 [SmsThread] Failed to load thread from API:",t.error)}catch(e){console.error("💬 [SmsThread] Failed to load thread from API:",e)}finally{this.isLoading=!1}}async loadOlderMessages(){if(!(!this.conversationId||this.isLoadingOlder||!this.hasMoreMessages)){this.isLoadingOlder=!0;try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_THREAD_PAGED",conversationId:this.conversationId,cursor:this.messageCursor});if(e.success&&this.thread){const t=e.messages||[];this.thread={...this.thread,messages:[...t,...this.thread.messages]},this.messageCursor=e.cursor||null,this.hasMoreMessages=e.hasMore||!1,await this.saveStoredCursor()}}catch(e){console.error("Failed to load older messages:",e)}finally{this.isLoadingOlder=!1}}}scrollToBottom(){console.log("🔄 [SmsThread] scrollToBottom called"),this.updateComplete.then(()=>{const e=this.shadowRoot?.querySelector(".messages-container");if(console.log("🔄 [SmsThread] Container found:",!!e),e){const t=e;console.log("🔄 [SmsThread] Container dimensions:",{scrollHeight:t.scrollHeight,clientHeight:t.clientHeight,scrollTop:t.scrollTop,offsetHeight:t.offsetHeight});const s=e.querySelectorAll("img"),i=Array.from(s).map(o=>o.complete?Promise.resolve():new Promise(r=>{o.onload=r,o.onerror=r}));Promise.all(i).then(()=>{if(t.scrollHeight<=t.clientHeight){console.log("🔄 [SmsThread] No scrollable content - scrollHeight <= clientHeight");return}requestAnimationFrame(()=>{console.log("🔄 [SmsThread] Scrolling to bottom...");const o=t.scrollHeight-t.clientHeight;t.scrollTop=o,setTimeout(()=>{const r=t.scrollTop,n=t.scrollHeight-t.clientHeight;Math.abs(r-n)>5?(console.log(`🔄 [SmsThread] Final scroll adjustment - current: ${r}, target: ${n}`),t.scrollTop=n):console.log("🔄 [SmsThread] Successfully scrolled to bottom")},100)})})}})}handleScrollTop(){const e=this.shadowRoot?.querySelector(".messages-container");e&&e.scrollTop===0&&this.hasMoreMessages&&this.loadOlderMessages()}async loadStoredCursor(){try{const e=await chrome.storage.local.get(this.smsCursorStorageKey);e[this.smsCursorStorageKey]&&(this.messageCursor=e[this.smsCursorStorageKey],console.log(`📱 [SMS Thread] Loaded stored cursor for ${this.conversationId}:`,this.messageCursor))}catch(e){console.error("Failed to load stored SMS cursor:",e)}}async saveStoredCursor(){try{await chrome.storage.local.set({[this.smsCursorStorageKey]:this.messageCursor}),console.log(`📱 [SMS Thread] Saved cursor for ${this.conversationId}:`,this.messageCursor)}catch(e){console.error("Failed to save SMS cursor:",e)}}handleInputChange(e){const t=e.target;this.messageText=t.value,t.style.height="auto",t.style.height=Math.min(t.scrollHeight,120)+"px"}handleKeyDown(e){e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&(e.preventDefault(),this.sendMessage())}handleRecipientInputChange(e){const t=e.target;this.newRecipientNumber=t.value}handleRecipientInputKeyDown(e){e.key==="Enter"&&(e.preventDefault(),this.addRecipient())}addRecipient(){const e=this.newRecipientNumber.trim();if(e&&/^\+?[\d\s\-()]+$/.test(e)){if(this.recipients.some(t=>t.number===e)){this.newRecipientNumber="";return}this.recipients=[...this.recipients,{number:e,name:e}],this.newRecipientNumber="",this.updateGroupConversationId()}}removeRecipient(e){this.recipients=this.recipients.filter(t=>t.number!==e),this.updateGroupConversationId()}updateGroupConversationId(){this.recipients.length>1?(this.conversationId=this.recipients.map(e=>e.number).join(","),this.isGroupConversation=!0):this.recipients.length===1?(this.conversationId=this.recipients[0].number,this.isGroupConversation=!1):(this.conversationId="",this.isGroupConversation=!1)}handleFileSelect(e){const s=e.target.files?.[0];if(s){if(s.size>25*1024*1024){console.error("File too large. Maximum size is 25MB.");return}if(!s.type.startsWith("image/")){console.error("Only image files are supported for MMS.");return}this.selectedFile=s}}removeSelectedFile(){this.selectedFile=null;const e=this.shadowRoot?.querySelector(".file-input");e&&(e.value="")}formatFileSize(e){if(e===0)return"0 Bytes";const t=1024,s=["Bytes","KB","MB"],i=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,i)).toFixed(1))+" "+s[i]}async sendMessage(){if(console.log("💬 [SmsThread] sendMessage called",{messageText:this.messageText,selectedFile:!!this.selectedFile,conversationId:this.conversationId,deviceIden:this.deviceIden,isSending:this.isSending}),!this.messageText.trim()&&!this.selectedFile||!this.conversationId||!this.deviceIden||this.isSending){console.log("💬 [SmsThread] sendMessage early return - conditions not met");return}this.isSending=!0;try{let e;if(this.selectedFile){const s=await this.selectedFile.arrayBuffer(),i={name:this.selectedFile.name,type:this.selectedFile.type,size:this.selectedFile.size,lastModified:this.selectedFile.lastModified,buffer:Array.from(new Uint8Array(s))},o=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE_FOR_SMS",payload:{fileData:i,targetDeviceIden:this.deviceIden}});if(!o.success){console.error("Failed to upload file:",o.error);return}e=[{content_type:this.selectedFile.type,name:this.selectedFile.name,url:o.fileUrl}]}const t=await chrome.runtime.sendMessage({cmd:"SEND_SMS",payload:{conversationId:this.conversationId,message:this.messageText,deviceIden:this.deviceIden,attachments:e}});t.success?(this.messageText="",this.selectedFile=null,this.requestUpdate(),console.log("💬 [SmsThread] Message sent successfully, reloading thread to show new message"),await this.loadThread(),this.dispatchEvent(new CustomEvent("message-sent",{detail:{conversationId:this.conversationId},bubbles:!0}))):(console.error("Failed to send SMS:",t.error),t.error&&t.error.includes("CONVERSATION_NOT_FOUND:")&&(this.conversationNotFound=!0,console.log("💬 [SmsThread] Conversation not found, showing reload option")))}catch(e){console.error("Failed to send message:",e)}finally{this.isSending=!1}}formatTime(e){return new Date(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}async reloadThread(){if(!(!this.conversationId||!this.deviceIden||this.isReloading)){console.log("💬 [SmsThread] Reloading thread:",this.conversationId),this.isReloading=!0,this.conversationNotFound=!1;try{const e=await chrome.runtime.sendMessage({cmd:"RELOAD_SMS_THREAD",deviceIden:this.deviceIden,threadId:this.conversationId});e.success&&e.thread?(console.log("💬 [SmsThread] Thread reloaded successfully"),this.thread=e.thread,this.conversationNotFound=!1,this.dispatchEvent(new CustomEvent("thread-reloaded",{detail:{conversationId:this.conversationId},bubbles:!0}))):console.error("💬 [SmsThread] Failed to reload thread:",e.error)}catch(e){console.error("💬 [SmsThread] Error reloading thread:",e)}finally{this.isReloading=!1}}}openImage(e){chrome.tabs.create({url:e})}render(){return this.isLoading?a`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversation...
        </div>
      `:this.thread?this.conversationNotFound?a`
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
            ${this.isReloading?a`<div class="spinner-small"></div>
                  Reloading...`:"Reload Conversation"}
          </button>
        </div>
      `:a`
      <div class="thread-header">
        <div class="contact-name">${this.thread.name}</div>
        ${this.thread.unreadCount>0?a` <div class="unread-badge">${this.thread.unreadCount}</div> `:""}
      </div>

      <div
        class="messages-container"
        role="log"
        aria-label="Message history"
        @scroll="${this.handleScrollTop}"
      >
        ${this.hasMoreMessages?a`
              <button
                class="load-older-btn"
                @click=${this.loadOlderMessages}
                ?disabled=${this.isLoadingOlder}
              >
                ${this.isLoadingOlder?a`
                      <div
                        class="spinner"
                        style="width: 14px; height: 14px; margin-right: 6px;"
                      ></div>
                      Loading older messages...
                    `:"Load older messages"}
              </button>
            `:""}
        ${this.thread.messages.map(e=>a`
            <div class="message ${e.inbound?"inbound":"outbound"}">
              <div class="message-bubble">
                <div>${e.text}</div>
                ${e.image_url?a`
                      <img
                        class="message-image"
                        src="${e.image_url}"
                        alt="Message attachment"
                        @click=${()=>this.openImage(e.image_url)}
                      />
                    `:""}
                <div class="message-time">
                  ${this.formatTime(e.timestamp)}
                </div>
              </div>
            </div>
          `)}
      </div>

      <div class="input-container">
        ${this.isGroupConversation||this.recipients.length===0?a`
              <div class="recipients-container">
                <div class="recipients-label">Recipients:</div>

                ${this.recipients.length>0?a`
                      <div class="recipients-list">
                        ${this.recipients.map(e=>a`
                            <div class="recipient-chip">
                              <span>${e.name}</span>
                              <button
                                class="remove-btn"
                                @click=${()=>this.removeRecipient(e.number)}
                                title="Remove recipient"
                              >
                                ×
                              </button>
                            </div>
                          `)}
                      </div>
                    `:""}

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
            `:""}

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
              @click=${()=>this.shadowRoot?.querySelector(".file-input")?.click()}
            >
              📎 Attach Image
            </button>
          </div>

          ${this.selectedFile?a`
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
              `:""}
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
            ?disabled=${!this.messageText.trim()&&!this.selectedFile||this.isSending||!this.conversationId||!this.deviceIden}
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
    `:a`
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
          </svg>
          <p>Select a conversation to start messaging</p>
        </div>
      `}};g.styles=T`
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
  `;m([S({type:String})],g.prototype,"conversationId",2);m([S({type:String})],g.prototype,"deviceIden",2);m([S({type:Boolean})],g.prototype,"isGroupConversation",2);m([l()],g.prototype,"thread",2);m([l()],g.prototype,"messageText",2);m([l()],g.prototype,"isLoading",2);m([l()],g.prototype,"isSending",2);m([l()],g.prototype,"selectedFile",2);m([l()],g.prototype,"recipients",2);m([l()],g.prototype,"newRecipientNumber",2);m([l()],g.prototype,"isLoadingOlder",2);m([l()],g.prototype,"hasMoreMessages",2);m([l()],g.prototype,"messageCursor",2);m([l()],g.prototype,"conversationNotFound",2);m([l()],g.prototype,"isReloading",2);g=m([P("pb-sms-thread")],g);var pt=Object.defineProperty,ht=Object.getOwnPropertyDescriptor,U=(e,t,s,i)=>{for(var o=i>1?void 0:i?ht(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&pt(t,s,o),o};let z=class extends v{constructor(){super(...arguments),this.selectedConversationId="",this.conversations=[],this.searchQuery="",this.isLoading=!1,this.filteredConversations=[]}connectedCallback(){super.connectedCallback(),this.loadConversations()}async loadConversations(){this.isLoading=!0;try{console.log("[ConversationList] Starting to load conversations from API");const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CONVERSATIONS_FROM_API"});if(console.log("[ConversationList] Received response:",e),console.log("[ConversationList] Response type:",typeof e),console.log("[ConversationList] Response success:",e?.success),!e){console.error("[ConversationList] No response from background script"),this.conversations=[],this.filterConversations();return}if(e.success)console.log(`[ConversationList] Successfully loaded ${e.conversations?.length||0} conversations from API`),this.conversations=e.conversations||[],this.filterConversations();else{const t=e.error||"Unknown error occurred";console.error("[ConversationList] Failed to load conversations from API:",t),console.error("[ConversationList] Full error response:",e),this.conversations=[],this.filterConversations()}}catch(e){console.error("[ConversationList] Exception while loading conversations from API:",e),this.conversations=[],this.filterConversations()}finally{console.log("[ConversationList] Loading complete, setting isLoading=false"),this.isLoading=!1}}filterConversations(){if(!this.searchQuery.trim())this.filteredConversations=this.conversations;else{const e=this.searchQuery.toLowerCase();this.filteredConversations=this.conversations.filter(t=>t.name.toLowerCase().includes(e)||t.id.toLowerCase().includes(e))}}handleSearchInput(e){const t=e.target;this.searchQuery=t.value,this.filterConversations()}selectConversation(e){this.selectedConversationId=e;const t=this.conversations.find(i=>i.id===e),s=t?.name||t?.recipients?.map(i=>i.name).join(", ")||"Unknown";this.dispatchEvent(new CustomEvent("conversation-selected",{detail:{conversationId:e,conversationName:s},bubbles:!0,composed:!0})),chrome.runtime.sendMessage({cmd:"MARK_CONVERSATION_READ",conversationId:e})}getInitials(e){return e.split(" ").map(t=>t.charAt(0)).join("").toUpperCase().slice(0,2)}formatTime(e){const t=new Date(e),i=new Date().getTime()-t.getTime(),o=Math.floor(i/(1e3*60*60*24));return o===0?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):o===1?"Yesterday":o<7?t.toLocaleDateString([],{weekday:"short"}):t.toLocaleDateString([],{month:"short",day:"numeric"})}getLastMessage(e){const t=e.messages[e.messages.length-1];return t?t.image_url?t.inbound?"📷 Image":"📷 You sent an image":t.text||"No text":"No messages"}render(){return this.isLoading?a`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversations...
        </div>
      `:this.conversations.length===0?a`
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
          </svg>
          <p>No conversations yet</p>
          <p style="font-size: 12px; margin-top: 8px;">
            SMS conversations will appear here
          </p>
        </div>
      `:a`
      <div class="header">
        <h2 class="title">Messages</h2>
        <div class="search-container">
          <svg class="search-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="Search conversations..."
            .value="${this.searchQuery}"
            @input="${this.handleSearchInput}"
          />
        </div>
      </div>

      <div class="conversations-container">
        ${this.filteredConversations.length===0&&this.searchQuery?a`
              <div class="no-results">
                <p>No conversations found for "${this.searchQuery}"</p>
              </div>
            `:""}
        ${this.filteredConversations.map(e=>a`
            <div
              class="conversation-item ${e.id===this.selectedConversationId?"selected":""}"
              @click="${()=>this.selectConversation(e.id)}"
            >
              <div class="avatar">${this.getInitials(e.name)}</div>

              <div class="conversation-content">
                <div class="contact-name">${e.name}</div>
                <div class="last-message">
                  ${this.getLastMessage(e)}
                </div>
              </div>

              <div class="conversation-meta">
                <div class="timestamp">
                  ${this.formatTime(e.lastMessageTime)}
                </div>
                ${e.unreadCount>0?a`
                      <div class="unread-badge">
                        ${e.unreadCount}
                      </div>
                    `:""}
              </div>
            </div>
          `)}
      </div>
    `}};z.styles=T`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 12px 0;
    }

    .search-container {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #666;
    }

    .conversations-container {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      min-height: 0;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f8f9fa;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .conversation-item:hover {
      background: #f8f9fa;
    }

    .conversation-item.selected {
      background: #e3f2fd;
      border-left: 3px solid #007bff;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #007bff;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .conversation-content {
      flex: 1;
      min-width: 0;
    }

    .contact-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .last-message {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .timestamp {
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
    }

    .unread-badge {
      background: #007bff;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
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

    .no-results {
      padding: 32px 16px;
      text-align: center;
      color: #666;
    }
  `;U([S({type:String})],z.prototype,"selectedConversationId",2);U([l()],z.prototype,"conversations",2);U([l()],z.prototype,"searchQuery",2);U([l()],z.prototype,"isLoading",2);U([l()],z.prototype,"filteredConversations",2);z=U([P("pb-conversation-list")],z);var ut=Object.defineProperty,gt=Object.getOwnPropertyDescriptor,$=(e,t,s,i)=>{for(var o=i>1?void 0:i?gt(t,s):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(o=(i?n(t,s,o):n(o))||o);return i&&o&&ut(t,s,o),o};let x=class extends v{constructor(){super(...arguments),this.subscriptions=[],this.searchQuery="",this.searchResults=[],this.isLoading=!1,this.isSearching=!1,this.errorMessage="",this.successMessage="",this.activeSubtab="discover",this.subscriptionPosts=[],this.isLoadingPosts=!1,this.searchTimeout=null}connectedCallback(){super.connectedCallback(),this.loadSubscriptions()}async loadSubscriptions(){try{this.isLoading=!0;const e=await chrome.runtime.sendMessage({cmd:"GET_CHANNEL_SUBSCRIPTIONS",forceRefresh:!1});e.success?this.subscriptions=e.subscriptions:this.errorMessage=e.error||"Failed to load subscriptions"}catch(e){this.errorMessage="Failed to load subscriptions",console.error("Failed to load subscriptions:",e)}finally{this.isLoading=!1}}onSearchInput(e){const t=e.target;if(this.searchQuery=t.value.trim(),this.searchTimeout&&clearTimeout(this.searchTimeout),!this.searchQuery){this.searchResults=[],this.isSearching=!1;return}this.searchTimeout=window.setTimeout(()=>{this.searchChannels()},250)}async searchChannels(){if(this.searchQuery)try{this.isSearching=!0,this.errorMessage="";const e=await chrome.runtime.sendMessage({cmd:"GET_CHANNEL_INFO",channelTag:this.searchQuery});e.success?this.searchResults=[e.channelInfo]:e.error==="Channel not found"?this.searchResults=[]:(this.errorMessage=e.error||"Failed to search channels",this.searchResults=[])}catch(e){this.errorMessage="Failed to search channels",this.searchResults=[],console.error("Failed to search channels:",e)}finally{this.isSearching=!1}}async subscribeToChannel(e){try{this.errorMessage="",this.successMessage="";const t=await chrome.runtime.sendMessage({cmd:"SUBSCRIBE_TO_CHANNEL",channelTag:e});t.success?(this.successMessage=`Successfully subscribed to ${e}`,await this.loadSubscriptions(),this.searchResults=[],this.searchQuery=""):this.errorMessage=t.error||"Failed to subscribe to channel"}catch(t){this.errorMessage="Failed to subscribe to channel",console.error("Failed to subscribe to channel:",t)}}async unsubscribeFromChannel(e){try{this.errorMessage="",this.successMessage="";const t=await chrome.runtime.sendMessage({cmd:"UNSUBSCRIBE_FROM_CHANNEL",subscriptionIden:e});t.success?(this.successMessage="Successfully unsubscribed from channel",await this.loadSubscriptions()):this.errorMessage=t.error||"Failed to unsubscribe from channel"}catch(t){this.errorMessage="Failed to unsubscribe from channel",console.error("Failed to unsubscribe from channel:",t)}}isSubscribedToChannel(e){return this.subscriptions.some(t=>t.channel?.tag===e&&t.active)}handleSubtabChange(e){this.activeSubtab=e,e==="recent"&&this.loadSubscriptionPosts()}async loadSubscriptionPosts(){try{this.isLoadingPosts=!0,this.errorMessage="";const e=await chrome.runtime.sendMessage({cmd:"GET_SUBSCRIPTION_POSTS"});e.success?this.subscriptionPosts=e.posts:this.errorMessage=e.error||"Failed to load subscription posts"}catch(e){this.errorMessage="Failed to load subscription posts",console.error("Failed to load subscription posts:",e)}finally{this.isLoadingPosts=!1}}async refreshSubscriptions(){try{this.isLoading=!0,this.errorMessage="";const e=await chrome.runtime.sendMessage({cmd:"REFRESH_CHANNEL_DATA"});e.success?(this.successMessage="Subscriptions refreshed successfully",await this.loadSubscriptions(),setTimeout(()=>{this.successMessage=""},3e3)):this.errorMessage=e.error||"Failed to refresh subscriptions"}catch(e){this.errorMessage="Failed to refresh subscriptions",console.error("Failed to refresh subscriptions:",e)}finally{this.isLoading=!1}}renderChannelIcon(e){return e?e.image_url?a`<img
        src="${e.image_url}"
        alt="${e.name||"Channel"}"
        class="channel-icon"
      />`:a`<div class="channel-icon">
      ${e.name?e.name.charAt(0).toUpperCase():"?"}
    </div>`:a`<div class="channel-icon">?</div>`}renderSearchResults(){return this.isSearching?a`<div class="loading">Searching...</div>`:this.searchResults.length===0&&this.searchQuery?a`<div class="empty-state">
        No channels found for "${this.searchQuery}"
      </div>`:a`
      <div class="search-results">
        ${this.searchResults.map(e=>{const t=this.isSubscribedToChannel(e?.tag||"");return a`
            <div class="channel-card">
              ${this.renderChannelIcon(e)}
              <div class="channel-info">
                <div class="channel-name">
                  ${e?.name||"Unknown Channel"}
                </div>
                <div class="channel-description">
                  ${e?.description||"No description available"}
                </div>
                <div class="channel-tag">@${e?.tag||"unknown"}</div>
              </div>
              ${t?a`<div class="subscribed-badge">Subscribed</div>`:a`<button
                    class="subscribe-button"
                    @click=${()=>this.subscribeToChannel(e?.tag||"")}
                  >
                    Subscribe
                  </button>`}
            </div>
          `})}
      </div>
    `}renderSubscriptions(){return this.isLoading?a`<div class="loading">Loading subscriptions...</div>`:this.subscriptions.length===0?a`<div class="empty-state">No channel subscriptions yet</div>`:a`
      <div class="subscriptions-section">
        <div class="section-header">
          <h3 class="section-title">Your Subscriptions</h3>
          <button
            class="refresh-button"
            @click=${this.refreshSubscriptions}
            ?disabled=${this.isLoading}
            title="Refresh subscriptions"
          >
            🔄 Refresh
          </button>
        </div>
        ${this.subscriptions.map(e=>a`
            <div class="subscription-item">
              ${this.renderChannelIcon(e.channel)}
              <div class="channel-info">
                <div class="channel-name">
                  ${e.channel?.name||"Unknown Channel"}
                </div>
                <div class="channel-description">
                  ${e.channel?.description||"No description available"}
                </div>
                <div class="channel-tag">
                  @${e.channel?.tag||"unknown"}
                </div>
              </div>
              <button
                class="unsubscribe-button"
                @click=${()=>this.unsubscribeFromChannel(e.iden)}
              >
                Unsubscribe
              </button>
            </div>
          `)}
      </div>
    `}renderRecentChannelPushes(){return a`
      <div class="recent-pushes-section">
        <h3 class="section-title">Recent Subscription Posts</h3>
        ${this.isLoadingPosts?a`
              <div class="loading-indicator">Loading subscription posts...</div>
            `:""}
        ${this.subscriptionPosts.length===0&&!this.isLoadingPosts?a`
              <div class="recent-pushes-content">
                <p>No recent subscription posts found.</p>
                <p>
                  Posts from channels you're subscribed to will appear here.
                </p>
              </div>
            `:""}
        ${this.subscriptionPosts.length>0?a`
              <div class="subscription-posts">
                ${this.subscriptionPosts.map(e=>a`
                    <div class="post-card">
                      <div class="post-header">
                        <span class="channel-name">${e.channel_tag}</span>
                        <span class="post-date"
                          >${new Date(e.created*1e3).toLocaleDateString()}</span
                        >
                      </div>
                      <div class="post-content">
                        ${e.title?a`<h4 class="post-title">${e.title}</h4>`:""}
                        ${e.body?a`<p class="post-body">${e.body}</p>`:""}
                        ${e.url?a`<a
                              href="${e.url}"
                              target="_blank"
                              class="post-link"
                              >🔗 ${e.url}</a
                            >`:""}
                      </div>
                    </div>
                  `)}
              </div>
            `:""}
      </div>
    `}render(){return a`
      <div class="channels-container">
        ${this.errorMessage?a`<div class="error-message">${this.errorMessage}</div>`:""}
        ${this.successMessage?a`<div class="success-message">${this.successMessage}</div>`:""}

        <div class="subtab-navigation">
          <button
            class="subtab-button ${this.activeSubtab==="discover"?"active":""}"
            @click=${()=>this.handleSubtabChange("discover")}
          >
            Discover New Subscriptions
          </button>
          <button
            class="subtab-button ${this.activeSubtab==="recent"?"active":""}"
            @click=${()=>this.handleSubtabChange("recent")}
          >
            Recent Subscription Posts
          </button>
        </div>

        ${this.activeSubtab==="discover"?a`
              <div class="search-section">
                <h3 class="section-title">Discover New Subscriptions</h3>
                <input
                  type="text"
                  class="search-input"
                  placeholder="Enter channel tag (e.g., pushbullet)"
                  .value=${this.searchQuery}
                  @input=${this.onSearchInput}
                />
                ${this.renderSearchResults()}
              </div>

              ${this.renderSubscriptions()}
            `:this.renderRecentChannelPushes()}
      </div>
    `}};x.styles=T`
    :host {
      display: block;
      padding: 16px;
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    .channels-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .search-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .search-input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #007bff;
    }

    .subtab-navigation {
      display: flex;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
    }

    .subtab-button {
      background: none;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .subtab-button.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .subtab-button:hover:not(.active) {
      color: #333;
      background: #f8f9fa;
    }

    .recent-pushes-section {
      padding: 16px 0;
    }

    .recent-pushes-content {
      padding: 20px;
      text-align: center;
      color: #666;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .loading-indicator {
      text-align: center;
      padding: 20px;
      color: #666;
      font-style: italic;
    }

    .subscription-posts {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .post-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }

    .post-card:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 12px;
    }

    .post-header .channel-name {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .post-date {
      color: #666;
    }

    .post-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .post-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .post-body {
      margin: 0;
      font-size: 13px;
      color: #555;
      line-height: 1.4;
    }

    .post-link {
      color: #007bff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }

    .post-link:hover {
      text-decoration: underline;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    .channel-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: white;
      transition: all 0.2s;
    }

    .channel-card:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    }

    .channel-icon {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      object-fit: cover;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #6c757d;
    }

    .channel-info {
      flex: 1;
      min-width: 0;
    }

    .channel-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .channel-description {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .channel-tag {
      font-size: 11px;
      color: #999;
      font-family: monospace;
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }

    .subscribe-button {
      padding: 6px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .subscribe-button:hover {
      background: #0056b3;
    }

    .subscribe-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .subscribed-badge {
      padding: 6px 12px;
      background: #28a745;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    .subscriptions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .refresh-button {
      padding: 6px 12px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .refresh-button:hover:not(:disabled) {
      background: #5a6268;
    }

    .refresh-button:disabled {
      background: #adb5bd;
      cursor: not-allowed;
    }

    .subscription-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: white;
    }

    .unsubscribe-button {
      padding: 6px 12px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .unsubscribe-button:hover {
      background: #c82333;
    }

    .loading {
      text-align: center;
      color: #666;
      font-size: 14px;
      padding: 20px;
    }

    .error-message {
      color: #dc3545;
      font-size: 14px;
      padding: 8px 12px;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .success-message {
      color: #155724;
      font-size: 14px;
      padding: 8px 12px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .empty-state {
      text-align: center;
      color: #666;
      font-size: 14px;
      padding: 40px 20px;
    }
  `;$([S({type:Array})],x.prototype,"subscriptions",2);$([l()],x.prototype,"searchQuery",2);$([l()],x.prototype,"searchResults",2);$([l()],x.prototype,"isLoading",2);$([l()],x.prototype,"isSearching",2);$([l()],x.prototype,"errorMessage",2);$([l()],x.prototype,"successMessage",2);$([l()],x.prototype,"activeSubtab",2);$([l()],x.prototype,"subscriptionPosts",2);$([l()],x.prototype,"isLoadingPosts",2);x=$([P("pb-channels")],x);console.log("Pushbridge popup loaded");document.addEventListener("DOMContentLoaded",async()=>{console.log("🪟 [Popup] Popup opened, sending POPUP_OPEN message");try{await chrome.runtime.sendMessage({cmd:"POPUP_OPEN"}),console.log("🪟 [Popup] POPUP_OPEN message sent successfully")}catch(e){console.error("🪟 [Popup] Failed to send POPUP_OPEN message:",e)}await ke()});async function ke(){const e=document.querySelector(".container");if(!e){console.error("Container element not found");return}try{if(await Ce("pb_token")){const s=await ze(),i=s?await ve():null;e.innerHTML=`
        <div class="popup-container">
          <div class="popup-header">
            <h2 class="popup-title">Pushbridge</h2>
            <div class="tab-navigation">
              <button class="tab-button active" data-tab="composer">Send</button>
              <button class="tab-button" data-tab="pushes">Messages</button>
              <button class="tab-button" data-tab="notifications">Notifications Mirroring</button>

              <button class="tab-button" data-tab="channels">Subscriptions</button>
              ${s?'<button class="tab-button" data-tab="messages">SMS/MMS</button>':""}
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
              ${s?`<div class="tab-pane" data-tab="messages">
                <div class="sms-interface">
                  <div class="sms-view conversation-list-view active">
                    <pb-conversation-list id="conversation-list"></pb-conversation-list>
                  </div>
                  <div class="sms-view sms-thread-view">
                    <div class="sms-thread-header">
                      <button class="back-button" id="sms-back-button">← Back</button>
                      <span class="conversation-title" id="conversation-title">Conversation</span>
                    </div>
                    <pb-sms-thread id="sms-thread" device-iden="${i?.iden||""}"></pb-sms-thread>
                  </div>
                </div>
              </div>`:""}
            </div>
            <div class="popup-footer">
              <div class="footer-content">
                <span class="copyright">© 2025 Pushbridge</span>
                <span class="disclaimer">· Unofficial</span>
                <button class="about-button" id="about-button">About</button>
              </div>
            </div>
        </div>
      `,ft(),s&&mt(),bt()}else{e.innerHTML="<pb-token-setup></pb-token-setup>";const s=document.querySelector("pb-token-setup");s&&s.addEventListener("token-verified",async()=>{console.log("🪟 [Popup] Token verified, refreshing popup..."),await ke()})}}catch(t){console.error("Failed to initialize popup:",t),e.innerHTML=`
      <div style="padding: 20px; text-align: center; color: #666;">
        <div>Failed to load popup</div>
        <div style="font-size: 12px; margin-top: 8px;">${t instanceof Error?t.message:"Unknown error"}</div>
      </div>
    `}}function ft(){const e=document.querySelectorAll(".tab-button"),t=document.querySelectorAll(".tab-pane");e.forEach(s=>{s.addEventListener("click",()=>{const i=s.getAttribute("data-tab");e.forEach(o=>o.classList.remove("active")),s.classList.add("active"),t.forEach(o=>{o.classList.remove("active"),o.getAttribute("data-tab")===i&&o.classList.add("active")})})})}async function mt(){try{const e=await ve();if(e){const c=e.nickname||e.model||`Device ${e.iden.slice(0,8)}`,d=document.querySelector('[data-tab="messages"]');d&&(d.innerHTML=`
          <div class="sms-header">
            <span class="sms-title">SMS/MMS</span>
            <span class="device-info">from ${c}</span>
          </div>
        `)}const t=document.getElementById("conversation-list"),s=document.getElementById("sms-thread"),i=document.getElementById("sms-back-button"),o=document.getElementById("conversation-title"),r=document.querySelector(".conversation-list-view"),n=document.querySelector(".sms-thread-view");t&&s&&i&&o&&r&&n&&(t.addEventListener("conversation-selected",c=>{const{conversationId:d,conversationName:h}=c.detail;s.conversationId=d,o.textContent=h||"Conversation",r.classList.remove("active"),n.classList.add("active"),setTimeout(()=>{s.scrollToBottom&&s.scrollToBottom()},300)}),i.addEventListener("click",()=>{n.classList.remove("active"),r.classList.add("active"),t.selectedConversationId=""}))}catch(e){console.error("Failed to setup SMS interface:",e)}}function bt(){const e=document.getElementById("about-button");e&&e.addEventListener("click",()=>{xt()})}function xt(){const e=document.createElement("div");e.className="about-overlay",e.innerHTML=`
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
  `,document.body.appendChild(e);const t=e.querySelector("#close-about");t&&t.addEventListener("click",()=>{document.body.removeChild(e)}),e.addEventListener("click",s=>{s.target===e&&document.body.removeChild(e)})}const Me=document.createElement("style");Me.textContent=`
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
`;document.head.appendChild(Me);
