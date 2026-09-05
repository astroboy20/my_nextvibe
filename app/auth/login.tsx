/**
 * app/auth/login.tsx — OAuth fallback callback (login flow)
 * Deep link: mynextvibe://auth/login?code=ABC123
 *
 * This screen only mounts when the app was backgrounded during OAuth
 * and openAuthSessionAsync didn't intercept the redirect directly.
 *
 * It exchanges the code via RTK. Navigation is handled entirely by AuthGate
 * in _layout.tsx reacting to Redux state — no router.replace() here.
 */

import Colors from "@/constants/Colors";
import { useExchangeOAuthCodeMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setOAuthPending } from "@/store/slices/authSlice";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function OAuthLoginCallback() {
  const { code, error } = useLocalSearchParams<{
    code?: string;
    error?: string;
  }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [exchangeCode] = useExchangeOAuthCodeMutation();
  const handled = useRef(false);
  const colors = Colors.light;

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handle() {
      if (error) {
        if (error !== "access_denied") {
          Toast.show({
            type: "error",
            text1: "Google Sign-In failed",
            text2: "Please try again.",
            visibilityTime: 3500,
          });
        }
        router.replace("/(auth)/login");
        return;
      }

      if (!code) {
        router.replace("/(auth)/login");
        return;
      }

      try {
        // onQueryStarted sets oauthPending=true, then sets user + oauthPending=false on success
        // AuthGate detects the state change and routes to /(tabs)
        await exchangeCode({ code }).unwrap();
        Toast.show({
          type: "success",
          text1: "Welcome back! 🎉",
          text2: "You're logged in",
          visibilityTime: 2500,
        });
      } catch (err: any) {
        dispatch(setOAuthPending(false));
        const status = err?.status ?? err?.originalStatus;
        const msg =
          status === 401
            ? "Sign-in link expired or already used. Please try again."
            : "Could not sign in with Google. Please try again.";
        Toast.show({
          type: "error",
          text1: "Google Sign-In failed",
          text2: msg,
          visibilityTime: 3500,
        });
        router.replace("/(auth)/login");
      }
    }

    handle();
  }, [code, error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Signing you in…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: { fontSize: 15, fontFamily: "NunitoSans_400Regular" },
});
