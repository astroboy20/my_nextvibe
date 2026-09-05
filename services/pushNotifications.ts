/**
 * pushNotifications.ts — FCM v26 modular API
 *
 * @react-native-firebase v26 uses named exports (getMessaging, getToken, etc.)
 * NOT the legacy messaging() callable pattern.
 */

import { API_URL, tokenStore } from '@/store/baseQuery';
import * as Device from 'expo-device';
import { PermissionsAndroid, Platform } from 'react-native';

function getFCM() {
  return require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
}

function getNotifications() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

function isPushSupported(): boolean {
  if (!Device.isDevice) return false;
  try {
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') return false;
  } catch { /* real build */ }
  return true;
}

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const { getMessaging, requestPermission, AuthorizationStatus } = getFCM();
    const status = await requestPermission(getMessaging());
    return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
  }

  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

export async function registerForPush(accessToken: string): Promise<string | null> {
  if (!isPushSupported()) return null;

  const granted = await requestPushPermission();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    const Notifications = getNotifications();
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { getMessaging, getToken } = getFCM();
  const token: string = await getToken(getMessaging());

  await fetch(`${API_URL}/v1/notifications/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    }),
  });

  await tokenStore.set('fcmToken', token);
  return token;
}

export async function unregisterPush(accessToken: string): Promise<void> {
  const token = await tokenStore.get('fcmToken');
  if (!token) return;

  try {
    await fetch(`${API_URL}/v1/notifications/devices`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } finally {
    await tokenStore.remove('fcmToken');
  }
}

export type NotificationType =
  | 'FOLLOW' | 'LIKE' | 'COMMENT' | 'TAG' | 'RSVP'
  | 'GAME_RESULT' | 'EVENT_REMINDER' | 'CHECK_IN'
  | 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | 'EVENT_PUBLISHED'
  | 'TICKET_PURCHASED' | 'GAME_UNLOCKED' | 'VIBETAG_ACTIVATED';

export type NotificationTargetType =
  | 'EVENT' | 'POSTCARD' | 'GAME' | 'USER' | 'PAYMENT' | 'TICKET';

export interface PushNotificationData {
  notificationId: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetId: string;
}
