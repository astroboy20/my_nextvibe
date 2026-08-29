/**
 * usePushNotifications
 *
 * Sets up foreground notification listeners and tap-through deep linking.
 *
 * Per MOBILE-INTEGRATION.md §2:
 *   - Backend fans out to both WebSocket and Expo Push — dedupe on notificationId
 *   - Route on data.targetType + data.targetId, never by parsing body text
 *   - Push was removed from Expo Go in SDK 53 — all listener code is guarded
 *
 * Mount once inside the authenticated layout (app/(tabs)/_layout.tsx).
 */

import type { PushNotificationData } from '@/services/pushNotifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

// ── Expo Go detection ─────────────────────────────────────────────────────────
function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

export function usePushNotifications() {
  const router = useRouter();
  const seen   = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Push listeners are only available in dev builds and production builds.
    // In Expo Go (SDK 53+) they throw — skip entirely.
    if (isExpoGo()) return;

    // ── Foreground notification received ─────────────────────────────────────
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as unknown as PushNotificationData | undefined;
      if (!data?.notificationId) return;
      // Dedupe — the backend sends to both WebSocket and push simultaneously
      if (seen.current.has(data.notificationId)) return;
      seen.current.add(data.notificationId);
      // The handler in pushNotifications.ts shows the alert automatically
    });

    // ── Notification tapped (background / killed → foreground) ───────────────
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as PushNotificationData | undefined;
      if (!data) return;
      handleDeepLink(data, router);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);
}

// ── Deep-link routing ─────────────────────────────────────────────────────────

function handleDeepLink(
  data: PushNotificationData,
  router: ReturnType<typeof useRouter>,
) {
  const { targetType, targetId } = data;
  switch (targetType) {
    case 'EVENT':    router.push(`/events/${targetId}` as any);            break;
    case 'POSTCARD': router.push(`/events/postcards/${targetId}` as any);  break;
    case 'USER':     router.push('/(tabs)/profile' as any);                break;
    case 'GAME':
    case 'PAYMENT':
    case 'TICKET':   router.push('/dashboard' as any);                     break;
    default:         router.push('/(tabs)' as any);
  }
}
