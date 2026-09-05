// `@expo/metro-runtime` MUST be the first import for Fast Refresh on web
import '@expo/metro-runtime';

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Register FCM background handler at the top level.
// v26 of @react-native-firebase uses getMessaging() not messaging().
try {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    console.log('[FCM] Background message:', remoteMessage.data);
  });
} catch (_) {
  // Expo Go or web — safe to ignore
}

renderRootComponent(App);
