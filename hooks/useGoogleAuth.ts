/**
 * useGoogleAuth — Flow 1A (hosted redirect)
 *
 * source = "login"    → on success, navigate to /(tabs)
 * source = "register" → on success, navigate to /(auth)/onboarding/vibes
 *
 * The deep-link code is single-use and expires in 120s — never retry the exchange.
 * Parse callbacks with Linking.parse, not new URL() (RN URL polyfill is broken).
 */

import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import Toast from "react-native-toast-message";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://nextvibe-nest-backend-1b4o.onrender.com";

// Each flow has its own redirect URI so the server can route callbacks correctly
const REDIRECTS: Record<"login" | "register", string> = {
  login:    "mynextvibe://auth/login",
  register: "mynextvibe://auth/register",
};

export function useGoogleAuth(source: "login" | "register" = "login") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [exchangeCode] = useExchangeOAuthCodeMutation();

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);

    try {
      // ── Step 1: open system browser → Google consent screen ──────────────
      const redirect = REDIRECTS[source];
      const startUrl = `${API_URL}/v1/auth/oauth/google/start?redirect=${encodeURIComponent(redirect)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect);

      if (result.type === "cancel" || result.type === "dismiss") {
        setLoading(false);
        return;
      }
      if (result.type !== "success") {
        setLoading(false);
        return;
      }

      // ── Step 2: parse the deep-link callback ──────────────────────────────
      // Use Linking.parse — RN's URL polyfill doesn't implement searchParams
      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams as Record<string, string> ?? {};

      if (params.error) {
        if (params.error === "access_denied") {
          setLoading(false);
          return;
        }
        const msg =
          params.error === "auth_failed"
            ? "Google sign-in failed. Please try again."
            : "Google sign-in was interrupted. Please try again.";
        setError(msg);
        Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
        setLoading(false);
        return;
      }

      const code = params.code;
      if (!code) {
        setError("Google sign-in failed: no code returned.");
        setLoading(false);
        return;
      }

      // ── Step 3: exchange one-time code for NextVibe tokens ────────────────
      // Single-use, 120s TTL — never retry this call
      await exchangeCode({ code }).unwrap();

      // ── Step 4: route based on which screen triggered this ────────────────
      if (source === "register") {
        Toast.show({ type: "success", text1: "Account created! 🎉", text2: "Welcome to NextVibe", visibilityTime: 2500 });
        router.replace("/(auth)/onboarding/vibes" as any);
      } else {
        Toast.show({ type: "success", text1: "Welcome back! 🎉", text2: "You're logged in", visibilityTime: 2500 });
        router.replace("/(tabs)");
      }

    } catch (err: any) {
      const status = err?.status ?? err?.originalStatus;
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
