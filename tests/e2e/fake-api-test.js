// Run after npm run build. Drives the real extension, worker and UI against a local
// stand-in for the Pushbullet API and stream, so failures that a real account can't
// produce on demand can be tested without messaging anyone. Needs openssl. Set
// PUPPETEER_EXECUTABLE_PATH if needed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import puppeteer from 'puppeteer';
import { WebSocketServer } from 'ws';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pushbridge-e2e-'));
execFileSync(
  'openssl',
  [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost',
    '-keyout', path.join(tmp, 'key.pem'),
    '-out', path.join(tmp, 'cert.pem'),
  ],
  { stdio: 'ignore' }
);

// ---- The stand-in API ----------------------------------------------------------
const api = {
  pushes: [],
  texts: [],
  uploads: [],
  ephemerals: [],
  devices: [],
  chats: [],
  channels: [],
  threads: {},
  requests: [],
  // Rules applied to matching requests, in order. See `when` below.
  rules: [],
  sockets: new Set(),
};
let serial = 0;

/**
 * Next matching request (every one, if `sticky`): 'drop' the connection after acting,
 * 'refuse' before acting, reply with `status`, or wait for `hold`.
 */
const when = (method, urlPart, action) => {
  const rule = { method, urlPart, ...action };
  api.rules.push(rule);
  return rule;
};
const reset = () => {
  Object.assign(api, {
    pushes: [], texts: [], uploads: [], ephemerals: [], devices: [],
    chats: [], channels: [], threads: {}, requests: [], rules: [],
  });
};
const posted = urlPart =>
  api.requests.filter(r => r.method === 'POST' && r.url.includes(urlPart));

const readBody = req =>
  new Promise(resolve => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

const parseMultipartFile = (body, contentType) => {
  const boundary = Buffer.from(`--${contentType.split('boundary=')[1]}`);
  let at = body.indexOf(boundary);
  while (at !== -1) {
    const next = body.indexOf(boundary, at + boundary.length);
    if (next === -1) break;
    const part = body.subarray(at + boundary.length + 2, next - 2);
    const split = part.indexOf('\r\n\r\n');
    if (part.subarray(0, split).includes('name="file"')) {
      return part.subarray(split + 4);
    }
    at = next;
  }
  return null;
};

const respond = async (req, body) => {
  const url = new URL(req.url, 'https://x');
  const list = (key, items) => ({ [key]: items });
  const json = body.length && !req.url.includes('/upload-target')
    ? JSON.parse(body.toString())
    : {};
  if (url.pathname === '/v2/users/me') return { iden: 'me', name: 'Test' };
  if (url.pathname === '/v2/devices') return list('devices', api.devices);
  if (url.pathname === '/v2/chats') return list('chats', api.chats);
  if (url.pathname === '/v2/subscriptions') return list('subscriptions', []);
  if (url.pathname === '/v2/channels') return list('channels', api.channels);
  if (url.pathname === '/v2/ephemerals') {
    api.ephemerals.push(json);
    return {};
  }
  if (url.pathname === '/v2/upload-request') {
    return {
      file_name: json.file_name,
      file_type: json.file_type,
      file_url: `https://files.test/${++serial}/${json.file_name}`,
      upload_url: 'https://api.pushbullet.com/upload-target',
      data: { key: 'value' },
    };
  }
  if (url.pathname === '/upload-target') {
    api.uploads.push(parseMultipartFile(body, req.headers['content-type']));
    return {};
  }
  if (url.pathname === '/v2/texts') {
    // As documented: the same guid isn't sent twice.
    const known = api.texts.find(
      t => json.data.guid && t.data.guid === json.data.guid
    );
    if (known) return known;
    const text = { iden: `text${++serial}`, active: true, data: json.data };
    if (json.file_url) text.file_url = json.file_url;
    api.texts.push(text);
    return text;
  }
  const permanent = url.pathname.match(/^\/v2\/permanents\/(.+)_threads$/);
  if (permanent) {
    return { threads: api.threads[permanent[1]] ?? [] };
  }
  if (url.pathname.startsWith('/v2/permanents/')) return { thread: [] };
  if (url.pathname === '/v2/pushes' && req.method === 'POST') {
    const now = Date.now() / 1000;
    const { device_iden: device, ...rest } = json;
    const push = {
      iden: `push${++serial}`,
      active: true,
      dismissed: false,
      direction: 'self',
      created: now,
      modified: now,
      ...rest,
      ...(device ? { target_device_iden: device } : {}),
    };
    api.pushes.unshift(push);
    return push;
  }
  if (url.pathname === '/v2/pushes') {
    const after = Number(url.searchParams.get('modified_after') ?? 0);
    const start = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const matching = api.pushes.filter(p => p.modified > after);
    const pushes = matching.slice(start, start + limit);
    return {
      pushes,
      ...(start + limit < matching.length
        ? { cursor: String(start + limit) }
        : {}),
    };
  }
  if (url.pathname.startsWith('/v2/pushes/')) {
    api.pushes = api.pushes.filter(p => !url.pathname.endsWith(p.iden));
    return {};
  }
  return {};
};

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(tmp, 'key.pem')),
    cert: fs.readFileSync(path.join(tmp, 'cert.pem')),
  },
  async (req, res) => {
    const headers = {
      'content-type': 'application/json',
      // Chrome silently repeats a request whose reused connection dropped. A real
      // lost response isn't like that, so don't reuse connections.
      connection: 'close',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'access-control-expose-headers': '*',
      'x-ratelimit-limit': '16384',
      'x-ratelimit-remaining': '16000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 900),
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }
    const body = await readBody(req);
    let parsed;
    try {
      parsed = body.length ? JSON.parse(body.toString()) : undefined;
    } catch {
      parsed = undefined;
    }
    api.requests.push({ method: req.method, url: req.url, body: parsed });

    const index = api.rules.findIndex(
      r => r.method === req.method && req.url.includes(r.urlPart)
    );
    const rule = index === -1 ? null : api.rules[index];
    if (rule && !rule.sticky) api.rules.splice(index, 1);
    if (rule?.hold) await rule.hold;
    if (rule?.refuse) {
      req.socket.destroy();
      return;
    }
    if (rule?.status) {
      res.writeHead(rule.status, { ...headers, ...rule.headers });
      res.end(JSON.stringify({ error: { message: 'Fake failure' } }));
      return;
    }
    const answer = await respond(req, body);
    if (rule?.drop) {
      // The server did the work; only the answer is lost.
      req.socket.destroy();
      return;
    }
    res.writeHead(200, headers);
    res.end(JSON.stringify(answer));
  }
);
new WebSocketServer({ server }).on('connection', socket => {
  api.sockets.add(socket);
  socket.on('error', () => {});
  socket.on('close', () => api.sockets.delete(socket));
});
const stream = message => {
  for (const socket of api.sockets) socket.send(JSON.stringify(message));
};
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

// ---- The browser ---------------------------------------------------------------
const extensionPath = path.resolve('dist');
const browser = await puppeteer.launch({
  headless: true,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    '--no-sandbox',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--enable-unsafe-extension-debugging',
    '--ignore-certificate-errors',
    `--host-resolver-rules=MAP api.pushbullet.com 127.0.0.1:${port},MAP stream.pushbullet.com 127.0.0.1:${port},MAP * 127.0.0.1:9`,
  ],
});
const workerTarget = await browser.waitForTarget(
  t => t.type() === 'service_worker'
);
const base = workerTarget.url().replace('/background.js', '');
const control = await browser.newPage();
await control.goto(`${base}/options.html`);

const waitUntil = async (test, what, ms = 15000) => {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = await test();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await sleep(50);
  }
};
const attached = new WeakSet();
const worker = async () => {
  const target = browser
    .targets()
    .find(t => t.type() === 'service_worker');
  if (target) attached.add(target);
  return target ? target.worker() : null;
};
// Attaching to a worker just as it starts can hang, so don't attach only to stop it.
// But one that's attached stays alive until it's closed through that attachment.
const cdp = await control.createCDPSession();
await cdp.send('ServiceWorker.enable');
const stopWorker = async () => {
  const target = browser
    .targets()
    .find(t => t.type() === 'service_worker');
  if (target && attached.has(target)) {
    await (await target.worker()).close().catch(() => {});
  } else {
    await cdp.send('ServiceWorker.stopAllWorkers');
  }
  await waitUntil(
    () => !browser.targets().some(t => t.type() === 'service_worker'),
    'the worker to stop'
  );
  await sleep(200);
};
const wakeWorker = () =>
  control.evaluate(() =>
    chrome.runtime.sendMessage({ cmd: 'getDevices' }).catch(() => {})
  );
const restartWorker = async () => {
  await stopWorker();
  await wakeWorker();
  await waitUntil(() => api.sockets.size > 0, 'the stream to reconnect');
};
const phone = (iden, nickname = iden) => ({
  iden,
  nickname,
  type: 'android',
  active: true,
  pushable: true,
  has_sms: true,
});
const seed = async (extra = {}) => {
  await control.evaluate(
    async (devices, extra) => {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      await chrome.storage.local.set({
        pb_token: 'fixture-not-a-real-token',
        pb_device_iden: 'this-browser',
        pb_device_cache: { devices, lastFetched: Date.now(), hasMore: false },
        ...extra,
      });
    },
    api.devices,
    extra
  );
};
const stored = key =>
  control.evaluate(
    async key => (await chrome.storage.local.get(key))[key],
    key
  );
const openPopup = async () => {
  const popup = await browser.newPage();
  popup.errors = [];
  popup.on('pageerror', error => popup.errors.push(error.message));
  await popup.setViewport({ width: 500, height: 720 });
  await popup.goto(`${base}/popup.html`);
  await popup.waitForSelector('pb-composer >>> #body');
  return popup;
};
const fill = (popup, { to, title = '', body = '' }) =>
  popup.evaluate(
    async (to, title, body) => {
      const root = document.querySelector('pb-composer').shadowRoot;
      for (const [selector, value] of [['#title', title], ['#body', body]]) {
        const box = root.querySelector(selector);
        box.value = value;
        box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
      if (to) {
        const select = root.querySelector('select');
        select.value = to;
        select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
    },
    to,
    title,
    body
  );
const chooseFile = async (popup, host, filePath) => {
  const input = await popup.evaluateHandle(
    host => document.querySelector(host).shadowRoot.querySelector('input[type=file]'),
    host
  );
  await input.uploadFile(filePath);
};
const clickSend = popup =>
  popup.evaluate(() =>
    document.querySelector('pb-composer').shadowRoot.querySelector('.send-button').click()
  );
const composerSays = (popup, text, ms) =>
  popup.waitForFunction(
    text =>
      document.querySelector('pb-composer').shadowRoot
        .querySelector('.message')?.textContent.includes(text),
    { timeout: ms ?? 20000 },
    text
  );
const notifications = async () => {
  const running = await worker();
  return running.evaluate(() => chrome.notifications.getAll());
};
const clearNotifications = async () => {
  const running = await worker();
  await running.evaluate(async () => {
    for (const id of Object.keys(await chrome.notifications.getAll())) {
      await chrome.notifications.clear(id);
    }
  });
};
const smsThread = (id, name, text) => ({
  id,
  name,
  unreadCount: 0,
  lastMessageTime: Date.now(),
  recipients: [{ name, number: id, address: id }],
  messages: [
    { id: `m-${name}`, pb_guid: `m-${name}`, inbound: true, text, timestamp: Date.now() },
  ],
});
const openThread = async (popup, name) => {
  await popup.click('.tab-button[data-tab="messages"]');
  await popup.waitForSelector('pb-conversation-list >>> .conversation-item');
  await popup.evaluate(name => {
    const list = document.querySelector('pb-conversation-list').shadowRoot;
    [...list.querySelectorAll('.conversation-item')]
      .find(row => row.textContent.includes(name))
      .click();
  }, name);
  await popup.waitForFunction(() =>
    document.querySelector('pb-sms-thread').shadowRoot?.querySelector('textarea')
  );
  await sleep(200);
};
const replyAndSend = (popup, text) =>
  popup.evaluate(async text => {
    const thread = document.querySelector('pb-sms-thread');
    const box = thread.shadowRoot.querySelector('textarea');
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await thread.updateComplete;
    await thread.sendMessage();
  }, text);

const closeOpenPages = async () => {
  for (const page of await browser.pages()) {
    if (page !== control && page.url() !== 'about:blank') await page.close();
  }
};
const TEST_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS ?? 150_000);
const failures = [];
const test = async (name, run) => {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  console.log(`Testing ${name}`);
  reset();
  try {
    await Promise.race([
      run(),
      sleep(TEST_TIMEOUT_MS, null, { ref: false }).then(() => {
        throw new Error('The test did not finish');
      }),
    ]);
    await closeOpenPages();
  } catch (error) {
    failures.push(name);
    console.error(`  FAILED: ${error.message}`);
    if (process.env.DEBUG_API) {
      console.error(api.requests.map(r => `${r.method} ${r.url}`).join('\n'));
      for (const page of await browser.pages()) {
        console.error(
          page.url(),
          await page.evaluate(
            () => document.querySelector('pb-composer')?.shadowRoot.querySelector('.message')?.outerHTML
          )
        );
      }
    }
    await closeOpenPages();
  }
};

try {
  const singlePhone = () => {
    api.devices = [phone('phone', 'Test phone')];
  };

  await test('a push whose response was lost is delivered once', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    when('POST', '/v2/pushes', { drop: true });
    await fill(popup, { to: 'phone', body: 'lost answer' });
    await clickSend(popup);
    await composerSays(popup, 'sent successfully');
    assert.equal(api.pushes.length, 1);
    assert.equal(api.pushes[0].target_device_iden, 'phone');
    await popup.close();
  });

  await test('with no answer at all, the push waits and is saved once', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    when('POST', '/v2/pushes', { refuse: true });
    when('GET', '/v2/pushes', { refuse: true, sticky: true });
    await fill(popup, { to: 'phone', body: 'no connection' });
    await clickSend(popup);
    await composerSays(popup, 'will send automatically');
    const ops = await stored('pb_pending_ops');
    assert.equal(ops.length, 1);
    assert.ok(ops[0].payload.guid, 'Keeps its send ID');
    await popup.close();
  });

  await test('a push the server rejects is reported, not shown as sent', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    when('POST', '/v2/pushes', { status: 400 });
    await fill(popup, { to: 'phone', body: 'bad' });
    await clickSend(popup);
    await popup.waitForFunction(() =>
      document.querySelector('pb-composer').shadowRoot.querySelector('.message.error')
    );
    assert.equal(api.pushes.length, 0);
    await popup.close();
  });

  await test('every kind of target gets the right request', async () => {
    api.devices = [phone('phone', 'Test phone')];
    api.chats = [
      { iden: 'c1', active: true, with: { email: 'friend@example.test', email_normalized: 'friend@example.test', name: 'Friend', type: 'user' } },
    ];
    api.channels = [{ iden: 'ch', tag: 'my-channel', name: 'My channel', active: true }];
    await seed();
    await restartWorker();
    const popup = await openPopup();
    await popup.waitForFunction(() =>
      document.querySelector('pb-composer').shadowRoot.querySelectorAll('option').length >= 4
    );
    const send = async (to, body) => {
      await fill(popup, { to, body });
      await clickSend(popup);
      await composerSays(popup, 'sent successfully');
      await popup.waitForFunction(() =>
        !document.querySelector('pb-composer').shadowRoot.querySelector('#body').value
      );
      return posted('/v2/pushes').at(-1).body;
    };
    let sent = await send('phone', 'to device');
    assert.equal(sent.device_iden, 'phone');
    assert.equal(sent.type, 'note');
    sent = await send('friend@example.test', 'to contact');
    assert.equal(sent.email, 'friend@example.test');
    assert.equal(sent.device_iden, undefined);
    sent = await send('my-channel', 'https://example.test/page');
    assert.equal(sent.channel_tag, 'my-channel');
    assert.equal(sent.type, 'link');
    assert.equal(sent.url, 'https://example.test/page');
    sent = await send('all', 'to everything');
    assert.equal(sent.device_iden, undefined);
    assert.equal(sent.email, undefined);
    assert.equal(sent.channel_tag, undefined);
    await popup.close();
  });

  await test('a 429 recovers and sends once', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    when('POST', '/v2/pushes', {
      status: 429,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 2),
        'retry-after': '1',
      },
    });
    await fill(popup, { to: 'phone', body: 'slow down' });
    await clickSend(popup);
    // 15 seconds of backoff, then the quota returns on the next minute.
    await waitUntil(() => api.pushes.length === 1, 'the retried push', 90000);
    await composerSays(popup, 'sent successfully');
    assert.equal(api.pushes.length, 1);
    assert.equal(posted('/v2/pushes').length, 2, 'One refused, one accepted');
    await popup.close();
  });

  const fileBytes = randomBytes(20 * 1024 * 1024);
  fileBytes[0] = 0xff;
  const bigFile = path.join(tmp, 'large.bin');
  fs.writeFileSync(bigFile, fileBytes);
  const smallFile = path.join(tmp, 'small.txt');
  fs.writeFileSync(smallFile, 'small file');

  await test('a 20 MiB file arrives byte for byte', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    await chooseFile(popup, 'pb-composer', bigFile);
    await fill(popup, { to: 'phone', body: 'big one' });
    await clickSend(popup);
    await composerSays(popup, 'File sent successfully', 60000);
    assert.equal(api.uploads.length, 1);
    assert.ok(api.uploads[0].equals(fileBytes), 'Bytes must match');
    await popup.close();
  });

  await test('retrying a file whose response was lost sends one push', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const popup = await openPopup();
    when('POST', '/v2/pushes', { drop: true });
    await chooseFile(popup, 'pb-composer', smallFile);
    await fill(popup, { to: 'phone', body: 'once' });
    await clickSend(popup);
    await popup.waitForFunction(() =>
      document.querySelector('pb-composer').shadowRoot.querySelector('.message.error')
    );
    assert.equal(api.pushes.length, 1, 'The server has it');
    await clickSend(popup);
    await composerSays(popup, 'File sent successfully');
    assert.equal(api.pushes.length, 1, 'And the retry knew');
    await popup.close();
  });

  await test('a failed "sent" notification does not fail a delivered file', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const running = await worker();
    await running.evaluate(() => {
      chrome.notifications.create = () => Promise.reject(new Error('Off'));
    });
    const popup = await openPopup();
    await chooseFile(popup, 'pb-composer', smallFile);
    await fill(popup, { to: 'phone', body: 'quiet' });
    await clickSend(popup);
    await composerSays(popup, 'File sent successfully');
    assert.equal(api.pushes.length, 1);
    await popup.close();
    await stopWorker();
  });

  const interrupted = guid => ({
    id: `op-${guid}`,
    type: 'pushSend',
    payload: { type: 'note', body: 'queued', guid },
    timestamp: Date.now() - 1000,
    retryCount: 0,
    attemptStartedAt: Date.now() - 1000,
  });

  await test('a send cut off before it left goes out once after a restart', async () => {
    singlePhone();
    await stopWorker();
    await seed({ pb_pending_ops: [interrupted('never-left')] });
    await wakeWorker();
    await waitUntil(() => posted('/v2/pushes').length, 'the send', 40000);
    await waitUntil(async () => !(await stored('pb_pending_ops'))?.length, 'an empty queue');
    assert.equal(posted('/v2/pushes').length, 1);
    assert.equal(api.pushes[0].guid, 'never-left');
  });

  await test('a send cut off after it got through is not repeated', async () => {
    singlePhone();
    await stopWorker();
    api.pushes = [
      { iden: 'done', guid: 'got-through', type: 'note', active: true, created: 1, modified: 1 },
    ];
    await seed({ pb_pending_ops: [interrupted('got-through')] });
    await wakeWorker();
    await waitUntil(async () => !(await stored('pb_pending_ops'))?.length, 'an empty queue', 40000);
    assert.equal(posted('/v2/pushes').length, 0);
  });

  await test('signing out while a fetch is running leaves nothing behind', async () => {
    singlePhone();
    await seed({ pb_device_cache: null });
    await restartWorker();
    let release = () => {};
    when('GET', '/v2/devices', { hold: new Promise(r => (release = r)) });
    control.evaluate(() =>
      chrome.runtime.sendMessage({ cmd: 'getDevices', forceRefresh: true }).catch(() => {})
    );
    await waitUntil(
      () => api.requests.some(r => r.url.includes('/v2/devices')),
      'the fetch'
    );
    await control.evaluate(() => chrome.runtime.sendMessage({ cmd: 'clearAllData' }));
    release();
    await sleep(500);
    assert.ok(!(await stored('pb_device_cache'))?.devices?.length, 'Stays empty');
  });

  const threadId = '+15550100';
  const twoPhoneData = extra => ({
    defaultSmsDevice: 'phone2',
    sms_data_phone1: {
      deviceIden: 'phone1',
      lastSync: Date.now(),
      threads: [{ ...smsThread(threadId, 'On phone one', 'one'), deviceIden: 'phone1' }],
    },
    sms_data_phone2: {
      deviceIden: 'phone2',
      lastSync: Date.now(),
      threads: [{ ...smsThread(threadId, 'On phone two', 'two'), deviceIden: 'phone2' }],
    },
    ...extra,
  });
  const twoPhones = () => {
    api.devices = [phone('phone1'), phone('phone2')];
    for (const iden of ['phone1', 'phone2']) {
      api.threads[iden] = [
        {
          id: threadId,
          recipients: [{ name: iden === 'phone1' ? 'On phone one' : 'On phone two', number: threadId, address: threadId }],
          latest: { timestamp: Date.now() / 1000, direction: 'incoming', body: iden },
        },
      ];
    }
  };

  await test('a text goes out through the phone that was selected', async () => {
    twoPhones();
    await seed(twoPhoneData());
    await restartWorker();
    const popup = await openPopup();
    await openThread(popup, 'On phone two');
    await replyAndSend(popup, 'via two');
    await waitUntil(() => api.texts.length, 'the text');
    assert.equal(api.texts[0].data.target_device_iden, 'phone2');
    assert.deepEqual(api.texts[0].data.addresses, [threadId]);
    assert.ok(api.texts[0].data.guid, 'Has an ID for retries');
    await popup.close();
  });

  await test('MMS retries keep their ID only for the same file', async () => {
    twoPhones();
    await seed(twoPhoneData());
    await restartWorker();
    const popup = await openPopup();
    await openThread(popup, 'On phone two');
    const photo = path.join(tmp, 'photo.png');
    fs.writeFileSync(photo, 'first');
    const guidsSent = () => posted('/v2/texts').map(r => r.body.data.guid);

    when('POST', '/v2/texts', { status: 500 });
    await chooseFile(popup, 'pb-sms-thread', photo);
    await sleep(200);
    await replyAndSend(popup, 'look');
    await waitUntil(() => guidsSent().length === 1, 'the first attempt');
    await sleep(300);

    when('POST', '/v2/texts', { status: 500 });
    await popup.evaluate(() => document.querySelector('pb-sms-thread').sendMessage());
    await waitUntil(() => guidsSent().length === 2, 'the retry');
    await sleep(300);
    assert.equal(guidsSent()[1], guidsSent()[0], 'Same file, same ID');

    const sameName = path.join(fs.mkdtempSync(path.join(tmp, 'again-')), 'photo.png');
    fs.writeFileSync(sameName, 'second, same name');
    await chooseFile(popup, 'pb-sms-thread', sameName);
    await sleep(200);
    await popup.evaluate(() => document.querySelector('pb-sms-thread').sendMessage());
    await waitUntil(() => guidsSent().length === 3, 'the changed message');
    assert.notEqual(guidsSent()[2], guidsSent()[0], 'A different file is a new message');
    await popup.close();
  });

  const newPush = (iden, extra = {}) => {
    const now = Date.now() / 1000 + 5;
    return {
      iden,
      type: 'note',
      title: iden,
      body: 'body',
      active: true,
      dismissed: false,
      direction: 'self',
      receiver_iden: 'me',
      created: now,
      modified: now,
      ...extra,
    };
  };
  const setBaseline = async () => {
    const popup = await openPopup();
    await sleep(800);
    await popup.close();
    await clearNotifications();
  };

  await test('a live burst of 51 pushes loses none', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    await setBaseline();
    api.pushes = Array.from({ length: 51 }, (_, i) => newPush(`burst${i}`));
    stream({ type: 'tickle', subtype: 'push' });
    const shown = await waitUntil(
      async () => {
        const all = Object.keys(await notifications());
        return all.length >= 51 ? all : null;
      },
      'all 51 notifications',
      30000
    );
    assert.equal(shown.length, 51);
    const before = api.requests.length;
    stream({ type: 'tickle', subtype: 'push' });
    await waitUntil(() => api.requests.length > before, 'the next scan');
    await sleep(500);
    assert.equal(Object.keys(await notifications()).length, 51, 'None repeat');
  });

  await test('deleted pushes and paging work in the Messages tab', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    api.pushes = [
      ...Array.from({ length: 150 }, (_, i) => newPush(`row${i}`, { modified: 2000 - i, created: 2000 - i })),
    ];
    // More deleted records than one page holds, ahead of everything real.
    api.pushes.unshift(
      ...Array.from({ length: 120 }, (_, i) => ({
        iden: `gone${i}`,
        active: false,
        created: 3000 - i,
        modified: 3000 - i,
      }))
    );
    const popup = await openPopup();
    await popup.click('.tab-button[data-tab="pushes"]');
    await popup.waitForFunction(() =>
      document.querySelector('pb-recent-pushes').shadowRoot.textContent.includes('row0')
    );
    const count = () =>
      popup.evaluate(() => document.querySelector('pb-recent-pushes').pushes.length);
    const first = await count();
    assert.ok(
      !(await popup.evaluate(() =>
        document.querySelector('pb-recent-pushes').pushes.some(p => p.active === false)
      )),
      'Deleted rows stay out'
    );
    assert.ok(first < 150, 'Starts with one page');
    await popup.evaluate(() =>
      document.querySelector('pb-recent-pushes').shadowRoot.querySelector('.load-more').click()
    );
    await waitUntil(async () => (await count()) > first, 'the next page');
    const secondPage = api.requests.filter(r => r.url.includes('cursor='));
    assert.ok(secondPage.length, 'Asked for the next page');
    assert.ok(
      secondPage.every(r => !r.url.includes('modified_after')),
      'Older pages keep the original query'
    );
    assert.deepEqual(popup.errors, []);
    await popup.close();
  });

  await test('content from the API cannot run as code', async () => {
    const evil = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
    api.devices = [{ ...phone('phone'), nickname: evil }];
    await seed({
      defaultSmsDevice: 'phone',
      sms_data_phone: {
        deviceIden: 'phone',
        lastSync: Date.now(),
        threads: [{ ...smsThread(threadId, evil, evil), deviceIden: 'phone' }],
      },
    });
    await restartWorker();
    api.pushes = [newPush('evil', { title: evil, body: evil, modified: 5000, created: 5000 })];
    const popup = await openPopup();
    for (const tab of ['pushes', 'notifications', 'channels', 'messages']) {
      await popup.click(`.tab-button[data-tab="${tab}"]`);
      await sleep(400);
    }
    assert.equal(await popup.evaluate(() => window.__pwned), undefined);
    await popup.close();
    const options = await browser.newPage();
    await options.goto(`${base}/options.html`);
    await sleep(800);
    assert.equal(await options.evaluate(() => window.__pwned), undefined);
    await options.close();
  });

  await test('settings open with a device that has no type', async () => {
    api.devices = [{ iden: 'plain', nickname: undefined, active: true, pushable: true }];
    await seed();
    await restartWorker();
    const options = await browser.newPage();
    const errors = [];
    options.on('pageerror', error => errors.push(error.message));
    await options.goto(`${base}/options.html`);
    await options.waitForFunction(() =>
      [...document.querySelectorAll('select option')].some(o => o.value === 'plain')
    );
    assert.deepEqual(errors, []);
    await options.close();
  });

  const smsMirror = (id, body, extra = {}) => ({
    type: 'push',
    push: {
      type: 'mirror',
      application_name: 'SMS',
      package_name: 'com.android.messages',
      notification_id: id,
      notification_tag: 'sms',
      source_device_iden: 'phone',
      source_user_iden: 'me',
      title: 'Alex',
      body,
      ...extra,
    },
  });

  await test('the same words twice over the stream notify twice', async () => {
    singlePhone();
    await seed({ defaultSmsDevice: 'phone' });
    await restartWorker();
    await setBaseline();
    stream(smsMirror('101', 'ok'));
    await waitUntil(async () => Object.keys(await notifications()).length === 1, 'the first');
    stream(smsMirror('102', 'ok'));
    await waitUntil(async () => Object.keys(await notifications()).length === 2, 'the second');
  });

  await test('mirroring and dismissing a notification', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    await setBaseline();
    const mirror = {
      type: 'push',
      push: {
        type: 'mirror',
        application_name: 'Chat',
        package_name: 'com.chat',
        notification_id: '7',
        notification_tag: 'tag',
        source_device_iden: 'phone',
        source_user_iden: 'me',
        title: 'Hello',
        body: 'From the phone',
      },
    };
    stream(mirror);
    await waitUntil(async () => Object.keys(await notifications()).length === 1, 'the mirror');
    stream({
      type: 'push',
      push: {
        type: 'dismissal',
        package_name: 'com.chat',
        notification_id: '7',
        notification_tag: 'tag',
        source_user_iden: 'me',
      },
    });
    await waitUntil(async () => !Object.keys(await notifications()).length, 'the dismissal');
  });

  await test('encrypted mirrors explain themselves once', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    await setBaseline();
    stream({ type: 'push', push: { encrypted: true, ciphertext: 'abc' } });
    await waitUntil(
      async () => (await notifications()).pb_encryption_unsupported,
      'the warning'
    );
    await clearNotifications();
    stream({ type: 'push', push: { encrypted: true, ciphertext: 'def' } });
    await sleep(500);
    assert.equal((await notifications()).pb_encryption_unsupported, undefined);
  });

  await test('a backlog summary opens the extension when clicked', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    const running = await worker();
    const before = (await browser.pages()).length;
    await running.evaluate(() => {
      chrome.action.openPopup = () => Promise.reject(new Error('Not available'));
      chrome.notifications.onClicked.dispatch('push_backlog_summary');
    });
    await waitUntil(
      async () =>
        (await browser.pages()).length > before ||
        browser.targets().some(t => t.url().includes('windowMode=1')),
      'the extension window'
    );
    const opened = browser.targets().find(t => t.url().includes('windowMode=1'));
    const page = await opened.page();
    await page?.close();
  });

  await test('the connection test in settings reports the real state', async () => {
    singlePhone();
    await seed();
    await restartWorker();
    let answer = await control.evaluate(() =>
      chrome.runtime.sendMessage({ cmd: 'testWebSocket' })
    );
    assert.equal(answer.ok, true);
    assert.ok(!Number.isNaN(Date.parse(answer.lastHeartbeat)));
    for (const socket of api.sockets) socket.terminate();
    await sleep(200);
    answer = await control.evaluate(() =>
      chrome.runtime.sendMessage({ cmd: 'testWebSocket' })
    );
    assert.equal(answer.ok, false);
  });
} finally {
  // A worker stuck on a held request shouldn't hold up the result.
  await Promise.race([browser.close(), sleep(5000)]);
  browser.process()?.kill('SIGKILL');
  server.close();
  server.closeAllConnections?.();
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll fake API tests passed');
process.exit(0);
