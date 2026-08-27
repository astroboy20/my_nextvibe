import type { EventCardData } from '@/components/discover/EventCard';
import type { EventDetail } from '@/components/event/types';
import { tagColor } from '@/constants/TagColors';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Shared response shapes ────────────────────────────────────────────────────

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface DiscoverEvent {
  id: string;
  name: string;
  startsAt: string;
  status: string;
  mode: 'ONSITE' | 'VIRTUAL' | 'HYBRID';
  locationName?: string | null;
  flierUrl?: string | null;
  isPublic?: boolean;
  hasGame?: boolean;
  hasVibeTag?: boolean;
  attendeeCount?: number;
  tags?: Array<{ id: string; name: string; imageUrl?: string | null }>;
  _count?: { postcards?: number };
}

export interface PostcardMedia {
  mediaUrl?: string | null;
  mediaType?: 'PHOTO' | 'VIDEO' | null;
}

export interface PostcardItem {
  id: string;
  caption?: string | null;
  likeCount?: number;
  commentCount?: number;
  author?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  media?: PostcardMedia[];
}

// ── Helper: map a DiscoverEvent → EventCardData ───────────────────────────────

export function toCardData(e: DiscoverEvent): EventCardData {
  const builtInTags: Array<{ label: string; color: string }> = [];
  if (e.mode === 'VIRTUAL') builtInTags.push({ label: 'Virtual', color: tagColor('Virtual') });
  if (e.mode === 'HYBRID') builtInTags.push({ label: 'Hybrid', color: tagColor('Hybrid') });
  if (e.hasGame) builtInTags.push({ label: 'Games', color: tagColor('Games') });
  if (e.hasVibeTag) builtInTags.push({ label: 'VibeTag', color: tagColor('VibeTag') });

  const apiTags = (e.tags ?? []).map((t) => ({
    label: t.name,
    color: tagColor(t.name),
  }));

  // Merge, dedup by label
  const allTags = [...builtInTags];
  for (const t of apiTags) {
    if (!allTags.find((x) => x.label === t.label)) allTags.push(t);
  }

  return {
    id: e.id,
    title: e.name,
    date: new Date(e.startsAt).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    startsAt: e.startsAt,
    memories: e._count?.postcards ?? 0,
    location: e.locationName ?? (e.mode === 'VIRTUAL' ? 'Online Event' : 'TBD'),
    flierUrl: e.flierUrl,
    isPublic: e.isPublic,
    eventMode: e.mode,
    hasGames: e.hasGame,
    hasVibeTag: e.hasVibeTag,
    tags: allTags,
  };
}

// ── API slice ─────────────────────────────────────────────────────────────────

// ── Postcard comment ─────────────────────────────────────────────────────────
export interface PostcardComment {
  id: string;
  content: string;
  createdAt?: string;
  author?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
}

// ── Leaderboard entry ─────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  totalLikes?: number;
  likeCount?: number;
  totalComments?: number;
  commentCount?: number;
  author?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
}

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Events', 'Event', 'Postcards', 'PostcardComments'],
  endpoints: (build) => ({

    // ── Discover feed ─────────────────────────────────────────────────────────

    // GET /v1/discover/events
    getDiscoverEvents: build.query<
      { data: DiscoverEvent[]; meta: PaginatedMeta },
      { page?: number; limit?: number; tag?: string } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set('page', String(params.page ?? 1));
        if (params?.limit) p.set('limit', String(params.limit ?? 20));
        if (params?.tag) p.set('tag', params.tag);
        const qs = p.toString();
        return `/v1/discover/events${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Events'],
      // API returns { data: [...], meta: {...} } — normalise here
      transformResponse: (res: any) => ({
        data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
        meta: res?.meta ?? { total: 0, page: 1, limit: 20, hasNext: false },
      }),
    }),

    // GET /v1/events  (public list)
    getEvents: build.query<
      { success: boolean; data: { data: DiscoverEvent[]; meta: PaginatedMeta } },
      { page?: number; limit?: number; isPublic?: boolean } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set('page', String(params.page ?? 1));
        if (params?.limit) p.set('limit', String(params.limit ?? 20));
        if (params?.isPublic !== undefined) p.set('isPublic', String(params.isPublic));
        const qs = p.toString();
        return `/v1/events${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Events'],
    }),

    // ── Single event ──────────────────────────────────────────────────────────

    // GET /v1/events/:eventId
    getEventById: build.query<
      { success: boolean; data: EventDetail },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}`,
      providesTags: (_, __, id) => [{ type: 'Event', id }],
    }),

    // ── Event postcards ───────────────────────────────────────────────────────

    // GET /v1/events/:eventId/postcards
    getEventPostcards: build.query<
      { success: boolean; data: { data: PostcardItem[]; meta: PaginatedMeta } },
      { eventId: string; phase?: string; page?: number; limit?: number }
    >({
      query: ({ eventId, phase, page = 1, limit = 20 }) => {
        const p = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (phase && phase !== 'all') p.set('phase', phase);
        return `/v1/events/${eventId}/postcards?${p.toString()}`;
      },
      providesTags: (_, __, { eventId }) => [{ type: 'Postcards', id: eventId }],
    }),

    // ── Global postcards feed ─────────────────────────────────────────────────

    // GET /v1/postcards
    getPostcards: build.query<
      { success: boolean; data: { data: PostcardItem[]; meta: PaginatedMeta } },
      { page?: number; limit?: number; eventId?: string; userId?: string } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set('page', String(params.page ?? 1));
        if (params?.limit) p.set('limit', String(params.limit ?? 20));
        if (params?.eventId) p.set('eventId', params.eventId);
        if (params?.userId) p.set('userId', params.userId);
        const qs = p.toString();
        return `/v1/postcards${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Postcards'],
    }),

    // POST /v1/events/:eventId/postcards  (create)
    createPostcards: build.mutation<
      { success: boolean; data: any },
      { eventId: string; vibeTagId?: string; media: Array<{ fileKey: string; mediaType: string; mediaUrl: string }>; caption?: string }
    >({
      query: ({ eventId, ...body }) => ({
        url: `/v1/events/${eventId}/postcards`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Postcards', id: eventId }],
    }),

    // GET /v1/events/:eventId/postcards/:postcardId  (single postcard)
    getPostcard: build.query<
      { success: boolean; data: any },
      string
    >({
      query: (postcardId) => `/v1/postcards/${postcardId}`,
    }),

    // POST /v1/postcards/:postcardId/like  (toggle like)
    toggleLikePostcard: build.mutation<
      { success: boolean; liked?: boolean; currentLikes?: number },
      { eventId: string; postcardId: string }
    >({
      query: ({ postcardId }) => ({
        url: `/v1/postcards/${postcardId}/like`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Postcards', id: eventId }],
    }),

    // GET /v1/postcards/:postcardId/comments
    getPostcardComments: build.query<
      { success: boolean; data: PostcardComment[] },
      string
    >({
      query: (postcardId) => `/v1/postcards/${postcardId}/comments`,
      providesTags: (_, __, id) => [{ type: 'PostcardComments', id }],
    }),

    // POST /v1/postcards/:postcardId/comments
    commentOnPostcard: build.mutation<
      { success: boolean; data: any },
      { postcardId: string; content: string }
    >({
      query: ({ postcardId, content }) => ({
        url: `/v1/postcards/${postcardId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_, __, { postcardId }) => [{ type: 'PostcardComments', id: postcardId }],
    }),

    // POST /v1/postcards/:postcardId/swap  (replace existing postcard)
    swapPostcard: build.mutation<
      { success: boolean; data: any },
      { postcardId: string; eventId: string; vibeTagId?: string; media: Array<{ fileKey: string; mediaType: string; mediaUrl: string }>; caption?: string }
    >({
      query: ({ postcardId, eventId: _eventId, ...body }) => ({
        url: `/v1/postcards/${postcardId}/swap`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Postcards', id: eventId }],
    }),

    // GET /v1/events/:eventId/postcards/leaderboard
    getPostcardLeaderboard: build.query<
      { success: boolean; data: LeaderboardEntry[] },
      { eventId: string; activityTiming?: string }
    >({
      query: ({ eventId, activityTiming }) => {
        const p = new URLSearchParams();
        if (activityTiming) p.set('activityTiming', activityTiming);
        const qs = p.toString();
        return `/v1/events/${eventId}/postcards/leaderboard${qs ? `?${qs}` : ''}`;
      },
    }),

    // GET /v1/events/:eventId/vibetags
    getEventVibeTags: build.query<
      { success: boolean; data: Array<{ id: string; name: string; imageUrl: string; activityTiming?: string }> },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/vibetags`,
      providesTags: (_, __, id) => [{ type: 'Event', id }],
    }),

    // POST /v1/storage/upload-multiple  (multipart upload)
    uploadPostcardMedia: build.mutation<
      { success: boolean; data: Array<{ fileKey: string; mediaType: string; url: string }> },
      FormData
    >({
      query: (formData) => ({
        url: '/v1/storage/upload-multiple',
        method: 'POST',
        body: formData,
      }),
    }),

    // POST /v1/events/:eventId/rsvp
    rsvpEvent: build.mutation<
      { success: boolean; data: any },
      { eventId: string; status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED'; ticketTierId?: string }
    >({
      query: ({ eventId, status, ticketTierId }) => ({
        url: `/v1/events/${eventId}/rsvp`,
        method: 'POST',
        body: { status, ...(ticketTierId ? { ticketTierId } : {}) },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    // POST /v1/events  (create)
    createEvent: build.mutation<
      { success: boolean; data: { id: string; name: string } },
      Record<string, any>
    >({
      query: (body) => ({ url: '/v1/events', method: 'POST', body }),
      invalidatesTags: ['Events'],
    }),

    // PATCH /v1/events/:eventId
    updateEvent: build.mutation<
      { success: boolean; data: any },
      { eventId: string; data: Record<string, any> }
    >({
      query: ({ eventId, data }) => ({
        url: `/v1/events/${eventId}`,
        method: 'PATCH',
        body: Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)),
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }, 'Events'],
    }),

    // PATCH /v1/events/:eventId/status
    updateEventStatus: build.mutation<
      { success: boolean; data: any },
      { eventId: string; status: 'PUBLISHED' | 'CANCELLED' | 'ENDED' }
    >({
      query: ({ eventId, status }) => ({
        url: `/v1/events/${eventId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }, 'Events'],
    }),

    // POST /v1/events/:eventId/tags/add
    addEventTags: build.mutation<
      { success: boolean },
      { eventId: string; tagIds: string[] }
    >({
      query: ({ eventId, tagIds }) => ({
        url: `/v1/events/${eventId}/tags/add`,
        method: 'POST',
        body: { tagIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    // POST /v1/events/:eventId/tags/remove
    removeEventTags: build.mutation<
      { success: boolean },
      { eventId: string; tagIds: string[] }
    >({
      query: ({ eventId, tagIds }) => ({
        url: `/v1/events/${eventId}/tags/remove`,
        method: 'POST',
        body: { tagIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    // POST /v1/events/upload-intent  (presigned URL for flier/video)
    uploadIntent: build.mutation<
      { success: boolean; data: { uploadUrl: string; fileUrl: string } },
      { filename: string; contentType: string; folder: string }
    >({
      query: (body) => ({ url: '/v1/events/upload-intent', method: 'POST', body }),
    }),

    getEventAttendees: build.query<any, { eventId: string; page?: number; limit?: number }>({
      query: ({ eventId, page = 1, limit = 20 }) =>
        `/v1/events/${eventId}/attendees?page=${page}&limit=${limit}`,
      providesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    // GET /v1/events/:eventId/tickets
    getEventTickets: build.query<
      { success: boolean; data: Array<{ id: string; name: string; price: number; currency: string; capacity: number; available: number; description?: string }> },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/tickets`,
      providesTags: (_, __, id) => [{ type: 'Event', id }],
    }),

    // POST /v1/events/:eventId/vibetags  (create a vibeTag for an event)
    createVibeTag: build.mutation<
      { success: boolean; data: { id: string; name: string; imageUrl: string; activityTiming: string; paymentRequired?: boolean } },
      { eventId: string; name?: string | null; imageKey: string; activityTiming: string }
    >({
      query: ({ eventId, ...body }) => ({
        url: `/v1/events/${eventId}/vibetags`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

  }),
});

export const {
  useGetDiscoverEventsQuery,
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetEventPostcardsQuery,
  useGetPostcardsQuery,
  useRsvpEventMutation,
  useCreateEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useAddEventTagsMutation,
  useRemoveEventTagsMutation,
  useUploadIntentMutation,
  useGetEventAttendeesQuery,
  useGetEventTicketsQuery,
  useCreatePostcardsMutation,
  useGetPostcardQuery,
  useToggleLikePostcardMutation,
  useGetPostcardCommentsQuery,
  useCommentOnPostcardMutation,
  useGetPostcardLeaderboardQuery,
  useUploadPostcardMediaMutation,
  useGetEventVibeTagsQuery,
  useSwapPostcardMutation,
  useCreateVibeTagMutation,
} = eventsApi;
