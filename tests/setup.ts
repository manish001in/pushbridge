// Mock Chrome API for testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
    },
    session: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    getAll: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  contextMenus: {
    create: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
  },
} as any;

// Mock fetch for API testing
global.fetch = jest.fn().mockImplementation(() => {
  // Return a proper Response object by default
  return Promise.resolve(
    new Response('{}', {
      status: 200,
      statusText: 'OK',
      headers: {},
    })
  );
});

// Mock Response for testing
global.Response = class Response {
  public status: number;
  public statusText: string;
  public headers: any;
  public body: any;
  public ok: boolean;

  constructor(body?: any, init?: any) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';

    // Set ok property based on status code (200-299 are successful)
    this.ok = this.status >= 200 && this.status < 300;

    // Always ensure headers object exists with get method
    this.headers = {
      get: jest.fn((name: string) => {
        const headerValue = init?.headers?.[name];
        return headerValue || null;
      }),
    };
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string'
      ? this.body
      : JSON.stringify(this.body);
  }
} as any;

// Mock WebSocket for testing
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
})) as any;

// Add WebSocket constants
(global.WebSocket as any).CONNECTING = 0;
(global.WebSocket as any).OPEN = 1;
(global.WebSocket as any).CLOSING = 2;
(global.WebSocket as any).CLOSED = 3;

// Initialize token bucket for tests
beforeEach(() => {
  // Reset token bucket to initial state for each test
  const { tokenBucket } = require('../src/background/tokenBucket');
  if (tokenBucket) {
    tokenBucket.reset();
    tokenBucket.initialize();
  }
});
