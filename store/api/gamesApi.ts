import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQuery';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GameRound {
  id: string;
  title: string;
  gameType: string;
  status: string;
  hasPlayed?: boolean;
  config?: {
    questions?: any[];
  };
}

export interface GameSession {
  id: string;
  title: string;
  status: string;
  activityTiming?: string;
  shareToken?: string;
  isJoined?: boolean;
  rounds?: GameRound[];
  _count?: { sessionEntries?: number };
}

export interface LeaderboardEntry {
  rank?: number;
  totalScore?: number;
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  myEntry?: LeaderboardEntry | null;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const gamesApi = createApi({
  reducerPath: 'gamesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Games', 'GameSession', 'Leaderboard'],
  endpoints: (build) => ({

    // GET /v1/events/:eventId/game-sessions
    getGameSessions: build.query<
      { success: boolean; data: GameSession[] },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/game-sessions`,
      providesTags: ['Games'],
    }),

    // GET /v1/game-sessions/:sessionId
    getGameSession: build.query<
      { success: boolean; data: GameSession },
      string
    >({
      query: (sessionId) => `/v1/game-sessions/${sessionId}`,
      providesTags: (_, __, id) => [{ type: 'GameSession', id }],
    }),

    // GET /v1/events/:eventId/active-game-status
    getActiveGameStatus: build.query<
      { success: boolean; data: { isJoined: boolean; session?: { id: string } } },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/active-game-status`,
    }),

    // POST /v1/game-sessions/:sessionId/join
    joinGameSession: build.mutation<
      { success: boolean },
      string
    >({
      query: (sessionId) => ({
        url: `/v1/game-sessions/${sessionId}/join`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, sessionId) => [
        { type: 'GameSession', id: sessionId },
        'Games',
      ],
    }),

    // POST /v1/game-rounds/:roundId/submit
    submitRoundAnswers: build.mutation<
      { success: boolean; data: { score?: number; totalScore?: number } },
      { roundId: string; answers: (number | string)[]; timeTakenMs: number }
    >({
      query: ({ roundId, answers, timeTakenMs }) => ({
        url: `/v1/game-rounds/${roundId}/submit`,
        method: 'POST',
        body: { answers, metadata: { timeTakenMs } },
      }),
      invalidatesTags: ['Leaderboard'],
    }),

    // GET /v1/game-sessions/:sessionId/leaderboard
    getSessionLeaderboard: build.query<
      { success: boolean; data: LeaderboardData },
      string
    >({
      query: (sessionId) => `/v1/game-sessions/${sessionId}/leaderboard`,
      providesTags: (_, __, id) => [{ type: 'Leaderboard', id }],
    }),

    // GET /v1/game-rounds/:roundId/responses  (feedback answers)
    getRoundResponses: build.query<
      { success: boolean; data: { questions: string[]; responses: any[] } },
      string
    >({
      query: (roundId) => `/v1/game-rounds/${roundId}/responses`,
      }),

    // ── Organiser-only endpoints ───────────────────────────────────────────

    // GET /v1/events/:eventId/game-sessions  (organiser list — alias)
    getGames: build.query<
      { success: boolean; data: any[] },
      string
    >({
      query: (eventId) => `/v1/events/${eventId}/game-sessions`,
      providesTags: ['Games'],
    }),

    // POST /v1/events/:eventId/game-sessions
    createGame: build.mutation<
      { success: boolean; data: any },
      { eventId: string; body: Record<string, any> }
    >({
      query: ({ eventId, body }) => ({
        url: `/v1/events/${eventId}/game-sessions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Games'],
    }),

    // PATCH /v1/game-sessions/:sessionId/status
    updateGameStatus: build.mutation<
      { success: boolean },
      { roundId: string; status: 'ACTIVE' | 'ENDED' }
    >({
      query: ({ roundId, status }) => ({
        url: `/v1/game-sessions/${roundId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Games'],
    }),

    // PATCH /v1/game-rounds/:roundId/status
    updateRoundStatus: build.mutation<
      { success: boolean },
      { roundId: string; status: 'ACTIVE' | 'ENDED' }
    >({
      query: ({ roundId, status }) => ({
        url: `/v1/game-rounds/${roundId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Games'],
    }),

    // GET /v1/game-sessions/:sessionId/edit-policy
    getGameSessionEditPolicy: build.query<
      { success: boolean; data: { editable: boolean; reason?: string } },
      string
    >({
      query: (sessionId) => `/v1/game-sessions/${sessionId}/edit-policy`,
    }),

    // PATCH /v1/game-sessions/:sessionId
    updateGameSession: build.mutation<
      { success: boolean },
      { sessionId: string; data: Record<string, any> }
    >({
      query: ({ sessionId, data }) => ({
        url: `/v1/game-sessions/${sessionId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Games'],
    }),

    // POST /v1/events/:eventId/game-sessions/:sessionId/unlock
    initiateAdditionalGamePayment: build.mutation<
      { success: boolean; data: { status: string; checkoutUrl?: string } },
      { eventId: string; gameSessionId: string; couponCode?: string }
    >({
      query: ({ eventId, gameSessionId, couponCode }) => ({
        url: `/v1/events/${eventId}/game-sessions/${gameSessionId}/unlock`,
        method: 'POST',
        body: couponCode ? { couponCode } : {},
      }),
      invalidatesTags: ['Games'],
    }),

    // POST /v1/games/ai/generate-draft
    generateAiDraft: build.mutation<
      { success: boolean; data: any },
      Record<string, any>
    >({
      query: (body) => ({
        url: '/v1/games/ai/generate-draft',
        method: 'POST',
        body,
      }),
    }),

  }),
});

export const {
  useGetGameSessionsQuery,
  useGetGameSessionQuery,
  useGetActiveGameStatusQuery,
  useJoinGameSessionMutation,
  useSubmitRoundAnswersMutation,
  useGetSessionLeaderboardQuery,
  useGetRoundResponsesQuery,
  // Organiser
  useGetGamesQuery,
  useCreateGameMutation,
  useUpdateGameStatusMutation,
  useUpdateRoundStatusMutation,
  useGetGameSessionEditPolicyQuery,
  useUpdateGameSessionMutation,
  useInitiateAdditionalGamePaymentMutation,
  useGenerateAiDraftMutation,
} = gamesApi;
