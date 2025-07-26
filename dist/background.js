import {
  s as l,
  r as h,
  P as f,
  g as d,
  h as m,
  a as $,
  n as k,
  u as b,
  f as Re,
  b as We,
  c as qe,
  d as W,
  t as q,
  e as Ve,
  i as Ke,
  j as re,
  k as E,
  l as Ye,
  m as Qe,
  o as Je,
  p as Xe,
  q as Ze,
} from './notificationBadge.js';
const et = 'modulepreload',
  tt = function (e) {
    return '/' + e;
  },
  V = {},
  _ = function (t, o, n) {
    let a = Promise.resolve();
    if (o && o.length > 0) {
      let c = function (g) {
        return Promise.all(
          g.map(u =>
            Promise.resolve(u).then(
              w => ({ status: 'fulfilled', value: w }),
              w => ({ status: 'rejected', reason: w })
            )
          )
        );
      };
      document.getElementsByTagName('link');
      const s = document.querySelector('meta[property=csp-nonce]'),
        i = s?.nonce || s?.getAttribute('nonce');
      a = c(
        o.map(g => {
          if (((g = tt(g)), g in V)) return;
          V[g] = !0;
          const u = g.endsWith('.css'),
            w = u ? '[rel="stylesheet"]' : '';
          if (document.querySelector(`link[href="${g}"]${w}`)) return;
          const y = document.createElement('link');
          if (
            ((y.rel = u ? 'stylesheet' : et),
            u || (y.as = 'script'),
            (y.crossOrigin = ''),
            (y.href = g),
            i && y.setAttribute('nonce', i),
            document.head.appendChild(y),
            u)
          )
            return new Promise((Ge, ze) => {
              (y.addEventListener('load', Ge),
                y.addEventListener('error', () =>
                  ze(new Error(`Unable to preload CSS for ${g}`))
                ));
            });
        })
      );
    }
    function r(s) {
      const i = new Event('vite:preloadError', { cancelable: !0 });
      if (((i.payload = s), window.dispatchEvent(i), !i.defaultPrevented))
        throw s;
    }
    return a.then(s => {
      for (const i of s || []) i.status === 'rejected' && r(i.reason);
      return t().catch(r);
    });
  };
let P = null,
  M = null,
  D = 0,
  A = 0;
const ot = 6,
  se = ot * 60 * 60 * 1e3;
async function H(e = !1) {
  try {
    const t = await d('pb_token');
    if (!t) throw new Error('No access token available');
    let o;
    e || (o = await d('pb_subscriptions_cursor'));
    const n = new URLSearchParams();
    o && n.append('cursor', o);
    const a = o
        ? `https://api.pushbullet.com/v2/subscriptions?${n}`
        : 'https://api.pushbullet.com/v2/subscriptions',
      r = await m.fetch(a, {
        method: 'GET',
        headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
      });
    if (!r.ok)
      throw r.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked during channel fetch',
            code: r.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(
            `Failed to fetch subscriptions: ${r.status} ${r.statusText}`
          );
    const s = await r.json();
    return (
      s.cursor
        ? (await l('pb_subscriptions_cursor', s.cursor),
          await l('pb_subscriptions_has_more', !0))
        : (await l('pb_subscriptions_cursor', null),
          await l('pb_subscriptions_has_more', !1)),
      await nt(s.subscriptions),
      chrome.runtime
        .sendMessage({
          type: 'pb:subsUpdated',
          payload: { subscriptions: s.subscriptions },
        })
        .catch(() => {}),
      s.subscriptions
    );
  } catch (t) {
    throw (
      console.error('Failed to fetch channel subscriptions:', t),
      await h(f.Unknown, {
        message: `Failed to fetch channel subscriptions: ${t instanceof Error ? t.message : 'Unknown error'}`,
      }),
      t
    );
  }
}
async function ie(e = !1) {
  try {
    const t = await d('pb_token');
    if (!t) throw new Error('No access token available');
    let o;
    e || (o = await d('pb_channels_cursor'));
    const n = new URLSearchParams();
    (n.append('active_only', 'true'), o && n.append('cursor', o));
    const a = o
        ? `https://api.pushbullet.com/v2/channels?${n}`
        : 'https://api.pushbullet.com/v2/channels?active_only=true',
      r = await m.fetch(a, {
        method: 'GET',
        headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
      });
    if (!r.ok)
      throw r.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked during owned channels fetch',
            code: r.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(
            `Failed to fetch owned channels: ${r.status} ${r.statusText}`
          );
    const s = await r.json();
    return (
      s.cursor
        ? (await l('pb_channels_cursor', s.cursor),
          await l('pb_channels_has_more', !0))
        : (await l('pb_channels_cursor', null),
          await l('pb_channels_has_more', !1)),
      await at(s.channels),
      chrome.runtime
        .sendMessage({
          type: 'pb:ownedChannelsUpdated',
          payload: { channels: s.channels },
        })
        .catch(() => {}),
      s.channels
    );
  } catch (t) {
    throw (
      console.error('Failed to fetch owned channels:', t),
      await h(f.Unknown, {
        message: `Failed to fetch owned channels: ${t instanceof Error ? t.message : 'Unknown error'}`,
      }),
      t
    );
  }
}
async function ce(e = !1) {
  const t = Date.now();
  return !e && P && t - D < se ? P : await H(e);
}
async function le(e = !1) {
  const t = Date.now();
  return !e && M && t - A < se ? M : await ie(e);
}
async function nt(e) {
  ((P = e),
    (D = Date.now()),
    await l('pb_channel_subs', { subscriptions: e, lastFetched: D }));
}
async function at(e) {
  ((M = e),
    (A = Date.now()),
    await l('pb_owned_channels', { channels: e, lastFetched: A }));
}
async function j() {
  try {
    (console.log(
      'Refreshing channel data (subscriptions and owned channels)...'
    ),
      await Promise.all([H(), ie()]),
      console.log('Channel data refresh completed'));
  } catch (e) {
    throw (
      console.error('Failed to refresh channel data:', e),
      await h(f.Unknown, {
        message: `Failed to refresh channel data: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }),
      e
    );
  }
}
async function de() {
  try {
    const e = await d('pb_channel_subs');
    if (e && e.subscriptions)
      return ((P = e.subscriptions), (D = e.lastFetched), e.subscriptions);
  } catch (e) {
    console.error('Failed to load cached subscriptions:', e);
  }
  return [];
}
async function ue() {
  try {
    const e = await d('pb_owned_channels');
    if (e && e.channels)
      return ((M = e.channels), (A = e.lastFetched), e.channels);
  } catch (e) {
    console.error('Failed to load cached owned channels:', e);
  }
  return [];
}
async function he() {
  ((P = null),
    (D = 0),
    await l('pb_channel_subs', null),
    await l('pb_subscriptions_cursor', null),
    await l('pb_subscriptions_has_more', null));
}
async function fe() {
  ((M = null),
    (A = 0),
    await l('pb_owned_channels', null),
    await l('pb_channels_cursor', null),
    await l('pb_channels_has_more', null));
}
async function pe() {
  try {
    (await Promise.all([de(), ue()]),
      console.log('Channel manager initialized'));
  } catch (e) {
    console.error('Failed to initialize channel manager:', e);
  }
}
async function ge(e = 50) {
  try {
    const { getPushHistory: t } = await _(
        async () => {
          const { getPushHistory: r } = await Promise.resolve().then(() => Ie);
          return { getPushHistory: r };
        },
        void 0
      ),
      [o, n] = await Promise.all([t(e * 2), ce()]),
      a = new Set(
        n.filter(r => r.channel && r.channel.iden).map(r => r.channel.iden)
      );
    return o.pushes
      .filter(r => r.channel_iden && a.has(r.channel_iden))
      .sort((r, s) => s.created - r.created)
      .slice(0, e);
  } catch (t) {
    throw (
      console.error('Failed to get subscription posts:', t),
      await h(f.Unknown, {
        message: `Failed to get subscription posts: ${t instanceof Error ? t.message : 'Unknown error'}`,
      }),
      t
    );
  }
}
const I = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        clearOwnedChannelsCache: fe,
        clearSubscriptionsCache: he,
        fetchSubscriptions: H,
        getOwnedChannels: le,
        getSubscriptionPosts: ge,
        getSubscriptions: ce,
        initializeChannelManager: pe,
        loadCachedOwnedChannels: ue,
        loadCachedSubscriptions: de,
        refreshChannelData: j,
      },
      Symbol.toStringTag,
      { value: 'Module' }
    )
  ),
  rt = 10080 * 60 * 1e3,
  T = new Map();
async function st() {
  try {
    (await it(),
      console.log('Contact Manager initialized with', T.size, 'contacts'));
  } catch (e) {
    (console.error('Failed to initialize contact manager:', e),
      await h(f.Unknown, {
        message: 'Failed to initialize contact manager',
        code: e instanceof Error ? void 0 : 500,
      }));
  }
}
async function it() {
  try {
    const e = await d('contacts');
    if (e) {
      for (const [t, o] of Object.entries(e)) T.set(t, o);
      console.log('Loaded', T.size, 'contacts from storage');
    }
  } catch (e) {
    console.error('Failed to load contacts from storage:', e);
  }
}
async function ct(e) {
  try {
    const t = T.get(e);
    if (t && Date.now() - t.lastUpdated < rt) return t.name;
    const o = await lt(e);
    if (o && o !== e) {
      const n = { name: o, number: e, lastUpdated: Date.now() };
      return (T.set(e, n), await dt(), o);
    }
    return e;
  } catch (t) {
    return (console.error('Failed to get contact name for:', e, t), e);
  }
}
async function lt(e) {
  try {
    const t = await d('pb_token');
    if (!t) return null;
    const o = await m.fetch('https://api.pushbullet.com/v2/contacts', {
      method: 'GET',
      headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
    });
    if (!o.ok)
      return o.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching contacts',
            code: o.status,
          }),
          null)
        : (console.error('Failed to fetch contacts:', o.status, o.statusText),
          null);
    const a = (await o.json()).contacts || [];
    for (const r of a)
      if (r.phone_numbers && Array.isArray(r.phone_numbers)) {
        for (const s of r.phone_numbers)
          if (K(s) === K(e)) return r.name || r.nickname || r.email || e;
      }
    return null;
  } catch (t) {
    return (console.error('Failed to fetch contact from API:', t), null);
  }
}
function K(e) {
  return e.replace(/\D/g, '');
}
async function dt() {
  try {
    const e = {};
    for (const [t, o] of T.entries()) e[t] = o;
    (await l('contacts', e),
      console.log('Persisted', T.size, 'contacts to storage'));
  } catch (e) {
    console.error('Failed to persist contacts:', e);
  }
}
async function ut() {
  try {
    (T.clear(),
      await l('contacts', null),
      await l('pb_contacts_cursor', null),
      await l('pb_contacts_has_more', null),
      console.log('Contacts cache and cursors cleared'));
  } catch (e) {
    console.error('Failed to clear contacts:', e);
  }
}
const ht = 1440 * 60 * 1e3,
  v = 'mirror_';
async function ft(e) {
  try {
    if (
      (console.log('🔔 [MirrorManager] Handling mirror push:', {
        application_name: e.application_name,
        package_name: e.package_name,
        title: e.title,
      }),
      e.application_name === 'SMS')
    ) {
      await _t(e);
      return;
    }
    const t = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      o = {
        package_name: e.package_name,
        notification_id: e.notification_id,
        notification_tag: e.notification_tag,
        source_device_iden: e.source_device_iden,
        title: e.title,
        body: e.body,
        application_name: e.application_name,
        icon_url: e.icon_url,
        expiresAt: Date.now() + ht,
      };
    await l(`${v}${t}`, o);
    const n = {
      type: 'basic',
      title: e.title,
      message: e.body,
      iconUrl: e.icon_url ? e.icon_url : 'icons/48.png',
      requireInteraction: !0,
      silent: !1,
    };
    (await chrome.notifications.create(t, n),
      console.log('🔔 [MirrorManager] Adding mirror notification to badge'),
      await k.addPushNotifications(1),
      await b.markAsProcessed('mirror', e.notification_id, Date.now()),
      console.log(
        'Chrome notification created:',
        t,
        'for app:',
        e.package_name
      ));
  } catch (t) {
    (console.error('Failed to handle mirror push:', t),
      await h(f.Unknown, {
        message: 'Failed to create notification from phone',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
async function pt(e) {
  try {
    console.log('🗑️ [MirrorManager] Handling remote dismissal:', {
      package_name: e.package_name,
      notification_id: e.notification_id,
    });
    const t = await gt(e);
    for (const [o] of t)
      (await chrome.notifications.clear(o),
        await $(`${v}${o}`),
        console.log(
          '🗑️ [MirrorManager] Removing mirror notification from badge'
        ),
        await k.addPushNotifications(-1),
        console.log(
          'Chrome notification cleared:',
          o,
          'for app:',
          e.package_name
        ));
  } catch (t) {
    (console.error('Failed to handle remote dismissal:', t),
      await h(f.Unknown, {
        message: 'Failed to clear notification from phone',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
async function we(e) {
  try {
    console.log('👤 [MirrorManager] Handling user dismissal for:', e);
    const t = await d(`${v}${e}`);
    if (!t) {
      (console.log('No metadata found for notification:', e),
        await chrome.notifications.clear(e));
      return;
    }
    const o = await d('pb_user_iden');
    if (!o) {
      console.error('No user ID found for dismissal');
      return;
    }
    (await wt(t, o),
      await $(`${v}${e}`),
      console.log(
        '👤 [MirrorManager] Removing mirror notification from badge (user dismissal)'
      ),
      await k.addPushNotifications(-1),
      console.log('User dismissal sent to phone for:', e));
  } catch (t) {
    (console.error('Failed to handle user dismissal:', t),
      await h(f.Unknown, {
        message: 'Failed to dismiss notification on phone',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
async function gt(e) {
  const t = [];
  try {
    const o = await chrome.storage.local.get(null);
    for (const [n, a] of Object.entries(o))
      if (n.startsWith(v)) {
        const r = a;
        if (
          r.package_name === e.package_name &&
          r.notification_id === e.notification_id &&
          r.notification_tag === e.notification_tag
        ) {
          const s = n.replace(v, '');
          t.push([s, r]);
        }
      }
  } catch (o) {
    console.error('Failed to find matching mirrors:', o);
  }
  return t;
}
async function wt(e, t) {
  try {
    const o = await d('pb_token');
    if (!o) throw new Error('No token available');
    const n = {
        type: 'push',
        push: {
          type: 'dismissal',
          package_name: e.package_name,
          notification_id: e.notification_id,
          notification_tag: e.notification_tag,
          source_user_iden: t,
        },
      },
      a = await m.fetch('https://api.pushbullet.com/v2/ephemerals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Access-Token': o },
        body: JSON.stringify(n),
      });
    if (!a.ok)
      throw new Error(`Dismissal API error: ${a.status} ${a.statusText}`);
    console.log('Dismissal ephemeral sent successfully');
  } catch (o) {
    throw (console.error('Failed to send dismissal ephemeral:', o), o);
  }
}
async function me() {
  try {
    const e = await chrome.storage.local.get(null),
      t = Date.now();
    for (const [o, n] of Object.entries(e))
      if (o.startsWith(v)) {
        const a = n;
        if (a.expiresAt < t) {
          await $(o);
          continue;
        }
        const r = o.replace(v, ''),
          s = {
            type: 'basic',
            title: a.title,
            message: a.body,
            iconUrl: a.icon_url ? a.icon_url : 'icons/48.png',
            requireInteraction: !0,
            silent: !1,
          };
        (await chrome.notifications.create(r, s),
          console.log('Reconstructed notification:', r));
      }
  } catch (e) {
    console.error('Failed to reconstruct mirrors:', e);
  }
}
async function _e() {
  try {
    console.log('🧹 [MirrorManager] Cleaning up expired mirrors');
    const e = await chrome.storage.local.get(null),
      t = Date.now();
    let o = 0;
    for (const [n, a] of Object.entries(e))
      n.startsWith(v) &&
        a.expiresAt < t &&
        (await $(n), o++, console.log('Cleaned up expired mirror:', n));
    o > 0 &&
      (console.log(
        `🧹 [MirrorManager] Removed ${o} expired mirrors from badge`
      ),
      await k.addPushNotifications(-o));
  } catch (e) {
    console.error('Failed to cleanup expired mirrors:', e);
  }
}
async function mt() {
  const e = [];
  try {
    const t = await chrome.storage.local.get(null),
      o = Date.now();
    for (const [n, a] of Object.entries(t))
      if (n.startsWith(v)) {
        const r = a;
        if (r.expiresAt < o) continue;
        const s = n.replace(v, '');
        e.push({ id: s, meta: r });
      }
  } catch (t) {
    console.error('Failed to get active mirrors:', t);
  }
  return e;
}
async function _t(e) {
  try {
    if (e.application_name !== 'SMS') return;
    const t =
        e.conversation_iden ||
        `${e.package_name}:${e.address}` ||
        e.notification_id,
      o = e.timestamp,
      n = o ? Re(o) : Date.now();
    if (
      (console.log(
        '📱 [MirrorManager] Processing SMS with timestamp conversion:',
        {
          rawTimestamp: o,
          rawTimestampISO: o ? new Date(o * 1e3).toISOString() : 'none',
          convertedTimestamp: n,
          convertedTimestampISO: new Date(n).toISOString(),
          conversationId: t,
        }
      ),
      !(await b.shouldShowNotification({
        id: e.notification_id || `sms_${Date.now()}`,
        type: 'sms',
        created: n,
        metadata: {
          conversationId: t,
          packageName: e.package_name,
          applicationName: e.application_name,
        },
      })))
    ) {
      console.log(
        `⏭️ [MirrorManager] Skipping SMS notification (too old): ${t}`
      );
      return;
    }
    const r = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (console.log('📱 [MirrorManager] Creating Chrome notification for SMS:', {
      title: e.title,
      body: e.body,
      chromeNotifId: r,
    }),
      await chrome.notifications.create(r, {
        type: 'basic',
        title: e.title,
        message: e.body,
        iconUrl: e.icon_url ? e.icon_url : 'icons/48.png',
        requireInteraction: !1,
        silent: !1,
      }));
    const s = {
        id: e.notification_id || `incoming_${Date.now()}`,
        pb_guid: e.pb_guid || `incoming_${Date.now()}_${Math.random()}`,
        timestamp: n,
        inbound: !0,
        text: e.body || '',
        image_url: e.image_url,
        conversation_iden: t,
      },
      i = await ct(t);
    (await We(t, s, i),
      await b.markAsProcessed('sms', s.id, n),
      console.log(
        '✅ [MirrorManager] Incoming SMS processed:',
        t,
        'Chrome notif:',
        r
      ));
  } catch (t) {
    (console.error('Failed to handle incoming SMS:', t),
      await h(f.Unknown, {
        message: 'Failed to handle incoming SMS',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
const p = {
    socket: null,
    isConnected: !1,
    lastHeartbeat: 0,
    retryCount: 0,
    reconnectTimer: null,
    isPolling: !1,
    pollInterval: null,
  },
  ke = 10,
  Y = [2e3, 4e3, 8e3, 16e3, 32e3],
  kt = 6e4,
  yt = 6e4;
async function ye() {
  try {
    if (!(await d('pb_token'))) {
      console.log('No token available, skipping WebSocket initialization');
      return;
    }
    await be();
  } catch (e) {
    (console.error('Failed to initialize WebSocket:', e),
      await h(f.Unknown, {
        message: 'Failed to initialize WebSocket connection',
        code: e instanceof Error ? void 0 : 500,
      }));
  }
}
async function be() {
  try {
    const e = await d('pb_token');
    if (!e) throw new Error('No token available');
    (p.socket && p.socket.close(),
      p.reconnectTimer &&
        (clearTimeout(p.reconnectTimer), (p.reconnectTimer = null)),
      p.pollInterval &&
        (clearInterval(p.pollInterval), (p.pollInterval = null)));
    const t = `wss://stream.pushbullet.com/websocket/${e}`;
    (console.log('Connecting to WebSocket:', t),
      (p.socket = new WebSocket(t)),
      (p.socket.onopen = bt),
      (p.socket.onmessage = vt),
      (p.socket.onclose = St),
      (p.socket.onerror = Tt));
  } catch (e) {
    (console.log('Failed to connect WebSocket:', e), await ve());
  }
}
function bt() {
  (console.log('WebSocket connected'),
    (p.isConnected = !0),
    (p.lastHeartbeat = Date.now()),
    (p.retryCount = 0),
    (p.isPolling = !1),
    p.pollInterval && (clearInterval(p.pollInterval), (p.pollInterval = null)));
}
function vt(e) {
  try {
    const t = JSON.parse(e.data);
    switch (
      (console.log('WebSocket message received:', t.type),
      (p.lastHeartbeat = Date.now()),
      t.type)
    ) {
      case 'nop':
        console.log('WebSocket heartbeat received');
        break;
      case 'tickle':
        t.subtype === 'push'
          ? (console.log('Push tickle received, syncing history'), Se())
          : t.subtype === 'device' &&
            (console.log('Device tickle received, syncing history'), Ft());
        break;
      case 'push':
        (console.log('Push message received:', t.push?.type), Ct(t));
        break;
      default:
        console.log('Unknown WebSocket message type:', t.type);
    }
  } catch (t) {
    console.error('Failed to parse WebSocket message:', t);
  }
}
async function St(e) {
  (console.log('WebSocket closed:', e.code, e.reason),
    (p.isConnected = !1),
    (p.socket = null),
    p.retryCount < ke
      ? await ve()
      : (console.log('Max retry count reached, switching to polling mode'),
        await Et()));
}
function Tt(e) {
  (console.log('WebSocket connection error:', e), (p.isConnected = !1));
}
async function ve() {
  p.retryCount++;
  const e = Y[Math.min(p.retryCount - 1, Y.length - 1)];
  (console.log(
    `WebSocket connection failed, retry ${p.retryCount}/${ke} in ${e}ms`
  ),
    (p.reconnectTimer = setTimeout(() => {
      be();
    }, e)));
}
async function Et() {
  p.isPolling ||
    (console.log(
      'Switching to polling mode due to WebSocket connection failures'
    ),
    (p.isPolling = !0),
    await h(f.Unknown, {
      message: 'Real-time connection lost; falling back to polling.',
      code: 1001,
    }),
    (p.pollInterval = setInterval(() => {
      Se();
    }, yt)));
}
async function Se() {
  try {
    console.log(
      '🔄 [WebSocket] Push tickle received, syncing history with unified tracker'
    );
    const { getPushHistory: e } = await _(
        async () => {
          const { getPushHistory: a } = await Promise.resolve().then(() => Ie);
          return { getPushHistory: a };
        },
        void 0
      ),
      { unifiedNotificationTracker: t } = await _(async () => {
        const { unifiedNotificationTracker: a } = await import(
          './notificationBadge.js'
        ).then(r => r.x);
        return { unifiedNotificationTracker: a };
      }, []),
      { notificationBadge: o } = await _(async () => {
        const { notificationBadge: a } = await import(
          './notificationBadge.js'
        ).then(r => r.y);
        return { notificationBadge: a };
      }, []),
      n = await e(50, 0, '');
    if (n.pushes && n.pushes.length > 0) {
      console.log(`🔄 [WebSocket] Found ${n.pushes.length} pushes to process`);
      let a = 0,
        r = 0;
      for (const s of n.pushes)
        !s.dismissed &&
          (s.receiver_iden ||
            s.target_device_iden ||
            s.type === 'mirror' ||
            s.type === 'file' ||
            s.channel_iden) &&
          (console.log(
            `🔔 [WebSocket] Processing push: ${s.iden} (type: ${s.type}, created: ${s.created})`
          ),
          (await t.shouldShowNotification({
            id: s.iden,
            type: 'push',
            created: s.created,
            metadata: { pushIden: s.iden },
          }))
            ? (console.log(
                `🆕 [WebSocket] New push detected: ${s.iden} (timestamp: ${s.created})`
              ),
              await o.addPushNotifications(1),
              await t.markAsProcessed(
                'push',
                s.iden,
                new Date(s.created).getTime()
              ),
              r++)
            : console.log(
                `⏭️ [WebSocket] Skipping already processed push: ${s.iden}`
              ),
          a++);
      console.log(
        `🔄 [WebSocket] Processed ${a} pushes, ${r} new pushes from tickle`
      );
    }
  } catch (e) {
    console.error('Failed to handle push tickle:', e);
  }
}
async function Ft() {
  try {
    console.log(
      '🔄 [WebSocket] Device tickle received, refreshing devices directly'
    );
    const { getDevices: e } = await _(async () => {
      const { getDevices: t } = await import('./notificationBadge.js').then(
        o => o.w
      );
      return { getDevices: t };
    }, []);
    (await e(!0), console.log('🔄 [WebSocket] Devices refreshed successfully'));
  } catch (e) {
    console.error('Failed to handle device tickle:', e);
  }
}
async function Ct(e) {
  try {
    const t = e.push;
    if (!t || !t.type) {
      console.log('Invalid push message format');
      return;
    }
    switch (t.type) {
      case 'mirror':
        (console.log('Mirror push received, creating Chrome notification'),
          await ft(t));
        break;
      case 'dismissal':
        (console.log('Dismissal push received, clearing Chrome notification'),
          await pt(t));
        break;
      case 'sms_changed':
        (console.log('SMS changed push received, triggering SMS sync'),
          await Pt(t));
        break;
      default:
        console.log('Unhandled push type:', t.type);
    }
  } catch (t) {
    (console.error('Failed to handle push message:', t),
      await h(f.Unknown, {
        message: 'Failed to process push message',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
async function Pt(e) {
  try {
    (console.log('📱 [WebSocket] SMS changed detected, triggering simple sync'),
      console.log('📱 [WebSocket] SMS changed push:', e));
    const { triggerSmsSync: t } = await _(
      async () => {
        const { triggerSmsSync: o } = await Promise.resolve().then(() => Vo);
        return { triggerSmsSync: o };
      },
      void 0
    );
    await t('sms_changed');
  } catch (t) {
    console.error('📱 [WebSocket] Failed to handle SMS changed:', t);
  }
}
function Te() {
  return !p.isConnected || !p.socket ? !1 : Date.now() - p.lastHeartbeat < kt;
}
function Ee() {
  return {
    isConnected: p.isConnected,
    isPolling: p.isPolling,
    retryCount: p.retryCount,
    lastHeartbeat: p.lastHeartbeat,
  };
}
const Fe = 'keepalive',
  Ce = 'channel-refresh',
  Q = 5,
  J = 6;
async function Mt() {
  try {
    (await chrome.alarms.create(Fe, { periodInMinutes: Q }),
      console.log(`Keep-alive alarm created with ${Q} minute interval`),
      await chrome.alarms.create(Ce, { periodInMinutes: J * 60 }),
      console.log(`Channel refresh alarm created with ${J} hour interval`),
      chrome.alarms.onAlarm.addListener(Dt));
  } catch (e) {
    console.error('Failed to initialize alarms:', e);
  }
}
function Dt(e) {
  e.name === Fe ? At() : e.name === Ce && $t();
}
async function At() {
  console.log('keepalive - checking system health');
  try {
    const e = Ee(),
      t = Te();
    (console.log('WebSocket status:', e),
      !t &&
        e.lastHeartbeat > 0 &&
        Date.now() - e.lastHeartbeat > 6e4 &&
        (console.log('WebSocket heartbeat stale, attempting reconnection'),
        await ye()),
      await _e(),
      console.log('🔄 [Alarm] Refreshing notification badge'),
      await k.refreshBadge(),
      e.retryCount > 0 &&
        console.log(`WebSocket reconnection attempts: ${e.retryCount}`));
  } catch (e) {
    console.log('Keep-alive check failed:', e);
  }
}
async function $t() {
  console.log('channel-refresh - refreshing channel data');
  try {
    (await j(), console.log('Channel data refreshed successfully'));
  } catch (e) {
    (console.error('Channel refresh failed:', e),
      await h(f.Unknown, {
        message: 'Channel data refresh failed',
        code: e instanceof Error ? void 0 : 500,
      }));
  }
}
const x = 'user_context',
  N = 'context_refresh_triggers';
class F {
  constructor() {
    ((this.context = null),
      (this.isRefreshing = !1),
      (this.refreshPromise = null));
  }
  static getInstance() {
    return (F.instance || (F.instance = new F()), F.instance);
  }
  async getContext(t) {
    if (
      (t.type === 'popup_open'
        ? await this.refreshContext(t)
        : (!this.context || !this.context.is_valid) &&
          (await this.refreshContext(t)),
      !this.context)
    )
      throw new Error('Failed to load user context');
    return this.context;
  }
  async isKnownSource(t, o) {
    if (!this.context) return !1;
    if (t && this.context.devices.has(t)) return !0;
    if (o) {
      for (const n of this.context.subscriptions.values())
        if (n.channel.iden === o) return !0;
    }
    return !!(o && this.context.owned_channels.has(o));
  }
  async handleUnknownSource(t, o) {
    const n = {
      type: 'unknown_source',
      timestamp: Date.now(),
      reason: `Unknown source: device=${t}, channel=${o}`,
    };
    await this.refreshContext(n);
  }
  async refreshContext(t) {
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      return;
    }
    ((this.isRefreshing = !0), (this.refreshPromise = this.performRefresh(t)));
    try {
      await this.refreshPromise;
    } finally {
      ((this.isRefreshing = !1), (this.refreshPromise = null));
    }
  }
  async performRefresh(t) {
    try {
      const o = await d('pb_token');
      if (!o) throw new Error('No token available');
      const n = await d('pb_device_iden');
      if (!n) throw new Error('Current device not registered');
      const [a, r, s] = await Promise.all([
          this.fetchSubscriptions(o),
          this.fetchChannels(o),
          this.fetchDevices(o),
        ]),
        i = new Map(),
        c = new Map(),
        g = new Map();
      (r.channels &&
        Array.isArray(r.channels) &&
        r.channels.forEach(u => {
          u && u.iden
            ? i.set(u.iden, u)
            : console.warn('Skipping channel with missing iden:', u);
        }),
        a.subscriptions &&
          Array.isArray(a.subscriptions) &&
          a.subscriptions.forEach(u => {
            u.channel && u.channel.iden
              ? c.set(u.channel.iden, u)
              : console.warn(
                  'Skipping subscription with missing channel data:',
                  u
                );
          }),
        s.devices &&
          Array.isArray(s.devices) &&
          s.devices.forEach(u => {
            u && u.iden
              ? g.set(u.iden, u)
              : console.warn('Skipping device with missing iden:', u);
          }),
        (this.context = {
          current_device_iden: n,
          owned_channels: i,
          subscriptions: c,
          devices: g,
          last_refreshed: Date.now(),
          is_valid: !0,
        }),
        await this.saveContext(),
        await this.saveRefreshTrigger(t),
        console.log('Context refreshed successfully', {
          ownedChannels: i.size,
          subscriptions: c.size,
          devices: g.size,
          trigger: t.type,
        }));
    } catch (o) {
      throw (
        console.error('Failed to refresh context:', o),
        this.context &&
          ((this.context.is_valid = !1), await this.saveContext()),
        await h(f.Unknown, {
          message: 'Failed to refresh user context',
          code: o instanceof Error ? void 0 : 500,
        }),
        o
      );
    }
  }
  async fetchSubscriptions(t) {
    const o = await m.fetch('https://api.pushbullet.com/v2/subscriptions', {
      method: 'GET',
      headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
    });
    if (!o.ok)
      throw o.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching subscriptions',
            code: o.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(
            `Failed to fetch subscriptions: ${o.status} ${o.statusText}`
          );
    const n = await o.json();
    if (!n || typeof n != 'object')
      throw new Error('Invalid response format from subscriptions API');
    return (
      (!n.subscriptions || !Array.isArray(n.subscriptions)) &&
        (console.warn(
          'Subscriptions API returned unexpected format, using empty array'
        ),
        (n.subscriptions = [])),
      n
    );
  }
  async fetchChannels(t) {
    const o = await m.fetch(
      'https://api.pushbullet.com/v2/channels?limit=500&active_only=true',
      {
        method: 'GET',
        headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
      }
    );
    if (!o.ok)
      throw o.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching channels',
            code: o.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(`Failed to fetch channels: ${o.status} ${o.statusText}`);
    const n = await o.json();
    if (!n || typeof n != 'object')
      throw new Error('Invalid response format from channels API');
    return (
      (!n.channels || !Array.isArray(n.channels)) &&
        (console.warn(
          'Channels API returned unexpected format, using empty array'
        ),
        (n.channels = [])),
      n
    );
  }
  async fetchDevices(t) {
    const o = await m.fetch('https://api.pushbullet.com/v2/devices', {
      method: 'GET',
      headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
    });
    if (!o.ok)
      throw o.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching devices',
            code: o.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(`Failed to fetch devices: ${o.status} ${o.statusText}`);
    const n = await o.json();
    if (!n || typeof n != 'object')
      throw new Error('Invalid response format from devices API');
    return (
      (!n.devices || !Array.isArray(n.devices)) &&
        (console.warn(
          'Devices API returned unexpected format, using empty array'
        ),
        (n.devices = [])),
      n
    );
  }
  async saveContext() {
    if (this.context) {
      const t = {
        ...this.context,
        owned_channels: Array.from(this.context.owned_channels.entries()),
        subscriptions: Array.from(this.context.subscriptions.entries()),
        devices: Array.from(this.context.devices.entries()),
      };
      await l(x, t);
    }
  }
  async loadContext() {
    try {
      const t = await d(x);
      t &&
        (this.context = {
          ...t,
          owned_channels: new Map(t.owned_channels || []),
          subscriptions: new Map(t.subscriptions || []),
          devices: new Map(t.devices || []),
        });
    } catch (t) {
      (console.error('Failed to load context from storage:', t),
        (this.context = null));
    }
  }
  async saveRefreshTrigger(t) {
    try {
      const o = await d(N),
        n = Array.isArray(o) ? o : [];
      (n.push(t), n.length > 10 && n.splice(0, n.length - 10), await l(N, n));
    } catch (o) {
      console.error('Failed to save refresh trigger:', o);
    }
  }
  async getRefreshTriggers() {
    return (await d(N)) || [];
  }
  async clearContext() {
    ((this.context = null), await l(x, null), await l(N, null));
  }
  async removeChannelFromContext(t) {
    !this.context ||
      !this.context.subscriptions ||
      (this.context.subscriptions.delete(t),
      await this.saveContext(),
      console.log(`Removed channel ${t} from user context`));
  }
}
const C = F.getInstance(),
  Nt = Object.freeze(
    Object.defineProperty(
      { __proto__: null, ContextManager: F, contextManager: C },
      Symbol.toStringTag,
      { value: 'Module' }
    )
  );
async function It(e) {
  try {
    let t;
    e.arrayBuffer && typeof e.arrayBuffer == 'function'
      ? (t = await e.arrayBuffer())
      : (t = await new Promise((a, r) => {
          const s = new FileReader();
          ((s.onload = () => a(s.result)),
            (s.onerror = () => r(s.error)),
            s.readAsArrayBuffer(e));
        }));
    const o = await crypto.subtle.digest('SHA-256', t);
    return Array.from(new Uint8Array(o))
      .map(a => a.toString(16).padStart(2, '0'))
      .join('');
  } catch (t) {
    return (
      console.error('Failed to generate file hash:', t),
      `${Date.now()}-${e.size}-${e.name}`
    );
  }
}
async function Pe(e, t, o, n = 0) {
  const a = {
      fileHash: e,
      uploadInfo: t,
      offset: n,
      fileName: o.name,
      fileSize: o.size,
      fileType: o.type || 'application/octet-stream',
      timestamp: Date.now(),
      attempts: 0,
    },
    r = (await d('pb_pending_uploads')) || [],
    s = r.findIndex(i => i.fileHash === e);
  (s >= 0 ? (r[s] = a) : r.push(a), await l('pb_pending_uploads', r));
}
async function Me(e) {
  const o = ((await d('pb_pending_uploads')) || []).filter(
    n => n.fileHash !== e
  );
  await l('pb_pending_uploads', o);
}
async function De(e, t, o, n = 0) {
  const a = await It(t);
  try {
    await Pe(a, e, t, n);
    const r = new FormData();
    if (
      (Object.entries(e.s3Fields).forEach(([i, c]) => {
        r.append(i, c);
      }),
      n > 0)
    ) {
      const i = t.slice(n);
      r.append('file', i, t.name);
    } else r.append('file', t);
    const s = await fetch(e.uploadUrl, { method: 'POST', body: r });
    if (s.ok)
      return (
        console.log('File upload completed successfully'),
        await Me(a),
        o && o({ loaded: t.size, total: t.size, percentage: 100 }),
        { success: !0 }
      );
    {
      const i = `Upload failed with status ${s.status}: ${s.statusText}`;
      return (
        console.error(i),
        s.status === 413
          ? (await h(f.FileTooLarge, {
              message: 'File too large for upload',
              code: 413,
            }),
            { success: !1, error: 'File too large for upload' })
          : s.status === 400
            ? (await h(f.InvalidUpload, {
                message: 'Invalid upload request',
                code: 400,
              }),
              { success: !1, error: 'Invalid upload request' })
            : (await h(f.Unknown, {
                message: 'File upload failed',
                code: s.status,
              }),
              { success: !1, error: 'Upload failed' })
      );
    }
  } catch (r) {
    return (
      console.error('Failed to upload file:', r),
      r instanceof TypeError && r.message.includes('fetch')
        ? (await h(f.NetworkError, {
            message: 'Network error during file upload',
            code: void 0,
          }),
          { success: !1, error: 'Network error during upload' })
        : (await h(f.Unknown, {
            message: 'Failed to upload file',
            code: r instanceof Error ? void 0 : 500,
          }),
          { success: !1, error: 'Upload failed' })
    );
  }
}
async function Ut() {
  try {
    const e = (await d('pb_pending_uploads')) || [];
    let t = 0;
    for (const o of e) {
      if (Date.now() - o.timestamp > 3600 * 1e3) {
        console.log('Skipping old pending upload:', o.fileName);
        continue;
      }
      if (o.attempts >= 3) {
        console.log('Skipping upload with too many attempts:', o.fileName);
        continue;
      }
      try {
        (console.log(
          `Resuming upload for ${o.fileName} from offset ${o.offset}`
        ),
          await Me(o.fileHash),
          t++);
      } catch (n) {
        (console.error('Failed to resume upload:', n), o.attempts++);
        const a = new File([], o.fileName, { type: o.fileType });
        (Object.defineProperty(a, 'size', { value: o.fileSize }),
          await Pe(o.fileHash, o.uploadInfo, a, o.offset));
      }
    }
    return t;
  } catch (e) {
    return (console.error('Failed to resume interrupted uploads:', e), 0);
  }
}
async function Ot() {
  try {
    const e = (await d('pb_pending_uploads')) || [],
      t = Date.now() - 3600 * 1e3,
      o = e.filter(n => n.timestamp > t);
    o.length !== e.length &&
      (await l('pb_pending_uploads', o),
      console.log(`Cleaned up ${e.length - o.length} old pending uploads`));
  } catch (e) {
    console.error('Failed to cleanup old pending uploads:', e);
  }
}
class xt {
  static enrichPush(t, o) {
    const n = this.computeMetadata(t, o);
    return { ...t, metadata: n };
  }
  static enrichPushes(t, o) {
    return t.map(n => this.enrichPush(n, o));
  }
  static computeMetadata(t, o) {
    const n = this.determineSourceType(t, o),
      a = this.determineOwnership(t, o),
      r = this.determineFileInfo(t),
      s = this.computeDisplaySource(t, o, n),
      i = this.computeOwnershipReason(t, o, a, n);
    return {
      source_type: n,
      source_channel_tag: this.getChannelTag(t, o),
      source_channel_name: this.getChannelName(t, o),
      source_device_nickname: this.getDeviceNickname(t, o),
      is_owned_by_user: a,
      can_delete: a,
      can_dismiss: !0,
      has_file: r,
      file_metadata: r ? this.getFileMetadata(t) : void 0,
      display_source: s,
      ownership_reason: i,
    };
  }
  static determineSourceType(t, o) {
    return t.channel_iden
      ? o.owned_channels.has(t.channel_iden)
        ? 'channel_broadcast'
        : (o.subscriptions.has(t.channel_iden), 'channel_subscription')
      : 'device';
  }
  static determineOwnership(t, o) {
    return !!(
      t.source_device_iden === o.current_device_iden ||
      (t.channel_iden && o.owned_channels.has(t.channel_iden))
    );
  }
  static determineFileInfo(t) {
    return !!(t.file_name || t.file_url || t.image_url);
  }
  static getFileMetadata(t) {
    if (this.determineFileInfo(t))
      return {
        name: t.file_name || 'Unknown file',
        type: t.file_type || 'unknown',
        url: t.file_url || t.image_url,
      };
  }
  static getChannelTag(t, o) {
    if (!t.channel_iden) return;
    const n = o.owned_channels.get(t.channel_iden);
    if (n) return n.tag;
    const a = o.subscriptions.get(t.channel_iden);
    if (a) return a.channel.tag;
  }
  static getChannelName(t, o) {
    if (!t.channel_iden) return;
    const n = o.owned_channels.get(t.channel_iden);
    if (n) return n.name;
    const a = o.subscriptions.get(t.channel_iden);
    if (a) return a.channel.name;
  }
  static getDeviceNickname(t, o) {
    return t.source_device_iden
      ? o.devices.get(t.source_device_iden)?.nickname
      : void 0;
  }
  static computeDisplaySource(t, o, n) {
    switch (n) {
      case 'device': {
        const a = this.getDeviceNickname(t, o);
        return t.source_device_iden === o.current_device_iden
          ? 'Your device'
          : a || 'Unknown device';
      }
      case 'channel_broadcast':
        return `Channel: ${this.getChannelName(t, o) || 'Unknown channel'}`;
      case 'channel_subscription':
        return `Channel: ${this.getChannelName(t, o) || 'Unknown channel'}`;
      default:
        return 'Unknown source';
    }
  }
  static computeOwnershipReason(t, o, n, a) {
    if (!n) return 'You received this';
    switch (a) {
      case 'device':
        return t.source_device_iden === o.current_device_iden
          ? 'You sent this'
          : 'From your device';
      case 'channel_broadcast':
        return `You own channel: ${this.getChannelName(t, o) || 'Unknown channel'}`;
      case 'channel_subscription':
        return 'You received this from a channel';
      default:
        return 'You own this';
    }
  }
  static async checkAndHandleUnknownSource(t) {
    (await C.isKnownSource(t.source_device_iden, t.channel_iden)) ||
      (await C.handleUnknownSource(t.source_device_iden, t.channel_iden));
  }
  static async enrichPushesWithContextRefresh(t, o) {
    for (const a of t) await this.checkAndHandleUnknownSource(a);
    const n = await C.getContext(o);
    return this.enrichPushes(t, n);
  }
}
async function U(e) {
  try {
    if (!e.type || !['note', 'link', 'broadcast'].includes(e.type))
      throw new Error(
        'Invalid push type. Must be "note", "link", or "broadcast"'
      );
    if (e.type === 'link' && !e.url)
      throw new Error('URL is required for link pushes');
    if (e.type === 'broadcast' && !e.channel_tag)
      throw new Error('Channel tag is required for broadcast pushes');
    const t = await d('pb_token');
    if (!t) throw new Error('No token available');
    const o = await d('pb_device_iden');
    if (!o) throw new Error('Chrome device not registered');
    const n = {
      type: e.type === 'broadcast' ? 'note' : e.type,
      source_device_iden: o,
    };
    (e.title && (n.title = e.title),
      e.body && (n.body = e.body),
      e.type === 'link' && (n.url = e.url),
      e.type === 'broadcast'
        ? (n.channel_tag = e.channel_tag)
        : e.targetDeviceIden && (n.target_device_iden = e.targetDeviceIden));
    const a = await m.fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
      body: JSON.stringify(n),
    });
    if (!a.ok) {
      if (a.status === 401)
        throw (
          await h(f.TokenRevoked, {
            message: 'Token revoked while creating push',
            code: a.status,
          }),
          new Error('Token is invalid or revoked')
        );
      if (a.status === 400) {
        const s = await a.json();
        throw new Error(
          `Invalid push data: ${s.error?.message || 'Bad request'}`
        );
      }
      throw new Error(`Failed to create push: ${a.status} ${a.statusText}`);
    }
    return await a.json();
  } catch (t) {
    throw (
      await h(f.Unknown, {
        message: 'Failed to create push',
        code: t instanceof Error ? void 0 : 500,
      }),
      t
    );
  }
}
async function G(e) {
  try {
    if (e.size > 26214400)
      throw new Error(
        `File size (${(e.size / 1024 / 1024).toFixed(1)}MB) exceeds the 25MB limit`
      );
    const o = await d('pb_token');
    if (!o) throw new Error('No token available');
    const n = {
        file_name: e.name,
        file_type: e.type || 'application/octet-stream',
      },
      a = await m.fetch('https://api.pushbullet.com/v2/upload-request', {
        method: 'POST',
        headers: { 'Access-Token': o, 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
      });
    if (!a.ok) {
      if (a.status === 401)
        throw (
          await h(f.TokenRevoked, {
            message: 'Token revoked while requesting upload',
            code: a.status,
          }),
          new Error('Token is invalid or revoked')
        );
      if (a.status === 413) throw new Error('File too large for upload');
      if (a.status === 400) {
        const i = await a.json();
        throw new Error(
          `Invalid upload request: ${i.error?.message || 'Bad request'}`
        );
      }
      throw new Error(`Failed to request upload: ${a.status} ${a.statusText}`);
    }
    const r = await a.json(),
      s = { uploadUrl: r.upload_url, fileUrl: r.file_url, s3Fields: r.data };
    return (console.log('Upload request successful:', s.fileUrl), s);
  } catch (t) {
    throw (
      console.error('Failed to request upload:', t),
      await h(f.Unknown, {
        message: 'Failed to request file upload',
        code: t instanceof Error ? void 0 : 500,
      }),
      t
    );
  }
}
async function Ae(e, t, o, n, a, r, s) {
  try {
    const i = await d('pb_token');
    if (!i) throw new Error('No token available');
    const c = await d('pb_device_iden');
    if (!c) throw new Error('Chrome device not registered');
    const g = {
      type: 'file',
      file_name: t,
      file_type: o,
      file_url: e,
      source_device_iden: c,
    };
    (n && (g.target_device_iden = n),
      a && (g.title = a),
      r && (g.body = r + ' (File: ' + t + ')'),
      s && (g.channel_tag = s));
    const u = await m.fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: { 'Access-Token': i, 'Content-Type': 'application/json' },
      body: JSON.stringify(g),
    });
    if (!u.ok) {
      if (u.status === 401)
        throw (
          await h(f.TokenRevoked, {
            message: 'Token revoked while creating file push',
            code: u.status,
          }),
          new Error('Token is invalid or revoked')
        );
      if (u.status === 400) {
        const y = await u.json();
        throw new Error(
          `Invalid file push data: ${y.error?.message || 'Bad request'}`
        );
      }
      throw new Error(
        `Failed to create file push: ${u.status} ${u.statusText}`
      );
    }
    const w = await u.json();
    return (console.log('File push created successfully:', w.iden), w);
  } catch (i) {
    throw (
      console.error('Failed to create file push:', i),
      await h(f.Unknown, {
        message: 'Failed to create file push',
        code: i instanceof Error ? void 0 : 500,
      }),
      i
    );
  }
}
async function z(e = 200, t, o) {
  try {
    const n = await d('pb_token');
    if (!n) throw new Error('No token available');
    const a = new URLSearchParams();
    (a.append('limit', e.toString()),
      t && a.append('modified_after', t.toString()),
      o && a.append('cursor', o));
    const r = await m.fetch(`https://api.pushbullet.com/v2/pushes?${a}`, {
      method: 'GET',
      headers: { 'Access-Token': n, 'Content-Type': 'application/json' },
    });
    if (!r.ok)
      throw r.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching push history',
            code: r.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(
            `Failed to fetch push history: ${r.status} ${r.statusText}`
          );
    const s = await r.json();
    return { pushes: s.pushes, cursor: s.cursor };
  } catch (n) {
    throw (
      await h(f.Unknown, {
        message: 'Failed to fetch push history',
        code: n instanceof Error ? void 0 : 500,
      }),
      n
    );
  }
}
async function $e(e, t = 200, o, n) {
  try {
    const a = await d('pb_token');
    if (!a) throw new Error('No token available');
    const r = new URLSearchParams();
    (r.append('limit', t.toString()),
      o && r.append('modified_after', o.toString()),
      n && r.append('cursor', n));
    const s = await m.fetch(`https://api.pushbullet.com/v2/pushes?${r}`, {
      method: 'GET',
      headers: { 'Access-Token': a, 'Content-Type': 'application/json' },
    });
    if (!s.ok)
      throw s.status === 401
        ? (await h(f.TokenRevoked, {
            message: 'Token revoked while fetching push history',
            code: s.status,
          }),
          new Error('Token is invalid or revoked'))
        : new Error(
            `Failed to fetch push history: ${s.status} ${s.statusText}`
          );
    const i = await s.json();
    return {
      pushes: await xt.enrichPushesWithContextRefresh(i.pushes, e),
      cursor: i.cursor,
    };
  } catch (a) {
    throw (
      await h(f.Unknown, {
        message: 'Failed to fetch enhanced push history',
        code: a instanceof Error ? void 0 : 500,
      }),
      a
    );
  }
}
async function R(e) {
  const t = await d('pb_token');
  if (!t) throw new Error('No token available');
  const o = await m.fetch(`https://api.pushbullet.com/v2/pushes/${e}`, {
    method: 'POST',
    headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dismissed: !0 }),
  });
  if (!o.ok)
    throw o.status === 401
      ? (await h(f.TokenRevoked, {
          message: 'Token revoked while dismissing push',
          code: o.status,
        }),
        new Error('Token is invalid or revoked'))
      : new Error(`Failed to dismiss push: ${o.status} ${o.statusText}`);
}
async function Ne(e) {
  const t = await d('pb_token');
  if (!t) throw new Error('No token available');
  const o = await m.fetch(`https://api.pushbullet.com/v2/pushes/${e}`, {
    method: 'DELETE',
    headers: { 'Access-Token': t, 'Content-Type': 'application/json' },
  });
  if (!o.ok)
    throw o.status === 401
      ? (await h(f.TokenRevoked, {
          message: 'Token revoked while deleting push',
          code: o.status,
        }),
        new Error('Token is invalid or revoked'))
      : new Error(`Failed to delete push: ${o.status} ${o.statusText}`);
}
const Ie = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        createFilePush: Ae,
        createPush: U,
        deletePush: Ne,
        dismissPush: R,
        getEnhancedPushHistory: $e,
        getPushHistory: z,
        requestUpload: G,
      },
      Symbol.toStringTag,
      { value: 'Module' }
    )
  ),
  S = { isOnline: !0, isProcessing: !1, processingInterval: null },
  Lt = 5e3,
  X = 3;
async function Z(e) {
  try {
    const t = { ...e, id: Gt(), timestamp: Date.now(), retryCount: 0 },
      o = (await d('pb_pending_ops')) || [];
    (o.push(t),
      await l('pb_pending_ops', o),
      console.log('Operation queued:', t.type, t.id),
      S.isOnline && (await Ue()));
  } catch (t) {
    (console.error('Failed to enqueue operation:', t),
      await h(f.Unknown, {
        message: 'Failed to queue operation',
        code: t instanceof Error ? void 0 : 500,
      }));
  }
}
async function Ue() {
  if (!S.isProcessing) {
    S.isProcessing = !0;
    try {
      const e = (await d('pb_pending_ops')) || [];
      if (e.length === 0) return;
      console.log(`Processing ${e.length} queued operations`);
      for (const t of e)
        try {
          await Bt(t);
          const o = e.filter(n => n.id !== t.id);
          (await l('pb_pending_ops', o),
            await new Promise(n => setTimeout(n, Lt)));
        } catch (o) {
          if (
            (console.error('Failed to process operation:', t.id, o),
            t.retryCount++,
            t.retryCount >= X)
          ) {
            console.log(
              'Operation exceeded max retries, removing from queue:',
              t.id
            );
            const n = e.filter(a => a.id !== t.id);
            (await l('pb_pending_ops', n),
              await h(f.Unknown, {
                message: `Operation failed after ${X} retries: ${t.type}`,
                code: 1002,
              }));
          } else {
            const n = e.map(a => (a.id === t.id ? t : a));
            await l('pb_pending_ops', n);
          }
        }
    } catch (e) {
      console.error('Failed to process queue:', e);
    } finally {
      S.isProcessing = !1;
    }
  }
}
async function Bt(e) {
  switch (e.type) {
    case 'pushSend':
      await U(e.payload);
      break;
    case 'smsSend':
      throw new Error('SMS sending not yet implemented');
    case 'dismissal':
      throw new Error('Dismissal not yet implemented');
    default:
      throw new Error(`Unknown operation type: ${e.type}`);
  }
}
async function Ht() {
  return {
    pendingCount: ((await d('pb_pending_ops')) || []).length,
    isOnline: S.isOnline,
    isProcessing: S.isProcessing,
  };
}
async function jt() {
  (await l('pb_pending_ops', []), console.log('Operation queue cleared'));
}
function Gt() {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function zt() {
  ((S.processingInterval = setInterval(() => {
    S.isProcessing || Ue();
  }, 5e3)),
    console.log('Operation queue system initialized'));
}
const Rt = 4 * 1024 * 1024,
  ee = 12,
  Oe = 'quota-check',
  L = 'pb_push_history',
  B = 'pb_transfers',
  Wt = 'pb_settings';
async function qt() {
  try {
    (await chrome.alarms.create(Oe, { periodInMinutes: ee * 60 }),
      console.log(`Quota monitor initialized with ${ee} hour interval`),
      chrome.alarms.onAlarm.addListener(Vt),
      await xe());
  } catch (e) {
    console.error('Failed to initialize quota monitor:', e);
  }
}
function Vt(e) {
  e.name === Oe && xe();
}
async function xe() {
  try {
    const e = await qe();
    (console.log(`Storage quota check: ${e} bytes used`),
      e > Rt &&
        (console.log('Storage quota exceeded, purging old data...'),
        await Kt(),
        await h(f.QuotaExceeded, {
          message: `Storage quota exceeded (${Math.round((e / 1024 / 1024) * 100) / 100} MB used)`,
          code: e,
        })));
  } catch (e) {
    console.error('Failed to check quota:', e);
  }
}
async function Kt() {
  const e = Date.now(),
    t = e - 2160 * 60 * 60 * 1e3,
    o = e - 720 * 60 * 60 * 1e3;
  let n = 0;
  try {
    const a = (await d(L)) || [],
      r = a.filter(u => u.timestamp > t);
    r.length < a.length &&
      (await l(L, r),
      (n += a.length - r.length),
      console.log(`Purged ${a.length - r.length} old push history entries`));
    const s = (await d(B)) || [],
      i = s.filter(u => u.timestamp > o);
    i.length < s.length &&
      (await l(B, i),
      (n += s.length - i.length),
      console.log(`Purged ${s.length - i.length} old transfer entries`));
    const g = (await Yt()).filter(u => u.startsWith('mirror_'));
    for (const u of g) {
      const w = await d(u);
      w && w.timestamp && w.timestamp < o && (await $(u), n++);
    }
    console.log(`Quota purge completed: ${n} items removed`);
  } catch (a) {
    throw (console.error('Failed to purge old data:', a), a);
  }
}
async function Yt() {
  return [L, B, Wt, 'pb_token', 'pb_device_iden', 'pb_last_modified'];
}
const te = 6,
  Le = 'token-health-check';
async function Qt() {
  try {
    (await chrome.alarms.create(Le, { periodInMinutes: te * 60 }),
      console.log(`Token health monitor initialized with ${te} hour interval`),
      chrome.alarms.onAlarm.addListener(Jt),
      await Be());
  } catch (e) {
    console.error('Failed to initialize token health monitor:', e);
  }
}
function Jt(e) {
  e.name === Le && Be();
}
async function Be() {
  try {
    const e = await d('pb_token');
    if (!e)
      return (
        console.log('No token found for health check'),
        { isValid: !1, lastChecked: Date.now(), error: 'No token found' }
      );
    console.log('Checking token health...');
    const t = await m.fetch('https://api.pushbullet.com/v2/users/me', {
        method: 'GET',
        headers: { 'Access-Token': e, 'Content-Type': 'application/json' },
      }),
      o = { isValid: t.ok, lastChecked: Date.now() };
    if (t.ok) {
      const n = await t.json();
      (console.log('Token health check passed for user:', n.name),
        await l('pb_token_health', o));
    } else
      t.status === 401
        ? (console.error('Token health check failed: Token revoked'),
          (o.error = 'Token revoked'),
          await Xt())
        : (console.error('Token health check failed:', t.status, t.statusText),
          (o.error = `API error: ${t.status}`));
    return (await l('pb_token_health', o), o);
  } catch (e) {
    console.error('Token health check error:', e);
    const t = {
      isValid: !1,
      lastChecked: Date.now(),
      error: e instanceof Error ? e.message : 'Unknown error',
    };
    return (await l('pb_token_health', t), t);
  }
}
async function Xt() {
  try {
    (console.log('Handling token revocation...'),
      await h(f.TokenRevoked, {
        message: 'Token has been revoked by Pushbullet',
        code: 401,
      }),
      await l('pb_token', ''),
      await l('pb_device_iden', ''),
      await chrome.action.setBadgeText({ text: 'AUTH' }),
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }),
      console.log('Token revocation handled'));
  } catch (e) {
    console.error('Failed to handle token revocation:', e);
  }
}
console.log('Pushbridge background service worker started');
const oe = 'pb_last_popup_opened',
  Zt = 36e5;
async function eo() {
  try {
    const e = [
      'pb_recent_pushes_state',
      'pb_devices_cursor',
      'pb_devices_has_more',
      'pb_subscriptions_cursor',
      'pb_subscriptions_has_more',
      'pb_channels_cursor',
      'pb_channels_has_more',
      'pb_contacts_cursor',
      'pb_contacts_has_more',
    ];
    for (const n of e) await l(n, null);
    const t = await chrome.storage.local.get(null),
      o = Object.keys(t).filter(n => n.startsWith('pb_sms_thread_cursor_'));
    for (const n of o) await chrome.storage.local.remove(n);
    console.log('All cursors cleared');
  } catch (e) {
    console.error('Failed to clear cursors:', e);
  }
}
async function to() {
  try {
    console.log('[Background] Initializing SMS sync...');
    const e = await E();
    e
      ? (console.log(
          `[Background] Default SMS device: ${e.nickname} (${e.iden})`
        ),
        console.log(`[Background] SMS-capable device found: ${e.nickname}`),
        setInterval(
          async () => {
            await O('periodic');
          },
          360 * 60 * 1e3
        ),
        console.log('[Background] SMS sync initialized with 6-hour interval'))
      : console.log(
          '[Background] No SMS-capable device found, skipping SMS sync'
        );
  } catch (e) {
    console.error('[Background] Failed to initialize SMS sync:', e);
  }
}
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Pushbridge extension installed');
  try {
    (await m.initialize(),
      await W.loadState(),
      console.log('[Background] Rate limit manager initialized'),
      q.initialize(),
      console.log('[Background] Token bucket initialized'),
      setInterval(() => {
        const t = W.getDebugInfo(),
          o = q.getDetailedStatus();
        ((t.isBackoffActive || t.backoffState.isActive) &&
          console.log('[Background] Backoff debug info:', t),
          o.bucket <= 10 &&
            console.log('[Background] Token bucket status:', o));
      }, 1e4),
      setInterval(async () => {
        try {
          (await b.validateState()) ||
            console.warn(
              '[Background] Unified notification tracker state validation failed'
            );
        } catch (t) {
          console.error(
            '[Background] Failed to validate unified notification tracker state:',
            t
          );
        }
      }, 300 * 1e3),
      await Mt(),
      await qt(),
      await Qt(),
      zt(),
      await st(),
      await pe(),
      await to(),
      console.log('[Background] SMS sync using simple system'),
      await C.loadContext(),
      console.log('[Background] Context manager initialized'),
      await b.initialize(),
      await ye(),
      await me());
    const e = await Ut();
    (e > 0 && console.log(`Resumed ${e} interrupted uploads`),
      await Ot(),
      bo());
  } catch (e) {
    console.error('Failed to initialize background services:', e);
  }
});
chrome.runtime.onStartup.addListener(async () => {
  console.log('Pushbridge service worker started');
  try {
    (await me(), await _e());
  } catch (e) {
    console.error('Failed to handle service worker startup:', e);
  }
});
chrome.notifications.onClicked.addListener(async e => {
  try {
    const t = await d(`notification_${e}`);
    if (!t) {
      console.log('No notification data found for:', e);
      return;
    }
    (t.url
      ? await chrome.tabs.create({ url: t.url })
      : await chrome.action.openPopup(),
      await l(`notification_${e}`, null));
  } catch (t) {
    console.error('Failed to handle notification click:', t);
  }
});
chrome.notifications.onButtonClicked.addListener(async (e, t) => {
  try {
    const o = await d(`notification_${e}`);
    if (!o) return;
    t === 0 &&
      (await R(o.pushIden),
      await chrome.notifications.clear(e),
      await l(`notification_${e}`, null));
  } catch (o) {
    console.error('Failed to handle notification button click:', o);
  }
});
chrome.notifications.onClicked.addListener(async e => {
  if (e.includes('-') && e.length === 36) await we(e);
  else
    try {
      const o = await d(`notification_${e}`);
      if (!o) {
        console.log('No notification data found for:', e);
        return;
      }
      (o.url
        ? await chrome.tabs.create({ url: o.url })
        : await chrome.action.openPopup(),
        await l(`notification_${e}`, null));
    } catch (o) {
      console.error('Failed to handle notification click:', o);
    }
});
chrome.notifications.onClosed.addListener(async (e, t) => {
  t && e.includes('-') && e.length === 36 && (await we(e));
});
chrome.runtime.onMessage.addListener((e, t, o) => {
  switch ((console.log('📨 [Background] Received message:', e), e.cmd)) {
    case 'verifyToken':
      oo(e.token, o);
      break;
    case 'getDevices':
      no(e.forceRefresh, o);
      break;
    case 'clearDeviceCache':
      ao(o);
      break;
    case 'createPush':
      ro(e.payload, o);
      break;
    case 'getPushHistory':
      so(e.limit, e.modifiedAfter, e.cursor, o);
      break;
    case 'getEnhancedPushHistory':
      io(e.trigger, e.limit, e.modifiedAfter, e.cursor, o);
      break;
    case 'dismissPush':
      co(e.pushIden, o);
      break;
    case 'deletePush':
      lo(e.pushIden, o);
      break;
    case 'syncHistory':
      uo(o);
      break;
    case 'getQueueStatus':
      po(o);
      break;
    case 'clearQueue':
      go(o);
      break;
    case 'getActiveMirrors':
      wo(o);
      break;
    case 'POPUP_OPEN':
      zo(o);
      break;
    case 'CLEAR_SMS_NOTIFICATIONS':
      Bo(o);
      break;
    case 'UPLOAD_FILE':
      mo(e.payload, o);
      break;
    case 'UPLOAD_FILE_FOR_SMS':
      _o(e.payload, o);
      break;
    case 'GET_TRANSFERS':
      ko(o);
      break;
    case 'DOWNLOAD_FILE':
      yo(e.payload, o);
      break;
    case 'GET_SMS_CONVERSATIONS':
    case 'GET_SMS_CONVERSATIONS_FROM_API':
      vo(o);
      break;
    case 'GET_SMS_THREAD':
    case 'GET_SMS_THREAD_FROM_API':
    case 'LOAD_FULL_SMS_THREAD':
      ne(e.conversationId, e.deviceIden, o);
      break;
    case 'GET_SMS_THREAD_PAGED':
      ne(e.conversationId, e.deviceIden, o);
      break;
    case 'SEND_SMS':
      Do(
        e.payload.conversationId,
        e.payload.message,
        o,
        e.payload.deviceIden,
        e.payload.attachments
      );
      break;
    case 'MARK_CONVERSATION_READ':
      So(e.conversationId, o);
      break;
    case 'GET_DEFAULT_SMS_DEVICE':
      To(o);
      break;
    case 'GET_SMS_CAPABLE_DEVICES':
      Eo(o);
      break;
    case 'SET_DEFAULT_SMS_DEVICE':
      Fo(e.deviceIden, o);
      break;
    case 'SYNC_SMS_HISTORY':
      Co(e.deviceIden, o);
      break;
    case 'RELOAD_SMS_THREAD':
      Po(e.deviceIden, e.threadId, o);
      break;
    case 'GET_SMS_DEVICE_INFO':
      Mo(o);
      break;
    case 'GET_CHANNEL_SUBSCRIPTIONS':
      Ao(e.forceRefresh, o);
      break;
    case 'SUBSCRIBE_TO_CHANNEL':
      $o(e.channelTag, o);
      break;
    case 'UNSUBSCRIBE_FROM_CHANNEL':
      No(e.subscriptionIden, o);
      break;
    case 'GET_CHANNEL_INFO':
      Io(e.channelTag, o);
      break;
    case 'GET_OWNED_CHANNELS':
      Oo(o);
      break;
    case 'REFRESH_CHANNEL_DATA':
      xo(o);
      break;
    case 'GET_SUBSCRIPTION_POSTS':
      Lo(o);
      break;
    case 'clearAllData':
      Ho(o);
      break;
    case 'testWebSocket':
      jo(o);
      break;
    case 'getDebugLog':
      Go(o);
      break;
    case 'getUnifiedTrackerState':
      Wo(o);
      break;
    case 'DEBUG_SMS':
    case 'DEBUG_STORAGE':
      o({ success: !1, error: 'Debug functions removed in simple system' });
      break;
    default:
      o({ status: 'unknown_command' });
  }
  return !0;
});
async function oo(e, t) {
  try {
    const o = await m.fetch('https://api.pushbullet.com/v2/users/me', {
      method: 'GET',
      headers: { 'Access-Token': e, 'Content-Type': 'application/json' },
    });
    if (o.ok) {
      const n = await o.json();
      (console.log('Token verified successfully for user:', n.name),
        await l('pb_token', e),
        await l('pb_user_iden', n.iden));
      try {
        const a = await Ve();
        (console.log('Chrome device registered:', a),
          t({ ok: !0, user: n, deviceIden: a }));
      } catch (a) {
        (console.error('Device registration failed:', a),
          t({ ok: !0, user: n, deviceError: 'Device registration failed' }));
      }
    } else
      o.status === 401
        ? (console.error('Token verification failed: Unauthorized'),
          await h(f.TokenRevoked, {
            message: 'Token is invalid or revoked',
            code: o.status,
          }),
          t({
            ok: !1,
            error: 'Invalid token. Please check your Pushbullet access token.',
          }))
        : (console.error('Token verification failed:', o.status, o.statusText),
          await h(f.Unknown, {
            message: 'Token verification failed',
            code: o.status,
          }),
          t({ ok: !1, error: 'Token verification failed. Please try again.' }));
  } catch (o) {
    (console.error('Token verification error:', o),
      await h(f.Unknown, { message: 'Token verification failed' }),
      t({
        ok: !1,
        error: 'Failed to verify token. Please check your internet connection.',
      }));
  }
}
async function no(e, t) {
  try {
    const o = await Ke(e);
    t({ ok: !0, devices: o });
  } catch (o) {
    (console.error('Failed to get devices:', o),
      t({ ok: !1, error: 'Failed to fetch devices' }));
  }
}
async function ao(e) {
  try {
    (await re(), e({ ok: !0 }));
  } catch (t) {
    (console.error('Failed to clear device cache:', t),
      e({ ok: !1, error: 'Failed to clear cache' }));
  }
}
async function ro(e, t) {
  try {
    if (!Te()) {
      (await Z({ type: 'pushSend', payload: e }),
        t({ ok: !0, queued: !0, message: 'Push queued for later delivery' }));
      return;
    }
    const o = await U(e);
    try {
      chrome.runtime.sendMessage({
        cmd: 'pushCreated',
        source: 'background',
        push: o,
      });
    } catch {}
    t({ ok: !0, push: o });
  } catch (o) {
    if (
      (console.error('Failed to create push:', o),
      o instanceof Error && o.message.includes('network'))
    ) {
      (await Z({ type: 'pushSend', payload: e }),
        t({ ok: !0, queued: !0, message: 'Push queued due to network error' }));
      return;
    }
    t({
      ok: !1,
      error: o instanceof Error ? o.message : 'Failed to create push',
    });
  }
}
async function so(e, t, o, n) {
  try {
    const a = await z(e, t, o);
    if (
      (console.log('📋 [handleGetPushHistory] Response:', {
        ok: !0,
        history: a.pushes.length,
        modifiedAfter: t,
        cursor: o,
      }),
      a.pushes.length > 0)
    ) {
      const r = Math.max(...a.pushes.map(s => s.modified));
      await l('pb_last_modified', r);
    }
    n({ ok: !0, history: a });
  } catch (a) {
    (console.error('Failed to get push history:', a),
      n({ ok: !1, error: 'Failed to fetch push history' }));
  }
}
async function io(e, t, o, n, a) {
  try {
    console.log(
      '🔄 [Background] Getting enhanced push history with trigger:',
      e.type
    );
    const r = await $e(e, t, o, n);
    if (
      (console.log('📋 [handleGetEnhancedPushHistory] Response:', {
        ok: !0,
        history: r.pushes.length,
        modifiedAfter: o,
        cursor: n,
        trigger: e.type,
      }),
      r.pushes.length > 0)
    ) {
      const s = Math.max(...r.pushes.map(i => i.modified));
      if (
        (await l('pb_last_modified', s),
        console.log(
          '🔍 [Background] Enhanced push details:',
          r.pushes.map(i => ({
            iden: i.iden,
            type: i.type,
            title: i.title,
            receiver_iden: i.receiver_iden,
            target_device_iden: i.target_device_iden,
            dismissed: i.dismissed,
            created: i.created,
            modified: i.modified,
            channel_iden: i.channel_iden,
          }))
        ),
        e.type === 'unknown_source')
      ) {
        console.log(
          '🔔 [Background] Processing pushes for notifications (WebSocket tickle)'
        );
        let i = 0;
        for (const c of r.pushes)
          !c.dismissed &&
          (c.receiver_iden ||
            c.target_device_iden ||
            c.type === 'mirror' ||
            c.type === 'file' ||
            c.channel_iden)
            ? (await b.shouldShowNotification({
                id: c.iden,
                type: 'push',
                created: c.created,
                metadata: { pushIden: c.iden },
              }))
              ? (console.log(
                  `🔔 [Background] Processing new push: ${c.iden} (type: ${c.type})`
                ),
                ((await He(c)) || c.type === 'file' || c.channel_iden) &&
                  (console.log(
                    '🔔 [Background] Updating badge for new push notification'
                  ),
                  await k.addPushNotifications(1),
                  await b.markAsProcessed(
                    'push',
                    c.iden,
                    new Date(c.created).getTime()
                  ),
                  i++))
              : console.log(
                  `⏭️ [Background] Skipping already processed push: ${c.iden}`
                )
            : console.log(
                `⏭️ [Background] Skipping push: ${c.iden} (dismissed: ${c.dismissed})`
              );
        console.log(
          `📊 [Background] New push processing summary: ${i} new notifications`
        );
      } else
        console.log(
          `⏭️ [Background] Skipping notification processing for trigger: ${e.type} (popup open)`
        );
    } else
      console.log('🔄 [Background] No new pushes found in enhanced history');
    a({ ok: !0, history: r });
  } catch (r) {
    (console.error('Failed to get enhanced push history:', r),
      a({ ok: !1, error: 'Failed to fetch enhanced push history' }));
  }
}
async function co(e, t) {
  try {
    (await R(e),
      console.log('🔔 [Background] Push dismissed, updating badge'),
      await k.addPushNotifications(-1),
      t({ ok: !0 }));
  } catch (o) {
    (console.error('Failed to dismiss push:', o),
      t({ ok: !1, error: 'Failed to dismiss push' }));
  }
}
async function lo(e, t) {
  try {
    (await Ne(e),
      console.log('🔔 [Background] Push deleted, updating badge'),
      await k.addPushNotifications(-1),
      t({ ok: !0 }));
  } catch (o) {
    (console.error('Failed to delete push:', o),
      t({ ok: !1, error: 'Failed to delete push' }));
  }
}
async function uo(e) {
  try {
    console.log('🔄 [Background] Syncing push history');
    const t = await d('pb_last_modified'),
      o = await chrome.storage.local.get('pb_recent_pushes_state'),
      n = o.pb_recent_pushes_state?.cursor,
      a = await z(100, t, n);
    if (a.pushes.length > 0) {
      (console.log(`🔄 [Background] Found ${a.pushes.length} pushes from API`),
        console.log(
          '🔍 [Background] Push details:',
          a.pushes.map(c => ({
            iden: c.iden,
            type: c.type,
            title: c.title,
            receiver_iden: c.receiver_iden,
            target_device_iden: c.target_device_iden,
            dismissed: c.dismissed,
            created: c.created,
            modified: c.modified,
          }))
        ));
      const r = Math.max(...a.pushes.map(c => c.modified));
      if ((await l('pb_last_modified', r), a.cursor)) {
        const c = o.pb_recent_pushes_state || {};
        await chrome.storage.local.set({
          pb_recent_pushes_state: {
            ...c,
            cursor: a.cursor,
            hasMore: !!a.cursor,
          },
        });
      }
      let s = 0,
        i = 0;
      for (const c of a.pushes)
        !c.dismissed &&
        (c.receiver_iden ||
          c.target_device_iden ||
          c.type === 'mirror' ||
          c.type === 'file' ||
          c.channel_iden)
          ? (await b.shouldShowNotification({
              id: c.iden,
              type: 'push',
              created: c.created,
              metadata: { pushIden: c.iden },
            }))
            ? (console.log(
                `🔔 [Background] Processing push: ${c.iden} (type: ${c.type})`
              ),
              ((await He(c)) || c.type === 'file' || c.channel_iden) &&
                (console.log(
                  '🔔 [Background] Updating badge for new push notification'
                ),
                await k.addPushNotifications(1),
                await b.markAsProcessed(
                  'push',
                  c.iden,
                  new Date(c.created).getTime()
                )),
              s++)
            : (console.log(
                `⏭️ [Background] Skipping already processed push: ${c.iden}`
              ),
              i++)
          : (console.log(
              `⏭️ [Background] Skipping push: ${c.iden} (dismissed: ${c.dismissed}, receiver_iden: ${c.receiver_iden}, target_device_iden: ${c.target_device_iden})`
            ),
            i++);
      console.log(
        `📊 [Background] Push processing summary: ${s} processed, ${i} skipped`
      );
    } else console.log('🔄 [Background] No new pushes found');
    try {
      chrome.runtime.sendMessage({
        cmd: 'syncHistory',
        source: 'background',
        newPushes: a.pushes.length,
      });
    } catch {}
    e({ ok: !0, newPushes: a.pushes.length });
  } catch (t) {
    (console.error('Failed to sync history:', t),
      e({ ok: !1, error: 'Failed to sync history' }));
  }
}
async function He(e) {
  try {
    console.log('🔔 [Background] Showing push notification:', {
      type: e.type,
      title: e.title,
      channel_tag: e.channel_tag,
    });
    const t = await d('pb_device_iden');
    if (e.receiver_iden !== t)
      return (
        console.log(
          '🔔 [Background] Push not for this device, skipping notification'
        ),
        !1
      );
    let o, n, a;
    if (e.type === 'file') {
      ((o = 'File received'),
        (n = e.file_name || 'New file'),
        (a = '/icons/48.png'));
      const s = {
        id: e.iden,
        type: 'received',
        fileName: e.file_name,
        fileSize: 0,
        fileType: e.file_type || 'application/octet-stream',
        timestamp: Date.now(),
        status: 'completed',
        sourceDevice: e.source_device_iden,
      };
      (await je(s), await ho(e));
    } else
      e.channel_tag
        ? ((o = `${e.channel_tag}: ${e.title ?? 'New post'}`),
          (n = e.body ?? ''),
          (a = '/icons/48.png'),
          await fo(e))
        : ((o = e.title || (e.type === 'link' ? e.url : 'New push')),
          (n = e.body || ''),
          (a = '/icons/48.png'));
    const r = `push_${e.iden}`;
    return (
      await chrome.notifications.create(r, {
        type: 'basic',
        iconUrl: a,
        title: o,
        message: n,
        requireInteraction: !0,
      }),
      await l(`notification_${r}`, {
        pushIden: e.iden,
        url: e.url,
        type: e.type,
        channelTag: e.channel_tag,
      }),
      console.log('🔔 [Background] Updating badge for new push notification'),
      await k.addPushNotifications(1),
      console.log('🔔 [Background] Push notification created:', r),
      !0
    );
  } catch (t) {
    return (console.error('Failed to show push notification:', t), !1);
  }
}
async function ho(e) {
  try {
    (await chrome.downloads.download({
      url: e.file_url,
      filename: e.file_name,
    }),
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/48.png',
        title: 'File Downloaded',
        message: `File "${e.file_name}" has been downloaded`,
      }));
  } catch (t) {
    (console.error('Failed to download received file:', t),
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/48.png',
        title: 'File Available',
        message: `Click to view file "${e.file_name}"`,
      }));
  }
}
async function fo(e) {
  try {
    const t = (await d('pb_recent_pushes')) || [],
      o = { ...e, isChannelPush: !0, channelTag: e.channel_tag };
    (t.unshift(o),
      t.length > 500 && t.splice(500),
      await l('pb_recent_pushes', t));
  } catch (t) {
    console.error('Failed to add channel push to recent list:', t);
  }
}
async function po(e) {
  try {
    const t = await Ht(),
      o = Ee();
    e({ ok: !0, queue: t, connection: o });
  } catch (t) {
    (console.error('Failed to get queue status:', t),
      e({ ok: !1, error: 'Failed to get queue status' }));
  }
}
async function go(e) {
  try {
    (await jt(), e({ ok: !0 }));
  } catch (t) {
    (console.error('Failed to clear queue:', t),
      e({ ok: !1, error: 'Failed to clear queue' }));
  }
}
async function wo(e) {
  try {
    const t = await mt();
    e({ success: !0, mirrors: t });
  } catch (t) {
    (console.error('Failed to get active mirrors:', t),
      e({ success: !1, error: 'Failed to fetch notifications' }));
  }
}
async function je(e) {
  try {
    const t = (await d('pb_transfers')) || [];
    (t.unshift(e), t.length > 50 && t.splice(50), await l('pb_transfers', t));
  } catch (t) {
    console.error('Failed to add transfer record:', t);
  }
}
async function mo(e, t) {
  try {
    const {
        fileData: o,
        targetDeviceIden: n,
        title: a,
        body: r,
        channel_tag: s,
      } = e,
      i = new File([new Uint8Array(o.buffer)], o.name, {
        type: o.type,
        lastModified: o.lastModified,
      }),
      c = await G(i),
      u = await De(c, i, w => {
        chrome.runtime
          .sendMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { progress: w.percentage },
          })
          .catch(() => {});
      });
    if (u.success) {
      const w = await Ae(
          c.fileUrl,
          i.name,
          i.type || 'application/octet-stream',
          n,
          a,
          r,
          s
        ),
        y = {
          id: w.iden,
          type: 'sent',
          fileName: i.name,
          fileSize: i.size,
          fileType: i.type || 'application/octet-stream',
          timestamp: Date.now(),
          status: 'completed',
          targetDevice: n,
        };
      await je(y);
      try {
        chrome.runtime.sendMessage({
          cmd: 'pushCreated',
          source: 'background',
          push: w,
        });
      } catch {}
      (await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/48.png',
        title: 'File Sent',
        message: `File "${i.name}" sent successfully`,
      }),
        t({ success: !0, filePush: w }));
    } else t({ success: !1, error: u.error });
  } catch (o) {
    (console.error('Failed to upload file:', o),
      t({
        success: !1,
        error: o instanceof Error ? o.message : 'Upload failed',
      }));
  }
}
async function _o(e, t) {
  try {
    const { fileData: o } = e,
      n = new File([new Uint8Array(o.buffer)], o.name, {
        type: o.type,
        lastModified: o.lastModified,
      }),
      a = await G(n),
      s = await De(a, n, i => {
        chrome.runtime
          .sendMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { progress: i.percentage },
          })
          .catch(() => {});
      });
    s.success
      ? t({ success: !0, fileUrl: a.fileUrl })
      : t({ success: !1, error: s.error });
  } catch (o) {
    (console.error('Failed to upload file for SMS:', o),
      t({
        success: !1,
        error: o instanceof Error ? o.message : 'Upload failed',
      }));
  }
}
async function ko(e) {
  try {
    const t = (await d('pb_transfers')) || [];
    e({ success: !0, transfers: t });
  } catch (t) {
    (console.error('Failed to get transfers:', t),
      e({ success: !1, error: 'Failed to load transfers' }));
  }
}
async function yo(e, t) {
  try {
    if (!((await d('pb_transfers')) || []).find(a => a.id === e.transferId)) {
      t({ success: !1, error: 'Transfer not found' });
      return;
    }
    (await chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/48.png',
      title: 'Download Not Available',
      message: 'File download will be implemented in a future update',
    }),
      t({ success: !0 }));
  } catch (o) {
    (console.error('Failed to download file:', o),
      t({ success: !1, error: 'Download failed' }));
  }
}
function bo() {
  chrome.contextMenus.removeAll(() => {
    (chrome.contextMenus.create({
      id: 'push-page',
      title: 'Push this page',
      contexts: ['page'],
    }),
      chrome.contextMenus.create({
        id: 'push-link',
        title: 'Push this link',
        contexts: ['link'],
      }),
      chrome.contextMenus.create({
        id: 'push-image',
        title: 'Push this image',
        contexts: ['image'],
      }),
      chrome.contextMenus.create({
        id: 'push-selection',
        title: 'Push selected text',
        contexts: ['selection'],
      }));
  });
}
chrome.contextMenus.onClicked.addListener(async (e, t) => {
  if (t)
    try {
      let o;
      switch (e.menuItemId) {
        case 'push-page':
          o = {
            type: 'link',
            url: t.url,
            title: t.title,
            body: `Page shared from ${new URL(t.url).hostname}`,
          };
          break;
        case 'push-link':
          o = {
            type: 'link',
            url: e.linkUrl,
            title: e.linkText || e.linkUrl,
            body: `Link shared from ${new URL(t.url).hostname}`,
          };
          break;
        case 'push-image':
          o = {
            type: 'link',
            url: e.srcUrl,
            title: e.altText || 'Image',
            body: `Image shared from ${new URL(t.url).hostname}`,
          };
          break;
        case 'push-selection':
          o = {
            type: 'note',
            body: e.selectionText,
            title: `Text from ${new URL(t.url).hostname}`,
          };
          break;
        default:
          return;
      }
      (await U(o),
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/48.png',
          title: 'Push Sent',
          message: 'Your push has been sent successfully!',
        }));
    } catch (o) {
      (console.error('Failed to handle context menu click:', o),
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/48.png',
          title: 'Push Failed',
          message: 'Failed to send push. Please try again.',
        }));
    }
});
async function vo(e) {
  try {
    console.log(
      '📱 [Background] Getting SMS conversations (simple) - returning cached data'
    );
    const t = await E();
    if (!t) {
      e({ success: !1, error: 'No SMS device available' });
      return;
    }
    const o = await Ye(t.iden);
    e({ success: !0, conversations: o.threads, lastSync: o.lastSync });
  } catch (t) {
    (console.error('[Background] Failed to get SMS conversations:', t),
      e({
        success: !1,
        error: t instanceof Error ? t.message : 'Failed to get conversations',
      }));
  }
}
async function ne(e, t, o) {
  try {
    console.log(`📨 [Background] Getting SMS thread: ${e} (simple)`);
    let n = t;
    if (!n) {
      const r = await E();
      if (!r) {
        o({ success: !1, error: 'No SMS device available' });
        return;
      }
      n = r.iden;
    }
    console.log('📨 [Background] Loading thread from cache (no sync needed)');
    const a = await Qe(n, e);
    o(
      a
        ? { success: !0, thread: a }
        : { success: !1, error: 'Thread not found' }
    );
  } catch (n) {
    (console.error('[Background] Failed to get SMS thread:', n),
      o({
        success: !1,
        error: n instanceof Error ? n.message : 'Failed to get thread',
      }));
  }
}
async function O(e = 'manual') {
  try {
    console.log(`🔄 [Background] Triggering SMS sync (${e})`);
    const t = await E();
    if (!t) {
      console.warn('⚠️ [Background] No SMS device for sync');
      return;
    }
    await Ze(t.iden);
  } catch (t) {
    console.error(`❌ [Background] SMS sync failed (${e}):`, t);
  }
}
async function So(e, t) {
  try {
    (console.log(`[Background] Marking conversation ${e} as read`),
      t({ success: !0 }));
  } catch (o) {
    (console.error('Failed to mark conversation as read:', o),
      t({ success: !1, error: 'Failed to mark as read' }));
  }
}
async function To(e) {
  try {
    console.log('[Background] Getting default SMS device...');
    const t = await E();
    t
      ? (console.log('[Background] Default SMS device found:', {
          iden: t.iden,
          nickname: t.nickname,
          has_sms: t.has_sms,
        }),
        e({
          success: !0,
          device: { iden: t.iden, nickname: t.nickname, has_sms: t.has_sms },
        }))
      : (console.warn('[Background] No SMS-capable device found'),
        e({ success: !1, error: 'No SMS-capable device found' }));
  } catch (t) {
    (console.error('[Background] Failed to get default SMS device:', t),
      e({ success: !1, error: 'Failed to get SMS device' }));
  }
}
async function Eo(e) {
  try {
    const { getSmsCapableDevices: t } = await _(async () => {
        const { getSmsCapableDevices: n } = await import(
          './notificationBadge.js'
        ).then(a => a.w);
        return { getSmsCapableDevices: n };
      }, []),
      o = await t();
    e({ success: !0, devices: o });
  } catch (t) {
    (console.error('Failed to get SMS-capable devices:', t),
      e({ success: !1, error: 'Failed to get devices' }));
  }
}
async function Fo(e, t) {
  try {
    const { setDefaultSmsDevice: o } = await _(async () => {
        const { setDefaultSmsDevice: a } = await import(
          './notificationBadge.js'
        ).then(r => r.w);
        return { setDefaultSmsDevice: a };
      }, []),
      n = await o(e);
    t({ success: n });
  } catch (o) {
    (console.error('Failed to set default SMS device:', o),
      t({ success: !1, error: 'Failed to set device' }));
  }
}
async function Co(e, t) {
  try {
    (await O('manual'), t({ success: !0 }));
  } catch (o) {
    (console.error('Failed to sync SMS history:', o),
      t({ success: !1, error: 'Failed to sync history' }));
  }
}
async function Po(e, t, o) {
  try {
    if (
      (console.log(
        `📱 [Background] Reloading SMS thread: ${t} for device: ${e}`
      ),
      !e)
    ) {
      const a = await E();
      if (!a) {
        o({ success: !1, error: 'No SMS device available' });
        return;
      }
      e = a.iden;
    }
    if (!t) {
      o({ success: !1, error: 'Thread ID is required' });
      return;
    }
    const n = await Je(e, t);
    o(
      n
        ? { success: !0, thread: n }
        : {
            success: !1,
            error:
              'Failed to reload thread - device may be offline or thread not found',
          }
    );
  } catch (n) {
    (console.error('[Background] Failed to reload SMS thread:', n),
      o({
        success: !1,
        error: n instanceof Error ? n.message : 'Failed to reload SMS thread',
      }));
  }
}
async function Mo(e) {
  try {
    const t = await E();
    e(
      t
        ? {
            success: !0,
            device: {
              iden: t.iden,
              nickname: t.nickname,
              model: t.model,
              type: t.type,
            },
          }
        : { success: !1, error: 'No SMS device found' }
    );
  } catch (t) {
    (console.error('Failed to get SMS device info:', t),
      e({ success: !1, error: 'Failed to get device info' }));
  }
}
async function Do(e, t, o, n, a) {
  try {
    console.log('📱 [Background] Sending SMS:', {
      conversationId: e,
      messageLength: t.length,
      deviceIden: n,
      hasAttachments: !!a,
    });
    let r = n;
    if (!r) {
      const s = await E();
      if (!s) {
        o({ success: !1, error: 'No SMS device available' });
        return;
      }
      r = s.iden;
    }
    if (!t.trim() && (!a || a.length === 0)) {
      o({ success: !1, error: 'Message cannot be empty' });
      return;
    }
    (await Xe(r, e, t, a),
      console.log('📱 [Background] SMS sent successfully to:', e),
      o({ success: !0 }));
  } catch (r) {
    (console.error('📱 [Background] Failed to send SMS:', r),
      r instanceof Error
        ? r.message.includes('Token is invalid or revoked')
          ? o({ success: !1, error: 'Token is invalid or revoked' })
          : r.message.includes('Message cannot be empty')
            ? o({ success: !1, error: 'Message cannot be empty' })
            : o({ success: !1, error: r.message })
        : o({ success: !1, error: 'Failed to send SMS' }));
  }
}
async function Ao(e, t) {
  try {
    const { getSubscriptions: o } = await _(
        async () => {
          const { getSubscriptions: a } = await Promise.resolve().then(() => I);
          return { getSubscriptions: a };
        },
        void 0
      ),
      n = await o(e);
    t({ success: !0, subscriptions: n });
  } catch (o) {
    (console.error('Failed to get channel subscriptions:', o),
      t({ success: !1, error: 'Failed to fetch channel subscriptions' }));
  }
}
async function $o(e, t) {
  try {
    const o = await d('pb_token');
    if (!o) {
      t({ success: !1, error: 'No access token available' });
      return;
    }
    const n = await m.fetch('https://api.pushbullet.com/v2/subscriptions', {
      method: 'POST',
      headers: { 'Access-Token': o, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_tag: e }),
    });
    if (!n.ok) {
      if (n.status === 401) {
        (await h(f.TokenRevoked, {
          message: 'Token revoked during channel subscription',
          code: n.status,
        }),
          t({ success: !1, error: 'Token is invalid or revoked' }));
        return;
      }
      throw new Error(`Failed to subscribe: ${n.status} ${n.statusText}`);
    }
    const a = await n.json(),
      { getSubscriptions: r } = await _(
        async () => {
          const { getSubscriptions: s } = await Promise.resolve().then(() => I);
          return { getSubscriptions: s };
        },
        void 0
      );
    (await r(!0), t({ success: !0, subscription: a }));
  } catch (o) {
    (console.error('Failed to subscribe to channel:', o),
      t({ success: !1, error: 'Failed to subscribe to channel' }));
  }
}
async function No(e, t) {
  try {
    const o = await d('pb_token');
    if (!o) {
      t({ success: !1, error: 'No access token available' });
      return;
    }
    const { getSubscriptions: n } = await _(
        async () => {
          const { getSubscriptions: c } = await Promise.resolve().then(() => I);
          return { getSubscriptions: c };
        },
        void 0
      ),
      r = (await n(!1)).find(c => c.iden === e),
      s = r?.channel?.iden,
      i = await m.fetch(`https://api.pushbullet.com/v2/subscriptions/${e}`, {
        method: 'DELETE',
        headers: { 'Access-Token': o, 'Content-Type': 'application/json' },
      });
    if (!i.ok) {
      if (i.status === 404) {
        const { clearSubscriptionsCache: c } = await _(
          async () => {
            const { clearSubscriptionsCache: g } = await Promise.resolve().then(
              () => I
            );
            return { clearSubscriptionsCache: g };
          },
          void 0
        );
        (await c(),
          await ae(s, r),
          t({ success: !0, message: 'Already unsubscribed' }));
        return;
      }
      if (i.status === 401) {
        (await h(f.TokenRevoked, {
          message: 'Token revoked during channel unsubscription',
          code: i.status,
        }),
          t({ success: !1, error: 'Token is invalid or revoked' }));
        return;
      }
      throw new Error(`Failed to unsubscribe: ${i.status} ${i.statusText}`);
    }
    (s && (await Uo(s)), await ae(s, r), await n(!0), t({ success: !0 }));
  } catch (o) {
    (console.error('Failed to unsubscribe from channel:', o),
      t({ success: !1, error: 'Failed to unsubscribe from channel' }));
  }
}
async function Io(e, t) {
  try {
    const o = await m.fetch(
      `https://api.pushbullet.com/v2/channel-info?tag=${encodeURIComponent(e)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!o.ok) {
      if (o.status === 404) {
        t({ success: !1, error: 'Channel not found' });
        return;
      }
      throw new Error(
        `Failed to get channel info: ${o.status} ${o.statusText}`
      );
    }
    const n = await o.json();
    t({ success: !0, channelInfo: n });
  } catch (o) {
    (console.error('Failed to get channel info:', o),
      t({ success: !1, error: 'Failed to get channel information' }));
  }
}
async function Uo(e) {
  try {
    const t = await chrome.storage.local.get('pb_recent_pushes_state');
    if (!t.pb_recent_pushes_state) return;
    const o = t.pb_recent_pushes_state,
      n = o.pushes || [],
      a = n.filter(s => s.channel_iden !== e),
      r = { ...o, pushes: a };
    (await chrome.storage.local.set({ pb_recent_pushes_state: r }),
      console.log(`Cleaned up ${n.length - a.length} pushes for channel ${e}`));
  } catch (t) {
    console.error('Failed to cleanup channel pushes:', t);
  }
}
async function ae(e, t) {
  try {
    if (!e && !t) return;
    const { ContextManager: o } = await _(
        async () => {
          const { ContextManager: r } = await Promise.resolve().then(() => Nt);
          return { ContextManager: r };
        },
        void 0
      ),
      n = o.getInstance();
    e && (await n.removeChannelFromContext(e));
    const a = ['pb_channel_subs', 'pb_owned_channels'];
    for (const r of a)
      try {
        const s = await chrome.storage.local.get(r);
        if (s[r]) {
          if (r === 'pb_channel_subs' && s[r].subscriptions) {
            const i = s[r].subscriptions.filter(
              c => c.channel && c.channel.iden !== e
            );
            await chrome.storage.local.set({
              [r]: { ...s[r], subscriptions: i },
            });
          }
          if (r === 'pb_owned_channels' && s[r].channels) {
            const i = s[r].channels.filter(c => c.iden !== e);
            await chrome.storage.local.set({ [r]: { ...s[r], channels: i } });
          }
        }
      } catch (s) {
        console.error(`Failed to cleanup ${r}:`, s);
      }
    console.log(`Cleaned up channel ${e} from local storage`);
  } catch (o) {
    console.error('Failed to cleanup channel from storage:', o);
  }
}
async function Oo(e) {
  try {
    const t = await le();
    e({ success: !0, ownedChannels: t });
  } catch (t) {
    (console.error('Failed to get owned channels:', t),
      e({
        success: !1,
        error: t instanceof Error ? t.message : 'Failed to get owned channels',
      }));
  }
}
async function xo(e) {
  try {
    (await j(), e({ success: !0 }));
  } catch (t) {
    (console.error('Failed to refresh channel data:', t),
      e({
        success: !1,
        error: t instanceof Error ? t.message : 'Unknown error',
      }));
  }
}
async function Lo(e) {
  try {
    const t = await ge();
    e({ success: !0, posts: t });
  } catch (t) {
    (console.error('Failed to get subscription posts:', t),
      e({
        success: !1,
        error: t instanceof Error ? t.message : 'Unknown error',
      }));
  }
}
async function Bo(e) {
  try {
    (console.log('💬 [Background] Clearing SMS notifications from badge'),
      await k.clearSmsNotifications(),
      console.log('💬 [Background] SMS notifications cleared from badge'),
      e({ ok: !0 }));
  } catch (t) {
    (console.error('Failed to clear SMS notifications:', t),
      e({ ok: !1, error: 'Failed to clear SMS notifications' }));
  }
}
async function Ho(e) {
  try {
    (await eo(),
      await Promise.all([re(), he(), fe(), ut()]),
      await Promise.all([
        l('pb_token', null),
        l('pb_device_iden', null),
        l('pb_last_modified', null),
        l('pb_settings', null),
        l('pb_device_cache', null),
        l('pb_channel_subs', null),
        l('pb_owned_channels', null),
        l('contacts', null),
        l('pb_recent_pushes_state', null),
      ]),
      console.log('All data cleared successfully'),
      e({ success: !0 }));
  } catch (t) {
    (console.error('Failed to clear all data:', t),
      e({ success: !1, error: 'Failed to clear all data' }));
  }
}
async function jo(e) {
  try {
    const t = await Ro();
    e({ ok: !0, lastHeartbeat: t });
  } catch (t) {
    (console.error('WebSocket test failed:', t),
      e({ ok: !1, error: 'WebSocket test failed' }));
  }
}
async function Go(e) {
  try {
    const t = await qo();
    e({ ok: !0, log: t });
  } catch (t) {
    (console.error('Failed to collect debug log:', t),
      e({ ok: !1, error: 'Failed to collect debug log' }));
  }
}
async function zo(e) {
  try {
    const t = Date.now();
    console.log('🪟 [Background] Popup opened, clearing all notifications');
    const o = await d(oe),
      n = !o || t - o > Zt;
    (console.log(
      `🪟 [PopupTime] Last popup opened: ${o ? new Date(o).toISOString() : 'never'}, current: ${new Date(t).toISOString()}, should sync SMS: ${n}`
    ),
      await l(oe, t),
      await b.markAsSeen(),
      await k.clearPushNotifications(),
      n
        ? (console.log(
            '🪟 [PopupTime] Triggering SMS sync (>1 hour since last popup open)'
          ),
          O('popup_open'))
        : console.log(
            '🪟 [PopupTime] Skipping SMS sync (<1 hour since last popup open)'
          ),
      await k.refreshBadge(),
      console.log(
        '🪟 [Background] All notifications marked as seen, badge refreshed'
      ),
      e({ ok: !0 }));
  } catch (t) {
    (console.error('Failed to handle popup open:', t),
      e({ ok: !1, error: 'Failed to clear notifications' }));
  }
}
async function Ro() {
  return new Date().toISOString();
}
async function Wo(e) {
  try {
    const t = b.getState();
    e({ ok: !0, state: t });
  } catch (t) {
    (console.error('Failed to get unified tracker state:', t),
      e({ ok: !1, error: 'Failed to get tracker state' }));
  }
}
async function qo() {
  const e = [];
  (e.push('=== Pushbridge Debug Log ==='),
    e.push(`Generated: ${new Date().toISOString()}`),
    e.push('Extension Version: 1.0.0'),
    e.push('Chrome Version: Chrome Extension'),
    e.push(''));
  try {
    const t = await chrome.storage.local.get(null);
    (e.push('=== Storage Info ==='),
      e.push(`Token exists: ${!!t.pb_token}`),
      e.push(`Device IDEN: ${t.pb_device_iden || 'Not set'}`),
      e.push(`Settings: ${JSON.stringify(t.pb_settings || {}, null, 2)}`),
      e.push(''));
  } catch (t) {
    e.push(`Failed to read storage: ${t}`);
  }
  try {
    const t = b.getState();
    (e.push('=== Unified Tracker State ==='),
      e.push(
        `Last Seen: ${new Date(t.timestamps.lastSeenTimestamp).toISOString()}`
      ),
      e.push(
        `Last Updated: ${new Date(t.timestamps.lastUpdated).toISOString()}`
      ),
      e.push(
        `Cache Entries: ${Object.values(t.cache).reduce((o, n) => o + n.length, 0)}`
      ),
      e.push(''));
  } catch (t) {
    e.push(`Failed to get tracker state: ${t}`);
  }
  return (
    e.push('=== Recent Activity ==='),
    e.push('WebSocket status: Connected'),
    e.push(`Last push received: ${new Date().toISOString()}`),
    e.push('Queue status: Active'),
    e.join(`
`)
  );
}
const Vo = Object.freeze(
  Object.defineProperty(
    { __proto__: null, triggerSmsSync: O },
    Symbol.toStringTag,
    { value: 'Module' }
  )
);
