import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from "./baseQuery";

export const launchApi = createApi({
    reducerPath: "launchApi",
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL
    }),
    endpoints: (build) => ({
        waitlist: build.mutation({
            query(body) {
                return {
                    url: "/v1/launch/waitlist",
                    method: "POST",
                    body
                }
            }
        })
    })
})

export const { useWaitlistMutation } = launchApi