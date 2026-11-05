import{g as oe}from"./storage.js";import{g as Ye,a as Ze,b as Ee,c as Je}from"./pb-nav.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const te=globalThis,le=te.ShadowRoot&&(te.ShadyCSS===void 0||te.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,ce=Symbol(),xe=new WeakMap;let Ae=class{constructor(e,o,s){if(this._$cssResult$=!0,s!==ce)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=o}get styleSheet(){let e=this.o;const o=this.t;if(le&&e===void 0){const s=o!==void 0&&o.length===1;s&&(e=xe.get(o)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&xe.set(o,e))}return e}toString(){return this.cssText}};const Xe=t=>new Ae(typeof t=="string"?t:t+"",void 0,ce),P=(t,...e)=>{const o=t.length===1?t[0]:e.reduce((s,r,i)=>s+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[i+1],t[0]);return new Ae(o,t,ce)},et=(t,e)=>{if(le)t.adoptedStyleSheets=e.map(o=>o instanceof CSSStyleSheet?o:o.styleSheet);else for(const o of e){const s=document.createElement("style"),r=te.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=o.cssText,t.appendChild(s)}},ve=le?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let o="";for(const s of e.cssRules)o+=s.cssText;return Xe(o)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:tt,defineProperty:ot,getOwnPropertyDescriptor:st,getOwnPropertyNames:rt,getOwnPropertySymbols:it,getPrototypeOf:at}=Object,ie=globalThis,ye=ie.trustedTypes,nt=ye?ye.emptyScript:"",dt=ie.reactiveElementPolyfillSupport,V=(t,e)=>t,se={toAttribute(t,e){switch(e){case Boolean:t=t?nt:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let o=t;switch(e){case Boolean:o=t!==null;break;case Number:o=t===null?null:Number(t);break;case Object:case Array:try{o=JSON.parse(t)}catch{o=null}}return o}},he=(t,e)=>!tt(t,e),ke={attribute:!0,type:String,converter:se,reflect:!1,useDefault:!1,hasChanged:he};Symbol.metadata??=Symbol("metadata"),ie.litPropertyMetadata??=new WeakMap;let N=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,o=ke){if(o.state&&(o.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((o=Object.create(o)).wrapped=!0),this.elementProperties.set(e,o),!o.noAccessor){const s=Symbol(),r=this.getPropertyDescriptor(e,s,o);r!==void 0&&ot(this.prototype,e,r)}}static getPropertyDescriptor(e,o,s){const{get:r,set:i}=st(this.prototype,e)??{get(){return this[o]},set(a){this[o]=a}};return{get:r,set(a){const c=r?.call(this);i?.call(this,a),this.requestUpdate(e,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ke}static _$Ei(){if(this.hasOwnProperty(V("elementProperties")))return;const e=at(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(V("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(V("properties"))){const o=this.properties,s=[...rt(o),...it(o)];for(const r of s)this.createProperty(r,o[r])}const e=this[Symbol.metadata];if(e!==null){const o=litPropertyMetadata.get(e);if(o!==void 0)for(const[s,r]of o)this.elementProperties.set(s,r)}this._$Eh=new Map;for(const[o,s]of this.elementProperties){const r=this._$Eu(o,s);r!==void 0&&this._$Eh.set(r,o)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const o=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const r of s)o.unshift(ve(r))}else e!==void 0&&o.push(ve(e));return o}static _$Eu(e,o){const s=o.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,o=this.constructor.elementProperties;for(const s of o.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return et(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,o,s){this._$AK(e,s)}_$ET(e,o){const s=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,s);if(r!==void 0&&s.reflect===!0){const i=(s.converter?.toAttribute!==void 0?s.converter:se).toAttribute(o,s.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,o){const s=this.constructor,r=s._$Eh.get(e);if(r!==void 0&&this._$Em!==r){const i=s.getPropertyOptions(r),a=typeof i.converter=="function"?{fromAttribute:i.converter}:i.converter?.fromAttribute!==void 0?i.converter:se;this._$Em=r;const c=a.fromAttribute(o,i.type);this[r]=c??this._$Ej?.get(r)??c,this._$Em=null}}requestUpdate(e,o,s){if(e!==void 0){const r=this.constructor,i=this[e];if(s??=r.getPropertyOptions(e),!((s.hasChanged??he)(i,o)||s.useDefault&&s.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,s))))return;this.C(e,o,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,o,{useDefault:s,reflect:r,wrapped:i},a){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??o??this[e]),i!==!0||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(o=void 0),this._$AL.set(e,o)),r===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(o){Promise.reject(o)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[r,i]of this._$Ep)this[r]=i;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[r,i]of s){const{wrapped:a}=i,c=this[r];a!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,i,c)}}let e=!1;const o=this._$AL;try{e=this.shouldUpdate(o),e?(this.willUpdate(o),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(o)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(o)}willUpdate(e){}_$AE(e){this._$EO?.forEach(o=>o.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(o=>this._$ET(o,this[o])),this._$EM()}updated(e){}firstUpdated(e){}};N.elementStyles=[],N.shadowRootOptions={mode:"open"},N[V("elementProperties")]=new Map,N[V("finalized")]=new Map,dt?.({ReactiveElement:N}),(ie.reactiveElementVersions??=[]).push("2.1.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pe=globalThis,re=pe.trustedTypes,we=re?re.createPolicy("lit-html",{createHTML:t=>t}):void 0,Pe="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,Le="?"+T,lt=`<${Le}>`,R=document,W=()=>R.createComment(""),G=t=>t===null||typeof t!="object"&&typeof t!="function",ue=Array.isArray,ct=t=>ue(t)||typeof t?.[Symbol.iterator]=="function",de=`[ 	
\f\r]`,q=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,$e=/-->/g,Se=/>/g,I=RegExp(`>|${de}(?:([^\\s"'>=/]+)(${de}*=${de}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),_e=/'/g,Me=/"/g,Ie=/^(?:script|style|textarea|title)$/i,ht=t=>(e,...o)=>({_$litType$:t,strings:e,values:o}),n=ht(1),U=Symbol.for("lit-noChange"),b=Symbol.for("lit-nothing"),Ce=new WeakMap,F=R.createTreeWalker(R,129);function Fe(t,e){if(!ue(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return we!==void 0?we.createHTML(e):e}const pt=(t,e)=>{const o=t.length-1,s=[];let r,i=e===2?"<svg>":e===3?"<math>":"",a=q;for(let c=0;c<o;c++){const d=t[c];let p,u,h=-1,M=0;for(;M<d.length&&(a.lastIndex=M,u=a.exec(d),u!==null);)M=a.lastIndex,a===q?u[1]==="!--"?a=$e:u[1]!==void 0?a=Se:u[2]!==void 0?(Ie.test(u[2])&&(r=RegExp("</"+u[2],"g")),a=I):u[3]!==void 0&&(a=I):a===I?u[0]===">"?(a=r??q,h=-1):u[1]===void 0?h=-2:(h=a.lastIndex-u[2].length,p=u[1],a=u[3]===void 0?I:u[3]==='"'?Me:_e):a===Me||a===_e?a=I:a===$e||a===Se?a=q:(a=I,r=void 0);const C=a===I&&t[c+1].startsWith("/>")?" ":"";i+=a===q?d+lt:h>=0?(s.push(p),d.slice(0,h)+Pe+d.slice(h)+T+C):d+T+(h===-2?c:C)}return[Fe(t,i+(t[o]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]};class Q{constructor({strings:e,_$litType$:o},s){let r;this.parts=[];let i=0,a=0;const c=e.length-1,d=this.parts,[p,u]=pt(e,o);if(this.el=Q.createElement(p,s),F.currentNode=this.el.content,o===2||o===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(r=F.nextNode())!==null&&d.length<c;){if(r.nodeType===1){if(r.hasAttributes())for(const h of r.getAttributeNames())if(h.endsWith(Pe)){const M=u[a++],C=r.getAttribute(h).split(T),X=/([.?@])?(.*)/.exec(M);d.push({type:1,index:i,name:X[2],strings:C,ctor:X[1]==="."?mt:X[1]==="?"?bt:X[1]==="@"?ft:ae}),r.removeAttribute(h)}else h.startsWith(T)&&(d.push({type:6,index:i}),r.removeAttribute(h));if(Ie.test(r.tagName)){const h=r.textContent.split(T),M=h.length-1;if(M>0){r.textContent=re?re.emptyScript:"";for(let C=0;C<M;C++)r.append(h[C],W()),F.nextNode(),d.push({type:2,index:++i});r.append(h[M],W())}}}else if(r.nodeType===8)if(r.data===Le)d.push({type:2,index:i});else{let h=-1;for(;(h=r.data.indexOf(T,h+1))!==-1;)d.push({type:7,index:i}),h+=T.length-1}i++}}static createElement(e,o){const s=R.createElement("template");return s.innerHTML=e,s}}function H(t,e,o=t,s){if(e===U)return e;let r=s!==void 0?o._$Co?.[s]:o._$Cl;const i=G(e)?void 0:e._$litDirective$;return r?.constructor!==i&&(r?._$AO?.(!1),i===void 0?r=void 0:(r=new i(t),r._$AT(t,o,s)),s!==void 0?(o._$Co??=[])[s]=r:o._$Cl=r),r!==void 0&&(e=H(t,r._$AS(t,e.values),r,s)),e}class ut{constructor(e,o){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=o}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:o},parts:s}=this._$AD,r=(e?.creationScope??R).importNode(o,!0);F.currentNode=r;let i=F.nextNode(),a=0,c=0,d=s[0];for(;d!==void 0;){if(a===d.index){let p;d.type===2?p=new Y(i,i.nextSibling,this,e):d.type===1?p=new d.ctor(i,d.name,d.strings,this,e):d.type===6&&(p=new gt(i,this,e)),this._$AV.push(p),d=s[++c]}a!==d?.index&&(i=F.nextNode(),a++)}return F.currentNode=R,r}p(e){let o=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,o),o+=s.strings.length-2):s._$AI(e[o])),o++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,o,s,r){this.type=2,this._$AH=b,this._$AN=void 0,this._$AA=e,this._$AB=o,this._$AM=s,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const o=this._$AM;return o!==void 0&&e?.nodeType===11&&(e=o.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,o=this){e=H(this,e,o),G(e)?e===b||e==null||e===""?(this._$AH!==b&&this._$AR(),this._$AH=b):e!==this._$AH&&e!==U&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):ct(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==b&&G(this._$AH)?this._$AA.nextSibling.data=e:this.T(R.createTextNode(e)),this._$AH=e}$(e){const{values:o,_$litType$:s}=e,r=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=Q.createElement(Fe(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===r)this._$AH.p(o);else{const i=new ut(r,this),a=i.u(this.options);i.p(o),this.T(a),this._$AH=i}}_$AC(e){let o=Ce.get(e.strings);return o===void 0&&Ce.set(e.strings,o=new Q(e)),o}k(e){ue(this._$AH)||(this._$AH=[],this._$AR());const o=this._$AH;let s,r=0;for(const i of e)r===o.length?o.push(s=new Y(this.O(W()),this.O(W()),this,this.options)):s=o[r],s._$AI(i),r++;r<o.length&&(this._$AR(s&&s._$AB.nextSibling,r),o.length=r)}_$AR(e=this._$AA.nextSibling,o){for(this._$AP?.(!1,!0,o);e!==this._$AB;){const s=e.nextSibling;e.remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}}class ae{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,o,s,r,i){this.type=1,this._$AH=b,this._$AN=void 0,this.element=e,this.name=o,this._$AM=r,this.options=i,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=b}_$AI(e,o=this,s,r){const i=this.strings;let a=!1;if(i===void 0)e=H(this,e,o,0),a=!G(e)||e!==this._$AH&&e!==U,a&&(this._$AH=e);else{const c=e;let d,p;for(e=i[0],d=0;d<i.length-1;d++)p=H(this,c[s+d],o,d),p===U&&(p=this._$AH[d]),a||=!G(p)||p!==this._$AH[d],p===b?e=b:e!==b&&(e+=(p??"")+i[d+1]),this._$AH[d]=p}a&&!r&&this.j(e)}j(e){e===b?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class mt extends ae{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===b?void 0:e}}class bt extends ae{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==b)}}class ft extends ae{constructor(e,o,s,r,i){super(e,o,s,r,i),this.type=5}_$AI(e,o=this){if((e=H(this,e,o,0)??b)===U)return;const s=this._$AH,r=e===b&&s!==b||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,i=e!==b&&(s===b||r);r&&this.element.removeEventListener(this.name,this,s),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class gt{constructor(e,o,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=o,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){H(this,e)}}const xt=pe.litHtmlPolyfillSupport;xt?.(Q,Y),(pe.litHtmlVersions??=[]).push("3.3.1");const vt=(t,e,o)=>{const s=o?.renderBefore??e;let r=s._$litPart$;if(r===void 0){const i=o?.renderBefore??null;s._$litPart$=r=new Y(e.insertBefore(W(),i),i,void 0,o??{})}return r._$AI(t),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const me=globalThis;class y extends N{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const o=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=vt(o,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}y._$litElement$=!0,y.finalized=!0,me.litElementHydrateSupport?.({LitElement:y});const yt=me.litElementPolyfillSupport;yt?.({LitElement:y});(me.litElementVersions??=[]).push("4.2.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const L=t=>(e,o)=>{o!==void 0?o.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const kt={attribute:!0,type:String,converter:se,reflect:!1,hasChanged:he},wt=(t=kt,e,o)=>{const{kind:s,metadata:r}=o;let i=globalThis.litPropertyMetadata.get(r);if(i===void 0&&globalThis.litPropertyMetadata.set(r,i=new Map),s==="setter"&&((t=Object.create(t)).wrapped=!0),i.set(o.name,t),s==="accessor"){const{name:a}=o;return{set(c){const d=e.get.call(this);e.set.call(this,c),this.requestUpdate(a,d,t)},init(c){return c!==void 0&&this.C(a,void 0,t,c),c}}}if(s==="setter"){const{name:a}=o;return function(c){const d=this[a];e.call(this,c),this.requestUpdate(a,d,t)}}throw Error("Unsupported decorator location: "+s)};function _(t){return(e,o)=>typeof o=="object"?wt(t,e,o):((s,r,i)=>{const a=r.hasOwnProperty(i);return r.constructor.createProperty(i,s),a?Object.getOwnPropertyDescriptor(r,i):void 0})(t,e,o)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function l(t){return _({...t,state:!0,attribute:!1})}var $t=Object.defineProperty,St=Object.getOwnPropertyDescriptor,Z=(t,e,o,s)=>{for(var r=s>1?void 0:s?St(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&$t(e,o,r),r};let D=class extends y{constructor(){super(...arguments),this.token="",this.isVerifying=!1,this.errorMessage="",this.isSuccess=!1}render(){return this.isSuccess?n`
        <div class="container">
          <div class="success-message">
            ✅ Token verified successfully! Loading your data...
            <div class="loading" style="margin-top: 12px;"></div>
          </div>
        </div>
      `:n`
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

          ${this.errorMessage?n` <div class="error-message">${this.errorMessage}</div> `:""}

          <button
            type="submit"
            class="button"
            ?disabled=${!this.token.trim()||this.isVerifying}
          >
            ${this.isVerifying?n`
                  <span class="loading"></span>
                  Verifying...
                `:"Save & Verify"}
          </button>
        </form>
      </div>
    `}handleTokenInput(t){const e=t.target;this.token=e.value,this.errorMessage=""}async handleSubmit(t){if(t.preventDefault(),!!this.token.trim()){this.isVerifying=!0,this.errorMessage="";try{const e=await chrome.runtime.sendMessage({cmd:"verifyToken",token:this.token.trim()});e.ok?(this.isSuccess=!0,setTimeout(()=>{this.dispatchEvent(new CustomEvent("token-verified",{detail:{token:this.token.trim()}}))},1500)):this.errorMessage=e.error||"Token verification failed. Please check your token and try again."}catch(e){console.error("Token verification error:",e),this.errorMessage="Failed to verify token. Please check your internet connection and try again."}finally{this.isVerifying=!1}}}};D.styles=P`
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
  `;Z([_({type:String})],D.prototype,"token",2);Z([l()],D.prototype,"isVerifying",2);Z([l()],D.prototype,"errorMessage",2);Z([l()],D.prototype,"isSuccess",2);D=Z([L("pb-token-setup")],D);function _t(t,e){if(e)return"file";const o=t.trim();if(!o)return"note";const s=o.match(/https?:\/\/[^\s]+/g);return s?.length===1&&o===s[0]?"link":"note"}var Mt=Object.defineProperty,Ct=Object.getOwnPropertyDescriptor,k=(t,e,o,s)=>{for(var r=s>1?void 0:s?Ct(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Mt(e,o,r),r};let g=class extends y{constructor(){super(...arguments),this.defaultUrl="",this.pushTitle="",this.body="",this.sendTo="all",this.sendTargets=[],this.selectedFile=null,this.isLoading=!1,this.isSending=!1,this.errorMessage="",this.successMessage="",this.messageTimeout=null}connectedCallback(){super.connectedCallback(),this.loadSendTargets(),this.defaultUrl&&(this.body=this.defaultUrl)}async loadSendTargets(){try{const[t,e,o]=await Promise.all([chrome.runtime.sendMessage({cmd:"getDevices"}),chrome.runtime.sendMessage({cmd:"GET_OWNED_CHANNELS"}),chrome.runtime.sendMessage({cmd:"getContacts"})]),s=t.ok?t.devices:[],r=e.success?e.ownedChannels:[],i=o.ok?o.contacts:[];s.length,r.length,i.length,this.sendTargets=[...s.map(d=>({id:d.iden,name:d.nickname||"Unknown Device",type:"device",icon:this.getDeviceIcon(d.type)})),...i.map(d=>({id:d.email,name:d.name,type:"contact",icon:"👤"})),...r.map(d=>({id:d.tag,name:d.name,type:"channel",icon:"📢"}))],this.sendTargets.length;const c=(await chrome.storage.local.get("pb_settings"))?.pb_settings?.defaultDevice;this.sendTo==="all"&&this.sendTargets.some(d=>d.id===c)&&(this.sendTo=c)}catch(t){console.error("Failed to load send targets:",t)}}getDeviceIcon(t){switch(t){case"android":return"📱";case"ios":return"📱";case"chrome":return"💻";case"firefox":return"🦊";case"windows":return"🖥️";case"mac":return"🖥️";default:return"📱"}}handleInputChange(t){const e=t.target,o=e.name;o==="title"?this.pushTitle=e.value:o==="body"&&(this.body=e.value)}clearMessages(){this.errorMessage="",this.successMessage="",this.messageTimeout&&(clearTimeout(this.messageTimeout),this.messageTimeout=null)}setMessageWithTimeout(t,e=!1){this.messageTimeout&&clearTimeout(this.messageTimeout),e?(this.errorMessage=t,this.successMessage=""):(this.successMessage=t,this.errorMessage=""),this.errorMessage,this.successMessage,this.messageTimeout=window.setTimeout(()=>{this.clearMessages()},1e4)}validateForm(){return!this.pushTitle.trim()&&!this.body.trim()&&!this.selectedFile?(this.setMessageWithTimeout("Please provide a title, message, or file",!0),!1):!0}handleFileSelect(t){const e=t.target;e.files&&e.files[0]?this.selectedFile=e.files[0]:this.selectedFile=null}handleSendToChange(t){const e=t.target;this.sendTo=e.value}async handleSend(){if(!this.isSending&&this.validateForm()){this.isSending=!0,this.clearMessages();try{const t=_t(this.body,this.selectedFile||void 0),e=this.sendTargets.find(r=>r.id===this.sendTo);if(!e&&this.sendTo!=="all"){this.setMessageWithTimeout("Please select a valid send target",!0),this.isSending=!1;return}let o={type:t,title:this.pushTitle.trim()||void 0,body:this.body.trim()||void 0};if(t==="link"&&(o.url=this.body.trim()),e?.type==="channel"?o.channel_tag=e.id:e?.type==="contact"?o.email=e.id:this.sendTo!=="all"&&(o.targetDeviceIden=e?.id),this.selectedFile&&t==="file"){const r=await this.selectedFile.arrayBuffer(),i={name:this.selectedFile.name,type:this.selectedFile.type,size:this.selectedFile.size,lastModified:this.selectedFile.lastModified,buffer:Array.from(new Uint8Array(r))},a=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE",payload:{fileData:i,targetDeviceIden:e?.type==="device"?e.id:void 0,email:e?.type==="contact"?e.id:void 0,title:this.pushTitle.trim()||void 0,body:this.body.trim()||void 0,channel_tag:e?.type==="channel"?e.id:void 0}});a.success?(this.setMessageWithTimeout("File sent successfully!"),this.resetForm()):this.setMessageWithTimeout(a.error||"Failed to send file",!0),this.isSending=!1;return}const s=await chrome.runtime.sendMessage({cmd:"createPush",payload:o});s.ok?(this.setMessageWithTimeout("Push sent successfully!"),this.resetForm()):this.setMessageWithTimeout(s.error||"Failed to send push",!0)}catch(t){console.error("Failed to send push:",t),this.setMessageWithTimeout("Failed to send push. Please try again.",!0)}finally{this.isSending=!1}}}resetForm(){this.pushTitle="",this.body="",this.selectedFile=null;const t=this.shadowRoot?.querySelector("#file-input");t&&(t.value="")}handleKeyDown(t){(t.ctrlKey||t.metaKey)&&t.key==="Enter"&&(t.preventDefault(),this.handleSend())}render(){return this.errorMessage,this.successMessage,n`
      <div class="composer-container" @keydown=${this.handleKeyDown}>
        ${this.errorMessage?n` <div class="message error">${this.errorMessage}</div> `:""}
        ${this.successMessage?n` <div class="message success">${this.successMessage}</div> `:""}

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
            ${this.sendTargets.map(t=>n`
                <option value=${t.id}>
                  ${t.icon} ${t.name}
                  ${t.type==="channel"?"(Channel)":""}
                </option>
              `)}
          </select>
        </div>

        <!-- File Input (always visible) -->
        <div class="form-group">
          <label for="file-input">File (optional):</label>
          <input id="file-input" type="file" @change=${this.handleFileSelect} />
          ${this.selectedFile?n`
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
          ${this.isSending?n` <span class="loading"></span> `:""}
          ${this.isSending?"Sending...":"Send Push"}
        </button>

        <div class="shortcut-hint">Press Ctrl+Enter to send quickly</div>
      </div>
    `}};g.styles=P`
    /* === Light mode base === */
    :host {
      display: flex;
      flex-direction: column;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .composer-container {
      padding: 16px 16px 32px 16px;
      flex: 1;
      min-height: 0;
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
  `;k([_({type:String})],g.prototype,"defaultUrl",2);k([l()],g.prototype,"pushTitle",2);k([l()],g.prototype,"body",2);k([l()],g.prototype,"sendTo",2);k([l()],g.prototype,"sendTargets",2);k([l()],g.prototype,"selectedFile",2);k([l()],g.prototype,"isLoading",2);k([l()],g.prototype,"isSending",2);k([l()],g.prototype,"errorMessage",2);k([l()],g.prototype,"successMessage",2);k([l()],g.prototype,"messageTimeout",2);g=k([L("pb-composer")],g);const Tt=new Set(["http:","https:"]);function be(t){if(typeof t!="string")return!1;try{return Tt.has(new URL(t).protocol)}catch{return!1}}function Re(){const t=navigator;return/mac/i.test(t.userAgentData?.platform||t.platform||"")}function De(t,e=Re()){return t.button===1?!0:t.button!==0?!1:e?t.metaKey:t.ctrlKey}function K(t,e){if(!be(t)||e&&(e.button>1||e.button===0&&e.ctrlKey&&Re()))return;const o=!!e&&De(e);o&&e.preventDefault(),chrome.tabs.create({url:t,active:!o})}function zt(t){for(const e of t.composedPath())if(e instanceof HTMLAnchorElement&&e.href)return e;return null}function Te(t){if(!De(t))return;const e=zt(t);e&&(t.preventDefault(),K(e.href,t))}function Et(t=document){t.addEventListener("click",Te,!0),t.addEventListener("auxclick",Te,!0)}var At=Object.defineProperty,Pt=Object.getOwnPropertyDescriptor,w=(t,e,o,s)=>{for(var r=s>1?void 0:s?Pt(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&At(e,o,r),r};let x=class extends y{constructor(){super(...arguments),this.pushes=[],this.isLoading=!1,this.isRefreshing=!1,this.isRestoring=!0,this.errorMessage="",this.hasMore=!1,this.activeSubtab="devices",this.devices=[],this.handleRuntimeMessage=t=>this.handleMessage(t)}connectedCallback(){super.connectedCallback(),this.loadDevices(),this.loadStoredState().finally(()=>{this.isRestoring=!1,this.loadPushes(!0)}),chrome.runtime.onMessage.addListener(this.handleRuntimeMessage)}disconnectedCallback(){super.disconnectedCallback(),chrome.runtime.onMessage.removeListener(this.handleRuntimeMessage)}async loadStoredState(){try{const t=await chrome.storage.local.get("pb_recent_pushes_state");if(t.pb_recent_pushes_state){const e=t.pb_recent_pushes_state;this.pushes=e.pushes||[],this.cursor=e.cursor,this.hasMore=e.hasMore||!1,this.lastModified=e.lastModified,this.activeSubtab=e.activeSubtab||"devices",this.pushes.length,this.cursor,this.hasMore,this.activeSubtab}}catch(t){console.error("Failed to load stored state:",t)}}async saveState(){try{const t={pushes:this.pushes,cursor:this.cursor,hasMore:this.hasMore,lastModified:this.lastModified,activeSubtab:this.activeSubtab};await chrome.storage.local.set({pb_recent_pushes_state:t})}catch(t){console.error("Failed to save state:",t)}}async loadDevices(){try{const t=await chrome.runtime.sendMessage({cmd:"getDevices"});t.ok&&(this.devices=t.devices||[]);const e=await chrome.storage.local.get("pb_device_iden");this.currentDeviceIden=e.pb_device_iden,this.currentDeviceIden}catch(t){console.error("Failed to load devices:",t)}}async loadPushes(t=!1){if(!this.isLoading){this.isLoading=!0,this.isRefreshing=t,this.errorMessage="";try{const e=t?void 0:this.lastModified;t||this.cursor,this.pushes.length;const o=await chrome.runtime.sendMessage({cmd:"getEnhancedPushHistory",limit:100,modifiedAfter:e,cursor:t?void 0:this.cursor,trigger:{type:"popup_open",timestamp:Date.now()}});if(o.ok,o.error,o.history?.pushes?.length,o.history?.cursor,o.ok){if(t)this.pushes=o.history.pushes;else{const s=new Map(this.pushes.map(i=>[i.iden,i])),r=o.history.pushes.filter(i=>!s.has(i.iden));r.length>0&&(`${r.length}`,o.history.pushes.length-r.length,this.pushes=[...this.pushes,...r])}if(this.pushes.sort((s,r)=>r.created-s.created),this.cursor=o.history.cursor,this.hasMore=!!o.history.cursor,o.history.pushes.length>0){const s=Math.max(...o.history.pushes.map(r=>r.modified));this.lastModified=s}await this.saveState(),this.pushes.length,this.cursor,this.hasMore}else console.error("❌ [RecentPushes] API returned error:",o.error),this.errorMessage=o.error||"Failed to load pushes"}catch(e){console.error("❌ [RecentPushes] Exception occurred:",e),this.errorMessage="Failed to load pushes"}finally{this.isLoading=!1,this.isRefreshing=!1}}}async handleDismiss(t){try{(await chrome.runtime.sendMessage({cmd:"dismissPush",pushIden:t})).ok?(this.pushes=this.pushes.filter(o=>o.iden!==t),await this.saveState()):this.errorMessage="Failed to dismiss push"}catch(e){this.errorMessage="Failed to dismiss push",console.error("Failed to dismiss push:",e)}}async handleDelete(t){try{const e=this.pushes.find(s=>s.iden===t);if(!e){this.errorMessage="Push not found";return}if(!this.isPushOwnedByCurrentDevice(e)){this.errorMessage="Cannot delete - you do not own this push";return}(await chrome.runtime.sendMessage({cmd:"deletePush",pushIden:t})).ok?(this.pushes=this.pushes.filter(s=>s.iden!==t),await this.saveState()):this.errorMessage="Failed to delete push"}catch(e){this.errorMessage="Failed to delete push",console.error("Failed to delete push:",e)}}handleRefresh(){this.loadPushes(!0)}handleLoadMore(){this.loadPushes(!1)}handleSubtabChange(t){this.activeSubtab=t,this.saveState()}handleMessage(t){t.cmd==="syncHistory"&&(t.source==="tickle"||t.source==="background")&&this.loadPushes(!0),t.cmd==="pushCreated"&&this.loadPushes(!0)}getFilteredPushes(){return this.activeSubtab==="channels"?this.pushes.filter(t=>t.channel_iden&&!t.receiver_iden):this.pushes.filter(t=>!t.channel_iden)}getDeviceName(t){const e=this.devices.find(o=>o.iden===t);return e?e.nickname:"Unknown Device"}getDeviceType(t){const e=this.devices.find(o=>o.iden===t);return e?e.type:"unknown"}getEmptyStateMessage(){return this.activeSubtab==="channels"?"channel pushes yet":"device pushes yet"}getEmptyStateSubMessage(){return this.activeSubtab==="channels"?"Subscribe to channels to see posts here!":"Send your first push to get started!"}isPushOwnedByCurrentDevice(t){return t.metadata?.is_owned_by_user||!1}getDeviceIcon(t){switch(t){case"android":return"📱";case"ios":return"📱";case"chrome":return"🌐";case"firefox":return"🦊";case"safari":return"🍎";case"opera":return"🔴";case"edge":return"🔵";default:return"💻"}}formatTime(t){const e=t*1e3,s=Date.now()-e,r=Math.floor(s/6e4),i=Math.floor(s/36e5),a=Math.floor(s/864e5);return r<1?"Just now":r<60?`${r}m ago`:i<24?`${i}h ago`:a<7?`${a}d ago`:new Date(e).toLocaleDateString()}getPushIcon(t){switch(t){case"note":return"📝";case"link":return"🔗";case"file":return"📎";case"address":return"📍";case"list":return"📋";default:return"📄"}}getFileIcon(t,e){if(!t&&!e)return"📎";const o=t?.toLowerCase()||"",s=e?.toLowerCase()||"";return o.startsWith("image/")||/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(s)?"🖼️":o.startsWith("video/")||/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(s)?"🎥":o.startsWith("audio/")||/\.(mp3|wav|flac|aac|ogg|m4a)$/.test(s)?"🎵":o.includes("pdf")||s.endsWith(".pdf")?"📄":o.includes("word")||/\.(doc|docx)$/.test(s)?"📝":o.includes("excel")||/\.(xls|xlsx)$/.test(s)||o.includes("powerpoint")||/\.(ppt|pptx)$/.test(s)?"📊":/\.(zip|rar|7z|tar|gz)$/.test(s)?"📦":/\.(js|ts|html|css|json|xml|py|java|cpp|c|h)$/.test(s)?"💻":"📎"}isImageFile(t){if(t.image_url)return!0;if(!t.file_type&&!t.file_name)return!1;const e=t.file_type?.toLowerCase()||"",o=t.file_name?.toLowerCase()||"";return e.startsWith("image/")||/\.(jpg|jpeg|png|gif|bmp|webp)$/.test(o)}handleFileDownload(t){t.file_url&&(chrome?.downloads?chrome.downloads.download({url:t.file_url,filename:t.file_name||"download"}):K(t.file_url))}renderFileDisplay(t){return t.type!=="file"?"":n`
      <div class="file-display">
        ${this.isImageFile(t)&&t.image_url?n`
              <div
                class="file-preview"
                @click=${e=>K(t.image_url,e)}
                @auxclick=${e=>K(t.image_url,e)}
              >
                <img
                  src="${t.image_url}"
                  alt="${t.file_name||"Image"}"
                  class="file-thumbnail"
                  loading="lazy"
                />
              </div>
            `:""}

        <div class="file-info">
          <span class="file-icon"
            >${this.getFileIcon(t.file_type,t.file_name)}</span
          >
          <div class="file-details">
            <div class="file-name">${t.file_name||"Unknown File"}</div>
            <div class="file-type">${t.file_type||"Unknown Type"}</div>
          </div>
          ${t.file_url?n`
                <button
                  class="file-download"
                  @click=${()=>this.handleFileDownload(t)}
                  title="Download file"
                >
                  📥 Download
                </button>
              `:""}
        </div>
      </div>
    `}render(){const t=this.getFilteredPushes();return n`
      <div class="pushes-container">
        <div class="pushes-header">
          <h3 class="pushes-title">Recent Pushes</h3>
          <button
            class="refresh-button"
            @click=${this.handleRefresh}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading?n` <span class="loading-spinner"></span> `:""}
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

        ${this.errorMessage?n` <div class="error">${this.errorMessage}</div> `:""}

        <div class="content-area">
          <div class="push-list">
            ${t.length===0&&!this.isLoading&&!this.isRestoring?n`
                  <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No ${this.getEmptyStateMessage()}</p>
                    <p>${this.getEmptyStateSubMessage()}</p>
                  </div>
                `:""}
            ${t.map(e=>n`
                <div class="push-item">
                  <div class="push-header">
                    <h4 class="push-title">
                      ${e.type==="file"?this.getFileIcon(e.file_type,e.file_name):this.getPushIcon(e.type)}
                      ${e.title||(e.type==="link"?e.url:e.type==="file"?e.file_name||"File":"Untitled")}
                      ${e.sender_name?n`<span
                            style="font-weight: normal; color: #666; font-size: 12px;"
                          >
                            • from ${e.sender_name}</span
                          >`:""}
                    </h4>
                    <div class="push-actions">
                      <button
                        class="action-button dismiss"
                        @click=${()=>this.handleDismiss(e.iden)}
                        title="Dismiss"
                      >
                        ✓
                      </button>
                      ${this.isPushOwnedByCurrentDevice(e)?n`
                            <button
                              class="action-button delete"
                              @click=${()=>this.handleDelete(e.iden)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          `:""}
                    </div>
                  </div>

                  ${e.body?n` <div class="push-body">${e.body}</div> `:""}
                  ${be(e.url)?n`
                        <a href=${e.url} class="push-url" target="_blank">
                          ${e.url}
                        </a>
                      `:e.url?n`<span class="push-url">${e.url}</span>`:""}
                  ${this.renderFileDisplay(e)}

                  <div class="push-meta">
                    <div class="push-info">
                      <span class="push-type">${e.type}</span>
                      ${e.channel_iden?n`<span class="channel-badge"
                            >${e.metadata?.source_channel_name||e.channel_iden}</span
                          >`:""}
                    </div>
                    <span class="push-time"
                      >${this.formatTime(e.created)}</span
                    >
                  </div>

                  <div class="device-info">
                    <span class="device-icon"
                      >${this.getDeviceIcon(this.getDeviceType(e.source_device_iden))}</span
                    >
                    <span
                      >${e.metadata?.display_source||`From: ${this.getDeviceName(e.source_device_iden)}`}</span
                    >
                    ${e.metadata?.ownership_reason?n`<span class="ownership-info"
                          >• ${e.metadata.ownership_reason}</span
                        >`:""}
                  </div>
                </div>
              `)}
            ${this.isLoading&&t.length===0?n`
                  <div class="loading">
                    <span class="loading-spinner"></span>
                    Loading pushes...
                  </div>
                `:""}
          </div>
          ${this.hasMore&&(!this.isLoading||this.isRefreshing)?n`
                <div class="load-more-container">
                  <button
                    class="load-more"
                    ?disabled=${this.isLoading}
                    @click=${this.handleLoadMore}
                  >
                    <span class="load-more-icon">📄</span>
                    Load More Pushes
                  </button>
                </div>
              `:""}
          ${this.isLoading&&!this.isRefreshing&&this.hasMore?n`
                <div class="load-more-container">
                  <button class="load-more" disabled>
                    <span class="loading-spinner"></span>
                    Loading More...
                  </button>
                </div>
              `:""}
        </div>
      </div>
    `}};x.styles=P`
    /* === Light mode base === */
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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .pushes-header {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .pushes-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .refresh-button:hover {
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .refresh-button:disabled {
      color: #6c757d;
    }

    :host-context(html[data-theme='dark']) .subtab-navigation {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .subtab-button {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subtab-button.active {
      color: #6ea8fe;
      border-bottom-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .subtab-button:hover:not(.active) {
      color: #dee2e6;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .push-item {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .push-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .push-body {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .push-url {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .push-url:hover {
      color: #9ec5fe;
    }

    :host-context(html[data-theme='dark']) .push-meta,
    :host-context(html[data-theme='dark']) .push-time {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .push-type {
      background: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .device-info {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .ownership-info {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .file-display {
      background: #2b3035;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .file-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-type {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-download {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .file-download:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .channel-badge {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error {
      background: #2c0b0e;
      color: #ea868f;
      border-color: #842029;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .load-more {
      background: #0d6efd;
      border-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .load-more:hover:not(:disabled) {
      background: #0b5ed7;
      border-color: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .load-more:disabled {
      background: #6c757d;
      border-color: #6c757d;
    }

    :host-context(html[data-theme='dark']) .loading-spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }
  `;w([l()],x.prototype,"pushes",2);w([l()],x.prototype,"isLoading",2);w([l()],x.prototype,"isRefreshing",2);w([l()],x.prototype,"isRestoring",2);w([l()],x.prototype,"errorMessage",2);w([l()],x.prototype,"hasMore",2);w([l()],x.prototype,"cursor",2);w([l()],x.prototype,"activeSubtab",2);w([l()],x.prototype,"devices",2);w([l()],x.prototype,"lastModified",2);x=w([L("pb-recent-pushes")],x);var Lt=Object.defineProperty,It=Object.getOwnPropertyDescriptor,ne=(t,e,o,s)=>{for(var r=s>1?void 0:s?It(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Lt(e,o,r),r};let B=class extends y{constructor(){super(...arguments),this.loading=!1,this.mirrors=[],this.error=null}connectedCallback(){super.connectedCallback(),this.loadMirrors()}async loadMirrors(){this.loading=!0,this.error=null;try{const t=await chrome.runtime.sendMessage({cmd:"getActiveMirrors"});t.success?(this.mirrors=t.mirrors||[],this.mirrors.length,this.mirrors.map(e=>({id:e.id,app:e.meta.application_name,title:e.meta.title}))):(this.error=t.error||"Failed to load notifications",console.error("🔍 [MirrorList] Failed to load mirrors:",t.error))}catch(t){console.error("🔍 [MirrorList] Failed to load mirrors:",t),this.error="Failed to load notifications"}finally{this.loading=!1}}async handleMirrorClick(t){try{t.id,t.meta.application_name,t.meta.title,await chrome.notifications.update(t.id,{priority:2}),setTimeout(()=>{chrome.notifications.update(t.id,{priority:0})},2e3)}catch(e){console.error("👆 [MirrorList] Failed to focus notification:",e)}}render(){return this.loading&&this.mirrors.length===0?n`
        <div class="loading-state">
          <div>Loading notifications...</div>
        </div>
      `:this.error?n`
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
      `:this.mirrors.length===0?n`
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div>No active notifications</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Phone notifications will appear here
          </div>
        </div>
      `:n`
      <div class="mirror-list">
        ${this.mirrors.map(t=>n`
            <div class="shortcut-hint">Dismiss on origin device</div>
            <div
              class="mirror-item"
              @click=${()=>this.handleMirrorClick(t)}
              title="Click to focus notification"
            >
              <div class="app-icon">
                ${t.meta.icon_url?n`
                      <img
                        src="${t.meta.icon_url}"
                        alt="${t.meta.application_name||"App"}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                      />
                    `:n`
                      ${(t.meta.application_name||"A").charAt(0).toUpperCase()}
                    `}
              </div>
              <div class="mirror-content">
                <div class="app-name">
                  ${t.meta.application_name||t.meta.package_name}
                </div>
                <div class="notification-title">${t.meta.title}</div>
                <div class="notification-body">${t.meta.body}</div>
              </div>
            </div>
          `)}
      </div>
    `}};B.styles=P`
    /* === Light mode base === */
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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .mirror-list {
      border-color: #495057;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .mirror-item {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .mirror-item:hover {
      background-color: #343a40;
    }

    :host-context(html[data-theme='dark']) .mirror-item:active {
      background-color: #495057;
    }

    :host-context(html[data-theme='dark']) .app-icon {
      background: #495057;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .app-name {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .notification-title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .notification-body {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .loading-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-state {
      background: #2c0b0e;
      border-color: #842029;
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .refresh-button:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .refresh-button:disabled {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark']) .shortcut-hint {
      color: rgba(222, 226, 230, 0.75);
      background: #2b3035;
      border-color: #495057;
    }
  `;ne([_({type:Boolean})],B.prototype,"loading",2);ne([l()],B.prototype,"mirrors",2);ne([l()],B.prototype,"error",2);B=ne([L("pb-mirror-list")],B);var Ft=Object.defineProperty,Rt=Object.getOwnPropertyDescriptor,J=(t,e,o,s)=>{for(var r=s>1?void 0:s?Rt(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Ft(e,o,r),r};let O=class extends y{constructor(){super(...arguments),this.dragOver=!1,this.uploadState={file:null,uploading:!1,progress:0,error:null},this.maxFileSize=25*1024*1024}render(){return n`
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

        ${this.uploadState.file?n`
              <div class="file-info">
                <div class="file-name">${this.uploadState.file.name}</div>
                <div class="file-size">
                  ${this.formatFileSize(this.uploadState.file.size)}
                </div>

                ${this.uploadState.uploading?n`
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
                ${this.uploadState.error?n`
                      <div class="error-message">${this.uploadState.error}</div>
                    `:""}

                <div class="button-group">
                  ${this.uploadState.uploading?"":n`
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
            `:n`
              <div class="drop-icon">📁</div>
              <div class="drop-text">Drop a file here or click to browse</div>
              <div class="drop-hint">Maximum file size: 25MB</div>
            `}
      </div>
    `}getZoneClasses(){const t=[];return this.dragOver&&t.push("drag-over"),this.uploadState.error&&t.push("error"),this.uploadState.uploading&&t.push("uploading"),t.join(" ")}handleZoneClick(t){if(t.target.tagName==="BUTTON")return;this.shadowRoot?.querySelector(".file-input")?.click()}handleFileSelect(t){const o=t.target.files?.[0];o&&this.setFile(o)}handleDragEnter(t){t.preventDefault(),this.dragOver=!0}handleDragOver(t){t.preventDefault(),this.dragOver=!0}handleDragLeave(t){t.preventDefault(),this.dragOver=!1}handleDrop(t){t.preventDefault(),this.dragOver=!1;const e=t.dataTransfer?.files;e&&e.length>0&&this.setFile(e[0])}setFile(t){this.uploadState={file:t,uploading:!1,progress:0,error:null},this.isFileValid(t)||(this.uploadState.error=`File size (${this.formatFileSize(t.size)}) exceeds the 25MB limit`)}isFileValid(t){return t.size<=this.maxFileSize}formatFileSize(t){if(t===0)return"0 Bytes";const e=1024,o=["Bytes","KB","MB","GB"],s=Math.floor(Math.log(t)/Math.log(e));return parseFloat((t/Math.pow(e,s)).toFixed(2))+" "+o[s]}async handleUpload(){if(!(!this.uploadState.file||!this.isFileValid(this.uploadState.file))){this.uploadState.uploading=!0,this.uploadState.progress=0,this.uploadState.error=null;try{const t=await this.uploadState.file.arrayBuffer(),e={name:this.uploadState.file.name,type:this.uploadState.file.type,size:this.uploadState.file.size,lastModified:this.uploadState.file.lastModified,buffer:Array.from(new Uint8Array(t))},o=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE",payload:{fileData:e,targetDeviceIden:this.targetDeviceIden}});o.success?(this.dispatchEvent(new CustomEvent("upload-complete",{detail:{file:this.uploadState.file}})),this.uploadState={file:null,uploading:!1,progress:0,error:null}):(this.uploadState.error=o.error||"Upload failed",this.uploadState.uploading=!1)}catch(t){console.error("Upload error:",t),this.uploadState.error="Upload failed. Please try again.",this.uploadState.uploading=!1}}}handleCancel(){this.uploadState={file:null,uploading:!1,progress:0,error:null};const t=this.shadowRoot?.querySelector(".file-input");t&&(t.value="")}updateProgress(t){this.uploadState.uploading&&(this.uploadState.progress=t)}setError(t){this.uploadState.error=t,this.uploadState.uploading=!1}};O.styles=P`
    /* === Light mode base === */
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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone {
      border-color: #495057;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone:hover {
      border-color: #0d6efd;
      background: #031633;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.drag-over {
      border-color: #0d6efd;
      background: #031633;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.error {
      border-color: #ea868f;
      background: #2c0b0e;
    }

    :host-context(html[data-theme='dark']) .file-drop-zone.uploading {
      border-color: #75b798;
      background: #051b11;
    }

    :host-context(html[data-theme='dark']) .drop-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .drop-text {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .drop-hint {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .file-info {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .file-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-size {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .progress-bar {
      background: #495057;
    }

    :host-context(html[data-theme='dark']) .progress-fill {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .progress-text {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-message {
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .upload-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .upload-button:hover:not(:disabled) {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .upload-button:disabled {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark']) .cancel-button {
      background: #6c757d;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .cancel-button:hover {
      background: #5c636a;
    }
  `;J([_({type:String})],O.prototype,"targetDeviceIden",2);J([l()],O.prototype,"dragOver",2);J([l()],O.prototype,"uploadState",2);J([l()],O.prototype,"maxFileSize",2);O=J([L("pb-file-drop")],O);var Dt=Object.defineProperty,Ot=Object.getOwnPropertyDescriptor,f=(t,e,o,s)=>{for(var r=s>1?void 0:s?Ot(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Dt(e,o,r),r};let m=class extends y{constructor(){super(...arguments),this.conversationId="",this.deviceIden="",this.isGroupConversation=!1,this.thread=null,this.messageText="",this.isLoading=!1,this.isSending=!1,this.selectedFile=null,this.sendError="",this.recipients=[],this.newRecipientNumber="",this.isLoadingOlder=!1,this.hasMoreMessages=!0,this.messageCursor=null,this.conversationNotFound=!1,this.isReloading=!1,this.drafts=new Map,this.pendingSend=null,this.latestLoad=0,this.handleStorageChange=(t,e)=>{if(e!=="local"||!this.deviceIden||!this.conversationId)return;const s=t[`sms_data_${this.deviceIden}`]?.newValue?.threads?.find(a=>a.id===this.conversationId);if(!s||this.isLoading)return;const r=s.messages[0]?.timestamp??1/0,i=(this.thread?.messages??[]).filter(a=>a.timestamp<r);this.thread={...s,messages:[...i,...s.messages]}}}get smsCursorStorageKey(){return`pb_sms_thread_cursor_${this.conversationId}`}showSendError(t,e){t===this.conversationId&&(this.sendError=e)}switchDraft(t){t&&(this.messageText?this.drafts.set(t,this.messageText):this.drafts.delete(t)),this.sendError="",this.messageText=this.drafts.get(this.conversationId)??"",this.selectedFile=null;const e=this.shadowRoot?.querySelector(".file-input");e&&(e.value="")}disconnectedCallback(){super.disconnectedCallback(),chrome.storage.onChanged?.removeListener(this.handleStorageChange)}connectedCallback(){super.connectedCallback(),chrome.storage.onChanged?.addListener(this.handleStorageChange),this.loadThread(),this.initializeRecipients(),setTimeout(()=>this.scrollToBottom(),200)}updated(t){t.has("conversationId")&&this.switchDraft(t.get("conversationId")),t.has("conversationId")&&this.conversationId&&(this.thread=null,this.messageCursor=null,this.loadThread(),this.initializeRecipients()),t.has("thread")&&this.thread&&this.scrollToBottom()}initializeRecipients(){if(this.conversationId&&this.isGroupConversation){const t=this.conversationId.split(",").map(e=>e.trim());this.recipients=t.map(e=>({number:e,name:e}))}else this.conversationId&&!this.isGroupConversation?this.recipients=[{number:this.conversationId,name:this.conversationId}]:this.recipients=[]}async loadThread(){if(!this.conversationId){this.thread=null;return}const t=this.conversationId,e=++this.latestLoad;this.isLoading=!0;try{this.conversationId;let o=this.deviceIden;if(!o)try{const r=await chrome.runtime.sendMessage({cmd:"GET_DEFAULT_SMS_DEVICE"});if(r.success&&r.device)o=r.device.iden;else throw console.error("💬 [SmsThread] Failed to get default SMS device:",r.error),new Error(r.error||"No SMS device available")}catch(r){throw console.error("💬 [SmsThread] Error getting default SMS device:",r),new Error("No SMS device available")}this.deviceIden=o,await this.loadStoredCursor();const s=await chrome.runtime.sendMessage({cmd:"LOAD_FULL_SMS_THREAD",conversationId:t,deviceIden:o});if(e!==this.latestLoad)return;if(s.success){this.thread=s.thread,this.messageCursor=s.cursor||null,this.hasMoreMessages=s.hasMore||!1,await this.saveStoredCursor();try{await chrome.runtime.sendMessage({cmd:"CLEAR_SMS_NOTIFICATIONS"})}catch(r){console.error("💬 [SmsThread] Failed to clear SMS notifications:",r)}this.scrollToBottom(),setTimeout(()=>this.scrollToBottom(),300),this.conversationId,this.deviceIden,this.thread?.messages?.length}else console.error("💬 [SmsThread] Failed to load thread from API:",s.error)}catch(o){console.error("💬 [SmsThread] Failed to load thread from API:",o)}finally{e===this.latestLoad&&(this.isLoading=!1)}}async loadOlderMessages(){if(!this.conversationId||this.isLoadingOlder||!this.hasMoreMessages)return;const t=this.conversationId;this.isLoadingOlder=!0;try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_THREAD_PAGED",conversationId:t,cursor:this.messageCursor});if(t!==this.conversationId)return;if(e.success&&this.thread){const o=e.messages||[];this.thread={...this.thread,messages:[...o,...this.thread.messages]},this.messageCursor=e.cursor||null,this.hasMoreMessages=e.hasMore||!1,await this.saveStoredCursor()}}catch(e){console.error("Failed to load older messages:",e)}finally{this.isLoadingOlder=!1}}scrollToBottom(){this.updateComplete.then(()=>{const t=this.shadowRoot?.querySelector(".messages-container");if(t){const e=t;e.scrollHeight,e.clientHeight,e.scrollTop,e.offsetHeight;const o=t.querySelectorAll("img"),s=Array.from(o).map(r=>r.complete?Promise.resolve():new Promise(i=>{r.onload=i,r.onerror=i}));Promise.all(s).then(()=>{e.scrollHeight<=e.clientHeight||requestAnimationFrame(()=>{const r=e.scrollHeight-e.clientHeight;e.scrollTop=r,setTimeout(()=>{const i=e.scrollTop,a=e.scrollHeight-e.clientHeight;Math.abs(i-a)>5&&(e.scrollTop=a)},100)})})}})}handleScrollTop(){const t=this.shadowRoot?.querySelector(".messages-container");t&&t.scrollTop===0&&this.hasMoreMessages&&this.loadOlderMessages()}async loadStoredCursor(){try{const t=await chrome.storage.local.get(this.smsCursorStorageKey);t[this.smsCursorStorageKey]&&(this.messageCursor=t[this.smsCursorStorageKey],`${this.conversationId}`,this.messageCursor)}catch(t){console.error("Failed to load stored SMS cursor:",t)}}async saveStoredCursor(){try{await chrome.storage.local.set({[this.smsCursorStorageKey]:this.messageCursor}),`${this.conversationId}`,this.messageCursor}catch(t){console.error("Failed to save SMS cursor:",t)}}handleInputChange(t){const e=t.target;this.messageText=e.value,e.style.height="auto",e.style.height=Math.min(e.scrollHeight,120)+"px"}handleKeyDown(t){t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.sendMessage())}handleRecipientInputChange(t){const e=t.target;this.newRecipientNumber=e.value}handleRecipientInputKeyDown(t){t.key==="Enter"&&(t.preventDefault(),this.addRecipient())}addRecipient(){const t=this.newRecipientNumber.trim();if(t&&/^\+?[\d\s\-()]+$/.test(t)){if(this.recipients.some(e=>e.number===t)){this.newRecipientNumber="";return}this.recipients=[...this.recipients,{number:t,name:t}],this.newRecipientNumber="",this.updateGroupConversationId()}}removeRecipient(t){this.recipients=this.recipients.filter(e=>e.number!==t),this.updateGroupConversationId()}updateGroupConversationId(){this.recipients.length>1?(this.conversationId=this.recipients.map(t=>t.number).join(","),this.isGroupConversation=!0):this.recipients.length===1?(this.conversationId=this.recipients[0].number,this.isGroupConversation=!1):(this.conversationId="",this.isGroupConversation=!1)}handleFileSelect(t){const o=t.target.files?.[0];if(o){if(o.size>25*1024*1024){console.error("File too large. Maximum size is 25MB.");return}if(!o.type.startsWith("image/")){console.error("Only image files are supported for MMS.");return}this.selectedFile=o}}removeSelectedFile(){this.selectedFile=null;const t=this.shadowRoot?.querySelector(".file-input");t&&(t.value="")}formatFileSize(t){if(t===0)return"0 Bytes";const e=1024,o=["Bytes","KB","MB"],s=Math.floor(Math.log(t)/Math.log(e));return parseFloat((t/Math.pow(e,s)).toFixed(1))+" "+o[s]}async sendMessage(){if(this.selectedFile,this.conversationId,this.deviceIden,this.isSending,!this.messageText.trim()&&!this.selectedFile||!this.conversationId||!this.deviceIden||this.isSending)return;const t=this.conversationId,e=this.deviceIden,o=this.messageText,s=this.selectedFile,r=`${t}|${o}|${s?.name??""}`;this.pendingSend?.key!==r&&(this.pendingSend={key:r,guid:crypto.randomUUID()});const i=this.pendingSend.guid;this.sendError="",this.isSending=!0;try{let a;if(s){const d=await s.arrayBuffer(),p={name:s.name,type:s.type,size:s.size,lastModified:s.lastModified,buffer:Array.from(new Uint8Array(d))},u=await chrome.runtime.sendMessage({cmd:"UPLOAD_FILE_FOR_SMS",payload:{fileData:p,targetDeviceIden:e}});if(!u.success){console.error("Failed to upload file:",u.error),this.showSendError(t,"The attachment couldn't be uploaded, so nothing was sent. Please try again.");return}a=[{content_type:s.type,name:s.name,url:u.fileUrl}]}const c=await chrome.runtime.sendMessage({cmd:"SEND_SMS",payload:{conversationId:t,message:o,deviceIden:e,attachments:a,guid:i}});if(c.success){if(this.pendingSend=null,this.drafts.delete(t),this.conversationId!==t)return;this.messageText="",this.selectedFile=null,this.requestUpdate(),await this.loadThread(),this.dispatchEvent(new CustomEvent("message-sent",{detail:{conversationId:this.conversationId},bubbles:!0}))}else console.error("Failed to send SMS:",c.error),c.error&&c.error.includes("CONVERSATION_NOT_FOUND:")&&(this.conversationNotFound=!0),this.showSendError(t,"This message couldn't be sent. Your text is still here, so you can try again.")}catch(a){console.error("Failed to send message:",a),this.showSendError(t,"This message couldn't be sent. Your text is still here, so you can try again.")}finally{this.isSending=!1}}formatTime(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}async reloadThread(){if(!this.conversationId||!this.deviceIden||this.isReloading)return;const t=this.conversationId;this.conversationId,this.isReloading=!0,this.conversationNotFound=!1;try{const e=await chrome.runtime.sendMessage({cmd:"RELOAD_SMS_THREAD",deviceIden:this.deviceIden,threadId:t});if(t!==this.conversationId)return;e.success&&e.thread?(this.thread=e.thread,this.conversationNotFound=!1,this.dispatchEvent(new CustomEvent("thread-reloaded",{detail:{conversationId:this.conversationId},bubbles:!0}))):console.error("💬 [SmsThread] Failed to reload thread:",e.error)}catch(e){console.error("💬 [SmsThread] Error reloading thread:",e)}finally{this.isReloading=!1}}openImage(t,e){K(t,e)}render(){return this.isLoading?n`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversation...
        </div>
      `:this.thread?this.conversationNotFound?n`
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
            ${this.isReloading?n`<div class="spinner-small"></div>
                  Reloading...`:"Reload Conversation"}
          </button>
        </div>
      `:n`
      <div class="thread-header">
        <div class="contact-name">${this.thread.name}</div>
        ${this.thread.unreadCount>0?n` <div class="unread-badge">${this.thread.unreadCount}</div> `:""}
      </div>

      <div
        class="messages-container"
        role="log"
        aria-label="Message history"
        @scroll="${this.handleScrollTop}"
      >
        ${this.hasMoreMessages?n`
              <button
                class="load-older-btn"
                @click=${this.loadOlderMessages}
                ?disabled=${this.isLoadingOlder}
              >
                ${this.isLoadingOlder?n`
                      <div
                        class="spinner"
                        style="width: 14px; height: 14px; margin-right: 6px;"
                      ></div>
                      Loading older messages...
                    `:"Load older messages"}
              </button>
            `:""}
        ${this.thread.messages.map(t=>n`
            <div class="message ${t.inbound?"inbound":"outbound"}">
              <div class="message-bubble">
                <div>${t.text}</div>
                ${t.image_url?n`
                      <img
                        class="message-image"
                        src="${t.image_url}"
                        alt="Message attachment"
                        @click=${e=>this.openImage(t.image_url,e)}
                        @auxclick=${e=>this.openImage(t.image_url,e)}
                      />
                    `:""}
                <div class="message-time">
                  ${this.formatTime(t.timestamp)}
                </div>
              </div>
            </div>
          `)}
      </div>

      <div class="input-container">
        ${this.isGroupConversation||this.recipients.length===0?n`
              <div class="recipients-container">
                <div class="recipients-label">Recipients:</div>

                ${this.recipients.length>0?n`
                      <div class="recipients-list">
                        ${this.recipients.map(t=>n`
                            <div class="recipient-chip">
                              <span>${t.name}</span>
                              <button
                                class="remove-btn"
                                @click=${()=>this.removeRecipient(t.number)}
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
          ${this.sendError?n`<div class="send-error" role="alert">${this.sendError}</div>`:""}
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

          ${this.selectedFile?n`
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
    `:n`
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
          </svg>
          <p>Select a conversation to start messaging</p>
        </div>
      `}};m.styles=P`
    /* === Light mode base === */
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

    .send-error {
      margin: 0 0 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      background: #fee2e2;
      color: #991b1b;
    }

    :host-context(html[data-theme='dark']) .send-error {
      background: #7f1d1d;
      color: #fee2e2;
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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      background: #212529;
      color: #dee2e6;
    }

    /* Header */
    :host-context(html[data-theme='dark']) .thread-header {
      background: #343a40;
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .contact-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .unread-badge {
      background: #0d6efd;
      color: #fff;
    }

    /* Messages */
    :host-context(html[data-theme='dark']) .message.inbound .message-bubble {
      background: #343a40;
      color: #dee2e6;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .message.outbound .message-bubble {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .message-time {
      color: #868e96;
    }

    /* Input area */
    :host-context(html[data-theme='dark']) .input-container {
      background: #343a40;
      border-top-color: #495057;
    }

    :host-context(html[data-theme='dark']) .recipients-label,
    :host-context(html[data-theme='dark']) .device-info {
      color: #adb5bd;
    }

    /* Recipient chips */
    :host-context(html[data-theme='dark']) .recipient-chip {
      background: #031633; /* primary-bg-subtle */
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .recipient-chip .remove-btn {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .recipient-chip .remove-btn:hover {
      color: #ea868f;
    }

    /* Text inputs */
    :host-context(html[data-theme='dark']) .recipient-input,
    :host-context(html[data-theme='dark']) .message-input {
      background: #2b3035;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .recipient-input:focus,
    :host-context(html[data-theme='dark']) .message-input:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
      outline: 0;
    }

    /* Buttons */
    :host-context(html[data-theme='dark']) .add-recipient-btn,
    :host-context(html[data-theme='dark']) .send-button,
    :host-context(html[data-theme='dark']) .reload-button {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark'])
      .add-recipient-btn:hover:not(:disabled),
    :host-context(html[data-theme='dark']) .send-button:hover:not(:disabled),
    :host-context(html[data-theme='dark']) .reload-button:hover:not(:disabled) {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .add-recipient-btn:disabled,
    :host-context(html[data-theme='dark']) .send-button:disabled,
    :host-context(html[data-theme='dark']) .reload-button:disabled {
      background: #6c757d;
      color: #fff;
    }

    /* File select and selected file */
    :host-context(html[data-theme='dark']) .file-select-btn,
    :host-context(html[data-theme='dark']) .selected-file {
      background: #2b3035;
      border-color: #495057;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-select-btn:hover {
      background: #343a40;
    }

    :host-context(html[data-theme='dark']) .file-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .file-info {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .file-size {
      color: #868e96;
    }

    /* Load older */
    :host-context(html[data-theme='dark']) .load-older-btn {
      background: #2b3035;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark'])
      .load-older-btn:hover:not(:disabled) {
      background: #343a40;
    }

    /* States */
    :host-context(html[data-theme='dark']) .empty-state,
    :host-context(html[data-theme='dark']) .error-state,
    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .error-icon {
      color: #ea868f;
    }

    /* Spinners */
    :host-context(html[data-theme='dark']) .spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .spinner-small {
      color: #6ea8fe;
    }
  `;f([_({type:String})],m.prototype,"conversationId",2);f([_({type:String})],m.prototype,"deviceIden",2);f([_({type:Boolean})],m.prototype,"isGroupConversation",2);f([l()],m.prototype,"thread",2);f([l()],m.prototype,"messageText",2);f([l()],m.prototype,"isLoading",2);f([l()],m.prototype,"isSending",2);f([l()],m.prototype,"selectedFile",2);f([l()],m.prototype,"sendError",2);f([l()],m.prototype,"recipients",2);f([l()],m.prototype,"newRecipientNumber",2);f([l()],m.prototype,"isLoadingOlder",2);f([l()],m.prototype,"hasMoreMessages",2);f([l()],m.prototype,"messageCursor",2);f([l()],m.prototype,"conversationNotFound",2);f([l()],m.prototype,"isReloading",2);m=f([L("pb-sms-thread")],m);var Nt=Object.defineProperty,Ut=Object.getOwnPropertyDescriptor,j=(t,e,o,s)=>{for(var r=s>1?void 0:s?Ut(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Nt(e,o,r),r};let A=class extends y{constructor(){super(...arguments),this.selectedConversationId="",this.conversations=[],this.searchQuery="",this.isLoading=!1,this.filteredConversations=[],this.savedDataKey=null,this.syncsSeen=0,this.handleStorageChange=(t,e)=>{if(e!=="local"||!this.savedDataKey)return;const o=t[this.savedDataKey]?.newValue?.threads;o&&(this.syncsSeen++,this.conversations=o,this.filterConversations())}}connectedCallback(){super.connectedCallback(),this.showSavedConversations().finally(()=>this.loadConversations()),chrome.storage.onChanged?.addListener(this.handleStorageChange)}disconnectedCallback(){super.disconnectedCallback(),chrome.storage.onChanged?.removeListener(this.handleStorageChange)}async showSavedConversations(){const{defaultSmsDevice:t}=await chrome.storage.local.get("defaultSmsDevice");if(!t)return;this.savedDataKey=`sms_data_${t}`;const e=this.savedDataKey,o=await chrome.storage.local.get(e);o?.[e]?.threads&&!this.conversations.length&&(this.conversations=o[e].threads,this.filterConversations())}async loadConversations(){this.isLoading=!0;const t=this.syncsSeen;try{const e=await chrome.runtime.sendMessage({cmd:"GET_SMS_CONVERSATIONS_FROM_API"});if(e?.success,!e){console.error("[ConversationList] No response from background script");return}if(e.success)`${e.conversations?.length||0}`,this.syncsSeen===t&&(this.conversations=e.conversations||[],this.filterConversations());else{const o=e.error||"Unknown error occurred";console.error("[ConversationList] Failed to load conversations from API:",o),console.error("[ConversationList] Full error response:",e)}}catch(e){console.error("[ConversationList] Exception while loading conversations from API:",e)}finally{this.isLoading=!1}}filterConversations(){if(!this.searchQuery.trim())this.filteredConversations=this.conversations;else{const t=this.searchQuery.toLowerCase();this.filteredConversations=this.conversations.filter(e=>e.name.toLowerCase().includes(t)||e.id.toLowerCase().includes(t))}}handleSearchInput(t){const e=t.target;this.searchQuery=e.value,this.filterConversations()}selectConversation(t){this.selectedConversationId=t;const e=this.conversations.find(s=>s.id===t),o=e?.name||e?.recipients?.map(s=>s.name).join(", ")||"Unknown";this.dispatchEvent(new CustomEvent("conversation-selected",{detail:{conversationId:t,conversationName:o},bubbles:!0,composed:!0})),chrome.runtime.sendMessage({cmd:"MARK_CONVERSATION_READ",conversationId:t,deviceIden:this.conversations.find(s=>s.id===t)?.deviceIden}),this.conversations=this.conversations.map(s=>s.id===t?{...s,unreadCount:0}:s),this.filterConversations()}getInitials(t){return t.split(" ").map(e=>e.charAt(0)).join("").toUpperCase().slice(0,2)}formatTime(t){const e=new Date(t),s=new Date().getTime()-e.getTime(),r=Math.floor(s/(1e3*60*60*24));return r===0?e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):r===1?"Yesterday":r<7?e.toLocaleDateString([],{weekday:"short"}):e.toLocaleDateString([],{month:"short",day:"numeric"})}getLastMessage(t){const e=t.messages[t.messages.length-1];return e?e.image_url?e.inbound?"📷 Image":"📷 You sent an image":e.text||"No text":"No messages"}render(){return this.isLoading&&this.conversations.length===0?n`
        <div class="loading">
          <div class="spinner"></div>
          Loading conversations...
        </div>
      `:this.conversations.length===0?n`
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
      `:n`
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
        ${this.filteredConversations.length===0&&this.searchQuery?n`
              <div class="no-results">
                <p>No conversations found for "${this.searchQuery}"</p>
              </div>
            `:""}
        ${this.filteredConversations.map(t=>n`
            <div
              class="conversation-item ${t.id===this.selectedConversationId?"selected":""}"
              role="button"
              tabindex="0"
              @click="${()=>this.selectConversation(t.id)}"
              @keydown="${e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.selectConversation(t.id))}}"
            >
              <div class="avatar">${this.getInitials(t.name)}</div>

              <div class="conversation-content">
                <div class="contact-name">${t.name}</div>
                <div class="last-message">
                  ${this.getLastMessage(t)}
                </div>
              </div>

              <div class="conversation-meta">
                <div class="timestamp">
                  ${this.formatTime(t.lastMessageTime)}
                </div>
                ${t.unreadCount>0?n`
                      <div class="unread-badge">
                        ${t.unreadCount}
                      </div>
                    `:""}
              </div>
            </div>
          `)}
      </div>
    `}};A.styles=P`
    /* === Light mode base === */
    .conversation-item:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: -2px;
    }

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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      background: #212529;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .header {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .title {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input {
      background: #343a40;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }

    :host-context(html[data-theme='dark']) .search-icon {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .conversation-item {
      border-bottom-color: #2b3035;
    }

    :host-context(html[data-theme='dark']) .conversation-item:hover {
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .conversation-item.selected {
      background: #031633;
      border-left-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .avatar {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .contact-name {
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .last-message {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .timestamp {
      color: #868e96;
    }

    :host-context(html[data-theme='dark']) .unread-badge {
      background: #0d6efd;
      color: #fff;
    }

    :host-context(html[data-theme='dark']) .empty-state {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .loading {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .spinner {
      border-color: #343a40;
      border-top-color: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .no-results {
      color: #adb5bd;
    }
  `;j([_({type:String})],A.prototype,"selectedConversationId",2);j([l()],A.prototype,"conversations",2);j([l()],A.prototype,"searchQuery",2);j([l()],A.prototype,"isLoading",2);j([l()],A.prototype,"filteredConversations",2);A=j([L("pb-conversation-list")],A);var Ht=Object.defineProperty,Bt=Object.getOwnPropertyDescriptor,$=(t,e,o,s)=>{for(var r=s>1?void 0:s?Bt(e,o):e,i=t.length-1,a;i>=0;i--)(a=t[i])&&(r=(s?a(e,o,r):a(r))||r);return s&&r&&Ht(e,o,r),r};let v=class extends y{constructor(){super(...arguments),this.subscriptions=[],this.searchQuery="",this.searchResults=[],this.isLoading=!1,this.isSearching=!1,this.errorMessage="",this.successMessage="",this.activeSubtab="discover",this.subscriptionPosts=[],this.isLoadingPosts=!1,this.searchTimeout=null}connectedCallback(){super.connectedCallback(),this.loadSubscriptions()}async loadSubscriptions(){try{const t=await chrome.storage.local.get("pb_channel_subs");t?.pb_channel_subs?.subscriptions&&!this.subscriptions.length&&(this.subscriptions=t.pb_channel_subs.subscriptions),this.isLoading=!0;const e=await chrome.runtime.sendMessage({cmd:"GET_CHANNEL_SUBSCRIPTIONS",forceRefresh:!1});e.success?this.subscriptions=e.subscriptions:this.errorMessage=e.error||"Failed to load subscriptions"}catch(t){this.errorMessage="Failed to load subscriptions",console.error("Failed to load subscriptions:",t)}finally{this.isLoading=!1}}onSearchInput(t){const e=t.target;if(this.searchQuery=e.value.trim(),this.searchTimeout&&clearTimeout(this.searchTimeout),!this.searchQuery){this.searchResults=[],this.isSearching=!1;return}this.searchTimeout=window.setTimeout(()=>{this.searchChannels()},250)}async searchChannels(){if(this.searchQuery)try{this.isSearching=!0,this.errorMessage="";const t=await chrome.runtime.sendMessage({cmd:"GET_CHANNEL_INFO",channelTag:this.searchQuery});t.success?this.searchResults=[t.channelInfo]:t.error==="Channel not found"?this.searchResults=[]:(this.errorMessage=t.error||"Failed to search channels",this.searchResults=[])}catch(t){this.errorMessage="Failed to search channels",this.searchResults=[],console.error("Failed to search channels:",t)}finally{this.isSearching=!1}}async subscribeToChannel(t){try{this.errorMessage="",this.successMessage="";const e=await chrome.runtime.sendMessage({cmd:"SUBSCRIBE_TO_CHANNEL",channelTag:t});e.success?(this.successMessage=`Successfully subscribed to ${t}`,await this.loadSubscriptions(),this.searchResults=[],this.searchQuery=""):this.errorMessage=e.error||"Failed to subscribe to channel"}catch(e){this.errorMessage="Failed to subscribe to channel",console.error("Failed to subscribe to channel:",e)}}async unsubscribeFromChannel(t){try{this.errorMessage="",this.successMessage="";const e=await chrome.runtime.sendMessage({cmd:"UNSUBSCRIBE_FROM_CHANNEL",subscriptionIden:t});e.success?(this.successMessage="Successfully unsubscribed from channel",await this.loadSubscriptions()):this.errorMessage=e.error||"Failed to unsubscribe from channel"}catch(e){this.errorMessage="Failed to unsubscribe from channel",console.error("Failed to unsubscribe from channel:",e)}}isSubscribedToChannel(t){return this.subscriptions.some(e=>e.channel?.tag===t&&e.active)}handleSubtabChange(t){this.activeSubtab=t,t==="recent"&&this.loadSubscriptionPosts()}async loadSubscriptionPosts(){try{this.isLoadingPosts=!0,this.errorMessage="";const t=await chrome.runtime.sendMessage({cmd:"GET_SUBSCRIPTION_POSTS"});t.success?this.subscriptionPosts=t.posts:this.errorMessage=t.error||"Failed to load subscription posts"}catch(t){this.errorMessage="Failed to load subscription posts",console.error("Failed to load subscription posts:",t)}finally{this.isLoadingPosts=!1}}async refreshSubscriptions(){try{this.isLoading=!0,this.errorMessage="";const t=await chrome.runtime.sendMessage({cmd:"REFRESH_CHANNEL_DATA"});t.success?(this.successMessage="Subscriptions refreshed successfully",await this.loadSubscriptions(),setTimeout(()=>{this.successMessage=""},3e3)):this.errorMessage=t.error||"Failed to refresh subscriptions"}catch(t){this.errorMessage="Failed to refresh subscriptions",console.error("Failed to refresh subscriptions:",t)}finally{this.isLoading=!1}}renderChannelIcon(t){return t?t.image_url?n`<img
        src="${t.image_url}"
        alt="${t.name||"Channel"}"
        class="channel-icon"
      />`:n`<div class="channel-icon">
      ${t.name?t.name.charAt(0).toUpperCase():"?"}
    </div>`:n`<div class="channel-icon">?</div>`}renderSearchResults(){return this.isSearching?n`<div class="loading">Searching...</div>`:this.searchResults.length===0&&this.searchQuery?n`<div class="empty-state">
        No channels found for "${this.searchQuery}"
      </div>`:n`
      <div class="search-results">
        ${this.searchResults.map(t=>{const e=this.isSubscribedToChannel(t?.tag||"");return n`
            <div class="channel-card">
              ${this.renderChannelIcon(t)}
              <div class="channel-info">
                <div class="channel-name">
                  ${t?.name||"Unknown Channel"}
                </div>
                <div class="channel-description">
                  ${t?.description||"No description available"}
                </div>
                <div class="channel-tag">@${t?.tag||"unknown"}</div>
              </div>
              ${e?n`<div class="subscribed-badge">Subscribed</div>`:n`<button
                    class="subscribe-button"
                    @click=${()=>this.subscribeToChannel(t?.tag||"")}
                  >
                    Subscribe
                  </button>`}
            </div>
          `})}
      </div>
    `}renderSubscriptions(){return this.isLoading&&this.subscriptions.length===0?n`<div class="loading">Loading subscriptions...</div>`:this.subscriptions.length===0?n`<div class="empty-state">No channel subscriptions yet</div>`:n`
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
        ${this.subscriptions.map(t=>n`
            <div class="subscription-item">
              ${this.renderChannelIcon(t.channel)}
              <div class="channel-info">
                <div class="channel-name">
                  ${t.channel?.name||"Unknown Channel"}
                </div>
                <div class="channel-description">
                  ${t.channel?.description||"No description available"}
                </div>
                <div class="channel-tag">
                  @${t.channel?.tag||"unknown"}
                </div>
              </div>
              <button
                class="unsubscribe-button"
                @click=${()=>this.unsubscribeFromChannel(t.iden)}
              >
                Unsubscribe
              </button>
            </div>
          `)}
      </div>
    `}renderRecentChannelPushes(){return n`
      <div class="recent-pushes-section">
        <h3 class="section-title">Recent Subscription Posts</h3>
        ${this.isLoadingPosts?n`
              <div class="loading-indicator">Loading subscription posts...</div>
            `:""}
        ${this.subscriptionPosts.length===0&&!this.isLoadingPosts?n`
              <div class="recent-pushes-content">
                <p>No recent subscription posts found.</p>
                <p>
                  Posts from channels you're subscribed to will appear here.
                </p>
              </div>
            `:""}
        ${this.subscriptionPosts.length>0?n`
              <div class="subscription-posts">
                ${this.subscriptionPosts.map(t=>n`
                    <div class="post-card">
                      <div class="post-header">
                        <span class="channel-name">${t.channel_tag}</span>
                        <span class="post-date"
                          >${new Date(t.created*1e3).toLocaleDateString()}</span
                        >
                      </div>
                      <div class="post-content">
                        ${t.title?n`<h4 class="post-title">${t.title}</h4>`:""}
                        ${t.body?n`<p class="post-body">${t.body}</p>`:""}
                        ${be(t.url)?n`<a
                              href="${t.url}"
                              target="_blank"
                              class="post-link"
                              >🔗 ${t.url}</a
                            >`:""}
                      </div>
                    </div>
                  `)}
              </div>
            `:""}
      </div>
    `}render(){return n`
      <div class="channels-container">
        ${this.errorMessage?n`<div class="error-message">${this.errorMessage}</div>`:""}
        ${this.successMessage?n`<div class="success-message">${this.successMessage}</div>`:""}

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

        ${this.activeSubtab==="discover"?n`
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
    `}};v.styles=P`
    /* === Light mode base === */
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

    /* === Dark mode overrides === */
    :host-context(html[data-theme='dark']) {
      color: #dee2e6;
      background: #212529;
    }

    :host-context(html[data-theme='dark']) .search-input {
      background: #343a40;
      border-color: #495057;
      color: #dee2e6;
    }

    :host-context(html[data-theme='dark']) .search-input::placeholder {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subtab-navigation {
      border-bottom-color: #495057;
    }

    :host-context(html[data-theme='dark']) .subtab-button {
      color: rgba(222, 226, 230, 0.75);
    }

    :host-context(html[data-theme='dark']) .subtab-button.active {
      color: #6ea8fe;
      border-bottom-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .subtab-button:hover:not(.active) {
      color: #dee2e6;
      background: #2b3035;
    }

    :host-context(html[data-theme='dark']) .post-card {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .post-card:hover {
      border-color: #6ea8fe;
      box-shadow: 0 2px 8px rgba(13, 110, 253, 0.15);
    }

    :host-context(html[data-theme='dark']) .post-title {
      color: #e9ecef;
    }

    :host-context(html[data-theme='dark']) .post-body {
      color: #ced4da;
    }

    :host-context(html[data-theme='dark']) .post-date {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .post-link {
      color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .post-link:hover {
      color: #9ec5fe;
    }

    :host-context(html[data-theme='dark']) .channel-card {
      background: #343a40;
      border-color: #495057;
    }

    :host-context(html[data-theme='dark']) .channel-card:hover {
      border-color: #6ea8fe;
    }

    :host-context(html[data-theme='dark']) .channel-icon {
      background: #2b3035;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .channel-name {
      color: #e9ecef;
    }

    :host-context(html[data-theme='dark']) .channel-description {
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .channel-tag {
      background: #2b3035;
      color: #adb5bd;
    }

    :host-context(html[data-theme='dark']) .subscribe-button {
      background: #0d6efd;
    }

    :host-context(html[data-theme='dark']) .subscribe-button:hover {
      background: #0b5ed7;
    }

    :host-context(html[data-theme='dark']) .refresh-button {
      background: #6c757d;
    }

    :host-context(html[data-theme='dark'])
      .refresh-button:hover:not(:disabled) {
      background: #5c636a;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button {
      background: #dc3545;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:hover {
      background: #bb2d3b;
    }

    :host-context(html[data-theme='dark']) .error-message {
      background: #2c0b0e;
      border-color: #842029;
      color: #ea868f;
    }

    :host-context(html[data-theme='dark']) .success-message {
      background: #051b11;
      border-color: #0f5132;
      color: #75b798;
    }

    :host-context(html[data-theme='dark']) .loading,
    :host-context(html[data-theme='dark']) .empty-state {
      color: rgba(222, 226, 230, 0.75);
    }

    :host-context(html[data-theme='dark']) .subscribe-button {
      padding: 6px 12px;
      background: rgb(11, 94, 215);
      color: #e6e1e3;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    :host-context(html[data-theme='dark'])
      .subscribe-button:hover:not(:disabled) {
      background: #003366;
    }

    :host-context(html[data-theme='dark']) .subscribe-button:disabled {
      background: #55515a;
      color: #a1a1aa;
      cursor: not-allowed;
    }

    :host-context(html[data-theme='dark']) .subscribed-badge {
      padding: 6px 12px;
      background: #4ade80; /* success green */
      color: #052e16;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    :host-context(html[data-theme='dark']) .subscriptions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    :host-context(html[data-theme='dark']) .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #e6e1e3;
      margin: 0;
    }

    :host-context(html[data-theme='dark']) .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    /* Container */
    :host-context(html[data-theme='dark']) .subscriptions-section {
      gap: 12px;
    }

    /* Card */
    :host-context(html[data-theme='dark']) .subscription-item {
      background: rgb(52, 58, 64); /* #343a40 */
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    }

    :host-context(html[data-theme='dark']) .subscription-item:hover {
      background: #2b3035;
      border-color: #5a5f66;
    }

    /* Channel icon */
    :host-context(html[data-theme='dark']) .channel-icon {
      background: #2b3035;
      color: #adb5bd;
      border: 1px solid #495057;
      border-radius: 8px;
    }

    /* Text hierarchy */
    :host-context(html[data-theme='dark']) .channel-info h1,
    :host-context(html[data-theme='dark']) .channel-info h2,
    :host-context(html[data-theme='dark']) .channel-info h3,
    :host-context(html[data-theme='dark']) .channel-info h4,
    :host-context(html[data-theme='dark']) .channel-info .channel-name,
    :host-context(html[data-theme='dark']) .channel-info .title {
      color: #e6e1e3;
    }

    :host-context(html[data-theme='dark']) .channel-info .channel-description,
    :host-context(html[data-theme='dark']) .channel-info .desc {
      color: #adb5bd;
    }

    /* Handle pill (e.g., @jessetautulli) */
    :host-context(html[data-theme='dark']) .channel-handle,
    :host-context(html[data-theme='dark']) .handle {
      display: inline-block;
      background: #1f2326;
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 12px;
    }

    /* Unsubscribe button */
    :host-context(html[data-theme='dark']) .unsubscribe-button {
      background: #dc3545;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    :host-context(html[data-theme='dark'])
      .unsubscribe-button:hover:not(:disabled) {
      background: #bb2d3b;
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:focus-visible {
      outline: 0;
      box-shadow: 0 0 0 3px rgba(159, 134, 255, 0.35);
    }

    :host-context(html[data-theme='dark']) .unsubscribe-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    /* Refresh button in header (from your screenshot) */
    :host-context(html[data-theme='dark']) .refresh-button {
      background: #2b3035;
      color: #e6e1e3;
      border: 1px solid #495057;
      border-radius: 8px;
      padding: 6px 10px;
    }

    :host-context(html[data-theme='dark'])
      .refresh-button:hover:not(:disabled) {
      background: #343a40;
    }

    /* Optional: layout helpers inside the card */
    :host-context(html[data-theme='dark']) .subscription-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    :host-context(html[data-theme='dark']) .channel-info {
      flex: 1;
      min-width: 0;
    }
  `;$([_({type:Array})],v.prototype,"subscriptions",2);$([l()],v.prototype,"searchQuery",2);$([l()],v.prototype,"searchResults",2);$([l()],v.prototype,"isLoading",2);$([l()],v.prototype,"isSearching",2);$([l()],v.prototype,"errorMessage",2);$([l()],v.prototype,"successMessage",2);$([l()],v.prototype,"activeSubtab",2);$([l()],v.prototype,"subscriptionPosts",2);$([l()],v.prototype,"isLoadingPosts",2);v=$([L("pb-channels")],v);let S,E=!1,ze=!1;const Oe="pb_follow_system_theme";function Ne(){try{localStorage.setItem(Oe,E?"1":"0")}catch{}}function jt(){try{return localStorage.getItem(Oe)==="1"}catch{return!1}}function fe(t){const e=t?"dark":"light";document.documentElement.getAttribute("data-theme")!==e&&document.documentElement.setAttribute("data-theme",e)}function ee(){E&&fe(window.matchMedia("(prefers-color-scheme: dark)").matches)}function Ue(){E?S||(S=window.matchMedia("(prefers-color-scheme: dark)"),S.addEventListener?S.addEventListener("change",ee):S.addListener(ee)):S&&(S.removeEventListener?S.removeEventListener("change",ee):S.removeListener(ee),S=void 0)}async function qt(){try{E=!!(await oe("pb_settings"))?.systemTheme}catch{E=!1}Ne(),fe(E?window.matchMedia("(prefers-color-scheme: dark)").matches:!1),Ue()}function Vt(t,e){e!=="local"||!t.pb_settings||(E=!!t.pb_settings.newValue?.systemTheme,Ne(),fe(E&&window.matchMedia("(prefers-color-scheme: dark)").matches),Ue())}function Kt(){if(!ze){ze=!0;try{const t=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",jt()&&t?"dark":"light")}catch{document.documentElement.setAttribute("data-theme","light")}qt(),chrome.storage.onChanged.addListener(Vt)}}const Wt=1440*60*1e3;async function He(){const[t,e]=await Promise.all([oe("pb_device_cache"),oe("defaultSmsDevice")]),o=(t?.devices??[]).filter(s=>s.has_sms===!0&&s.active).sort((s,r)=>(s.nickname??"").localeCompare(r.nickname??""));return{device:o.find(s=>s.iden===e)??o[0]??null,isStale:!t?.lastFetched||Date.now()-t.lastFetched>=Wt}}Kt();new URLSearchParams(window.location.search).has("windowMode")&&document.documentElement.classList.add("window-mode");Et();let z=null,Be=[],je=[];document.addEventListener("DOMContentLoaded",async()=>{chrome.runtime.sendMessage({cmd:"POPUP_OPEN"}).catch(t=>console.error("🪟 [Popup] Failed to send POPUP_OPEN message:",t)),await qe()});async function qe(){const t=document.querySelector(".container");if(!t){console.error("Container element not found");return}try{if(await oe("pb_token")){const[o,s,r]=await Promise.all([He(),Ye(),Ze()]);z=o.device,Be=s,je=r,t.innerHTML=`
        <div class="popup-container">
          <div class="popup-header">
            <h2 class="popup-title">Pushbridge</h2>
            <div class="tab-navigation">
              ${Ee(s,!!o.device,r)}
            </div>
          </div>
          <div class="tab-content">
            ${Object.keys(Ve).map(a=>`<div class="tab-pane" data-tab="${a}"></div>`).join("")}
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
      `;const i=Je(t);i&&ge(i),Ke(),Gt(),Ge(),Qt(o.isStale),Zt(),Xt()}else{t.innerHTML="<pb-token-setup></pb-token-setup>";const o=document.querySelector("pb-token-setup");o&&o.addEventListener("token-verified",async()=>{await qe()})}}catch(e){console.error("Failed to initialize popup:",e),t.innerHTML=`
      <div style="padding: 20px; text-align: center; color: #666;">
        <div>Failed to load popup</div>
        <div style="font-size: 12px; margin-top: 8px;">${e instanceof Error?e.message:"Unknown error"}</div>
      </div>
    `}}const Ve={composer:()=>"<pb-composer></pb-composer>",pushes:()=>"<pb-recent-pushes></pb-recent-pushes>",notifications:()=>"<pb-mirror-list></pb-mirror-list>",channels:()=>"<pb-channels></pb-channels>",messages:()=>`
    <div class="sms-interface">
      <div class="sms-view conversation-list-view active">
        <pb-conversation-list id="conversation-list"></pb-conversation-list>
      </div>
      <div class="sms-view sms-thread-view">
        <div class="sms-thread-header">
          <button class="back-button" id="sms-back-button">← Back</button>
          <span class="conversation-title" id="conversation-title">Conversation</span>
        </div>
        <pb-sms-thread id="sms-thread" device-iden="${z?.iden||""}"></pb-sms-thread>
      </div>
    </div>`};function ge(t){const e=document.querySelector(`.tab-pane[data-tab="${t}"]`);!e||e.dataset.mounted||(e.dataset.mounted="true",e.innerHTML=Ve[t](),t==="messages"&&Yt())}function Ke(){const t="requestIdleCallback"in window?o=>window.requestIdleCallback(o,{timeout:200}):o=>window.setTimeout(o,50),e=()=>{const o=Array.from(document.querySelectorAll(".tab-button")).map(s=>s.dataset.tab).find(s=>!document.querySelector(`.tab-pane[data-tab="${s}"]`)?.dataset.mounted);o&&(ge(o),t(e))};t(e)}function We(t){document.querySelectorAll(".tab-button").forEach(e=>{e.classList.toggle("active",e.dataset.tab===t)}),document.querySelectorAll(".tab-pane").forEach(e=>{e.classList.toggle("active",e.dataset.tab===t)}),ge(t)}function Gt(){document.querySelector(".tab-navigation")?.addEventListener("click",t=>{const e=t.target.closest(".tab-button");e?.dataset.tab&&We(e.dataset.tab)})}function Ge(){const t=document.querySelector('.tab-button[data-tab="messages"]');if(!t||!z)return;const e=z.nickname||z.model||`Device ${z.iden.slice(0,8)}`;t.innerHTML=`
    <div class="sms-header">
      <span class="sms-title">SMS/MMS</span>
      <span class="device-info"></span>
    </div>
  `,t.querySelector(".device-info").textContent=`from ${e}`}async function Qt(t){if(t)try{if(!(await chrome.runtime.sendMessage({cmd:"GET_SMS_CAPABLE_DEVICES"}))?.success)return;const{device:o}=await He(),s=o?.iden!==z?.iden;if(z=o,!s)return;const r=document.querySelector('.tab-pane[data-tab="messages"]');r?.dataset.mounted&&(delete r.dataset.mounted,r.innerHTML="");const i=document.querySelector(".tab-navigation");if(!i)return;const a=i.querySelector(".tab-button.active")?.dataset.tab;i.innerHTML=Ee(Be,!!o,je);const d=i.querySelector(`.tab-button[data-tab="${a}"]`)&&a||i.querySelector(".tab-button")?.dataset.tab;d&&We(d),Ge(),Ke()}catch(e){console.error("🪟 [Popup] Failed to refresh SMS devices:",e)}}function Yt(){try{const t=document.getElementById("conversation-list"),e=document.getElementById("sms-thread"),o=document.getElementById("sms-back-button"),s=document.getElementById("conversation-title"),r=document.querySelector(".conversation-list-view"),i=document.querySelector(".sms-thread-view");t&&e&&o&&s&&r&&i&&(t.addEventListener("conversation-selected",a=>{const{conversationId:c,conversationName:d}=a.detail;e.conversationId=c,s.textContent=d||"Conversation",r.classList.remove("active"),i.classList.add("active"),setTimeout(()=>{e.scrollToBottom&&e.scrollToBottom()},300)}),o.addEventListener("click",()=>{i.classList.remove("active"),r.classList.add("active"),t.selectedConversationId=""}))}catch(t){console.error("Failed to setup SMS interface:",t)}}function Zt(){const t=document.getElementById("about-button");t&&t.addEventListener("click",()=>{Jt()})}function Jt(){const t=document.createElement("div");t.className="about-overlay",t.innerHTML=`
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
  `,document.body.appendChild(t);const e=t.querySelector("#close-about");e&&e.addEventListener("click",()=>{document.body.removeChild(t)}),t.addEventListener("click",o=>{o.target===t&&document.body.removeChild(t)})}async function Xt(){const t=document.getElementById("open-window-btn");if(!t)return;if(await chrome.tabs.getCurrent()){t.style.display="none";return}t.addEventListener("click",eo)}async function eo(){const t=chrome.runtime.getURL("popup.html?windowMode=1");try{const o=(await chrome.windows.getAll({populate:!0})).find(s=>s.tabs?.some(r=>r.url?.startsWith(t)));o?await chrome.windows.update(o.id,{focused:!0,drawAttention:!0}):await chrome.windows.create({url:t,type:"popup",width:500,height:700})}finally{window.close()}}const Qe=document.createElement("style");Qe.textContent=`
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
    white-space: normal;
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
  html[data-theme='dark'] {
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

  html[data-theme='dark'] * {
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }

  html[data-theme='dark'] *::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  html[data-theme='dark'] *::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
  }

  html[data-theme='dark'] *::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }

  html[data-theme='dark'] .popup-header {
    background: var(--surface-alt);
    border-bottom-color: var(--border-color);
  }

  html[data-theme='dark'] .popup-title {
    color: var(--text-primary);
  }

  html[data-theme='dark'] .tab-navigation {
    background: var(--surface) !important;
    border-color: var(--border-color) !important;
  }

  html[data-theme='dark'] .tab-button {
    color: var(--text-secondary);
  }

  html[data-theme='dark'] .tab-button.active {
    background: var(--accent);
    color: white;
  }

  html[data-theme='dark'] .tab-button:hover:not(.active) {
    background: #1f1f1f;
    color: var(--text-primary);
  }

  html[data-theme='dark'] .sms-thread-header {
    background: var(--surface-alt);
    border-bottom-color: var(--border-color);
  }

  html[data-theme='dark'] .conversation-title {
    color: var(--text-primary);
  }

  html[data-theme='dark'] .back-button:hover {
    background: var(--pb-hover);
  }

  html[data-theme='dark'] .popup-footer {
    background: var(--surface-alt);
    border-top-color: var(--border-color);
    color: var(--text-secondary);
  }

  html[data-theme='dark'] .about-dialog {
    background: var(--surface-alt);
    color: var(--text-primary);
  }

  html[data-theme='dark'] .about-header h3 {
    color: var(--text-primary);
  }

  html[data-theme='dark'] .about-content p {
    color: var(--text-secondary);
  }

  html[data-theme='dark'] .about-links a {
    color: var(--accent);
  }

  html[data-theme='dark'] .about-links a:hover {
    color: var(--accent-hover);
  }

  html[data-theme='dark'] .license-info a {
    color: var(--accent);
  }
`;document.head.appendChild(Qe);
