/**
 * useGoogleAuth — Flow 1A (hosted redirect)
 *
 * Responsibilities:
 * 1. Open the system browser to start Google OAuth
 * 2. Parse the deep-link callback and extract the code
 * 3. Dispatch the RTK exchangeOAuthCode mutation
 *
 * Navigation is NOT handled here. The flow is:
 * - onQueryStarted in authApi sets oauthPending=true immediately
 * - On success it dispatches setUser/setNewUser (which sets oauthPending=false)
 * - AuthGate in _layout.tsx watches oauthPending + isAuthenticated + isNewUser
 *   and routes to the correct screen once the exchange completes
 * - On failure, oauthPending=false and the user stays on the auth screen
 *
 * This means there is no race between navigation and Redux state updates.
 */

import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setOAuthPending } from "@/store/slices/authSlice";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import Toast from "react-native-toast-message";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://nextvibe-nest-backend-1b4o.onrender.com";

const REDIRECTS: Record<"login" | "register", string> = {
  login:    "mynextvibe://auth/login",
  register: "mynextvibe://auth/register",
};

export function useGoogleAuth(source: "login" | "register" = "login") {
  const [browserLoading, setBrowserLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const [exchangeCode, { isLoading: isExchanging }] = useExchangeOAuthCodeMutation();

  // Combined loading: browser open OR exchange in flight
  const loading = browserLoading || isExchanging;

  async function signInWithGoogle() {
    setError(null);
    setBrowserLoading(true);

    try {
      const redirect = REDIRECTS[source];
      const startUrl = `${API_URL}/v1/auth/oauth/google/start?redirect=${encodeURIComponent(redirect)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect);
      setBrowserLoading(false);

      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type !== "success") return;

      // ── Parse the deep-link callback ──────────────────────────────────────
      const parsed = Linking.parse(result.url);
      const params = (parsed.queryParams ?? {}) as Record<string, string>;

      if (params.error) {
        if (params.error !== "access_denied") {
          const msg = params.error === "auth_failed"
            ? "Google sign-in failed. Please try again."
            : "Google sign-in was interrupted. Please try again.";
          setError(msg);
          Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
        }
        return;
      }

      if (!params.code) {
        setError("Google sign-in failed: no code returned.");
        return;
      }

      // Show spinner immediately — before the mutation fires
      // This prevents any flicker from AuthGate reacting to stale state
      dispatch(setOAuthPending(true));

      // Exchange code via RTK mutation
      await exchangeCode({ code: params.code }).unwrap();

      // Toast only — no router.replace() here, AuthGate handles navigation
      Toast.show({
        type: "success",
        text1: source === "register" ? "Account created! 🎉" : "Welcome back! 🎉",
        text2: source === "register" ? "Welcome to NextVibe" : "You're logged in",
        visibilityTime: 2500,
      });

    } catch (err: any) {
      // exchangeCode threw — oauthPending already cleared in onQueryStarted catch
      dispatch(setOAuthPending(false));
      const status  = err?.status ?? err?.originalStatus;
      const message = err?.data?.message ?? "";

      let msg = "Could not sign in with Google. Please try again.";
      if (status === 401) msg = "Sign-in link expired or already used. Please try again.";
      if (status === 429) msg = "Too many attempts. Please wait a moment.";
      if (message.includes("not allowed")) msg = "Redirect not configured. Contact support.";

      setError(msg);
      Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
    }
  }

  return { signInWithGoogle, loading, error };
}
