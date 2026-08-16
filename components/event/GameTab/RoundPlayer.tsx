/**
 * RoundPlayer
 *
 * Handles a single game round. Supports:
 *   trivia / two-truths / this-or-that  → multiple-choice
 *   word-puzzle                          → WordPuzzleRoundPlayer
 *   feedback                             → free-text inputs
 *
 * After submission shows a score screen with share button.
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetSessionLeaderboardQuery } from '@/store/api/gamesApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { mapType } from './types';
import { WordPuzzleRoundPlayer } from './WordPuzzle';

// ── Feedback player ───────────────────────────────────────────────────────────

function FeedbackPlayer({
  questions,
  onComplete,
}: {
  questions: any[];
  onComplete: (answers: string[]) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const set = (i: number, v: string) =>
    setAnswers((prev) => { const n = [...prev]; n[i] = v; return n; });

  return (
    <View style={fb.wrap}>
      {questions.map((q, i) => (
        <View key={i} style={fb.item}>
          <Text style={fb.label}>{q.text}</Text>
          <TextInput
            style={fb.input}
            value={answers[i]}
            onChangeText={(v) => set(i, v)}
            placeholder="Type your answer…"
            placeholderTextColor={neutral[400]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      ))}
      <TouchableOpacity style={fb.btn} onPress={() => onComplete(answers)} activeOpacity={0.85}>
        <Text style={fb.btnText}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  );
}

const fb = StyleSheet.create({
  wrap:  { gap: 16 },
  item:  { gap: 6 },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  input: {
    borderWidth: 1, borderColor: neutral[200], borderRadius: 12,
    padding: 12, fontFamily: fontFamily.regular, fontSize: fontSize.sm,
    color: neutral[800], backgroundColor: neutral[50], minHeight: 80,
  },
  btn:     { backgroundColor: brand.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// ── Score screen ──────────────────────────────────────────────────────────────

function ScoreScreen({
  score,
  sessionId,
  sessionTitle,
  eventName,
}: {
  score: number;
  sessionId?: string;
  sessionTitle?: string;
  eventName?: string;
}) {
  const { data } = useGetSessionLeaderboardQuery(sessionId ?? '', { skip: !sessionId });
  const entries  = data?.data?.entries ?? [];
  const myEntry  = data?.data?.myEntry;
  const myRank   = (myEntry?.rank ?? (entries.findIndex((e) => e.user?.id === myEntry?.user?.id) + 1)) || 1;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${score.toLocaleString()} pts and ranked #${myRank} in "${sessionTitle ?? 'the game'}"${eventName ? ` at ${eventName}` : ''}! Can you beat me? 🎮 #NextVibe`,
        title:   `I scored ${score} in ${sessionTitle ?? 'the game'}!`,
      });
    } catch {}
  };

  const medals = ['🥇', '🥈', '🥉'];
  const medal  = myRank <= 3 ? medals[myRank - 1] : '🏆';

  return (
    <View style={sc.wrap}>
      <View style={sc.trophyWrap}>
        <Ionicons name="trophy" size={48} color={brand.primary} />
      </View>
      <Text style={sc.scoreLbl}>Your Score</Text>
      <Text style={sc.score}>{score.toLocaleString()}</Text>
      <Text style={sc.pts}>points</Text>
      {myRank > 0 && (
        <View style={sc.rankPill}>
          <Text style={sc.rankText}>{medal} Rank #{myRank} of {entries.length || 1}</Text>
        </View>
      )}
      <View style={sc.shareCard}>
        <Text style={sc.shareMsg}>
          I played in <Text style={{ fontFamily: fontFamily.bold }}>{eventName ?? sessionTitle}</Text>'s game and scored <Text style={[sc.shareMsg, { color: brand.primary, fontFamily: fontFamily.bold }]}>{score.toLocaleString()}</Text>. Can you beat it?
        </Text>
      </View>
      <TouchableOpacity style={sc.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Ionicons name="share-social-outline" size={16} color="#fff" />
        <Text style={sc.shareBtnText}>Share Score</Text>
      </TouchableOpacity>
    </View>
  );
}

const sc = StyleSheet.create({
  wrap:       { alignItems: 'center', gap: 12, paddingVertical: 24 },
  trophyWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: `${brand.primary}15`, alignItems: 'center', justifyContent: 'center' },
  scoreLbl:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[500], marginTop: 4 },
  score:      { fontFamily: fontFamily.extrabold, fontSize: 52, color: neutral[900], lineHeight: 60 },
  pts:        { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  rankPill:   { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: neutral[100] },
  rankText:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
  shareCard:  { borderRadius: 14, borderWidth: 1, borderColor: `${brand.primary}20`, backgroundColor: `${brand.primary}08`, padding: 14, width: '100%' },
  shareMsg:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], lineHeight: 20 },
  shareBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, marginTop: 4 },
  shareBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// ── Main RoundPlayer ──────────────────────────────────────────────────────────

interface Props {
  round: any;
  session: any;
  eventName?: string;
  onSubmit: (roundId: string, answers: (number | string)[], timeTakenMs: number) => Promise<{ ok: boolean; score?: number }>;
  isSubmitting: boolean;
  onComplete?: (score: number) => void;
}

export function RoundPlayer({ round, session, eventName, onSubmit, isSubmitting, onComplete }: Props) {
  const questions: any[] = round.config?.questions ?? [];
  const gameType = mapType(round.gameType ?? 'TRIVIA');

  const [currentQ,   setCurrentQ]   = useState(0);
  const [answers,    setAnswers]     = useState<(number | string)[]>([]);
  const [flash,      setFlash]       = useState<{ selected: number; correct: number; isCorrect: boolean } | null>(null);
  const [elapsed,    setElapsed]     = useState(0);
  const [finalScore, setFinalScore]  = useState<number | null>(null);
  const [waiting,    setWaiting]     = useState(false);

  const startRef = useRef(Date.now());
  const qStart   = useRef(Date.now());

  // Per-question stopwatch
  useEffect(() => {
    if (flash || finalScore !== null) return;
    setElapsed(0);
    qStart.current = Date.now();
    const iv = setInterval(() =>
      setElapsed(Math.floor((Date.now() - qStart.current) / 1000)), 500);
    return () => clearInterval(iv);
  }, [currentQ, flash, finalScore]);

  const q = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const progress = questions.length > 0 ? (currentQ / questions.length) * 100 : 0;

  const advance = async (idx: number, all: (number | string)[]) => {
    if (!isLast) {
      setCurrentQ((c) => c + 1);
      qStart.current = Date.now();
      setFlash(null);
    } else {
      setFlash(null);
      setWaiting(true);
      const result = await onSubmit(round.id, all, Date.now() - startRef.current);
      if (result.ok) {
        setFinalScore(result.score ?? 0);
        onComplete?.(result.score ?? 0);
      } else {
        Toast.show({ type: 'error', text1: 'Submission failed', text2: 'Please try again.' });
      }
      setWaiting(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (flash) return;
    const correctIdx: number = q?.correctAnswerIndex ?? 0;
    const isCorrect = idx === correctIdx;
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);
    setFlash({ selected: idx, correct: correctIdx, isCorrect });
    setTimeout(() => advance(idx, newAnswers), 800);
  };

  // ── Delegate word-puzzle ───────────────────────────────────────────────────
  if (gameType === 'word-puzzle' && finalScore === null && !waiting) {
    return (
      <WordPuzzleRoundPlayer
        questions={questions}
        onComplete={async (wordAnswers) => {
          setWaiting(true);
          const result = await onSubmit(round.id, wordAnswers, Date.now() - startRef.current);
          if (result.ok) {
            setFinalScore(result.score ?? 0);
            onComplete?.(result.score ?? 0);
          } else {
            Toast.show({ type: 'error', text1: 'Submission failed', text2: 'Please try again.' });
            setWaiting(false);
          }
        }}
      />
    );
  }

  // ── Delegate feedback ──────────────────────────────────────────────────────
  if (gameType === 'feedback' && finalScore === null && !waiting) {
    return (
      <FeedbackPlayer
        questions={questions}
        onComplete={async (fbAnswers) => {
          setWaiting(true);
          const result = await onSubmit(round.id, fbAnswers, Date.now() - startRef.current);
          if (result.ok) {
            setFinalScore(0);
            onComplete?.(0);
          } else {
            Toast.show({ type: 'error', text1: 'Submission failed', text2: 'Please try again.' });
            setWaiting(false);
          }
        }}
      />
    );
  }

  // ── Feedback thank-you ─────────────────────────────────────────────────────
  if (gameType === 'feedback' && finalScore !== null) {
    return (
      <View style={rp.center}>
        <View style={rp.checkWrap}>
          <Ionicons name="checkmark-circle" size={48} color={semantic.success} />
        </View>
        <Text style={rp.thankTitle}>Thanks for your feedback!</Text>
        <Text style={rp.thankSub}>Your answers have been submitted.</Text>
      </View>
    );
  }

  // ── Score screen ───────────────────────────────────────────────────────────
  if (finalScore !== null) {
    return (
      <ScoreScreen
        score={finalScore}
        sessionId={session?.id}
        sessionTitle={session?.title}
        eventName={eventName}
      />
    );
  }

  // ── Submitting spinner ─────────────────────────────────────────────────────
  if (isSubmitting || waiting) {
    return (
      <View style={rp.center}>
        <ActivityIndicator color={brand.primary} size="large" />
        <Text style={rp.submittingText}>Submitting your answers…</Text>
      </View>
    );
  }

  if (!q) {
    return <Text style={rp.noQ}>No questions in this round.</Text>;
  }

  // ── Multiple-choice ────────────────────────────────────────────────────────
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={rp.wrap}>
        {/* Progress */}
        <View style={rp.progressRow}>
          <Text style={rp.progressLabel}>
            Question {currentQ + 1} of {questions.length}
          </Text>
          <Text style={rp.timer}>⏱ {elapsed}s</Text>
        </View>
        <View style={rp.progressTrack}>
          <View style={[rp.progressFill, { width: `${progress}%` as any }]} />
        </View>

        {/* Question */}
        <Text style={rp.question}>{q.text}</Text>

        {/* Options */}
        {q.options && (
          <View style={rp.options}>
            {q.options.map((opt: string, idx: number) => {
              const isSelected  = flash?.selected === idx;
              const isCorrect   = flash ? flash.correct === idx : false;
              const isWrong     = isSelected && !isCorrect;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    rp.option,
                    flash && isCorrect && rp.optionCorrect,
                    flash && isWrong   && rp.optionWrong,
                    flash && !isSelected && !isCorrect && rp.optionDim,
                  ]}
                  onPress={() => handleSelect(idx)}
                  disabled={!!flash}
                  activeOpacity={0.8}
                >
                  <Text style={rp.optionAlpha}>{String.fromCharCode(65 + idx)}.</Text>
                  <Text style={rp.optionText}>{opt}</Text>
                  {flash && isCorrect && <Ionicons name="checkmark-circle" size={16} color={semantic.success} />}
                  {flash && isWrong   && <Ionicons name="close-circle"     size={16} color={semantic.error}   />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const rp = StyleSheet.create({
  wrap:          { gap: 16 },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  timer:         { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: neutral[800] },
  progressTrack: { height: 4, backgroundColor: neutral[100], borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: 4, backgroundColor: brand.primary, borderRadius: 4 },
  question:      { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800], lineHeight: 22 },
  options:       { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: neutral[200], borderRadius: 12,
    padding: 12, backgroundColor: '#fff',
  },
  optionCorrect: { borderColor: semantic.success, backgroundColor: `${semantic.success}12` },
  optionWrong:   { borderColor: semantic.error,   backgroundColor: `${semantic.error}12`   },
  optionDim:     { opacity: 0.4 },
  optionAlpha:   { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[400] },
  optionText:    { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800] },

  center:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  checkWrap:     { width: 72, height: 72, borderRadius: 36, backgroundColor: `${semantic.success}15`, alignItems: 'center', justifyContent: 'center' },
  thankTitle:    { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: neutral[800] },
  thankSub:      { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  submittingText:{ fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  noQ:           { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], paddingVertical: 24 },
});
