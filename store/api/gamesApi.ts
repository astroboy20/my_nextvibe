/**
 * store/api/gamesApi.ts
 *
 * Compatibility shim — re-exports game-related hooks from the canonical slices
 * (eventApi for game-session management, gameApi for AI generation / rewards).
 *
 * Components that import from "gamesApi" get the correct hooks without any
 * changes to the underlying API definitions.
 */

// ─── Game session hooks (live on eventsApi / eventApi) ────────────────────────
export {
    useAddGameRewardTierMutation, useAddGameRoundMutation, useAnonymousJoinGameMutation,
    useAnonymousSubmitRoundMutation, useCheckinEventMutation, useCreateGameMutation, useDeleteGameRewardTierMutation, useDeleteGameRoundMutation, useGetActiveGameStatusQuery, useGetEventAttendeesQuery, useGetGameRoundParticipationQuery,
    useGetGameSessionByTokenQuery, useGetGameSessionEditPolicyQuery, useGetGameSessionQuery, useGetGamesQuery, useGetRoundResponsesQuery, useGetSessionLeaderboardQuery, useJoinGameSessionByTokenMutation, useJoinGameSessionMutation, useMergeAnonymousSessionsMutation, useSubmitRoundAnswersMutation, useUpdateGameRewardTierMutation, useUpdateGameRoundMutation, useUpdateGameSessionMutation, useUpdateGameStatusMutation,
    useUpdateRoundStatusMutation
} from "./eventApi";

// ─── Game generation / reward hooks (live on gameApi) ────────────────────────
export {
    // gamesApi object — needed by useAuth.ts resetApiState
    gamesApi, useApproveRewardMutation, useClaimRewardMutation, useFulfilRewardMutation, useGenerateThisOrThatMutation, useGenerateTriviaMutation, useGenerateTwoTruthsOneLieMutation, useGenerateWordPuzzleFromWordsMutation, useGenerateWordPuzzleMutation, useGetEventRewardsOverviewQuery, useGetMyRewardsQuery, useRejectRewardMutation
} from "./gameApi";

// ─── Alias: components/edit-event/GamificationHub/GameCreationWizard.tsx ─────
// uses useGenerateAiDraftMutation — map to generateTrivia as a sensible default
// (the wizard will pick the right round type at runtime).
export { useGenerateTriviaMutation as useGenerateAiDraftMutation } from "./gameApi";
