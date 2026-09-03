/**
 * index.js — App entry point
 *
 * The FCM background message handler MUST be registered at the top level of
 * the entry file, before the root component mounts. If it's registered inside
 * a React component, the OS won't find it when it wakes the app to deliver a
 * push in the background/quit state and the handler will never fire.
 *
 * We override package.json "main" (was "expo-router/entry") and replicate
 * what expo-router/entry-classic does, then add our top-level FCM handler.
 */

// `@expo/metro-runtime` MUST be the first import for Fast Refresh on web
import '@expo/metro-runtime';

import messaging from '@react-native-firebase/messaging';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// ── Background / quit-state FCM handler ──────────────────────────────────────
// The OS already displayed the tray notification. Use this only for background
// work — e.g. updating a badge or prefetching the deep-link target.
// data shape: { notificationId, type, targetType, targetId }
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message:', remoteMessage.data);
});

// Hand off to expo-router as usual
renderRootComponent(App);
