import { buildContextMenuPush } from '../../src/background/contextMenuPayload';

describe('building a push from a context menu click', () => {
  const tab = { url: 'https://example.test/page', title: 'Page title' };
  const info = {
    linkUrl: 'https://example.test/link',
    srcUrl: 'https://example.test/image.png',
    selectionText: 'selected text',
  } as chrome.contextMenus.OnClickData;

  test.each([
    ['push-page-all', { type: 'link', url: tab.url, title: tab.title }],
    ['push-link-all', { type: 'link', url: info.linkUrl }],
    ['push-image-all', { type: 'link', url: info.srcUrl, title: 'Image' }],
    ['push-selection-all', { type: 'note', body: 'selected text' }],
  ])('%s builds the right content', (menuId, expected) => {
    expect(buildContextMenuPush(menuId, info, tab)?.payload).toMatchObject(
      expected
    );
  });

  test('a parent menu item sends to all devices', () => {
    const push = buildContextMenuPush('push-page', info, tab)!;
    expect(push.payload.targetDeviceIden).toBeUndefined();
    expect(push.contactIden).toBeUndefined();
  });

  test('targets the chosen device', () => {
    const push = buildContextMenuPush('push-link-device-abc-123', info, tab)!;
    expect(push.payload.targetDeviceIden).toBe('abc-123');
  });

  test('targets the chosen contact', () => {
    const push = buildContextMenuPush('push-image-contact-xyz', info, tab)!;
    expect(push.contactIden).toBe('xyz');
    expect(push.payload.targetDeviceIden).toBeUndefined();
  });

  test.each(['push-page-device-', 'push-page-contact-', 'other-menu'])(
    '%s sends nothing rather than guessing',
    menuId => {
      expect(buildContextMenuPush(menuId, info, tab)).toBeNull();
    }
  );
});
