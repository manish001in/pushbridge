/**
 * Contact manager for Pushbridge extension
 * Handles contact fetching and management with Pushbullet chats API
 */

import { ContactsApiResponse, PushbulletContact } from '../types/api-interfaces';

import { reportError, PBError } from './errorManager';
import { httpClient } from './httpClient';
import { getLocal, setLocal } from './storage';


export interface ContactCache {
  contacts: PushbulletContact[];
  lastFetched: number;
  cursor?: string;
  hasMore: boolean;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get all contacts from Pushbullet with caching
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to array of contacts
 */
export async function getContacts(
  forceRefresh = false
): Promise<PushbulletContact[]> {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getLocal<ContactCache>('pb_contact_cache');
      if (cached && Date.now() - cached.lastFetched < CACHE_DURATION) {
        console.log('Using cached contact list');
        return cached.contacts;
      }
    }

    // Fetch fresh data
    const contacts = await fetchContactsFromAPI(forceRefresh);

    // Cache the result
    const cache: ContactCache = {
      contacts,
      lastFetched: Date.now(),
      cursor: await getLocal<string>('pb_contacts_cursor'),
      hasMore: (await getLocal<boolean>('pb_contacts_has_more')) || false,
    };
    await setLocal('pb_contact_cache', cache);

    console.log('Contact list cached with', contacts.length, 'contacts');
    return contacts;
  } catch (error) {
    // Gracefully handle first-time setup where token isn't available yet
    if (error instanceof Error && error.message.includes('No token available')) {
      const cached = await getLocal<ContactCache>('pb_contact_cache');
      if (cached) {
        console.log('No token available, returning cached contact list');
        return cached.contacts;
      }
      console.log('No token available, returning empty contact list');
      return [];
    }

    console.error('Failed to get contacts:', error);

    // Try to return cached data even if expired
    const cached = await getLocal<ContactCache>('pb_contact_cache');
    if (cached) {
      console.log('Returning expired cache due to fetch error');
      return cached.contacts;
    }

    throw error;
  }
}

/**
 * Fetch contacts directly from Pushbullet API using /v2/chats endpoint
 * @param forceRefresh - Whether to force refresh (ignore stored cursor)
 * @returns Promise resolving to array of contacts
 */
async function fetchContactsFromAPI(
  forceRefresh = false
): Promise<PushbulletContact[]> {
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
    ? `https://api.pushbullet.com/v2/chats?${params}`
    : 'https://api.pushbullet.com/v2/chats';

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
        message: 'Token revoked while fetching contacts',
        code: response.status,
      });
      throw new Error('Token is invalid or revoked');
    }
    throw new Error(
      `Failed to fetch contacts: ${response.status} ${response.statusText}`
    );
  }

  const data: ContactsApiResponse = await response.json();

  // Store cursor for next pagination
  if (data.cursor) {
    await setLocal('pb_contacts_cursor', data.cursor);
    await setLocal('pb_contacts_has_more', true);
  } else {
    // Clear cursor if no more data
    await setLocal('pb_contacts_cursor', null);
    await setLocal('pb_contacts_has_more', false);
  }

  // Transform chats data into contacts
  const contacts: PushbulletContact[] = [];
  
  if (data.chats && Array.isArray(data.chats)) {
    for (const chat of data.chats) {
      // Only process active chats with valid contact info
      if (chat.active && chat.with && chat.with.type === 'user') {
        const contact: PushbulletContact = {
          iden: chat.with.iden,
          name: chat.with.name,
          email: chat.with.email,
          email_normalized: chat.with.email_normalized,
          image_url: chat.with.image_url,
          active: chat.active,
          created: chat.created,
          modified: chat.modified,
        };
        contacts.push(contact);
      }
    }
  }

  console.log(`Fetched ${contacts.length} contacts from API`);
  return contacts;
}

/**
 * Clear contact cache
 */
export async function clearContactCache(): Promise<void> {
  try {
    await setLocal('pb_contact_cache', null);
    await setLocal('pb_contacts_cursor', null);
    await setLocal('pb_contacts_has_more', null);
    console.log('Contact cache cleared');
  } catch (error) {
    console.error('Failed to clear contact cache:', error);
    throw error;
  }
}

/**
 * Get contact by email address
 * @param email - Contact email to search for
 * @returns Promise resolving to contact or null if not found
 */
export async function getContactByEmail(
  email: string
): Promise<PushbulletContact | null> {
  const contacts = await getContacts();
  const normalizedEmail = email.toLowerCase().trim();
  
  return contacts.find(
    contact => 
      contact.email_normalized === normalizedEmail ||
      contact.email.toLowerCase() === normalizedEmail
  ) || null;
}

/**
 * Get contact by identifier
 * @param iden - Contact identifier
 * @returns Promise resolving to contact or null if not found
 */
export async function getContactByIden(
  iden: string
): Promise<PushbulletContact | null> {
  const contacts = await getContacts();
  return contacts.find(contact => contact.iden === iden) || null;
}
