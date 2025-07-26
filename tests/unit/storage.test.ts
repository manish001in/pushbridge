import { getLocal, setLocal } from '../../src/background/storage';

describe('Storage Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setLocal should call chrome.storage.local.set', async () => {
    const mockSet = chrome.storage.local.set as jest.Mock;
    const testData = { test: 'value' };

    mockSet.mockImplementation((_data, callback) => {
      callback();
    });

    await setLocal('test-key', testData);

    expect(mockSet).toHaveBeenCalledWith(
      { 'test-key': testData },
      expect.any(Function)
    );
  });

  test('getLocal should call chrome.storage.local.get', async () => {
    const mockGet = chrome.storage.local.get as jest.Mock;
    const testData = { test: 'value' };
    mockGet.mockImplementation((key, callback) => {
      callback({ [key]: testData });
    });

    const result = await getLocal('test-key');

    expect(mockGet).toHaveBeenCalledWith('test-key', expect.any(Function));
    expect(result).toEqual(testData);
  });
});
