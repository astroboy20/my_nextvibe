'use strict';
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Only inject the Firebase mock when explicitly requested.
// For dev builds (real APK), never mock Firebase.
// To run in Expo Go: set FIREBASE_MOCK=1 before starting Metro.
// Normal usage: just run `npx expo start` — no mock, Firebase works natively.
if (process.env.FIREBASE_MOCK === '1') {
  console.log('[Metro] FIREBASE_MOCK=1 — Firebase replaced with no-op stub');
  const mock = path.resolve(__dirname, 'mocks/firebase-mock.js');
  config.resolver = config.resolver ?? {};
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@react-native-firebase/app': mock,
    '@react-native-firebase/messaging': mock,
  };
}

module.exports = config;
