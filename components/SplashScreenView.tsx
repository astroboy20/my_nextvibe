/**
 * NextVibe — Animated Splash Screen
 *
 * Background: white (#FFFFFF), matching app.json native splash.
 * Logo: black-text variant (readable on white).
 *
 * Animation sequence:
 *   0ms   — screen visible (white bg, nothing)
 *   0ms   — logo starts: scale 0.7→1.0 + fade 0→1 (600ms, ease-out spring feel)
 *   350ms — tagline starts: translateY 16→0 + fade 0→1 (500ms)
 *   [fontsLoaded + MIN_HOLD] — whole screen fades out (450ms) → onFinished()
 */

import { brand } from '@/constants/Colors';
import { textStyles } from '@/constants/Typography';
import { useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
const { width, height } = Dimensions.get('window');
const LOGO_WIDTH = Math.min(width * 0.58, 240);

const MIN_HOLD_MS  = 800;   // time logo is fully visible before exit starts
const FADE_OUT_MS  = 450;   // screen exit fade duration
const MAX_WAIT_MS  = 5000;  // absolute fallback — never stay stuck longer than this

interface Props {
  fontsLoaded: boolean;
  onFinished: () => void;
}

export default function SplashScreenView({ fontsLoaded, onFinished }: Props) {
  // Stable ref so callbacks never close over a stale onFinished
  const onFinishedRef = useRef(onFinished);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  // ── Screen exit opacity ──────────────────────────────────────────────────
  const screenOpacity = useSharedValue(1);

  // ── Logo entrance ────────────────────────────────────────────────────────
  const logoOpacity = useSharedValue(0);
  const logoScale   = useSharedValue(0.72);

  // ── Tagline entrance ─────────────────────────────────────────────────────
  const tagOpacity    = useSharedValue(0);
  const tagTranslateY = useSharedValue(16);

  // ── Dot pulse (three dots beneath tagline) ───────────────────────────────
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  // Kick off entrance animations immediately on mount
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    // Logo: scale up + fade in
    logoOpacity.value = withTiming(1, { duration: 600, easing: ease });
    logoScale.value   = withTiming(1, { duration: 600, easing: ease });

    // Tagline: slide up + fade in (offset 350ms)
    tagOpacity.value    = withDelay(350, withTiming(1, { duration: 500, easing: ease }));
    tagTranslateY.value = withDelay(350, withTiming(0, { duration: 500, easing: ease }));

    // Dot pulse loop — staggered repeating
    const pulseAnim = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1, // infinite
      false,
    );
    dot1.value = withDelay(700,       pulseAnim);
    dot2.value = withDelay(700 + 200, pulseAnim);
    dot3.value = withDelay(700 + 400, pulseAnim);
  }, []);

  // Exit: wait for fonts (or fallback), hold, then fade out
  useEffect(() => {
    function startExit() {
      screenOpacity.value = withTiming(0, { duration: FADE_OUT_MS });
      setTimeout(() => onFinishedRef.current(), FADE_OUT_MS + 50);
    }

    // Absolute fallback — never stay stuck
    const fallback = setTimeout(startExit, MAX_WAIT_MS);

    if (fontsLoaded) {
      clearTimeout(fallback);
      const hold = setTimeout(startExit, MIN_HOLD_MS);
      return () => { clearTimeout(hold); clearTimeout(fallback); };
    }

    return () => clearTimeout(fallback);
  }, [fontsLoaded]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const logoStyle   = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagTranslateY.value }],
  }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require('../assets/images/logos/new/logo_black_text.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="NextVibe"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.tagWrap, tagStyle]}>
        <Text style={[textStyles.bodySm, styles.tagline]}>
          your vibe, your events
        </Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, dot1Style, { backgroundColor: brand.primary }]} />
        <Animated.View style={[styles.dot, dot2Style, { backgroundColor: brand.secondary }]} />
        <Animated.View style={[styles.dot, dot3Style, { backgroundColor: brand.primary }]} />
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * 0.45,
  },
  tagWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  tagline: {
    color: '#9E849D',     // neutral[400] — subtle, complements the plum brand
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: 72,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
