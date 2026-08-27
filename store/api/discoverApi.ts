import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface VibeTag {
  id: string;
  name: string;
  isPlatformDefault: boolean;
  imageUrl?: string | null;
  orderIndex: number;
}

export interface DiscoverEvent {
  id: string;
  name: string;
  description?: string;
  flierUrl?: string | null;
  locationName?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  isPublic: boolean;
  tier?: string;
  hasGame?: boolean;
  hasVibetag?: boolean;
  postcardCount?: number;
  tags?: { id: string; name: string }[];
  organizer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
}

export interface DiscoverFeedParams {
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  tag?: string;
}

export const discoverApi = createApi({
  reducerPath: "discoverApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["VibeTags", "DiscoverFeed"],
  keepUnusedDataFor: 300, // cache for 5 minutes — avoids re-fetching on every mount

  endpoints: (builder) => ({
    /**
     * GET /v1/discover/tags  — public, no auth required
     * Returns platform-default vibe tags sorted by orderIndex.
     */
    getVibeTags: builder.query<VibeTag[], void>({
      query: () => "/v1/discover/tags",
      transformResponse: (res: any) => {
        const tags: VibeTag[] = Array.isArray(res) ? res : (res?.data ?? []);
        return [...tags].sort((a, b) => a.orderIndex - b.orderIndex);
      },
      providesTags: ["VibeTags"],
    }),

    /**
     * PATCH /v1/users/me/vibes  — auth required
     * Saves the user's selected vibe tag IDs to their profile.
     */
    saveUserVibes: builder.mutation<
      { message: string } | any,
      { tagIds: string[] }
    >({
      query: (body) => ({
        url: "/v1/users/me/vibes",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["VibeTags"],
    }),

    /**
     * POST /v1/discover/tags  — auth required
     * Creates a new tag. Returns the new tag with its real id.
     * The backend may wrap the response as { data: { id, name, slug } } or
     * return the tag directly — transformResponse unwraps either shape.
     */
    createDiscoverTag: builder.mutation<
      { id: string; name: string; slug: string },
      { name: string }
    >({
      query: (body) => ({
        url: "/v1/discover/tags",
        method: "POST",
        body,
      }),
      // Unwrap { data: tag } or { success, data: tag } or a bare tag object
      transformResponse: (res: any) => {
        const tag = res?.data ?? res;
        return { id: tag.id, name: tag.name, slug: tag.slug ?? "" };
      },
      invalidatesTags: ["VibeTags"],
    }),

    /**
     * GET /v1/discover/events  — auth required for personalisation
     * Returns personalised event feed sorted by interest match + optional geo.
     */
    getDiscoverFeed: builder.query<
      { data: DiscoverEvent[]; meta: { total: number; page: number; limit: number; hasNext: boolean } },
      DiscoverFeedParams | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page)     p.set("page",     String(params.page));
        if (params?.limit)    p.set("limit",    String(params.limit));
        if (params?.lat)      p.set("lat",      String(params.lat));
        if (params?.lng)      p.set("lng",      String(params.lng));
        if (params?.radiusKm) p.set("radiusKm", String(params.radiusKm));
        if (params?.tag)      p.set("tag",      params.tag);
        const qs = p.toString();
        return `/v1/discover/events${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["DiscoverFeed"],
    }),
  }),
});

export const {
  useGetVibeTagsQuery,
  useSaveUserVibesMutation,
  useCreateDiscoverTagMutation,
  useGetDiscoverFeedQuery,
} = discoverApi;
