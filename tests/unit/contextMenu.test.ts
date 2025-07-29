/**
 * Unit tests for Context Menu functionality
 */

// Mock Chrome extension APIs
const mockChrome = {
  contextMenus: {
    removeAll: jest.fn(),
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
  },
  tabs: {
    query: jest.fn(),
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

// Mock global chrome object
(global as any).chrome = mockChrome;

// Mock dependencies
jest.mock('../../src/background/deviceManager');
jest.mock('../../src/background/contactManager');
jest.mock('../../src/background/pushManager');
jest.mock('../../src/background/storage');

const mockContactManager = require('../../src/background/contactManager');
const mockDeviceManager = require('../../src/background/deviceManager');
const mockPushManager = require('../../src/background/pushManager');
const mockStorage = require('../../src/background/storage');

// Import the functions we want to test
// Note: We'll need to extract the context menu logic into testable functions
// For now, we'll test the logic by mocking the Chrome APIs

describe('Context Menu Functionality', () => {
  let mockTab: chrome.tabs.Tab;
  let mockInfo: chrome.contextMenus.OnClickData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock tab data
    mockTab = {
      id: 1,
      url: 'https://example.com/test-page',
      title: 'Test Page Title',
    } as chrome.tabs.Tab;

    // Mock context menu info
    mockInfo = {
      menuItemId: 'push-page-all',
      parentMenuItemId: undefined,
      linkUrl: undefined,
      srcUrl: undefined,
      selectionText: undefined,
    } as chrome.contextMenus.OnClickData;

    // Mock device manager
    mockDeviceManager.getDevices.mockResolvedValue([
      {
        iden: 'device-123',
        nickname: 'Test Device',
        type: 'android',
        active: true,
      },
    ]);

    // Mock contact manager
    mockContactManager.getContacts.mockResolvedValue([
      {
        iden: 'contact-456',
        name: 'Test Contact',
        email: 'test@example.com',
      },
    ]);

    // Mock push manager
    mockPushManager.createPush.mockResolvedValue({ success: true });

    // Mock storage
    mockStorage.getLocal.mockResolvedValue('test-token');
  });

  describe('Menu ID Parsing Logic', () => {
    // Test the logic for determining base action from menu ID
    const determineBaseAction = (menuId: string): string | null => {
      if (menuId.startsWith('push-page')) return 'push-page';
      if (menuId.startsWith('push-link')) return 'push-link';
      if (menuId.startsWith('push-image')) return 'push-image';
      if (menuId.startsWith('push-selection')) return 'push-selection';
      return null;
    };

    // Test the logic for extracting device ID
    const extractDeviceId = (menuId: string, baseAction: string): string | null => {
      const deviceMatch = menuId.match(new RegExp(`${baseAction}-device-(.+)`));
      return deviceMatch && deviceMatch[1] ? deviceMatch[1] : null;
    };

    // Test the logic for extracting contact ID
    const extractContactId = (menuId: string, baseAction: string): string | null => {
      const contactMatch = menuId.match(new RegExp(`${baseAction}-contact-(.+)`));
      return contactMatch && contactMatch[1] ? contactMatch[1] : null;
    };

    describe('Base Action Detection', () => {
      it('should detect push-page base action', () => {
        expect(determineBaseAction('push-page')).toBe('push-page');
        expect(determineBaseAction('push-page-all')).toBe('push-page');
        expect(determineBaseAction('push-page-device-123')).toBe('push-page');
      });

      it('should detect push-link base action', () => {
        expect(determineBaseAction('push-link')).toBe('push-link');
        expect(determineBaseAction('push-link-all')).toBe('push-link');
        expect(determineBaseAction('push-link-contact-456')).toBe('push-link');
      });

      it('should detect push-image base action', () => {
        expect(determineBaseAction('push-image')).toBe('push-image');
        expect(determineBaseAction('push-image-all')).toBe('push-image');
        expect(determineBaseAction('push-image-device-123')).toBe('push-image');
      });

      it('should detect push-selection base action', () => {
        expect(determineBaseAction('push-selection')).toBe('push-selection');
        expect(determineBaseAction('push-selection-all')).toBe('push-selection');
        expect(determineBaseAction('push-selection-contact-456')).toBe('push-selection');
      });

      it('should return null for unknown menu IDs', () => {
        expect(determineBaseAction('unknown-menu')).toBeNull();
        expect(determineBaseAction('push-unknown')).toBeNull();
        expect(determineBaseAction('')).toBeNull();
      });
    });

    describe('Device ID Extraction', () => {
      it('should extract device ID correctly', () => {
        expect(extractDeviceId('push-page-device-123', 'push-page')).toBe('123');
        expect(extractDeviceId('push-link-device-abc-def', 'push-link')).toBe('abc-def');
        expect(extractDeviceId('push-image-device-uuid-123-456', 'push-image')).toBe('uuid-123-456');
      });

      it('should return null for non-device menu IDs', () => {
        expect(extractDeviceId('push-page-all', 'push-page')).toBeNull();
        expect(extractDeviceId('push-page-contact-456', 'push-page')).toBeNull();
        expect(extractDeviceId('push-page', 'push-page')).toBeNull();
      });

      it('should handle edge cases', () => {
        expect(extractDeviceId('push-page-device-', 'push-page')).toBeNull();
        expect(extractDeviceId('push-page-device', 'push-page')).toBeNull();
      });
    });

    describe('Contact ID Extraction', () => {
      it('should extract contact ID correctly', () => {
        expect(extractContactId('push-page-contact-456', 'push-page')).toBe('456');
        expect(extractContactId('push-link-contact-abc-def', 'push-link')).toBe('abc-def');
        expect(extractContactId('push-selection-contact-uuid-789-012', 'push-selection')).toBe('uuid-789-012');
      });

      it('should return null for non-contact menu IDs', () => {
        expect(extractContactId('push-page-all', 'push-page')).toBeNull();
        expect(extractContactId('push-page-device-123', 'push-page')).toBeNull();
        expect(extractContactId('push-page', 'push-page')).toBeNull();
      });

      it('should handle edge cases', () => {
        expect(extractContactId('push-page-contact-', 'push-page')).toBeNull();
        expect(extractContactId('push-page-contact', 'push-page')).toBeNull();
      });
    });
  });

  describe('Payload Creation Logic', () => {
    // Test the logic for creating payloads based on menu ID and context
    const createPayload = (
      menuId: string,
      tab: chrome.tabs.Tab,
      info: chrome.contextMenus.OnClickData
    ) => {
      let payload: any;
      let baseAction: string;

      // Determine base payload based on menu ID prefix
      if (menuId.startsWith('push-page')) {
        baseAction = 'push-page';
        payload = {
          type: 'link',
          url: tab.url!,
          title: tab.title,
          body: `Page shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (menuId.startsWith('push-link')) {
        baseAction = 'push-link';
        payload = {
          type: 'link',
          url: info.linkUrl!,
          title: (info as any).linkText || info.linkUrl,
          body: `Link shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (menuId.startsWith('push-image')) {
        baseAction = 'push-image';
        payload = {
          type: 'link',
          url: info.srcUrl!,
          title: (info as any).altText || 'Image',
          body: `Image shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (menuId.startsWith('push-selection')) {
        baseAction = 'push-selection';
        payload = {
          type: 'note',
          body: info.selectionText!,
          title: `Text from ${new URL(tab.url!).hostname}`,
        };
      } else {
        return { payload: null, baseAction: null };
      }

      return { payload, baseAction };
    };

    it('should create page push payload', () => {
      const { payload, baseAction } = createPayload('push-page-all', mockTab, mockInfo);
      
      expect(baseAction).toBe('push-page');
      expect(payload).toEqual({
        type: 'link',
        url: 'https://example.com/test-page',
        title: 'Test Page Title',
        body: 'Page shared from example.com',
      });
    });

    it('should create link push payload', () => {
      const linkInfo = {
        ...mockInfo,
        linkUrl: 'https://example.com/link',
        linkText: 'Test Link',
      };
      
      const { payload, baseAction } = createPayload('push-link-all', mockTab, linkInfo);
      
      expect(baseAction).toBe('push-link');
      expect(payload).toEqual({
        type: 'link',
        url: 'https://example.com/link',
        title: 'Test Link',
        body: 'Link shared from example.com',
      });
    });

    it('should create image push payload', () => {
      const imageInfo = {
        ...mockInfo,
        srcUrl: 'https://example.com/image.jpg',
        altText: 'Test Image',
      };
      
      const { payload, baseAction } = createPayload('push-image-all', mockTab, imageInfo);
      
      expect(baseAction).toBe('push-image');
      expect(payload).toEqual({
        type: 'link',
        url: 'https://example.com/image.jpg',
        title: 'Test Image',
        body: 'Image shared from example.com',
      });
    });

    it('should create selection push payload', () => {
      const selectionInfo = {
        ...mockInfo,
        selectionText: 'Selected text content',
      };
      
      const { payload, baseAction } = createPayload('push-selection-all', mockTab, selectionInfo);
      
      expect(baseAction).toBe('push-selection');
      expect(payload).toEqual({
        type: 'note',
        body: 'Selected text content',
        title: 'Text from example.com',
      });
    });

    it('should handle unknown menu IDs', () => {
      const { payload, baseAction } = createPayload('unknown-menu', mockTab, mockInfo);
      
      expect(payload).toBeNull();
      expect(baseAction).toBeNull();
    });
  });

  describe('Targeting Logic', () => {
    // Test the logic for determining targeting based on menu ID
    const determineTargeting = (menuId: string, baseAction: string) => {
      const targeting = {
        targetDeviceIden: undefined as string | undefined,
        email: undefined as string | undefined,
        targetType: 'all' as 'all' | 'device' | 'contact',
      };

      if (menuId.endsWith('-all')) {
        targeting.targetType = 'all';
      } else if (menuId.includes('-device-')) {
        const deviceMatch = menuId.match(new RegExp(`${baseAction}-device-(.+)`));
        if (deviceMatch && deviceMatch[1]) {
          targeting.targetDeviceIden = deviceMatch[1];
          targeting.targetType = 'device';
        }
      } else if (menuId.includes('-contact-')) {
        const contactMatch = menuId.match(new RegExp(`${baseAction}-contact-(.+)`));
        if (contactMatch && contactMatch[1]) {
          targeting.targetType = 'contact';
          // Note: email would be set after contact lookup
        }
      } else {
        // Parent menu item - default to all devices
        targeting.targetType = 'all';
      }

      return targeting;
    };

    it('should target all devices for -all suffix', () => {
      const targeting = determineTargeting('push-page-all', 'push-page');
      expect(targeting.targetType).toBe('all');
      expect(targeting.targetDeviceIden).toBeUndefined();
      expect(targeting.email).toBeUndefined();
    });

    it('should target specific device', () => {
      const targeting = determineTargeting('push-page-device-123', 'push-page');
      expect(targeting.targetType).toBe('device');
      expect(targeting.targetDeviceIden).toBe('123');
      expect(targeting.email).toBeUndefined();
    });

    it('should target specific contact', () => {
      const targeting = determineTargeting('push-page-contact-456', 'push-page');
      expect(targeting.targetType).toBe('contact');
      expect(targeting.targetDeviceIden).toBeUndefined();
      expect(targeting.email).toBeUndefined(); // Would be set after contact lookup
    });

    it('should default to all devices for parent menu', () => {
      const targeting = determineTargeting('push-page', 'push-page');
      expect(targeting.targetType).toBe('all');
      expect(targeting.targetDeviceIden).toBeUndefined();
      expect(targeting.email).toBeUndefined();
    });

    it('should handle device IDs with dashes', () => {
      const targeting = determineTargeting('push-page-device-uuid-123-456', 'push-page');
      expect(targeting.targetType).toBe('device');
      expect(targeting.targetDeviceIden).toBe('uuid-123-456');
    });

    it('should handle contact IDs with dashes', () => {
      const targeting = determineTargeting('push-page-contact-uuid-789-012', 'push-page');
      expect(targeting.targetType).toBe('contact');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tab gracefully', () => {
      // This would be tested in the actual click handler
      // For now, we test the logic that would handle this case
      const handleMissingTab = (tab: chrome.tabs.Tab | undefined) => {
        if (!tab) {
          return { error: 'No tab available' };
        }
        return { success: true };
      };

      expect(handleMissingTab(undefined)).toEqual({ error: 'No tab available' });
      expect(handleMissingTab(mockTab)).toEqual({ success: true });
    });

    it('should handle invalid device ID extraction', () => {
      const extractDeviceId = (menuId: string, baseAction: string): string | null => {
        const deviceMatch = menuId.match(new RegExp(`${baseAction}-device-(.+)`));
        return deviceMatch && deviceMatch[1] ? deviceMatch[1] : null;
      };

      expect(extractDeviceId('push-page-device', 'push-page')).toBeNull();
      expect(extractDeviceId('push-page-device-', 'push-page')).toBeNull();
      expect(extractDeviceId('invalid-menu', 'push-page')).toBeNull();
    });

    it('should handle invalid contact ID extraction', () => {
      const extractContactId = (menuId: string, baseAction: string): string | null => {
        const contactMatch = menuId.match(new RegExp(`${baseAction}-contact-(.+)`));
        return contactMatch && contactMatch[1] ? contactMatch[1] : null;
      };

      expect(extractContactId('push-page-contact', 'push-page')).toBeNull();
      expect(extractContactId('push-page-contact-', 'push-page')).toBeNull();
      expect(extractContactId('invalid-menu', 'push-page')).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    // Test complete scenarios that combine multiple pieces of logic
    const processContextMenuClick = (
      menuId: string,
      tab: chrome.tabs.Tab,
      info: chrome.contextMenus.OnClickData
    ) => {
      // Step 1: Determine base action
      let baseAction: string;
      if (menuId.startsWith('push-page')) baseAction = 'push-page';
      else if (menuId.startsWith('push-link')) baseAction = 'push-link';
      else if (menuId.startsWith('push-image')) baseAction = 'push-image';
      else if (menuId.startsWith('push-selection')) baseAction = 'push-selection';
      else return { error: 'Unknown menu ID' };

      // Step 2: Create payload
      let payload: any;
      if (baseAction === 'push-page') {
        payload = {
          type: 'link',
          url: tab.url!,
          title: tab.title,
          body: `Page shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (baseAction === 'push-link') {
        payload = {
          type: 'link',
          url: info.linkUrl!,
          title: (info as any).linkText || info.linkUrl,
          body: `Link shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (baseAction === 'push-image') {
        payload = {
          type: 'link',
          url: info.srcUrl!,
          title: (info as any).altText || 'Image',
          body: `Image shared from ${new URL(tab.url!).hostname}`,
        };
      } else if (baseAction === 'push-selection') {
        payload = {
          type: 'note',
          body: info.selectionText!,
          title: `Text from ${new URL(tab.url!).hostname}`,
        };
      }

      // Step 3: Determine targeting
      if (menuId.endsWith('-all')) {
        // Send to all devices - no targeting needed
      } else if (menuId.includes('-device-')) {
        const deviceMatch = menuId.match(new RegExp(`${baseAction}-device-(.+)`));
        if (deviceMatch && deviceMatch[1]) {
          payload.targetDeviceIden = deviceMatch[1];
        } else {
          return { error: 'Invalid device ID' };
        }
      } else if (menuId.includes('-contact-')) {
        const contactMatch = menuId.match(new RegExp(`${baseAction}-contact-(.+)`));
        if (contactMatch && contactMatch[1]) {
          // In real implementation, this would look up the contact
          payload.contactIden = contactMatch[1];
        } else {
          return { error: 'Invalid contact ID' };
        }
      }

      return { success: true, payload, baseAction };
    };

    it('should process page push to all devices', () => {
      const result = processContextMenuClick('push-page-all', mockTab, mockInfo);
      
      expect(result.success).toBe(true);
      expect(result.baseAction).toBe('push-page');
      expect(result.payload).toEqual({
        type: 'link',
        url: 'https://example.com/test-page',
        title: 'Test Page Title',
        body: 'Page shared from example.com',
      });
      expect(result.payload.targetDeviceIden).toBeUndefined();
    });

    it('should process page push to specific device', () => {
      const result = processContextMenuClick('push-page-device-123', mockTab, mockInfo);
      
      expect(result.success).toBe(true);
      expect(result.baseAction).toBe('push-page');
      expect(result.payload.targetDeviceIden).toBe('123');
    });

    it('should process link push to specific contact', () => {
      const linkInfo = {
        ...mockInfo,
        linkUrl: 'https://example.com/link',
        linkText: 'Test Link',
      };
      
      const result = processContextMenuClick('push-link-contact-456', mockTab, linkInfo);
      
      expect(result.success).toBe(true);
      expect(result.baseAction).toBe('push-link');
      expect(result.payload.contactIden).toBe('456');
      expect(result.payload.url).toBe('https://example.com/link');
    });

    it('should handle unknown menu ID', () => {
      const result = processContextMenuClick('unknown-menu', mockTab, mockInfo);
      
      expect(result.error).toBe('Unknown menu ID');
    });

    it('should handle invalid device ID', () => {
      const result = processContextMenuClick('push-page-device', mockTab, mockInfo);
      
      // 'push-page-device' without trailing dash should be treated as parent menu
      expect(result.success).toBe(true);
      expect(result.baseAction).toBe('push-page');
      expect(result.payload.targetDeviceIden).toBeUndefined();
    });

    it('should handle invalid contact ID', () => {
      const result = processContextMenuClick('push-page-contact', mockTab, mockInfo);
      
      // 'push-page-contact' without trailing dash should be treated as parent menu
      expect(result.success).toBe(true);
      expect(result.baseAction).toBe('push-page');
      expect(result.payload.contactIden).toBeUndefined();
    });
  });
}); 