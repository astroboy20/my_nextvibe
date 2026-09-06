import SplashScreenView from "@/components/SplashScreenView";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
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
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
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
      <Stack.Screen name="auth/login" options={{ headerShown: false, presentation: "transparentModal", animation: "none" }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false, presentation: "transparentModal", animation: "none" }} />
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
  const isBootstrapped  = useSelector((s: RootState) => s.auth.isBootstrapped);
  const isNewUser       = useSelector((s: RootState) => s.auth.isNewUser);
  const oauthPending    = useSelector((s: RootState) => s.auth.oauthPending);

  const navigationInProgress = useRef(false);
  const lastRoute = useRef<string | null>(null);
  const pushRef = useRef<boolean | null>(null);
  const shownIds = useRef<Set<string>>(new Set());
  const prevOauthPending = useRef(false);

  // ── Routing ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBootstrapped || oauthPending) return;

    // If we just came out of oauthPending, reset lastRoute so the
    // routing condition is guaranteed to fire regardless of prior navigation
    if (prevOauthPending.current) {
      lastRoute.current = null;
      navigationInProgress.current = false;
    }
    prevOauthPending.current = oauthPending;

    const inAuthGroup  = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(auth)" && segments[1] === "onboarding";
    const inOAuthCb    = segments[0] === "auth";

    let targetRoute: string | null = null;

    if (isAuthenticated && isNewUser && !inOnboarding) {
      targetRoute = "/(auth)/onboarding/vibes";
    } else if (isAuthenticated && !isNewUser && (inAuthGroup || inOAuthCb)) {
      targetRoute = "/(tabs)";
    } else if (!isAuthenticated && !inAuthGroup && !inOAuthCb) {
      targetRoute = "/(auth)/login";
    }

    if (targetRoute && targetRoute !== lastRoute.current && !navigationInProgress.current) {
      navigationInProgress.current = true;
      lastRoute.current = targetRoute;
      router.replace(targetRoute as any);
      setTimeout(() => { navigationInProgress.current = false; }, 100);
    }
  }, [isAuthenticated, isBootstrapped, isNewUser, oauthPending, segments, router]);

  // ── Register push token on sign-in ───────────────────────────────────────
  useEffect(() => {
    if (!isBootstrapped) return;
    if (!isAuthenticated) { pushRef.current = false; return; }
    if (pushRef.current === isAuthenticated) return;
    pushRef.current = isAuthenticated;
    (async () => {
      try {
        const accessToken = await tokenStore.get("accessToken");
        if (!accessToken) return;
        await registerForPush(accessToken);
      } catch { /* push failure must never crash the app */ }
    })();
  }, [isAuthenticated, isBootstrapped]);

  // ── FCM token refresh ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) return;
    let unsub: (() => void) | undefined;
    try {
      const { getMessaging, onTokenRefresh } = require("@react-native-firebase/messaging");
      unsub = onTokenRefresh(getMessaging(), async (token: string) => {
        try {
          const accessToken = await tokenStore.get("accessToken");
          if (!accessToken) return;
          await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/notifications/devices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ token, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" }),
          });
          await tokenStore.set("fcmToken", token);
        } catch { /* non-fatal */ }
      });
    } catch { return; }
    return () => unsub?.();
  }, [isAuthenticated]);

  // ── FCM foreground message handler ───────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) return;
    let unsub: (() => void) | undefined;
    try {
      const { getMessaging, onMessage } = require("@react-native-firebase/messaging");
      unsub = onMessage(getMessaging(), async (remoteMessage: any) => {
        const { notificationId } = remoteMessage.data ?? {};
        if (notificationId && shownIds.current.has(notificationId)) return;
        if (notificationId) shownIds.current.add(notificationId);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title ?? "NextVibe",
            body: remoteMessage.notification?.body ?? "",
            data: remoteMessage.data,
          },
          trigger: null,
        });
      });
    } catch { return; }
    return () => unsub?.();
  }, [isAuthenticated]);

  // ── Deep-link on notification tap — backgrounded app ─────────────────────
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const { getMessaging, onNotificationOpenedApp } = require("@react-native-firebase/messaging");
      unsub = onNotificationOpenedApp(getMessaging(), (remoteMessage: any) => {
        routeTo(remoteMessage.data, router);
      });
    } catch { return; }
    return () => unsub?.();
  }, [router]);

  // ── Deep-link on notification tap — app was fully quit ───────────────────
  useEffect(() => {
    try {
      const { getMessaging, getInitialNotification } = require("@react-native-firebase/messaging");
      getInitialNotification(getMessaging()).then((remoteMessage: any) => {
        if (remoteMessage) routeTo(remoteMessage.data, router);
      });
    } catch { /* non-fatal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OAuth loading overlay — must be after all hooks ───────────────────────
  if (oauthPending) {
    return (
      <View style={[styles.oauthOverlay, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  oauthOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
