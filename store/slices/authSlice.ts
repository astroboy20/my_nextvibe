/**
 * authSlice
 *
 * Single source of truth for authentication state in memory.
 *
 * Flow:
 *   App launch → bootstrapAuth() thunk reads SecureStore
 *              → if accessToken exists, hits GET /v1/users/me
 *              → sets user + isAuthenticated
 *              → sets isBootstrapped = true  (hides splash)
 *
 *   Login / Register / Google → authApi mutations store tokens in SecureStore
 *                             → dispatch setUser(user) to update Redux
 *
 *   Logout → authApi mutation removes tokens from SecureStore
 *          → dispatch clearAuth() to wipe Redux state
 */

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../api/authApi';
import { API_URL, tokenStore } from '../baseQuery';

// ── State shape ───────────────────────────────────────────────────────────────

interface AuthState {
  /** Current user — null when logged out */
  user: AuthUser | null;
  /** True once we know whether a session exists (splash can hide) */
  isBootstrapped: boolean;
  /** Derived convenience flag */
  isAuthenticated: boolean;
  /** True when the user just registered — routes them to vibe onboarding */
  isNewUser: boolean;
  /** Bootstrap error for retry logic */
  bootstrapError: string | null;
  /** OAuth exchange in progress — show loading screen, block AuthGate routing */
  oauthPending: boolean;
}

const initialState: AuthState = {
  user:            null,
  isBootstrapped:  false,
  isAuthenticated: false,
  isNewUser:       false,
  bootstrapError:  null,
  oauthPending:    false,
};

// ── Bootstrap thunk ───────────────────────────────────────────────────────────

/**
 * Run once on app launch inside _layout.tsx.
 * Reads SecureStore for an access token; if found, calls /v1/users/me
 * to get the current user. Uses the refresh mechanism on 401.
 * Always resolves so the app can proceed.
 */
export const bootstrapAuth = createAsyncThunk<AuthUser | null>(
  'auth/bootstrap',
  async () => {
    // Abort the entire bootstrap if it takes more than 10 seconds.
    // This covers flaky network after an OTA reload so the splash never hangs forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const token = await tokenStore.get('accessToken');
      if (!token) return null;

      // Attempt 1: Try with existing access token
      let res = await fetch(`${API_URL}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      // If 401, attempt token refresh
      if (res.status === 401) {
        const refreshToken = await tokenStore.get('refreshToken');
        if (!refreshToken) {
          await tokenStore.removeMany(['accessToken', 'refreshToken']);
          return null;
        }

        const refreshRes = await fetch(`${API_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        });

        if (!refreshRes.ok) {
          await tokenStore.removeMany(['accessToken', 'refreshToken']);
          return null;
        }

        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData?.data?.accessToken ?? refreshData?.accessToken;
        const newRefreshToken = refreshData?.data?.refreshToken ?? refreshData?.refreshToken;

        if (!newAccessToken) {
          await tokenStore.removeMany(['accessToken', 'refreshToken']);
          return null;
        }

        await tokenStore.set('accessToken', newAccessToken);
        if (newRefreshToken) {
          await tokenStore.set('refreshToken', newRefreshToken);
        }

        res = await fetch(`${API_URL}/v1/users/me`, {
          headers: { Authorization: `Bearer ${newAccessToken}` },
          signal: controller.signal,
        });
      }

      if (!res.ok) {
        await tokenStore.removeMany(['accessToken', 'refreshToken']);
        return null;
      }

      const json = await res.json();
      return (json?.data ?? null) as AuthUser | null;
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        // Timed out — treat as a network failure, keep tokens for next launch
        console.warn('Bootstrap auth timed out after 10s');
      } else {
        console.warn('Bootstrap auth failed:', error);
      }
      return null;
    } finally {
      clearTimeout(timeout);
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
      state.bootstrapError  = null;
      state.oauthPending    = false;
    },
    /** Call after a successful registration — marks user as new for onboarding */
    setNewUser(state, action: PayloadAction<AuthUser>) {
      state.user            = action.payload;
      state.isAuthenticated = true;
      state.isNewUser       = true;
      state.bootstrapError  = null;
      state.oauthPending    = false;
    },
    /** Clear the new-user flag once onboarding is complete */
    clearNewUser(state) {
      state.isNewUser = false;
    },
    /** Call after logout */
    clearAuth(state) {
      state.user            = null;
      state.isAuthenticated = false;
      state.isNewUser       = false;
      state.bootstrapError  = null;
      state.oauthPending    = false;
    },
    /** Retry bootstrap after network failure */
    retryBootstrap(state) {
      state.bootstrapError = null;
    },
    /** Mark OAuth exchange as in-progress — blocks AuthGate from routing */
    setOAuthPending(state, action: PayloadAction<boolean>) {
      state.oauthPending = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user            = action.payload;
        state.isAuthenticated = action.payload !== null;
        state.isBootstrapped  = true;
        state.bootstrapError  = null;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        // Bootstrap failed with an error — mark as bootstrapped but store error for retry
        state.isBootstrapped  = true;
        state.bootstrapError  = action.error.message ?? 'Bootstrap failed';
      });
  },
});

export const { setUser, setNewUser, clearNewUser, clearAuth, retryBootstrap, setOAuthPending } = authSlice.actions;
export default authSlice.reducer;
