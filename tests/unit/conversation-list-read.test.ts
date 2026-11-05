/**
 * The popup mounts tabs in the background after first draw, so mounting must not
 * count as reading. Only opening a conversation does.
 */
import '../../src/popup/components/pb-conversation-list';

// Jest can't parse Lit's ES modules. Only the component's own logic is under test.
jest.mock('lit', () => ({
  LitElement: class extends HTMLElement {
    connectedCallback() {}
    disconnectedCallback() {}
  },
  html: () => '',
  css: () => '',
}));
jest.mock('lit/decorators.js', () => ({
  customElement: (name: string) => (target: CustomElementConstructor) => {
    customElements.define(name, target);
  },
  property: () => () => {},
  state: () => () => {},
}));

describe('marking a conversation read from the list', () => {
  const DEVICE_KEY = 'sms_data_phone';
  const thread = (id: string, unreadCount: number) => ({
    id,
    name: id,
    messages: [],
    lastMessageTime: 100,
    unreadCount,
  });
  const settle = async () => {
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  };
  const markReadCalls = () =>
    (chrome.runtime.sendMessage as jest.Mock).mock.calls.filter(
      ([message]) => message.cmd === 'MARK_CONVERSATION_READ'
    );
  const mount = async () => {
    const list = document.createElement('pb-conversation-list') as any;
    document.body.appendChild(list);
    await settle();
    return list;
  };
  let storageListeners: Array<(changes: any, area: string) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    storageListeners = [];
    const stored: Record<string, any> = {
      defaultSmsDevice: 'phone',
      [DEVICE_KEY]: { threads: [thread('t1', 2), thread('t2', 1)] },
    };
    (chrome.storage.local.get as jest.Mock).mockImplementation(async key => ({
      [key]: stored[key],
    }));
    (chrome.storage as any).onChanged = {
      addListener: (listener: any) => storageListeners.push(listener),
      removeListener: jest.fn(),
    };
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation(
      async message =>
        message.cmd === 'GET_SMS_CONVERSATIONS_FROM_API'
          ? {
              success: true,
              conversations: stored[DEVICE_KEY].threads,
            }
          : { success: true }
    );
  });

  test('mounting shows unread counts without marking anything read', async () => {
    const list = await mount();
    expect(list.conversations.map((c: any) => c.unreadCount)).toEqual([2, 1]);
    expect(markReadCalls()).toHaveLength(0);
  });

  test('a background sync arriving does not mark anything read', async () => {
    const list = await mount();
    storageListeners.forEach(listener =>
      listener(
        { [DEVICE_KEY]: { newValue: { threads: [thread('t1', 5)] } } },
        'local'
      )
    );
    await settle();
    expect(list.conversations[0].unreadCount).toBe(5);
    expect(markReadCalls()).toHaveLength(0);
  });

  test('opening a conversation marks only that one read', async () => {
    const list = await mount();
    list.selectConversation('t1');
    expect(markReadCalls()).toEqual([
      [{ cmd: 'MARK_CONVERSATION_READ', conversationId: 't1' }],
    ]);
    expect(list.conversations.map((c: any) => c.unreadCount)).toEqual([0, 1]);
  });
});
