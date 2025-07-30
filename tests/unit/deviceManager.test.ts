import {
  ensureChromeDevice,
  getDevices,
  activateDevice,
  checkChromeDevice,
  getSmsCapableDevices,
  getDefaultSmsDevice,
  setDefaultSmsDevice,
} from '../../src/background/deviceManager';

// Mock the storage module
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Device Manager', () => {
  const { getLocal, setLocal } = require('../../src/background/storage');

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    // Reset the mock to return undefined by default
    (getLocal as jest.Mock).mockReset();
  });

  test('ensureChromeDevice should use existing device iden', async () => {
    (getLocal as jest.Mock).mockResolvedValue('existing-device-iden');

    const result = await ensureChromeDevice();

    expect(result).toBe('existing-device-iden');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('ensureChromeDevice should create new device when none exists', async () => {
    (getLocal as jest.Mock).mockResolvedValueOnce(undefined); // No existing device
    (getLocal as jest.Mock).mockResolvedValueOnce('test-token'); // Token for device creation

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ iden: 'new-device-iden' }), {
        status: 200,
        statusText: 'OK',
        headers: {},
      })
    );

    const result = await ensureChromeDevice();

    expect(result).toBe('new-device-iden');
    expect(setLocal).toHaveBeenCalledWith('pb_device_iden', 'new-device-iden');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.pushbullet.com/v2/devices',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Access-Token': 'test-token',
        }),
        body: expect.stringContaining('"nickname":"Chrome (Pushbridge'),
      })
    );
  });

  test('getDevices should fetch devices from API', async () => {
    // Mock the cache check first (no cache)
    (getLocal as jest.Mock).mockResolvedValueOnce(undefined); // pb_device_cache (no cache)

    // Mock the API call
    (getLocal as jest.Mock)
      .mockResolvedValueOnce('test-token') // token for fetchDevicesFromAPI
      .mockResolvedValueOnce(undefined) // pb_devices_cursor (no cursor)
      .mockResolvedValueOnce(false) // pb_devices_has_more
      .mockResolvedValueOnce(undefined) // cached data (no cache)
      .mockResolvedValueOnce(undefined); // pb_devices_cursor for cache

    const mockDevices = [
      { iden: 'device1', nickname: 'Phone', type: 'android', active: true },
      { iden: 'device2', nickname: 'Chrome', type: 'chrome', active: true },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: mockDevices }), {
        status: 200,
        headers: {},
      })
    );

    const result = await getDevices();

    expect(result).toEqual(mockDevices);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.pushbullet.com/v2/devices',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Access-Token': 'test-token',
        }),
      })
    );
  });

  test('getDevices should use cursor when available', async () => {
    // Mock the cache check first (no cache)
    (getLocal as jest.Mock).mockResolvedValueOnce(undefined); // pb_device_cache (no cache)

    // Mock the API call
    (getLocal as jest.Mock)
      .mockResolvedValueOnce('test-token') // token for fetchDevicesFromAPI
      .mockResolvedValueOnce('test-cursor') // pb_devices_cursor
      .mockResolvedValueOnce(false) // pb_devices_has_more
      .mockResolvedValueOnce(undefined) // cached data (no cache)
      .mockResolvedValueOnce('test-cursor'); // pb_devices_cursor for cache

    const mockDevices = [
      { iden: 'device1', nickname: 'Phone', type: 'android', active: true },
      { iden: 'device2', nickname: 'Chrome', type: 'chrome', active: true },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: mockDevices }), {
        status: 200,
        headers: {},
      })
    );

    const result = await getDevices();

    expect(result).toEqual(mockDevices);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.pushbullet.com/v2/devices?cursor=test-cursor',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Access-Token': 'test-token',
        }),
      })
    );
  });

  test('getDevices should force refresh and ignore cursor', async () => {
    (getLocal as jest.Mock)
      .mockResolvedValueOnce('test-token') // token
      .mockResolvedValueOnce('test-cursor') // pb_devices_cursor (should be ignored)
      .mockResolvedValueOnce(false); // pb_devices_has_more

    const mockDevices = [
      { iden: 'device1', nickname: 'Phone', type: 'android', active: true },
      { iden: 'device2', nickname: 'Chrome', type: 'chrome', active: true },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: mockDevices }), {
        status: 200,
        headers: {},
      })
    );

    const result = await getDevices(true); // forceRefresh = true

    expect(result).toEqual(mockDevices);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.pushbullet.com/v2/devices',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Access-Token': 'test-token',
        }),
      })
    );
  });

  test('activateDevice should activate inactive device', async () => {
    (getLocal as jest.Mock).mockResolvedValue('test-token');

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: {},
      })
    );

    await activateDevice('test-device-iden');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.pushbullet.com/v2/devices/test-device-iden',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ active: true }),
      })
    );
  });

  test('checkChromeDevice should return false when no device iden exists', async () => {
    (getLocal as jest.Mock).mockResolvedValue(undefined);

    const result = await checkChromeDevice();

    expect(result).toBe(false);
  });

  describe('SMS Device Management', () => {
    test('getSmsCapableDevices should filter SMS-capable devices', async () => {
      // Mock getDevices to return devices with SMS capability
      const mockDevices = [
        { iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: true },
        { iden: 'device2', nickname: 'Chrome', type: 'chrome', active: true, has_sms: false },
        { iden: 'device3', nickname: 'Tablet', type: 'android', active: true, has_sms: true },
        { iden: 'device4', nickname: 'Inactive Phone', type: 'android', active: false, has_sms: true },
      ];

      // Mock the cache to return the mock devices
      (getLocal as jest.Mock).mockResolvedValue({
        devices: mockDevices,
        lastFetched: Date.now(),
        hasMore: false,
      });

      const result = await getSmsCapableDevices();

      // Should only return active devices with has_sms: true
      expect(result).toEqual([
        { iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: true },
        { iden: 'device3', nickname: 'Tablet', type: 'android', active: true, has_sms: true },
      ]);
    });

    test('getDefaultSmsDevice should return stored device if valid', async () => {
      (getLocal as jest.Mock)
        .mockResolvedValueOnce('device1') // stored defaultSmsDevice
        .mockResolvedValueOnce({
          devices: [
            { iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: true },
            { iden: 'device2', nickname: 'Chrome', type: 'chrome', active: true, has_sms: false },
          ],
          lastFetched: Date.now(),
          hasMore: false,
        });

      const result = await getDefaultSmsDevice();

      expect(result).toEqual({ iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: true });
    });

    test('setDefaultSmsDevice should validate device and call handleDefaultSmsDeviceChange', async () => {
      // Mock the cache to return devices
      (getLocal as jest.Mock).mockResolvedValue({
        devices: [
          { iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: true },
        ],
        lastFetched: Date.now(),
        hasMore: false,
      });

      const result = await setDefaultSmsDevice('device1');

      expect(result).toBe(true);
    });

    test('setDefaultSmsDevice should return false for invalid device', async () => {
      // Mock the cache to return devices
      (getLocal as jest.Mock).mockResolvedValue({
        devices: [
          { iden: 'device1', nickname: 'Phone', type: 'android', active: true, has_sms: false },
        ],
        lastFetched: Date.now(),
        hasMore: false,
      });

      const result = await setDefaultSmsDevice('device1');

      expect(result).toBe(false);
    });
  });
});
