
import { IGalleryItem } from "@/types/event.type";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ── Withdrawal types ──────────────────────────────────────────────────────────
/**
 * @deprecated Superseded by the payout system in `./payoutApi`.
 *
 * The old flow recomputed payout as the gross sum of an event's completed
 * purchases on every request, never subtracting what had already been paid — so
 * the same revenue could be requested repeatedly. It also had no admin path to
 * approve or mark a request paid, and typed bank details in per request with no
 * support for non-Nigerian accounts.
 *
 * Use `useGetBalancesQuery` / `useRequestPayoutMutation` from `./payoutApi`.
 * Nothing references these any more; they remain only until the backend's
 * `withdrawals` table is confirmed empty and dropped.
 */
export interface WithdrawalRecord {
  id: string;
  eventId: string;
  organizerId: string;
  amount: string;
  currency: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  requestedAt: string;
  processedAt: string | null;
  notes: string | null;
}

export const eventsApi = createApi({
  reducerPath: "eventsApi",

  baseQuery: baseQueryWithReauth,

  tagTypes: ["Events", "Event", "Gallery", "Messages", "Games", "PublishPreview", "Withdrawals"],
  keepUnusedDataFor: 300, // cache for 5 minutes — avoids re-fetching on every mount/navigation

  endpoints: (builder) => ({


    getEvents: builder.query<any, { page?: number; limit?: number; isPublic?: boolean } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        if (params?.isPublic !== undefined) p.set("isPublic", String(params.isPublic));
        const qs = p.toString();
        return `/v1/events${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Events"],
    }),

    getEventDetails: builder.query<any, string>({
      query: (eventId) => `/v1/events/${eventId}`,
      providesTags: (_, __, id) => [{ type: "Event", id }],
    }),

    //ticket api
    createTicket: builder.mutation<any, { eventId: string; ticketData: any }>({
      query: ({ eventId, ticketData }) => ({
        url: `/v1/events/${eventId}/tickets`,
        method: "POST",
        body: ticketData,
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
      ],
    }),
    updateTicket: builder.mutation<any, { eventId: string; ticketData: any; ticketId: string }>({
      query: ({ eventId, ticketData, ticketId }) => ({
        url: `/v1/events/${eventId}/tickets/${ticketId}`,
        method: "PATCH",
        body: ticketData,
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
      ],
    }),
    deleteTicket: builder.mutation<any, { eventId: string; ticketId: any }>({
      query: ({ eventId, ticketId }) => ({
        url: `/v1/events/${eventId}/tickets/${ticketId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
      ],
    }),
    getTickets: builder.query<any, string>({
      query: (eventId) => `/v1/events/${eventId}/tickets`,
      providesTags: (_, __, id) => [{ type: "Event", id }],
    }),

    //event api

    // Step A of presigned upload flow: get a short-lived upload URL + final CDN URL
    uploadIntent: builder.mutation<
      { success: boolean; data: { uploadUrl: string; fileUrl: string } },
      { filename: string; contentType: string; folder: string }
    >({
      query: (body) => ({
        url: "/v1/events/upload-intent",
        method: "POST",
        body,
      }),
    }),

    createEvent: builder.mutation<any, Record<string, any>>({
      query: (eventData) => ({
        url: "/v1/events",
        method: "POST",
        body: eventData, // plain JSON — files were already streamed to MinIO
      }),
      invalidatesTags: ["Events"],
    }),

    deleteEvent: builder.mutation<any, string>({
      query: (eventId) => ({
        url: `/v1/events/${eventId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Events"],
    }),

    updateEvent: builder.mutation<any, { eventId: string; data: any }>({
      query: ({ eventId, data }) => {
        const filteredData = Object.fromEntries(
          Object.entries(data).filter(([_, value]) => value !== null && value !== undefined)
        );

        return {
          url: `/v1/events/${eventId}`,
          method: "PATCH",
          body: filteredData,
        };
      },
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
      ],
    }),

    /** PATCH /v1/events/:id/status — DRAFT→PUBLISHED, PUBLISHED→CANCELLED or PUBLISHED→ENDED */
    updateEventStatus: builder.mutation<
      any,
      { eventId: string; status: "PUBLISHED" | "CANCELLED" | "ENDED" }
    >({
      query: ({ eventId, status }) => ({
        url: `/v1/events/${eventId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
        "Events",
      ],
    }),




    toggleLikeEvent: builder.mutation<any, string>({
      query: (eventId) => ({
        url: `/events/${eventId}/like`,
        method: "POST",
      }),
      invalidatesTags: ["Event"],
    }),

    toggleBookmarkEvent: builder.mutation<any, string>({
      query: (eventId) => ({
        url: `/events/${eventId}/bookmark`,
        method: "POST",
      }),
    }),

    shareEvent: builder.mutation<any, string>({
      query: (eventId) => ({
        url: `/events/${eventId}/share`,
        method: "POST",
      }),
    }),

    checkin: builder.mutation<any, string>({
      query: (eventId) => ({
        url: `/events/${eventId}/checkin`,
        method: "POST",
      }),
    }),

    rsvp: builder.mutation<any, { eventId: string; status: "CONFIRMED" | "WAITLIST" | "CANCELLED"; ticketTierId?: string }>({
      query: ({ eventId, status, ticketTierId }) => ({
        url: `/v1/events/${eventId}/rsvp`,
        method: "POST",
        body: { status, ...(ticketTierId ? { ticketTierId } : {}) },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Event", id: eventId }],
    }),



    getUpcomingEvents: builder.query<any, void>({
      query: () => "/events/explore/upcoming",
    }),

    getLiveEvents: builder.query<any, void>({
      query: () => "/events/explore/live",
    }),

    getPromotedEvents: builder.query<any, void>({
      query: () => "/events/explore/promoted",
    }),

    explore: builder.query<any, void>({
      query: () => "/events/explore",
    }),

    recommendedEvents: builder.query<any, void>({
      query: () => "/events/for-you",
    }),

    getUserEvents: builder.query<any, void>({
      query: () => "/events/user",
    }),

    /**
     * GET /v1/events/me/created — events the signed-in user organizes.
     *
     * Note the `/v1` prefix, which most queries in this file omit. The backend
     * sets a global `v1` prefix, so the unprefixed ones (including
     * `getUserEvents` above, which targets a route that 404s) never reach a
     * handler. Verified live: `/v1/events/me/created` answers 401,
     * `/events/user` and `/v1/events/user` both 404.
     */
    getMyCreatedEvents: builder.query<
      {
        success: boolean;
        /**
         * Double-nested, and deliberately typed that way. The handler returns
         * `{ data, meta }` for pagination and the global ResponseInterceptor
         * wraps *that* in `{ success, data }` — so the array lives at
         * `response.data.data`. Reading `response.data` gives the envelope, not
         * a list, and `.length` on it is silently `undefined`.
         */
        data: {
          data: { id: string; name: string }[];
          meta: { total: number; page: number; limit: number; hasNext: boolean };
        };
      },
      void
    >({
      // A high limit because this feeds an event picker, not a paged list —
      // the default page size would hide events past the first page.
      query: () => "/v1/events/me/created?limit=100",
    }),







    uploadGalleryMedia: builder.mutation<
      any,
      { eventId: string; media: File | Blob }
    >({
      query: ({ eventId, media }) => {
        const formData = new FormData();
        formData.append("media", media);
        formData.append("type", "image");
        formData.append("tags", `"event","gallery"`);

        return {
          url: `/events/${eventId}/gallery`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Gallery"],
    }),

    getUserGalleryMedia: builder.query<any, string>({
      query: (eventId) => `/events/${eventId}/gallery`,
      providesTags: ["Gallery"],
    }),

    getPromotedGalleryItems: builder.query<
      { message: string; data: IGalleryItem[]; status: string },
      void
    >({
      query: () => "/events/gallery/promoted",
    }),


    sendCustomInvite: builder.mutation<
      any,
      {
        eventId: string;
        subject: string;
        message: string;
        recipientFilter?: string;
      }
    >({
      query: ({ eventId, ...body }) => ({
        url: `/events/${eventId}/messages/invite`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages"],
    }),

    getEventMessages: builder.query<any, string>({
      query: (eventId) => `/events/${eventId}/messages`,
      providesTags: ["Messages"],
    }),

    deleteScheduledMessage: builder.mutation<
      any,
      { eventId: string; messageId: string }
    >({
      query: ({ eventId, messageId }) => ({
        url: `/events/${eventId}/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Messages"],
    }),


    playGame: builder.mutation<
      any,
      {
        eventId: string;
        gameData: { timeSpent: number; score: number };
        gameType: "word-puzzle" | "trivia";
      }
    >({
      query: ({ eventId, ...body }) => ({
        url: `/events/${eventId}/games/play`,
        method: "POST",
        body,
      }),
    }),

    //Games
    createGame: builder.mutation<any, any>({
      query: ({ body, eventId }: { body: any, eventId: string }) => ({
        url: `/v1/events/${eventId}/game-sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { eventId }) => [
        "Games",
        { type: "Event", id: eventId },
        { type: "PublishPreview", id: eventId },
      ],
    }),

    updateGameStatus: builder.mutation<
      any,
      { roundId: string; status: "ACTIVE" | "ENDED" }
    >({
      query: ({ roundId, status }) => ({
        url: `/v1/game-sessions/${roundId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Games"],
    }),

    updateRoundStatus: builder.mutation<
      any,
      { roundId: string; status: "ACTIVE" | "ENDED" }
    >({
      query: ({ roundId, status }) => ({
        url: `/v1/game-rounds/${roundId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Games"],
    }),

    getGames: builder.query<any, string>({
      query: (eventId) => ({
        url: `/v1/events/${eventId}/game-sessions`,
      }),
      providesTags: ["Games"]
    }),

    /** POST /v1/game-sessions/:sessionId/join */
    joinGameSession: builder.mutation<any, string>({
      query: (sessionId) => ({
        url: `/v1/game-sessions/${sessionId}/join`,
        method: "POST",
      }),
      invalidatesTags: ["Games"],
    }),

    /** POST /v1/game-rounds/:roundId/submit */
    submitRoundAnswers: builder.mutation<
      any,
      { roundId: string; answers: (number | string)[]; timeTakenMs?: number }
    >({
      query: ({ roundId, answers, timeTakenMs }) => ({
        url: `/v1/game-rounds/${roundId}/submit`,
        method: "POST",
        body: {
          answers,
          metadata: { timeTakenMs: timeTakenMs ?? 0 },
        },
      }),
    }),

    /** GET /v1/game-sessions/:sessionId — get session details including isJoined */
    getGameSession: builder.query<any, string>({
      query: (sessionId) => `/v1/game-sessions/${sessionId}`,
      providesTags: ["Games"],
    }),

    /** GET /v1/game-rounds/:gameId/participation — check participation status for a game session */
    getGameRoundParticipation: builder.query<any, string>({
      query: (gameId) => `/v1/game-rounds/${gameId}/participation`,
      providesTags: ["Games"],
    }),

    /** GET /v1/game-sessions/:sessionId/leaderboard */
    getSessionLeaderboard: builder.query<any, string>({
      query: (sessionId) => `/v1/game-sessions/${sessionId}/leaderboard`,
      providesTags: ["Games"],
    }),

    /** GET /v1/game-rounds/:roundId/responses — organizer only: free-text responses for a FEEDBACK round */
    getRoundResponses: builder.query<any, string>({
      query: (roundId) => `/v1/game-rounds/${roundId}/responses`,
      providesTags: ["Games"],
    }),

    /** GET /v1/games/t/:token — public: get game session by viral share token */
    getGameSessionByToken: builder.query<any, string>({
      query: (token) => `/v1/games/t/${token}`,
    }),

    /** POST /v1/games/join/:token — public: join a game session via viral share token */
    joinGameSessionByToken: builder.mutation<any, string>({
      query: (token) => ({
        url: `/v1/games/join/${token}`,
        method: "POST",
      }),
    }),

    /** POST /v1/games/anonymous/join/:token — no auth required */
    anonymousJoinGame: builder.mutation<any, { token: string; anonymousId?: string }>({
      query: ({ token, anonymousId }) => ({
        url: `/v1/games/anonymous/join/${token}`,
        method: "POST",
        body: { anonymousId },
      }),
    }),

    /** POST /v1/games/anonymous/rounds/:roundId/submit — no auth required */
    anonymousSubmitRound: builder.mutation<
      any,
      { roundId: string; anonymousId: string; answers?: any[]; metadata?: Record<string, any> }
    >({
      query: ({ roundId, ...body }) => ({
        url: `/v1/games/anonymous/rounds/${roundId}/submit`,
        method: "POST",
        body,
      }),
    }),

    /** POST /v1/games/anonymous/merge — requires auth */
    mergeAnonymousSessions: builder.mutation<
      any,
      { anonymousId: string; confirmedEventIds: string[] }
    >({
      query: (body) => ({
        url: `/v1/games/anonymous/merge`,
        method: "POST",
        body,
      }),
    }),

    /** POST /v1/events/checkin  { qrCode: event.qrCode } */
    checkinEvent: builder.mutation<any, { qrCode: string; eventId: string }>({
      query: ({ qrCode }) => ({
        url: `/v1/events/checkin`,
        method: "POST",
        body: { qrCode },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Event", id: eventId },
        { type: "Event", id: `game-status-${eventId}` },
      ],
    }),

    /** GET /v1/events/:eventId/attendees */
    getEventAttendees: builder.query<any, { eventId: string; page?: number; limit?: number }>({
      query: ({ eventId, page = 1, limit = 20 }) =>
        `/v1/events/${eventId}/attendees?page=${page}&limit=${limit}`,
      providesTags: (_, __, { eventId }) => [{ type: "Event", id: eventId }],
    }),

    createVibeTag: builder.mutation({
      query: ({ eventId, name, imageKey, activityTiming }) => {
        const formData = new FormData();
        formData.append("eventId", eventId as string);
        formData.append("name", name);
        formData.append("imageKey", imageKey);
        formData.append("activityTiming", activityTiming);
        return {
          url: "/v1/vibe-tags",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_, __, { eventId }) => [
        { type: "Gallery", id: `vibetags-${eventId}` },
        { type: "PublishPreview", id: eventId },
      ],
    }),    getVibeTags: builder.query<any, { eventId: string; activityTiming?: string }>({
      query: ({ eventId }) => `/v1/vibe-tags?eventId=${eventId}`,
      providesTags: (_, __, { eventId }) => [{ type: "Gallery", id: `vibetags-${eventId}` }],
    }),

    getEventPostcards: builder.query<any, { eventId: string; phase?: string; page?: number; limit?: number }>({
      query: ({ eventId, phase, page = 1, limit = 20 }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (phase && phase !== "all") params.set("phase", phase);
        return `/v1/events/${eventId}/postcards?${params.toString()}`;
      },
      providesTags: (_, __, { eventId }) => [{ type: "Gallery", id: eventId }],
    }),

    createPostcard: builder.mutation<any, { eventId: string; image: string; caption?: string; vibeTagId?: string }>({
      query: ({ eventId, ...body }) => ({
        url: `/v1/events/${eventId}/postcards`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Gallery", id: eventId }],
    }),

    // Step 1: upload raw files, get back fileKeys
    uploadMultipleFiles: builder.mutation<
      { success: boolean; data: { url: string; fileKey: string; mediaType: string }[] },
      FormData
    >({
      query: (formData) => ({
        url: "/v1/storage/upload-multiple",
        method: "POST",
        body: formData,
      }),
    }),

    // Step 2: create postcards with the returned fileKeys
    createPostcards: builder.mutation<
      any,
      { eventId: string; caption?: string; vibeTagId?: string; media: { fileKey: string; mediaType: string; mediaUrl?: string }[] }
    >({
      query: ({ eventId, vibeTagId, media, caption }) => ({
        url: "/v1/postcards",
        method: "POST",
        body: { eventId, vibeTagId, media, caption },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Gallery", id: eventId }],
    }),

    /** POST /v1/postcards/:id/view — fire-and-forget view tracking */
    trackPostcardView: builder.mutation<
      void,
      { postcardId: string; sessionId?: string | null }
    >({
      query: ({ postcardId, sessionId }) => ({
        url: `/v1/postcards/${postcardId}/view`,
        method: "POST",
        body: { sessionId: sessionId ?? null },
      }),
    }),

    /** POST /v1/postcards/:id/like — toggle like, returns { liked, currentLikes } */
    toggleLikePostcard: builder.mutation<
      { liked: boolean; currentLikes: number },
      { eventId: string; postcardId: string }
    >({
      query: ({ postcardId }) => ({
        url: `/v1/postcards/${postcardId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_, __, { eventId, postcardId }) => [
        { type: "Gallery", id: eventId },
        { type: "Gallery", id: `postcard-${postcardId}` },
      ],
    }),

    /** POST /v1/postcards/:id/comment — add comment, returns comment with author */
    commentOnPostcard: builder.mutation<
      { id: string; content: string; createdAt: string; author: { displayName?: string; username?: string; avatarUrl?: string | null } },
      { postcardId: string; content: string }
    >({
      query: ({ postcardId, content }) => ({
        url: `/v1/postcards/${postcardId}/comment`,
        method: "POST",
        body: { content },
      }),
    }),

    /** GET /v1/postcards/:id/likes — list of likes */
    getPostcardLikes: builder.query<any, string>({
      query: (postcardId) => `/v1/postcards/${postcardId}/likes`,
      providesTags: (_, __, id) => [{ type: "Gallery", id: `likes-${id}` }],
    }),

    /** GET /v1/postcards/:id/comments — list of comments */
    getPostcardComments: builder.query<any, string>({
      query: (postcardId) => `/v1/postcards/${postcardId}/comments`,
      providesTags: (_, __, id) => [{ type: "Gallery", id: `comments-${id}` }],
    }),

    /** GET /v1/postcards/:id — single postcard with likeCount */
    getPostcard: builder.query<any, string>({
      query: (postcardId) => `/v1/postcards/${postcardId}`,
      providesTags: (_, __, id) => [{ type: "Gallery", id: `postcard-${id}` }],
    }),

    /** GET /v1/postcards/event/:eventId/leaderboard — postcard leaderboard, optional ?activityTiming= */
    getPostcardLeaderboard: builder.query<any, { eventId: string; activityTiming?: string }>({
      query: ({ eventId, activityTiming }) => {
        const qs = activityTiming ? `?activityTiming=${activityTiming}` : "";
        return `/v1/postcards/event/${eventId}/leaderboard${qs}`;
      },
      providesTags: (_, __, { eventId }) => [{ type: "Gallery", id: eventId }],
    }),

    // Global postcards feed — /v1/postcards (optionally filtered by eventId or userId)
    getPostcards: builder.query<any, { page?: number; limit?: number; eventId?: string; userId?: string } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.set("page", String(params.page));
        if (params?.limit) p.set("limit", String(params.limit));
        if (params?.eventId) p.set("eventId", params.eventId);
        if (params?.userId) p.set("userId", params.userId);
        const qs = p.toString();
        return `/v1/postcards${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Gallery"],
    }),

    /** GET /v1/postcards/:eventId — total memories (postcards) for an event */
    getEventMemoriesCount: builder.query<any, string>({
      query: (eventId) => `/v1/postcards/${eventId}`,
      providesTags: (_, __, eventId) => [{ type: "Gallery", id: `memories-${eventId}` }],
    }),

    /** GET /v1/events/:eventId/active-game-status — check if user is checked in and get active game info */
    getActiveGameStatus: builder.query<any, string>({
      query: (eventId) => `/v1/events/${eventId}/active-game-status`,
      providesTags: (_, __, eventId) => [{ type: "Event", id: `game-status-${eventId}` }],
    }),

    // ── Event Tags ────────────────────────────────────────────────────────────
    /** POST /v1/events/:id/tags/add — add vibe tags to an event (organizer only, locked once started) */
    addEventTags: builder.mutation<any, { eventId: string; tagIds: string[] }>({
      query: ({ eventId, tagIds }) => ({
        url: `/v1/events/${eventId}/tags/add`,
        method: "POST",
        body: { tagIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Event", id: eventId }],
    }),

    /** POST /v1/events/:id/tags/remove — remove vibe tags from an event (organizer only, locked once started) */
    removeEventTags: builder.mutation<any, { eventId: string; tagIds: string[] }>({
      query: ({ eventId, tagIds }) => ({
        url: `/v1/events/${eventId}/tags/remove`,
        method: "POST",
        body: { tagIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Event", id: eventId }],
    }),

    // ── Game Session CRUD ─────────────────────────────────────────────────────
    /** GET /v1/game-sessions/:id/edit-policy — check if game content is still editable */
    getGameSessionEditPolicy: builder.query<
      { editable: boolean; reason?: string },
      string
    >({
      query: (sessionId) => `/v1/game-sessions/${sessionId}/edit-policy`,
      providesTags: (_, __, id) => [{ type: "Games", id: `policy-${id}` }],
    }),

    /** PATCH /v1/game-sessions/:id — update session-level fields */
    updateGameSession: builder.mutation<
      any,
      { sessionId: string; data: { title?: string; maxWinners?: number; gameDuration?: number } }
    >({
      query: ({ sessionId, data }) => ({
        url: `/v1/game-sessions/${sessionId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Games"],
    }),

    // ── Round management ──────────────────────────────────────────────────────
    /** POST /v1/game-sessions/:id/rounds — add a new round */
    addGameRound: builder.mutation<any, { sessionId: string; data: any }>({
      query: ({ sessionId, data }) => ({
        url: `/v1/game-sessions/${sessionId}/rounds`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Games"],
    }),

    /** PATCH /v1/game-rounds/:id — update a round */
    updateGameRound: builder.mutation<
      any,
      { roundId: string; data: { title?: string; gameType?: string; config?: any; orderIndex?: number } }
    >({
      query: ({ roundId, data }) => ({
        url: `/v1/game-rounds/${roundId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Games"],
    }),

    /** DELETE /v1/game-rounds/:id — delete a round */
    deleteGameRound: builder.mutation<any, string>({
      query: (roundId) => ({
        url: `/v1/game-rounds/${roundId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Games"],
    }),

    // ── Reward Tier management ────────────────────────────────────────────────
    /** POST /v1/game-sessions/:id/reward-tiers — add a reward tier */
    addGameRewardTier: builder.mutation<any, { sessionId: string; data: any }>({
      query: ({ sessionId, data }) => ({
        url: `/v1/game-sessions/${sessionId}/reward-tiers`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Games"],
    }),

    /** PATCH /v1/game-reward-tiers/:id — update a reward tier */
    updateGameRewardTier: builder.mutation<any, { tierId: string; data: any }>({
      query: ({ tierId, data }) => ({
        url: `/v1/game-reward-tiers/${tierId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Games"],
    }),

    /** DELETE /v1/game-reward-tiers/:id — delete a reward tier */
    deleteGameRewardTier: builder.mutation<any, string>({
      query: (tierId) => ({
        url: `/v1/game-reward-tiers/${tierId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Games"],
    }),

    /**
     * GET /v1/organizer-payments/publish-preview/:eventId
     * Returns valid plan options + prices before publishing.
     * Invalidated automatically when games or vibetags are created.
     */
    getPublishPreview: builder.query<any, string>({
      query: (eventId) => `/v1/organizer-payments/publish-preview/${eventId}`,
      providesTags: (_, __, eventId) => [{ type: "PublishPreview", id: eventId }],
    }),

    // ── Postcard Swap ─────────────────────────────────────────────────────────
    /**
     * POST /v1/postcards/:id/swap
     * Replace an existing postcard with new media (used when the 20-media cap is hit).
     * :id is the postcard being REPLACED (not the event).
     * Body is identical to createPostcards.
     * Response is the newly created postcard with a brand-new id.
     */
    swapPostcard: builder.mutation<
      any,
      {
        postcardId: string;
        eventId: string;
        vibeTagId?: string;
        caption?: string;
        media: { fileKey: string; mediaType: string; mediaUrl?: string }[];
      }
    >({
      query: ({ postcardId, eventId, vibeTagId, caption, media }) => ({
        url: `/v1/postcards/${postcardId}/swap`,
        method: "POST",
        body: { eventId, vibeTagId, caption, media },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Gallery", id: eventId }],
    }),

    // ── Withdrawal Requests (DEPRECATED) ──────────────────────────────────────
    /**
     * @deprecated Use `useRequestPayoutMutation` from `./payoutApi` instead.
     *
     * POST /v1/events/:eventId/withdrawals
     */
    requestWithdrawal: builder.mutation<
      { data: WithdrawalRecord },
      { eventId: string; bankName: string; accountNumber: string; accountName: string }
    >({
      query: ({ eventId, bankName, accountNumber, accountName }) => ({
        url: `/v1/events/${eventId}/withdrawals`,
        method: "POST",
        body: { bankName, accountNumber, accountName },
      }),
      invalidatesTags: (_, __, { eventId }) => [{ type: "Withdrawals", id: eventId }],
    }),

    /**
     * @deprecated Use `useGetMyPayoutsQuery` from `./payoutApi` instead.
     *
     * GET /v1/events/:eventId/withdrawals
     */
    getWithdrawals: builder.query<
      { data: WithdrawalRecord[] },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/withdrawals`,
      providesTags: (_, __, eventId) => [{ type: "Withdrawals", id: eventId }],
    }),

  }),
});

export const {
  useGetEventsQuery,
  useGetEventDetailsQuery,
  useDeleteEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useCreateEventMutation,
  useToggleLikeEventMutation,
  useToggleBookmarkEventMutation,
  useShareEventMutation,
  useCheckinMutation,
  useRsvpMutation,
  useGetUpcomingEventsQuery,
  useGetLiveEventsQuery,
  useGetPromotedEventsQuery,
  useExploreQuery,
  useRecommendedEventsQuery,
  useGetUserEventsQuery,
  useGetMyCreatedEventsQuery,
  useUploadGalleryMediaMutation,
  useGetUserGalleryMediaQuery,
  useGetPromotedGalleryItemsQuery,
  useSendCustomInviteMutation,
  useGetEventMessagesQuery,
  useDeleteScheduledMessageMutation,
  usePlayGameMutation,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useGetTicketsQuery,
  useCreateGameMutation,
  useGetGamesQuery,
  useUpdateGameStatusMutation,
  useUpdateRoundStatusMutation,
  useJoinGameSessionMutation,
  useSubmitRoundAnswersMutation,
  useGetSessionLeaderboardQuery,
  useGetRoundResponsesQuery,
  useGetGameSessionQuery,
  useGetGameRoundParticipationQuery,
  useCheckinEventMutation,
  useGetGameSessionByTokenQuery,
  useJoinGameSessionByTokenMutation,
  useCreateVibeTagMutation,
  useGetVibeTagsQuery,
  useGetEventAttendeesQuery,
  useGetEventPostcardsQuery,
  useCreatePostcardMutation,
  useToggleLikePostcardMutation,
  useCommentOnPostcardMutation,
  useGetPostcardQuery,
  useGetPostcardLikesQuery,
  useGetPostcardCommentsQuery,
  useGetPostcardLeaderboardQuery,
  useGetPostcardsQuery,
  useUploadMultipleFilesMutation,
  useCreatePostcardsMutation,
  useGetEventMemoriesCountQuery,
  useGetActiveGameStatusQuery,
  useGetPublishPreviewQuery,
  useUploadIntentMutation,
  useTrackPostcardViewMutation,
  useAnonymousJoinGameMutation,
  useAnonymousSubmitRoundMutation,
  useMergeAnonymousSessionsMutation,
  useAddEventTagsMutation,
  useRemoveEventTagsMutation,
  useGetGameSessionEditPolicyQuery,
  useUpdateGameSessionMutation,
  useAddGameRoundMutation,
  useUpdateGameRoundMutation,
  useDeleteGameRoundMutation,
  useAddGameRewardTierMutation,
  useUpdateGameRewardTierMutation,
  useDeleteGameRewardTierMutation,
  useSwapPostcardMutation,
  useRequestWithdrawalMutation,
  useGetWithdrawalsQuery,
} = eventsApi;