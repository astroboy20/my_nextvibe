import SplashScreenView from "@/components/SplashScreenView";
import { StripeDeepLinkHandler } from "@/components/stripe/StripeDeepLinkHandler";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAppReady } from "@/hooks/useAppReady";
import { useAuthRouting } from "@/hooks/useAuthRouting";
import checkForUpdate from "@/hooks/useCheckUpdates";
// import { useFcmSync } from "@/hooks/useFcmSync";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import { resetPaymentSheetCustomer, StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { Provider, useSelector } from "react-redux";

export const unstable_settings = { initialRouteName: "(auth)" };

SplashScreen.preventAutoHideAsync();

const SCREENS = [
  "(auth)",
  "(tabs)",
  "create",
  "edit-profile",
  "dashboard",
  "chat",
  "settings",
  "events/[id]",
  "edit-event",
  "analytics",
  "notifications",
  "appearance",
] as const;

function ThemedStack() {
  const scheme = useColorScheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: scheme === "dark" ? "#1E1E2E" : "#FFFFFF",
        },
      }}
      initialRouteName="(auth)"
    >
      {SCREENS.map((name) => (
        <Stack.Screen key={name} name={name} />
      ))}
      <Stack.Screen
        name="auth/login"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "none",
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "none",
        }}
      />
    </Stack>
  );
}

/**
 * Calls resetPaymentSheetCustomer() when the user logs out (isAuthenticated
 * transitions from true → false). This effect is registered before
 * useAuthRouting so it fires prior to the navigation reset to /(auth)/login.
 */
function useLogoutStripeCleanup(isAuthenticated: boolean) {
  const prevAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (prevAuthenticated.current && !isAuthenticated) {
      resetPaymentSheetCustomer();
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);
}

function App() {
  const { isAuthenticated, isBootstrapped } = useSelector(
    (s: RootState) => s.auth
  );

  // Must be called before useAuthRouting so the Stripe cleanup effect
  // executes before the navigation reset on logout.
  useLogoutStripeCleanup(isAuthenticated);

  const { oauthPending } = useAuthRouting();
  usePushRegistration(isAuthenticated, isBootstrapped);

  // useFcmSync(isAuthenticated);

  useEffect(() => {
    checkForUpdate();
  }, []);

  return (
    <>
      <ThemedStack />
      {oauthPending && (
        <View
          style={[styles.overlay, { backgroundColor: Colors.light.background }]}
        >
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      )}
      <Toast />
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <StripeProvider publishableKey="" urlScheme="mynextvibe" merchantIdentifier="merchant.com.nextvibe2026.nextvibe">
        <StripeDeepLinkHandler />
        <RootLayoutInner />
      </StripeProvider>
    </Provider>
  );
}

function RootLayoutInner() {
  const { fontsReady, splashDone, setSplashDone } = useAppReady();
  const isBootstrapped = useSelector((s: RootState) => s.auth.isBootstrapped);
  return splashDone ? (
    <App />
  ) : (
    <SplashScreenView
      fontsLoaded={fontsReady}
      isBootstrapped={isBootstrapped}
      onFinished={() => setSplashDone(true)}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
