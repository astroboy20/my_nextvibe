/**
 * pushNotifications.ts
 *
 * Handles Expo push token registration and unregistration against the
 * NextVibe backend (POST/DELETE /v1/notifications/devices).
 *
 * Per MOBILE-INTEGRATION.md §2:
 *   - Call registerForPush on every app start after sign-in (endpoint upserts)
 *   - No-op on simulators AND in Expo Go (push was removed from Expo Go in SDK 53)
 *   - Android requires a notification channel named exactly 'default'
 *   - Token stored in SecureStore under 'expoPushToken' so logout can
 *     unregister before dropping the access token
 *   - projectId must be the EAS project ID from app.json extra.eas.projectId
 */

import { API_URL, tokenStore } from '@/store/baseQuery';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const EAS_PROJECT_ID = 'e837865d-1e7b-495f-b8dd-db9783e2435b';

// ── Expo Go detection ─────────────────────────────────────────────────────────
// expo-constants exposes the app ownership. In Expo Go it is 'expo';
// in a dev build or production build it is 'standalone' or undefined.
// Push was removed from Expo Go in SDK 53 — we must skip all push code there.
function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

// ── Push supported? ───────────────────────────────────────────────────────────
// Must be a real device AND a dev/production build (not Expo Go).
function isPushSupported(): boolean {
  return Device.isDevice && !isExpoGo();
}

// ── Configure foreground notification behaviour ───────────────────────────────
// Only call setNotificationHandler in builds that support push.
// In Expo Go this call itself throws the SDK 53 error.
if (isPushSupported()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Request permission, get an Expo push token, create the Android channel,
 * POST it to the backend, and persist it in SecureStore.
 *
 * Safe to call on every app start — the backend endpoint upserts.
 * Returns the token string, or null if push is not available / not permitted.
 */
export async function registerForPush(accessToken: string): Promise<string | null> {
  // Skip on simulators and Expo Go — push is not available in either
  if (!isPushSupported()) return null;

  // Check / request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }
  // Respect the refusal — don't re-prompt every launch
  if (status !== 'granted') return null;

  // Android requires a channel. Backend sends channelId 'default' so the
  // name here must match exactly.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get the Expo push token (SDK 49+ requires projectId)
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: EAS_PROJECT_ID,
  });

  // Register with the backend (upsert — safe to repeat every launch)
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

  // Persist so logout can unregister before dropping the access token
  await tokenStore.set('expoPushToken', token);

  return token;
}

// ── Unregister ────────────────────────────────────────────────────────────────

/**
 * Delete the device token from the backend and remove it from SecureStore.
 * Called inside authApi logout before clearing the access token.
 */
export async function unregisterPush(accessToken: string): Promise<void> {
  const token = await tokenStore.get('expoPushToken');
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
    await tokenStore.remove('expoPushToken');
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
