import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import SplashScreenView from '@/components/SplashScreenView';
import { useColorScheme } from '@/components/useColorScheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Called by SplashScreenView once its fade-out animation finishes
  function onSplashDone() {
    setReady(true);
    // TODO: check for stored JWT here — navigate to (tabs) if valid
    router.replace('/(auth)/login');
  }

  // Show only the splash until it's done
  if (!ready) {
    return (
      <SplashScreenView
        fontsLoaded={fontsLoaded || !!fontError}
        onFinished={onSplashDone}
      />
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
