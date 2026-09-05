'use strict';
/**
 * withFirebaseMessagingManifest.js
 *
 * Expo config plugin that adds tools:replace to the Firebase Messaging
 * meta-data entries in AndroidManifest.xml.
 *
 * This is needed because:
 * - expo-notifications writes default_notification_channel_id and
 *   default_notification_color into the manifest
 * - @react-native-firebase/messaging also declares those same tags
 * - The Android manifest merger fails when both are present without tools:replace
 *
 * By doing this in a config plugin, the fix survives `expo prebuild --clean`.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withFirebaseMessagingManifest = (config) => {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return mod;

    const metaData = app['meta-data'] ?? [];

    // Ensure the tools namespace is declared on the manifest root
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Helper: find or create a meta-data entry and add tools:replace
    function upsertMetaData(name, attrs) {
      const existing = metaData.find((m) => m.$?.['android:name'] === name);
      if (existing) {
        Object.assign(existing.$, attrs);
      } else {
        metaData.push({ $: { 'android:name': name, ...attrs } });
      }
    }

    upsertMetaData('com.google.firebase.messaging.default_notification_channel_id', {
      'android:value': 'default',
      'tools:replace': 'android:value',
    });

    upsertMetaData('com.google.firebase.messaging.default_notification_color', {
      'android:resource': '@color/notification_icon_color',
      'tools:replace': 'android:resource',
    });

    app['meta-data'] = metaData;
    return mod;
  });
};

module.exports = withFirebaseMessagingManifest;
