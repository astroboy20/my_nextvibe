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
 * Rules (from MOBILE-PUSH-FCM.md):
 *   - Call registerForPush after sign-in with the user's access token
 *   - Call it on every app start — the backend endpoint upserts
 *   - Never use getDevicePushTokenAsync(): on iOS it returns a raw APNs token
 *     that FCM will not accept
 *   - Call unregisterPush BEFORE dropping the access token on sign-out
 *
 * Background message handler must live in the root index.js (see index.js),
 * not here, because this module is imported inside the component tree.
 */

import { API_URL, tokenStore } from '@/store/baseQuery';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { PermissionsAndroid, Platform } from 'react-native';

// Lazily imported so the module doesn't blow up on web / Expo Go
function getMessaging() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-firebase/messaging').default;
}

// ── Expo Go / simulator guard ─────────────────────────────────────────────────
// FCM requires a native dev/production build. Expo Go does not contain the
// Firebase native code — any call to messaging() will throw.
function isPushSupported(): boolean {
  if (!Device.isDevice) return false;
  try {
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') return false;
  } catch {
    // expo-constants not available — assume we're in a real build
  }
  return true;
}

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Request push notification permission.
 *
 * iOS: messaging().requestPermission() shows the system prompt.
 * Android 13+ (API 33): needs POST_NOTIFICATIONS runtime permission.
 *   messaging().requestPermission() is a no-op on Android — always returns
 *   AUTHORIZED — so we must use PermissionsAndroid directly.
 * Android < 13: granted at install time, nothing to request.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < 33) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const messaging = getMessaging();
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Ask for permission, get an FCM registration token, create the Android
 * 'default' channel, POST the token to the backend, and persist it in
 * SecureStore so logout can unregister it.
 *
 * Safe to call on every app start — the backend endpoint upserts.
 * Returns the FCM token string, or null when push is unavailable / denied.
 */
export async function registerForPush(accessToken: string): Promise<string | null> {
  if (!isPushSupported()) return null;

  const granted = await requestPushPermission();
  if (!granted) return null;

  // Android requires a notification channel. The backend sends channelId
  // 'default', so this id must match exactly.
  if (Platform.OS === 'android') {
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

  // Persist so unregisterPush can find it without calling getToken() again
  await tokenStore.set('fcmToken', token);

  return token;
}

// ── Unregister ────────────────────────────────────────────────────────────────

/**
 * Delete the FCM token from the backend and clear it from SecureStore.
 * Must be called BEFORE the access token is discarded — it's an authenticated
 * route that only deletes rows belonging to the calling user.
 */
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

// ── Notification data types ───────────────────────────────────────────────────

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
