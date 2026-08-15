import AsyncStorage from "@react-native-async-storage/async-storage"; 
import {
    BaseQueryFn,
    FetchArgs,
    FetchBaseQueryError,
    fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';

export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'https://nextvibe-nest-backend-1b4o.onrender.com');

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers) => {
    const token = await AsyncStorage.getItem('accessToken');
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
    const refreshToken = await AsyncStorage.getItem('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      flushQueue(false);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      return result;
    }

    const r = await rawBaseQuery(
      { url: '/v1/auth/refresh', method: 'POST', body: { refreshToken } },
      api,
      extra,
    );

    if (r.data) {
      const d = r.data as any;
      const newAccess   = d.data?.accessToken  ?? d.accessToken;
      const newRefresh  = d.data?.refreshToken ?? d.refreshToken;
      await AsyncStorage.setItem('accessToken', newAccess);
      if (newRefresh) await AsyncStorage.setItem('refreshToken', newRefresh);
      isRefreshing = false;
      flushQueue(true);
      result = await rawBaseQuery(args, api, extra);
    } else {
      isRefreshing = false;
      flushQueue(false);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
  } else {
    await new Promise<void>((res, rej) =>
      pendingQueue.push({ resolve: res, reject: rej }),
    );
    result = await rawBaseQuery(args, api, extra);
  }

  return result;
};
