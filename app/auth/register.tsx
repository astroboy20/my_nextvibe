/**
 * app/auth/register.tsx
 *
 * OAuth callback for the register flow.
 * Deep link: mynextvibe://auth/register?code=ABC123
 *
 * Exchanges the code for tokens then navigates to the vibes onboarding screen.
 * Only mounts if openAuthSessionAsync didn't intercept the redirect
 * (e.g. app was fully backgrounded when the browser redirected).
 */

import Colors from "@/constants/Colors";
import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function OAuthRegisterCallback() {
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
          Toast.show({ type: "error", text1: "Google Sign-Up failed", text2: "Please try again.", visibilityTime: 3500 });
        }
        router.replace("/(auth)/register");
        return;
      }

      if (!code) {
        router.replace("/(auth)/register");
        return;
      }

      try {
        await exchangeCode({ code }).unwrap();
        Toast.show({ type: "success", text1: "Account created! 🎉", text2: "Welcome to NextVibe", visibilityTime: 2500 });
        router.replace("/(auth)/onboarding/vibes" as any);
      } catch (err: any) {
        const status = err?.status ?? err?.originalStatus;
        const msg = status === 401
          ? "Sign-up link expired or already used. Please try again."
          : "Could not sign up with Google. Please try again.";
        Toast.show({ type: "error", text1: "Google Sign-Up failed", text2: msg, visibilityTime: 3500 });
        router.replace("/(auth)/register");
      }
    }

    handle();
  }, [code, error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Creating your account…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text:      { fontSize: 15, fontFamily: "NunitoSans_400Regular" },
});
