/**
 * StepSix — Review & publish summary
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ORDINALS, RewardTier, RoundData } from '../types';

const GAME_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  trivia:         'help-circle-outline',
  'word-puzzle':  'grid-outline',
  'two-truths':   'chatbubbles-outline',
  'this-or-that': 'flash-outline',
  feedback:       'chatbubble-outline',
};

const GAME_TYPE_LABELS: Record<string, string> = {
  trivia:         'Trivia',
  'word-puzzle':  'Word Puzzle',
  'two-truths':   '2 Truths & 1 Lie',
  'this-or-that': 'This or That',
  feedback:       'Feedback',
};

const PHASE_LABELS: Record<string, string> = {
  'pre-event':  'Pre-Event',
  'main-event': 'Main Event',
  'post-event': 'Post-Event',
  both:         'Both',
};

const SCHEDULE_LABELS: Record<string, string> = {
  concurrent: 'All at Once',
  daily:      'Daily',
  weekly:     'Weekly',
};

interface Props {
  gameName: string;
  phase: string;
  startsAt: string;
  endsAt: string;
  rounds: number;
  roundsData: RoundData[];
  gameDuration: number;
  maxWinners: number;
  priceCurrency: string;
  scheduleMode: string;
  contentMode: string;
  repetitions: number;
  rewardTiers: RewardTier[];
  handleComplete: () => void;
  isLoading?: boolean;
}

export default function StepSix({
  gameName,
  phase,
  startsAt,
  endsAt,
  rounds,
  roundsData,
  gameDuration,
  maxWinners,
  priceCurrency,
  scheduleMode,
  contentMode,
  repetitions,
  rewardTiers,
  handleComplete,
  isLoading,
}: Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="checkmark-circle-outline" size={32} color={brand.primary} />
        </View>
        <Text style={s.heroTitle}>Ready to publish</Text>
        <Text style={s.heroSub}>
          Review everything before creating your game.
        </Text>
      </View>

      {/* Summary card */}
      <View style={s.summaryCard}>
        <View style={s.summaryHeader}>
          <Text style={s.summaryTitle}>{gameName || 'Untitled Game'}</Text>
          <View style={s.badgeRow}>
            <Pill label={PHASE_LABELS[phase] ?? phase} />
            <Pill label={SCHEDULE_LABELS[scheduleMode] ?? scheduleMode} />
            <Pill label={contentMode === 'ai' ? 'AI Generated' : 'Manual'} />
          </View>
        </View>
        <View style={s.statsRow}>
          <StatBox icon="time-outline"    value={`${gameDuration}s`} label="Per question" />
          <StatBox icon="people-outline"  value={String(maxWinners)}  label="Winners"      />
          <StatBox icon="refresh-outline" value={`${repetitions}×`}   label="Repeats"      />
        </View>
        {startsAt ? (
          <Text style={s.timing}>
            {new Date(startsAt).toLocaleString()} →{' '}
            {endsAt ? new Date(endsAt).toLocaleString() : 'auto'}
          </Text>
        ) : null}
      </View>

      {/* Rounds */}
      <Text style={s.sectionLabel}>
        {rounds} Round{rounds !== 1 ? 's' : ''}
      </Text>
      {roundsData.map((r, i) => {
        const iconName = GAME_TYPE_ICONS[r.gameType] ?? 'game-controller-outline';
        const typeLabel = GAME_TYPE_LABELS[r.gameType] ?? r.gameType;
        const done = r.questions.length > 0;
        return (
          <View key={i} style={s.rowCard}>
            <View style={s.typeIcon}>
              <Ionicons name={iconName} size={16} color={brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{r.title || `Round ${i + 1}`}</Text>
              <Text style={s.rowSub}>
                {typeLabel} · {r.questions.length} question
                {r.questions.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={done ? semantic.success : neutral[300]}
            />
          </View>
        );
      })}

      {/* Rewards */}
      <Text style={[s.sectionLabel, { marginTop: 12 }]}>
        <Ionicons name="trophy" size={13} color="#EAB308" /> Rewards
      </Text>
      {rewardTiers.map((tier, i) => {
        const rankColors = ['#EAB308', '#9CA3AF', '#D97706'];
        const color = rankColors[i] ?? neutral[400];
        return (
          <View key={tier.id} style={s.rowCard}>
            <View style={[s.rankCircle, { backgroundColor: color }]}>
              <Text style={s.rankCircleText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>
                {tier.title || `${ORDINALS[i]} Place`}
              </Text>
              <Text style={s.rowSub}>
                {tier.type}
                {tier.value
                  ? ` · ${tier.type === 'CASH' ? `${priceCurrency} ` : ''}${tier.value}`
                  : ''}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Create button */}
      <TouchableOpacity
        style={[s.createBtn, isLoading && { opacity: 0.7 }]}
        onPress={handleComplete}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={s.createBtnText}>Creating Game…</Text>
          </>
        ) : (
          <>
            <Ionicons name="play-outline" size={18} color="#fff" />
            <Text style={s.createBtnText}>Create Game</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={p.pill}>
      <Text style={p.text}>{label}</Text>
    </View>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={p.statBox}>
      <Ionicons name={icon} size={14} color={neutral[400]} />
      <Text style={p.statValue}>{value}</Text>
      <Text style={p.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 20, gap: 6 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: neutral[800],
  },
  heroSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryHeader: {
    backgroundColor: `${brand.primary}08`,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    gap: 8,
  },
  summaryTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
  },
  timing: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: neutral[0],
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  rowSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 1,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCircleText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  createBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: '#fff',
  },
});

const p = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
});
