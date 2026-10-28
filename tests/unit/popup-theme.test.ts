import { bootTheme, teardownTheme } from '../../src/popup/components/pb-theme';

describe('Popup theme preference', () => {
  let scheme: EventTarget & { matches: boolean };
  let storageChanges: EventTarget;

  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const theme = () => document.documentElement.dataset.theme;

  beforeEach(() => {
    scheme = Object.assign(new EventTarget(), { matches: true });
    storageChanges = new EventTarget();
    window.matchMedia = jest.fn().mockReturnValue(scheme);
    chrome.storage.onChanged = {
      addListener: listener => {
        const handler = (event: Event) => {
          const { changes, area } = (event as CustomEvent).detail;
          listener(changes, area);
        };
        storageChanges.addEventListener('change', handler);
        chrome.storage.onChanged.removeListener = () => {
          storageChanges.removeEventListener('change', handler);
        };
      },
    } as typeof chrome.storage.onChanged;
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      cb({ [key]: { systemTheme: true } });
    });
  });

  afterEach(() => {
    teardownTheme();
    document.documentElement.removeAttribute('data-theme');
    jest.restoreAllMocks();
  });

  test('follows live OS changes when the saved preference enables system matching', async () => {
    bootTheme();
    await settle();
    expect(theme()).toBe('dark');

    scheme.matches = false;
    scheme.dispatchEvent(new Event('change'));
    expect(theme()).toBe('light');

    scheme.matches = true;
    scheme.dispatchEvent(new Event('change'));
    expect(theme()).toBe('dark');
  });

  test.each([undefined, { systemTheme: false }])(
    'stays light on a dark OS when stored settings are %p',
    async settings => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [key]: settings });
      });
      bootTheme();
      await settle();
      expect(theme()).toBe('light');
      scheme.dispatchEvent(new Event('change'));
      expect(theme()).toBe('light');
    }
  );

  test('applies local preference changes, ignoring session and unrelated changes', async () => {
    bootTheme();
    await settle();
    const change = (area: string, changes: object) => {
      storageChanges.dispatchEvent(
        new CustomEvent('change', { detail: { area, changes } })
      );
    };

    change('session', { pb_settings: { newValue: { systemTheme: false } } });
    change('local', { anotherKey: { newValue: true } });
    expect(theme()).toBe('dark');

    change('local', { pb_settings: { newValue: { systemTheme: false } } });
    expect(theme()).toBe('light');
    scheme.dispatchEvent(new Event('change'));
    expect(theme()).toBe('light');

    change('local', { pb_settings: { newValue: { systemTheme: true } } });
    expect(theme()).toBe('dark');

    change('local', { pb_settings: { oldValue: { systemTheme: true } } });
    expect(theme()).toBe('light');
    scheme.dispatchEvent(new Event('change'));
    expect(theme()).toBe('light');
  });

  test('stops reacting to preferences and OS changes after teardown', async () => {
    bootTheme();
    await settle();
    teardownTheme();
    storageChanges.dispatchEvent(
      new CustomEvent('change', {
        detail: {
          area: 'local',
          changes: { pb_settings: { newValue: { systemTheme: false } } },
        },
      })
    );
    scheme.matches = false;
    scheme.dispatchEvent(new Event('change'));
    expect(theme()).toBe('dark');
  });
});
