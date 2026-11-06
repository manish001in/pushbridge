const JOURNAL_KEY = 'pb_account_change_pending';
const CHECK_EVERY_MS = 50;
const GIVE_UP_AFTER_MS = 3000;

/** A page opened mid account change must not read the old account's saved data. */
export async function waitForAccountChange(): Promise<void> {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  while (Date.now() < deadline) {
    const stored = await chrome.storage.local.get(JOURNAL_KEY);
    if (!stored?.[JOURNAL_KEY]) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, CHECK_EVERY_MS));
  }
}
