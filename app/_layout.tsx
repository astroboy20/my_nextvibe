import SplashScreenView from "@/components/SplashScreenView";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAppReady } from "@/hooks/useAppReady";
import { useAuthRouting } from "@/hooks/useAuthRouting";
import { useFcmSync } from "@/hooks/useFcmSync";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { Provider, useSelector } from "react-redux";

export { ErrorBoundary } from "expo-router";
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

function App() {

  const { oauthPending } = useAuthRouting();
  const { isAuthenticated, isBootstrapped } = useSelector(
    (s: RootState) => s.auth
  );
  usePushRegistration(isAuthenticated, isBootstrapped);
  

  useFcmSync(isAuthenticated);

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
      <RootLayoutInner />
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
