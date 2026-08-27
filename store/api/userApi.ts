
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";



export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: baseQueryWithReauth,
    keepUnusedDataFor: 300,
    endpoints: (build) => ({



        getUser: build.query<any, void>({
            query() {
                return {
                    url: "/v1/users/me",
                    method: "GET",
                }
            }
        }),
        switchRole: build.mutation({
            query(role: string) {
                return {
                    url: "/v1/users/me/switch-role",
                    method: "POST",
                    body: { role }
                }
            }
        }),

        /**
         * PATCH /v1/users/me
         * Syncs city + country to the backend once per session after location resolves.
         * Uses the existing profile update endpoint — city and country are optional fields.
         */
        updateMe: build.mutation<any, { city?: string; country?: string }>({
            query(body) {
                return {
                    url: "/v1/users/me",
                    method: "PATCH",
                    body,
                }
            }
        }),



    })
})

export const { useGetUserQuery, useSwitchRoleMutation, useUpdateMeMutation } = userApi