import { getSession, setSession } from './storage';

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
const MAX_RETRIES = 5;
let retriesLeft = MAX_RETRIES;

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
    retriesLeft = MAX_RETRIES;
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

/**
 * After a notification fails: look again in a minute, without waiting for another SMS
 * or the 6-hour sync. Coalesced, and gives up after a few tries in a row.
 */
export async function scheduleSmsNotificationRetry(): Promise<void> {
  if (retriesLeft <= 0 || (await chrome.alarms.get(SMS_RETRY_ALARM))) {
    return;
  }
  retriesLeft--;
  await chrome.alarms.create(SMS_RETRY_ALARM, { delayInMinutes: 1 });
}
