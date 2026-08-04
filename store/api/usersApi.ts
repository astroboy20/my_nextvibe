import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';
import { setUser } from '../slices/authSlice';
import type { AuthUser } from './authApi';

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'UserActivity', 'OrganizerEvents'],
  endpoints: (build) => ({

    // GET /v1/users/me
    getMe: build.query<{ success: boolean; data: AuthUser }, void>({
      query: () => '/v1/users/me',
      providesTags: ['User'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.data));
        } catch { /* ignore */ }
      },
    }),

    // PATCH /v1/users/me
    updateMe: build.mutation<{ success: boolean; data: AuthUser }, Partial<AuthUser> & { bio?: string; avatarUrl?: string | null }>({
      query: (body) => ({ url: '/v1/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.data));
        } catch { /* ignore */ }
      },
    }),

    // GET /v1/users/:userId/activity
    getUserActivity: build.query<{ success: boolean; data: {
      eventsAttended: number;
      postcardsCount: number;
      followersCount: number;
      followingCount: number;
    }}, string>({
      query: (userId) => `/v1/users/${userId}/activity`,
      providesTags: ['UserActivity'],
    }),

    // GET /v1/events/organizer/:organizerId
    getOrganizerEvents: build.query<{ success: boolean; data: any[]; meta: any }, { organizerId: string; page?: number; limit?: number }>({
      query: ({ organizerId, page = 1, limit = 20 }) =>
        `/v1/events/organizer/${organizerId}?page=${page}&limit=${limit}`,
      providesTags: ['OrganizerEvents'],
    }),

  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetUserActivityQuery,
  useGetOrganizerEventsQuery,
} = usersApi;
