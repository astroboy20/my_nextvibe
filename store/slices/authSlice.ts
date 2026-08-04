/**
 * authSlice
 *
 * Single source of truth for authentication state in memory.
 *
 * Flow:
 *   App launch → bootstrapAuth() thunk reads AsyncStorage
 *              → if accessToken exists, hits GET /v1/users/me
 *              → sets user + isAuthenticated
 *              → sets isBootstrapped = true  (hides splash)
 *
 *   Login / Register / Google → authApi mutations store tokens in AsyncStorage
 *                             → dispatch setUser(user) to update Redux
 *
 *   Logout → authApi mutation removes tokens from AsyncStorage
 *          → dispatch clearAuth() to wipe Redux state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../api/authApi';
import { API_URL } from '../baseQuery';

// ── State shape ───────────────────────────────────────────────────────────────

interface AuthState {
  /** Current user — null when logged out */
  user: AuthUser | null;
  /** True once we know whether a session exists (splash can hide) */
  isBootstrapped: boolean;
  /** Derived convenience flag */
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user:            null,
  isBootstrapped:  false,
  isAuthenticated: false,
};

// ── Bootstrap thunk ───────────────────────────────────────────────────────────

/**
 * Run once on app launch inside _layout.tsx.
 * Reads AsyncStorage for an access token; if found, calls /v1/users/me
 * to get the current user. Always resolves so the app can proceed.
 */
export const bootstrapAuth = createAsyncThunk<AuthUser | null>(
  'auth/bootstrap',
  async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return null;

      const res = await fetch(`${API_URL}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Token expired / invalid — wipe storage and treat as logged out
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        return null;
      }

      const json = await res.json();
      return (json?.data ?? null) as AuthUser | null;
    } catch {
      // Network error — remain logged out, tokens stay for next launch
      return null;
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Call after a successful login / register / google sign-in */
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user            = action.payload;
      state.isAuthenticated = true;
    },
    /** Call after logout */
    clearAuth(state) {
      state.user            = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user            = action.payload;
        state.isAuthenticated = action.payload !== null;
        state.isBootstrapped  = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        // Should never happen (thunk never throws), but be safe
        state.isBootstrapped = true;
      });
  },
});

export const { setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
