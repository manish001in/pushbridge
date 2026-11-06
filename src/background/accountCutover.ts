import { setAccountChanging } from './accountEpoch';

/**
 * Changing account restarts the whole extension. Reloading ends every running task,
 * socket, timer and open extension page, so nothing started for the old account can
 * finish under the new one. Only then, at the next startup and before anything else
 * runs, is the old account's data removed and the new token applied.
 *
 * This file must not import anything that keeps account state.
 */
const JOURNAL_KEY = 'pb_account_change_pending';
/** In session storage, which only a real reload clears. A worker restart keeps it. */
const RELOAD_MARKER_KEY = 'pb_account_reload_required';
const KEPT_ACROSS_ACCOUNTS = ['pb_settings', 'pb_rate_state', 'pb_backoff_state'];
const ACCOUNT_ALARMS = [
  'pb_push_scan_resume',
  'pb_sms_notification_retry',
  'pb_device_setup',
];

export type AccountChange =
  | { token: string; userIden: string; reset?: false }
  | { reset: true };

type Journal = AccountChange & { generation: string };

let accountChanges: Promise<unknown> = Promise.resolve();
let completedChange: AccountChange | null = null;
let switching = false;

/** One change to the signed-in credentials at a time. */
export function inAccountOrder<T>(change: () => Promise<T>): Promise<T> {
  const result = accountChanges.then(change, change);
  accountChanges = result.catch(() => undefined);
  return result;
}

export function isSwitchingAccount(): boolean {
  return switching;
}

/**
 * Record the change, then the caller responds and calls restartForAccountChange.
 * The marker goes first: if the worker dies after this, the next start can tell the old
 * pages may still be open.
 */
export async function requestAccountChange(change: AccountChange): Promise<void> {
  if (switching) {
    throw new Error('Pushbridge is already restarting');
  }
  switching = true;
  setAccountChanging(true);
  const generation = crypto.randomUUID();
  try {
    await chrome.storage.session.set({ [RELOAD_MARKER_KEY]: generation });
    await chrome.storage.local.set({ [JOURNAL_KEY]: { ...change, generation } });
  } catch (error) {
    // Nothing was saved, so nothing will restart. Carry on as before, and let it be
    // asked for again.
    switching = false;
    setAccountChanging(false);
    await chrome.storage.session.remove(RELOAD_MARKER_KEY).catch(() => {});
    throw error;
  }
}

export function restartForAccountChange(): void {
  // Long enough for the response to reach the page that asked.
  setTimeout(() => chrome.runtime.reload(), 100);
}

async function applyChange(change: Journal): Promise<void> {
  await Promise.all(ACCOUNT_ALARMS.map(name => chrome.alarms.clear(name)));

  const visible = await new Promise<object>(resolve =>
    chrome.notifications.getAll(resolve)
  );
  await Promise.all(
    Object.keys(visible).map(id => chrome.notifications.clear(id))
  );

  // The journal stays until the end, so a crash anywhere here is picked up again.
  const everything = await chrome.storage.local.get(null);
  const keep = new Set([
    JOURNAL_KEY,
    ...(change.reset ? [] : KEPT_ACROSS_ACCOUNTS),
  ]);
  await chrome.storage.local.remove(
    Object.keys(everything).filter(key => !keep.has(key))
  );

  if (!change.reset) {
    // Devices in the settings belonged to the old account.
    const { defaultDevice, defaultSmsDevice, ...settings } =
      (everything.pb_settings as Record<string, unknown>) ?? {};
    void defaultDevice;
    void defaultSmsDevice;
    await chrome.storage.local.set({
      pb_settings: settings,
      pb_token: change.token,
      pb_user_iden: change.userIden,
    });
  }

  await chrome.storage.local.remove(JOURNAL_KEY);
  completedChange = change;
}

async function finishPendingChange(): Promise<void> {
  const stored = await chrome.storage.local.get(JOURNAL_KEY);
  const journal = stored?.[JOURNAL_KEY] as Journal | undefined;
  if (!journal) {
    return;
  }

  const session = await chrome.storage.session.get(RELOAD_MARKER_KEY);
  if (session?.[RELOAD_MARKER_KEY]) {
    // The worker restarted, but the extension never reloaded: old pages may still be
    // open. Reload now. Nothing runs until it has, and the reload clears the marker.
    chrome.runtime.reload();
    return new Promise(() => {});
  }

  await applyChange(journal);
}

/**
 * Settles once any pending account change is done. Everything that touches account
 * state waits for this. If it fails, it stays failed, and the next start tries again.
 */
export const accountReady: Promise<void> = finishPendingChange();
accountReady.catch(error =>
  console.error('Failed to finish changing account:', error)
);

/** The change this start completed, once, for the setup that has to follow it. */
export function takeCompletedChange(): AccountChange | null {
  const change = completedChange;
  completedChange = null;
  return change;
}
