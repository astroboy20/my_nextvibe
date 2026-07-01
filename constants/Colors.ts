/**
 * NextVibe Design System — Colour Palette
 *
 * Sourced directly from Requirements:
 *   Primary:   #6C63FF  (purple)   — Req 25 §4
 *   Secondary: #FF6584  (coral)    — Req 25 §4
 *   Dark bg:   #1E1E2E             — Req 25 §1
 *   Light bg:  #FFFFFF             — Req 25 §2
 */

// ─── Brand ────────────────────────────────────────────────────────────────────
export const brand = {
  primary:       '#6C63FF',
  primaryLight:  '#9C96FF',
  primaryDark:   '#4A42CC',
  secondary:     '#FF6584',
  secondaryLight:'#FF95AA',
  secondaryDark: '#CC3F62',
} as const;

// ─── Neutral scale (matches dark bg at 800) ───────────────────────────────────
export const neutral = {
  0:   '#FFFFFF',
  50:  '#F7F7FB',
  100: '#EFEFF7',
  200: '#DEDEED',
  300: '#C2C2DA',
  400: '#9191B5',
  500: '#636390',
  600: '#46466C',
  700: '#2D2D47',
  800: '#1E1E2E',   // dark background — Req 25 §1
  900: '#131320',
  950: '#0B0B14',
} as const;

// ─── Semantic colours ─────────────────────────────────────────────────────────
export const semantic = {
  success:      '#22C55E',
  successLight: '#DCFCE7',
  warning:      '#F59E0B',
  warningLight: '#FEF3C7',
  error:        '#EF4444',
  errorLight:   '#FEE2E2',
  info:         '#3B82F6',
  infoLight:    '#DBEAFE',
} as const;

// ─── Light theme tokens ───────────────────────────────────────────────────────
const light = {
  background:       neutral[0],       // #FFFFFF
  surface:          neutral[50],
  surfaceElevated:  neutral[100],
  card:             neutral[0],
  border:           neutral[200],
  divider:          neutral[100],

  text:             neutral[800],
  textSecondary:    neutral[600],
  textTertiary:     neutral[400],
  textOnPrimary:    neutral[0],
  textOnSecondary:  neutral[0],

  primary:          brand.primary,
  primaryLight:     brand.primaryLight,
  primaryDark:      brand.primaryDark,
  secondary:        brand.secondary,
  secondaryLight:   brand.secondaryLight,
  secondaryDark:    brand.secondaryDark,

  tint:             brand.primary,
  tabIconDefault:   neutral[400],
  tabIconSelected:  brand.primary,
  tabBar:           neutral[0],
  tabBarBorder:     neutral[200],

  // Overlay for modals/drawers
  overlay:          'rgba(0,0,0,0.5)',
} as const;

// ─── Dark theme tokens ────────────────────────────────────────────────────────
const dark = {
  background:       neutral[800],     // #1E1E2E
  surface:          neutral[700],
  surfaceElevated:  neutral[600],
  card:             neutral[700],
  border:           neutral[600],
  divider:          neutral[700],

  text:             neutral[50],
  textSecondary:    neutral[300],
  textTertiary:     neutral[500],
  textOnPrimary:    neutral[0],
  textOnSecondary:  neutral[0],

  // Brand colours stay consistent in both modes — Req 25 §4
  primary:          brand.primary,
  primaryLight:     brand.primaryLight,
  primaryDark:      brand.primaryDark,
  secondary:        brand.secondary,
  secondaryLight:   brand.secondaryLight,
  secondaryDark:    brand.secondaryDark,

  tint:             brand.primary,
  tabIconDefault:   neutral[500],
  tabIconSelected:  brand.primary,
  tabBar:           neutral[800],
  tabBarBorder:     neutral[700],

  overlay:          'rgba(0,0,0,0.7)',
} as const;

const Colors = { light, dark, brand, neutral, semantic } as const;

export default Colors;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof light;
