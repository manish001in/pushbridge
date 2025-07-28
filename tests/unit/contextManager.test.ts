/**
 * Unit tests for ContextManager
 */

import { ContextManager } from '../../src/background/contextManager';
import { ContextRefreshTrigger } from '../../src/types/api-interfaces';

// Mock dependencies
jest.mock('../../src/background/errorManager');
jest.mock('../../src/background/storage');
jest.mock('../../src/background/httpClient');

const mockErrorManager = require('../../src/background/errorManager');
const mockHttpClient = require('../../src/background/httpClient');
const mockStorage = require('../../src/background/storage');

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset singleton instance
    (ContextManager as any).instance = null;

    // Mock storage responses
    mockStorage.getLocal.mockResolvedValue('test-token');
    mockStorage.setLocal.mockResolvedValue(undefined);

    // Mock error manager
    mockErrorManager.reportError.mockResolvedValue(undefined);

    // Get fresh instance
    contextManager = ContextManager.getInstance();
  });

  afterEach(async () => {
    // Clear context after each test
    await contextManager.clearContext();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ContextManager.getInstance();
      const instance2 = ContextManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getContext', () => {
    it('should refresh context on popup_open trigger', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      // Mock successful API responses
      mockHttpClient.httpClient.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              subscriptions: [
                {
                  iden: 'sub1',
                  created: 1234567890,
                  modified: 1234567890,
                  active: true,
                  channel: {
                    iden: 'channel1',
                    tag: 'test-channel',
                    name: 'Test Channel',
                    description: 'Test description',
                  },
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              channels: [
                {
                  iden: 'owned1',
                  tag: 'owned-channel',
                  name: 'Owned Channel',
                  description: 'Owned description',
                  active: true,
                  created: 1234567890,
                  modified: 1234567890,
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              devices: [
                {
                  iden: 'device1',
                  nickname: 'Test Device',
                  type: 'chrome',
                  active: true,
                  created: 1234567890,
                  modified: 1234567890,
                  icon: 'chrome',
                  pushable: true,
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [],
              blocks: [],
              channels: [],
              chats: [
                {
                  iden: 'chat1',
                  active: true,
                  created: 1234567890,
                  modified: 1234567890,
                  with: {
                    type: 'user',
                    iden: 'contact1',
                    name: 'Test Contact',
                    email: 'test@example.com',
                    email_normalized: 'test@example.com',
                  },
                },
              ],
              clients: [],
              contacts: [],
              devices: [],
              grants: [],
              pushes: [],
              profiles: [],
              subscriptions: [],
              texts: [],
            }),
        });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token') // token
        .mockResolvedValueOnce('device1'); // current device

      const context = await contextManager.getContext(trigger);

      expect(context).toBeDefined();
      expect(context.current_device_iden).toBe('device1');
      expect(context.subscriptions.size).toBe(1);
      expect(context.owned_channels.size).toBe(1);
      expect(context.devices.size).toBe(1);
      expect(context.contacts.size).toBe(1);
      expect(context.is_valid).toBe(true);
    });

    it('should not refresh context for non-popup_open triggers if context exists', async () => {
      // First, create a context
      const popupTrigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await contextManager.getContext(popupTrigger);

      // Now try with a different trigger
      const otherTrigger: ContextRefreshTrigger = {
        type: 'periodic',
        timestamp: Date.now(),
      };

      const context = await contextManager.getContext(otherTrigger);

      // Should not make new API calls
      expect(mockHttpClient.httpClient.fetch).toHaveBeenCalledTimes(4); // Only the initial calls (subscriptions, channels, devices, contacts)
      expect(context).toBeDefined();
    });

    it('should refresh context if context is invalid', async () => {
      // Mock invalid context in storage
      mockStorage.getLocal.mockResolvedValueOnce({
        current_device_iden: 'device1',
        owned_channels: [],
        subscriptions: [],
        devices: [],
        last_refreshed: Date.now(),
        is_valid: false,
      });

      const trigger: ContextRefreshTrigger = {
        type: 'periodic',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await contextManager.getContext(trigger);

      // Should have made API calls to refresh
      expect(mockHttpClient.httpClient.fetch).toHaveBeenCalled();
    });
  });

  describe('isKnownSource', () => {
    beforeEach(async () => {
      // Setup a context first
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [
              {
                iden: 'sub1',
                created: 1234567890,
                modified: 1234567890,
                active: true,
                channel: {
                  iden: 'channel1',
                  tag: 'test-channel',
                  name: 'Test Channel',
                  description: 'Test description',
                },
              },
            ],
            channels: [
              {
                iden: 'owned1',
                tag: 'owned-channel',
                name: 'Owned Channel',
                description: 'Owned description',
                active: true,
                created: 1234567890,
                modified: 1234567890,
              },
            ],
            devices: [
              {
                iden: 'device1',
                nickname: 'Test Device',
                type: 'chrome',
                active: true,
                created: 1234567890,
                modified: 1234567890,
                icon: 'chrome',
                pushable: true,
              },
            ],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await contextManager.getContext(trigger);
    });

    it('should return true for known device', async () => {
      const isKnown = await contextManager.isKnownSource('device1');
      expect(isKnown).toBe(true);
    });

    it('should return true for subscribed channel', async () => {
      const isKnown = await contextManager.isKnownSource(undefined, 'channel1');
      expect(isKnown).toBe(true);
    });

    it('should return true for owned channel', async () => {
      const isKnown = await contextManager.isKnownSource(undefined, 'owned1');
      expect(isKnown).toBe(true);
    });

    it('should return false for unknown source', async () => {
      const isKnown = await contextManager.isKnownSource(
        'unknown-device',
        'unknown-channel'
      );
      expect(isKnown).toBe(false);
    });

    it('should return false when no context exists', async () => {
      await contextManager.clearContext();
      const isKnown = await contextManager.isKnownSource('device1');
      expect(isKnown).toBe(false);
    });
  });

  describe('handleUnknownSource', () => {
    it('should refresh context when unknown source is encountered', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await contextManager.getContext(trigger);

      // Now handle unknown source
      await contextManager.handleUnknownSource(
        'unknown-device',
        'unknown-channel'
      );

      // Should have made additional API calls
      expect(mockHttpClient.httpClient.fetch).toHaveBeenCalledTimes(8); // 4 initial + 4 for refresh (subscriptions, channels, devices, contacts)
    });
  });

  describe('API error handling', () => {
    it('should handle 401 errors', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await expect(contextManager.getContext(trigger)).rejects.toThrow(
        'Token is invalid or revoked'
      );
      expect(mockErrorManager.reportError).toHaveBeenCalledWith(
        mockErrorManager.PBError.TokenRevoked,
        expect.objectContaining({
          message: 'Token revoked while fetching subscriptions',
          code: 401,
        })
      );
    });

    it('should handle network errors', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockRejectedValue(
        new Error('Network error')
      );

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1');

      await expect(contextManager.getContext(trigger)).rejects.toThrow(
        'Network error'
      );
      expect(mockErrorManager.reportError).toHaveBeenCalledWith(
        mockErrorManager.PBError.Unknown,
        expect.objectContaining({
          message: 'Failed to refresh user context',
        })
      );
    });
  });

  describe('Storage operations', () => {
    it('should save and load context correctly', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1')
        .mockResolvedValueOnce([]); // Empty triggers array

      await contextManager.getContext(trigger);

      expect(mockStorage.setLocal).toHaveBeenCalledWith(
        'user_context',
        expect.any(Object)
      );
      expect(mockStorage.setLocal).toHaveBeenCalledWith(
        'context_refresh_triggers',
        expect.any(Array)
      );
    });

    it('should load context from storage on initialization', async () => {
      const storedContext = {
        current_device_iden: 'device1',
        owned_channels: [],
        subscriptions: [],
        devices: [],
        last_refreshed: Date.now(),
        is_valid: true,
      };

      mockStorage.getLocal.mockResolvedValueOnce(storedContext);

      await contextManager.loadContext();

      const trigger: ContextRefreshTrigger = {
        type: 'periodic',
        timestamp: Date.now(),
      };

      const context = await contextManager.getContext(trigger);
      expect(context).toBeDefined();
      expect(context.current_device_iden).toBe('device1');
    });
  });

  describe('Refresh triggers', () => {
    it('should save refresh triggers for debugging', async () => {
      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
        reason: 'Test refresh',
      };

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1')
        .mockResolvedValueOnce([]); // Empty triggers array

      await contextManager.getContext(trigger);

      expect(mockStorage.setLocal).toHaveBeenCalledWith(
        'context_refresh_triggers',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'popup_open',
            reason: 'Test refresh',
          }),
        ])
      );
    });

    it('should limit stored triggers to 10', async () => {
      const existingTriggers = Array.from({ length: 10 }, (_, i) => ({
        type: 'periodic' as const,
        timestamp: Date.now() - i * 1000,
      }));

      mockStorage.getLocal
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('device1')
        .mockResolvedValueOnce(existingTriggers);

      mockHttpClient.httpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [],
            channels: [],
            devices: [],
          }),
      });

      const trigger: ContextRefreshTrigger = {
        type: 'popup_open',
        timestamp: Date.now(),
      };

      await contextManager.getContext(trigger);

      // Should have 10 triggers (removed oldest, added new)
      expect(mockStorage.setLocal).toHaveBeenCalledWith(
        'context_refresh_triggers',
        expect.arrayContaining([
          expect.objectContaining({ type: 'popup_open' }),
        ])
      );
    });
  });
});
