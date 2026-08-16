/**
 * Leaderboard
 *
 * Shows the session leaderboard and (optionally) feedback round responses.
 */

import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetRoundResponsesQuery, useGetSessionLeaderboardQuery } from '@/store/api/gamesApi';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ── Feedback responses (shown below leaderboard for feedback rounds) ──────────

function RoundResponses({ roundId, title }: { roundId: string; title?: string }) {
  const { data, isLoading } = useGetRoundResponsesQuery(roundId);
  const questions: string[] = data?.data?.questions ?? [];
  const responses: any[]    = data?.data?.responses ?? [];

  if (isLoading) {
    return (
      <View style={r.loader}>
        <ActivityIndicator color={brand.primary} size="small" />
      </View>
    );
  }

  return (
    <View style={r.wrap}>
      <View style={r.titleRow}>
        <Ionicons name="chatbubble-outline" size={13} color={neutral[500]} />
        <Text style={r.title}>{title ?? 'Feedback'} Responses</Text>
      </View>
      {responses.length === 0 ? (
        <Text style={r.empty}>No responses yet</Text>
      ) : (
        responses.map((res, i) => (
          <View key={res.user?.id ?? i} style={r.card}>
            <Text style={r.user}>{res.user?.displayName ?? res.user?.username ?? 'Player'}</Text>
            {questions.map((q, qi) => (
              <View key={qi} style={r.qWrap}>
                <Text style={r.q}>{q}</Text>
                <Text style={r.a}>{res.answers?.[qi] || '—'}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const r = StyleSheet.create({
  loader:   { paddingVertical: 16, alignItems: 'center' },
  wrap:     { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:    { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },
  empty:    { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center', paddingVertical: 16 },
  card:     { borderWidth: 1, borderColor: neutral[200], borderRadius: 12, padding: 12, gap: 6 },
  user:     { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  qWrap:    { gap: 2 },
  q:        { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  a:        { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[700] },
});

// ── Main leaderboard ──────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  feedbackRounds?: { id: string; title?: string }[];
}

export function SessionLeaderboard({ sessionId, feedbackRounds }: Props) {
  const { data, isLoading } = useGetSessionLeaderboardQuery(sessionId);
  const entries = data?.data?.entries ?? [];
  const myEntry = data?.data?.myEntry;

  if (isLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={s.wrap}>
      {entries.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="trophy-outline" size={32} color={neutral[300]} />
          <Text style={s.emptyText}>No scores yet</Text>
          <Text style={s.emptySub}>Scores appear once players submit</Text>
        </View>
      ) : (
        entries.map((e, i) => {
          const isMe   = myEntry && e.user?.id === myEntry.user?.id;
          const rank   = e.rank ?? i + 1;
          const initials = ((e.user?.displayName ?? e.user?.username ?? '?')[0]).toUpperCase();
          return (
            <View key={e.user?.id ?? i} style={[s.row, isMe && s.rowMe]}>
              {/* Rank */}
              <View style={s.rankBox}>
                {rank <= 3 ? (
                  <Text style={s.medal}>{medals[rank - 1]}</Text>
                ) : (
                  <Text style={s.rankNum}>#{rank}</Text>
                )}
              </View>

              {/* Avatar */}
              {e.user?.avatarUrl ? (
                <Image source={{ uri: e.user.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitial}>{initials}</Text>
                </View>
              )}

              {/* Name */}
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>
                  {e.user?.displayName ?? e.user?.username ?? 'Player'}
                  {isMe ? '  (you)' : ''}
                </Text>
                {e.user?.username && e.user?.displayName && (
                  <Text style={s.handle}>@{e.user.username}</Text>
                )}
              </View>

              {/* Score */}
              <Text style={s.score}>{e.totalScore ?? 0} pts</Text>
            </View>
          );
        })
      )}

      {feedbackRounds?.map((fr) => (
        <RoundResponses key={fr.id} roundId={fr.id} title={fr.title} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  loader: { paddingVertical: 24, alignItems: 'center' },
  wrap:   { gap: 8 },
  empty:  { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[500] },
  emptySub:  { fontFamily: fontFamily.regular,  fontSize: fontSize.xs, color: neutral[400] },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: neutral[200], borderRadius: 12, padding: 10,
  },
  rowMe:        { borderColor: `${brand.primary}30`, backgroundColor: `${brand.primary}06` },
  rankBox:      { width: 28, alignItems: 'center' },
  medal:        { fontSize: 18 },
  rankNum:      { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: neutral[500] },
  avatar:       { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${brand.primary}20`, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:  { fontFamily: fontFamily.bold, fontSize: 12, color: brand.primary },
  name:         { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  handle:       { fontFamily: fontFamily.regular,  fontSize: 11, color: neutral[500] },
  score:        { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: brand.primary },
});
