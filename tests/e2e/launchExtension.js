import path from 'node:path';

import puppeteer from 'puppeteer';

const ATTEMPTS = 3;

/**
 * Starts Chrome with the built extension. On a busy CI machine the worker
 * occasionally never shows up, so a stuck start gets a fresh browser.
 */
export async function launchExtension(extraArgs = []) {
  const extensionPath = path.resolve('dist');
  for (let attempt = 1; ; attempt++) {
    const browser = await puppeteer.launch({
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--enable-unsafe-extension-debugging',
        ...extraArgs,
      ],
    });
    try {
      const target = await browser.waitForTarget(
        t => t.type() === 'service_worker',
        { timeout: 15000 }
      );
      return { browser, target };
    } catch (error) {
      await browser.close().catch(() => {});
      if (attempt === ATTEMPTS) throw error;
      console.log(`Extension worker didn't start, retrying (${attempt})`);
    }
  }
}
