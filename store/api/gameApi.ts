"use client";

import { GenerateTriviaResponse, GenerateTriviaRequest, GenerateWordPuzzleResponse, GenerateWordPuzzleRequest, GenerateThisOrThatResponse, GenerateThisOrThatRequest, GenerateTwoTruthsOneLieResponse, GenerateTwoTruthsOneLieRequest, IGameData, PlayGameRequest } from "@/types/game.type";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export type RewardType =
    | "CASH" | "COUPON" | "MERCHANDISE" | "FREE_TICKET" | "BADGE" | "POINTS" | "OTHER";

export interface RewardTier {
    id: string;
    rank: number;
    type: RewardType;
    title: string | null;
    description: string | null;
    value: string | null;
}

/**
 * Where a prize has got to. Replaced the `isClaimed` boolean, which couldn't
 * tell a claim the organizer still has to action from one already handed over.
 * WON → CLAIMED → APPROVED → FULFILLED, with REJECTED terminal off CLAIMED.
 */
export type RewardStatus =
    | "WON" | "CLAIMED" | "APPROVED" | "FULFILLED" | "REJECTED";

/**
 * Ordered stages for the attendee's progress bar. REJECTED is deliberately not
 * here — it ends the run rather than sitting on it, so it has no position.
 *
 * `as const` so RewardStage is the four stages and not the whole status union;
 * that way a label map over it is checked for exhaustiveness against exactly
 * the stages the bar renders.
 */
export const REWARD_STAGES = ["WON", "CLAIMED", "APPROVED", "FULFILLED"] as const;
export type RewardStage = (typeof REWARD_STAGES)[number];

export interface Reward {
    id: string;
    gameSessionId: string;
    gameRoundId: string | null;
    userId: string;
    rewardTierId: string;
    status: RewardStatus;
    claimedAt: string | null;
    approvedAt: string | null;
    fulfilledAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    fulfilmentNote: string | null;
    createdAt: string;
    rewardTier: RewardTier;
    gameSession: {
        id: string;
        title: string | null;
        event: { id: string; name: string } | null;
    };
}

interface RewardUser {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    email?: string | null;
}

/** One call powering the whole organizer view. */
export interface EventRewardsOverview {
    event: { id: string; name: string };
    sessions: { id: string; title: string | null; status: string }[];
    availableRewards: (RewardTier & {
        gameSessionId: string | null;
        gameRoundId: string | null;
        quantity: number;
        isAwarded: boolean;
    })[];
    qualifiers: {
        userId: string;
        user: RewardUser;
        gameSessionId: string;
        totalScore: number;
        sessionRank: number | null;
        completedAt: string | null;
    }[];
    winners: {
        rewardId: string;
        user: RewardUser;
        session: { id: string; title: string | null };
        reward: RewardTier;
        status: RewardStatus;
        awardedAt: string;
        claimedAt: string | null;
        approvedAt: string | null;
        fulfilledAt: string | null;
        rejectedAt: string | null;
        rejectionReason: string | null;
        fulfilmentNote: string | null;
    }[];
    counts: {
        awaitingReview: number;
        awaitingHandover: number;
        fulfilled: number;
        unclaimed: number;
    };
}

export interface RewardsResponse {
    success: boolean;
    data: Reward[];
}

export interface ClaimRewardResponse {
    success: boolean;
    data: Reward;
}

export const gamesApi = createApi({
    reducerPath: "gamesApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Game", "LeaderBoard", "Rewards"],
    keepUnusedDataFor: 300,
    endpoints: (build) => ({

        generateTrivia: build.mutation<GenerateTriviaResponse, GenerateTriviaRequest>({
            query: (body) => ({
                url: "/v1/games/trivia/generate",
                method: "POST",
                body,
            }),
        }),

        generateWordPuzzle: build.mutation<GenerateWordPuzzleResponse, GenerateWordPuzzleRequest>({
            query: (body) => ({
                url: "/v1/games/word-puzzle/generate",
                method: "POST",
                body,
            }),
        }),

        generateWordPuzzleFromWords: build.mutation<GenerateWordPuzzleResponse, string[]>({
            query: (words) => ({
                url: "/v1/games/word-puzzle/generate-from-words",
                method: "POST",
                body: { words },
            }),
        }),

        generateThisOrThat: build.mutation<GenerateThisOrThatResponse, GenerateThisOrThatRequest>({
            query: (body) => ({
                url: "/v1/games/this-or-that/generate",
                method: "POST",
                body,
            }),
        }),

        generateTwoTruthsOneLie: build.mutation<GenerateTwoTruthsOneLieResponse, GenerateTwoTruthsOneLieRequest>({
            query: (body) => ({
                url: "/v1/games/two-truths-one-lie/generate",
                method: "POST",
                body,
            }),
        }),


        createGame: build.mutation<IGameData, Partial<IGameData>>({
            query: (body) => ({
                url: "/games",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Game"],
        }),

        updateGame: build.mutation<IGameData, { gameId: string; data: Partial<IGameData> }>({
            query: ({ gameId, data }) => ({
                url: `/games/${gameId}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Game"],
        }),

        deleteGame: build.mutation<{ message: string }, string>({
            query: (gameId) => ({
                url: `/games/${gameId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Game"],
        }),

        getGameById: build.query<IGameData, string>({
            query: (gameId) => `/games/${gameId}`,
            providesTags: ["Game"],
        }),

        getGamesByEventId: build.query<IGameData[], { eventId: string; params?: Record<string, string> }>({
            query: ({ eventId, params }) => {
                const queryString = params ? new URLSearchParams(params).toString() : "";
                return `/events/${eventId}/games${queryString ? `?${queryString}` : ""}`;
            },
            providesTags: ["Game"],
        }),

        getCurrentActiveGameForEvent: build.query<IGameData, string>({
            query: (eventId) => `/events/${eventId}/active-game`,
            providesTags: ["Game"],
        }),

        getEventDetailsFromGameId: build.query<any, string>({
            query: (gameId) => `/games/${gameId}/event-details`,
        }),

        // =======================
        // Play & Leaderboard
        // =======================
        playGame: build.mutation<any, { gameId: string; data: PlayGameRequest }>({
            query: ({ gameId, data }) => ({
                url: `/games/${gameId}/play`,
                method: "POST",
                body: data,
            }),
        }),

        shareGame: build.mutation<any, string>({
            query: (gameId) => ({
                url: `/games/${gameId}/share`,
                method: "POST",
            }),
        }),

        getLeaderBoard: build.query<any, string>({
            query: (gameId) => `/games/${gameId}/leaderboard`,
            providesTags: ["LeaderBoard"],
        }),

        // =======================
        // Rewards (redemption)
        // =======================
        getMyRewards: build.query<RewardsResponse, void>({
            query: () => "/v1/my/rewards",
            providesTags: ["Rewards"],
        }),

        claimReward: build.mutation<ClaimRewardResponse, string>({
            query: (rewardId) => ({
                url: `/v1/rewards/${rewardId}/claim`,
                method: "POST",
            }),
            invalidatesTags: ["Rewards"],
        }),

        // =======================
        // Rewards (organizer)
        // =======================
        getEventRewardsOverview: build.query<
            { success: boolean; data: EventRewardsOverview },
            string
        >({
            query: (eventId) => `/v1/events/${eventId}/rewards/overview`,
            providesTags: ["Rewards"],
        }),

        approveReward: build.mutation<ClaimRewardResponse, string>({
            query: (rewardId) => ({
                url: `/v1/rewards/${rewardId}/approve`,
                method: "PATCH",
            }),
            invalidatesTags: ["Rewards"],
        }),

        fulfilReward: build.mutation<
            ClaimRewardResponse,
            { rewardId: string; fulfilmentNote?: string }
        >({
            query: ({ rewardId, fulfilmentNote }) => ({
                url: `/v1/rewards/${rewardId}/fulfil`,
                method: "PATCH",
                body: { fulfilmentNote },
            }),
            invalidatesTags: ["Rewards"],
        }),

        rejectReward: build.mutation<
            ClaimRewardResponse,
            { rewardId: string; rejectionReason: string }
        >({
            query: ({ rewardId, rejectionReason }) => ({
                url: `/v1/rewards/${rewardId}/reject`,
                method: "PATCH",
                body: { rejectionReason },
            }),
            invalidatesTags: ["Rewards"],
        }),
    }),
});

export const {
    useGenerateTriviaMutation,
    useGenerateWordPuzzleMutation,
    useGenerateWordPuzzleFromWordsMutation,
    useGenerateThisOrThatMutation,
    useGenerateTwoTruthsOneLieMutation,
    useCreateGameMutation,
    useUpdateGameMutation,
    useDeleteGameMutation,
    useGetGameByIdQuery,
    useGetGamesByEventIdQuery,
    useGetCurrentActiveGameForEventQuery,
    useGetEventDetailsFromGameIdQuery,
    usePlayGameMutation,
    useShareGameMutation,
    useGetLeaderBoardQuery,
    useGetMyRewardsQuery,
    useClaimRewardMutation,
    useGetEventRewardsOverviewQuery,
    useApproveRewardMutation,
    useFulfilRewardMutation,
    useRejectRewardMutation,
} = gamesApi;