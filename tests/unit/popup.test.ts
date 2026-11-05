import { getCachedSmsState } from '../../src/popup/smsState';

// Exercise the entry point, but leave network-backed Lit components out of this
// popup/window contract. They have their own data-loading responsibilities.
jest.mock('../../src/popup/components/pb-token-setup', () => ({}));
jest.mock('../../src/popup/components/pb-composer', () => ({}));
jest.mock('../../src/popup/components/pb-recent-pushes', () => ({}));
jest.mock('../../src/popup/components/pb-mirror-list', () => ({}));
jest.mock('../../src/popup/components/pb-file-drop', () => ({}));
jest.mock('../../src/popup/components/pb-sms-thread', () => ({}));
jest.mock('../../src/popup/components/pb-conversation-list', () => ({}));
jest.mock('../../src/popup/components/pb-channels', () => ({}));
jest.mock('../../src/popup/components/pb-theme', () => ({ bootTheme() {} }), {
  virtual: true,
});
jest.mock('../../src/popup/smsState', () => ({
  getCachedSmsState: jest.fn(),
}));

describe('Popup and standalone window', () => {
  let stored: Record<string, unknown>;
  let windows: chrome.windows.Window[];
  let popupClosed: boolean;
  let currentTab: chrome.tabs.Tab | undefined;

  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const openPopup = async () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await settle();
  };

  beforeAll(() => {
    require('../../src/popup/popup');
  });

  beforeEach(() => {
    document.body.innerHTML = '<div class="container"></div>';
    stored = { pb_token: 'fixture-token', pb_settings: {} };
    windows = [];
    popupClosed = false;
    currentTab = undefined;
    (getCachedSmsState as jest.Mock).mockResolvedValue({
      device: null,
      isStale: false,
    });
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
      const result = typeof key === 'string' ? { [key]: stored[key] } : stored;
      cb?.(result);
      return Promise.resolve(result);
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation(async values => {
      Object.assign(stored, values);
    });
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      ok: true,
      success: true,
      devices: [],
    });
    chrome.runtime.getURL = path => `chrome-extension://fixture/${path}`;
    chrome.tabs = {
      getCurrent: async () => currentTab,
    } as typeof chrome.tabs;
    chrome.windows = {
      getAll: async () => windows,
      create: async options => {
        const created = {
          ...options,
          id: 42,
          tabs: [{ url: options.url }],
        } as chrome.windows.Window;
        windows.push(created);
        return created;
      },
      update: async (id, options) => {
        const existing = windows.find(win => win.id === id)!;
        Object.assign(existing, options);
        return existing;
      },
    } as typeof chrome.windows;
    jest.spyOn(window, 'close').mockImplementation(() => {
      popupClosed = true;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test('shows authentication instead of settings when no token exists', async () => {
    delete stored.pb_token;
    await openPopup();
    expect(document.querySelector('pb-token-setup')).not.toBeNull();
    expect(document.querySelector('pb-composer')).toBeNull();
  });

  test('shows default tabs with Send selected when navigation settings are absent', async () => {
    await openPopup();
    expect(
      Array.from(document.querySelectorAll('.tab-button')).map(
        button => (button as HTMLElement).dataset.tab
      )
    ).toEqual(['composer', 'pushes', 'notifications', 'channels']);
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('composer');
  });

  test.each([false, true])(
    'opens a standalone window or focuses the existing one (exists=%s)',
    async exists => {
      const url = 'chrome-extension://fixture/popup.html?windowMode=1';
      windows = exists
        ? [{ id: 17, tabs: [{ url }], focused: false } as chrome.windows.Window]
        : [
            {
              id: 8,
              tabs: [{ url: 'https://example.com/' }],
            } as chrome.windows.Window,
          ];
      await openPopup();
      const button = document.getElementById('open-window-btn');
      expect(button).not.toBeNull();
      button!.click();
      await settle();
      expect(windows).toHaveLength(exists ? 1 : 2);
      const standalone = windows.find(win => win.tabs?.[0].url === url);
      expect(standalone).toBeDefined();
      if (exists) {
        expect(standalone!.id).toBe(17);
        expect(standalone!.focused).toBe(true);
      } else {
        expect(standalone).toMatchObject({
          type: 'popup',
          width: 500,
          height: 700,
        });
      }
      expect(popupClosed).toBe(true);
    }
  );

  test('hides Open in Window when already running in a tab', async () => {
    currentTab = { id: 9 } as chrome.tabs.Tab;
    await openPopup();
    const button = document.getElementById('open-window-btn');
    expect(button).not.toBeNull();
    expect(button!.style.display).toBe('none');
  });

  describe('startup', () => {
    const buttons = () =>
      Array.from(document.querySelectorAll('.tab-button')).map(
        button => (button as HTMLElement).dataset.tab
      );

    test('draws without waiting for the worker', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockReturnValue(
        new Promise(() => undefined)
      );
      await openPopup();
      expect(buttons()).toContain('composer');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        cmd: 'POPUP_OPEN',
      });
    });

    const idle = () => new Promise(resolve => setTimeout(resolve, 300));

    test('draws the first tab at once and loads the others in the background', async () => {
      await idle(); // Let timers from the previous test finish
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(document.querySelector('pb-composer')).not.toBeNull();
      expect(document.querySelector('pb-recent-pushes')).toBeNull();

      await idle();
      expect(document.querySelector('pb-recent-pushes')).not.toBeNull();
      expect(document.querySelector('pb-mirror-list')).not.toBeNull();
      expect(document.querySelector('pb-channels')).not.toBeNull();
      // Loading in the background doesn't change the tab you're looking at.
      expect(
        document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
      ).toBe('composer');
    });

    test('switching to a background-loaded tab keeps the same instance', async () => {
      await openPopup();
      await idle();
      const mounted = document.querySelector('pb-recent-pushes');
      document
        .querySelector<HTMLButtonElement>('.tab-button[data-tab="pushes"]')!
        .click();
      expect(document.querySelector('pb-recent-pushes')).toBe(mounted);
    });

    test('does not load hidden tabs in the background', async () => {
      stored.pb_settings = { hiddenTabs: ['Subscriptions'] };
      await openPopup();
      await idle();
      expect(document.querySelector('pb-channels')).toBeNull();
      expect(document.querySelector('pb-recent-pushes')).not.toBeNull();
    });

    test('adds the SMS tab when an expired device list turns out to have one', async () => {
      (getCachedSmsState as jest.Mock)
        .mockResolvedValueOnce({ device: null, isStale: true })
        .mockResolvedValue({
          device: { iden: 'phone-1', nickname: 'Phone' },
          isStale: false,
        });
      await openPopup();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(buttons()).toContain('messages');
      expect(
        document.querySelector<HTMLElement>('.tab-button.active')?.dataset.tab
      ).toBe('composer');
    });

    test('a fresh device list causes no background refresh', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      await openPopup();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
        cmd: 'GET_SMS_CAPABLE_DEVICES',
      });
    });

    test('device names cannot inject markup into the SMS tab', async () => {
      (getCachedSmsState as jest.Mock).mockResolvedValue({
        device: { iden: 'phone-1', nickname: '<img src=x onerror=alert(1)>' },
        isStale: false,
      });
      await openPopup();
      const tab = document.querySelector('.tab-button[data-tab="messages"]')!;
      expect(tab.querySelector('img')).toBeNull();
      expect(tab.textContent).toContain('<img src=x');
    });
  });
});
