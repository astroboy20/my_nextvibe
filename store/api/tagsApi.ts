/**
 * tagsApi.ts
 *
 * Discover / vibe tags — used for attaching searchable tags to events.
 *
 * Endpoints
 * ──────────
 * GET  /v1/discover/tags          → getAllTags
 * POST /v1/discover/tags          → createTag
 * POST /v1/events/:id/tags/add    → addEventTags    (in eventsApi too, kept here for convenience)
 * POST /v1/events/:id/tags/remove → removeEventTags
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

export interface DiscoverTag {
  id: string;
  name: string;
  imageUrl?: string | null;
  eventCount?: number;
}

export const tagsApi = createApi({
  reducerPath: 'tagsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tags', 'EventTags'],
  endpoints: (build) => ({

    // GET /v1/discover/tags
    getAllTags: build.query<DiscoverTag[], void>({
      query: () => '/v1/discover/tags',
      transformResponse: (res: any) =>
        Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [],
      providesTags: ['Tags'],
    }),

    // POST /v1/discover/tags  — create a brand-new global tag
    createTag: build.mutation<DiscoverTag, { name: string }>({
      query: (body) => ({ url: '/v1/discover/tags', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Tags'],
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
      invalidatesTags: (_, __, { eventId }) => [{ type: 'EventTags', id: eventId }],
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
      invalidatesTags: (_, __, { eventId }) => [{ type: 'EventTags', id: eventId }],
    }),
  }),
});

export const {
  useGetAllTagsQuery,
  useCreateTagMutation,
  useAddEventTagsMutation,
  useRemoveEventTagsMutation,
} = tagsApi;
