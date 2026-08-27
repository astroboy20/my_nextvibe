import SplashScreenView from '@/components/SplashScreenView';
import { registerForPush } from '@/services/pushNotifications';
import { tokenStore } from '@/store/baseQuery';
import { bootstrapAuth } from '@/store/slices/authSlice';
import type { RootState } from '@/store/store';
import { store } from '@/store/store';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { Provider, useSelector } from 'react-redux';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

// ── Auth gate — redirects between (auth) and (tabs) based on token state ──────

function AuthGate({ children }: { children: React.ReactNode }) {
  const router          = useRouter();
  const segments        = useSegments();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isBootstrapped  = useSelector((s: RootState) => s.auth.isBootstrapped);
  const isNewUser       = useSelector((s: RootState) => s.auth.isNewUser);

  // Track previous auth state so we only register push on sign-in transitions,
  // not on every render. We still register on every app start (isAuthenticated
  // already true after bootstrap) per the integration guide.
  const prevAuthenticated = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isBootstrapped) return;

    const inAuthGroup      = segments[0] === '(auth)';
    const inOnboarding     = segments[0] === '(auth)' && segments[1] === 'onboarding';

    if (isAuthenticated && isNewUser && !inOnboarding) {
      // Freshly registered user — send to vibe onboarding
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && !isNewUser && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isBootstrapped, isNewUser, segments]);

  // Register push token whenever the user is authenticated.
  // Called on every app start (upsert is free) and on fresh sign-in.
  useEffect(() => {
    if (!isBootstrapped) return;
    if (!isAuthenticated) {
      prevAuthenticated.current = false;
      return;
    }

    // Register on first mount-with-auth and on sign-in transitions
    if (prevAuthenticated.current === isAuthenticated) return;
    prevAuthenticated.current = isAuthenticated;

    (async () => {
      try {
        const accessToken = await tokenStore.get('accessToken');
        if (!accessToken) return;
        await registerForPush(accessToken);
      } catch {
        // Push registration failure must never crash the app
      }
    })();
  }, [isAuthenticated, isBootstrapped]);

  return <>{children}</>;
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular:        require('../assets/fonts/NunitoSans_400Regular.ttf'),
    NunitoSans_400Regular_Italic: require('../assets/fonts/NunitoSans_400Regular_Italic.ttf'),
    NunitoSans_500Medium:         require('../assets/fonts/NunitoSans_500Medium.ttf'),
    NunitoSans_600SemiBold:       require('../assets/fonts/NunitoSans_600SemiBold.ttf'),
    NunitoSans_700Bold:           require('../assets/fonts/NunitoSans_700Bold.ttf'),
    NunitoSans_800ExtraBold:      require('../assets/fonts/NunitoSans_800ExtraBold.ttf'),
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      // Run token bootstrap as soon as fonts are ready
      store.dispatch(bootstrapAuth());
    }
  }, [fontsLoaded]);

  if (!splashDone) {
    return (
      <Provider store={store}>
        <SplashScreenView
          fontsLoaded={fontsLoaded || !!fontError}
          onFinished={() => setSplashDone(true)}
        />
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
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
        </Stack>      </AuthGate>
      <Toast />
    </Provider>
  );
}
