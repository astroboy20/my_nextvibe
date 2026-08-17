import type { SocialUser } from '@/components/social/PersonCard';
import type { PostcardItem } from '@/components/social/PostcardCard';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Extended shapes ───────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  lastMessage?: {
    body: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const socialApi = createApi({
  reducerPath: 'socialApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Feed', 'People', 'Conversations', 'Messages'],
  endpoints: (build) => ({

    // ── Social feed ───────────────────────────────────────────────────────────

    // GET /v1/feed/following
    getFollowingFeed: build.query<
      { success: boolean; data: { data: PostcardItem[]; meta: PaginatedMeta } },
      { page?: number; limit?: number } | void
    >({
      query: (params) => {
        const p = new URLSearchParams();
        p.set('page',  String(params?.page  ?? 1));
        p.set('limit', String(params?.limit ?? 20));
        return `/v1/feed/following?${p.toString()}`;
      },
      providesTags: ['Feed'],
      transformResponse: (res: any) => {
        // Normalise: some endpoints wrap in { success, data: { data, meta } }
        // others return { data: [...], meta: {...} } directly
        const inner = res?.data ?? res;
        const items = Array.isArray(inner?.data) ? inner.data
                    : Array.isArray(inner)        ? inner
                    : [];
        const meta  = inner?.meta ?? { total: 0, page: 1, limit: 20, hasNext: false };
        return { success: true, data: { data: items, meta } };
      },
    }),

    // ── Follow / unfollow ─────────────────────────────────────────────────────

    // POST /v1/users/:userId/follow   DELETE /v1/users/:userId/follow
    toggleFollow: build.mutation<
      { success: boolean },
      { userId: string; isFollowing: boolean }
    >({
      query: ({ userId, isFollowing }) => ({
        url: `/v1/users/${userId}/follow`,
        method: isFollowing ? 'DELETE' : 'POST',
      }),
      // Invalidate people + feed, and also any cached event detail that
      // embeds organizer.isFollowing so AboutTab reads fresh state on remount
      invalidatesTags: ['People', 'Feed'],
    }),

    // GET /v1/my-following
    getMyFollowing: build.query<
      { success: boolean; data: SocialUser[] },
      void
    >({
      query: () => '/v1/my-following',
      providesTags: ['People'],
      transformResponse: (res: any) => ({
        success: true,
        data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
      }),
    }),

    // GET /v1/my-followers
    getMyFollowers: build.query<
      { success: boolean; data: SocialUser[] },
      void
    >({
      query: () => '/v1/my-followers',
      providesTags: ['People'],
      transformResponse: (res: any) => ({
        success: true,
        data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
      }),
    }),

    // GET /v1/mutuals
    getMutuals: build.query<
      { success: boolean; data: SocialUser[] },
      void
    >({
      query: () => '/v1/mutuals',
      providesTags: ['People'],
      transformResponse: (res: any) => ({
        success: true,
        data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
      }),
    }),

    // ── Messaging ─────────────────────────────────────────────────────────────

    // GET /v1/conversations
    getConversations: build.query<
      { success: boolean; data: Conversation[] },
      void
    >({
      query: () => '/v1/conversations',
      providesTags: ['Conversations'],
      transformResponse: (res: any) => ({
        success: true,
        data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
      }),
    }),

    // POST /v1/conversations
    startConversation: build.mutation<
      { success: boolean; data: Conversation },
      { userId: string }
    >({
      query: (body) => ({ url: '/v1/conversations', method: 'POST', body }),
      invalidatesTags: ['Conversations'],
    }),

    // GET /v1/conversations/:id/messages
    getMessages: build.query<
      { success: boolean; data: { data: Message[]; meta: PaginatedMeta } },
      { conversationId: string; page?: number; limit?: number }
    >({
      query: ({ conversationId, page = 1, limit = 50 }) =>
        `/v1/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
      providesTags: (_, __, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    // ── Postcard like / comment ───────────────────────────────────────────────

    // POST /v1/postcards/:postcardId/like
    toggleLikePostcard: build.mutation<
      { success: boolean; data: { liked: boolean; currentLikes: number } },
      { postcardId: string }
    >({
      query: ({ postcardId }) => ({
        url: `/v1/postcards/${postcardId}/like`,
        method: 'POST',
      }),
      invalidatesTags: ['Feed'],
    }),

  }),
});

export const {
  useGetFollowingFeedQuery,
  useToggleFollowMutation,
  useGetMyFollowingQuery,
  useGetMyFollowersQuery,
  useGetMutualsQuery,
  useGetConversationsQuery,
  useStartConversationMutation,
  useGetMessagesQuery,
  useToggleLikePostcardMutation,
} = socialApi;
