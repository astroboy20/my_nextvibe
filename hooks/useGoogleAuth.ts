/**
 * useGoogleAuth
 *
 * Implements Google Sign-In via @react-native-google-signin/google-signin.
 * Requires a development build or production build — does NOT work in Expo Go.
 *
 * Setup (one-time):
 *   1. Create a project at https://console.cloud.google.com
 *   2. Enable the "Google Sign-In" API
 *   3. Create OAuth 2.0 credentials:
 *      - Web client ID       → set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env
 *      - Android client ID   → add SHA-1 fingerprint in Google Cloud Console
 *      - iOS client ID       → set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env
 *                              and update iosUrlScheme in app.json plugins
 *   4. Get SHA-1 for EAS builds:
 *        eas credentials  (select Android → Keystore → View)
 *   5. Run a new EAS build after updating credentials.
 *
 * Token flow per MOBILE-INTEGRATION.md §1:
 *   - webClientId is used so Google mints an ID token the backend can verify
 *   - offlineAccess: false — no server-side code exchange in this backend
 *   - The ID token is sent to POST /v1/auth/oauth/google to get NextVibe tokens
 *   - NextVibe tokens are stored in expo-secure-store (not AsyncStorage)
 */

import { authApi } from '@/store/api/authApi';
import { store } from '@/store/store';
import { useState } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

// @react-native-google-signin/google-signin is native-only; not available in Expo Go.
const isNative = Platform.OS !== 'web';

let GoogleSignin: any = null;
let isErrorWithCode: any = () => false;
let statusCodes: any = {};

if (isNative) {
  try {
    const pkg = require('@react-native-google-signin/google-signin');
    GoogleSignin    = pkg.GoogleSignin;
    isErrorWithCode = pkg.isErrorWithCode;
    statusCodes     = pkg.statusCodes;
  } catch {
    // Running in Expo Go — native module not available, Google Sign-In disabled
  }
}

// ── Client IDs from environment ───────────────────────────────────────────────
// Set these in your .env file:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com  (iOS only)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Configure once when the module loads (native only).
// Per the integration guide, webClientId is the Web client ID — this is what
// makes Google mint an ID token the backend can verify, rather than an
// Android/iOS-only token. offlineAccess must be false (no code exchange).
if (isNative && GoogleSignin) {
  GoogleSignin.configure({
    webClientId:   GOOGLE_WEB_CLIENT_ID,
    iosClientId:   GOOGLE_IOS_CLIENT_ID,   // required on iOS
    offlineAccess: false,
    scopes:        ['profile', 'email'],
  });
}

export interface GoogleUser {
  id:         string;
  email:      string;
  name:       string;
  givenName:  string;
  familyName: string;
  picture:    string | null;
}

interface UseGoogleAuthReturn {
  /** Trigger the Google sign-in flow */
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
  error:   string | null;
  /** Clear error state */
  reset:   () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function signInWithGoogle() {
    if (!isNative || !GoogleSignin) {
      setError('Google Sign-In is not available in Expo Go. Use a dev/production build.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        // User dismissed — not an error, just stop loading
        return;
      }

      if (response.type !== 'success') return;

      const idToken = response.data?.idToken;
      if (!idToken) {
        setError('Google did not return a token. Please try again.');
        return;
      }

      // Exchange Google ID token for NextVibe access + refresh tokens.
      // persistSession inside onQueryStarted stores them in SecureStore.
      try {
        const result = await store.dispatch(
          authApi.endpoints.googleLogin.initiate({ idToken }),
        ).unwrap();

        // isNewUser → route to onboarding (AuthGate handles /(tabs) redirect,
        // caller can check this flag if onboarding routing is needed)
        if ((result as any)?.data?.isNewUser) {
          // TODO: route to onboarding when that screen exists
        }
      } catch (err: any) {
        const status  = err?.status;
        const message = err?.data?.message ?? '';

        if (status === 401) {
          if (message.includes('not verified')) {
            setError('Your Google email is not verified. Please verify it with Google first.');
          } else if (message.includes('email')) {
            setError('Could not retrieve your email from Google. Please try again.');
          } else {
            // aud mismatch or expired token — surface a clear message
            setError('Google sign-in failed: invalid token. Try signing in again.');
          }
        } else if (status === 429) {
          setError('Too many sign-in attempts. Please wait a moment and try again.');
        } else {
          setError('Could not sign in with Google. Please try again.');
        }

        Toast.show({
          type:            'error',
          text1:           'Google Sign-In failed',
          text2:           error ?? 'Please try again.',
          visibilityTime:  3500,
        });
      }
    } catch (err: unknown) {
      if (isErrorWithCode(err)) {
        const code = (err as any).code;
        switch (code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break; // user cancelled — not an error
          case statusCodes.IN_PROGRESS:
            setError('Sign-in already in progress.');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services is not available on this device.');
            break;
          default:
            setError('Google sign-in failed. Please try again.');
        }
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setError(null);
  }

  return { signInWithGoogle, loading, error, reset };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function mapGoogleUser(data: any): GoogleUser {
  const u = data?.user ?? data;
  return {
    id:         u.id         ?? '',
    email:      u.email      ?? '',
    name:       u.name       ?? '',
    givenName:  u.givenName  ?? '',
    familyName: u.familyName ?? '',
    picture:    u.photo      ?? null,
  };
}
