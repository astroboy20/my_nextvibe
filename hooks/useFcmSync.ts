// import { tokenStore } from "@/store/baseQuery";
// import * as Device from "expo-device";
// import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
// import { useEffect, useRef } from "react";
// import { Platform } from "react-native";

function routeTo(data: Record<string, string> | undefined, router: ReturnType<typeof useRouter>) {
    if (!data) return;
    const map: Record<string, string> = {
        EVENT: `/events/${data.targetId}`,
        POSTCARD: `/postcards/${data.targetId}`,
        USER: `/users/${data.targetId}`,
        GAME: `/games/${data.targetId}`,
    };
    router.push((map[data.targetType] ?? "/notifications") as any);
}

function withMessaging<T>(fn: (m: typeof import("@react-native-firebase/messaging")) => T): T | undefined {
    try {
        return fn(require("@react-native-firebase/messaging"));
    } catch {
        return undefined;
    }
}

// export function useFcmSync(isAuthenticated: boolean) {
//     const router = useRouter();
//     const shownIds = useRef<Set<string>>(new Set());

//     // Token refresh — push new FCM token to backend
//     useEffect(() => {
//         if (!isAuthenticated || !Device.isDevice) return;
//         return withMessaging(({ getMessaging, onTokenRefresh }) =>
//             onTokenRefresh(getMessaging(), async (token: string) => {
//                 try {
//                     const accessToken = await tokenStore.get("accessToken");
//                     if (!accessToken) return;
//                     await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/notifications/devices`, {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
//                         body: JSON.stringify({ token, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" }),
//                     });
//                     await tokenStore.set("fcmToken", token);
//                 } catch {
//                     /* non-fatal */
//                 }
//             })
//         );
//     }, [isAuthenticated]);

//     // Foreground message — show local notification, deduped by id
//     useEffect(() => {
//         if (!isAuthenticated || !Device.isDevice) return;
//         return withMessaging(({ getMessaging, onMessage }) =>
//             onMessage(getMessaging(), async (remoteMessage: any) => {
//                 const { notificationId } = remoteMessage.data ?? {};
//                 if (notificationId && shownIds.current.has(notificationId)) return;
//                 if (notificationId) shownIds.current.add(notificationId);
//                 await Notifications.scheduleNotificationAsync({
//                     content: {
//                         title: remoteMessage.notification?.title ?? "NextVibe",
//                         body: remoteMessage.notification?.body ?? "",
//                         data: remoteMessage.data,
//                     },
//                     trigger: null,
//                 });
//             })
//         );
//     }, [isAuthenticated]);

//     // Deep-link on tap — backgrounded app
//     useEffect(() => {
//         return withMessaging(({ getMessaging, onNotificationOpenedApp }) =>
//             onNotificationOpenedApp(getMessaging(), (m: any) => routeTo(m.data, router))
//         );
//     }, [router]);

//     // Deep-link on tap — app was fully quit
//     useEffect(() => {
//         withMessaging(({ getMessaging, getInitialNotification }) =>
//             getInitialNotification(getMessaging()).then((m: any) => m && routeTo(m.data, router))
//         );
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);
// }