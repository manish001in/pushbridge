/**
 * Unit tests for PushEnricher
 */

import { PushEnricher } from '../../src/background/pushEnricher';
import { PushApiResponse, UserContext } from '../../src/types/api-interfaces';

// Mock dependencies
jest.mock('../../src/background/contextManager');

const mockContextManager = require('../../src/background/contextManager');

describe('PushEnricher', () => {
  let mockContext: UserContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock context
    mockContext = {
      current_device_iden: 'current-device',
      owned_channels: new Map([
        ['owned-channel-1', {
          iden: 'owned-channel-1',
          tag: 'owned-channel',
          name: 'Owned Channel',
          description: 'Channel owned by user',
          active: true,
          created: 1234567890,
          modified: 1234567890,
        }],
      ]),
      subscriptions: new Map([
        ['sub-channel-1', {
          iden: 'sub-channel-1',
          created: 1234567890,
          modified: 1234567890,
          active: true,
          channel: {
            iden: 'sub-channel-1',
            tag: 'subscribed-channel',
            name: 'Subscribed Channel',
            description: 'Channel user is subscribed to',
          },
        }],
      ]),
      devices: new Map([
        ['current-device', {
          iden: 'current-device',
          nickname: 'My Chrome',
          type: 'chrome',
          active: true,
          created: 1234567890,
          modified: 1234567890,
          icon: 'chrome',
          pushable: true,
        }],
        ['other-device', {
          iden: 'other-device',
          nickname: 'My iPhone',
          type: 'ios',
          active: true,
          created: 1234567890,
          modified: 1234567890,
          icon: 'ios',
          pushable: true,
        }],
      ]),
      last_refreshed: Date.now(),
      is_valid: true,
    };
  });

  describe('enrichPush', () => {
    it('should enrich a device push correctly', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Test Note',
        body: 'Test body',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'device',
        source_channel_tag: undefined,
        source_channel_name: undefined,
        source_device_nickname: 'My Chrome',
        is_owned_by_user: true,
        can_delete: true,
        can_dismiss: true,
        has_file: false,
        file_metadata: undefined,
        display_source: 'Your device',
        ownership_reason: 'You sent this',
      });
    });

    it('should enrich a channel broadcast push correctly', () => {
      const push: PushApiResponse = {
        iden: 'push2',
        type: 'note',
        title: 'Channel Broadcast',
        body: 'Broadcast from owned channel',
        source_device_iden: 'other-device',
        channel_iden: 'owned-channel-1',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'channel_broadcast',
        source_channel_tag: 'owned-channel',
        source_channel_name: 'Owned Channel',
        source_device_nickname: 'My iPhone',
        is_owned_by_user: true,
        can_delete: true,
        can_dismiss: true,
        has_file: false,
        file_metadata: undefined,
        display_source: 'Channel: Owned Channel',
        ownership_reason: 'You own channel: Owned Channel',
      });
    });

    it('should enrich a channel subscription push correctly', () => {
      const push: PushApiResponse = {
        iden: 'push3',
        type: 'note',
        title: 'Channel Subscription',
        body: 'Push from subscribed channel',
        source_device_iden: 'other-device',
        channel_iden: 'sub-channel-1',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'channel_subscription',
        source_channel_tag: 'subscribed-channel',
        source_channel_name: 'Subscribed Channel',
        source_device_nickname: 'My iPhone',
        is_owned_by_user: false,
        can_delete: false,
        can_dismiss: true,
        has_file: false,
        file_metadata: undefined,
        display_source: 'Channel: Subscribed Channel',
        ownership_reason: 'You received this',
      });
    });

    it('should enrich a file push correctly', () => {
      const push: PushApiResponse = {
        iden: 'push4',
        type: 'file',
        title: 'File Push',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
        file_name: 'test.pdf',
        file_type: 'application/pdf',
        file_url: 'https://example.com/test.pdf',
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'device',
        source_channel_tag: undefined,
        source_channel_name: undefined,
        source_device_nickname: 'My Chrome',
        is_owned_by_user: true,
        can_delete: true,
        can_dismiss: true,
        has_file: true,
        file_metadata: {
          name: 'test.pdf',
          type: 'application/pdf',
          url: 'https://example.com/test.pdf',
        },
        display_source: 'Your device',
        ownership_reason: 'You sent this',
      });
    });

    it('should handle unknown device gracefully', () => {
      const push: PushApiResponse = {
        iden: 'push5',
        type: 'note',
        title: 'Unknown Device',
        source_device_iden: 'unknown-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'device',
        source_channel_tag: undefined,
        source_channel_name: undefined,
        source_device_nickname: undefined,
        is_owned_by_user: false,
        can_delete: false,
        can_dismiss: true,
        has_file: false,
        file_metadata: undefined,
        display_source: 'Unknown device',
        ownership_reason: 'You received this',
      });
    });

    it('should handle unknown channel gracefully', () => {
      const push: PushApiResponse = {
        iden: 'push6',
        type: 'note',
        title: 'Unknown Channel',
        source_device_iden: 'other-device',
        channel_iden: 'unknown-channel',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);

      expect(enriched.metadata).toEqual({
        source_type: 'channel_subscription',
        source_channel_tag: undefined,
        source_channel_name: undefined,
        source_device_nickname: 'My iPhone',
        is_owned_by_user: false,
        can_delete: false,
        can_dismiss: true,
        has_file: false,
        file_metadata: undefined,
        display_source: 'Channel: Unknown channel',
        ownership_reason: 'You received this',
      });
    });
  });

  describe('enrichPushes', () => {
    it('should enrich multiple pushes', () => {
      const pushes: PushApiResponse[] = [
        {
          iden: 'push1',
          type: 'note',
          title: 'Push 1',
          source_device_iden: 'current-device',
          created: 1234567890,
          modified: 1234567890,
          dismissed: false,
        },
        {
          iden: 'push2',
          type: 'note',
          title: 'Push 2',
          source_device_iden: 'other-device',
          created: 1234567890,
          modified: 1234567890,
          dismissed: false,
        },
      ];

      const enriched = PushEnricher.enrichPushes(pushes, mockContext);

      expect(enriched).toHaveLength(2);
      expect(enriched[0].metadata.is_owned_by_user).toBe(true);
      expect(enriched[1].metadata.is_owned_by_user).toBe(false);
    });
  });

  describe('checkAndHandleUnknownSource', () => {
    it('should handle known source without refresh', async () => {
      mockContextManager.contextManager.isKnownSource.mockResolvedValue(true);

      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Test',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      await PushEnricher.checkAndHandleUnknownSource(push);

      expect(mockContextManager.contextManager.isKnownSource).toHaveBeenCalledWith(
        'current-device',
        undefined
      );
      expect(mockContextManager.contextManager.handleUnknownSource).not.toHaveBeenCalled();
    });

    it('should handle unknown source with refresh', async () => {
      mockContextManager.contextManager.isKnownSource.mockResolvedValue(false);

      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Test',
        source_device_iden: 'unknown-device',
        channel_iden: 'unknown-channel',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      await PushEnricher.checkAndHandleUnknownSource(push);

      expect(mockContextManager.contextManager.isKnownSource).toHaveBeenCalledWith(
        'unknown-device',
        'unknown-channel'
      );
      expect(mockContextManager.contextManager.handleUnknownSource).toHaveBeenCalledWith(
        'unknown-device',
        'unknown-channel'
      );
    });
  });

  describe('enrichPushesWithContextRefresh', () => {
    it('should enrich pushes with context refresh', async () => {
      const trigger = {
        type: 'popup_open' as const,
        timestamp: Date.now(),
      };

      mockContextManager.contextManager.getContext.mockResolvedValue(mockContext);
      mockContextManager.contextManager.isKnownSource.mockResolvedValue(true);

      const pushes: PushApiResponse[] = [
        {
          iden: 'push1',
          type: 'note',
          title: 'Test Push',
          source_device_iden: 'current-device',
          created: 1234567890,
          modified: 1234567890,
          dismissed: false,
        },
      ];

      const enriched = await PushEnricher.enrichPushesWithContextRefresh(pushes, trigger);

      expect(mockContextManager.contextManager.getContext).toHaveBeenCalledWith(trigger);
      expect(enriched).toHaveLength(1);
      expect(enriched[0].metadata.is_owned_by_user).toBe(true);
    });

    it('should handle unknown sources and refresh context', async () => {
      const trigger = {
        type: 'popup_open' as const,
        timestamp: Date.now(),
      };

      mockContextManager.contextManager.getContext.mockResolvedValue(mockContext);
      mockContextManager.contextManager.isKnownSource
        .mockResolvedValueOnce(false) // First push unknown
        .mockResolvedValueOnce(true); // After refresh, known

      const pushes: PushApiResponse[] = [
        {
          iden: 'push1',
          type: 'note',
          title: 'Unknown Source Push',
          source_device_iden: 'unknown-device',
          created: 1234567890,
          modified: 1234567890,
          dismissed: false,
        },
      ];

      const enriched = await PushEnricher.enrichPushesWithContextRefresh(pushes, trigger);

      expect(mockContextManager.contextManager.handleUnknownSource).toHaveBeenCalledWith(
        'unknown-device',
        undefined
      );
      expect(enriched).toHaveLength(1);
    });
  });

  describe('File detection', () => {
    it('should detect file pushes with file_name', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'file',
        title: 'File',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
        file_name: 'test.txt',
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.has_file).toBe(true);
    });

    it('should detect file pushes with file_url', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'file',
        title: 'File',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
        file_url: 'https://example.com/file.txt',
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.has_file).toBe(true);
    });

    it('should detect file pushes with image_url', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'file',
        title: 'Image',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
        image_url: 'https://example.com/image.jpg',
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.has_file).toBe(true);
    });

    it('should not detect file for regular note pushes', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Note',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.has_file).toBe(false);
    });
  });

  describe('Ownership determination', () => {
    it('should identify owned pushes from current device', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'My Push',
        source_device_iden: 'current-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.is_owned_by_user).toBe(true);
      expect(enriched.metadata.can_delete).toBe(true);
    });

    it('should identify owned pushes from owned channels', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Channel Push',
        source_device_iden: 'other-device',
        channel_iden: 'owned-channel-1',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.is_owned_by_user).toBe(true);
      expect(enriched.metadata.can_delete).toBe(true);
    });

    it('should identify non-owned pushes from other devices', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Other Device Push',
        source_device_iden: 'other-device',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.is_owned_by_user).toBe(false);
      expect(enriched.metadata.can_delete).toBe(false);
    });

    it('should identify non-owned pushes from subscribed channels', () => {
      const push: PushApiResponse = {
        iden: 'push1',
        type: 'note',
        title: 'Subscribed Channel Push',
        source_device_iden: 'other-device',
        channel_iden: 'sub-channel-1',
        created: 1234567890,
        modified: 1234567890,
        dismissed: false,
      };

      const enriched = PushEnricher.enrichPush(push, mockContext);
      expect(enriched.metadata.is_owned_by_user).toBe(false);
      expect(enriched.metadata.can_delete).toBe(false);
    });
  });
}); 