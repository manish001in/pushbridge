/**
 * One incoming SMS can arrive twice: as a mirrored notification and through history
 * sync, each with its own ID. So a message from one route cancels one matching message
 * from the other route, once. Two from the same route are two real messages, however
 * alike they are.
 */
export type SmsSource = 'mirror' | 'history';

const SAME_MESSAGE_WINDOW_MS = 2 * 60 * 1000;
const FORGET_AFTER_MS = 10 * 60 * 1000;

interface Sighting {
  source: SmsSource;
  sentAt: number;
}

const unmatched = new Map<string, Sighting[]>();

/** True if this message should notify; false if the other route already showed it. */
export function claimSmsContent(
  sender: string | undefined,
  text: string | undefined,
  sentAt: number,
  source: SmsSource
): boolean {
  const key = `${(sender ?? '').trim().toLowerCase()}|${(text ?? '').trim()}`;
  const sightings = (unmatched.get(key) ?? []).filter(
    sighting => Math.abs(sentAt - sighting.sentAt) < FORGET_AFTER_MS
  );

  const twin = sightings.findIndex(
    sighting =>
      sighting.source !== source &&
      Math.abs(sentAt - sighting.sentAt) <= SAME_MESSAGE_WINDOW_MS
  );
  if (twin !== -1) {
    sightings.splice(twin, 1);
    unmatched.set(key, sightings);
    return false;
  }

  sightings.push({ source, sentAt });
  unmatched.set(key, sightings);
  return true;
}

export function clearSmsSightings(): void {
  unmatched.clear();
}
