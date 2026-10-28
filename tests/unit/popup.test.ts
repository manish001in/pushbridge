import {
  getDefaultSmsDevice,
  hasSmsCapableDevices,
} from '../../src/background/deviceManager';

// Exercise the entry point, but leave network-backed Lit components out of this
// navigation contract. They have their own data-loading responsibilities.
jest.mock('../../src/popup/components/pb-token-setup', () => ({}));
jest.mock('../../src/popup/components/pb-composer', () => ({}));
jest.mock('../../src/popup/components/pb-recent-pushes', () => ({}));
jest.mock('../../src/popup/components/pb-mirror-list', () => ({}));
jest.mock('../../src/popup/components/pb-file-drop', () => ({}));
jest.mock('../../src/popup/components/pb-sms-thread', () => ({}));
jest.mock('../../src/popup/components/pb-conversation-list', () => ({}));
jest.mock('../../src/popup/components/pb-channels', () => ({}));
jest.mock('../../src/background/deviceManager', () => ({
  hasSmsCapableDevices: jest.fn(),
  getDefaultSmsDevice: jest.fn(),
}));

describe('Popup navigation', () => {
  let stored: Record<string, unknown>;

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

  test('uses the saved order, hides tabs and selects the first visible pane', async () => {
    stored.pb_settings = {
      optionOrder: [
        'Subscriptions',
        'SMS/MMS',
        'Messages',
        'Send',
        'Notifications',
      ],
      hiddenTabs: ['Send', 'Notifications'],
    };
    await openPopup();
    expect(
      Array.from(document.querySelectorAll('.tab-button')).map(
        button => (button as HTMLElement).dataset.tab
      )
    ).toEqual(['channels', 'pushes']);
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('channels');

    document.querySelector<HTMLButtonElement>('[data-tab="pushes"]')!.click();
    expect(document.querySelectorAll('.tab-pane.active')).toHaveLength(1);
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('pushes');
  });

  test('shows SMS first when requested and an SMS-capable device is available', async () => {
    (hasSmsCapableDevices as jest.Mock).mockResolvedValue(true);
    (getDefaultSmsDevice as jest.Mock).mockResolvedValue({
      iden: 'phone-1',
      nickname: 'Fixture phone',
    });
    stored.pb_settings = { optionOrder: ['SMS/MMS', 'Send'] };
    await openPopup();
    expect(
      Array.from(document.querySelectorAll('.tab-button')).map(
        button => (button as HTMLElement).dataset.tab
      )
    ).toEqual(['messages', 'composer', 'pushes', 'notifications', 'channels']);
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('messages');
    expect(
      document.querySelector('pb-sms-thread')?.getAttribute('device-iden')
    ).toBe('phone-1');
  });

  test('keeps a usable tab if the only saved visible tab is SMS but no SMS device remains', async () => {
    stored.pb_settings = {
      optionOrder: ['SMS/MMS', 'Subscriptions', 'Send'],
      hiddenTabs: ['Send', 'Messages', 'Notifications', 'Subscriptions'],
    };
    const savedSettings = JSON.stringify(stored.pb_settings);
    await openPopup();
    expect(document.querySelectorAll('.tab-button')).toHaveLength(1);
    expect(
      document.querySelector<HTMLElement>('.tab-button.active')?.dataset.tab
    ).toBe('channels');
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('channels');
    expect(JSON.stringify(stored.pb_settings)).toBe(savedSettings);

    (hasSmsCapableDevices as jest.Mock).mockResolvedValue(true);
    await openPopup();
    expect(document.querySelectorAll('.tab-button')).toHaveLength(1);
    expect(
      document.querySelector<HTMLElement>('.tab-pane.active')?.dataset.tab
    ).toBe('messages');
  });
});
