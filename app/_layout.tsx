import SplashScreenView from '@/components/SplashScreenView';
import { bootstrapAuth } from '@/store/slices/authSlice';
import type { RootState } from '@/store/store';
import { store } from '@/store/store';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Provider, useSelector } from 'react-redux';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

// ── Auth gate — redirects between (auth) and (tabs) based on token state ──────

function AuthGate({ children }: { children: React.ReactNode }) {
  const router         = useRouter();
  const segments       = useSegments();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isBootstrapped  = useSelector((s: RootState) => s.auth.isBootstrapped);

  useEffect(() => {
    if (!isBootstrapped) return; // wait for bootstrap to finish

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Logged in but still on an auth screen → push to app
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Not logged in but trying to access a protected screen → push to login
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isBootstrapped, segments]);

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
        </Stack>
      </AuthGate>
    </Provider>
  );
}
