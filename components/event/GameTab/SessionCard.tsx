/**
 * SessionCard
 *
 * Renders a single game session — status, join button, rounds list,
 * and collapsible leaderboard.
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SessionLeaderboard } from './Leaderboard';
import { mapType } from './types';

// ── Game type icon ────────────────────────────────────────────────────────────

const GAME_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  trivia:         'help-circle-outline',
  'word-puzzle':  'grid-outline',
  'two-truths':   'chatbubbles-outline',
  'this-or-that': 'flash-outline',
  feedback:       'chatbubble-ellipses-outline',
};

interface Props {
  session:       any;
  isActive:      boolean;
  isEnded:       boolean;
  isJoined:      boolean;
  isJoining:     boolean;
  eventHasStarted: boolean;
  sessionData:   any;
  playedRounds:  Set<string>;
  onJoin:        () => void;
  onPlay:        (roundId: string) => void;
}

export function SessionCard({
  session,
  isActive,
  isEnded,
  isJoined,
  isJoining,
  eventHasStarted,
  sessionData,
  playedRounds,
  onJoin,
  onPlay,
}: Props) {
  const [showLb, setShowLb] = useState(false);

  const apiPlayed = new Set<string>(
    (sessionData?.rounds ?? []).filter((r: any) => r.hasPlayed).map((r: any) => r.id as string)
  );
  const submittedRounds = new Set([...apiPlayed, ...playedRounds]);
  const isJoinedFinal   = isJoined || (sessionData?.isJoined ?? false);

  const gameType = mapType(session.rounds?.[0]?.gameType ?? 'TRIVIA');
  const icon     = GAME_ICONS[gameType] ?? 'game-controller-outline';

  const feedbackRounds = (session.rounds ?? [])
    .filter((r: any) => mapType(r.gameType) === 'feedback')
    .map((r: any) => ({ id: r.id, title: r.title }));

  return (
    <View style={[sc.card, isActive && sc.cardActive]}>
      {/* ── Header ── */}
      <View style={sc.header}>
        <View style={[sc.iconWrap, isActive && sc.iconWrapActive]}>
          <Ionicons name={icon} size={22} color={isActive ? semantic.success : neutral[500]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={sc.titleRow}>
            <Text style={sc.title} numberOfLines={1}>{session.title}</Text>
            {isActive  && <View style={sc.liveBadge}><Text style={sc.liveBadgeText}>● Live</Text></View>}
            {isEnded   && <View style={sc.endedBadge}><Text style={sc.endedBadgeText}>Ended</Text></View>}
            {!isActive && !isEnded && <View style={sc.pendingBadge}><Text style={sc.pendingBadgeText}>Soon</Text></View>}
          </View>
          <Text style={sc.meta}>
            {session.rounds?.length ?? 0} round{session.rounds?.length !== 1 ? 's' : ''}
            {session._count?.sessionEntries > 0 ? `  ·  ${session._count.sessionEntries} joined` : ''}
          </Text>
        </View>
      </View>

      {/* ── Pending state ── */}
      {!isActive && !isEnded && (
        <View style={sc.pendingNotice}>
          <Text style={sc.pendingNoticeText}>Waiting for the organizer to start this session.</Text>
        </View>
      )}

      {/* ── Main-event gate ── */}
      {isActive && session.mappedPhase === 'main-event' && !eventHasStarted && (
        <View style={sc.gateNotice}>
          <Text style={sc.gateTitle}>Event hasn't started yet</Text>
          <Text style={sc.gateSub}>Main event games unlock when the event begins.</Text>
        </View>
      )}

      {/* ── Active: join + rounds ── */}
      {isActive && (session.mappedPhase !== 'main-event' || eventHasStarted) && (
        <View style={sc.activeBody}>
          {/* Join button */}
          <TouchableOpacity
            style={[sc.joinBtn, isJoinedFinal && sc.joinBtnDone]}
            onPress={onJoin}
            disabled={isJoinedFinal || isJoining}
            activeOpacity={0.85}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isJoinedFinal ? 'checkmark-circle' : 'play'} size={16} color="#fff" />
            )}
            <Text style={sc.joinBtnText}>
              {isJoining ? 'Joining…' : isJoinedFinal ? 'Joined' : 'Join Game'}
            </Text>
          </TouchableOpacity>

          {/* Rounds */}
          {isJoinedFinal && (
            <View style={sc.roundsWrap}>
              <Text style={sc.roundsLabel}>Rounds</Text>
              {(session.rounds ?? []).length === 0 ? (
                <View style={sc.pendingNotice}>
                  <Text style={sc.pendingNoticeText}>Waiting for the organizer to start a round.</Text>
                </View>
              ) : (
                (session.rounds ?? []).map((round: any) => {
                  const isRoundLive  = round.status === 'ACTIVE';
                  const isRoundEnded = round.status === 'ENDED';
                  const played       = submittedRounds.has(round.id);
                  return (
                    <View key={round.id} style={[sc.roundRow, played && sc.roundRowPlayed, isRoundLive && sc.roundRowLive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={sc.roundTitle} numberOfLines={1}>{round.title}</Text>
                        <Text style={sc.roundType}>{round.gameType?.toLowerCase().replace(/_/g, ' ')}</Text>
                      </View>
                      {played ? (
                        <View style={sc.submittedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={brand.primary} />
                          <Text style={sc.submittedBadgeText}>Done</Text>
                        </View>
                      ) : isRoundLive ? (
                        <TouchableOpacity style={sc.playBtn} onPress={() => onPlay(round.id)} activeOpacity={0.85}>
                          <Ionicons name="play" size={12} color="#fff" />
                          <Text style={sc.playBtnText}>Play</Text>
                        </TouchableOpacity>
                      ) : isRoundEnded ? (
                        <View style={sc.endedSmall}><Text style={sc.endedSmallText}>Ended</Text></View>
                      ) : (
                        <View style={sc.waitingBadge}><Text style={sc.waitingBadgeText}>Waiting</Text></View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Leaderboard toggle ── */}
      {(isActive || isEnded) && (
        <View style={sc.lbSection}>
          <TouchableOpacity style={sc.lbToggle} onPress={() => setShowLb((v) => !v)} activeOpacity={0.7}>
            <Ionicons name="trophy-outline" size={16} color="#D97706" />
            <Text style={sc.lbToggleText}>
              {isActive ? 'Live Leaderboard' : 'Final Leaderboard'}
            </Text>
            <Ionicons
              name={showLb ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={neutral[400]}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
          {showLb && (
            <SessionLeaderboard sessionId={session.id} feedbackRounds={feedbackRounds} />
          )}
        </View>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    borderWidth: 1, borderColor: neutral[200], borderRadius: 16,
    padding: 14, backgroundColor: '#fff', gap: 12,
  },
  cardActive: { borderColor: `${semantic.success}40`, backgroundColor: `${semantic.success}05` },

  header:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap:      { width: 44, height: 44, borderRadius: 12, backgroundColor: neutral[100], alignItems: 'center', justifyContent: 'center' },
  iconWrapActive:{ backgroundColor: `${semantic.success}15` },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title:         { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800], flex: 1 },
  meta:          { fontFamily: fontFamily.regular,  fontSize: fontSize.xs,   color: neutral[500], marginTop: 2 },

  liveBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: `${semantic.success}18` },
  liveBadgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: semantic.success },
  endedBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: neutral[100] },
  endedBadgeText:{ fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[500] },
  pendingBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: neutral[100] },
  pendingBadgeText:{ fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[400] },

  pendingNotice: { borderRadius: 12, backgroundColor: neutral[50], padding: 10, alignItems: 'center' },
  pendingNoticeText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400], textAlign: 'center' },

  gateNotice:    { borderRadius: 12, borderWidth: 1, borderColor: `${semantic.warning}30`, backgroundColor: `${semantic.warning}10`, padding: 10 },
  gateTitle:     { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: semantic.warning, textAlign: 'center' },
  gateSub:       { fontFamily: fontFamily.regular,  fontSize: fontSize.xs, color: neutral[500],     textAlign: 'center', marginTop: 2 },

  activeBody:    { gap: 12 },
  joinBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: semantic.success, paddingVertical: 12, borderRadius: 12 },
  joinBtnDone:   { backgroundColor: `${semantic.success}60` },
  joinBtnText:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },

  roundsWrap:  { gap: 8 },
  roundsLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },
  roundRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: neutral[200], borderRadius: 12,
    padding: 10, backgroundColor: neutral[50],
  },
  roundRowPlayed: { borderColor: `${brand.primary}20`, backgroundColor: `${brand.primary}05` },
  roundRowLive:   { borderColor: `${brand.primary}30`, backgroundColor: `${brand.primary}06` },
  roundTitle:     { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  roundType:      { fontFamily: fontFamily.regular,  fontSize: fontSize.xs, color: neutral[500], marginTop: 1, textTransform: 'capitalize' },

  playBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  playBtnText:     { fontFamily: fontFamily.semibold, fontSize: 12, color: '#fff' },
  submittedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: `${brand.primary}30`, backgroundColor: `${brand.primary}08` },
  submittedBadgeText: { fontFamily: fontFamily.semibold, fontSize: 11, color: brand.primary },
  endedSmall:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: neutral[100] },
  endedSmallText:  { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[400] },
  waitingBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: neutral[100] },
  waitingBadgeText:{ fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[400] },

  lbSection: { gap: 8 },
  lbToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: neutral[200], borderRadius: 12, padding: 10,
  },
  lbToggleText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
});
