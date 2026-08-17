import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';
import { setUser } from '../slices/authSlice';
import type { AuthUser } from './authApi';

// ── Extended user type (superset of AuthUser) ─────────────────────────────────

export interface UserProfile extends AuthUser {
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  isEmailVerified?: boolean;
}

// ── Shared response shapes ────────────────────────────────────────────────────

export interface UserActivityData {
  eventsAttended: number;
  postcardsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface OrganizerEvent {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  locationName?: string | null;
  flierUrl?: string | null;
}

export interface UserTicket {
  id: string;
  eventName: string;
  ticketType: string;
  date: string;
  ticketNumber?: string | null;
  status: string;
}

export interface PostcardItem {
  id: string;
  caption?: string | null;
  likeCount: number;
  mediaUrl?: string | null;
}

export interface UploadedFile {
  url: string;
  fileKey: string;
  mediaType: string;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'UserActivity', 'OrganizerEvents', 'Tickets', 'Postcards'],
  endpoints: (build) => ({

    // ── Profile ──────────────────────────────────────────────────────────────

    // GET /v1/users/me
    getMe: build.query<{ success: boolean; data: UserProfile }, void>({
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
    updateMe: build.mutation<
      { success: boolean; data: UserProfile },
      Partial<UserProfile>
    >({
      query: (body) => ({ url: '/v1/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.data));
        } catch { /* ignore */ }
      },
    }),

    // POST /v1/users/me/switch-role
    switchRole: build.mutation<
      { success: boolean; data: { id: string; role: string } },
      { role: string }
    >({
      query: (body) => ({ url: '/v1/users/me/switch-role', method: 'POST', body }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // Merge the updated role back into auth state
          dispatch(setUser(data.data as any));
        } catch { /* ignore */ }
      },
    }),

    // PATCH /v1/users/me/vibes
    saveVibes: build.mutation<{ success: boolean }, { tagIds: string[] }>({
      query: (body) => ({ url: '/v1/users/me/vibes', method: 'PATCH', body }),
    }),

    // GET /v1/users/:userId/basic  (public profile card)
    getUserBasic: build.query<
      { success: boolean; data: Omit<UserProfile, 'email'> & { isFollowing: boolean } },
      string
    >({
      query: (userId) => `/v1/users/${userId}/basic`,
    }),

    // GET /v1/users/:userId/activity
    getUserActivity: build.query<
      any, string
    >({
      query: (userId) => `/v1/users/${userId}/activity`,
      providesTags: ['UserActivity'],
    }),

    // ── Organizer events ─────────────────────────────────────────────────────

    // GET /v1/events/organizer/:organizerId
    getOrganizerEvents: build.query<any, { organizerId: string; page?: number; limit?: number }
    >({
      query: ({ organizerId, page = 1, limit = 20 }) =>
        `/v1/events/organizer/${organizerId}?page=${page}&limit=${limit}`,
      providesTags: ['OrganizerEvents'],
    }),

    // ── User tickets ─────────────────────────────────────────────────────────

    // GET /v1/tickets/me  (tickets owned by the current user)
    getMyTickets: build.query<
      { success: boolean; data: UserTicket[]; meta: any },
      { page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set('page', String(params.page));
        if (params?.limit) p.set('limit', String(params.limit));
        const qs = p.toString();
        return `/v1/tickets/me${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Tickets'],
    }),

    // ── User postcards ────────────────────────────────────────────────────────

    // GET /v1/postcards?userId=:userId
    getUserPostcards: build.query<
      { success: boolean; data: { data: PostcardItem[]; meta: any } },
      { userId: string; page?: number; limit?: number }
    >({
      query: ({ userId, page = 1, limit = 20 }) =>
        `/v1/postcards?userId=${userId}&page=${page}&limit=${limit}`,
      providesTags: ['Postcards'],
    }),

    // ── File upload ───────────────────────────────────────────────────────────

    // POST /v1/storage/upload  (single file — used for avatar)
    uploadFile: build.mutation<
      { success: boolean; data: UploadedFile },
      FormData
    >({
      query: (formData) => ({
        url: '/v1/storage/upload',
        method: 'POST',
        body: formData,
      }),
    }),

  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useSwitchRoleMutation,
  useSaveVibesMutation,
  useGetUserBasicQuery,
  useGetUserActivityQuery,
  useGetOrganizerEventsQuery,
  useGetMyTicketsQuery,
  useGetUserPostcardsQuery,
  useUploadFileMutation,
} = usersApi;
