'use strict';
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Firebase mock for Expo Go only.
 *
 * Real Firebase (native modules) only works in a custom dev/preview/production
 * build — not in Expo Go. The mock is injected when APP_ENV is not set,
 * which is the case when running plain `expo start` without a dev build.
 *
 * When using the dev client (installed via `eas build --profile development`),
 * always run: cross-env APP_ENV=development expo start
 * so APP_ENV is set and the real Firebase modules are used.
 */
const appEnv = process.env.APP_ENV ?? '';
const isExpoGo = appEnv === '';

if (isExpoGo) {
  console.log('\n⚠️  [Metro] No APP_ENV set — Firebase mock active (Expo Go mode).');
  console.log('   Run `npm start` to use your dev client with real Firebase.\n');
  const mock = path.resolve(__dirname, 'mocks/firebase-mock.js');
  config.resolver = config.resolver ?? {};
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@react-native-firebase/app':       mock,
    '@react-native-firebase/messaging': mock,
  };
}

module.exports = config;
