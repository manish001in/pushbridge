/**
 * One incoming SMS can arrive twice: as a mirrored notification and through history
 * sync, each with its own ID. What they share is the sender, the text and roughly the
 * time it was sent. The same words sent again later are a separate message.
 */
const SAME_MESSAGE_WINDOW_MS = 60 * 1000;
const FORGET_AFTER_MS = 10 * 60 * 1000;
const seen = new Map<string, number[]>();

/** True if this message hasn't been shown yet. Records it either way. */
export function claimSmsContent(
  sender: string | undefined,
  text: string | undefined,
  sentAt: number
): boolean {
  const key = `${(sender ?? '').trim().toLowerCase()}|${(text ?? '').trim()}`;
  const times = (seen.get(key) ?? []).filter(
    time => Math.abs(sentAt - time) < FORGET_AFTER_MS
  );
  const isDuplicate = times.some(
    time => Math.abs(sentAt - time) <= SAME_MESSAGE_WINDOW_MS
  );
  times.push(sentAt);
  seen.set(key, times);
  return !isDuplicate;
}
