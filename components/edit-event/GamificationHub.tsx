import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

type GameStatus = 'ACTIVE' | 'PENDING' | 'ENDED';

interface Game {
  id: string;
  name: string;
  type: 'TRIVIA' | 'POLL' | 'PREDICTION' | 'LEADERBOARD';
  status: GameStatus;
  playerCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GAME_ICONS: Record<Game['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  TRIVIA:      'help-circle-outline',
  POLL:        'bar-chart-outline',
  PREDICTION:  'trending-up-outline',
  LEADERBOARD: 'trophy-outline',
};

const STATUS_COLOR: Record<GameStatus, string> = {
  ACTIVE:  semantic.success,
  PENDING: semantic.warning,
  ENDED:   neutral[400],
};

const STATUS_BG: Record<GameStatus, string> = {
  ACTIVE:  `${semantic.success}18`,
  PENDING: `${semantic.warning}18`,
  ENDED:   neutral[100],
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_GAMES: Game[] = [
  { id: '1', name: 'Who wins the match?', type: 'PREDICTION',  status: 'ACTIVE',  playerCount: 42 },
  { id: '2', name: 'Fan Trivia Round 1',  type: 'TRIVIA',      status: 'PENDING', playerCount: 0  },
  { id: '3', name: 'Best Goal Poll',      type: 'POLL',        status: 'ENDED',   playerCount: 87 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function GameRow({ game }: { game: Game }) {
  return (
    <View style={s.gameRow}>
      <View style={s.gameIcon}>
        <Ionicons name={GAME_ICONS[game.type]} size={18} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.gameName} numberOfLines={1}>{game.name}</Text>
        <View style={s.gameMeta}>
          <Text style={s.gameType}>{game.type}</Text>
          {game.playerCount > 0 && (
            <>
              <Text style={s.dot}>·</Text>
              <Ionicons name="people-outline" size={11} color={neutral[400]} />
              <Text style={s.gameType}>{game.playerCount}</Text>
            </>
          )}
        </View>
      </View>
      <View style={[s.statusPill, { backgroundColor: STATUS_BG[game.status] }]}>
        <Text style={[s.statusText, { color: STATUS_COLOR[game.status] }]}>
          {game.status}
        </Text>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  eventStatus?: string;
  liveCount?: number;
  onCreateGame?: () => void;
}

export default function GamificationHub({ eventId, eventStatus, liveCount = 0, onCreateGame }: Props) {
  const [games] = useState<Game[]>(MOCK_GAMES);
  const isEnded = eventStatus === 'ENDED' || eventStatus === 'CANCELLED';
  const activeGames = games.filter((g) => g.status === 'ACTIVE');
  const otherGames  = games.filter((g) => g.status !== 'ACTIVE');

  return (
    <View style={s.root}>
      {/* Stats strip */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statValue, { color: semantic.success }]}>
            {activeGames.length}
          </Text>
          <Text style={s.statLabel}>Live</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statValue, { color: brand.primary }]}>
            {games.length}
          </Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statValue, { color: '#9B59B6' }]}>
            {games.reduce((n, g) => n + g.playerCount, 0)}
          </Text>
          <Text style={s.statLabel}>Players</Text>
        </View>
      </View>

      {/* Game list */}
      {games.length > 0 ? (
        <View style={s.list}>
          {[...activeGames, ...otherGames].map((g) => (
            <GameRow key={g.id} game={g} />
          ))}
        </View>
      ) : (
        <View style={s.empty}>
          <Ionicons name="game-controller-outline" size={28} color={neutral[300]} />
          <Text style={s.emptyText}>No games yet</Text>
          <Text style={s.emptySub}>Create a trivia, poll, or prediction game to engage attendees</Text>
        </View>
      )}

      {/* Create button */}
      {!isEnded && (
        <TouchableOpacity
          style={s.createBtn}
          onPress={onCreateGame}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color={brand.primary} />
          <Text style={s.createBtnText}>Create a Game</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 12 },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },

  list: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: 'hidden',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
    backgroundColor: neutral[0],
  },
  gameIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${brand.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dot: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  gameType: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
    lineHeight: 17,
  },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}06`,
  },
  createBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});
