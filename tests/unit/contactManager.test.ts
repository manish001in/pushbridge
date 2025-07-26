/**
 * Unit tests for Contact Manager module
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

// Import after mocking
import {
  initializeContactManager,
  getContactName,
  refreshContacts,
  addContact,
  clearContacts,
  getAllContacts,
  isContactsCacheStale,
  resetForTesting,
} from '../../src/background/contactManager';
import { reportError } from '../../src/background/errorManager';
import { getLocal, setLocal } from '../../src/background/storage';
import { ContactInfo } from '../../src/types/pushbullet';

// Mock storage functions
const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;
const mockReportError = reportError as jest.MockedFunction<typeof reportError>;

// Mock fetch
global.fetch = jest.fn();

describe('Contact Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockGetLocal.mockResolvedValue(undefined);
    mockSetLocal.mockResolvedValue();
    mockReportError.mockResolvedValue(false);

    // Reset module state
    resetForTesting();
  });

  describe('initializeContactManager', () => {
    it('should initialize contact manager and load contacts from storage', async () => {
      const mockContacts = {
        '+1234567890': {
          name: 'John Doe',
          number: '+1234567890',
          lastUpdated: Date.now(),
        },
      };
      mockGetLocal.mockResolvedValue(mockContacts);

      await initializeContactManager();

      expect(mockGetLocal).toHaveBeenCalledWith('contacts');
    });

    it('should handle empty storage gracefully', async () => {
      await initializeContactManager();

      expect(mockGetLocal).toHaveBeenCalledWith('contacts');
    });
  });

  describe('getContactName', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should return cached contact name if available and not stale', async () => {
      const contact: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now(),
      };

      // Mock storage to return the contact
      mockGetLocal.mockResolvedValue({ '+1234567890': contact });

      // Reinitialize to load the contact
      await initializeContactManager();

      const result = await getContactName('+1234567890');
      expect(result).toBe('John Doe');
    });

    it('should return phone number if no contact found', async () => {
      const result = await getContactName('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should return phone number if contact cache is stale', async () => {
      const contact: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
      };
      mockGetLocal.mockResolvedValue({ '+1234567890': contact });

      const result = await getContactName('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should fetch contact from API and cache it', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      const mockApiResponse = {
        contacts: [
          {
            name: 'John Doe',
            phone_numbers: ['+1234567890'],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: {},
        })
      );

      const result = await getContactName('+1234567890');

      expect(result).toBe('John Doe');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/contacts',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          headers: {},
        })
      );

      const result = await getContactName('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should handle network errors gracefully', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await getContactName('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should handle token revocation', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          headers: {},
        })
      );

      const result = await getContactName('+1234567890');
      expect(result).toBe('+1234567890');
    });
  });

  describe('refreshContacts', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should refresh contacts from API and update cache', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      const mockApiResponse = {
        contacts: [
          {
            name: 'John Doe',
            phone_numbers: ['+1234567890'],
          },
          {
            name: 'Jane Smith',
            phone_numbers: ['+0987654321'],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: {},
        })
      );

      await refreshContacts();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.pushbullet.com/v2/contacts',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
        })
      );

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(2);
      expect(contacts.find(c => c.number === '+1234567890')?.name).toBe(
        'John Doe'
      );
      expect(contacts.find(c => c.number === '+0987654321')?.name).toBe(
        'Jane Smith'
      );
    });

    it('should handle API errors', async () => {
      mockGetLocal.mockResolvedValue('test-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
        })
      );

      // Should not throw - error is caught and logged
      await expect(refreshContacts()).resolves.not.toThrow();

      // Verify error was reported
      expect(mockReportError).toHaveBeenCalled();
    });

    it('should handle token revocation', async () => {
      mockGetLocal.mockResolvedValue('test-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
        })
      );

      // Should not throw - error is caught and logged
      await expect(refreshContacts()).resolves.not.toThrow();

      // Verify token revoked error was reported
      expect(mockReportError).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_REVOKED'),
        expect.any(Object)
      );
    });

    it('should handle missing token', async () => {
      // Should not throw - error is caught and logged
      await expect(refreshContacts()).resolves.not.toThrow();

      // Verify error was reported
      expect(mockReportError).toHaveBeenCalled();
    });

    it('should handle contacts without phone numbers', async () => {
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      const mockApiResponse = {
        contacts: [
          {
            name: 'John Doe',
            phone_numbers: ['+1234567890'],
          },
          {
            name: 'Jane Smith',
            phone_numbers: [], // No phone numbers
          },
          {
            name: 'Bob Johnson', // No phone_numbers field
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: {},
        })
      );

      await refreshContacts();

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(1); // Only contact with phone number
      expect(contacts[0].name).toBe('John Doe');
    });
  });

  describe('addContact', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should add contact to cache', async () => {
      await addContact('+1234567890', 'John Doe');

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('John Doe');
      expect(contacts[0].number).toBe('+1234567890');
    });

    it('should update existing contact', async () => {
      await addContact('+1234567890', 'John Doe');
      await addContact('+1234567890', 'John Smith'); // Update name

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('John Smith');
    });
  });

  describe('getAllContacts', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should return all contacts', async () => {
      const contact1: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now(),
      };
      const contact2: ContactInfo = {
        name: 'Jane Smith',
        number: '+0987654321',
        lastUpdated: Date.now(),
      };

      mockGetLocal.mockResolvedValue({
        '+1234567890': contact1,
        '+0987654321': contact2,
      });

      // Reinitialize to load the contacts
      await initializeContactManager();

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(2);
      expect(contacts.find(c => c.number === '+1234567890')?.name).toBe(
        'John Doe'
      );
      expect(contacts.find(c => c.number === '+0987654321')?.name).toBe(
        'Jane Smith'
      );
    });

    it('should return empty array when no contacts', async () => {
      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(0);
    });
  });

  describe('clearContacts', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should clear all contacts from cache and storage', async () => {
      const contact: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now(),
      };
      mockGetLocal.mockResolvedValue({ '+1234567890': contact });

      await clearContacts();

      const contacts = await getAllContacts();
      expect(contacts).toHaveLength(0);
      expect(mockSetLocal).toHaveBeenCalledWith('contacts', null);
    });
  });

  describe('isContactsCacheStale', () => {
    beforeEach(async () => {
      await initializeContactManager();
    });

    it('should return true when no contacts exist', async () => {
      const result = await isContactsCacheStale();
      expect(result).toBe(true);
    });

    it('should return true when contacts are older than 7 days', async () => {
      const contact: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
      };
      mockGetLocal.mockResolvedValue({ '+1234567890': contact });

      const result = await isContactsCacheStale();
      expect(result).toBe(true);
    });

    it('should return false when contacts are recent', async () => {
      const contact: ContactInfo = {
        name: 'John Doe',
        number: '+1234567890',
        lastUpdated: Date.now() - 6 * 24 * 60 * 60 * 1000, // 6 days old
      };
      mockGetLocal.mockResolvedValue({ '+1234567890': contact });

      // Reinitialize to load the contact
      await initializeContactManager();

      const result = await isContactsCacheStale();
      expect(result).toBe(false);
    });
  });

  describe('phone number normalization', () => {
    it('should normalize phone numbers for comparison', async () => {
      await initializeContactManager();
      mockGetLocal.mockImplementation((key: string) => {
        if (key === 'pb_token') return Promise.resolve('test-token');
        return Promise.resolve(undefined);
      });

      const mockApiResponse = {
        contacts: [
          {
            name: 'John Doe',
            phone_numbers: ['+1 (234) 567-8900'], // Formatted number
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: {},
        })
      );

      const result = await getContactName('+12345678900'); // Unformatted number
      expect(result).toBe('John Doe');
    });
  });
});
