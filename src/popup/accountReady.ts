const JOURNAL_KEY = 'pb_account_change_pending';
const CHECK_EVERY_MS = 50;
const SAY_SOMETHING_AFTER_MS = 3000;

/**
 * A page opened mid account change must not read the old account's saved data, so this
 * doesn't return until the change is done, however long that takes. If that's a while,
 * `onStillWaiting` lets the page say why it's empty.
 */
export async function waitForAccountChange(
  onStillWaiting: () => void = () => {}
): Promise<void> {
  const startedAt = Date.now();
  let told = false;
  for (;;) {
    const stored = await chrome.storage.local.get(JOURNAL_KEY);
    if (!stored?.[JOURNAL_KEY]) {
      return;
    }
    if (!told && Date.now() - startedAt > SAY_SOMETHING_AFTER_MS) {
      told = true;
      onStillWaiting();
    }
    await new Promise(resolve => setTimeout(resolve, CHECK_EVERY_MS));
  }
}
