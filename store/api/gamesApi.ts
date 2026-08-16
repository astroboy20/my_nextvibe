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
} = gamesApi;
