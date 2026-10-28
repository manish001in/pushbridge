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
});
