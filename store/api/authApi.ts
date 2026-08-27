
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";



export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["User"],
    keepUnusedDataFor: 300, // cache user data for 5 minutes
    endpoints: (build) => ({

        login: build.mutation({
            query(body) {
                return {
                    url: "/v1/auth/login",
                    method: "POST",
                    body
                }
            }
        }),
        googleLogin: build.mutation({
            query(body: { idToken: string }) {
                return {
                    url: "/v1/auth/oauth/google",
                    method: "POST",
                    credentials: "include",
                    body
                }
            }
        }),
        register: build.mutation({
            query(body) {
                return {
                    url: "/v1/auth/register",
                    method: "POST",
                    body
                }
            }
        }),
        verifyEmail: build.mutation({
            query(body) {
                return {
                    url: "/auth/verify-email",
                    method: "POST",
                    body
                }
            }
        }),
        resendverificationEmail: build.mutation({
            query(body) {
                return {
                    url: "/auth/request-new-verification",
                    method: "POST",
                    body
                }
            }
        }),
        forgotPassword: build.mutation({
            query(body) {
                return {
                    url: "/v1/auth/forgot-password",
                    method: "POST",
                    body
                }
            }
        }),
        resetPassword: build.mutation({
            query(body: { token: string; newPassword: string }) {
                return {
                    url: "/v1/auth/reset-password",
                    method: "POST",
                    body
                }
            }
        }),
        getUser: build.query<any, void>({
            query() {
                return {
                    url: "/v1/users/me",
                    method: "GET",
                }
            },
            providesTags: ["User"],
        }),
        getMe: build.query<any, void>({
            query() {
                return {
                    url: "/v1/me",
                    method: "GET",
                }
            }
        }),
        getOrganizerEvents: build.query<any, { organizerId: string; page?: number; limit?: number }>({
            query({ organizerId, page = 1, limit = 10 }) {
                const p = new URLSearchParams();
                p.set("page", String(page));
                p.set("limit", String(limit));
                return {
                    url: `/v1/events/organizer/${organizerId}?${p.toString()}`,
                    method: "GET",
                }
            }
        }),
        getUserBasic: build.query<any, string>({
            query(userId) {
                return {
                    url: `/v1/users/${userId}/basic`,
                    method: "GET",
                }
            }
        }),
        getUserActivity: build.query<any, string>({
            query(userId) {
                return {
                    url: `/v1/users/${userId}/activity`,
                    method: "GET",
                }
            }
        }),
        updateUser: build.mutation<
            any,
            {
                displayName?: string;
                username?: string;
                bio?: string | null;
                avatarUrl?: string | null;
            }
        >({
            query(body) {
                return {
                    url: "/v1/users/me",
                    method: "PATCH",
                    body,
                };
            },

            invalidatesTags: ["User"],
        }),
        // authApi.ts

        getPresignedUrl: build.mutation<
            {
                [x: string]: any;
                uploadUrl: string;
                objectUrl: string;
                expiresIn: number;
            },
            {
                filename: string;
                mimeType: string;
                context: string;
            }
        >({
            query(body) {
                return {
                    url: "/v1/storage/presigned-url",
                    method: "POST",
                    body,
                };
            },
        }),
        logout: build.mutation<void, void>({
            queryFn: async () => {
                try {
                    const res = await fetch("/api/auth/logout", { method: "POST" });
                    if (!res.ok) {
                        const data = await res.json();
                        return { error: { status: res.status, data } as any };
                    }
                    return { data: undefined };
                } catch (e) {
                    return { error: { status: "FETCH_ERROR", error: String(e) } as any };
                }
            },
        }),



    })
})

export const { useLoginMutation, useGoogleLoginMutation, useRegisterMutation, useVerifyEmailMutation, useResendverificationEmailMutation, useGetUserQuery, useGetMeQuery, useGetUserBasicQuery, useGetUserActivityQuery, useGetOrganizerEventsQuery, useForgotPasswordMutation, useResetPasswordMutation, useLogoutMutation, useUpdateUserMutation, useGetPresignedUrlMutation } = authApi