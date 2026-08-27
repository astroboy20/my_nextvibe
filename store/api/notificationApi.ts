import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface NotificationActor {
  /** The API has always returned this (see the backend's `select`), but the
   *  type omitted it — so `actor.id`, used to route to the actor's profile,
   *  failed typecheck while working fine at runtime. */
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
}

/**
 * Mirrors the backend `NotificationType` enum — **uppercase**.
 * This was previously typed as lowercase ("like", "comment"), which is why the
 * rendering switches never matched and notifications displayed as raw enums.
 */
export type NotificationTypeValue =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "TAG"
  | "RSVP"
  | "GAME_RESULT"
  | "EVENT_REMINDER"
  | "CHECK_IN"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "EVENT_PUBLISHED"
  | "TICKET_PURCHASED"
  | "GAME_UNLOCKED"
  | "VIBETAG_ACTIVATED";

export interface Notification {
  id: string;
  /** Widened with `string` so an unrecognised new type can't crash rendering. */
  type: NotificationTypeValue | string;
  /**
   * Null for system-generated notifications — a payment confirmation or a game
   * reward has no "who". Nullable on the backend as of the actorId migration;
   * before that these notifications failed to insert at all, so the client had
   * never actually seen one.
   */
  actor: NotificationActor | null;
  targetType?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
  message?: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    data: Notification[];
    meta: {
      total: number;
      page: number;
      limit: number;
      hasNext: boolean;
      unreadCount: number;
    };
  };
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Notifications"],
  keepUnusedDataFor: 60, // notifications are more time-sensitive, 1 minute cache
  endpoints: (builder) => ({
    /** GET /v1/notifications */
    getNotifications: builder.query<NotificationsResponse, void>({
      query: () => "/v1/notifications",
      providesTags: ["Notifications"],
    }),

    /** PATCH /v1/notifications/read-all */
    markAllRead: builder.mutation<{ success: boolean; data: { updatedCount: number } }, void>({
      query: () => ({
        url: "/v1/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),

    /** PATCH /v1/notifications/:id/read */
    markOneRead: builder.mutation<{ success: boolean; data: { isRead: boolean } }, string>({
      query: (id) => ({
        url: `/v1/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkAllReadMutation,
  useMarkOneReadMutation,
} = notificationApi;
