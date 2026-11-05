import type { PushPayload } from './pushManager';

export interface ContextMenuPush {
  payload: PushPayload;
  /** Set when the push goes to a contact, whose email still has to be looked up. */
  contactIden?: string;
}

/**
 * Turn a context menu click into a push. Menu IDs look like `push-page-all`,
 * `push-link-device-<iden>` or `push-image-contact-<iden>`. Returns null for an ID
 * that isn't one of ours.
 */
export function buildContextMenuPush(
  menuId: string,
  info: chrome.contextMenus.OnClickData,
  tab: { url?: string; title?: string }
): ContextMenuPush | null {
  const hostname = new URL(tab.url!).hostname;
  let payload: PushPayload;
  let baseAction: string;

  if (menuId.startsWith('push-page')) {
    baseAction = 'push-page';
    payload = {
      type: 'link',
      url: tab.url!,
      title: tab.title,
      body: `Page shared from ${hostname}`,
    };
  } else if (menuId.startsWith('push-link')) {
    baseAction = 'push-link';
    payload = {
      type: 'link',
      url: info.linkUrl!,
      title: (info as any).linkText || info.linkUrl,
      body: `Link shared from ${hostname}`,
    };
  } else if (menuId.startsWith('push-image')) {
    baseAction = 'push-image';
    payload = {
      type: 'link',
      url: info.srcUrl!,
      title: (info as any).altText || 'Image',
      body: `Image shared from ${hostname}`,
    };
  } else if (menuId.startsWith('push-selection')) {
    baseAction = 'push-selection';
    payload = {
      type: 'note',
      body: info.selectionText!,
      title: `Text from ${hostname}`,
    };
  } else {
    return null;
  }

  const devicePrefix = `${baseAction}-device-`;
  const contactPrefix = `${baseAction}-contact-`;
  if (menuId.startsWith(devicePrefix) && menuId.length > devicePrefix.length) {
    payload.targetDeviceIden = menuId.slice(devicePrefix.length);
    return { payload };
  }
  if (
    menuId.startsWith(contactPrefix) &&
    menuId.length > contactPrefix.length
  ) {
    return { payload, contactIden: menuId.slice(contactPrefix.length) };
  }
  // A malformed target must not fall through to sending to every device.
  if (menuId.includes('-device-') || menuId.includes('-contact-')) {
    return null;
  }
  return { payload };
}
