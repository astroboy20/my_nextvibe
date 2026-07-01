/** @type {import('tailwindcss').Config} */

const brand = {
  primary:        '#5B1A57',
  primaryLight:   '#8B3A86',
  primaryDark:    '#3D0F3A',
  secondary:      '#FF6584',
  secondaryLight: '#FF95AA',
  secondaryDark:  '#CC3F62',
};

const neutral = {
  0:   '#FFFFFF',
  50:  '#FAF7FA',
  100: '#F3EDF3',
  200: '#E3D8E3',
  300: '#C8B4C7',
  400: '#9E849D',
  500: '#745572',
  600: '#4F3A4E',
  700: '#352135',
  800: '#1E1E2E',
  900: '#13101F',
  950: '#0A0810',
};

const semantic = {
  success:       '#22C55E',
  successLight:  '#DCFCE7',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  error:         '#EF4444',
  errorLight:    '#FEE2E2',
  info:          '#3B82F6',
  infoLight:     '#DBEAFE',
};

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './constants/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: brand.primary, light: brand.primaryLight, dark: brand.primaryDark },
        secondary: { DEFAULT: brand.secondary, light: brand.secondaryLight, dark: brand.secondaryDark },
        neutral,
        success: { DEFAULT: semantic.success, light: semantic.successLight },
        warning: { DEFAULT: semantic.warning, light: semantic.warningLight },
        error:   { DEFAULT: semantic.error,   light: semantic.errorLight },
        info:    { DEFAULT: semantic.info,    light: semantic.infoLight },
      },
      borderRadius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32 },
      fontSize: {
        xs:    [11, { lineHeight: 16 }],
        sm:    [13, { lineHeight: 18 }],
        base:  [15, { lineHeight: 22 }],
        md:    [17, { lineHeight: 24 }],
        lg:    [20, { lineHeight: 28 }],
        xl:    [24, { lineHeight: 32 }],
        '2xl': [28, { lineHeight: 36 }],
        '3xl': [34, { lineHeight: 40 }],
        '4xl': [40, { lineHeight: 48 }],
        '5xl': [48, { lineHeight: 56 }],
      },
      spacing: {
        0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14,
        4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40,
        12: 48, 14: 56, 16: 64, 20: 80, 24: 96,
      },
      fontFamily: { mono: ['SpaceMono'] },
    },
  },
  plugins: [],
};
