/**
 * Theme preference slice.
 *
 * 'system' → follow phone setting
 * 'light'  → always light
 * 'dark'   → always dark
 *
 * The value is persisted to AsyncStorage so it survives app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@nextvibe_theme';

interface ThemeState {
  preference: ThemePreference;
}

const initialState: ThemeState = {
  preference: 'system',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.preference = action.payload;
    },
  },
});

export const { setThemePreference } = themeSlice.actions;
export default themeSlice.reducer;

// ── Thunks ─────────────────────────────────────────────────────────────────────

/** Load persisted preference from AsyncStorage and dispatch it. */
export function bootstrapTheme() {
  return async (dispatch: (action: any) => void) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        dispatch(setThemePreference(stored));
      }
    } catch {
      // Ignore — fall back to 'system'
    }
  };
}

/** Persist and apply a new preference. */
export function changeTheme(pref: ThemePreference) {
  return async (dispatch: (action: any) => void) => {
    dispatch(setThemePreference(pref));
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Ignore storage failures
    }
  };
}
