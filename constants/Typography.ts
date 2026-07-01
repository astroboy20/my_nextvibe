/**
 * NextVibe Design System — Typography
 *
 * SpaceMono is loaded via expo-font for display/mono use.
 * Body and UI text use the system font (undefined = RN default).
 *
 * Scale is 4pt-based for visual harmony with the spacing grid.
 */

import { StyleSheet, type TextStyle } from 'react-native';

// ─── Font Families ────────────────────────────────────────────────────────────
export const fontFamily = {
  /** Decorative / code — loaded via expo-font */
  mono:    'SpaceMono' as string | undefined,
  /** Body / UI — falls back to system font */
  regular: undefined as string | undefined,
} as const;

// ─── Size scale (dp) ──────────────────────────────────────────────────────────
export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Weights ──────────────────────────────────────────────────────────────────
export const fontWeight = {
  regular:  '400' as TextStyle['fontWeight'],
  medium:   '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold:     '700' as TextStyle['fontWeight'],
  extrabold:'800' as TextStyle['fontWeight'],
} as const;

// ─── Line heights (dp) ────────────────────────────────────────────────────────
export const lineHeight = {
  xs:   16,
  sm:   18,
  base: 22,
  md:   24,
  lg:   28,
  xl:   32,
  '2xl': 36,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
} as const;

// ─── Letter spacing (dp) ──────────────────────────────────────────────────────
export const letterSpacing = {
  tighter: -0.5,
  tight:   -0.25,
  normal:  0,
  wide:    0.25,
  wider:   0.5,
  widest:  1.0,
} as const;

// ─── Semantic text styles (StyleSheet-ready) ──────────────────────────────────
export const textStyles = StyleSheet.create({
  h1: {
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: fontWeight.semibold,
  },
  h4: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
  },
  h5: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.semibold,
  },
  bodyLg: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.regular,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.regular,
  },
  bodySm: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.regular,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.regular,
  },
  overline: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  buttonSm: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  // Used in leaderboard ranks, game scores
  numeric: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
});

export type TextVariant = keyof typeof textStyles;
