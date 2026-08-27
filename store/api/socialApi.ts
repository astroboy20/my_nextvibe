import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface PostcardUser {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  avatarUrl?: string;
}

export interface PostcardGalleryItem {
  url: string;
  type: string;
  _id: string;
  mediaUrl?: string;
}

export interface PostcardItem {
  _id: string;
  post_id?: string;
  id?: string;
  createdAt: string;
  updatedAt: string;
  event_id?: string;
  eventId?: string;
  event?: { id: string; name: string };
  gallery_items?: PostcardGalleryItem[];
  media?: PostcardGalleryItem[];
  user: PostcardUser;
  author?: PostcardUser;
  caption?: string;
  vibeTag?: { name: string };
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  tags?: string[];
  avatarUrl?: string;
  likeCount?: number;
}

export interface PostcardsMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface PostcardsResponse {
  success: boolean;
  data: {
    data: PostcardItem[];
    meta: PostcardsMeta;
  };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: PostcardUser;
  parentId?: string | null;
  repliesCount?: number;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

export interface SocialUser {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  eventsAttended?: number;
  postcardsCount?: number;
  isFollowing?: boolean;
  mutualEventsCount?: number;
}

export interface SocialUsersMeta {
  total: number;
  page: number;
  limit: number;
}

export interface SocialUsersResponse {
  success: boolean;
  data: {
    data: SocialUser[];
    meta: SocialUsersMeta;
  };
}

export const socialApi = createApi({
  reducerPath: "socialApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Postcards", "Comments", "People", "Feed"],
  keepUnusedDataFor: 300,
  endpoints: (build) => ({

    // ── Feed: postcards from accounts you follow ──────────────────────────────
    getFollowingFeed: build.query<PostcardsResponse, { page?: number; limit?: number } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit ?? 20));
        const qs = p.toString();
        return `/v1/feed/following${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Feed"],
    }),

    // ── Follow / Unfollow ────────────────────────────────────────────────────
    // Pass { userId, isFollowing: true } to unfollow (DELETE), false to follow (POST)
    toggleFollow: build.mutation<any, { userId: string; isFollowing: boolean }>({
      query: ({ userId, isFollowing }) => ({
        url: `/v1/users/${userId}/follow`,
        method: isFollowing ? "DELETE" : "POST",
      }),
      invalidatesTags: ["People", "Feed"],
    }),

    // ── My following ──────────────────────────────────────────────────────────
    getMyFollowing: build.query<SocialUsersResponse, void>({
      query: () => "/v1/my-following",
      providesTags: ["People"],
    }),

    // ── My followers ──────────────────────────────────────────────────────────
    getMyFollowers: build.query<SocialUsersResponse, void>({
      query: () => "/v1/my-followers",
      providesTags: ["People"],
    }),

    // ── Mutuals ───────────────────────────────────────────────────────────────
    getMutuals: build.query<SocialUsersResponse, void>({
      query: () => "/v1/mutuals",
      providesTags: ["People"],
    }),

    // ── Likes ─────────────────────────────────────────────────────────────────
    likeTarget: build.mutation<any, { targetType: "postcard" | "event"; targetId: string }>({
      query: (body) => ({
        url: "/v1/likes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Postcards", "Feed"],
    }),

    unlikeTarget: build.mutation<any, { targetType: "postcard" | "event"; targetId: string }>({
      query: (body) => ({
        url: "/v1/likes",
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Postcards", "Feed"],
    }),

    // ── Comments ──────────────────────────────────────────────────────────────
    getComments: build.query<CommentsResponse, { targetType: "postcard" | "event"; targetId: string; page?: number; limit?: number }>({
      query: ({ targetType, targetId, page = 1, limit = 20 }) =>
        `/v1/comments?targetType=${targetType}&targetId=${targetId}&page=${page}&limit=${limit}`,
      providesTags: (_r, _e, { targetId }) => [{ type: "Comments", id: targetId }],
    }),

    postComment: build.mutation<any, { targetType: "postcard" | "event"; targetId: string; body: string; parentId?: string | null }>({
      query: ({ targetType, targetId, body, parentId = null }) => ({
        url: "/v1/comments",
        method: "POST",
        body: { targetType, targetId, body, parentId },
      }),
      invalidatesTags: (_r, _e, { targetId }) => [{ type: "Comments", id: targetId }],
    }),

    deleteComment: build.mutation<any, string>({
      query: (commentId) => ({
        url: `/v1/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Comments"],
    }),

    getCommentReplies: build.query<CommentsResponse, string>({
      query: (commentId) => `/v1/comments/${commentId}/replies`,
      providesTags: (_r, _e, commentId) => [{ type: "Comments", id: commentId }],
    }),

    // ── Shares ────────────────────────────────────────────────────────────────
    recordShare: build.mutation<any, { targetType: "postcard" | "event"; targetId: string; platform: string }>({
      query: (body) => ({
        url: "/v1/shares",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetFollowingFeedQuery,
  useToggleFollowMutation,
  useGetMyFollowersQuery,
  useGetMyFollowingQuery,
  useGetMutualsQuery,
  useLikeTargetMutation,
  useUnlikeTargetMutation,
  useGetCommentsQuery,
  usePostCommentMutation,
  useDeleteCommentMutation,
  useGetCommentRepliesQuery,
  useRecordShareMutation,
} = socialApi;
