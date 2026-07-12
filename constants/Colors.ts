/**
 * NextVibe Design System — Colour Palette
 *
 * Brand primary: #5B1A57 (deep plum)
 * Secondary:     #FF6584 (coral)
 * Dark bg:       #1E1E2E  — Req 25 §1
 * Light bg:      #FFFFFF  — Req 25 §2
 */

// ─── Brand ────────────────────────────────────────────────────────────────────
export const brand = {
  primary:        '#5B1A57',   // deep plum
  primaryLight:   '#8B3A86',   // lighter plum for hover/tint
  primaryDark:    '#3D0F3A',   // darker plum for pressed/shadow
  secondary:      '#FF6584',   // coral
  secondaryLight: '#FF95AA',
  secondaryDark:  '#CC3F62',
} as const;

// ─── Neutral scale ────────────────────────────────────────────────────────────
export const neutral = {
  0:   '#FFFFFF',
  50:  '#FAF7FA',   // very slight plum tint to whites
  100: '#F3EDF3',
  200: '#E3D8E3',
  300: '#C8B4C7',
  400: '#9E849D',
  500: '#745572',
  600: '#4F3A4E',
  700: '#374151',   // card surface in dark mode
  800: '#1E1E2E',   // dark background — Req 25 §1
  900: '#13101F',
  950: '#0A0810',
  960: "#e5e7eb" //border
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
  background:      neutral[0],
  surface:         neutral[50],
  surfaceElevated: neutral[100],
  card:            neutral[0],
  border:          neutral[200],
  divider:         neutral[100],

  text:            neutral[800],
  textSecondary:   neutral[600],
  textTertiary:    neutral[400],
  textOnPrimary:   neutral[0],
  textOnSecondary: neutral[0],

  primary:         brand.primary,
  primaryLight:    brand.primaryLight,
  primaryDark:     brand.primaryDark,
  secondary:       brand.secondary,
  secondaryLight:  brand.secondaryLight,
  secondaryDark:   brand.secondaryDark,

  tint:            brand.primary,
  tabIconDefault:  neutral[400],
  tabIconSelected: brand.primary,
  tabBar:          neutral[0],
  tabBarBorder:    neutral[200],
  overlay:         'rgba(0,0,0,0.5)',
} as const;

// ─── Dark theme tokens ────────────────────────────────────────────────────────
const dark = {
  background:      neutral[800],    // #1E1E2E
  surface:         '#2A2A3E',       // slightly lighter than bg
  surfaceElevated: '#32324A',       // elevated cards
  card:            '#2A2A3E',
  border:          '#3D3D56',       // visible but subtle in dark
  divider:         '#2A2A3E',

  text:            neutral[50],     // #FAF7FA — almost white
  textSecondary:   neutral[300],    // #C8B4C7 — readable on dark bg
  textTertiary:    neutral[400],    // #9E849D — placeholder, hints
  textOnPrimary:   neutral[0],
  textOnSecondary: neutral[0],

  // Brand stays consistent across modes — Req 25 §4
  primary:         brand.primaryLight,  // #8B3A86 — brighter on dark bg for contrast
  primaryLight:    brand.primaryLight,
  primaryDark:     brand.primary,
  secondary:       brand.secondary,
  secondaryLight:  brand.secondaryLight,
  secondaryDark:   brand.secondaryDark,

  tint:            brand.primaryLight,
  tabIconDefault:  neutral[400],
  tabIconSelected: brand.primaryLight,
  tabBar:          neutral[800],
  tabBarBorder:    '#2A2A3E',
  overlay:         'rgba(0,0,0,0.7)',
} as const;

const Colors = { light, dark, brand, neutral, semantic } as const;
export default Colors;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof light;
