/**
 * app/auth/login.tsx
 *
 * OAuth callback for the login flow.
 * Deep link: mynextvibe://auth/login?code=ABC123
 *
 * Exchanges the code for tokens then navigates to /(tabs).
 * Only mounts if openAuthSessionAsync didn't intercept the redirect
 * (e.g. app was fully backgrounded when the browser redirected).
 */

import Colors from "@/constants/Colors";
import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function OAuthLoginCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const router = useRouter();
  const [exchangeCode] = useExchangeOAuthCodeMutation();
  const handled = useRef(false);
  const colors = Colors.light;

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handle() {
      if (error) {
        if (error !== "access_denied") {
          Toast.show({ type: "error", text1: "Google Sign-In failed", text2: "Please try again.", visibilityTime: 3500 });
        }
        router.replace("/(auth)/login");
        return;
      }

      if (!code) {
        router.replace("/(auth)/login");
        return;
      }

      try {
        await exchangeCode({ code }).unwrap();
        Toast.show({ type: "success", text1: "Welcome back! 🎉", text2: "You're logged in", visibilityTime: 2500 });
        router.replace("/(tabs)");
      } catch (err: any) {
        const status = err?.status ?? err?.originalStatus;
        const msg = status === 401
          ? "Sign-in link expired or already used. Please try again."
          : "Could not sign in with Google. Please try again.";
        Toast.show({ type: "error", text1: "Google Sign-In failed", text2: msg, visibilityTime: 3500 });
        router.replace("/(auth)/login");
      }
    }

    handle();
  }, [code, error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text:      { fontSize: 15, fontFamily: "NunitoSans_400Regular" },
});
