/**
 * Unit tests for Contact Manager module
 */

// Mock the httpClient module
jest.mock('../../src/background/httpClient', () => ({
  httpClient: {
    fetch: jest.fn(),
  },
}));

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

// Import after mocking
import {
  getContacts,
  clearContactCache,
  getContactByEmail,
  getContactByIden,
} from '../../src/background/contactManager';
import { reportError } from '../../src/background/errorManager';
import { getLocal, setLocal } from '../../src/background/storage';
import { httpClient } from '../../src/background/httpClient';
import { PushbulletContact, ContactsApiResponse } from '../../src/types/api-interfaces';

// Mock storage functions
const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;
const mockReportError = reportError as jest.MockedFunction<typeof reportError>;
const mockHttpClientFetch = httpClient.fetch as jest.MockedFunction<typeof httpClient.fetch>;

describe('Contact Manager', () => {
  const mockToken = 'test-token';
  const mockContactsApiResponse: ContactsApiResponse = {
    accounts: [],
    blocks: [],
    channels: [],
    chats: [
      {
        iden: 'chat1',
        active: true,
        created: 1640995200,
        modified: 1640995200,
        with: {
          type: 'user',
          iden: 'contact1',
          name: 'John Doe',
          email: 'john@example.com',
          email_normalized: 'john@example.com',
          image_url: 'https://example.com/john.jpg',
        },
      },
      {
        iden: 'chat2',
        active: true,
        created: 1640995300,
        modified: 1640995300,
        with: {
          type: 'user',
          iden: 'contact2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          email_normalized: 'jane@example.com',
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
  };

  const expectedContacts: PushbulletContact[] = [
    {
      iden: 'contact1',
      name: 'John Doe',
      email: 'john@example.com',
      email_normalized: 'john@example.com',
      image_url: 'https://example.com/john.jpg',
      active: true,
      created: 1640995200,
      modified: 1640995200,
    },
    {
      iden: 'contact2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      email_normalized: 'jane@example.com',
      active: true,
      created: 1640995300,
      modified: 1640995300,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocal.mockResolvedValue(undefined);
    mockSetLocal.mockResolvedValue();
    mockReportError.mockResolvedValue(false);
  });

  describe('getContacts', () => {
    it('should return cached contacts if available and not expired', async () => {
      const cachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 60000, // 1 minute ago
        hasMore: false,
      };
      mockGetLocal.mockResolvedValue(cachedData);

      const result = await getContacts();

      expect(result).toEqual(expectedContacts);
      expect(mockGetLocal).toHaveBeenCalledWith('pb_contact_cache');
      expect(mockHttpClientFetch).not.toHaveBeenCalled();
    });

    it('should fetch contacts from API if cache expired', async () => {
      const expiredCachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 10 * 60 * 1000, // 10 minutes ago (expired)
        hasMore: false,
      };
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_contact_cache') return Promise.resolve(expiredCachedData);
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContactsApiResponse),
      } as Response);

      const result = await getContacts();

      expect(result).toEqual(expectedContacts);
      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/chats',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Access-Token': mockToken,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should force refresh when forceRefresh is true', async () => {
      const cachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 60000, // 1 minute ago (fresh)
        hasMore: false,
      };
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_contact_cache') return Promise.resolve(cachedData);
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContactsApiResponse),
      } as Response);

      const result = await getContacts(true);

      expect(result).toEqual(expectedContacts);
      expect(mockHttpClientFetch).toHaveBeenCalled();
    });

    it('should handle API errors and return cached data if available', async () => {
      const cachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 10 * 60 * 1000, // expired
        hasMore: false,
      };
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_contact_cache') return Promise.resolve(cachedData);
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getContacts();

      expect(result).toEqual(expectedContacts);
    });

    it('should handle token revocation', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(getContacts()).rejects.toThrow('Token is invalid or revoked');
      expect(mockReportError).toHaveBeenCalled();
    });

    it('should handle no token error', async () => {
      mockGetLocal.mockResolvedValue(undefined);

      await expect(getContacts()).rejects.toThrow('No token available');
    });

    it('should filter out inactive chats and invalid contacts', async () => {
      const responseWithInactiveChats: ContactsApiResponse = {
        ...mockContactsApiResponse,
        chats: [
          ...mockContactsApiResponse.chats,
          {
            iden: 'chat3',
            active: false, // inactive chat
            created: 1640995400,
            modified: 1640995400,
            with: {
              type: 'user',
              iden: 'contact3',
              name: 'Inactive User',
              email: 'inactive@example.com',
              email_normalized: 'inactive@example.com',
            },
          },
          {
            iden: 'chat4',
            active: true,
            created: 1640995500,
            modified: 1640995500,
            with: {
              type: 'channel', // not a user
              iden: 'channel1',
              name: 'Test Channel',
              email: 'channel@example.com',
              email_normalized: 'channel@example.com',
            },
          } as any,
        ],
      };

      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseWithInactiveChats),
      } as Response);

      const result = await getContacts();

      // Should only return the 2 active user contacts
      expect(result).toHaveLength(2);
      expect(result).toEqual(expectedContacts);
    });
  });

  describe('clearContactCache', () => {
    it('should clear contact cache and related storage', async () => {
      await clearContactCache();

      expect(mockSetLocal).toHaveBeenCalledWith('pb_contact_cache', null);
      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_cursor', null);
      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_has_more', null);
    });

    it('should handle storage errors', async () => {
      mockSetLocal.mockRejectedValue(new Error('Storage error'));

      await expect(clearContactCache()).rejects.toThrow('Storage error');
    });
  });

  describe('getContactByEmail', () => {
    beforeEach(() => {
      const cachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 60000,
        hasMore: false,
      };
      mockGetLocal.mockResolvedValue(cachedData);
    });

    it('should find contact by exact email match', async () => {
      const result = await getContactByEmail('john@example.com');

      expect(result).toEqual(expectedContacts[0]);
    });

    it('should find contact by normalized email match', async () => {
      const result = await getContactByEmail('JOHN@EXAMPLE.COM');

      expect(result).toEqual(expectedContacts[0]);
    });

    it('should return null if contact not found', async () => {
      const result = await getContactByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should handle email with extra whitespace', async () => {
      const result = await getContactByEmail('  john@example.com  ');

      expect(result).toEqual(expectedContacts[0]);
    });
  });

  describe('getContactByIden', () => {
    beforeEach(() => {
      const cachedData = {
        contacts: expectedContacts,
        lastFetched: Date.now() - 60000,
        hasMore: false,
      };
      mockGetLocal.mockResolvedValue(cachedData);
    });

    it('should find contact by iden', async () => {
      const result = await getContactByIden('contact1');

      expect(result).toEqual(expectedContacts[0]);
    });

    it('should return null if contact not found', async () => {
      const result = await getContactByIden('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('cursor handling', () => {
    it('should handle cursor-based pagination', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve(mockToken);
        if (key === 'pb_contacts_cursor') return Promise.resolve('test-cursor');
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ...mockContactsApiResponse,
          cursor: 'next-cursor',
        }),
      } as Response);

      await getContacts();

      expect(mockHttpClientFetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/chats?cursor=test-cursor',
        expect.any(Object)
      );
      
      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_cursor', 'next-cursor');
      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_has_more', true);
    });

    it('should clear cursor when no more data', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve(mockToken);
        return Promise.resolve(undefined);
      });

      mockHttpClientFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContactsApiResponse), // no cursor
      } as Response);

      await getContacts();

      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_cursor', null);
      expect(mockSetLocal).toHaveBeenCalledWith('pb_contacts_has_more', false);
    });
  });
});
