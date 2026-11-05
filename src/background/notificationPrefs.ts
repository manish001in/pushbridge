import { getLocal } from './storage';

export interface NotificationPrefs {
  /** Master switch for desktop notifications. Syncing and the badge still run. */
  enabled: boolean;
  /** Desktop notifications for notifications mirrored from the phone. */
  mirrorsEnabled: boolean;
  sound: boolean;
  /** Let Chrome dismiss notifications instead of waiting for the user. */
  autoDismiss: boolean;
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const settings = await getLocal<any>('pb_settings');
  return {
    enabled: settings?.notificationsEnabled !== false,
    mirrorsEnabled: settings?.mirrorNotificationsEnabled !== false,
    sound: settings?.soundEnabled !== false,
    autoDismiss: settings?.autoDismissNotifications === true,
  };
}
