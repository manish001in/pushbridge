/**
 * Tests for Notification Badge Manager
 */

import { notificationBadge, NotificationCounts } from '../../src/background/notificationBadge';

// Mock chrome.action API
const mockSetBadgeText = jest.fn();
const mockSetBadgeBackgroundColor = jest.fn();

// Mock chrome API
global.chrome = {
  action: {
    setBadgeText: mockSetBadgeText,
    setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
  },
} as any;

// Mock storage functions
jest.mock('../../src/background/storage', () => ({
  getLocal: jest.fn(),
  setLocal: jest.fn(),
}));

// Mock SMS bridge
jest.mock('../../src/background/smsBridge', () => ({
  getTotalUnreadCount: jest.fn(),
}));

// Mock unifiedNotificationTracker
jest.mock('../../src/background/unifiedNotificationTracker', () => ({
  unifiedNotificationTracker: {
    initialize: jest.fn(),
    getUnreadCount: jest.fn().mockResolvedValue({ pushes: 0, mirrors: 0, sms: 0, channels: 0, total: 0 }),
    incrementCount: jest.fn(),
    decrementCount: jest.fn(),
    setCount: jest.fn(),
    clearNotifications: jest.fn(),
    clearAllNotifications: jest.fn(),
  },
}));

import { getTotalUnreadCount } from '../../src/background/smsBridge';
import { getLocal, setLocal } from '../../src/background/storage';
import { unifiedNotificationTracker } from '../../src/background/unifiedNotificationTracker';

const mockGetLocal = getLocal as jest.MockedFunction<typeof getLocal>;
const mockSetLocal = setLocal as jest.MockedFunction<typeof setLocal>;
const mockGetTotalUnreadCount = getTotalUnreadCount as jest.MockedFunction<typeof getTotalUnreadCount>;
const mockGetUnreadCount = unifiedNotificationTracker.getUnreadCount as jest.MockedFunction<typeof unifiedNotificationTracker.getUnreadCount>;
const mockIncrementCount = unifiedNotificationTracker.incrementCount as jest.MockedFunction<typeof unifiedNotificationTracker.incrementCount>;
const mockDecrementCount = unifiedNotificationTracker.decrementCount as jest.MockedFunction<typeof unifiedNotificationTracker.decrementCount>;
const mockSetCount = unifiedNotificationTracker.setCount as jest.MockedFunction<typeof unifiedNotificationTracker.setCount>;
const mockClearNotifications = unifiedNotificationTracker.clearNotifications as jest.MockedFunction<typeof unifiedNotificationTracker.clearNotifications>;
const mockClearAllNotifications = unifiedNotificationTracker.clearAllNotifications as jest.MockedFunction<typeof unifiedNotificationTracker.clearAllNotifications>;

describe('NotificationBadgeManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocal.mockResolvedValue(null);
    mockSetLocal.mockResolvedValue();
    mockGetTotalUnreadCount.mockResolvedValue(0);
    mockGetUnreadCount.mockResolvedValue({ pushes: 0, mirrors: 0, sms: 0, channels: 0, total: 0 });
    mockIncrementCount.mockResolvedValue();
    mockDecrementCount.mockResolvedValue();
    mockSetCount.mockResolvedValue();
    mockClearNotifications.mockResolvedValue();
    mockClearAllNotifications.mockResolvedValue();
    
    // Reset the singleton instance for each test
    (notificationBadge as any).badgeState = {
      counts: { pushes: 0, sms: 0, total: 0 },
      lastUpdated: 0
    };
    
    // Ensure the mock returns the expected structure
    mockGetUnreadCount.mockImplementation(() => Promise.resolve({ 
      pushes: 0, 
      mirrors: 0, 
      sms: 0, 
      channels: 0, 
      total: 0 
    }));
  });

  describe('addPushNotifications', () => {
    it('should add push notifications and update badge', async () => {
      // Mock the getUnreadCount to return the expected counts after increment
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 3, mirrors: 0, sms: 0, channels: 0, total: 3 });
      
      await notificationBadge.addPushNotifications(3);

      expect(mockIncrementCount).toHaveBeenCalledWith('push', 3);
      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '3' });
      expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });
      expect(mockSetLocal).toHaveBeenCalled();
    });

    it('should show red dot for single notification', async () => {
      // Mock the getUnreadCount to return the expected counts after increment
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 1, mirrors: 0, sms: 0, channels: 0, total: 1 });
      
      await notificationBadge.addPushNotifications(1);

      expect(mockIncrementCount).toHaveBeenCalledWith('push', 1);
      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '•' });
      expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });
    });

    it('should decrement push notifications for negative count', async () => {
      await notificationBadge.addPushNotifications(-2);

      expect(mockDecrementCount).toHaveBeenCalledWith('push', 2);
    });
  });

  describe('updateSmsNotifications', () => {
    it('should update SMS count and badge', async () => {
      mockGetTotalUnreadCount.mockResolvedValue(5);
      // Mock the getUnreadCount to return the expected counts after setCount
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 0, mirrors: 0, sms: 5, channels: 0, total: 5 });

      await notificationBadge.updateSmsNotifications();

      expect(mockGetTotalUnreadCount).toHaveBeenCalled();
      expect(mockSetCount).toHaveBeenCalledWith('sms', 5);
      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '5' });
      expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#3b82f6' });
    });
  });

  describe('clearPushNotifications', () => {
    it('should clear push notifications', async () => {
      // First add some notifications
      await notificationBadge.addPushNotifications(2);
      jest.clearAllMocks();

      // Then clear them
      await notificationBadge.clearPushNotifications();

      expect(mockClearNotifications).toHaveBeenCalledWith('push');
      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(mockSetLocal).toHaveBeenCalled();
    });
  });

  describe('clearSmsNotifications', () => {
    it('should clear SMS notifications', async () => {
      // First set some SMS notifications
      mockGetTotalUnreadCount.mockResolvedValue(3);
      await notificationBadge.updateSmsNotifications();
      jest.clearAllMocks();

      // Then clear them
      await notificationBadge.clearSmsNotifications();

      expect(mockClearNotifications).toHaveBeenCalledWith('sms');
      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(mockSetLocal).toHaveBeenCalled();
    });
  });

  describe('getNotificationCounts', () => {
    it('should return current notification counts', async () => {
      // Mock the unified tracker to return expected counts
      mockGetUnreadCount.mockResolvedValue({
        pushes: 2,
        sms: 1,
        total: 3,
      });
      
      const counts = await notificationBadge.getNotificationCounts();
      expect(counts).toEqual({
        pushes: 2,
        sms: 1,
        total: 3,
      });
    });
  });

  describe('mixed notifications', () => {
    it('should show purple badge for mixed notifications', async () => {
      // Mock the getUnreadCount to return mixed counts
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 2, mirrors: 0, sms: 0, channels: 0, total: 2 });
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 2, mirrors: 0, sms: 1, channels: 0, total: 3 });
      
      await notificationBadge.addPushNotifications(2);
      mockGetTotalUnreadCount.mockResolvedValue(1);
      await notificationBadge.updateSmsNotifications();

      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '3' });
      expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#8b5cf6' });
    });
  });

  describe('large numbers', () => {
    it('should cap display at 99+ for large numbers', async () => {
      // Mock the getUnreadCount to return large count
      mockGetUnreadCount.mockResolvedValueOnce({ pushes: 150, mirrors: 0, sms: 0, channels: 0, total: 150 });
      
      await notificationBadge.addPushNotifications(150);

      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });
  });
}); 