/**
 * Changes whenever the signed-in account does. Long-running work captures it when
 * it starts and checks it again before any side effect, so work begun for one
 * account can't finish under another account or repopulate cleared data.
 */
let epoch = 0;
let changing = false;

export class AccountChangedError extends Error {
  constructor() {
    super('The account changed while this was running');
    this.name = 'AccountChangedError';
  }
}

export function currentAccountEpoch(): number {
  return epoch;
}

export function bumpAccountEpoch(): void {
  epoch++;
}

/** While old data is being cleared, new work can't belong to either account. */
export function setAccountChanging(value: boolean): void {
  changing = value;
}

export function assertSameAccount(capturedEpoch?: number): void {
  if (
    changing ||
    (capturedEpoch !== undefined && capturedEpoch !== epoch)
  ) {
    throw new AccountChangedError();
  }
}
