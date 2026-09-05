/**
 * index.js — App entry point
 *
 * The FCM background message handler MUST be at the top level, before the
 * root component mounts, so the OS can find it when waking the app for a
 * background/quit-state push.
 *
 * In Expo Go, @react-native-firebase/messaging is swapped for a no-op mock
 * by metro.config.js, so this file is safe in all environments.
 */

// `@expo/metro-runtime` MUST be the first import for Fast Refresh on web
import '@expo/metro-runtime';

import messaging from '@react-native-firebase/messaging';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// ── Background / quit-state FCM handler ──────────────────────────────────────
// The OS already displayed the tray notification when the app is backgrounded/quit.
// Use this only for silent background work (badge updates, prefetching).
// In Expo Go this is a no-op because metro.config.js injects the mock.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message:', remoteMessage.data);
});

renderRootComponent(App);
