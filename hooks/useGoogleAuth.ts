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
 *      - Web client ID  → paste as webClientId below (required for idToken)
 *      - Android client ID → add your SHA-1 fingerprint in Google Cloud / Firebase
 *      - iOS client ID  → replace com.googleusercontent.apps.YOUR_IOS_CLIENT_ID in app.json
 *   4. Get SHA-1 for EAS builds:
 *        eas credentials  (then select Android → Keystore → View)
 *   5. Run a new EAS build after updating credentials.
 *
 * Requirement 1 §1: Google OAuth supported on Android and iOS.
 * Requirement 1 §3: OAuth handshake completes and returns JWT.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// @react-native-google-signin/google-signin is native-only and requires a
// dev/production build — it is NOT available in Expo Go.
// We guard with try/catch so missing native modules don't crash the app.
const isNative = Platform.OS !== 'web';

let GoogleSignin: any = null;
let isErrorWithCode: any = () => false;
let statusCodes: any = {};

if (isNative) {
  try {
    const pkg = require('@react-native-google-signin/google-signin');
    GoogleSignin      = pkg.GoogleSignin;
    isErrorWithCode   = pkg.isErrorWithCode;
    statusCodes       = pkg.statusCodes;
  } catch {
    // Running in Expo Go — native module not available, Google Sign-In disabled
  }
}

// ── Replace with your Google Cloud Console Web Client ID ─────────────────────
const GOOGLE_WEB_CLIENT_ID = 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

// Configure once when the module loads (native only)
if (isNative && GoogleSignin) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: ['profile', 'email'],
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
  loading:  boolean;
  user:     GoogleUser | null;
  error:    string | null;
  /** Sign out and clear state */
  signOut:  () => Promise<void>;
  /** Clear error state */
  reset:    () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [user,    setUser]    = useState<GoogleUser | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // Check if a previous session exists on mount
  useEffect(() => {
    if (!isNative || !GoogleSignin) return;
    (async () => {
      try {
        const isSignedIn = await GoogleSignin.hasPreviousSignIn();
        if (isSignedIn) {
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            setUser(mapUser(currentUser.data));
          }
        }
      } catch {
        // Silently ignore — user will just sign in manually
      }
    })();
  }, []);

  async function signInWithGoogle() {
    if (!isNative || !GoogleSignin) return;
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'success') {
        setUser(mapUser(response.data));
        // TODO: send response.data.idToken to your Auth_Service
        // to create/verify a NextVibe JWT — Requirement 1 §3
      } else if (response.type === 'cancelled') {
        // User dismissed the sign-in dialog — not an error
      }
    } catch (err: unknown) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled — no error message needed
            break;
          case statusCodes.IN_PROGRESS:
            setError('Sign-in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services not available');
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

  async function signOut() {
    if (!isNative || !GoogleSignin) return;
    try {
      await GoogleSignin.signOut();
      setUser(null);
    } catch {
      // Ignore sign-out errors
    }
  }

  function reset() {
    setUser(null);
    setError(null);
  }

  return { signInWithGoogle, loading, user, error, signOut, reset };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapUser(data: any): GoogleUser {
  const u = data?.user ?? data;
  return {
    id:         u.id    ?? '',
    email:      u.email ?? '',
    name:       u.name  ?? '',
    givenName:  u.givenName  ?? '',
    familyName: u.familyName ?? '',
    picture:    u.photo      ?? null,
  };
}
