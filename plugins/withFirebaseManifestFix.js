const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Make sure the tools namespace is declared
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = manifest.application[0];
    app['meta-data'] = app['meta-data'] || [];

    const upsert = (name, attrs) => {
      let item = app['meta-data'].find((m) => m.$['android:name'] === name);
      if (!item) {
        item = { $: { 'android:name': name } };
        app['meta-data'].push(item);
      }
      item.$ = { 'android:name': name, ...attrs };
    };

    upsert('com.google.firebase.messaging.default_notification_channel_id', {
      'android:value': 'default',
      'tools:replace': 'android:value',
    });

    upsert('com.google.firebase.messaging.default_notification_color', {
      'android:resource': '@color/notification_icon_color',
      'tools:replace': 'android:resource',
    });

    return config;
  });
};