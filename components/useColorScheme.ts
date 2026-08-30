/**
 * useColorScheme
 *
 * Returns the effective colour scheme based on the user's stored preference:
 *  - 'system' → mirror the phone's setting
 *  - 'light'  → always light
 *  - 'dark'   → always dark
 *
 * Falls back to 'light' when no preference is set and the system returns
 * 'unspecified' (Android default before the user has changed their system theme).
 */

import type { RootState } from '@/store/store';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

export type ColorScheme = 'light' | 'dark';

export function useColorScheme(): ColorScheme {
  const preference = useSelector((s: RootState) => s.theme.preference);
  const system = useSystemColorScheme();

  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';

  // 'system'
  return system === 'dark' ? 'dark' : 'light';
}
