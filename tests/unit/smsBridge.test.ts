/**
 * Unit tests for SMS Bridge module
 */

// Mock the storage module
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
  removeLocal: jest.fn(),
}));

// Mock the errorManager module
jest.mock('../../src/background/errorManager', () => ({
  reportError: jest.fn(),
  PBError: {
    Unknown: 'UNKNOWN',
    TokenRevoked: 'TOKEN_REVOKED',
    NetworkError: 'NETWORK_ERROR',
  },
}));

// Mock deviceManager
const mockGetDefaultSmsDevice = jest.fn();
jest.mock('../../src/background/deviceManager', () => ({
  getDefaultSmsDevice: mockGetDefaultSmsDevice,
}));

// Mock httpClient
const mockHttpClientFetch = jest.fn();
jest.mock('../../src/background/httpClient', () => ({
  httpClient: {
    fetch: mockHttpClientFetch,
  },
}));

// Import after mocking
import { reportError } from '../../src/background/errorManager';
import {
  initializeSmsBridge,
  addMessageToThread,
  getConversations,
  getConversation,
  sendSms,
  markConversationAsRead,
  getTotalUnreadCount,
  searchConversations,
  cleanupSmsBridge,
  resetForTesting,
  syncSmsHistory,
  getConversationPaged,
  loadOlderMessagesFromApi,
} from '../../src/background/smsBridge';
import { getLocal, setLocal } from '../../src/background/storage';
import { SmsMsg, SmsThread } from '../../src/types/pushbullet';

// Mock storage functions
const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;
const mockReportError = reportError as jest.MockedFunction<typeof reportError>;

// Mock fetch
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Mock setInterval and clearInterval
global.setInterval = jest.fn(() => 123 as any);
global.clearInterval = jest.fn();

// Mock default SMS device
const mockDefaultDevice = {
  iden: 'test-device-123',
  nickname: 'Test Device',
  type: 'android',
  active: true,
  created: Date.now(),
  modified: Date.now(),
  has_sms: true,
};

describe('SMS Bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockHttpClientFetch.mockClear();
    mockGetLocal.mockResolvedValue(undefined);
    mockSetLocal.mockResolvedValue();
    mockReportError.mockResolvedValue(false);
    mockGetDefaultSmsDevice.mockResolvedValue(mockDefaultDevice);

    // Reset module state
    jest.resetModules();
    resetForTesting();
  });

  describe('initializeSmsBridge', () => {
    it('should initialize SMS bridge and load conversations from storage', async () => {
      const mockConversations = {
        conversation1: {
          id: 'conversation1',
          name: 'Test Contact',
          messages: [],
          lastMessageTime: Date.now(),
          unreadCount: 0,
        },
      };

      // Mock the device-specific storage key for new simple SMS system
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `sms_data_device1`) {
          return Promise.resolve({
            threads: Object.values(mockConversations),
            lastSync: Date.now(),
            deviceIden: 'device1',
          });
        }
        return Promise.resolve(undefined);
      });

      await initializeSmsBridge();

      expect(mockGetLocal).toHaveBeenCalledWith(
        `smsThreads_${mockDefaultDevice.iden}`
      );
      expect(setInterval).toHaveBeenCalled();
    });

    it('should handle empty storage gracefully', async () => {
      await initializeSmsBridge();

      expect(mockGetLocal).toHaveBeenCalledWith(
        `smsThreads_${mockDefaultDevice.iden}`
      );
      expect(setInterval).toHaveBeenCalled();
    });
  });

  describe('addMessageToThread', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should create new thread when conversation does not exist', async () => {
      const message: SmsMsg = {
        id: 'msg1',
        pb_guid: 'guid1',
        timestamp: Date.now(),
        inbound: true,
        text: 'Hello',
        conversation_iden: 'conversation1',
      };

      await addMessageToThread('conversation1', message, 'Test Contact');

      const conversations = await getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conversation1');
      expect(conversations[0].name).toBe('Test Contact');
      expect(conversations[0].messages).toHaveLength(1);
      expect(conversations[0].unreadCount).toBe(1);
    });

    it('should add message to existing thread', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversation
      await initializeSmsBridge();

      const message: SmsMsg = {
        id: 'msg2',
        pb_guid: 'guid2',
        timestamp: Date.now() + 1000,
        inbound: false,
        text: 'Reply',
        conversation_iden: 'conversation1',
      };

      await addMessageToThread('conversation1', message);

      const conversations = await getConversations();
      expect(conversations[0].messages).toHaveLength(1);
      expect(conversations[0].unreadCount).toBe(0); // Outbound message doesn't increase unread count
    });

    it('should prevent duplicate messages based on pb_guid', async () => {
      const message: SmsMsg = {
        id: 'msg1',
        pb_guid: 'guid1',
        timestamp: Date.now(),
        inbound: true,
        text: 'Hello',
        conversation_iden: 'conversation1',
      };

      // Add the same message twice
      await addMessageToThread('conversation1', message);
      await addMessageToThread('conversation1', message);

      const conversations = await getConversations();
      expect(conversations[0].messages).toHaveLength(1); // Only one message should be added
    });

    it('should maintain chronological ordering of messages', async () => {
      const message1: SmsMsg = {
        id: 'msg1',
        pb_guid: 'guid1',
        timestamp: Date.now(),
        inbound: true,
        text: 'First',
        conversation_iden: 'conversation1',
      };

      const message2: SmsMsg = {
        id: 'msg2',
        pb_guid: 'guid2',
        timestamp: Date.now() + 1000,
        inbound: true,
        text: 'Second',
        conversation_iden: 'conversation1',
      };

      const message3: SmsMsg = {
        id: 'msg3',
        pb_guid: 'guid3',
        timestamp: Date.now() + 500, // Insert between first and second
        inbound: true,
        text: 'Third',
        conversation_iden: 'conversation1',
      };

      await addMessageToThread('conversation1', message1);
      await addMessageToThread('conversation1', message2);
      await addMessageToThread('conversation1', message3);

      const conversations = await getConversations();
      const messages = conversations[0].messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].text).toBe('First');
      expect(messages[1].text).toBe('Third');
      expect(messages[2].text).toBe('Second');
    });
  });

  describe('getConversations', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should return conversations sorted by last message time', async () => {
      const thread1: SmsThread = {
        id: 'conversation1',
        name: 'Contact 1',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      const thread2: SmsThread = {
        id: 'conversation2',
        name: 'Contact 2',
        messages: [],
        lastMessageTime: Date.now() + 1000,
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({
            conversation1: thread1,
            conversation2: thread2,
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversations
      await initializeSmsBridge();

      const conversations = await getConversations();
      expect(conversations).toHaveLength(2);
      expect(conversations[0].id).toBe('conversation2'); // More recent first
      expect(conversations[1].id).toBe('conversation1');
    });
  });

  describe('getConversation', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should return conversation by ID', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversation
      await initializeSmsBridge();

      const result = await getConversation('conversation1');
      expect(result).toEqual(thread);
    });

    it('should return null for non-existent conversation', async () => {
      const result = await getConversation('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('sendSms', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        return Promise.resolve(undefined);
      });
    });

    it('should send SMS via ephemeral message', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      // Mock the device-specific storage key to return the conversation using new simple SMS system
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `sms_data_device1`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device1',
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      await sendSms('device1', 'conversation1', 'Hello world');

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              target_device_iden: 'device1',
              addresses: ['+1234567890'],
              message: 'Hello world',
            },
          }),
        })
      );
    });

    it('should throw error for empty message', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      // Mock the device-specific storage key to return the conversation
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: conversation });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      await expect(sendSms('device1', 'conversation1', '')).rejects.toThrow(
        'Message cannot be empty'
      );
    });

    it('should throw error when no token available', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      // Mock the device-specific storage key to return the conversation but no token
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: conversation });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      await expect(
        sendSms('device1', 'conversation1', 'Hello')
      ).rejects.toThrow('No token available');
    });

    it('should handle API errors', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      // Mock the device-specific storage key to return the conversation using new simple SMS system
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `sms_data_device1`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device1',
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Server error' } }),
      });

      await expect(
        sendSms('device1', 'conversation1', 'Hello')
      ).rejects.toThrow('SMS send failed: 500 Internal Server Error');
    });

    it('should throw error when conversation not found', async () => {
      // Mock storage to return no conversations
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({});
        }
        return Promise.resolve(undefined);
      });

      await expect(sendSms('device1', 'nonexistent', 'Hello')).rejects.toThrow(
        'CONVERSATION_NOT_FOUND:nonexistent'
      );
    });

    it('should throw error when conversation has no recipients', async () => {
      // Set up a conversation without recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [],
      };

      // Mock the device-specific storage key to return the conversation using new simple SMS system
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `sms_data_device1`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device1',
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      await expect(
        sendSms('device1', 'conversation1', 'Hello')
      ).rejects.toThrow('No recipients found in conversation');
    });

    it('should send group SMS to multiple recipients', async () => {
      // Set up a conversation with multiple recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Group Chat',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Contact 1',
            address: 'contact1@example.com',
            number: '+1234567890',
          },
          {
            name: 'Contact 2',
            address: 'contact2@example.com',
            number: '+0987654321',
          },
          {
            name: 'Contact 3',
            address: 'contact3@example.com',
            number: '+5555555555',
          },
        ],
      };

      // Mock the device-specific storage key to return the conversation using new simple SMS system
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('test-user');
        if (key === `sms_data_device1`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device1',
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      await sendSms('device1', 'conversation1', 'Hello group!');

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              target_device_iden: 'device1',
              addresses: ['+1234567890', '+0987654321', '+5555555555'],
              message: 'Hello group!',
            },
          }),
        })
      );
    });
  });

  describe('markConversationAsRead', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should mark conversation as read', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 3,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversation
      await initializeSmsBridge();

      await markConversationAsRead('conversation1');

      const conversations = await getConversations();
      expect(conversations[0].unreadCount).toBe(0);
    });

    it('should handle non-existent conversation gracefully', async () => {
      await expect(
        markConversationAsRead('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('getTotalUnreadCount', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should return total unread count across all conversations', async () => {
      const thread1: SmsThread = {
        id: 'conversation1',
        name: 'Contact 1',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 2,
      };

      const thread2: SmsThread = {
        id: 'conversation2',
        name: 'Contact 2',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 1,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({
            conversation1: thread1,
            conversation2: thread2,
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversations
      await initializeSmsBridge();

      const total = await getTotalUnreadCount();
      expect(total).toBe(3);
    });
  });

  describe('searchConversations', () => {
    beforeEach(async () => {
      await initializeSmsBridge();
    });

    it('should search conversations by name', async () => {
      const thread1: SmsThread = {
        id: 'conversation1',
        name: 'Alice Smith',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      const thread2: SmsThread = {
        id: 'conversation2',
        name: 'Bob Johnson',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({
            conversation1: thread1,
            conversation2: thread2,
          });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversations
      await initializeSmsBridge();

      const results = await searchConversations('Alice');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice Smith');
    });

    it('should search conversations by phone number', async () => {
      const thread: SmsThread = {
        id: '+1234567890',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ '+1234567890': thread });
        }
        return Promise.resolve(undefined);
      });

      // Reinitialize to load the conversation
      await initializeSmsBridge();

      const results = await searchConversations('123');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('+1234567890');
    });

    it('should return empty array for no matches', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      mockGetLocal.mockResolvedValue({ conversation1: thread });

      const results = await searchConversations('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('cleanupSmsBridge', () => {
    it('should cleanup timers and persist conversations', async () => {
      await initializeSmsBridge();
      await cleanupSmsBridge();

      expect(clearInterval).toHaveBeenCalledWith(123);
      expect(mockSetLocal).toHaveBeenCalled();
    });
  });
});

describe('SMS History Sync', () => {
  beforeEach(async () => {
    await resetForTesting();
    await initializeSmsBridge();
    // Reset fetch mock for each test
    mockHttpClientFetch.mockClear();
  });

  describe('syncSmsHistory', () => {
    it('should fetch and process SMS history from pushes API', async () => {
      const mockPushes = [
        {
          iden: 'push1',
          guid: 'guid1',
          created: 1640995200, // Unix timestamp
          direction: 'incoming',
          body: 'Hello from API',
          type: 'note',
          source_device_iden: '+1234567890',
        },
        {
          iden: 'push2',
          guid: 'guid2',
          created: 1640995300,
          direction: 'incoming',
          body: 'Reply from API',
          type: 'note',
          target_device_iden: '+1234567890',
        },
      ];

      mockGetLocal.mockResolvedValue('test-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ pushes: mockPushes }),
      });

      await syncSmsHistory();

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/pushes?active=true&limit=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
          }),
        })
      );

      const conversations = await getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].messages).toHaveLength(1);
      expect(conversations[0].messages[0].text).toBe('Hello from API');
    });

    it('should handle API errors gracefully', async () => {
      mockGetLocal.mockResolvedValue('test-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(syncSmsHistory()).resolves.not.toThrow();
      // SMS errors are now handled gracefully and don't trigger error reporting
      expect(mockReportError).not.toHaveBeenCalled();
    });

    it('should skip sync when no token is available', async () => {
      mockGetLocal.mockResolvedValue(null);

      await syncSmsHistory();

      expect(mockHttpClientFetch).not.toHaveBeenCalled();
    });

    it('should handle token revocation', async () => {
      mockGetLocal.mockResolvedValue('invalid-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await syncSmsHistory();

      expect(mockHttpClientFetch).toHaveBeenCalled();
      // Should not throw error on 401, just log and return
    });
  });
});

describe('Paged Message Loading', () => {
  beforeEach(async () => {
    await resetForTesting();
    await initializeSmsBridge();
  });

  describe('getConversationPaged', () => {
    it('should return recent messages when no cursor provided', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg${i}`,
          pb_guid: `guid${i}`,
          timestamp: Date.now() + i * 1000,
          inbound: i % 2 === 0,
          text: `Message ${i}`,
          conversation_iden: 'conversation1',
        })),
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });
      await initializeSmsBridge();

      const result = await getConversationPaged('conversation1');

      expect(result.messages).toHaveLength(50); // Default limit
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeDefined();
      // Should return the most recent 50 messages
      expect(result.messages[0].text).toBe('Message 50');
      expect(result.messages[49].text).toBe('Message 99');
    });

    it('should return older messages when cursor provided', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg${i}`,
        pb_guid: `guid${i}`,
        timestamp: Date.now() + i * 1000,
        inbound: i % 2 === 0,
        text: `Message ${i}`,
        conversation_iden: 'conversation1',
      }));

      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages,
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });
      await initializeSmsBridge();

      // Request messages before message 75
      const result = await getConversationPaged('conversation1', 'msg75');

      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('msg24'); // Should point to message before the returned batch
      // Should return messages 25-74
      expect(result.messages[0].text).toBe('Message 25');
      expect(result.messages[49].text).toBe('Message 74');
    });

    it('should handle non-existent conversation', async () => {
      const result = await getConversationPaged('nonexistent');

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it('should handle invalid cursor', async () => {
      const thread: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [
          {
            id: 'msg1',
            pb_guid: 'guid1',
            timestamp: Date.now(),
            inbound: true,
            text: 'Message 1',
            conversation_iden: 'conversation1',
          },
        ],
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };

      // Mock the device-specific storage key
      mockGetLocal.mockImplementation((key: string) => {
        if (key === `smsThreads_${mockDefaultDevice.iden}`) {
          return Promise.resolve({ conversation1: thread });
        }
        return Promise.resolve(undefined);
      });
      await initializeSmsBridge();

      const result = await getConversationPaged(
        'conversation1',
        'invalid-cursor'
      );

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('loadOlderMessagesFromApi', () => {
    it('should load older messages from Pushbullet API', async () => {
      const mockTexts = [
        {
          id: 'old1',
          guid: 'oldguid1',
          timestamp: 1640995000,
          direction: 'incoming',
          body: 'Old message 1',
          thread_id: 'conversation1',
        },
        {
          id: 'old2',
          guid: 'oldguid2',
          timestamp: 1640995100,
          direction: 'outgoing',
          body: 'Old message 2',
          thread_id: 'conversation1',
        },
      ];

      mockGetLocal.mockResolvedValue('test-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          texts: mockTexts,
          cursor: 'next-cursor',
        }),
      });

      const result = await loadOlderMessagesFromApi(
        'conversation1',
        'some-cursor'
      );

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts?active=true&limit=50&cursor=some-cursor',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
          }),
        })
      );

      expect(result.messages).toHaveLength(2);
      expect(result.cursor).toBe('next-cursor');
      expect(result.hasMore).toBe(true);
      expect(result.messages[0].text).toBe('Old message 1');
      expect(result.messages[1].text).toBe('Old message 2');
    });

    it('should filter messages for specific conversation', async () => {
      const mockTexts = [
        {
          id: 'msg1',
          thread_id: 'conversation1',
          body: 'Message for conversation1',
          timestamp: 1640995000,
          direction: 'incoming',
        },
        {
          id: 'msg2',
          thread_id: 'conversation2',
          body: 'Message for conversation2',
          timestamp: 1640995100,
          direction: 'incoming',
        },
      ];

      mockGetLocal.mockResolvedValue('test-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ texts: mockTexts }),
      });

      const result = await loadOlderMessagesFromApi('conversation1');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].text).toBe('Message for conversation1');
    });

    it('should handle API errors', async () => {
      mockGetLocal.mockResolvedValue('test-token');
      mockHttpClientFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await loadOlderMessagesFromApi('conversation1');

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

describe('Group MMS and Attachments', () => {
  beforeEach(async () => {
    await resetForTesting();
    await initializeSmsBridge();
    // Reset fetch mock for each test
    mockHttpClientFetch.mockClear();
  });

  describe('sendSms with attachments', () => {
    it('should send MMS with image attachment', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      mockGetLocal.mockImplementation(key => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('user123');
        if (key === `sms_data_device123`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device123',
          });
        }
        return Promise.resolve(null);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const attachments = [
        {
          content_type: 'image/jpeg',
          name: 'photo.jpg',
          url: 'https://example.com/photo.jpg',
        },
      ];

      await sendSms(
        'device123',
        'conversation1',
        'Check out this photo!',
        attachments
      );

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            data: {
              target_device_iden: 'device123',
              addresses: ['+1234567890'],
              message: 'Check out this photo!',
              file_type: attachments[0].content_type,
            },
            file_url: attachments[0].url,
          }),
        })
      );
    });

    it('should send group MMS to multiple recipients', async () => {
      // Set up a conversation with multiple recipients
      const conversation: SmsThread = {
        id: '+1234567890,+0987654321,+1122334455',
        name: 'Group Chat',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Contact 1',
            address: 'contact1@example.com',
            number: '+1234567890',
          },
          {
            name: 'Contact 2',
            address: 'contact2@example.com',
            number: '+0987654321',
          },
          {
            name: 'Contact 3',
            address: 'contact3@example.com',
            number: '+1122334455',
          },
        ],
      };

      mockGetLocal.mockImplementation(key => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('user123');
        if (key === `sms_data_device123`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device123',
          });
        }
        return Promise.resolve(null);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const groupConversationId = '+1234567890,+0987654321,+1122334455';
      const attachments = [
        {
          content_type: 'image/png',
          name: 'group-photo.png',
          url: 'https://example.com/group-photo.png',
        },
      ];

      await sendSms(
        'device123',
        groupConversationId,
        'Group photo!',
        attachments
      );

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          body: JSON.stringify({
            data: {
              target_device_iden: 'device123',
              addresses: ['+1234567890', '+0987654321', '+1122334455'],
              message: 'Group photo!',
              file_type: attachments[0].content_type,
            },
            file_url: attachments[0].url,
          }),
        })
      );
    });

    it('should send MMS with only attachment (no text)', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      mockGetLocal.mockImplementation(key => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('user123');
        if (key === `sms_data_device123`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device123',
          });
        }
        return Promise.resolve(null);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const attachments = [
        {
          content_type: 'image/gif',
          name: 'animation.gif',
          url: 'https://example.com/animation.gif',
        },
      ];

      await sendSms('device123', 'conversation1', '', attachments);

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          body: JSON.stringify({
            data: {
              target_device_iden: 'device123',
              addresses: ['+1234567890'],
              message: '',
              file_type: attachments[0].content_type,
            },
            file_url: attachments[0].url,
          }),
        })
      );
    });

    it('should handle multiple attachments', async () => {
      // Set up a conversation with recipients
      const conversation: SmsThread = {
        id: 'conversation1',
        name: 'Test Contact',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        recipients: [
          {
            name: 'Test Contact',
            address: 'test@example.com',
            number: '+1234567890',
          },
        ],
      };

      mockGetLocal.mockImplementation(key => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        if (key === 'pb_user_iden') return Promise.resolve('user123');
        if (key === `sms_data_device123`) {
          return Promise.resolve({
            threads: [conversation],
            lastSync: Date.now(),
            deviceIden: 'device123',
          });
        }
        return Promise.resolve(null);
      });

      // Reinitialize SMS bridge to load the conversation into cache
      await initializeSmsBridge();

      mockHttpClientFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const attachments = [
        {
          content_type: 'image/jpeg',
          name: 'photo1.jpg',
          url: 'https://example.com/photo1.jpg',
        },
        {
          content_type: 'image/png',
          name: 'screenshot.png',
          url: 'https://example.com/screenshot.png',
        },
      ];

      await sendSms(
        'device123',
        'conversation1',
        'Multiple images',
        attachments
      );

      // Verify the fetch call was made with correct endpoint and method
      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/texts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify the call was made (indicating attachments were processed)
      expect(mockHttpClientFetch).toHaveBeenCalledTimes(1);
    });
  });
});
