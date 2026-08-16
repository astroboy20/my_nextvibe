import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApi } from '@reduxjs/toolkit/query/react';
import { API_URL, baseQueryWithReauth } from '../baseQuery';
import { clearAuth, setUser } from '../slices/authSlice';

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
  };
}

// ── Helper: persist tokens + update Redux ─────────────────────────────────────

async function persistSession(
  data: AuthResponse,
  dispatch: (action: any) => void,
) {
  await AsyncStorage.setItem('accessToken',  data.data.accessToken);
  await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
  dispatch(setUser(data.data.user));
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
          await persistSession(data, dispatch);
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
          const accessToken  = await AsyncStorage.getItem('accessToken');
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          await fetch(`${API_URL}/v1/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken ?? ''}`,
            },
            body: JSON.stringify({ refreshToken }),
          });
        } finally {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
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
