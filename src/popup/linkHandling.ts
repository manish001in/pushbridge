/**
 * Link behaviour for the extension popup.
 *
 * Chrome closes an action popup when it loses focus, and a modified click on a
 * link lets the browser open the tab itself, which closes the popup. Opening
 * the tab through chrome.tabs in the background keeps the popup open, so several
 * links can be opened in a row.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/** Only web links may become clickable; push content comes from other people. */
export function isSafeLinkUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    return SAFE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isMacPlatform(): boolean {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  return /mac/i.test(nav.userAgentData?.platform || nav.platform || '');
}

/**
 * True for the gestures that mean "open in a new tab, stay here": Cmd+click on
 * macOS, Ctrl+click on Windows and Linux, and middle click everywhere. Ctrl+click
 * on macOS is the system's right click, so it is left alone.
 */
export function isBackgroundOpenEvent(
  event: MouseEvent,
  isMac: boolean = isMacPlatform()
): boolean {
  if (event.button === 1) return true;
  if (event.button !== 0) return false;
  return isMac ? event.metaKey : event.ctrlKey;
}

/** Open a link, in the background for modified clicks. Unsafe URLs are ignored. */
export function openLink(url: unknown, event?: MouseEvent): void {
  if (!isSafeLinkUrl(url)) return;
  // Image handlers also receive right clicks, and Ctrl+click on macOS is one.
  if (event) {
    const isRightClick =
      event.button > 1 ||
      (event.button === 0 && event.ctrlKey && isMacPlatform());
    if (isRightClick) return;
  }
  const inBackground = !!event && isBackgroundOpenEvent(event);
  if (inBackground) event.preventDefault();
  void chrome.tabs.create({ url, active: !inBackground });
}

function findLink(event: Event): HTMLAnchorElement | null {
  // composedPath reaches links inside the Lit components' shadow roots.
  for (const target of event.composedPath()) {
    if (target instanceof HTMLAnchorElement && target.href) return target;
  }
  return null;
}

function handleLinkClick(event: MouseEvent): void {
  if (!isBackgroundOpenEvent(event)) return;
  const link = findLink(event);
  if (!link) return;
  event.preventDefault();
  openLink(link.href, event);
}

/** Keep the popup open for modified clicks on any link it renders. */
export function installBackgroundLinkHandler(root: Document = document): void {
  root.addEventListener('click', handleLinkClick, true);
  root.addEventListener('auxclick', handleLinkClick, true);
}
