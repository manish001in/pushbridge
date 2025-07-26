/**
 * Unit tests for mirrorManager module
 */

import { jest } from '@jest/globals';

import { MirrorPush, DismissalPush } from '../../src/types/pushbullet';

// Mock chrome APIs
const mockChrome = {
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  notifications: {
    create: jest.fn((...args) => Promise.resolve('test-uuid-12345')),
    clear: jest.fn((...args) => Promise.resolve(true)),
    get: jest.fn(),
    update: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
};

// Set up global chrome mock
(global as any).chrome = mockChrome;

// Mock fetch
(global as any).fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-12345'),
  },
});

// Mock Date.now and Math.random for consistent notification IDs
const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

// Import the module after mocking
let handleMirror: any;
let handleRemoteDismiss: any;
let handleUserDismissal: any;
let reconstructMirrors: any;
let cleanupExpiredMirrors: any;
let getActiveMirrors: any;

beforeAll(async () => {
  const module = await import('../../src/background/mirrorManager');
  handleMirror = module.handleMirror;
  handleRemoteDismiss = module.handleRemoteDismiss;
  handleUserDismissal = module.handleUserDismissal;
  reconstructMirrors = module.reconstructMirrors;
  cleanupExpiredMirrors = module.cleanupExpiredMirrors;
  getActiveMirrors = module.getActiveMirrors;
});

// Mock dependencies
const mockGetLocal = jest.fn();
const mockSetLocal = jest.fn();
const mockRemoveLocal = jest.fn();

jest.mock('../../src/background/storage', () => ({
  getLocal: mockGetLocal,
  setLocal: mockSetLocal,
  removeLocal: mockRemoveLocal,
}));

jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: {
    Unknown: 'unknown',
  },
}));

describe('mirrorManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations with proper typing
    (mockChrome.notifications.create as any).mockResolvedValue(
      'test-notification-id'
    );
    (mockChrome.notifications.clear as any).mockResolvedValue(true);
    (mockChrome.notifications.get as any).mockResolvedValue(null);
    (mockChrome.storage.local.get as any).mockResolvedValue({});
    (mockChrome.storage.local.set as any).mockResolvedValue(undefined);
    (mockChrome.storage.local.remove as any).mockResolvedValue(undefined);
    ((global as any).fetch as any).mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: {},
      })
    );

    // Reset storage mocks
    (mockGetLocal as any).mockResolvedValue(undefined);
    (mockSetLocal as any).mockResolvedValue(undefined);
    (mockRemoveLocal as any).mockResolvedValue(undefined);

    // Reset Date.now and Math.random mocks
    mockDateNow.mockReturnValue(1234567890);
    mockMathRandom.mockReturnValue(0.123456789);
  });

  describe('handleMirror', () => {
    it('should create Chrome notification and store metadata', async () => {
      const mockPush: MirrorPush = {
        type: 'mirror',
        package_name: 'com.test.app',
        notification_id: '123',
        notification_tag: 'test-tag',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        application_name: 'Test App',
        icon_url: 'https://example.com/icon.png',
      };

      await handleMirror(mockPush);

      // Verify Chrome notification was created
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        '1234567890_4fzzzxjyl',
        expect.objectContaining({
          type: 'basic',
          title: 'Test Notification',
          message: 'This is a test notification',
          iconUrl: 'https://example.com/icon.png',
          requireInteraction: true,
          silent: false,
        })
      );

      // Verify metadata was stored
      expect(mockSetLocal).toHaveBeenCalledWith(
        'mirror_1234567890_4fzzzxjyl',
        expect.objectContaining({
          package_name: 'com.test.app',
          notification_id: '123',
          notification_tag: 'test-tag',
          source_device_iden: 'device-123',
          title: 'Test Notification',
          body: 'This is a test notification',
          application_name: 'Test App',
          icon_url: 'https://example.com/icon.png',
          expiresAt: expect.any(Number),
        })
      );
    });

    it('should use default icon when icon_url is not provided', async () => {
      const mockPush: MirrorPush = {
        type: 'mirror',
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
      };

      await handleMirror(mockPush);

      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        '1234567890_4fzzzxjyl',
        expect.objectContaining({
          iconUrl: 'icons/48.png',
        })
      );
    });
  });

  describe('handleRemoteDismiss', () => {
    it('should clear matching Chrome notifications', async () => {
      const mockDismissal: DismissalPush = {
        type: 'dismissal',
        package_name: 'com.test.app',
        notification_id: '123',
        notification_tag: 'test-tag',
        source_user_iden: 'user-123',
      };

      // Mock storage to return matching mirror
      const mockMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        notification_tag: 'test-tag',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() + 86400000,
      };

      // Mock chrome.storage.local.get to return the mirror data
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': mockMirrorMeta,
      });

      await handleRemoteDismiss(mockDismissal);

      // Verify notification was cleared
      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        'test-uuid-12345'
      );

      // Verify metadata was removed
      expect(mockRemoveLocal).toHaveBeenCalledWith('mirror_test-uuid-12345');
    });

    it('should handle no matching mirrors gracefully', async () => {
      const mockDismissal: DismissalPush = {
        type: 'dismissal',
        package_name: 'com.test.app',
        notification_id: '123',
        notification_tag: 'test-tag',
        source_user_iden: 'user-123',
      };

      // Mock empty storage
      (mockChrome.storage.local.get as any).mockResolvedValue({});

      await handleRemoteDismiss(mockDismissal);

      // Should not throw error
      expect(mockChrome.notifications.clear).not.toHaveBeenCalled();
      expect(mockRemoveLocal).not.toHaveBeenCalled();
    });
  });

  describe('handleUserDismissal', () => {
    it('should send dismissal ephemeral and clear notification', async () => {
      const mockMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        notification_tag: 'test-tag',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() + 86400000,
      };

      // Mock storage to return metadata
      (mockGetLocal as any)
        .mockResolvedValueOnce(mockMeta) // For getLocal('mirror_test-uuid-12345')
        .mockResolvedValueOnce('user-123') // For getLocal('pb_user_iden')
        .mockResolvedValueOnce('test-token'); // For getLocal('pb_token')

      await handleUserDismissal('test-uuid-12345');

      // Verify dismissal ephemeral was sent
      expect((global as any).fetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/ephemerals',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Access-Token': 'test-token',
          }),
          body: JSON.stringify({
            type: 'push',
            push: {
              type: 'dismissal',
              package_name: 'com.test.app',
              notification_id: '123',
              notification_tag: 'test-tag',
              source_user_iden: 'user-123',
            },
          }),
        })
      );

      // Verify metadata was removed
      expect(mockRemoveLocal).toHaveBeenCalledWith('mirror_test-uuid-12345');
    });

    it('should handle missing metadata gracefully', async () => {
      // Mock storage to return no metadata
      (mockGetLocal as any).mockResolvedValue(null);

      await handleUserDismissal('test-uuid-12345');

      // Should just clear the notification
      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        'test-uuid-12345'
      );
      expect((global as any).fetch).not.toHaveBeenCalled();
    });
  });

  describe('reconstructMirrors', () => {
    it('should recreate missing notifications', async () => {
      const mockMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() + 86400000,
      };

      // Mock storage to return mirror data
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': mockMirrorMeta,
      });

      // Mock notification.get to return null (notification doesn't exist)
      (mockChrome.notifications.get as any).mockResolvedValue(null);

      await reconstructMirrors();

      // Verify notification was recreated
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        'test-uuid-12345',
        expect.objectContaining({
          type: 'basic',
          title: 'Test Notification',
          message: 'This is a test notification',
        })
      );
    });

    it('should skip expired mirrors', async () => {
      const expiredMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() - 1000, // Expired
      };

      // Mock storage to return expired mirror
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': expiredMirrorMeta,
      });

      await reconstructMirrors();

      // Verify expired mirror was removed
      expect(mockRemoveLocal).toHaveBeenCalledWith('mirror_test-uuid-12345');

      // Verify notification was not recreated
      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredMirrors', () => {
    it('should remove expired mirror entries', async () => {
      const expiredMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() - 1000, // Expired
      };

      // Mock storage to return expired mirror
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': expiredMirrorMeta,
      });

      await cleanupExpiredMirrors();

      // Verify expired mirror was removed
      expect(mockRemoveLocal).toHaveBeenCalledWith('mirror_test-uuid-12345');
    });

    it('should keep non-expired mirrors', async () => {
      const validMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() + 86400000, // Valid
      };

      // Mock storage to return valid mirror
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': validMirrorMeta,
      });

      await cleanupExpiredMirrors();

      // Verify valid mirror was not removed
      expect(mockRemoveLocal).not.toHaveBeenCalled();
    });
  });

  describe('getActiveMirrors', () => {
    it('should return active mirrors', async () => {
      const validMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() + 86400000, // Valid
      };

      // Mock storage to return valid mirror
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': validMirrorMeta,
      });

      const mirrors = await getActiveMirrors();

      expect(mirrors).toEqual([
        {
          id: 'test-uuid-12345',
          meta: validMirrorMeta,
        },
      ]);
    });

    it('should filter out expired mirrors', async () => {
      const expiredMirrorMeta = {
        package_name: 'com.test.app',
        notification_id: '123',
        source_device_iden: 'device-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        expiresAt: Date.now() - 1000, // Expired
      };

      // Mock storage to return expired mirror
      (mockChrome.storage.local.get as any).mockResolvedValue({
        'mirror_test-uuid-12345': expiredMirrorMeta,
      });

      const mirrors = await getActiveMirrors();

      expect(mirrors).toEqual([]);
    });
  });
});
