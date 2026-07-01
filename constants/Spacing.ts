/**
 * NextVibe Design System — Spacing, Radius, Shadows & Layout
 *
 * All spacing values are multiples of 4dp.
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Base spacing scale (dp) ──────────────────────────────────────────────────
export const spacing = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
} as const;

// ─── Named aliases ────────────────────────────────────────────────────────────
export const space = {
  xs:   spacing[1],   // 4
  sm:   spacing[2],   // 8
  md:   spacing[4],   // 16  — standard horizontal screen padding
  lg:   spacing[5],   // 20
  xl:   spacing[6],   // 24  — card padding
  '2xl': spacing[8],  // 32
  '3xl': spacing[12], // 48
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────
export const radius = {
  none:  0,
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  '2xl': 24,
  '3xl': 32,
  full:  9999,
} as const;

// ─── Shadows (iOS shadow + Android elevation) ─────────────────────────────────
export const shadows = StyleSheet.create({
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  // Primary-coloured glow for CTAs
  primaryGlow: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});

// ─── Layout constants ─────────────────────────────────────────────────────────
export const layout = {
  /** Standard horizontal screen padding */
  screenPaddingH:     space.md,       // 16
  /** Standard vertical screen padding */
  screenPaddingV:     space.lg,       // 20
  /** Max readable content width (tablet / web) */
  maxContentWidth:    480,
  /** Bottom tab bar height */
  tabBarHeight:       Platform.OS === 'ios' ? 84 : 60,
  /** Standard full-width button height */
  buttonHeight:       52,
  /** Compact button height */
  buttonHeightSm:     40,
  /** Text input height */
  inputHeight:        52,
  /** Avatar sizes */
  avatarXs:           24,
  avatarSm:           32,
  avatarMd:           40,
  avatarLg:           56,
  avatarXl:           80,
  /** Event card cover aspect ratio (16:9) */
  eventCardRatio:     9 / 16,
  /** Postcard aspect ratio (4:3) */
  postcardRatio:      3 / 4,
  /** Organizer Dashboard management card height */
  dashboardCardH:     120,
  /** Leaderboard row height */
  leaderboardRowH:    60,
  /** List row height */
  listRowH:           64,
} as const;
