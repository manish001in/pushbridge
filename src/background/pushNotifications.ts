/**
 * Desktop notifications for pushes from history.
 * Received files only notify; downloading is left to the user, in Messages.
 */

import { TransferRecord } from '../types/pushbullet';

import { getNotificationPrefs } from './notificationPrefs';
import { getLocal, removeLocal, setLocal } from './storage';

/** What a notification needs to remember for when it is clicked. */
interface PushNotificationData {
  pushIden: string;
  url?: string;
  type: string;
  channelTag?: string;
}

const dataKey = (notificationId: string) => `notification_${notificationId}`;

/**
 * Only pushes meant for this browser. `receiver_iden` can't decide this: the API
 * sets it to the user, not a device, so an untargeted push is for every device.
 */
export function isPushForThisBrowser(
  push: any,
  deviceIden: string | undefined
): boolean {
  return !(
    push.active === false || // Deleted
    push.direction === 'outgoing' || // Sent to another person
    (push.target_device_iden && push.target_device_iden !== deviceIden) ||
    (deviceIden && push.source_device_iden === deviceIden)
  );
}

/** Pushes can come from other people, so only web links may open from a click. */
function webUrlOrUndefined(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

export async function addTransferRecord(
  transfer: TransferRecord
): Promise<void> {
  try {
    const transfers = (await getLocal<TransferRecord[]>('pb_transfers')) || [];

    // Add new transfer at the beginning
    transfers.unshift(transfer);

    // Keep only last 50 transfers
    if (transfers.length > 50) {
      transfers.splice(50);
    }

    await setLocal('pb_transfers', transfers);
  } catch (error) {
    console.error('Failed to add transfer record:', error);
  }
}

/**
 * Show the notification for a new push. The caller keeps the badge.
 * @returns true if the push was for this browser, even with notifications off.
 */
export async function showPushNotification(push: any): Promise<boolean> {
  try {
    const deviceIden = await getLocal<string>('pb_device_iden');
    if (!isPushForThisBrowser(push, deviceIden)) {
      console.log('🔔 [PushNotifications] Push not for this browser, skipping');
      return false;
    }

    let title: string;
    let message: string;

    if (push.type === 'file') {
      title = 'File received';
      message = push.file_name || 'New file';

      await addTransferRecord({
        id: push.iden,
        type: 'received',
        fileName: push.file_name,
        fileSize: 0, // We don't have file size in the push
        fileType: push.file_type || 'application/octet-stream',
        timestamp: Date.now(),
        status: 'completed',
        sourceDevice: push.source_device_iden,
      });
    } else if (push.channel_tag) {
      title = `${push.channel_tag}: ${push.title ?? 'New post'}`;
      message = push.body ?? '';
    } else {
      title = push.title || (push.type === 'link' ? push.url : 'New push');
      message = push.body || '';
    }

    const prefs = await getNotificationPrefs();
    if (!prefs.enabled) {
      return true;
    }

    const notificationId = `push_${push.iden}`;
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: '/icons/48.png',
      title,
      message,
      requireInteraction: !prefs.autoDismiss,
      silent: !prefs.sound,
    });

    const data: PushNotificationData = {
      pushIden: push.iden,
      url: webUrlOrUndefined(push.url),
      type: push.type,
      channelTag: push.channel_tag,
    };
    await setLocal(dataKey(notificationId), data);

    return true;
  } catch (error) {
    console.error('Failed to show push notification:', error);
    return false;
  }
}

/** Open what a clicked push notification points at: its link, or else the popup. */
export async function handlePushNotificationClick(
  notificationId: string
): Promise<void> {
  try {
    const data = await getLocal<PushNotificationData>(dataKey(notificationId));
    if (!data) {
      console.log('No notification data found for:', notificationId);
      return;
    }

    await removeLocal(dataKey(notificationId));

    if (data.url) {
      await chrome.tabs.create({ url: data.url });
    } else {
      await chrome.action.openPopup();
    }
  } catch (error) {
    console.error('Failed to handle notification click:', error);
  }
}

/** Nothing can click a notification the user closed, so forget it. */
export async function forgetPushNotification(
  notificationId: string
): Promise<void> {
  await removeLocal(dataKey(notificationId));
}
