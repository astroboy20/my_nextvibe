import SplashScreenView from "@/components/SplashScreenView";
import { useColorScheme } from "@/components/useColorScheme";
import { registerForPush } from "@/services/pushNotifications";
import { tokenStore } from "@/store/baseQuery";
import { bootstrapAuth } from "@/store/slices/authSlice";
import { bootstrapTheme } from "@/store/slices/themeSlice";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
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
