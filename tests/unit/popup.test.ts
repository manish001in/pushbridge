import {
  getDefaultSmsDevice,
  hasSmsCapableDevices,
} from '../../src/background/deviceManager';

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
jest.mock('../../src/background/deviceManager', () => ({
  hasSmsCapableDevices: jest.fn(),
  getDefaultSmsDevice: jest.fn(),
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
    (hasSmsCapableDevices as jest.Mock).mockResolvedValue(false);
    (getDefaultSmsDevice as jest.Mock).mockResolvedValue(null);
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
});
