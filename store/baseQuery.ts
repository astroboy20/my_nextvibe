import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'https://nextvibe-nest-backend-1b4o.onrender.com');

// ── Secure token helpers ──────────────────────────────────────────────────────
// expo-secure-store is native-only; on web it throws. Wrap with a no-op fallback
// so the web bundle doesn't crash.

const isNative = typeof SecureStore.getItemAsync === 'function';

export const tokenStore = {
  async get(key: string): Promise<string | null> {
    if (!isNative) return null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (!isNative) return;
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (!isNative) return;
    await SecureStore.deleteItemAsync(key);
  },
  async removeMany(keys: string[]): Promise<void> {
    if (!isNative) return;
    await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(k)));
  },
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers) => {
    const token = await tokenStore.get('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// ── Auto token-refresh on 401 ─────────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: { resolve: () => void; reject: () => void }[] = [];

function flushQueue(ok: boolean) {
  const q = pendingQueue;
  pendingQueue = [];
  q.forEach(({ resolve, reject }) => (ok ? resolve() : reject()));
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);
  if (result.error?.status !== 401) return result;

  if (!isRefreshing) {
    isRefreshing = true;
    const refreshToken = await tokenStore.get('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      flushQueue(false);
      await tokenStore.removeMany(['accessToken', 'refreshToken']);
      return result;
    }

    const r = await rawBaseQuery(
      { url: '/v1/auth/refresh', method: 'POST', body: { refreshToken } },
      api,
      extra,
    );

    if (r.data) {
      const d = r.data as any;
      const newAccess  = d.data?.accessToken  ?? d.accessToken;
      const newRefresh = d.data?.refreshToken ?? d.refreshToken;
      await tokenStore.set('accessToken', newAccess);
      // Refresh tokens rotate — persist the new one immediately
      if (newRefresh) await tokenStore.set('refreshToken', newRefresh);
      isRefreshing = false;
      flushQueue(true);
      result = await rawBaseQuery(args, api, extra);
    } else {
      isRefreshing = false;
      flushQueue(false);
      await tokenStore.removeMany(['accessToken', 'refreshToken']);
    }
  } else {
    await new Promise<void>((res, rej) =>
      pendingQueue.push({ resolve: res, reject: rej }),
    );
    result = await rawBaseQuery(args, api, extra);
  }

  return result;
};
