/**
 * GameCreationWizard — RN multi-step game creation flow (6 steps)
 *
 * Step 1 — Basic info (name, rounds)
 * Step 2 — Schedule & settings
 * Step 3 — Content mode & AI prompt per round
 * Step 4 — Question editor per round
 * Step 5 — Reward tiers
 * Step 6 — Review & publish
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useCreateGameMutation, useGenerateAiDraftMutation } from '@/store/api/gamesApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import StepFive from './game-steps/StepFive';
import StepFour from './game-steps/StepFour';
import StepOne from './game-steps/StepOne';
import StepSix from './game-steps/StepSix';
import StepThree from './game-steps/StepThree';
import StepTwo from './game-steps/StepTwo';
import {
  ApiGameType,
  EventPhase,
  GAMETYPE_TO_API,
  GameType,
  ORDINALS,
  PHASE_TO_API,
  Question,
  RewardTier,
  RoundData,
  SCHEDULE_TO_API,
  ScheduleMode,
} from './types';

interface Props {
  onComplete: (game: any) => void;
  onCancel: () => void;
  eventId: string;
  eventName: string;
  eventStartsAt?: string;
}

type ContentMode = 'ai' | 'manual';

export function GameCreationWizard({
  onComplete,
  onCancel,
  eventId,
  eventName,
  eventStartsAt,
}: Props) {
  const totalSteps = 6;

  const [createGame]      = useCreateGameMutation();
  const [generateAiDraft] = useGenerateAiDraftMutation();

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step,            setStep]            = useState(1);
  const [gameName,        setGameName]        = useState('');
  const [numberOfRounds,  setNumberOfRounds]  = useState(1);
  const [phase,           setPhase]           = useState<EventPhase>('main-event');
  const [scheduleMode,    setScheduleMode]    = useState<ScheduleMode>('concurrent');
  const [startsAt,        setStartsAt]        = useState('');
  const [manualGameEndsAt, setManualGameEndsAt] = useState('');
  const [repetitions,     setRepetitions]     = useState(1);
  const [gameDuration,    setGameDuration]    = useState(30);
  const [maxWinners,      setMaxWinners]      = useState(3);
  const [priceCurrency]                       = useState('NGN');
  const [activeRoundIdx,  setActiveRoundIdx]  = useState(0);
  const [contentMode,     setContentMode]     = useState<ContentMode>('ai');
  const [aiPrompt,        setAiPrompt]        = useState<{
    topic: string;
    count: number | null;
    gameType: ApiGameType | '';
    difficulty: string;
    activityTiming: '' | 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT' | 'BOTH';
    eventName: string;
  }>({
    topic: '',
    count: null,
    gameType: 'TRIVIA',
    difficulty: 'easy',
    activityTiming: '',
    eventName,
  });
  const [roundsData,      setRoundsData]      = useState<RoundData[]>([]);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [rewardTiers,     setRewardTiers]     = useState<RewardTier[]>([]);
  const [validationError, setValidationError] = useState('');
  const [step2Errors,     setStep2Errors]     = useState<Partial<{
    startsAt: string;
    gameEndsAt: string;
    gameDuration: string;
    maxWinners: string;
  }>>({});
  const [isLoading,       setIsLoading]       = useState(false);

  // Computed
  const preEventEndsAt = eventStartsAt
    ? new Date(new Date(eventStartsAt).getTime() - 10 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
    : '';
  const gameEndsAt = phase === 'pre-event' ? preEventEndsAt : manualGameEndsAt;
  const maxStartsAt = phase === 'pre-event' ? preEventEndsAt : '';
  const currentRound: RoundData | undefined = roundsData[activeRoundIdx];
  const progress = (step / totalSteps) * 100;

  const STEP_LABELS = [
    'Basic Info',
    'Schedule & Pricing',
    `Round ${activeRoundIdx + 1} of ${numberOfRounds} — Content`,
    `Round ${activeRoundIdx + 1} of ${numberOfRounds} — Questions`,
    'Cash Prizes',
    'Preview',
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const buildInitialRounds = (): RoundData[] =>
    Array.from({ length: numberOfRounds }, (_, i) => ({
      gameType:    roundsData[i]?.gameType    ?? 'trivia',
      title:       roundsData[i]?.title       ?? `Round ${i + 1}`,
      description: roundsData[i]?.description ?? '',
      questions:   roundsData[i]?.questions   ?? [],
    }));

  const updateRoundGameType = (idx: number, type: GameType) => {
    setRoundsData((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], gameType: type, questions: [] };
      return next;
    });
    setAiPrompt((prev) => ({ ...prev, gameType: GAMETYPE_TO_API[type] }));
  };

  const updateRoundMeta = (idx: number, field: 'title' | 'description', value: string) => {
    setRoundsData((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const setRoundQuestions = (idx: number, questions: Question[]) => {
    setRoundsData((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], questions };
      return next;
    });
  };

  const buildRewardTiers = (count: number): RewardTier[] =>
    Array.from({ length: count }, (_, i) => ({
      id:           `tier-${i + 1}`,
      rank:         i + 1,
      type:         'CASH' as const,
      title:        rewardTiers[i]?.title       ?? `${ORDINALS[i] ?? `${i + 1}th`} Place Winner`,
      description:  rewardTiers[i]?.description ?? 'Prize for the top performer.',
      value:        rewardTiers[i]?.value       ?? '',
      discountType: 'PERCENTAGE' as const,
      discountValue: rewardTiers[i]?.discountValue ?? 0,
      usageLimit:   rewardTiers[i]?.usageLimit  ?? 100,
      expiryDate:   rewardTiers[i]?.expiryDate  ?? '',
      quantity:     rewardTiers[i]?.quantity    ?? 1,
    }));

  const updateRewardTier = (id: string, field: keyof RewardTier, value: string | number) => {
    setRewardTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  /**
   * Returns '' if valid, or an error message if invalid.
   * For step 2, also populates per-field errors shown inline on StepTwo.
   */
  const validateStep = (s: number): string => {
    switch (s) {
      case 1: {
        if (!gameName.trim()) return 'Please enter a game name.';
        if (numberOfRounds < 1 || numberOfRounds > 10)
          return 'Rounds must be between 1 and 10.';
        return '';
      }

      case 2: {
        const errs: typeof step2Errors = {};

        if (!startsAt) {
          errs.startsAt = 'Please set a start date and time.';
        } else if (
          phase === 'pre-event' &&
          gameEndsAt &&
          new Date(startsAt) >= new Date(gameEndsAt)
        ) {
          errs.startsAt = 'Game must start before the event begins.';
        }

        if (phase !== 'pre-event') {
          if (!manualGameEndsAt) {
            errs.gameEndsAt = 'Please set an end date and time.';
          } else if (startsAt && new Date(manualGameEndsAt) <= new Date(startsAt)) {
            errs.gameEndsAt = 'End time must be after the start time.';
          }
        }

        if (gameDuration <= 0) {
          errs.gameDuration = 'Please select a question duration.';
        }
        if (maxWinners <= 0) {
          errs.maxWinners = 'Please set at least 1 winner.';
        }

        setStep2Errors(errs);
        const messages = Object.values(errs);
        return messages.length > 0 ? messages[0] : '';
      }

      case 3: {
        if (contentMode === 'ai') {
          if (!aiPrompt.topic.trim()) return 'Please enter a topic for AI generation.';
          if (
            aiPrompt.gameType !== 'WORD_PUZZLE' &&
            (!aiPrompt.count || aiPrompt.count <= 0)
          )
            return 'Please enter a valid question count.';
          if (!aiPrompt.gameType) return 'Please select a game type.';
        }
        return '';
      }

      case 4: {
        if (!roundsData[activeRoundIdx]?.questions?.length)
          return `Round ${activeRoundIdx + 1} has no questions. Please add or generate content.`;
        if (roundsData[activeRoundIdx].gameType === 'word-puzzle') {
          for (const q of roundsData[activeRoundIdx].questions) {
            if (!q.wordPuzzleMeta?.word?.trim() && !q.correctAnswer?.trim())
              return `Round ${activeRoundIdx + 1}: every hidden word needs an answer.`;
          }
          return '';
        }
        for (const q of roundsData[activeRoundIdx].questions) {
          if (!q.question.trim())
            return `Round ${activeRoundIdx + 1}: all questions must have text.`;
          if (q.options?.some((o) => !o.trim()))
            return `Round ${activeRoundIdx + 1}: all answer options must be filled in.`;
        }
        return '';
      }

      case 5: {
        for (const tier of rewardTiers) {
          if (!tier.title.trim()) return `Reward tier #${tier.rank} needs a title.`;
          if (!tier.value)
            return `Set a prize value for the ${ORDINALS[tier.rank - 1] ?? `${tier.rank}th`} place winner.`;
          if (
            (tier.type === 'CASH' || tier.type === 'POINTS') &&
            Number(tier.value) <= 0
          )
            return `${ORDINALS[tier.rank - 1] ?? `${tier.rank}th`} place: enter a valid amount.`;
        }
        return '';
      }

      default:
        return '';
    }
  };

  // ── AI Generation ──────────────────────────────────────────────────────────
  const generateQuestionsWithAI = async (roundIdx: number = activeRoundIdx) => {
    const timingMap: Record<EventPhase, string> = {
      'pre-event':  'PRE_EVENT',
      'main-event': 'DURING_EVENT',
      'post-event': 'POST_EVENT',
      both:         'BOTH',
    };
    const resolvedTiming = timingMap[phase] as 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT' | 'BOTH';
    const resolvedCount = aiPrompt.gameType === 'WORD_PUZZLE' ? 1 : aiPrompt.count;
    const promptToSend = { ...aiPrompt, count: resolvedCount, activityTiming: resolvedTiming };

    setValidationError('');
    setIsGenerating(true);

    try {
      const data = await generateAiDraft(promptToSend).unwrap();
      const inner = (data as any)?.data?.data ?? (data as any)?.data ?? data;
      const gameType = roundsData[roundIdx]?.gameType ?? 'trivia';

      let rawQuestions: any[] = [];
      if (gameType === 'word-puzzle') {
        const puzzleItems: any[] = inner?.rounds?.[0]?.questions ?? inner?.questions ?? [];
        rawQuestions = puzzleItems.flatMap((puzzle: any) => {
          const grid: string[][] = puzzle.grid ?? [];
          const pointsPerWord: number = puzzle.points ?? 10;
          return (puzzle.hiddenWords ?? []).map((hw: any) => ({
            ...hw,
            _grid: grid,
            points: hw.points ?? pointsPerWord,
            timeLimitSecs: puzzle.timeLimitSecs ?? 15,
          }));
        });
      } else {
        rawQuestions = inner?.rounds?.[0]?.questions ?? inner?.questions ?? [];
      }

      if (!rawQuestions.length) throw new Error('AI returned no questions. Try a different topic.');

      const generated: Question[] = rawQuestions.map((q: any, i: number) => {
        const base = { id: `q-${roundIdx}-${i + 1}`, timeLimitSecs: q.timeLimitSecs ?? 15, points: q.points ?? 10 };

        if (gameType === 'word-puzzle') {
          return {
            ...base,
            question:     q.clue ?? '',
            clue:         q.clue ?? '',
            correctAnswer: q.word ?? '',
            wordPuzzleMeta: {
              word:      q.word ?? '',
              grid:      q._grid ?? [],
              startCell: q.startCell ?? null,
              endCell:   q.endCell ?? null,
              direction: q.direction ?? null,
            },
          };
        }

        if (gameType === 'two-truths') {
          const options: string[] = q.options ?? [];
          const lieIndex = q.correctAnswerIndex ?? options.findIndex(
            (o: string) => o.toLowerCase().trim() === (q.correctAnswer ?? q.answer ?? '').toLowerCase().trim()
          );
          const resolvedLie = lieIndex >= 0 ? lieIndex : 0;
          return { ...base, question: q.text ?? q.question ?? '', options, correctAnswerIndex: resolvedLie, correctAnswer: options[resolvedLie] ?? '' };
        }

        if (gameType === 'this-or-that') {
          const tfOptions = ['True', 'False'];
          const correctIdx = q.correctAnswerIndex ?? 0;
          return { ...base, question: q.text ?? q.question ?? '', options: tfOptions, correctAnswerIndex: correctIdx, correctAnswer: tfOptions[correctIdx] };
        }

        const options: string[] = q.options ?? [];
        const cIdx = q.correctAnswerIndex ?? options.findIndex(
          (o: string) => o.toLowerCase().trim() === (q.correctAnswer ?? '').toLowerCase().trim()
        );
        const correctIdx = cIdx >= 0 ? cIdx : 0;
        return { ...base, question: q.text ?? q.question ?? '', options, correctAnswerIndex: correctIdx, correctAnswer: options[correctIdx] ?? '' };
      });

      setRoundQuestions(roundIdx, generated);
      setStep(4);
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message ?? 'AI generation failed. Please try again.';
      Toast.show({ type: 'error', text1: 'AI generation failed', text2: msg });
      setValidationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Question edit helpers ──────────────────────────────────────────────────
  const handleQuestionEdit = (id: string, field: string, value: string | number) => {
    setRoundsData((prev) => {
      const next = [...prev];
      const current = next[activeRoundIdx];
      next[activeRoundIdx] = {
        ...current,
        questions: current.questions.map((q) => {
          if (q.id !== id) return q;
          if (field === 'question') return { ...q, question: value as string, clue: value as string };
          if (field === 'clue')     return { ...q, clue: value as string, question: value as string };
          if (field === 'correctAnswer') return { ...q, correctAnswer: value as string };
          if (field === 'correctAnswerIndex') {
            const newIdx = value as number;
            return { ...q, correctAnswerIndex: newIdx, correctAnswer: q.options?.[newIdx] ?? '' };
          }
          if (field === 'timeLimitSecs') return { ...q, timeLimitSecs: value as number };
          if (field === 'points')        return { ...q, points: value as number };
          return q;
        }),
      };
      return next;
    });
  };

  const handleOptionEdit = (qId: string, optionIndex: number, value: string) => {
    setRoundsData((prev) => {
      const next = [...prev];
      const current = next[activeRoundIdx];
      next[activeRoundIdx] = {
        ...current,
        questions: current.questions.map((q) => {
          if (q.id !== qId || !q.options) return q;
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions, correctAnswer: newOptions[q.correctAnswerIndex ?? 0] ?? q.correctAnswer };
        }),
      };
      return next;
    });
  };

  const regenerateQuestion = async (id: string) => {
    const q = currentRound?.questions.find((q) => q.id === id);
    if (!q) return;
    try {
      const data = await generateAiDraft({ ...aiPrompt, count: 1 }).unwrap();
      const inner = (data as any)?.data?.data ?? (data as any)?.data ?? data;
      const gameType = currentRound?.gameType ?? 'trivia';
      let replacement: any = null;

      if (gameType === 'word-puzzle') {
        const puzzleItems: any[] = inner?.rounds?.[0]?.questions ?? inner?.questions ?? [];
        const firstPuzzle = puzzleItems[0];
        if (firstPuzzle) {
          const hw = firstPuzzle.hiddenWords?.[0];
          if (hw) replacement = { ...hw, _grid: firstPuzzle.grid ?? [], points: hw.points ?? 10, timeLimitSecs: firstPuzzle.timeLimitSecs ?? 15 };
        }
      } else {
        const rawQs: any[] = inner?.rounds?.[0]?.questions ?? inner?.questions ?? [];
        replacement = rawQs[0];
      }

      if (!replacement) throw new Error('No replacement question returned.');

      setRoundQuestions(
        activeRoundIdx,
        currentRound!.questions.map((q) => {
          if (q.id !== id) return q;
          if (gameType === 'word-puzzle') {
            return {
              ...q,
              question:     replacement.clue ?? q.question,
              clue:         replacement.clue ?? q.clue,
              correctAnswer: replacement.word ?? q.correctAnswer,
              wordPuzzleMeta: {
                word:      replacement.word ?? '',
                grid:      replacement._grid ?? [],
                startCell: replacement.startCell ?? null,
                endCell:   replacement.endCell ?? null,
                direction: replacement.direction ?? null,
              },
              timeLimitSecs: replacement.timeLimitSecs ?? q.timeLimitSecs,
            };
          }
          return {
            ...q,
            question:           replacement?.question ?? replacement?.text ?? q.question,
            clue:               replacement?.clue ?? q.clue,
            correctAnswer:      replacement?.correctAnswer ?? q.correctAnswer,
            options:            replacement?.options ?? q.options,
            correctAnswerIndex: replacement?.correctAnswerIndex ?? q.correctAnswerIndex,
            timeLimitSecs:      replacement?.timeLimitSecs ?? q.timeLimitSecs,
          };
        })
      );
    } catch {
      Toast.show({ type: 'error', text1: 'Could not regenerate', text2: 'Please edit the question manually.' });
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const rewardTierPayload = rewardTiers.map(({ id: _id, ...tier }) => ({
        rank:  tier.rank,
        type:  tier.type,
        title: tier.title || `${tier.rank === 1 ? '1st' : tier.rank === 2 ? '2nd' : tier.rank === 3 ? '3rd' : `${tier.rank}th`} Place Winner`,
        description: tier.description || 'Prize for the top performer.',
        value: tier.value,
        ...(tier.type === 'COUPON' && {
          discountType:  tier.discountType,
          discountValue: tier.discountValue,
          usageLimit:    tier.usageLimit,
          expiryDate: tier.expiryDate ? new Date(tier.expiryDate).toISOString() : undefined,
        }),
        quantity: tier.quantity,
      }));

      const payload = {
        title:           gameName,
        scheduleType:    SCHEDULE_TO_API[scheduleMode],
        priceCurrency,
        repetitions,
        startsAt:        startsAt    ? new Date(startsAt).toISOString()    : undefined,
        endsAt:          gameEndsAt  ? new Date(gameEndsAt).toISOString()  : undefined,
        activityTiming:  PHASE_TO_API[phase],
        maxWinners,
        gameDuration,
        basePrice:       0,
        perRoundPrice:   0,
        rewardTiers:     rewardTierPayload,
        rounds: roundsData.map((r, i) => {
          if (r.gameType === 'word-puzzle') {
            const grid = r.questions[0]?.wordPuzzleMeta?.grid ?? [];
            const totalPoints = r.questions.reduce((sum, q) => sum + (q.points ?? 10), 0);
            const hiddenWords = r.questions
              .filter((q) => q.wordPuzzleMeta?.word)
              .map((q) => ({
                word:      q.wordPuzzleMeta!.word,
                startCell: q.wordPuzzleMeta!.startCell,
                endCell:   q.wordPuzzleMeta!.endCell,
                direction: q.wordPuzzleMeta!.direction,
              }));
            return {
              title:       r.title || `Round ${i + 1}`,
              description: r.description,
              gameType:    GAMETYPE_TO_API[r.gameType],
              orderIndex:  i,
              config:      { questions: [{ grid, hiddenWords, points: totalPoints }] },
              rewardTiers: rewardTierPayload,
            };
          }

          if (r.gameType === 'feedback') {
            return {
              title:       r.title || `Round ${i + 1}`,
              description: r.description,
              gameType:    GAMETYPE_TO_API[r.gameType],
              orderIndex:  i,
              config: {
                questions: r.questions.map((q) => ({
                  text:         q.question,
                  timeLimitSecs: q.timeLimitSecs,
                })),
              },
              rewardTiers: [],
            };
          }

          const configQuestions = r.questions.map((q) => {
            const options: string[] = q.options ?? [];
            const correctAnswerIndex =
              q.correctAnswerIndex !== undefined
                ? q.correctAnswerIndex
                : options.findIndex(
                    (o) => o.toLowerCase().trim() === (q.correctAnswer ?? '').toLowerCase().trim()
                  );
            return {
              text:               q.question,
              options,
              correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
              points:             q.points ?? 10,
              timeLimitSecs:      q.timeLimitSecs,
            };
          });

          return {
            title:       r.title || `Round ${i + 1}`,
            description: r.description,
            gameType:    GAMETYPE_TO_API[r.gameType],
            orderIndex:  i,
            config:      { questions: configQuestions },
            rewardTiers: rewardTierPayload,
          };
        }),
      };

      await createGame({ eventId, body: payload }).unwrap();
      Toast.show({ type: 'success', text1: 'Game created!', text2: 'Your game session is ready.' });
      onComplete({});
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.data?.error ?? err?.message ?? 'Failed to create game. Please try again.';
      Toast.show({ type: 'error', text1: 'Creation failed', text2: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setValidationError(err);
      return;                       // inline errors — no Alert needed
    }
    setValidationError('');

    if (step === 1) {
      setRoundsData(buildInitialRounds());
      setActiveRoundIdx(0);
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep2Errors({});           // clear field errors on advance
      setRewardTiers(buildRewardTiers(maxWinners));
      const timingMap: Record<EventPhase, string> = {
        'pre-event':  'PRE_EVENT',
        'main-event': 'DURING_EVENT',
        'post-event': 'POST_EVENT',
        both:         'BOTH',
      };
      const firstRoundType = roundsData[0]?.gameType ?? 'trivia';
      setAiPrompt((prev) => ({
        ...prev,
        activityTiming: timingMap[phase] as any,
        gameType:       GAMETYPE_TO_API[firstRoundType],
      }));
      setStep(3);
      return;
    }

    if (step === 3 && contentMode === 'ai') {
      generateQuestionsWithAI(activeRoundIdx);
      return;
    }

    if (step === 3 && contentMode === 'manual') {
      if (!roundsData[activeRoundIdx]?.questions?.length) setRoundQuestions(activeRoundIdx, []);
      setStep(4);
      return;
    }

    if (step === 4) {
      const nextRound = activeRoundIdx + 1;
      if (nextRound < numberOfRounds) {
        setActiveRoundIdx(nextRound);
        const nextType = roundsData[nextRound]?.gameType ?? 'trivia';
        setAiPrompt((prev) => ({
          ...prev,
          gameType: GAMETYPE_TO_API[nextType],
          topic:    '',
          count:    null,
          difficulty: 'easy',
        }));
        setStep(3);
        return;
      }
      setStep(5);
      return;
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setValidationError('');
    setStep2Errors({});
    if (step === 4 && activeRoundIdx > 0) {
      setActiveRoundIdx((i) => i - 1);
      setStep(4);
      return;
    }
    if (step === 3 && activeRoundIdx > 0) {
      setActiveRoundIdx((i) => i - 1);
      setStep(4);
      return;
    }
    setStep((s) => s - 1);
  };

  const stepLabel = STEP_LABELS[step - 1];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Progress header */}
      <View style={s.progressWrap}>
        <View style={s.progressRow}>
          <Text style={s.stepText}>
            Step {step} of {totalSteps}
          </Text>
          <Text style={s.stepLabel}>{stepLabel}</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </View>

      {/* Validation error */}
      {validationError ? (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={14} color={semantic.error} />
          <Text style={s.errorText}>{validationError}</Text>
        </View>
      ) : null}

      {/* Step content */}
      <View style={s.content}>
        {step === 1 && (
          <StepOne
            gameName={gameName}
            setGameName={setGameName}
            numberOfRounds={numberOfRounds}
            setNumberOfRounds={setNumberOfRounds}
          />
        )}
        {step === 2 && (
          <StepTwo
            phase={phase}
            setPhase={setPhase}
            startsAt={startsAt}
            setStartsAt={setStartsAt}
            maxStartsAt={maxStartsAt}
            gameEndsAt={gameEndsAt}
            setGameEndsAt={setManualGameEndsAt}
            repetitions={repetitions}
            setRepetitions={setRepetitions}
            gameDuration={gameDuration}
            setGameDuration={setGameDuration}
            maxWinners={maxWinners}
            setMaxWinners={setMaxWinners}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            errors={step2Errors}
          />
        )}
        {step === 3 && (
          <StepThree
            roundIndex={activeRoundIdx}
            totalRounds={numberOfRounds}
            roundTitle={roundsData[activeRoundIdx]?.title ?? ''}
            roundDescription={roundsData[activeRoundIdx]?.description ?? ''}
            onRoundTitleChange={(v) => updateRoundMeta(activeRoundIdx, 'title', v)}
            onRoundDescriptionChange={(v) => updateRoundMeta(activeRoundIdx, 'description', v)}
            selectedGameType={roundsData[activeRoundIdx]?.gameType ?? 'trivia'}
            onGameTypeChange={(type) => updateRoundGameType(activeRoundIdx, type)}
            contentMode={contentMode}
            setContentMode={(v) => setContentMode(v as ContentMode)}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
          />
        )}
        {step === 4 && (
          <StepFour
            roundIndex={activeRoundIdx}
            totalRounds={numberOfRounds}
            roundTitle={roundsData[activeRoundIdx]?.title ?? ''}
            contentMode={contentMode}
            questions={currentRound?.questions ?? []}
            generateQuestionsWithAI={() => generateQuestionsWithAI(activeRoundIdx)}
            editingQuestion={editingQuestion}
            handleQuestionEdit={handleQuestionEdit}
            handleOptionEdit={handleOptionEdit}
            setEditingQuestion={setEditingQuestion}
            regenerateQuestion={regenerateQuestion}
            gameType={currentRound?.gameType ?? 'trivia'}
            setQuestions={(qs) => {
              setRoundsData((prev) => {
                const next = [...prev];
                const current = next[activeRoundIdx] ?? { gameType: 'trivia', title: '', description: '', questions: [] };
                const resolved = typeof qs === 'function' ? qs(current.questions) : qs;
                next[activeRoundIdx] = { ...current, questions: resolved };
                return next;
              });
            }}
          />
        )}
        {step === 5 && (
          <StepFive
            rewardTiers={rewardTiers}
            updateRewardTier={updateRewardTier}
            priceCurrency={priceCurrency}
          />
        )}
        {step === 6 && (
          <StepSix
            gameName={gameName}
            phase={phase}
            startsAt={startsAt}
            endsAt={gameEndsAt}
            rounds={numberOfRounds}
            roundsData={roundsData}
            gameDuration={gameDuration}
            maxWinners={maxWinners}
            priceCurrency={priceCurrency}
            scheduleMode={scheduleMode}
            contentMode={contentMode}
            repetitions={repetitions}
            rewardTiers={rewardTiers}
            handleComplete={handleComplete}
            isLoading={isLoading}
          />
        )}
      </View>

      {/* Navigation */}
      <View style={s.navRow}>
        {step > 1 ? (
          <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color={neutral[600]} />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.backBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={s.backBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {step < totalSteps && (
          <TouchableOpacity
            style={[s.nextBtn, isGenerating && { opacity: 0.6 }]}
            onPress={handleNext}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.nextBtnText}>Generating…</Text>
              </>
            ) : step === 3 && contentMode === 'ai' ? (
              <>
                <Ionicons name="sparkles-outline" size={15} color="#fff" />
                <Text style={s.nextBtnText}>Generate Questions</Text>
              </>
            ) : step === 4 && activeRoundIdx + 1 < numberOfRounds ? (
              <>
                <Text style={s.nextBtnText}>Next Round</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </>
            ) : (
              <>
                <Text style={s.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 14 },
  progressWrap: { gap: 6 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  stepLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: neutral[200],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: brand.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${semantic.error}10`,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 16,
  },
  content: { flex: 1 },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: neutral[0],
  },
  backBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  nextBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
