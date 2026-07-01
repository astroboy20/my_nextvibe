/**
 * NextVibe Design System — Theme
 *
 * Single import for all design tokens.
 * Use `useTheme()` from components/Themed.tsx at runtime.
 *
 * Requirement 25: The app switches colour schemes dynamically —
 * never hard-code colours in components, always read from theme.
 */

import Colors, {
    brand,
    neutral,
    semantic,
    type ColorScheme,
    type ThemeColors,
} from './Colors';

import {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight,
    textStyles,
    type TextVariant,
} from './Typography';

import { layout, radius, shadows, space, spacing } from './Spacing';

// ─── Full theme object for a given colour scheme ──────────────────────────────
export function getTheme(scheme: ColorScheme) {
  return {
    colors:       Colors[scheme],
    brand,
    neutral,
    semantic,
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textStyles,
    spacing,
    space,
    radius,
    shadows,
    layout,
    isDark: scheme === 'dark',
  } as const;
}

export type Theme = ReturnType<typeof getTheme>;

// ─── Re-exports ───────────────────────────────────────────────────────────────
export {
    brand, Colors, fontFamily,
    fontSize,
    fontWeight, layout, letterSpacing, lineHeight, neutral, radius, semantic, shadows, space, spacing, textStyles
};

    export type { ColorScheme, TextVariant, ThemeColors };

