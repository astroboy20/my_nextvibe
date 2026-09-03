import SplashScreenView from "@/components/SplashScreenView";
import { useColorScheme } from "@/components/useColorScheme";
import { registerForPush } from "@/services/pushNotifications";
import { tokenStore } from "@/store/baseQuery";
import { bootstrapAuth } from "@/store/slices/authSlice";
import { bootstrapTheme } from "@/store/slices/themeSlice";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { Provider, useSelector } from "react-redux";

// ── Theme gate — applies user preference over system scheme ──────────────────

function ThemedStack() {
  const scheme = useColorScheme(); // already handles preference + system fallback

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: scheme === "dark" ? "#1E1E2E" : "#FFFFFF",
        },
      }}
      initialRouteName="(auth)"
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="edit-event" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="appearance" />
    </Stack>
  );
}

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

SplashScreen.preventAutoHideAsync();

// ── Deep-link router — maps FCM payload to an app route ──────────────────────

function routeTo(data: Record<string, string> | undefined, router: ReturnType<typeof useRouter>) {
  if (!data) return;
  switch (data.targetType) {
    case "EVENT":    return router.push(`/events/${data.targetId}` as any);
    case "POSTCARD": return router.push(`/postcards/${data.targetId}` as any);
    case "USER":     return router.push(`/users/${data.targetId}` as any);
    case "GAME":     return router.push(`/games/${data.targetId}` as any);
    default:         return router.push("/notifications" as any);
  }
}

// ── Auth gate — redirects between (auth) and (tabs) based on token state ──────

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isBootstrapped = useSelector((s: RootState) => s.auth.isBootstrapped);
  const isNewUser = useSelector((s: RootState) => s.auth.isNewUser);

  // Track navigation to prevent duplicate redirects
  const navigationInProgress = useRef(false);
  const lastRoute = useRef<string | null>(null);

  useEffect(() => {
    if (!isBootstrapped) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding =
      segments[0] === "(auth)" && segments[1] === "onboarding";

    console.log('[AuthGate] segments=', segments, 'isAuth=', isAuthenticated, 'isNew=', isNewUser, 'inAuthGroup=', inAuthGroup, 'inOnboarding=', inOnboarding);

    let targetRoute: string | null = null;

    // Determine target route based on auth state
    if (isAuthenticated && isNewUser && !inOnboarding) {
      targetRoute = "/(auth)/onboarding";
    } else if (isAuthenticated && !isNewUser && inAuthGroup) {
      targetRoute = "/(tabs)";
    } else if (!isAuthenticated && !inAuthGroup) {
      targetRoute = "/(auth)/login";
    }

    // Only navigate if we have a target and it's different from last navigation
    if (targetRoute && targetRoute !== lastRoute.current && !navigationInProgress.current) {
      navigationInProgress.current = true;
      lastRoute.current = targetRoute;
      
      console.log('[AuthGate] Navigating to:', targetRoute);
      
      router.replace(targetRoute as any);
      
      // Reset navigation lock after a short delay
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 100);
    }
  }, [isAuthenticated, isBootstrapped, isNewUser, segments, router]);

  // ── Register push token on sign-in ───────────────────────────────────────
  const pushRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isBootstrapped) return;
    if (!isAuthenticated) {
      pushRef.current = false;
      return;
    }
    if (pushRef.current === isAuthenticated) return;
    pushRef.current = isAuthenticated;

    (async () => {
      try {
        const accessToken = await tokenStore.get("accessToken");
        if (!accessToken) return;
        await registerForPush(accessToken);
      } catch {
        // Push failure must never crash the app
      }
    })();
  }, [isAuthenticated, isBootstrapped]);

  // ── FCM token refresh ─────────────────────────────────────────────────────
  // FCM rotates tokens on its own schedule. Without this handler, push
  // silently stops for that device until the next cold start.
  useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) return;

    let messaging: any;
    try {
      messaging = require("@react-native-firebase/messaging").default;
    } catch {
      return;
    }

    const unsubscribe = messaging().onTokenRefresh(async (token: string) => {
      try {
        const accessToken = await tokenStore.get("accessToken");
        if (!accessToken) return;
        await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/v1/notifications/devices`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              token,
              platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
            }),
          }
        );
        // Update SecureStore with the new token so unregisterPush works
        await tokenStore.set("fcmToken", token);
      } catch {
        // Token refresh failure is non-fatal
      }
    });

    return unsubscribe;
  }, [isAuthenticated]);

  // ── FCM foreground message handler ───────────────────────────────────────
  // FCM does NOT show a tray notification while the app is in the foreground.
  // We display one via expo-notifications so the user sees it regardless.
  // Dedupe on notificationId — the WebSocket gateway delivers the same event.
  const shownIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) return;

    let messaging: any;
    try {
      messaging = require("@react-native-firebase/messaging").default;
    } catch {
      return;
    }

    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      const { notificationId } = remoteMessage.data ?? {};

      // Drop the duplicate that the WebSocket gateway already showed
      if (notificationId && shownIds.current.has(notificationId)) return;
      if (notificationId) shownIds.current.add(notificationId);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title ?? "NextVibe",
          body: remoteMessage.notification?.body ?? "",
          data: remoteMessage.data,
        },
        trigger: null, // show immediately
      });
    });

    return unsubscribe;
  }, [isAuthenticated]);

  // ── Deep-link on notification tap — backgrounded app ─────────────────────
  useEffect(() => {
    let messaging: any;
    try {
      messaging = require("@react-native-firebase/messaging").default;
    } catch {
      return;
    }

    const unsubscribe = messaging().onNotificationOpenedApp(
      (remoteMessage: any) => {
        routeTo(remoteMessage.data, router);
      }
    );
    return unsubscribe;
  }, [router]);

  // ── Deep-link on notification tap — app was fully quit ───────────────────
  useEffect(() => {
    let messaging: any;
    try {
      messaging = require("@react-native-firebase/messaging").default;
    } catch {
      return;
    }

    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) routeTo(remoteMessage.data, router);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular: require("../assets/fonts/NunitoSans_400Regular.ttf"),
    NunitoSans_400Regular_Italic: require("../assets/fonts/NunitoSans_400Regular_Italic.ttf"),
    NunitoSans_500Medium: require("../assets/fonts/NunitoSans_500Medium.ttf"),
    NunitoSans_600SemiBold: require("../assets/fonts/NunitoSans_600SemiBold.ttf"),
    NunitoSans_700Bold: require("../assets/fonts/NunitoSans_700Bold.ttf"),
    NunitoSans_800ExtraBold: require("../assets/fonts/NunitoSans_800ExtraBold.ttf"),
  });
  const [splashDone, setSplashDone] = useState(false);
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && !bootstrapStarted.current) {
      bootstrapStarted.current = true;
      store.dispatch(bootstrapAuth());
      store.dispatch(bootstrapTheme() as any);
    }
  }, [fontsLoaded]);

  if (!splashDone) {
    return (
      <Provider store={store}>
        <SplashScreenWrapper onFinished={() => setSplashDone(true)} fontsLoaded={fontsLoaded || !!fontError} />
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <AuthGate>
        <ThemedStack />
      </AuthGate>
      <Toast />
    </Provider>
  );
}

// ── Wrapper to read isBootstrapped from Redux ─────────────────────────────────

function SplashScreenWrapper({ 
  fontsLoaded, 
  onFinished 
}: { 
  fontsLoaded: boolean; 
  onFinished: () => void; 
}) {
  const isBootstrapped = useSelector((s: RootState) => s.auth.isBootstrapped);
  
  return (
    <SplashScreenView
      fontsLoaded={fontsLoaded}
      isBootstrapped={isBootstrapped}
      onFinished={onFinished}
    />
  );
}
