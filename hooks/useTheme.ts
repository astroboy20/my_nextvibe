/**
 * useTheme — resolves the user's stored preference to actual theme tokens.
 *
 * Delegates scheme resolution to the existing useColorScheme hook which
 * already handles preference → system fallback correctly.
 */

import { useColorScheme } from '@/components/useColorScheme';
import Colors, { type ThemeColors } from '@/constants/Colors';

export function useTheme(): { colors: ThemeColors; isDark: boolean; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme();

  return {
    colors: Colors[scheme],
    isDark: scheme === 'dark',
    scheme,
  };
}
