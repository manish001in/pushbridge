/**
 * Storage helper utility for chrome.storage.local and session access
 * Provides typed generics for type-safe storage operations
 */

/**
 * Get a value from chrome.storage.local
 * @param key - Storage key
 * @returns Promise resolving to the stored value or undefined
 */
export async function getLocal<T = unknown>(
  key: string
): Promise<T | undefined> {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => {
      resolve(result[key] as T | undefined);
    });
  });
}

/**
 * Set a value in chrome.storage.local
 * @param key - Storage key
 * @param value - Value to store
 * @returns Promise that resolves when storage is complete
 */
export async function setLocal<T = unknown>(
  key: string,
  value: T
): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Remove a key from chrome.storage.local
 * @param key - Storage key to remove
 * @returns Promise that resolves when removal is complete
 */
export async function removeLocal(key: string): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove(key, resolve);
  });
}

/**
 * Get a value from chrome.storage.session
 * @param key - Storage key
 * @returns Promise resolving to the stored value or undefined
 */
export async function getSession<T = unknown>(
  key: string
): Promise<T | undefined> {
  return new Promise(resolve => {
    chrome.storage.session.get(key, result => {
      resolve(result[key] as T | undefined);
    });
  });
}

/**
 * Set a value in chrome.storage.session
 * @param key - Storage key
 * @param value - Value to store
 * @returns Promise that resolves when storage is complete
 */
export async function setSession<T = unknown>(
  key: string,
  value: T
): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.session.set({ [key]: value }, resolve);
  });
}

/**
 * Remove a key from chrome.storage.session
 * @param key - Storage key to remove
 * @returns Promise that resolves when removal is complete
 */
export async function removeSession(key: string): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.session.remove(key, resolve);
  });
}

/**
 * Get the total bytes used in chrome.storage.local
 * @returns Promise resolving to the number of bytes used
 */
export async function getLocalBytesInUse(): Promise<number> {
  return new Promise(resolve => {
    chrome.storage.local.getBytesInUse(null, resolve);
  });
}

/**
 * Clear all data from chrome.storage.local
 * @returns Promise that resolves when clearing is complete
 */
export async function clearLocal(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.clear(resolve);
  });
}

/**
 * Clear all data from chrome.storage.session
 * @returns Promise that resolves when clearing is complete
 */
export async function clearSession(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.session.clear(resolve);
  });
}
