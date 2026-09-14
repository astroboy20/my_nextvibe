import { store } from "@/store/store";
import { bootstrapAuth } from "@/store/slices/authSlice";
import { bootstrapTheme } from "@/store/slices/themeSlice";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

/** Loads fonts, kicks off auth/theme bootstrap, and tracks when the splash screen can hide. */
export function useAppReady() {
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular: require("../assets/fonts/NunitoSans_400Regular.ttf"),
    NunitoSans_400Regular_Italic: require("../assets/fonts/NunitoSans_400Regular_Italic.ttf"),
    NunitoSans_500Medium: require("../assets/fonts/NunitoSans_500Medium.ttf"),
    NunitoSans_600SemiBold: require("../assets/fonts/NunitoSans_600SemiBold.ttf"),
    NunitoSans_700Bold: require("../assets/fonts/NunitoSans_700Bold.ttf"),
    NunitoSans_800ExtraBold: require("../assets/fonts/NunitoSans_800ExtraBold.ttf"),
  });
  const [splashDone, setSplashDone] = useState(false);
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && !bootstrapStarted.current) {
      bootstrapStarted.current = true;
      store.dispatch(bootstrapAuth());
      store.dispatch(bootstrapTheme() as any);
    }
  }, [fontsLoaded]);

  return {
    fontsReady: fontsLoaded || !!fontError,
    splashDone,
    setSplashDone,
  };
}