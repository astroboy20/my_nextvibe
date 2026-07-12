import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import SplashScreenView from '@/components/SplashScreenView';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

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
    }
  }, [fontsLoaded]);

  if (!splashDone) {
    return (
      <SplashScreenView
        fontsLoaded={fontsLoaded || !!fontError}
        onFinished={() => setSplashDone(true)}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
