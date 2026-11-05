/**
 * One incoming SMS can arrive twice: as a mirrored notification and through history
 * sync, each with its own ID. The sender and text are what they share, so the first
 * to arrive shows the notification and the other stays quiet.
 */
const WINDOW_MS = 5 * 60 * 1000;
const seen = new Map<string, number>();

const normalize = (value: string | undefined) =>
  (value ?? '').trim().toLowerCase();

/** True if this message hasn't been shown recently. Records it either way. */
export function claimSmsContent(
  sender: string | undefined,
  text: string | undefined,
  now: number = Date.now()
): boolean {
  for (const [key, time] of seen) {
    if (now - time > WINDOW_MS) seen.delete(key);
  }
  const key = `${normalize(sender)}|${normalize(text)}`;
  if (seen.has(key)) return false;
  seen.set(key, now);
  return true;
}
