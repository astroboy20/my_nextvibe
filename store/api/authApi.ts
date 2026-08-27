import { createApi } from '@reduxjs/toolkit/query/react';
import { API_URL, baseQueryWithReauth, tokenStore } from '../baseQuery';
import { clearAuth, setNewUser, setUser } from '../slices/authSlice';

// ── Response types ────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    /** Present on registration / first Google sign-in */
    isNewUser?: boolean;
  };
}

// ── Helper: persist tokens + update Redux ─────────────────────────────────────

async function persistSession(
  data: AuthResponse,
  dispatch: (action: any) => void,
  forceNewUser = false,
) {
  await tokenStore.set('accessToken',  data.data.accessToken);
  await tokenStore.set('refreshToken', data.data.refreshToken);
  if (forceNewUser || data.data.isNewUser) {
    dispatch(setNewUser(data.data.user));
  } else {
    dispatch(setUser(data.data.user));
  }
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (build) => ({

    // POST /v1/auth/register
    register: build.mutation<
      AuthResponse,
      { email: string; password: string; displayName: string; username: string }
    >({
      query: (body) => ({ url: '/v1/auth/register', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // Registration always routes to onboarding
          await persistSession(data, dispatch, true);
        } catch { /* handled by caller */ }
      },
    }),

    // POST /v1/auth/login
    login: build.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/v1/auth/login', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          await persistSession(data, dispatch);
        } catch { /* handled by caller */ }
      },
    }),

    // POST /v1/auth/oauth/google
    googleLogin: build.mutation<AuthResponse, { idToken: string }>({
      query: (body) => ({ url: '/v1/auth/oauth/google', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // Use isNewUser flag from backend for Google sign-ins
          await persistSession(data, dispatch);
        } catch { /* handled by caller */ }
      },
    }),

    // POST /v1/auth/forgot-password
    forgotPassword: build.mutation<
      { success: boolean; message: string },
      { email: string }
    >({
      query: (body) => ({ url: '/v1/auth/forgot-password', method: 'POST', body }),
    }),

    // POST /v1/auth/reset-password
    resetPassword: build.mutation<
      { success: boolean },
      { token: string; newPassword: string }
    >({
      query: (body) => ({ url: '/v1/auth/reset-password', method: 'POST', body }),
    }),

    // POST /v1/auth/logout
    logout: build.mutation<void, void>({
      queryFn: async (_, { dispatch }) => {
        try {
          const accessToken  = await tokenStore.get('accessToken');
          const refreshToken = await tokenStore.get('refreshToken');
          // Unregister push token before dropping the access token
          const pushToken = await tokenStore.get('expoPushToken');
          if (pushToken && accessToken) {
            try {
              await fetch(`${API_URL}/v1/notifications/devices`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ token: pushToken }),
              });
            } catch { /* best-effort — don't block logout */ }
          }
          await fetch(`${API_URL}/v1/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken ?? ''}`,
            },
            body: JSON.stringify({ refreshToken }),
          });
        } finally {
          await tokenStore.removeMany(['accessToken', 'refreshToken', 'expoPushToken']);
          dispatch(clearAuth());
        }
        return { data: null as unknown as void };
      },
    }),

  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGoogleLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} = authApi;
