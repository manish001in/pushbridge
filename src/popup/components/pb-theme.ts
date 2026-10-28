import { getLocal } from '../../background/storage';

let mql: MediaQueryList | undefined;
let followSystem = false;
let initialized = false;

function applyTheme(isDark: boolean) {
  const mode = isDark ? 'dark' : 'light';
  if (document.documentElement.getAttribute('data-theme') !== mode) {
    document.documentElement.setAttribute('data-theme', mode);
  }
}

function onSchemeChange() {
  if (!followSystem) return;
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function wireOsListener() {
  if (followSystem) {
    if (!mql) {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener
        ? mql.addEventListener('change', onSchemeChange)
        : mql.addListener(onSchemeChange as any);
    }
  } else if (mql) {
    mql.removeEventListener
      ? mql.removeEventListener('change', onSchemeChange)
      : mql.removeListener(onSchemeChange as any);
    mql = undefined;
  }
}

async function applyFromStorage() {
  try {
    const pb = await getLocal<any>('pb_settings');
    followSystem = !!pb?.systemTheme;
  } catch {
    followSystem = false;
  }
  applyTheme(
    followSystem
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );
  wireOsListener();
}

function onStorageChange(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string
) {
  if (area !== 'local' || !changes.pb_settings) return;
  followSystem = !!changes.pb_settings.newValue?.systemTheme;
  applyTheme(
    followSystem && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  wireOsListener();
}

/**
 * Boot theme handling. Call this at the very top of popup.ts, before other imports run if possible.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function bootTheme(): void {
  if (initialized) return;
  initialized = true;

  // Provisional theme before any async work to avoid flash
  try {
    const osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute(
      'data-theme',
      osDark ? 'dark' : 'light'
    );
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // Then resolve settings and wire listeners
  applyFromStorage();

  // React to settings changes from elsewhere
  chrome.storage.onChanged.addListener(onStorageChange);
}

// Optional: explicit cleanup if popup reuses the same context (rare)
export function teardownTheme(): void {
  chrome.storage.onChanged.removeListener(onStorageChange);
  if (mql) {
    mql.removeEventListener
      ? mql.removeEventListener('change', onSchemeChange)
      : mql.removeListener(onSchemeChange as any);
    mql = undefined;
  }
  initialized = false;
}
