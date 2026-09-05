/**
 * pushNotifications.ts
 *
 * FCM-based push token registration / unregistration.
 *
 * Transport: @react-native-firebase/messaging → FCM → (APNs on iOS)
 * expo-notifications is used ONLY to:
 *   - display a notification while the app is in the foreground
 *   - create the Android 'default' channel
 *
 * All Firebase and expo-notifications imports are lazy (require inside
 * functions) so this module is safe to import in Expo Go — the metro mock
 * stubs out Firebase, and expo-notifications is only loaded when actually
 * needed on a real device.
 */

import { API_URL, tokenStore } from '@/store/baseQuery';
import * as Device from 'expo-device';
import { PermissionsAndroid, Platform } from 'react-native';

// ── Lazy accessors ────────────────────────────────────────────────────────────

function getMessaging() {
  return require('@react-native-firebase/messaging').default;
}

function getNotifications() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

// ── Expo Go / simulator guard ─────────────────────────────────────────────────
function isPushSupported(): boolean {
  if (!Device.isDevice) return false;
  try {
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') return false;
  } catch {
    // Not in Expo Go
  }
  return true;
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const messaging = getMessaging();
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android') {
    // Below API 33, permission is granted at install time
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerForPush(accessToken: string): Promise<string | null> {
  if (!isPushSupported()) return null;

  const granted = await requestPushPermission();
  if (!granted) return null;

  // Android requires a notification channel matching the backend's channelId
  if (Platform.OS === 'android') {
    const Notifications = getNotifications();
    await Notifications.setNotificationChannelAsync('default', {
      name:       'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const messaging = getMessaging();
  const token: string = await messaging().getToken();

  await fetch(`${API_URL}/v1/notifications/devices`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    }),
  });

  await tokenStore.set('fcmToken', token);
  return token;
}

// ── Unregister ────────────────────────────────────────────────────────────────

export async function unregisterPush(accessToken: string): Promise<void> {
  const token = await tokenStore.get('fcmToken');
  if (!token) return;

  try {
    await fetch(`${API_URL}/v1/notifications/devices`, {
      method:  'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } finally {
    await tokenStore.remove('fcmToken');
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'FOLLOW' | 'LIKE' | 'COMMENT' | 'TAG' | 'RSVP'
  | 'GAME_RESULT' | 'EVENT_REMINDER' | 'CHECK_IN'
  | 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | 'EVENT_PUBLISHED'
  | 'TICKET_PURCHASED' | 'GAME_UNLOCKED' | 'VIBETAG_ACTIVATED';

export type NotificationTargetType =
  | 'EVENT' | 'POSTCARD' | 'GAME' | 'USER' | 'PAYMENT' | 'TICKET';

export interface PushNotificationData {
  notificationId: string;
  type:           NotificationType;
  targetType:     NotificationTargetType;
  targetId:       string;
}
