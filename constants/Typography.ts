/**
 * NextVibe Design System — Typography
 *
 * Primary typeface: Nunito Sans (Google Fonts)
 * Loaded via @expo-google-fonts/nunito-sans in app/_layout.tsx
 *
 * Scale is 4pt-based for visual harmony with the spacing grid.
 */

import { StyleSheet, type TextStyle } from 'react-native';

// ─── Font Families ────────────────────────────────────────────────────────────
export const fontFamily = {
  regular:   'NunitoSans_400Regular',
  italic:    'NunitoSans_400Regular_Italic',
  medium:    'NunitoSans_500Medium',
  semibold:  'NunitoSans_600SemiBold',
  bold:      'NunitoSans_700Bold',
  extrabold: 'NunitoSans_800ExtraBold',
  /** Keep SpaceMono available for code/mono contexts if needed */
  mono:      'SpaceMono',
} as const;

// ─── Size scale (dp) ──────────────────────────────────────────────────────────
export const fontSize = {
  xs:   11,
  sm:   14,
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
// With custom fonts loaded per-weight, fontWeight alone doesn't select the
// right file — fontFamily must be set explicitly. These constants are kept
// for convenience in places that still need the numeric weight value.
export const fontWeight = {
  regular:   '400' as TextStyle['fontWeight'],
  medium:    '500' as TextStyle['fontWeight'],
  semibold:  '600' as TextStyle['fontWeight'],
  bold:      '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
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
// fontFamily is set explicitly on every style so the correct Nunito Sans
// weight file is used on both iOS and Android.
export const textStyles = StyleSheet.create({
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
  },
  h4: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
  },
  h5: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
  },
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.wide,
  },
  buttonSm: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.wide,
  },
  numeric: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontVariant: ['tabular-nums'],
  },
});

export type TextVariant = keyof typeof textStyles;
