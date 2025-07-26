/**
 * Contact Manager for Pushbridge extension
 * Handles contact resolution and caching for SMS functionality
 */

import { ContactInfo } from '../types/pushbullet';

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal, setLocal } from './storage';

interface ContactsApiResponse {
  contacts: any[];
  cursor?: string;
}

// Contact cache duration: 7 days in milliseconds
const CONTACT_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// In-memory contact cache
const contactCache = new Map<string, ContactInfo>();

/**
 * Initialize contact manager
 */
export async function initializeContactManager(): Promise<void> {
  try {
    await loadContactsFromStorage();
    console.log(
      'Contact Manager initialized with',
      contactCache.size,
      'contacts'
    );
  } catch (error) {
    console.error('Failed to initialize contact manager:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to initialize contact manager',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Load contacts from chrome.storage.local
 */
async function loadContactsFromStorage(): Promise<void> {
  try {
    const stored = await getLocal<Record<string, ContactInfo>>('contacts');
    if (stored) {
      for (const [number, contact] of Object.entries(stored)) {
        contactCache.set(number, contact);
      }
      console.log('Loaded', contactCache.size, 'contacts from storage');
    }
  } catch (error) {
    console.error('Failed to load contacts from storage:', error);
  }
}

/**
 * Get contact name for a phone number
 * @param phoneNumber - The phone number to look up
 * @returns Promise resolving to contact name or phone number if not found
 */
export async function getContactName(phoneNumber: string): Promise<string> {
  try {
    // Check cache first
    const cached = contactCache.get(phoneNumber);
    if (cached && Date.now() - cached.lastUpdated < CONTACT_CACHE_DURATION) {
      return cached.name;
    }

    // Try to fetch from Pushbullet API
    const contactName = await fetchContactFromAPI(phoneNumber);
    if (contactName && contactName !== phoneNumber) {
      // Cache the result
      const contact: ContactInfo = {
        name: contactName,
        number: phoneNumber,
        lastUpdated: Date.now(),
      };
      contactCache.set(phoneNumber, contact);
      await persistContacts();
      return contactName;
    }

    // Return phone number if no contact found
    return phoneNumber;
  } catch (error) {
    console.error('Failed to get contact name for:', phoneNumber, error);
    return phoneNumber;
  }
}

/**
 * Fetch contact information from Pushbullet API
 * @param phoneNumber - The phone number to look up
 * @returns Promise resolving to contact name or null if not found
 */
async function fetchContactFromAPI(
  phoneNumber: string
): Promise<string | null> {
  try {
    const token = await getLocal<string>('pb_token');
    if (!token) {
      return null;
    }

    const response = await httpClient.fetch(
      'https://api.pushbullet.com/v2/contacts',
      {
        method: 'GET',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while fetching contacts',
          code: response.status,
        });
        return null;
      }
      console.error(
        'Failed to fetch contacts:',
        response.status,
        response.statusText
      );
      return null;
    }

    const data = await response.json();
    const contacts = data.contacts || [];

    // Find contact with matching phone number
    for (const contact of contacts) {
      if (contact.phone_numbers && Array.isArray(contact.phone_numbers)) {
        for (const phone of contact.phone_numbers) {
          if (
            normalizePhoneNumber(phone) === normalizePhoneNumber(phoneNumber)
          ) {
            return (
              contact.name || contact.nickname || contact.email || phoneNumber
            );
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch contact from API:', error);
    return null;
  }
}

/**
 * Normalize phone number for comparison
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number
 */
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}

/**
 * Refresh contacts cache from Pushbullet API
 */
export async function refreshContacts(forceRefresh = false): Promise<void> {
  try {
    console.log('Refreshing contacts cache...');

    const token = await getLocal<string>('pb_token');
    if (!token) {
      throw new Error('No token available');
    }

    // Get stored cursor for pagination (unless force refresh)
    let cursor: string | undefined;
    if (!forceRefresh) {
      cursor = await getLocal<string>('pb_contacts_cursor');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = cursor
      ? `https://api.pushbullet.com/v2/contacts?${params}`
      : 'https://api.pushbullet.com/v2/contacts';

    const response = await httpClient.fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await reportError(PBError.TokenRevoked, {
          message: 'Token revoked while refreshing contacts',
          code: response.status,
        });
        throw new Error('Token is invalid or revoked');
      }
      throw new Error(
        `Failed to refresh contacts: ${response.status} ${response.statusText}`
      );
    }

    const data: ContactsApiResponse = await response.json();
    const contacts = data.contacts || [];

    // Store cursor for next pagination
    if (data.cursor) {
      await setLocal('pb_contacts_cursor', data.cursor);
      await setLocal('pb_contacts_has_more', true);
    } else {
      // Clear cursor if no more data
      await setLocal('pb_contacts_cursor', null);
      await setLocal('pb_contacts_has_more', false);
    }

    // Clear existing cache only on full refresh
    if (forceRefresh) {
      contactCache.clear();
    }

    // Add contacts to cache
    for (const contact of contacts) {
      if (contact.phone_numbers && Array.isArray(contact.phone_numbers)) {
        for (const phone of contact.phone_numbers) {
          const contactInfo: ContactInfo = {
            name: contact.name || contact.nickname || contact.email || phone,
            number: phone,
            lastUpdated: Date.now(),
          };
          contactCache.set(phone, contactInfo);
        }
      }
    }

    // Persist to storage
    await persistContacts();

    console.log('Contacts cache refreshed with', contactCache.size, 'contacts');
  } catch (error) {
    console.error('Failed to refresh contacts:', error);
    await reportError(PBError.Unknown, {
      message: 'Failed to refresh contacts',
      code: error instanceof Error ? undefined : 500,
    });
  }
}

/**
 * Add a contact to the cache
 * @param phoneNumber - The phone number
 * @param name - The contact name
 */
export async function addContact(
  phoneNumber: string,
  name: string
): Promise<void> {
  try {
    const contact: ContactInfo = {
      name,
      number: phoneNumber,
      lastUpdated: Date.now(),
    };

    contactCache.set(phoneNumber, contact);
    await persistContacts();

    console.log('Added contact:', phoneNumber, '->', name);
  } catch (error) {
    console.error('Failed to add contact:', error);
  }
}

/**
 * Persist contacts to chrome.storage.local
 */
async function persistContacts(): Promise<void> {
  try {
    const contacts: Record<string, ContactInfo> = {};
    for (const [number, contact] of contactCache.entries()) {
      contacts[number] = contact;
    }

    await setLocal('contacts', contacts);
    console.log('Persisted', contactCache.size, 'contacts to storage');
  } catch (error) {
    console.error('Failed to persist contacts:', error);
  }
}

/**
 * Clear all contacts from cache and storage
 */
export async function clearContacts(): Promise<void> {
  try {
    contactCache.clear();
    await setLocal('contacts', null);
    await setLocal('pb_contacts_cursor', null);
    await setLocal('pb_contacts_has_more', null);
    console.log('Contacts cache and cursors cleared');
  } catch (error) {
    console.error('Failed to clear contacts:', error);
  }
}

/**
 * Reset contact manager for testing
 */
export function resetForTesting(): void {
  contactCache.clear();
}

/**
 * Get all contacts
 * @returns Promise resolving to array of contact info
 */
export async function getAllContacts(): Promise<ContactInfo[]> {
  return Array.from(contactCache.values());
}

/**
 * Check if contacts cache is stale (older than 7 days)
 * @returns Promise resolving to true if cache is stale
 */
export async function isContactsCacheStale(): Promise<boolean> {
  if (contactCache.size === 0) {
    return true;
  }

  const now = Date.now();
  for (const contact of contactCache.values()) {
    if (now - contact.lastUpdated > CONTACT_CACHE_DURATION) {
      return true;
    }
  }

  return false;
}
