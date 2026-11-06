// Run after npm run build. Uses a real unpacked extension with the Pushbullet API
// unreachable, so anything on screen came from saved data. Set
// PUPPETEER_EXECUTABLE_PATH if needed.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

import { launchExtension } from './launchExtension.js';

const { browser, target } = await launchExtension([
  '--host-resolver-rules=MAP * 127.0.0.1:9',
]);

try {
  const base = target.url().replace('/background.js', '');
  const options = await browser.newPage();
  await options.goto(`${base}/options.html`);

  const now = Date.now();
  const phone = {
    iden: 'phone',
    nickname: 'Phone',
    type: 'android',
    active: true,
    has_sms: true,
  };
  const thread = (id, name) => ({
    id,
    name,
    deviceIden: phone.iden,
    unreadCount: 0,
    lastMessageTime: now,
    recipients: [{ name, number: id }],
    messages: [{ id: `m${id}`, inbound: true, text: 'x', timestamp: now }],
  });
  await options.evaluate(
    async (phone, thread, now) => {
      await chrome.storage.local.clear();
      await chrome.storage.local.set({
        pb_token: 'fixture-not-a-real-token',
        pb_device_cache: {
          devices: [phone],
          lastFetched: now,
          hasMore: false,
        },
        defaultSmsDevice: phone.iden,
        pb_recent_pushes_state: {
          pushes: [
            {
              iden: 'saved-push',
              type: 'note',
              title: 'Saved push',
              body: 'b',
              created: now / 1000,
              modified: now / 1000,
              active: true,
              dismissed: false,
              metadata: {},
            },
          ],
          hasMore: false,
          activeSubtab: 'devices',
        },
        pb_channel_subs: {
          subscriptions: [
            {
              iden: 'saved-sub',
              active: true,
              channel: { iden: 'c', tag: 'saved', name: 'Saved channel' },
            },
          ],
          lastFetched: now,
        },
        [`sms_data_${phone.iden}`]: {
          deviceIden: phone.iden,
          lastSync: now,
          threads: [thread],
        },
      });
    },
    phone,
    thread('+15550100', 'Saved conversation'),
    now
  );

  const popup = await browser.newPage();
  await popup.setViewport({ width: 500, height: 720 });
  await popup.goto(`${base}/popup.html`);
  await popup.waitForSelector('.tab-button');

  console.log('Testing that other tabs load in the background');
  await popup.waitForFunction(
    () =>
      document.querySelector('pb-recent-pushes') &&
      document.querySelector('pb-channels') &&
      document.querySelector('pb-conversation-list')
  );
  assert.equal(
    await popup.$eval('.tab-pane.active', pane => pane.dataset.tab),
    'composer',
    'Background loading must not change the visible tab'
  );
  await sleep(300);

  const visibleAfterClick = (tab, host, text) =>
    popup.evaluate(
      (tab, host, text) => {
        document.querySelector(`.tab-button[data-tab="${tab}"]`).click();
        // Checked in the same frame as the click: no waiting for anything.
        return document
          .querySelector(host)
          .shadowRoot.textContent.includes(text);
      },
      tab,
      host,
      text
    );

  console.log('Testing saved data is on screen as soon as a tab is clicked');
  assert.equal(
    await visibleAfterClick('pushes', 'pb-recent-pushes', 'Saved push'),
    true
  );
  assert.equal(
    await visibleAfterClick('channels', 'pb-channels', 'Saved channel'),
    true
  );
  assert.equal(
    await visibleAfterClick(
      'messages',
      'pb-conversation-list',
      'Saved conversation'
    ),
    true
  );

  console.log('Testing a sync for another phone does not replace the list');
  await options.evaluate(
    async (threads, now) => {
      await chrome.storage.local.set({
        'sms_data_other-phone': {
          deviceIden: 'other-phone',
          lastSync: now,
          threads,
        },
      });
    },
    [thread('+15550199', 'Other phone conversation')],
    now
  );
  await sleep(300);
  assert.equal(
    await popup.$eval('pb-conversation-list', host =>
      host.shadowRoot.textContent.includes('Other phone conversation')
    ),
    false
  );
  assert.equal(
    await popup.$eval('pb-conversation-list', host =>
      host.shadowRoot.textContent.includes('Saved conversation')
    ),
    true,
    'A failed refresh must keep the saved list'
  );

  console.log('Testing a finished background sync appears without reopening');
  await options.evaluate(
    async (phone, threads, now) => {
      await chrome.storage.local.set({
        [`sms_data_${phone.iden}`]: {
          deviceIden: phone.iden,
          lastSync: now,
          threads,
        },
      });
    },
    phone,
    [
      thread('+15550100', 'Saved conversation'),
      thread('+15550101', 'Newly synced'),
    ],
    now
  );
  await popup.waitForFunction(() =>
    document
      .querySelector('pb-conversation-list')
      .shadowRoot.textContent.includes('Newly synced')
  );

  console.log(
    'PASS: tabs load in the background and show saved data instantly, and synced data appears live'
  );
} finally {
  await browser.close();
}
