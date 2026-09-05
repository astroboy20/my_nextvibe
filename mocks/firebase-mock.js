'use strict';
/**
 * No-op stub for @react-native-firebase/messaging (v26 modular API).
 * Matches the named export shape: getMessaging, getToken, onMessage, etc.
 */
const noop = () => {};
const noopAsync = async () => {};
const noopUnsub = () => () => {};

const messagingInstance = {};

module.exports = {
  getMessaging:                   () => messagingInstance,
  getToken:                       noopAsync,
  deleteToken:                    noopAsync,
  onMessage:                      noopUnsub,
  onNotificationOpenedApp:        noopUnsub,
  onTokenRefresh:                 noopUnsub,
  getInitialNotification:         noopAsync,
  requestPermission:              async () => 1,
  setBackgroundMessageHandler:    noop,
  isDeviceRegisteredForRemoteMessages: noopAsync,
  registerDeviceForRemoteMessages: noopAsync,
  isSupported:                    async () => false,
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, NOT_DETERMINED: -1, DENIED: 0 },
};
