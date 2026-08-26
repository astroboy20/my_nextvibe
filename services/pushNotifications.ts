/**
 * pushNotifications.ts
 *
 * Handles Expo push token registration and unregistration against the
 * NextVibe backend (POST/DELETE /v1/notifications/devices).
 *
 * Rules from MOBILE-INTEGRATION.md §2:
 *   - Call registerForPush on every app start after sign-in (endpoint upserts)
 *   - No-op on simulators (Device.isDevice guard)
 *   - Android requires a notification channel named exactly 'default'
 *   - Token is stored in SecureStore under 'expoPushToken' so logout can
 *     unregister before discarding the access token
 *   - projectId must be the EAS project ID from app.json extra.eas.projectId
 */

import { API_URL, tokenStore } from '@/store/baseQuery';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const EAS_PROJECT_ID = 'e837865d-1e7b-495f-b8dd-db9783e2435b'; // from app.json extra.eas.projectId

// ── Configure foreground notification behaviour ───────────────────────────────
// Show alert + play sound + update badge even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Request permission, get an Expo push token, create the Android channel,
 * POST it to the backend, and persist it in SecureStore.
 *
 * Safe to call on every app start — the backend endpoint upserts.
 * Returns the token string, or null if push is not available/permitted.
 */
export async function registerForPush(accessToken: string): Promise<string | null> {
  // Push does not work on simulators/emulators
  if (!Device.isDevice) return null;

  // Check / request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }
  // Respect the user's refusal — don't re-prompt every launch
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

  // Register with the backend
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
 * Must be called before discarding the access token on sign-out.
 * Already called inside authApi logout mutation — exposed here for direct use.
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
  | 'FOLLOW'
  | 'LIKE'
  | 'COMMENT'
  | 'TAG'
  | 'RSVP'
  | 'GAME_RESULT'
  | 'EVENT_REMINDER'
  | 'CHECK_IN'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'EVENT_PUBLISHED'
  | 'TICKET_PURCHASED'
  | 'GAME_UNLOCKED'
  | 'VIBETAG_ACTIVATED';

export type NotificationTargetType =
  | 'EVENT'
  | 'POSTCARD'
  | 'GAME'
  | 'USER'
  | 'PAYMENT'
  | 'TICKET';

export interface PushNotificationData {
  notificationId: string;
  type:           NotificationType;
  targetType:     NotificationTargetType;
  targetId:       string;
}
