/**
 * Changing account restarts the extension, and old data only goes at the next start,
 * before anything else runs.
 */
describe('finishing an account change at startup', () => {
  let local: Record<string, any>;
  let session: Record<string, any>;
  const JOURNAL = 'pb_account_change_pending';
  const MARKER = 'pb_account_reload_required';

  const start = () => {
    let module: typeof import('../../src/background/accountCutover');
    jest.isolateModules(() => {
      module = require('../../src/background/accountCutover');
    });
    return module!;
  };

  beforeEach(() => {
    local = {};
    session = {};
    (chrome.storage.local.get as jest.Mock).mockImplementation(async key =>
      key === null ? { ...local } : { [key]: local[key] }
    );
    (chrome.storage.local.set as jest.Mock).mockImplementation(async values => {
      Object.assign(local, values);
    });
    (chrome.storage.local.remove as jest.Mock).mockImplementation(async keys => {
      for (const key of [keys].flat()) delete local[key];
    });
    (chrome.storage.session.get as jest.Mock).mockImplementation(async key => ({
      [key]: session[key],
    }));
    (chrome.storage.session.set as jest.Mock).mockImplementation(async values => {
      Object.assign(session, values);
    });
    (chrome.alarms.clear as jest.Mock).mockResolvedValue(true);
    (chrome as any).notifications = {
      getAll: jest.fn(cb => cb({ 'from-a': {} })),
      clear: jest.fn().mockResolvedValue(true),
    };
    (chrome.runtime as any).reload = jest.fn();
  });

  const oldAccount = () => ({
    pb_token: 'token-a',
    pb_user_iden: 'a',
    pb_recent_pushes_state: { pushes: ['private'] },
    sms_data_phone: {},
    pb_settings: { soundEnabled: false, defaultDevice: 'd', defaultSmsDevice: 'p' },
    pb_rate_state: { remaining: 1 },
  });

  test('nothing pending means nothing happens', async () => {
    local = oldAccount();
    const { accountReady, takeCompletedChange } = start();
    await accountReady;
    expect(local).toEqual(oldAccount());
    expect(takeCompletedChange()).toBeNull();
  });

  test('a sign-in replaces the account and keeps preferences', async () => {
    local = {
      ...oldAccount(),
      [JOURNAL]: { token: 'token-b', userIden: 'b', generation: 'g' },
    };
    const { accountReady, takeCompletedChange } = start();
    await accountReady;
    expect(local).toEqual({
      pb_token: 'token-b',
      pb_user_iden: 'b',
      pb_settings: { soundEnabled: false },
      pb_rate_state: { remaining: 1 },
    });
    expect(chrome.notifications.clear).toHaveBeenCalledWith('from-a');
    expect(chrome.alarms.clear).toHaveBeenCalledWith('pb_push_scan_resume');
    expect(takeCompletedChange()).toMatchObject({ userIden: 'b' });
    expect(takeCompletedChange()).toBeNull();
    expect(chrome.runtime.reload).not.toHaveBeenCalled();
  });

  test('a reset removes everything', async () => {
    local = { ...oldAccount(), [JOURNAL]: { reset: true, generation: 'g' } };
    await start().accountReady;
    expect(local).toEqual({});
  });

  test('if the worker died before reloading, it reloads and changes nothing', async () => {
    local = {
      ...oldAccount(),
      [JOURNAL]: { token: 'token-b', userIden: 'b', generation: 'g' },
    };
    session[MARKER] = 'g';
    let settled = false;
    void start().accountReady.then(() => (settled = true));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(chrome.runtime.reload).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    expect(local.pb_token).toBe('token-a');
    expect(local[JOURNAL]).toBeDefined();
  });

  test('a failure keeps everything blocked and the journal for next time', async () => {
    local = {
      ...oldAccount(),
      [JOURNAL]: { token: 'token-b', userIden: 'b', generation: 'g' },
    };
    (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error('full'));
    await expect(start().accountReady).rejects.toThrow('full');
    expect(local[JOURNAL]).toBeDefined();

    // The next start finishes the job, without reloading again.
    await start().accountReady;
    expect(local.pb_token).toBe('token-b');
    expect(local[JOURNAL]).toBeUndefined();
    expect(chrome.runtime.reload).not.toHaveBeenCalled();
  });

  test('any leftover marker means reload first, even a different one', async () => {
    local = { [JOURNAL]: { reset: true, generation: 'g1' }, pb_token: 'token-a' };
    session[MARKER] = 'g2';
    void start().accountReady;
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(chrome.runtime.reload).toHaveBeenCalledTimes(1);
    expect(local.pb_token).toBe('token-a');
  });

  test('a second change while one is starting is refused', async () => {
    const cutover = start();
    await cutover.accountReady;
    await cutover.requestAccountChange({ reset: true });
    await expect(
      cutover.requestAccountChange({ token: 't', userIden: 'b' })
    ).rejects.toThrow('already restarting');
    expect(local[JOURNAL].reset).toBe(true);
  });

  test('if the change cannot be saved, sending works again', async () => {
    (chrome.storage.session.remove as jest.Mock).mockResolvedValue(undefined);
    let cutover: typeof import('../../src/background/accountCutover');
    let epoch: typeof import('../../src/background/accountEpoch');
    jest.isolateModules(() => {
      cutover = require('../../src/background/accountCutover');
      epoch = require('../../src/background/accountEpoch');
    });
    await cutover!.accountReady;
    (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error('full'));
    await expect(cutover!.requestAccountChange({ reset: true })).rejects.toThrow('full');
    expect(cutover!.isSwitchingAccount()).toBe(false);
    expect(() => epoch!.assertSameAccount()).not.toThrow();
    expect(chrome.storage.session.remove).toHaveBeenCalledWith(MARKER);
    await cutover!.requestAccountChange({ reset: true });
    expect(local[JOURNAL]).toBeDefined();
  });

  test('asking for a change saves the marker before the journal', async () => {
    const order: string[] = [];
    (chrome.storage.session.set as jest.Mock).mockImplementation(async () => {
      order.push('marker');
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation(async () => {
      order.push('journal');
    });
    const cutover = start();
    await cutover.accountReady;
    await cutover.requestAccountChange({ reset: true });
    expect(order).toEqual(['marker', 'journal']);
    expect(cutover.isSwitchingAccount()).toBe(true);
  });
});
