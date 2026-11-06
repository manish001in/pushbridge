import { getLocal, getSession, setLocal, setSession } from './storage';

/**
 * One incoming SMS can arrive twice: as a mirrored notification and through history
 * sync, each with its own ID. So a message shown by one route cancels one matching
 * message from the other route, once. Two from the same route are two real messages,
 * however alike they are.
 *
 * Deciding, showing and recording happen as one step across both routes. Otherwise one
 * route could use up a sighting for a notification that then fails to show. Sightings
 * are kept in session storage so a worker restart between the routes doesn't lose them.
 */
export type SmsSource = 'mirror' | 'history';

const SIGHTINGS_KEY = 'pb_sms_sightings';
const SAME_MESSAGE_WINDOW_MS = 2 * 60 * 1000;
const FORGET_AFTER_MS = 10 * 60 * 1000;

export const SMS_RETRY_ALARM = 'pb_sms_notification_retry';
const RETRIES_KEY = 'pb_sms_notification_retries';
const MAX_RETRY_DELAY_MINUTES = 60;

interface Sighting {
  source: SmsSource;
  sentAt: number;
  seenAt: number;
}

type Sightings = Record<string, Sighting[]>;

let chain: Promise<unknown> = Promise.resolve();

function inOrder<T>(step: () => Promise<T>): Promise<T> {
  const result = chain.then(step, step);
  chain = result.catch(() => undefined);
  return result;
}

async function loadSightings(): Promise<Sightings> {
  const all = (await getSession<Sightings>(SIGHTINGS_KEY)) ?? {};
  const now = Date.now();
  const kept: Sightings = {};
  for (const [key, list] of Object.entries(all)) {
    const recent = list.filter(s => now - s.seenAt < FORGET_AFTER_MS);
    if (recent.length) kept[key] = recent;
  }
  return kept;
}

/**
 * Shows the notification unless the other route already has. True if it was shown.
 * If `show` fails, nothing is recorded and the error reaches the caller.
 */
export function showSmsOnce(
  message: {
    sender: string | undefined;
    text: string | undefined;
    sentAt: number;
    source: SmsSource;
  },
  show: () => Promise<unknown>
): Promise<boolean> {
  return inOrder(async () => {
    const { sender, text, sentAt, source } = message;
    const key = `${(sender ?? '').trim().toLowerCase()}|${(text ?? '').trim()}`;
    const sightings = await loadSightings();
    const list = sightings[key] ?? [];

    const twin = list.findIndex(
      s =>
        s.source !== source &&
        Math.abs(sentAt - s.sentAt) <= SAME_MESSAGE_WINDOW_MS
    );
    if (twin !== -1) {
      list.splice(twin, 1);
      sightings[key] = list;
      await setSession(SIGHTINGS_KEY, sightings);
      return false;
    }

    await show();
    sightings[key] = [...list, { source, sentAt, seenAt: Date.now() }];
    await setSession(SIGHTINGS_KEY, sightings);
    return true;
  });
}

export function clearSmsSightings(): Promise<void> {
  return inOrder(async () => {
    await setSession(SIGHTINGS_KEY, {});
  });
}

interface PendingRetry {
  /** Passes that couldn't settle it, so a phone that stays offline is left in peace. */
  attempts: number;
  /** Needs a look past the latest-message check: a mirror has no thread to mark. */
  full: boolean;
  /** Changes when another failure arrives, so a pass can tell it wasn't the last. */
  failures: number;
}

type PendingRetries = Record<string, PendingRetry>;

function loadRetries(): Promise<PendingRetries> {
  return getLocal<PendingRetries>(RETRIES_KEY).then(found => found ?? {});
}

async function ensureRetryAlarm(delayInMinutes = 1): Promise<void> {
  if (!(await chrome.alarms.get(SMS_RETRY_ALARM))) {
    await chrome.alarms.create(SMS_RETRY_ALARM, { delayInMinutes });
  }
}

/**
 * After a notification fails: look again in a minute, without waiting for another SMS
 * or the 6-hour sync, on the phone it came from. Saved, so a worker restart keeps it.
 */
export function scheduleSmsNotificationRetry(
  deviceIden: string,
  { full = false }: { full?: boolean } = {}
): Promise<void> {
  return inOrder(async () => {
    const retries = await loadRetries();
    const earlier = retries[deviceIden];
    retries[deviceIden] = {
      attempts: earlier?.attempts ?? 0,
      full: earlier?.full || full,
      failures: (earlier?.failures ?? 0) + 1,
    };
    await setLocal(RETRIES_KEY, retries);
    await ensureRetryAlarm();
  });
}

/**
 * What the alarm does. `sync` returns when that phone last synced every conversation,
 * which stays old if it was skipped for low quota, an offline phone or an error. Kept
 * until a complete pass finds nothing further wrong. A newer message on the phone
 * replaces this one as the conversation's notification.
 */
export async function runSmsNotificationRetries(
  sync: (deviceIden: string, full: boolean) => Promise<number>
): Promise<void> {
  const retries = await inOrder(loadRetries);

  for (const [deviceIden, retry] of Object.entries(retries)) {
    const startedAt = Date.now();
    let synced = false;
    try {
      synced = (await sync(deviceIden, retry.full)) >= startedAt;
    } catch (error) {
      console.error('SMS notification retry failed:', error);
    }

    await inOrder(async () => {
      const current = await loadRetries();
      const entry = current[deviceIden];
      if (!entry) return;
      if (synced && entry.failures === retry.failures) {
        delete current[deviceIden];
      } else {
        entry.attempts++;
        if (synced) entry.full = false;
      }
      await setLocal(RETRIES_KEY, current);
    });
  }

  await inOrder(async () => {
    const left = Object.values(await loadRetries());
    if (left.length) {
      const attempts = Math.max(...left.map(retry => retry.attempts));
      await ensureRetryAlarm(Math.min(2 ** attempts, MAX_RETRY_DELAY_MINUTES));
    }
  });
}

/** At worker start, and after each pass: anything still pending needs its alarm. */
export function restoreSmsRetryAlarm(): Promise<void> {
  return inOrder(async () => {
    if (Object.keys(await loadRetries()).length) {
      await ensureRetryAlarm();
    }
  });
}
