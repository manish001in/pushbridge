// Run after npm run build. Drives the real SMS and composer components in a real
// loaded extension. Messages to the worker are intercepted in the page, so nothing
// is sent anywhere and timing can be controlled. Set PUPPETEER_EXECUTABLE_PATH if
// needed.
import assert from 'node:assert/strict';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import puppeteer from 'puppeteer';

const extensionPath = path.resolve('dist');
const browser = await puppeteer.launch({
  headless: true,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    '--no-sandbox',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--enable-unsafe-extension-debugging',
    '--host-resolver-rules=MAP * 127.0.0.1:9',
  ],
});

const message = (id, text) => ({
  id,
  pb_guid: id,
  inbound: true,
  text,
  timestamp: Date.now(),
});
const thread = (id, name, text) => ({
  id,
  name,
  deviceIden: 'phone',
  unreadCount: 0,
  lastMessageTime: Date.now(),
  recipients: [{ name, number: id }],
  messages: [message(`m${id}`, text)],
});
const threadA = thread('+1000', 'Person A', 'history of A');
const threadB = thread('+2000', 'Person B', 'history of B');

try {
  const target = await browser.waitForTarget(
    t => t.type() === 'service_worker'
  );
  const base = target.url().replace('/background.js', '');
  const options = await browser.newPage();
  await options.goto(`${base}/options.html`);

  const seed = () =>
    options.evaluate(
      async (threadA, threadB) => {
        const phone = {
          iden: 'phone',
          nickname: 'Phone',
          type: 'android',
          active: true,
          has_sms: true,
          pushable: true,
        };
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
          pb_token: 'fixture-not-a-real-token',
          pb_device_cache: {
            devices: [phone],
            lastFetched: Date.now(),
            hasMore: false,
          },
          defaultSmsDevice: 'phone',
          sms_data_phone: {
            deviceIden: 'phone',
            lastSync: Date.now(),
            threads: [threadA, threadB],
          },
        });
      },
      threadA,
      threadB
    );

  // Replace worker messages with controllable fakes, and record what would be sent.
  const openPopup = async () => {
    const popup = await browser.newPage();
    await popup.setViewport({ width: 500, height: 720 });
    await popup.evaluateOnNewDocument(
      (threadA, threadB) => {
        window.__sent = [];
        window.__holds = {};
        const hold = name =>
          new Promise(resolve => {
            window.__holds[name] = resolve;
          });
        const threads = { [threadA.id]: threadA, [threadB.id]: threadB };
        const fake = async message => {
          switch (message.cmd) {
            case 'GET_DEFAULT_SMS_DEVICE':
              return { success: true, device: { iden: 'phone' } };
            case 'getDevices':
              return { ok: true, devices: [] };
            case 'GET_OWNED_CHANNELS':
              return {
                success: true,
                ownedChannels: [{ tag: 'my-channel', name: 'My channel' }],
              };
            case 'getContacts':
              return { ok: true, contacts: [] };
            case 'createPush':
              window.__sent.push({ cmd: 'createPush', ...message.payload });
              await hold('createPush');
              return { ok: true, push: { iden: 'p' } };
            case 'GET_SMS_CONVERSATIONS_FROM_API':
              return { success: true, conversations: [threadA, threadB] };
            case 'LOAD_FULL_SMS_THREAD':
              if (window.__holdLoad === message.conversationId) {
                await hold('load');
              }
              return {
                success: true,
                thread: threads[message.conversationId],
              };
            case 'UPLOAD_FILE_FOR_SMS':
              await hold('upload');
              return { success: true, fileUrl: 'https://example.test/f.png' };
            case 'SEND_SMS':
              window.__sent.push({ cmd: 'SEND_SMS', ...message.payload });
              return { success: true };
            default:
              return { ok: true, success: true };
          }
        };
        chrome.runtime.sendMessage = fake;
      },
      threadA,
      threadB
    );
    await popup.goto(`${base}/popup.html`);
    await popup.waitForSelector('.tab-button');
    return popup;
  };

  const openSms = async popup => {
    await popup.click('.tab-button[data-tab="messages"]');
    await popup.waitForSelector('pb-conversation-list >>> .conversation-item');
  };
  const select = (popup, name) =>
    popup.evaluate(name => {
      const list = document.querySelector('pb-conversation-list').shadowRoot;
      [...list.querySelectorAll('.conversation-item')]
        .find(row => row.textContent.includes(name))
        .click();
    }, name);
  const threadText = popup =>
    popup.evaluate(
      () => document.querySelector('pb-sms-thread').shadowRoot.textContent ?? ''
    );
  const typeReply = (popup, text) =>
    popup.evaluate(text => {
      const box = document
        .querySelector('pb-sms-thread')
        .shadowRoot.querySelector('textarea');
      box.value = text;
      box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }, text);
  const replyText = popup =>
    popup.$eval(
      'pb-sms-thread',
      thread => thread.shadowRoot.querySelector('textarea')?.value
    );
  const send = popup =>
    popup.evaluate(() => document.querySelector('pb-sms-thread').sendMessage());

  console.log('Testing a late load cannot show the wrong conversation');
  await seed();
  let popup = await openPopup();
  await openSms(popup);
  await popup.evaluate(id => {
    window.__holdLoad = id;
  }, threadA.id);
  await select(popup, 'Person A');
  await sleep(100);
  await popup.evaluate(() => {
    window.__holdLoad = null;
  });
  await select(popup, 'Person B');
  await popup.waitForFunction(() =>
    document
      .querySelector('pb-sms-thread')
      .shadowRoot.textContent.includes('history of B')
  );
  await popup.evaluate(() => window.__holds.load());
  await sleep(150);
  let text = await threadText(popup);
  assert.ok(text.includes('history of B'), 'B stays on screen');
  assert.ok(!text.includes('history of A'), 'A must not replace B');

  console.log('Testing drafts stay with their conversation');
  await typeReply(popup, 'draft for B');
  await select(popup, 'Person A');
  await sleep(150);
  assert.equal(await replyText(popup), '', 'A has no draft');
  await select(popup, 'Person B');
  await sleep(150);
  assert.equal(await replyText(popup), 'draft for B');
  await popup.close();

  console.log('Testing an attachment goes where it was sent from');
  await seed();
  popup = await openPopup();
  await openSms(popup);
  await select(popup, 'Person A');
  await popup.waitForFunction(() =>
    document
      .querySelector('pb-sms-thread')
      .shadowRoot.textContent.includes('history of A')
  );
  await typeReply(popup, 'for A');
  await popup.evaluate(() => {
    document.querySelector('pb-sms-thread').selectedFile = new File(
      ['x'],
      'photo.png',
      { type: 'image/png' }
    );
  });
  await sleep(50);
  const sending = send(popup);
  await sleep(100);
  await select(popup, 'Person B');
  await sleep(150);
  await popup.evaluate(() => window.__holds.upload());
  await sending;
  await sleep(100);
  const sent = await popup.evaluate(() => window.__sent);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].conversationId, threadA.id, 'Must go to A, not B');
  assert.equal(sent[0].message, 'for A');
  assert.equal(sent[0].attachments[0].name, 'photo.png');
  await popup.close();

  console.log('Testing conversations open from the keyboard');
  await seed();
  popup = await openPopup();
  await openSms(popup);
  await popup.$eval('pb-conversation-list', list =>
    list.shadowRoot.querySelector('.conversation-item').focus()
  );
  await popup.keyboard.press('Enter');
  await popup.waitForFunction(
    () => document.querySelector('pb-sms-thread').conversationId
  );

  console.log('Testing a synced message appears in the open conversation');
  const opened = await popup.$eval(
    'pb-sms-thread',
    thread => thread.conversationId
  );
  await popup.waitForFunction(() =>
    /history of/.test(
      document.querySelector('pb-sms-thread').shadowRoot.textContent
    )
  );
  await options.evaluate(
    async (threadA, threadB, opened, newMessage) => {
      const threads = [threadA, threadB].map(t =>
        t.id === opened ? { ...t, messages: [...t.messages, newMessage] } : t
      );
      await chrome.storage.local.set({
        sms_data_phone: {
          deviceIden: 'phone',
          lastSync: Date.now(),
          threads,
        },
      });
    },
    threadA,
    threadB,
    opened,
    message('new', 'just synced')
  );
  await popup.waitForFunction(() =>
    document
      .querySelector('pb-sms-thread')
      .shadowRoot.textContent.includes('just synced')
  );
  await popup.close();

  console.log('Testing Cmd/Ctrl+Enter twice sends once');
  await seed();
  popup = await openPopup();
  await popup.waitForSelector('pb-composer >>> textarea');
  await popup.evaluate(() => {
    const composer = document.querySelector('pb-composer');
    const box = composer.shadowRoot.querySelector('textarea');
    box.value = 'only once';
    box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    const press = () =>
      box.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          ctrlKey: true,
          bubbles: true,
          composed: true,
        })
      );
    press();
    press();
  });
  await sleep(200);
  assert.equal(
    (await popup.evaluate(() => window.__sent)).length,
    1,
    'One send despite two presses'
  );
  await popup.close();

  console.log('Testing device names cannot inject markup into settings');
  await options.evaluate(async () => {
    await chrome.storage.local.set({
      pb_device_cache: {
        devices: [
          {
            iden: 'evil',
            nickname: '</option></select><h1 id="injected">x</h1>',
            type: 'android',
            active: true,
            pushable: true,
          },
        ],
        lastFetched: Date.now(),
        hasMore: false,
      },
    });
  });
  const settings = await browser.newPage();
  await settings.goto(`${base}/options.html`);
  await settings.waitForSelector('#default-device');
  await sleep(300);
  assert.equal(await settings.$('#injected'), null);

  console.log(
    'PASS: replies and attachments reach the intended conversation, drafts stay separate, no double send, no markup injection'
  );
} finally {
  await browser.close();
}
