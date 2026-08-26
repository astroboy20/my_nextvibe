/**
 * analyticsApi.ts
 *
 * Analytics endpoints — all read-only (GET only).
 * Prefix: /analytics  (no /v1 prefix per Analytics Frontend Guide)
 *
 * Endpoints
 * ──────────
 * GET /analytics/overview                     → getOrganizerOverview
 * GET /analytics/events/:id                   → getEventAnalytics
 * GET /analytics/events/:id/vibetags          → getEventVibeTagAnalytics
 * GET /analytics/events/:id/postcards         → getEventPostcardAnalytics
 * GET /analytics/events/:id/revenue           → getEventRevenueAnalytics
 * GET /analytics/events/:id/social            → getEventSocialAnalytics
 * GET /analytics/events/:id/games             → getEventGameAnalytics
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Response types ────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalEvents: number;
  eventsByStatus: Record<string, number>;
  totalRsvps: number;
  totalCheckIns: number;
  checkInRate: number;
  totalPostcards: number;
  totalGameSessions: number;
  totalRevenue: number;
  totalEventLikes: number;
}

export interface EventAnalytics {
  event: { id: string; name: string; startsAt: string; endsAt: string; capacity: number };
  rsvps: { total: number; byTier: Array<{ tierId: string; tierName: string; count: number }> };
  checkIns: { total: number; rate: number };
  postcards: { total: number };
  gameSessions: Array<{ id: string; title: string; status: string; participantCount: number }>;
  revenue: { total: number };
  ticketsSold: number;
  social: { likes: number; shares: number; comments: number };
}

export interface VibeTagAnalytics {
  eventId: string;
  vibeTags: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    activityTiming?: string;
    totalPostcards: number;
    totalLikes: number;
  }>;
}

export interface PostcardAnalytics {
  eventId: string;
  total: number;
  byVisibility: Record<string, number>;
  byVibeTag: Array<{ tagName: string; count: number }>;
  topPostcards: Array<{
    id: string;
    caption?: string | null;
    likeCount: number;
    author?: { displayName?: string; username?: string; avatarUrl?: string | null };
  }>;
}

export interface RevenueAnalytics {
  eventId: string;
  totalRevenue: number;
  completedPurchases: number;
  refundCount: number;
  byStatus: Array<{ status: string; count: number; revenue: number }>;
  byTier: Array<{ tierName: string; sold: number; revenue: number }>;
}

export interface SocialAnalytics {
  eventId: string;
  event: { likes: number; shares: number; comments: number };
  postcards: {
    totalPostcards: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    avgLikesPerPostcard: number;
  };
  combined: { totalLikes: number; totalShares: number; totalComments: number };
}

export interface GameAnalytics {
  eventId: string;
  totalSessions: number;
  totalPlayers: number;
  totalWinners: number;
  engagementRate: number;
  sessions: Array<{ id: string; title: string; status: string; startsAt: string; playerCount: number }>;
  winners: Array<{
    rewardId: string;
    user: { id: string; username: string; displayName: string; avatarUrl?: string | null };
    session: { id: string; title: string };
    reward: { rank: number; type: string; title: string; value: string };
    status: string;
    claimedAt?: string | null;
    fulfilledAt?: string | null;
    awardedAt?: string | null;
  }>;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Analytics'],
  endpoints: (build) => ({

    // GET /analytics/overview
    getOrganizerOverview: build.query<{ data: AnalyticsOverview }, void>({
      query: () => '/analytics/overview',
    }),

    // GET /analytics/events/:id
    getEventAnalytics: build.query<{ data: EventAnalytics }, string>({
      query: (id) => `/analytics/events/${id}`,
    }),

    // GET /analytics/events/:id/vibetags
    getEventVibeTagAnalytics: build.query<{ data: VibeTagAnalytics }, string>({
      query: (id) => `/analytics/events/${id}/vibetags`,
    }),

    // GET /analytics/events/:id/postcards
    getEventPostcardAnalytics: build.query<{ data: PostcardAnalytics }, string>({
      query: (id) => `/analytics/events/${id}/postcards`,
    }),

    // GET /analytics/events/:id/revenue
    getEventRevenueAnalytics: build.query<{ data: RevenueAnalytics }, string>({
      query: (id) => `/analytics/events/${id}/revenue`,
    }),

    // GET /analytics/events/:id/social
    getEventSocialAnalytics: build.query<{ data: SocialAnalytics }, string>({
      query: (id) => `/analytics/events/${id}/social`,
    }),

    // GET /analytics/events/:id/games
    getEventGameAnalytics: build.query<{ data: GameAnalytics }, string>({
      query: (id) => `/analytics/events/${id}/games`,
    }),
  }),
});

export const {
  useGetOrganizerOverviewQuery,
  useGetEventAnalyticsQuery,
  useGetEventVibeTagAnalyticsQuery,
  useGetEventPostcardAnalyticsQuery,
  useGetEventRevenueAnalyticsQuery,
  useGetEventSocialAnalyticsQuery,
  useGetEventGameAnalyticsQuery,
} = analyticsApi;
