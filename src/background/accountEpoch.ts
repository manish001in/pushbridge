/**
 * Changes whenever the signed-in account does. Long-running work captures it when
 * it starts and checks it again before any side effect, so work begun for one
 * account can't finish under another account or repopulate cleared data.
 */
let epoch = 0;

export function currentAccountEpoch(): number {
  return epoch;
}

export function bumpAccountEpoch(): void {
  epoch++;
}
