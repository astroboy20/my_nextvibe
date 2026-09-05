'use strict';
/**
 * firebase-mock.js
 *
 * No-op stub for @react-native-firebase/* when running in Expo Go.
 * All methods are safe no-ops — Firebase features simply don't work in Expo Go,
 * but the app won't crash.
 */
const noop = () => {};
const noopAsync = async () => {};
const noopUnsubscribe = () => noop;

const messagingStub = {
  setBackgroundMessageHandler: noop,
  onMessage: noopUnsubscribe,
  onNotificationOpenedApp: noopUnsubscribe,
  getInitialNotification: noopAsync,
  requestPermission: async () => 1,
  getToken: async () => null,
  onTokenRefresh: noopUnsubscribe,
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, NOT_DETERMINED: -1, DENIED: 0 },
};

const appStub = {
  messaging: () => messagingStub,
};

module.exports = () => messagingStub;
module.exports.default = () => messagingStub;
module.exports.messaging = () => messagingStub;
