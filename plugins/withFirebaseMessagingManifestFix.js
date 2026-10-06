/**
 * Config plugin to fix manifest merger conflicts between expo-notifications and
 * @react-native-firebase/messaging. Both libraries inject the same meta-data keys;
 * this plugin adds tools:replace so our values win during the merge.
 *
 * Affected keys:
 *   - com.google.firebase.messaging.default_notification_channel_id
 *   - com.google.firebase.messaging.default_notification_color
 */
const { withAndroidManifest } = require('expo/config-plugins');

const FCM_CHANNEL_ID_KEY = 'com.google.firebase.messaging.default_notification_channel_id';
const FCM_COLOR_KEY = 'com.google.firebase.messaging.default_notification_color';

const withFirebaseMessagingManifestFix = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    const metaDataItems = mainApplication['meta-data'] ?? [];

    for (const item of metaDataItems) {
      const name = item.$?.['android:name'];

      if (name === FCM_CHANNEL_ID_KEY) {
        // Ensure tools namespace is declared on manifest root (expo usually adds it)
        item.$['tools:replace'] = 'android:value';
      }

      if (name === FCM_COLOR_KEY) {
        item.$['tools:replace'] = 'android:resource';
      }
    }

    // Ensure xmlns:tools is on the manifest root
    const manifestRoot = config.modResults.manifest;
    if (!manifestRoot.$?.['xmlns:tools']) {
      manifestRoot.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};

module.exports = withFirebaseMessagingManifestFix;
