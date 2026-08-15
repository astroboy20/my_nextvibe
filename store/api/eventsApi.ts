import type { EventCardData } from '@/components/discover/EventCard';
import type { EventDetail } from '@/components/event/types';
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

// ── Tag colour map — used to colourise tags on cards ─────────────────────────

const TAG_COLORS: Record<string, string> = {
  Virtual:  '#3B82F6',
  Games:    '#EF4444',
  VibeTag:  '#8B5CF6',
  Free:     '#22C55E',
  Online:   '#3B82F6',
  Hybrid:   '#F59E0B',
  Onsite:   '#22C55E',
};

function tagColor(name: string): string {
  return TAG_COLORS[name] ?? '#9E849D';
}

// ── Helper: map a DiscoverEvent → EventCardData ───────────────────────────────

export function toCardData(e: DiscoverEvent): EventCardData {
  const builtInTags: Array<{ label: string; color: string }> = [];
  if (e.mode === 'VIRTUAL') builtInTags.push({ label: 'Virtual',  color: tagColor('Virtual') });
  if (e.mode === 'HYBRID')  builtInTags.push({ label: 'Hybrid',   color: tagColor('Hybrid')  });
  if (e.hasGame)            builtInTags.push({ label: 'Games',    color: tagColor('Games')   });
  if (e.hasVibeTag)         builtInTags.push({ label: 'VibeTag',  color: tagColor('VibeTag') });

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
    id:        e.id,
    title:     e.name,
    date:      new Date(e.startsAt).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    startsAt:  e.startsAt,
    memories:  e._count?.postcards ?? 0,
    location:  e.locationName ?? (e.mode === 'VIRTUAL' ? 'Online Event' : 'TBD'),
    flierUrl:  e.flierUrl,
    isPublic:  e.isPublic,
    eventMode: e.mode,
    hasGames:  e.hasGame,
    hasVibeTag:e.hasVibeTag,
    tags:      allTags,
  };
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Events', 'Event', 'Postcards'],
  endpoints: (build) => ({

    // ── Discover feed ─────────────────────────────────────────────────────────

    // GET /v1/discover/events
    getDiscoverEvents: build.query<
      { data: DiscoverEvent[]; meta: PaginatedMeta },
      { page?: number; limit?: number; tag?: string } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page)  p.set('page',  String(params.page  ?? 1));
        if (params?.limit) p.set('limit', String(params.limit ?? 20));
        if (params?.tag)   p.set('tag',   params.tag);
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
        if (params?.page)               p.set('page',     String(params.page  ?? 1));
        if (params?.limit)              p.set('limit',    String(params.limit ?? 20));
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
        if (params?.page)    p.set('page',    String(params.page  ?? 1));
        if (params?.limit)   p.set('limit',   String(params.limit ?? 20));
        if (params?.eventId) p.set('eventId', params.eventId);
        if (params?.userId)  p.set('userId',  params.userId);
        const qs = p.toString();
        return `/v1/postcards${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Postcards'],
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

  }),
});

export const {
  useGetDiscoverEventsQuery,
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetEventPostcardsQuery,
  useGetPostcardsQuery,
  useRsvpEventMutation,
} = eventsApi;
