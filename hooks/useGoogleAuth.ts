/**
 * useGoogleAuth — Flow 1A (hosted redirect)
 *
 * Per MOBILE-INTEGRATION.md §1A:
 *   1. Opens GET /v1/auth/oauth/google/start?redirect=nextvibe://auth
 *      in a system browser via expo-web-browser (NOT Linking.openURL)
 *   2. Server handles Google OAuth, redirects back to nextvibe://auth?code=<one-time-code>
 *   3. App exchanges the code at POST /v1/auth/oauth/exchange
 *   4. Tokens + user are persisted; Redux is updated; AuthGate routes accordingly
 *
 * The deep-link code is single-use and expires in 120s — never retry the exchange.
 * Parse callbacks with Linking.parse, not new URL() (RN URL polyfill is broken).
 */

import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import Toast from "react-native-toast-message";

const API_URL  = process.env.EXPO_PUBLIC_API_URL ?? "https://nextvibe-nest-backend-1b4o.onrender.com";
const REDIRECT = "nextvibe://auth";   // must be on server's OAUTH_APP_REDIRECT_ALLOWLIST exactly

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [exchangeCode] = useExchangeOAuthCodeMutation();

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);

    try {
      // ── Step 1: open system browser → Google consent screen ──────────────
      const startUrl = `${API_URL}/v1/auth/oauth/google/start?redirect=${encodeURIComponent(REDIRECT)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, REDIRECT);

      // User tapped "Done" / dismissed — not an error
      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type !== "success") return;

      // ── Step 2: parse the deep-link callback ──────────────────────────────
      // Use Linking.parse — RN's URL polyfill doesn't implement searchParams
      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams as Record<string, string> ?? {};

      // Handle error params delivered on the deep link
      if (params.error) {
        if (params.error === "access_denied") return; // user backed out — no UI
        const msg =
          params.error === "auth_failed"
            ? "Google sign-in failed. Please try again."
            : "Google sign-in was interrupted. Please try again.";
        setError(msg);
        Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
        return;
      }

      const code = params.code;
      if (!code) {
        setError("Google sign-in failed: no code returned.");
        return;
      }

      // ── Step 3: exchange one-time code for NextVibe tokens ────────────────
      // Single-use, 120s TTL — never retry this call
      await exchangeCode({ code }).unwrap();
      // onQueryStarted in authApi persists tokens + dispatches setUser/setNewUser
      // AuthGate reacts to Redux state and routes to /(tabs) or /(auth)/onboarding

    } catch (err: any) {
      const status  = err?.status ?? err?.originalStatus;
      const message = err?.data?.message ?? "";

      let msg = "Could not sign in with Google. Please try again.";
      if (status === 401) msg = "Google sign-in expired or was already used. Please try again.";
      if (status === 429) msg = "Too many attempts. Please wait a moment and try again.";
      if (message.includes("not allowed")) msg = "Redirect not configured. Contact support.";

      setError(msg);
      Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
    } finally {
      setLoading(false);
    }
  }

  return { signInWithGoogle, loading, error };
}
