/**
 * usePushNotifications
 *
 * Sets up foreground notification listeners and handles deduplication.
 *
 * From MOBILE-INTEGRATION.md §2:
 *   - The backend fans out to both WebSocket and Expo Push, so a foreground
 *     user gets both. Dedupe on data.notificationId.
 *   - Route on data.* fields, never by parsing body text.
 *   - Tap handler uses data.targetType + data.targetId for deep links.
 *
 * Mount this hook once inside the authenticated layout (e.g. app/(tabs)/_layout).
 */

import type { PushNotificationData } from '@/services/pushNotifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export function usePushNotifications() {
  const router  = useRouter();
  // Track seen notificationIds to dedupe WebSocket + push double-delivery
  const seen    = useRef<Set<string>>(new Set());

  useEffect(() => {
    // ── Foreground notification received ─────────────────────────────────────
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as unknown as PushNotificationData | undefined;
      if (!data?.notificationId) return;

      // Drop if already handled (e.g. via WebSocket)
      if (seen.current.has(data.notificationId)) return;
      seen.current.add(data.notificationId);

      // The notification handler set in pushNotifications.ts shows the alert
      // automatically — nothing extra needed here for display.
    });

    // ── Notification tapped (background / killed → foreground) ───────────────
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as PushNotificationData | undefined;
      if (!data) return;

      // Route on data fields — never parse body text
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
    case 'EVENT':
      router.push(`/events/${targetId}` as any);
      break;
    case 'POSTCARD':
      router.push(`/events/postcards/${targetId}` as any);
      break;
    case 'USER':
      // Navigate to profile — adjust route to match your app's profile screen
      router.push(`/(tabs)/profile` as any);
      break;
    case 'GAME':
    case 'PAYMENT':
    case 'TICKET':
      // Route to dashboard where these are surfaced
      router.push('/dashboard' as any);
      break;
    default:
      // Fall back to the main tab
      router.push('/(tabs)' as any);
  }
}
