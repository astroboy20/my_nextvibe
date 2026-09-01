/**
 * NextVibe — Splash Screen
 *
 * Two modes:
 *
 *  1. RETURNING USER (hasSeenIntro = true)
 *     Clean, simple: large logo + tagline fade/scale in on white background.
 *     Three-dot pulse at bottom. No glow, no distractions.
 *     Holds for MIN_HOLD_MS after fonts are ready, then fades out.
 *
 *  2. NEW USER (hasSeenIntro = false — first launch ever)
 *     4-slide feature walkthrough. User taps "Next" / "Get Started" to advance
 *     or "Skip" to jump straight through. NO auto-advance.
 *     After slide 4 (or Skip), marks intro as seen then fades out.
 *
 * First-launch flag stored in AsyncStorage: "nextvibe_has_seen_intro"
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize, letterSpacing } from "@/constants/Typography";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get("window");

// Returning-user splash: big logo — 70% of screen width, capped at 300
const LOGO_WIDTH = Math.min(width * 0.7, 300);

const STORAGE_KEY = "nextvibe_has_seen_intro";
const MIN_HOLD_MS = 3500; // minimum visible time for returning-user splash (long enough to read tagline)
const FADE_OUT_MS = 600; // exit fade duration (both modes)
const MAX_WAIT_MS = 12000; // absolute fallback — never block forever

// ─────────────────────────────────────────────────────────────────────────────
// Slide definitions  (no accentColor — button/bar are always brand purple)
// ─────────────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    overline: "Welcome to NextVibe",
    headline: "Your vibe.\nYour events.",
    body: "The platform built for people who live for experiences — discover, create, and own every moment.",
  },
  {
    overline: "Discover",
    headline: "Find events\nthat move you.",
    body: "Browse curated events near you, filtered by your interests and location. Never miss what matters.",
  },
  {
    overline: "Create & Connect",
    headline: "Make memories\nthat last.",
    body: "Capture Postcards stamped with event VibeTag watermarks. Chat with attendees in VibePod. Build your tribe.",
  },
  {
    overline: "Play & Win",
    headline: "Every event\nis a game.",
    body: "Trivia, Word Puzzles, 2 Truths 1 Lie — compete on leaderboards and relive it all in your Monthly Dump.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  fontsLoaded: boolean;
  onFinished: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — decides which mode to render
// ─────────────────────────────────────────────────────────────────────────────

export default function SplashScreenView({ fontsLoaded, onFinished }: Props) {
  const [mode, setMode] = useState<"checking" | "intro" | "returning">(
    "checking"
  );
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        setMode(val === "true" ? "returning" : "intro");
        // Hide native splash immediately once mode is determined
        SplashScreen.hideAsync().catch(() => {});
      })
      .catch(() => {
        setMode("returning");
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  // While checking storage, keep native splash visible (don't render anything)
  if (mode === "checking") {
    return null;
  }

  if (mode === "intro") {
    return (
      <IntroSplash
        fontsLoaded={fontsLoaded}
        onFinished={() => {
          AsyncStorage.setItem(STORAGE_KEY, "true").catch(() => {});
          onFinishedRef.current();
        }}
      />
    );
  }

  return (
    <ReturningUserSplash
      fontsLoaded={fontsLoaded}
      onFinished={() => onFinishedRef.current()}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Returning user splash — clean and simple
// ─────────────────────────────────────────────────────────────────────────────

function ReturningUserSplash({ fontsLoaded, onFinished }: Props) {
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const exitStarted = useRef(false);

  // ── Animated values ────────────────────────────────────────────────────────
  const screenOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(1);   // start fully visible — NO fade-in
  const logoScale = useSharedValue(0.94);
  const tagOpacity = useSharedValue(1);    // tagline also starts fully visible
  const tagTransY = useSharedValue(8);
  const dot1 = useSharedValue(0.25);
  const dot2 = useSharedValue(0.25);
  const dot3 = useSharedValue(0.25);

  // ── Entrance animations ────────────────────────────────────────────────────
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    // Logo: just a subtle scale-up (already fully opaque)
    logoScale.value = withTiming(1, { duration: 550, easing: ease });

    // Tagline: subtle slide-up (already fully opaque)
    tagTransY.value = withTiming(0, { duration: 450, easing: ease });

    // Dots — staggered pulse
    const pulse = withRepeat(
      withSequence(
        withTiming(1, { duration: 440 }),
        withTiming(0.25, { duration: 440 })
      ),
      -1,
      false
    );
    dot1.value = withDelay(700, pulse);
    dot2.value = withDelay(700 + 180, pulse);
    dot3.value = withDelay(700 + 360, pulse);
  }, []);

  // ── Exit — wait for fonts then hold, then fade out ─────────────────────────
  useEffect(() => {
    function startExit() {
      if (exitStarted.current) return;
      exitStarted.current = true;
      screenOpacity.value = withTiming(0, { duration: FADE_OUT_MS });
      setTimeout(() => onFinishedRef.current(), FADE_OUT_MS + 50);
    }

    const fallback = setTimeout(startExit, MAX_WAIT_MS);

    if (fontsLoaded) {
      clearTimeout(fallback);
      const hold = setTimeout(startExit, MIN_HOLD_MS);
      return () => {
        clearTimeout(hold);
        clearTimeout(fallback);
      };
    }

    return () => clearTimeout(fallback);
  }, [fontsLoaded]);

  // ── Animated styles ────────────────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagTransY.value }],
  }));
  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Big logo — clean, no glow */}
      <Animated.View style={logoStyle}>
        <Image
          source={require("../assets/images/logos/new/logo_black_text.png")}
          style={styles.returningLogo}
          resizeMode="contain"
          accessibilityLabel="NextVibe"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.tagWrap, tagStyle]}>
        <Text style={styles.tagline}>your vibe, your events</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        <Animated.View
          style={[styles.dot, d1Style, { backgroundColor: brand.primary }]}
        />
        <Animated.View
          style={[styles.dot, d2Style, { backgroundColor: brand.secondary }]}
        />
        <Animated.View
          style={[styles.dot, d3Style, { backgroundColor: brand.primary }]}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New-user intro splash (4 slides, manual navigation only)
// ─────────────────────────────────────────────────────────────────────────────

function IntroSplash({ onFinished }: Props) {
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [exiting, setExiting] = useState(false);

  // ── Animated values ────────────────────────────────────────────────────────
  const screenOpacity = useSharedValue(1);
  const slideOpacity = useSharedValue(0);
  const overlineTransY = useSharedValue(-10);
  const headlineTransY = useSharedValue(20);
  const bodyTransY = useSharedValue(26);
  const barWidth = useSharedValue(0);

  // ── Animation helpers ──────────────────────────────────────────────────────
  const animateIn = () => {
    const ease = Easing.out(Easing.cubic);
    slideOpacity.value = withTiming(1, { duration: 400, easing: ease });
    overlineTransY.value = withTiming(0, { duration: 360, easing: ease });
    headlineTransY.value = withTiming(0, { duration: 460, easing: ease });
    bodyTransY.value = withTiming(0, { duration: 520, easing: ease });
    barWidth.value = withDelay(
      180,
      withTiming(36, { duration: 340, easing: Easing.out(Easing.quad) })
    );
  };

  const animateOut = (cb: () => void) => {
    const ease = Easing.in(Easing.quad);
    slideOpacity.value = withTiming(0, { duration: 240, easing: ease });
    overlineTransY.value = withTiming(-6, { duration: 220, easing: ease });
    headlineTransY.value = withTiming(-12, { duration: 240, easing: ease });
    bodyTransY.value = withTiming(-8, { duration: 220, easing: ease });
    barWidth.value = withTiming(0, { duration: 180, easing: ease });
    setTimeout(cb, 260);
  };

  const resetValues = () => {
    slideOpacity.value = 0;
    overlineTransY.value = -10;
    headlineTransY.value = 20;
    bodyTransY.value = 26;
    barWidth.value = 0;
  };

  useEffect(() => {
    animateIn();
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToNext = () => {
    if (exiting) return;
    const next = currentSlide + 1;
    if (next >= SLIDES.length) {
      doFinish();
      return;
    }
    animateOut(() => {
      resetValues();
      setCurrentSlide(next);
      animateIn();
    });
  };

  const doFinish = () => {
    if (exiting) return;
    setExiting(true);
    animateOut(() => {
      screenOpacity.value = withTiming(0, { duration: FADE_OUT_MS });
      setTimeout(() => onFinishedRef.current(), FADE_OUT_MS + 50);
    });
  };

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  // ── Animated styles ────────────────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));
  const slideStyle = useAnimatedStyle(() => ({ opacity: slideOpacity.value }));
  const overlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: overlineTransY.value }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateY: headlineTransY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateY: bodyTransY.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Skip — top right */}
      {!exiting && (
        <Pressable
          style={styles.skipButton}
          onPress={doFinish}
          accessibilityLabel="Skip intro"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Small logo — top left */}
      <View style={styles.introLogoWrap}>
        <Image
          source={require("../assets/images/logos/new/logo_black_text.png")}
          style={styles.introLogo}
          resizeMode="contain"
          accessibilityLabel="NextVibe"
        />
      </View>

      {/* Slide text content */}
      <View style={styles.slideContent}>
        {/* Overline + accent bar */}
        <Animated.View style={[styles.overlineRow, slideStyle, overlineStyle]}>
          <Animated.View style={[styles.accentBar, barStyle]} />
          <Text style={styles.overlineText}>
            {slide.overline.toUpperCase()}
          </Text>
        </Animated.View>

        {/* Headline */}
        <Animated.Text style={[styles.headline, headlineStyle]}>
          {slide.headline}
        </Animated.Text>

        {/* Body */}
        <Animated.Text style={[styles.slideBody, bodyStyle]}>
          {slide.body}
        </Animated.Text>
      </View>

      {/* Footer: progress dots + button */}
      <View style={styles.introFooter}>
        <View style={styles.progressDots}>
          {SLIDES.map((_, i) => (
            <ProgressDot key={i} active={i === currentSlide} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={goToNext}
          accessibilityLabel={isLast ? "Get started" : "Next slide"}
          accessibilityRole="button"
        >
          <Text style={styles.nextButtonText}>
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress dot (pill expands when active) — always brand purple
// ─────────────────────────────────────────────────────────────────────────────

function ProgressDot({ active }: { active: boolean }) {
  const widthAnim = useSharedValue(active ? 22 : 7);
  const opacityAnim = useSharedValue(active ? 1 : 0.28);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    widthAnim.value = withTiming(active ? 22 : 7, {
      duration: 280,
      easing: ease,
    });
    opacityAnim.value = withTiming(active ? 1 : 0.28, {
      duration: 280,
      easing: ease,
    });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: widthAnim.value,
    opacity: opacityAnim.value,
  }));

  return (
    <Animated.View
      style={[styles.progressDot, style, { backgroundColor: brand.primary }]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Returning user ────────────────────────────────────────────────────────
  returningLogo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * 0.44,
  },
  tagWrap: {
    marginTop: 18,
    alignItems: "center",
  },
  tagline: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: neutral[400],
    letterSpacing: letterSpacing.widest,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "absolute",
    bottom: 72,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── Intro splash ──────────────────────────────────────────────────────────
  skipButton: {
    position: "absolute",
    top: 60,
    right: 28,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: neutral[400],
    letterSpacing: letterSpacing.wide,
  },
  introLogoWrap: {
    position: "absolute",
    top: 56,
    left: 28,
  },
  introLogo: {
    width: Math.min(width * 0.34, 136),
    height: Math.min(width * 0.34, 136) * 0.44,
  },
  slideContent: {
    width: "100%",
    paddingHorizontal: 32,
    marginTop: -32,
  },
  overlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  accentBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: brand.primary,
  },
  overlineText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: brand.primary,
    letterSpacing: letterSpacing.widest,
  },
  headline: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize["3xl"],
    color: neutral[800],
    lineHeight: fontSize["3xl"] * 1.16,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  slideBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: neutral[500],
    lineHeight: fontSize.base * 1.65,
    maxWidth: 340,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  introFooter: {
    position: "absolute",
    bottom: 52,
    width: "100%",
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressDot: {
    height: 7,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: brand.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  nextButtonPressed: {
    opacity: 0.8,
  },
  nextButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#FFFFFF",
    letterSpacing: letterSpacing.wide,
  },
});
