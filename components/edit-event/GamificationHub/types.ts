// ── Shared types for GamificationHub wizard ─────────────────────────────────

export type GameType =
  | 'trivia'
  | 'word-puzzle'
  | 'two-truths'
  | 'this-or-that'
  | 'feedback';
export type GameTypeOrEmpty = '' | GameType;
export type ApiGameType =
  | 'TRIVIA'
  | 'WORD_PUZZLE'
  | 'TWO_TRUTHS_ONE_LIE'
  | 'THIS_OR_THAT'
  | 'FEEDBACK';
export type EventPhase =
  | 'pre-event'
  | 'main-event'
  | 'post-event'
  | 'both';
export type ScheduleMode = 'daily' | 'weekly' | 'concurrent';
export type RewardType =
  | 'CASH'
  | 'COUPON'
  | 'MERCHANDISE'
  | 'FREE_TICKET'
  | 'BADGE'
  | 'POINTS'
  | 'OTHER';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface RewardTier {
  id: string;
  rank: number;
  type: RewardType;
  title: string;
  description: string;
  value: string;
  discountType: DiscountType;
  discountValue: number;
  usageLimit: number;
  expiryDate: string;
  quantity: number;
}

export interface Question {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswer?: string;
  clue?: string;
  wordPuzzleMeta?: {
    word: string;
    grid: string[][];
    startCell: [number, number] | null;
    endCell: [number, number] | null;
    direction: string | null;
  };
  points?: number;
  timeLimitSecs: number;
}

export interface RoundData {
  gameType: GameType;
  title: string;
  description: string;
  questions: Question[];
}

export const PHASE_TO_API: Record<EventPhase, string> = {
  'pre-event':  'PRE_EVENT',
  'main-event': 'DURING_EVENT',
  'post-event': 'POST_EVENT',
  both:         'BOTH',
};

export const SCHEDULE_TO_API: Record<ScheduleMode, string> = {
  concurrent: 'ALL_AT_ONCE',
  daily:      'DAILY',
  weekly:     'WEEKLY',
};

export const GAMETYPE_TO_API: Record<GameType, ApiGameType> = {
  trivia:         'TRIVIA',
  'word-puzzle':  'WORD_PUZZLE',
  'two-truths':   'TWO_TRUTHS_ONE_LIE',
  'this-or-that': 'THIS_OR_THAT',
  feedback:       'FEEDBACK',
};

export const ORDINALS = [
  '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th',
];
