// Run after npm run build. Uses a real unpacked extension and a real action
// popup with Pushbullet requests blocked. Set PUPPETEER_EXECUTABLE_PATH if needed.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

import { launchExtension } from './launchExtension.js';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const { browser, target } = await launchExtension([
  // Keep opened links and API calls off the network.
    '--host-resolver-rules=MAP * 127.0.0.1:9',
]);

try {
  const base = target.url().replace('/background.js', '');
  const options = await browser.newPage();
  await options.goto(`${base}/options.html`);

  const openActionPopup = async () => {
    await options.bringToFront();
    await options.evaluate(async () => {
      const current = await chrome.windows.getCurrent();
      await chrome.windows.update(current.id, { focused: true });
      await chrome.action.openPopup({ windowId: current.id });
    });
    const popupTarget = await browser.waitForTarget(
      t => t.url() === `${base}/popup.html`
    );
    return popupTarget.asPage();
  };

  const openedTabs = pattern =>
    options.evaluate(
      url =>
        chrome.tabs
          .query({ url })
          .then(tabs => tabs.map(tab => ({ id: tab.id, active: tab.active }))),
      pattern
    );

  const closeTabs = async pattern => {
    const tabs = await openedTabs(pattern);
    await options.evaluate(
      ids => chrome.tabs.remove(ids),
      tabs.map(tab => tab.id)
    );
  };

  const expectStaysOpen = async (popup, link, click, pattern, label) => {
    let closed = false;
    popup.once('close', () => {
      closed = true;
    });
    await click(link);
    await sleep(800);
    assert.equal(closed, false, `${label}: the popup must stay open`);
    const tabs = await openedTabs(pattern);
    assert.equal(tabs.length, 1, `${label}: one tab must open`);
    assert.equal(tabs[0].active, false, `${label}: tab must be in background`);
    await closeTabs(pattern);
  };

  const modifiedClick = popup => async link => {
    await popup.keyboard.down(modifier);
    await link.click();
    await popup.keyboard.up(modifier);
  };

  // A link inside a Lit component's shadow root.
  console.log('Testing modified clicks on the setup screen link');
  await options.evaluate(() => chrome.storage.local.clear());
  let popup = await openActionPopup();
  await popup.waitForSelector('pb-token-setup >>> a');
  let link = await popup.$('pb-token-setup >>> a');
  const setupPattern = 'https://www.pushbullet.com/*';
  await expectStaysOpen(
    popup,
    link,
    modifiedClick(popup),
    setupPattern,
    'modified click'
  );
  await expectStaysOpen(
    popup,
    link,
    target => target.click({ button: 'middle' }),
    setupPattern,
    'middle click'
  );
  await popup.close();

  // A link in the page itself.
  console.log('Testing modified clicks on the About dialog link');
  await options.evaluate(() =>
    chrome.storage.local.set({
      pb_token: 'fixture-not-a-real-token',
      pb_device_cache: { devices: [], lastFetched: Date.now(), hasMore: false },
    })
  );
  popup = await openActionPopup();
  await popup.waitForSelector('#about-button');
  await popup.click('#about-button');
  await popup.waitForSelector('.about-links a');
  link = await popup.$('.about-links a');
  await expectStaysOpen(
    popup,
    link,
    modifiedClick(popup),
    'https://github.com/*',
    'modified click'
  );

  // Normal clicks must keep working the way they always have.
  console.log('Testing that a plain click still opens in the foreground');
  let closed = false;
  popup.once('close', () => {
    closed = true;
  });
  // The popup can close before the mouse-up is acknowledged.
  await link.click().catch(() => {});
  await sleep(800);
  assert.equal(closed, true, 'plain click: the popup closes as before');
  const tabs = await openedTabs('https://github.com/*');
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0].active, true, 'plain click: tab must be in foreground');

  console.log(
    'PASS: modified and middle clicks keep the action popup open; plain clicks unchanged'
  );
} finally {
  await browser.close();
}
