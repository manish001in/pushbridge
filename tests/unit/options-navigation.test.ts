describe('Saved navigation customization', () => {
  let stored: Record<string, any>;
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const openOptions = async () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await settle();
  };
  const labels = () =>
    Array.from(document.querySelectorAll('#option-order .label')).map(
      label => label.textContent
    );

  beforeAll(() => {
    require('../../src/options/options');
  });

  beforeEach(() => {
    document.body.innerHTML = '<div class="container"></div>';
    stored = { pb_settings: {} };
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    chrome.runtime.getManifest = jest
      .fn()
      .mockReturnValue({ version: '0.0.0' });
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      async () => stored
    );
    (chrome.storage.local.set as jest.Mock).mockImplementation(async values => {
      Object.assign(stored, values);
    });
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      ok: true,
      success: true,
      devices: [],
    });
  });

  test('normalizes duplicate/unknown saved tabs and appends missing tabs', async () => {
    stored.pb_settings.optionOrder = [
      'Subscriptions',
      'unknown-tab',
      'Messages',
      'Subscriptions',
    ];
    await openOptions();
    expect(labels()).toEqual([
      'Subscriptions',
      'Messages',
      'Send',
      'Notifications',
    ]);
    expect(stored.pb_settings.optionOrder).toEqual([
      'Subscriptions',
      'Messages',
      'Send',
      'Notifications',
      'SMS/MMS',
    ]);
  });

  test('persists drag reordering and restores it when settings are reopened', async () => {
    await openOptions();
    const first = document.querySelector('#option-order li')!;
    first.dispatchEvent(new Event('dragstart', { bubbles: true }));
    document.getElementById('option-order')!.dispatchEvent(
      new MouseEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientY: 1000,
      })
    );
    first.dispatchEvent(new Event('dragend', { bubbles: true }));
    await settle();
    expect(stored.pb_settings.optionOrder).toEqual([
      'Messages',
      'Notifications',
      'Subscriptions',
      'Send',
      'SMS/MMS',
    ]);
    await openOptions();
    expect(labels()).toEqual([
      'Messages',
      'Notifications',
      'Subscriptions',
      'Send',
    ]);
  });

  test('keeps the saved SMS position when reordering while SMS is unavailable', async () => {
    stored.pb_settings.optionOrder = [
      'SMS/MMS',
      'Send',
      'Messages',
      'Notifications',
      'Subscriptions',
    ];
    await openOptions();
    const first = document.querySelector('#option-order li')!;
    first.dispatchEvent(new Event('dragstart', { bubbles: true }));
    document.getElementById('option-order')!.dispatchEvent(
      new MouseEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientY: 1000,
      })
    );
    first.dispatchEvent(new Event('dragend', { bubbles: true }));
    await settle();
    expect(stored.pb_settings.optionOrder).toEqual([
      'SMS/MMS',
      'Messages',
      'Notifications',
      'Subscriptions',
      'Send',
    ]);
  });

  test('persists visibility toggles and restores them when settings are reopened', async () => {
    await openOptions();
    document
      .querySelector<HTMLButtonElement>(
        '.toggle-visibility[data-key="Notifications"]'
      )!
      .click();
    await settle();
    expect(stored.pb_settings.hiddenTabs).toEqual(['Notifications']);
    await openOptions();
    const button = document.querySelector<HTMLButtonElement>(
      '.toggle-visibility[data-key="Notifications"]'
    )!;
    expect(button.dataset.state).toBe('show');
    button.click();
    await settle();
    expect(stored.pb_settings.hiddenTabs).toEqual([]);
  });

  test('does not count unavailable SMS as a visible tab when hiding the last usable tab', async () => {
    stored.pb_settings.hiddenTabs = [
      'Messages',
      'Notifications',
      'Subscriptions',
    ];
    await openOptions();
    const button = document.querySelector<HTMLButtonElement>(
      '.toggle-visibility[data-key="Send"]'
    )!;
    button.click();
    await settle();
    expect(stored.pb_settings.hiddenTabs).toEqual([
      'Messages',
      'Notifications',
      'Subscriptions',
    ]);
    expect(button.dataset.state).toBe('hide');
    expect(document.getElementById('message')!.textContent).toBe(
      'At least one tab must remain visible.'
    );
  });

  test('loads when no settings have been saved yet (issue #8)', async () => {
    delete stored.pb_settings;
    await openOptions();
    expect(labels()).toEqual([
      'Send',
      'Messages',
      'Notifications',
      'Subscriptions',
    ]);
  });

  test('moves tabs with the keyboard buttons and keeps focus', async () => {
    await openOptions();
    const move = (key: string, direction: number) =>
      document.querySelector<HTMLButtonElement>(
        `.move-tab[data-key="${key}"][data-direction="${direction}"]`
      )!;

    expect(move('Send', -1).disabled).toBe(true);
    move('Messages', -1).click();
    await settle();
    expect(stored.pb_settings.optionOrder.slice(0, 2)).toEqual([
      'Messages',
      'Send',
    ]);
    // Now first, so "up" is disabled and focus moves to "down".
    expect(document.activeElement).toBe(move('Messages', 1));

    move('Messages', 1).click();
    await settle();
    expect(stored.pb_settings.optionOrder.slice(0, 2)).toEqual([
      'Send',
      'Messages',
    ]);
    expect(document.activeElement).toBe(move('Messages', 1));
  });

  test('keyboard moves keep the saved position of an unavailable SMS tab', async () => {
    stored.pb_settings.optionOrder = [
      'SMS/MMS',
      'Send',
      'Messages',
      'Notifications',
      'Subscriptions',
    ];
    await openOptions();
    document
      .querySelector<HTMLButtonElement>(
        '.move-tab[data-key="Messages"][data-direction="-1"]'
      )!
      .click();
    await settle();
    expect(stored.pb_settings.optionOrder).toEqual([
      'SMS/MMS',
      'Messages',
      'Send',
      'Notifications',
      'Subscriptions',
    ]);
  });

  test.each([
    ['mirror-notifications-toggle', 'mirrorNotificationsEnabled', true],
    ['auto-dismiss-toggle', 'autoDismissNotifications', false],
  ])('%s saves %s', async (id, key, initial) => {
    await openOptions();
    const toggle = document.getElementById(id) as HTMLInputElement;
    expect(toggle.checked).toBe(initial);
    toggle.click();
    await settle();
    expect(stored.pb_settings[key]).toBe(!initial);
  });
});
