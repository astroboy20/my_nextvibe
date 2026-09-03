import { unregisterPush } from "@/services/pushNotifications";
import { createApi } from "@reduxjs/toolkit/query/react";
import { API_URL, tokenStore } from "../baseQuery";
import { resetAllApiCaches } from "../resetCaches";
import { clearAuth, setNewUser, setUser } from "../slices/authSlice";
import { baseQueryWithReauth } from "./baseQuery";

// ─── AuthUser ─────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role: string;
  isEmailVerified?: boolean;
  city?: string | null;
  country?: string | null;
  createdAt?: string;
}

// ─── Helper — extract tokens + user from any server response shape ────────────
function parseAuthResponse(data: any) {
  return {
    user:         data?.data?.user         ?? data?.user         ?? null,
    accessToken:  data?.data?.accessToken  ?? data?.accessToken  ?? null,
    refreshToken: data?.data?.refreshToken ?? data?.refreshToken ?? null,
  };
}

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["User"],
    keepUnusedDataFor: 300,
    endpoints: (build) => ({

        // ── Login ─────────────────────────────────────────────────────────────
        login: build.mutation({
            query(body) {
                return { url: "/v1/auth/login", method: "POST", body };
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    const { user, accessToken, refreshToken } = parseAuthResponse(data);
                    if (accessToken)  await tokenStore.set("accessToken",  accessToken);
                    if (refreshToken) await tokenStore.set("refreshToken", refreshToken);
                    // Wipe ALL stale caches before setting user so screens never
                    // render the previous user's data even for a single frame
                    resetAllApiCaches(dispatch);
                    if (user) dispatch(setUser(user));
                } catch {}
            },
        }),

        // ── Google OAuth exchange (Flow 1A — hosted redirect) ─────────────────
        exchangeOAuthCode: build.mutation({
            query(body: { code: string }) {
                return { url: "/v1/auth/oauth/exchange", method: "POST", body };
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    const { user, accessToken, refreshToken } = parseAuthResponse(data);
                    if (accessToken)  await tokenStore.set("accessToken",  accessToken);
                    if (refreshToken) await tokenStore.set("refreshToken", refreshToken);
                    resetAllApiCaches(dispatch);
                    
                    // Check multiple possible locations for isNewUser flag
                    const isNew = data?.data?.isNewUser ?? data?.isNewUser ?? data?.user?.isNewUser ?? false;
                    
                    if (user) {
                      if (isNew) {
                        dispatch(setNewUser(user));
                      } else {
                        dispatch(setUser(user));
                      }
                    }
                } catch (err) {
                    console.error('[authApi] exchangeOAuthCode error:', err);
                }
            },
            // Transform the response so the hook can access isNewUser
            transformResponse: (response: any) => response,
        }),

        // ── Google OAuth (Flow 1B — native ID token) ─────────────────────────
        googleLogin: build.mutation({
            query(body: { idToken: string }) {
                return { url: "/v1/auth/oauth/google", method: "POST", body };
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    const { user, accessToken, refreshToken } = parseAuthResponse(data);
                    if (accessToken)  await tokenStore.set("accessToken",  accessToken);
                    if (refreshToken) await tokenStore.set("refreshToken", refreshToken);
                    resetAllApiCaches(dispatch);
                    if (user) dispatch(setUser(user));
                } catch {}
            },
        }),

        // ── Register ──────────────────────────────────────────────────────────
        register: build.mutation({
            query(body) {
                return { url: "/v1/auth/register", method: "POST", body };
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    const { user, accessToken, refreshToken } = parseAuthResponse(data);
                    if (accessToken)  await tokenStore.set("accessToken",  accessToken);
                    if (refreshToken) await tokenStore.set("refreshToken", refreshToken);
                    resetAllApiCaches(dispatch);
                    if (user) dispatch(setNewUser(user));
                } catch {}
            },
        }),

        // ── Email verification ────────────────────────────────────────────────
        verifyEmail: build.mutation({
            query(body) {
                return { url: "/v1/auth/verify-email", method: "POST", body };
            },
        }),

        resendverificationEmail: build.mutation({
            query(body) {
                return { url: "/v1/auth/request-new-verification", method: "POST", body };
            },
        }),

        // ── Password reset ────────────────────────────────────────────────────
        forgotPassword: build.mutation({
            query(body) {
                return { url: "/v1/auth/forgot-password", method: "POST", body };
            },
        }),

        resetPassword: build.mutation({
            query(body: { token: string; newPassword: string }) {
                return { url: "/v1/auth/reset-password", method: "POST", body };
            },
        }),

        // ── User queries ──────────────────────────────────────────────────────
        getUser: build.query<any, void>({
            query() {
                return { url: "/v1/users/me", method: "GET" };
            },
            providesTags: ["User"],
        }),

        getMe: build.query<any, void>({
            query() {
                return { url: "/v1/users/me", method: "GET" };
            },
            providesTags: ["User"],
        }),

        getOrganizerEvents: build.query<any, { organizerId: string; page?: number; limit?: number }>({
            query({ organizerId, page = 1, limit = 10 }) {
                const p = new URLSearchParams();
                p.set("page", String(page));
                p.set("limit", String(limit));
                return { url: `/v1/events/organizer/${organizerId}?${p.toString()}`, method: "GET" };
            },
        }),

        getUserBasic: build.query<any, string>({
            query(userId) {
                return { url: `/v1/users/${userId}/basic`, method: "GET" };
            },
        }),

        getUserActivity: build.query<any, string>({
            query(userId) {
                return { url: `/v1/users/${userId}/activity`, method: "GET" };
            },
        }),

        // ── User mutations ────────────────────────────────────────────────────
        updateUser: build.mutation<any, {
            displayName?: string;
            username?: string;
            bio?: string | null;
            avatarUrl?: string | null;
        }>({
            query(body) {
                return { url: "/v1/users/me", method: "PATCH", body };
            },
            invalidatesTags: ["User"],
        }),

        getPresignedUrl: build.mutation<{
            [x: string]: any;
            uploadUrl: string;
            objectUrl: string;
            expiresIn: number;
        }, {
            filename: string;
            mimeType: string;
            context: string;
        }>({
            query(body) {
                return { url: "/v1/storage/presigned-url", method: "POST", body };
            },
        }),

        // ── Logout ────────────────────────────────────────────────────────────
        logout: build.mutation<null, void>({
            queryFn: async (_arg, { dispatch }) => {
                try {
                    const accessToken = await tokenStore.get("accessToken");
                    if (accessToken) {
                        // Unregister push token BEFORE discarding the access token
                        // (DELETE /v1/notifications/devices is an authenticated route)
                        await unregisterPush(accessToken).catch(() => {});

                        // Invalidate the refresh token on the server
                        const refreshToken = await tokenStore.get("refreshToken");
                        await fetch(`${API_URL}/v1/auth/logout`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ refreshToken }),
                        }).catch(() => {});
                    }
                } catch {
                    // Best-effort — always clear local state regardless
                } finally {
                    await tokenStore.removeMany(["accessToken", "refreshToken", "expoPushToken"]);
                    dispatch(clearAuth());
                    resetAllApiCaches(dispatch);
                }
                return { data: null };
            },
        }),
    }),
});

export const {
    useLoginMutation,
    useGoogleLoginMutation,
    useExchangeOAuthCodeMutation,
    useRegisterMutation,
    useVerifyEmailMutation,
    useResendverificationEmailMutation,
    useGetUserQuery,
    useGetMeQuery,
    useGetUserBasicQuery,
    useGetUserActivityQuery,
    useGetOrganizerEventsQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useLogoutMutation,
    useUpdateUserMutation,
    useGetPresignedUrlMutation,
} = authApi;
