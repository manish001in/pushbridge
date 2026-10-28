// Run after npm run build. Uses a real unpacked extension and disposable cached
// data, not a Pushbullet account. Set PUPPETEER_EXECUTABLE_PATH if needed.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import path from 'node:path';

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
  ],
});

try {
  const target = await browser.waitForTarget(
    t => t.type() === 'service_worker'
  );
  const base = target.url().replace('/background.js', '');
  const workerCdp = await target.createCDPSession();
  await workerCdp.send('Network.enable');
  await workerCdp.send('Network.setBlockedURLs', {
    urls: ['https://api.pushbullet.com/*', 'wss://stream.pushbullet.com/*'],
  });
  const options = await browser.newPage();
  console.log('Loaded extension; testing options preference');
  await options.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await options.goto(`${base}/options.html`);
  await options.waitForSelector('#system-theme-toggle');
  await options.click('#system-theme-toggle');
  await options.waitForFunction(
    () => document.documentElement.dataset.theme === 'dark'
  );
  assert.equal(
    await options.evaluate(
      async () =>
        (await chrome.storage.local.get('pb_settings')).pb_settings.systemTheme
    ),
    true
  );

  await options.evaluate(async () => {
    const now = Date.now();
    const phone = {
      iden: 'review-phone',
      nickname: 'Review phone',
      type: 'android',
      active: true,
      has_sms: true,
    };
    await chrome.storage.local.set({
      pb_token: 'fixture-not-a-real-token',
      pb_device_cache: { devices: [phone], lastFetched: now, hasMore: false },
      defaultSmsDevice: phone.iden,
      'sms_data_review-phone': {
        deviceIden: phone.iden,
        lastSync: now,
        threads: [
          {
            id: '+15550100',
            name: 'Review conversation',
            deviceIden: phone.iden,
            unreadCount: 0,
            lastMessageTime: now,
            recipients: [{ name: 'Review conversation', number: '+15550100' }],
            messages: [
              {
                id: 'message-1',
                inbound: true,
                text: 'Theme regression fixture',
                timestamp: now,
              },
            ],
          },
        ],
      },
    });
  });
  const popup = await browser.newPage();
  await popup.setViewport({ width: 500, height: 720, deviceScaleFactor: 2 });
  await popup.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await popup.goto(`${base}/popup.html`);
  await popup.waitForSelector('#about-button');
  assert.equal(
    await popup.$eval('#open-window-btn', el => getComputedStyle(el).display),
    'none'
  );
  await popup.click('[data-tab="messages"]');
  await popup.waitForFunction(() =>
    document
      .querySelector('pb-conversation-list')
      .shadowRoot.querySelector('.conversation-item')
  );
  // Puppeteer's deep selector sends a real pointer click into the Lit shadow root.
  await popup.click('pb-conversation-list >>> .conversation-item');
  console.log('Testing rendered SMS and composer scrolling');
  assert.equal(
    await popup.$eval(
      '.sms-thread-header',
      el => getComputedStyle(el).backgroundColor
    ),
    'rgb(30, 30, 30)'
  );
  assert.equal(
    await popup.$eval('#sms-back-button', el => getComputedStyle(el).color),
    'rgb(230, 225, 227)'
  );
  await popup.hover('#sms-back-button');
  await popup.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('#sms-back-button'))
        .backgroundColor === 'rgb(33, 31, 33)'
  );
  await popup.click('#sms-back-button');
  await popup.click('[data-tab="composer"]');
  await popup.$eval('pb-composer', host => {
    host.shadowRoot
      .querySelector('.send-button')
      .scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  assert.equal(
    await popup.$eval('pb-composer', host => {
      const root = host.shadowRoot;
      const button = root.querySelector('.send-button');
      const box = button.getBoundingClientRect();
      return (
        root.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) ===
        button
      );
    }),
    true,
    'Send Push must be reachable without the footer covering it'
  );
  await popup.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'light' },
  ]);
  await popup.waitForFunction(
    () => document.documentElement.dataset.theme === 'light'
  );
  await popup.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await popup.waitForFunction(
    () => document.documentElement.dataset.theme === 'dark'
  );
  await options.bringToFront();
  await options.click('#system-theme-toggle');
  await popup.waitForFunction(
    () => document.documentElement.dataset.theme === 'light'
  );

  let standaloneId;
  for (let attempt = 0; attempt < 2; attempt++) {
    console.log('Testing real action popup, attempt', attempt);
    await options.bringToFront();
    await options.evaluate(async () => {
      const window = await chrome.windows.getCurrent();
      await chrome.windows.update(window.id, { focused: true });
      await chrome.action.openPopup({ windowId: window.id });
    });
    console.log('Action popup opened');
    const actionTarget = await browser.waitForTarget(
      t => t.url() === `${base}/popup.html` && t !== popup.target()
    );
    const action = await actionTarget.asPage();
    await action.waitForSelector('#open-window-btn', { visible: true });
    const closed = once(action, 'close', {
      signal: AbortSignal.timeout(10000),
    });
    await action.click('#open-window-btn');
    await closed;
    await browser.waitForTarget(
      t => t.url() === `${base}/popup.html?windowMode=1`
    );
    await options.waitForFunction(() =>
      chrome.windows
        .getAll({ populate: true })
        .then(wins =>
          wins.some(w =>
            w.tabs?.some(t => t.url?.endsWith('popup.html?windowMode=1'))
          )
        )
    );
    const wins = await options.evaluate(() =>
      chrome.windows.getAll({ populate: true })
    );
    const standalone = wins.filter(w =>
      w.tabs?.some(t => t.url?.endsWith('popup.html?windowMode=1'))
    );
    assert.equal(standalone.length, 1);
    assert.equal(standalone[0].type, 'popup');
    assert.equal(standalone[0].focused, true);
    if (attempt)
      assert.equal(standalone[0].id, standaloneId, 'Reuse the original window');
    standaloneId = standalone[0].id;
  }
  console.log(
    'PASS: real extension options/theme, dark SMS/hover, composer scrolling, window creation/reuse and action-popup closure'
  );
} finally {
  await browser.close();
}
