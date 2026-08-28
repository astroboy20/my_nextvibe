/**
 * useNotificationBell
 *
 * Lightweight hook for any screen that shows the notification bell.
 * Returns the live unread count (from RTK Query cache) and a press handler
 * that navigates to the notifications screen.
 *
 * Usage:
 *   const { unreadCount, onBellPress } = useNotificationBell();
 *   <TopNavBar notificationCount={unreadCount} onNotificationPress={onBellPress} />
 */

import { useGetNotificationsQuery } from "@/store/api/notificationApi";
import { useRouter } from "expo-router";
import { useCallback } from "react";

export function useNotificationBell() {
  const router = useRouter();

  // Poll every 60 s — matches the 1-minute keepUnusedDataFor on notificationApi
  const { data } = useGetNotificationsQuery(undefined, {
    pollingInterval: 60_000,
  });

  const unreadCount = data?.data?.meta?.unreadCount ?? 0;

  const onBellPress = useCallback(() => {
    router.push("/notifications" as any);
  }, [router]);

  return { unreadCount, onBellPress };
}
