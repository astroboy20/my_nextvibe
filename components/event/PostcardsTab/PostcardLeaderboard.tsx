import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetPostcardLeaderboardQuery } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type Phase = 'pre-event' | 'main-event' | 'post-event';

const PHASE_MAP: Record<Phase, string> = {
  'pre-event':  'PRE_EVENT',
  'main-event': 'MAIN_EVENT',
  'post-event': 'POST_EVENT',
};

const PHASES: { value: Phase; label: string }[] = [
  { value: 'pre-event',  label: 'Pre'  },
  { value: 'main-event', label: 'Main' },
  { value: 'post-event', label: 'Post' },
];

interface Props {
  eventId?: string;
}

export function PostcardLeaderboard({ eventId }: Props) {
  const [phase, setPhase] = useState<Phase>('pre-event');

  const { data: leaderboardData, isLoading } = useGetPostcardLeaderboardQuery(
    { eventId: eventId ?? '', activityTiming: PHASE_MAP[phase] },
    { skip: !eventId }
  );

  const leaders = leaderboardData?.data ?? [];

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Ionicons name="trophy" size={16} color="#F59E0B" />
        <Text style={s.cardTitle}>Postcard Leaderboard</Text>
      </View>

      {/* Phase tabs */}
      <View style={s.phaseRow}>
        {PHASES.map((p) => {
          const active = phase === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              style={[s.phaseBtn, active && s.phaseBtnActive]}
              onPress={() => setPhase(p.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.phaseLabel, active && s.phaseLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : leaders.length === 0 ? (
        <Text style={s.emptyText}>No postcards yet for this phase.</Text>
      ) : (
        <View style={s.list}>
          {leaders.map((leader: any, index: number) => {
            const name = leader.author?.displayName ?? leader.author?.username ?? 'User';
            const initial = name.charAt(0).toUpperCase();
            const isTop = index === 0;

            return (
              <View key={leader.id ?? index} style={[s.row, isTop && s.rowTop]}>
                {/* Rank icon */}
                <View style={s.rankWrap}>
                  {index === 0 ? (
                    <Ionicons name="trophy" size={16} color="#F59E0B" />
                  ) : index === 1 ? (
                    <Ionicons name="medal" size={16} color={neutral[400]} />
                  ) : index === 2 ? (
                    <Ionicons name="medal" size={16} color="#92400E" />
                  ) : (
                    <Text style={s.rankNum}>{index + 1}</Text>
                  )}
                </View>

                {/* Avatar */}
                <View style={s.avatarCircle}>
                  <Text style={s.avatarLetter}>{initial}</Text>
                </View>

                {/* Name + comments */}
                <View style={s.nameWrap}>
                  <Text style={s.nameText} numberOfLines={1}>{name}</Text>
                  <Text style={s.subText}>
                    {leader.totalComments ?? leader.commentCount ?? 0} comment
                    {(leader.totalComments ?? leader.commentCount ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Likes */}
                <View style={s.likesWrap}>
                  <Ionicons name="heart" size={13} color={brand.secondary} />
                  <Text style={s.likesText}>
                    {leader.totalLikes ?? leader.likeCount ?? 0}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  cardTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },

  phaseRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  phaseBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: neutral[100],
    alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: brand.primary },
  phaseLabel: { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[500] },
  phaseLabelActive: { color: '#fff' },

  center: { alignItems: 'center', paddingVertical: 24 },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 14,
  },

  list: { paddingHorizontal: 10, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rowTop: { backgroundColor: '#FEF3C720' },

  rankWrap: { width: 24, alignItems: 'center' },
  rankNum: { fontFamily: fontFamily.bold, fontSize: 12, color: neutral[400] },

  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${brand.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fontFamily.bold, fontSize: 13, color: brand.primary },

  nameWrap: { flex: 1, minWidth: 0 },
  nameText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  subText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },

  likesWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likesText: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[700] },
});
