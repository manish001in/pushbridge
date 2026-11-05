import {
  installBackgroundLinkHandler,
  isBackgroundOpenEvent,
  isSafeLinkUrl,
  openLink,
} from '../../src/popup/linkHandling';

describe('popup link handling', () => {
  const click = (init: Record<string, unknown>, type = 'click') =>
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      ...init,
    });

  beforeAll(() => installBackgroundLinkHandler());

  beforeEach(() => {
    document.body.innerHTML = '';
    (chrome as any).tabs = { create: jest.fn().mockResolvedValue({}) };
  });

  test.each([
    [{ metaKey: true }, true, true],
    [{ ctrlKey: true }, true, false],
    [{ metaKey: true }, false, false],
    [{ ctrlKey: true }, false, true],
    [{ button: 1 }, true, true],
    [{ button: 1 }, false, true],
    [{ button: 2 }, false, false],
    [{}, true, false],
    [{}, false, false],
    [{ shiftKey: true }, false, false],
  ])('%j on mac=%s opens in background: %s', (init, isMac, expected) => {
    expect(isBackgroundOpenEvent(click(init), isMac)).toBe(expected);
  });

  test.each([
    ['https://example.test/a', true],
    ['http://example.test/a', true],
    ['javascript:alert(1)', false],
    ['data:text/html,x', false],
    ['file:///etc/passwd', false],
    ['not a url', false],
    [undefined, false],
  ])('isSafeLinkUrl(%s) is %s', (url, expected) => {
    expect(isSafeLinkUrl(url)).toBe(expected);
  });

  const modifier = () =>
    /mac/i.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };

  test('a modified click opens a background tab and blocks the default', () => {
    const link = document.createElement('a');
    link.href = 'https://example.test/page';
    document.body.append(link);
    const event = click(modifier());
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/page',
      active: false,
    });
  });

  test('finds links inside a shadow root, as Lit components render them', () => {
    const host = document.createElement('div');
    const link = document.createElement('a');
    link.href = 'https://example.test/shadow';
    host.attachShadow({ mode: 'open' }).append(link);
    document.body.append(host);
    link.dispatchEvent(click(modifier()));
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/shadow',
      active: false,
    });
  });

  test('middle click is handled through auxclick', () => {
    const link = document.createElement('a');
    link.href = 'https://example.test/middle';
    document.body.append(link);
    const event = click({ button: 1 }, 'auxclick');
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/middle',
      active: false,
    });
  });

  test('a plain click is left to the browser', () => {
    const link = document.createElement('a');
    link.href = 'https://example.test/plain';
    link.addEventListener('click', e => {
      expect(e.defaultPrevented).toBe(false);
      e.preventDefault(); // jsdom can't navigate
    });
    document.body.append(link);
    link.dispatchEvent(click({}));
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  test('openLink ignores right clicks', () => {
    openLink('https://example.test/image', click({ button: 2 }, 'auxclick'));
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  test('openLink ignores unsafe URLs and opens plain clicks in the foreground', () => {
    openLink('javascript:alert(1)', click(modifier()));
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    openLink('https://example.test/image', click({}));
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.test/image',
      active: true,
    });
  });
});
