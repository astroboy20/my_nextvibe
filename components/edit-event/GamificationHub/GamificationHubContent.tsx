/**
 * GamificationHubContent — Lists game sessions, starts/ends rounds,
 * shows leaderboard, unlocks over-quota sessions, edits pending sessions.
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
    useGetGameSessionEditPolicyQuery,
    useGetGamesQuery,
    useGetSessionLeaderboardQuery,
    useUpdateGameSessionMutation,
    useUpdateGameStatusMutation,
    useUpdateRoundStatusMutation,
} from '@/store/api/gamesApi';
import {
    useInitiateAdditionalGamePaymentMutation,
} from '@/store/api/organizerPaymentApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { GameCreationWizard } from './GameCreationWizard';

type GameStatus  = 'pending' | 'live' | 'ended';
type GamePhase   = 'pre-event' | 'main-event' | 'post-event' | 'both';
type PhaseFilter = 'all' | 'pre-event' | 'main-event' | 'post-event';

interface Props {
  eventId: string;
  eventName: string;
  eventStartsAt?: string;
  eventStatus?: string;
  hasPayment?: boolean;
  eventPlan?: {
    gamesIncluded: number;
    gamesUsed: number;
    slotsRemaining: number;
    isQuotaExhausted: boolean;
  } | null;
}

// ── Mapping helpers ────────────────────────────────────────────────────────────

const mapStatus = (s: string): GameStatus =>
  ({ PENDING: 'pending', ACTIVE: 'live', ENDED: 'ended' }[s] ?? 'pending') as GameStatus;

const mapPhase = (t: string): GamePhase =>
  ({
    PRE_EVENT:     'pre-event',
    DURING_EVENT:  'main-event',
    POST_EVENT:    'post-event',
    BOTH:          'both',
  }[t] ?? 'main-event') as GamePhase;

const GAME_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  TRIVIA:              'help-circle-outline',
  WORD_PUZZLE:         'grid-outline',
  TWO_TRUTHS_ONE_LIE:  'chatbubbles-outline',
  THIS_OR_THAT:        'flash-outline',
  FEEDBACK:            'chatbubble-outline',
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function GamificationHubContent({
  eventId,
  eventName,
  eventStartsAt,
  hasPayment = false,
  eventPlan,
}: Props) {
  const [phaseFilter,      setPhaseFilter]      = useState<PhaseFilter>('all');
  const [showWizard,       setShowWizard]        = useState(false);
  const [expandedSession,  setExpandedSession]   = useState<string | null>(null);
  const [editingSession,   setEditingSession]    = useState<any | null>(null);
  const [unlockingGameId,  setUnlockingGameId]   = useState<string | null>(null);
  const [couponCode,       setCouponCode]        = useState('');
  const [showUnlockModal,  setShowUnlockModal]   = useState(false);

  const { data: gamesDetails, isLoading, isError } = useGetGamesQuery(eventId);
  const [updateSessionStatus, { isLoading: isUpdatingSession }] = useUpdateGameStatusMutation();
  const [updateRoundStatus,   { isLoading: isUpdatingRound }]   = useUpdateRoundStatusMutation();
  const [initiatePayment,     { isLoading: isUnlocking }]       = useInitiateAdditionalGamePaymentMutation();

  const games = ((gamesDetails as any)?.data ?? []).map((game: any, index: number) => ({
    ...game,
    mappedStatus: mapStatus(game.status),
    mappedPhase:  mapPhase(game.activityTiming),
    isLocked:
      eventPlan != null &&
      index >= (eventPlan.gamesIncluded ?? Infinity) &&
      game.status === 'PENDING',
  }));

  const filteredGames =
    phaseFilter === 'all'
      ? games
      : games.filter(
          (g: any) => g.mappedPhase === phaseFilter || g.mappedPhase === 'both'
        );

  const handleSessionAction = async (sessionId: string, action: 'ACTIVE' | 'ENDED') => {
    try {
      await updateSessionStatus({ roundId: sessionId, status: action }).unwrap();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.data?.error?.message ?? 'Failed to update session status.' });
    }
  };

  const handleRoundAction = async (roundId: string, action: 'ACTIVE' | 'ENDED') => {
    try {
      await updateRoundStatus({ roundId, status: action }).unwrap();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update round status.' });
    }
  };

  const handleUnlockGame = async (gameSessionId: string, withCoupon?: string) => {
    try {
      const res = await initiatePayment({
        eventId,
        gameSessionId,
        ...(withCoupon ? { couponCode: withCoupon } : {}),
      }).unwrap();
      const { status, checkoutUrl } = (res as any).data;
      if (status === 'COMPLETED' || !checkoutUrl) {
        Toast.show({ type: 'success', text1: 'Game unlocked!', text2: 'Activating session…' });
        setShowUnlockModal(false);
        const unlockedId = unlockingGameId;
        setUnlockingGameId(null);
        setCouponCode('');
        if (unlockedId) await handleSessionAction(unlockedId, 'ACTIVE');
      } else {
        // Open checkout URL — show a toast with the link
        Toast.show({ type: 'info', text1: 'Payment required', text2: 'Opening checkout…' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Payment failed', text2: err?.data?.message ?? 'Failed to initiate unlock payment.' });
    }
  };

  const openUnlockModal = (gameId: string) => {
    setUnlockingGameId(gameId);
    setShowUnlockModal(true);
  };

  return (
    <View>
      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color="#92400E" />
        <Text style={s.disclaimerText}>
          Games cannot be edited after payment has been made.
        </Text>
      </View>

      {/* Add game button */}
      <TouchableOpacity
        style={s.addBtn}
        onPress={() => setShowWizard(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={15} color="#fff" />
        <Text style={s.addBtnText}>Add Game Session</Text>
      </TouchableOpacity>

      {/* Plan quota */}
      {eventPlan != null && (
        <View style={[s.quotaRow, eventPlan.isQuotaExhausted && s.quotaRowWarn]}>
          <Ionicons name="game-controller-outline" size={12} color={eventPlan.isQuotaExhausted ? '#92400E' : neutral[400]} />
          <Text style={[s.quotaText, eventPlan.isQuotaExhausted && s.quotaTextWarn]}>
            Plan:{' '}
            <Text style={s.quotaBold}>
              {eventPlan.gamesUsed}/{eventPlan.gamesIncluded}
            </Text>{' '}
            game slots used ·{' '}
            {eventPlan.isQuotaExhausted
              ? 'Quota full — new sessions need payment'
              : `${eventPlan.slotsRemaining} slot${eventPlan.slotsRemaining !== 1 ? 's' : ''} remaining`}
          </Text>
        </View>
      )}

      {/* Phase filter tabs */}
      <PhaseFilterTabs active={phaseFilter} onChange={setPhaseFilter} />

      {/* Loading / error */}
      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator color={brand.primary} />
          <Text style={s.loadingText}>Loading sessions…</Text>
        </View>
      )}
      {isError && (
        <Text style={s.errorText}>Failed to load games.</Text>
      )}

      {/* Empty */}
      {!isLoading && !isError && filteredGames.length === 0 && (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="game-controller-outline" size={24} color={neutral[400]} />
          </View>
          <Text style={s.emptyTitle}>No game sessions yet</Text>
          <Text style={s.emptySub}>Add a session to engage attendees</Text>
        </View>
      )}

      {/* Sessions list */}
      {filteredGames.map((game: any) => (
        <GameSessionCard
          key={game.id}
          game={game}
          isExpanded={expandedSession === game.id}
          onToggle={() => setExpandedSession(expandedSession === game.id ? null : game.id)}
          isUpdatingSession={isUpdatingSession}
          isUpdatingRound={isUpdatingRound}
          isUnlocking={isUnlocking}
          hasPayment={hasPayment}
          onStart={() => handleSessionAction(game.id, 'ACTIVE')}
          onEnd={() => handleSessionAction(game.id, 'ENDED')}
          onUnlock={() => openUnlockModal(game.id)}
          onEdit={() => setEditingSession(game)}
          onStartRound={(id) => handleRoundAction(id, 'ACTIVE')}
          onEndRound={(id) => handleRoundAction(id, 'ENDED')}
        />
      ))}

      {/* ── Game creation wizard modal ── */}
      <Modal
        visible={showWizard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWizard(false)}
      >
        <SafeAreaView style={wiz.safe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            {/* Drag handle */}
            <View style={wiz.handle} />

            {/* Header */}
            <View style={wiz.header}>
              <View style={{ flex: 1 }}>
                <Text style={wiz.title}>Create Game Session</Text>
                <Text style={wiz.subtitle}>
                  Set up a new game for your event attendees
                </Text>
              </View>
              <TouchableOpacity
                style={wiz.closeBtn}
                onPress={() => setShowWizard(false)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={neutral[600]} />
              </TouchableOpacity>
            </View>

            {/* Wizard content */}
            <View style={wiz.body}>
              <GameCreationWizard
                key={String(showWizard)}
                eventId={eventId}
                eventName={eventName}
                eventStartsAt={eventStartsAt}
                onComplete={() => setShowWizard(false)}
                onCancel={() => setShowWizard(false)}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit session modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          isPaymentLocked={hasPayment}
          onClose={() => setEditingSession(null)}
        />
      )}

      {/* Unlock modal */}
      <Modal
        visible={showUnlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnlockModal(false)}
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.header}>
              <Ionicons name="lock-open-outline" size={20} color="#D97706" />
              <Text style={m.title}>Unlock Game Session</Text>
            </View>
            <Text style={m.body}>
              This game session is over your plan quota. Pay to unlock it for players.
            </Text>
            <Text style={m.fieldLabel}>Coupon Code (optional)</Text>
            <TextInput
              style={m.input}
              placeholder="Enter coupon code"
              placeholderTextColor={neutral[400]}
              value={couponCode}
              onChangeText={setCouponCode}
            />
            <View style={m.btnRow}>
              <TouchableOpacity
                style={m.cancelBtn}
                onPress={() => { setShowUnlockModal(false); setUnlockingGameId(null); setCouponCode(''); }}
                activeOpacity={0.8}
              >
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.payBtn, isUnlocking && { opacity: 0.6 }]}
                disabled={isUnlocking || !unlockingGameId}
                onPress={() => unlockingGameId && handleUnlockGame(unlockingGameId, couponCode.trim() || undefined)}
                activeOpacity={0.8}
              >
                {isUnlocking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={m.payText}>Pay & Unlock</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={m.hint}>
              Pricing is based on your event tier. Payment opens inline.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Game session card ──────────────────────────────────────────────────────────

function GameSessionCard({
  game,
  isExpanded,
  onToggle,
  isUpdatingSession,
  isUpdatingRound,
  isUnlocking,
  hasPayment,
  onStart,
  onEnd,
  onUnlock,
  onEdit,
  onStartRound,
  onEndRound,
}: {
  game: any;
  isExpanded: boolean;
  onToggle: () => void;
  isUpdatingSession: boolean;
  isUpdatingRound: boolean;
  isUnlocking: boolean;
  hasPayment: boolean;
  onStart: () => void;
  onEnd: () => void;
  onUnlock: () => void;
  onEdit: () => void;
  onStartRound: (id: string) => void;
  onEndRound: (id: string) => void;
}) {
  const iconName = GAME_TYPE_ICONS[game.rounds?.[0]?.gameType ?? ''] ?? 'game-controller-outline';
  const topReward = game.rewardTiers?.find((r: any) => r.rank === 1);
  const isLive = game.mappedStatus === 'live';

  return (
    <View style={[gc.card, isLive && gc.cardLive]}>
      {/* Header row */}
      <View style={gc.headerRow}>
        <View style={[gc.typeIcon, isLive && gc.typeIconLive]}>
          <Ionicons name={iconName} size={18} color={isLive ? semantic.success : neutral[400]} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={gc.titleRow}>
            <Text style={gc.sessionTitle} numberOfLines={1}>{game.title}</Text>
            <StatusChip status={game.mappedStatus} />
            {game.isLocked && (
              <View style={gc.lockedChip}>
                <Ionicons name="lock-closed-outline" size={10} color="#D97706" />
                <Text style={gc.lockedChipText}>Locked</Text>
              </View>
            )}
          </View>
          <PhaseChip phase={game.mappedPhase} />
          <View style={gc.metaRow}>
            <Ionicons name="time-outline" size={11} color={neutral[400]} />
            <Text style={gc.metaText}>
              {game.rounds?.length ?? 0} round{game.rounds?.length !== 1 ? 's' : ''}
            </Text>
            {game._count?.sessionEntries > 0 && (
              <>
                <Ionicons name="people-outline" size={11} color={neutral[400]} />
                <Text style={gc.metaText}>{game._count.sessionEntries} joined</Text>
              </>
            )}
            {topReward && (
              <>
                <Ionicons name="trophy-outline" size={11} color="#D97706" />
                <Text style={[gc.metaText, { color: '#D97706' }]}>
                  {topReward.value
                    ? `${game.priceCurrency ?? ''} ${topReward.value}`
                    : topReward.type}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={gc.controls}>
          {game.mappedStatus === 'pending' && !hasPayment && (
            <TouchableOpacity style={gc.iconBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={15} color={neutral[500]} />
            </TouchableOpacity>
          )}
          {game.mappedStatus === 'pending' && (
            game.isLocked ? (
              <TouchableOpacity
                style={[gc.actionBtn, gc.unlockBtn]}
                onPress={onUnlock}
                disabled={isUnlocking}
                activeOpacity={0.8}
              >
                {isUnlocking
                  ? <ActivityIndicator size="small" color="#D97706" />
                  : <><Ionicons name="lock-open-outline" size={12} color="#D97706" /><Text style={gc.unlockText}>Unlock</Text></>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[gc.actionBtn, gc.startBtn]}
                onPress={onStart}
                disabled={isUpdatingSession}
                activeOpacity={0.8}
              >
                {isUpdatingSession
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="play" size={12} color="#fff" /><Text style={gc.startText}>Start</Text></>
                }
              </TouchableOpacity>
            )
          )}
          {isLive && (
            <TouchableOpacity
              style={[gc.actionBtn, gc.endBtn]}
              onPress={onEnd}
              disabled={isUpdatingSession}
              activeOpacity={0.8}
            >
              {isUpdatingSession
                ? <ActivityIndicator size="small" color={semantic.error} />
                : <><Ionicons name="stop" size={12} color={semantic.error} /><Text style={gc.endText}>End</Text></>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity style={gc.iconBtn} onPress={onToggle}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={neutral[400]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded: rounds + leaderboard */}
      {isExpanded && (
        <View style={gc.expanded}>
          {/* Rounds */}
          {game.rounds?.length > 0 && (
            <View style={gc.expandSection}>
              <Text style={gc.expandSectionTitle}>Rounds</Text>
              {game.rounds.map((round: any, idx: number) => {
                const roundStatus = mapStatus(round.status ?? 'PENDING');
                return (
                  <View key={round.id} style={gc.roundRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={gc.roundTitle}>
                        Round {idx + 1}: {round.title}
                      </Text>
                      <Text style={gc.roundSub}>
                        {round.gameType?.toLowerCase().replace('_', ' ')}
                      </Text>
                    </View>
                    <StatusChip status={roundStatus} />
                    {roundStatus === 'pending' && game.mappedStatus === 'live' && (
                      <TouchableOpacity
                        style={[gc.actionBtn, gc.startBtn]}
                        onPress={() => onStartRound(round.id)}
                        disabled={isUpdatingRound}
                        activeOpacity={0.8}
                      >
                        {isUpdatingRound
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <><Ionicons name="play" size={11} color="#fff" /><Text style={gc.startText}>Start</Text></>
                        }
                      </TouchableOpacity>
                    )}
                    {roundStatus === 'live' && (
                      <TouchableOpacity
                        style={[gc.actionBtn, gc.endBtn]}
                        onPress={() => onEndRound(round.id)}
                        disabled={isUpdatingRound}
                        activeOpacity={0.8}
                      >
                        {isUpdatingRound
                          ? <ActivityIndicator size="small" color={semantic.error} />
                          : <><Ionicons name="stop" size={11} color={semantic.error} /><Text style={gc.endText}>End</Text></>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Leaderboard */}
          <View style={gc.expandSection}>
            <Text style={gc.expandSectionTitle}>
              <Ionicons name="trophy-outline" size={12} color="#EAB308" /> Leaderboard
            </Text>
            <SessionLeaderboard sessionId={game.id} />
          </View>
        </View>
      )}
    </View>
  );
}

// ── Session Leaderboard ────────────────────────────────────────────────────────

function SessionLeaderboard({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useGetSessionLeaderboardQuery(sessionId);
  const entries: any[] = (data as any)?.data?.entries ?? (data as any)?.data ?? [];
  const myEntry: any  = (data as any)?.data?.myEntry ?? null;

  if (isLoading) {
    return (
      <View style={lb.centered}>
        <ActivityIndicator size="small" color={brand.primary} />
      </View>
    );
  }

  if (!entries.length) {
    return (
      <View style={lb.emptyWrap}>
        <Ionicons name="trophy-outline" size={20} color={neutral[300]} />
        <Text style={lb.emptyText}>No entries yet</Text>
        <Text style={lb.emptyHint}>Scores will appear here once players submit answers</Text>
      </View>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={lb.list}>
      {entries.slice(0, 5).map((e: any, i: number) => {
        const isMe = myEntry && e.user?.id === myEntry.user?.id;
        return (
          <View key={e.user?.id ?? i} style={[lb.row, isMe && lb.rowMe]}>
            <Text style={lb.rank}>{medals[i] ?? `#${i + 1}`}</Text>
            <Text style={lb.name} numberOfLines={1}>
              {e.user?.displayName ?? e.user?.username ?? 'Player'}
              {isMe && <Text style={lb.you}> (you)</Text>}
            </Text>
            <Text style={lb.score}>{e.totalScore ?? 0} pts</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Edit Session Modal ─────────────────────────────────────────────────────────

function EditSessionModal({
  session,
  isPaymentLocked,
  onClose,
}: {
  session: any;
  isPaymentLocked: boolean;
  onClose: () => void;
}) {
  const { data: policyData, isLoading: isPolicyLoading } =
    useGetGameSessionEditPolicyQuery(session.id);
  const [updateGameSession, { isLoading: isSaving }] = useUpdateGameSessionMutation();

  const policy = (policyData as any)?.data as { editable: boolean; reason?: string } | undefined;
  const isEditable = !isPaymentLocked && !isPolicyLoading && policy?.editable !== false;

  const [title,        setTitle]        = useState(session.title ?? '');
  const [maxWinners,   setMaxWinners]   = useState(String(session.maxWinners ?? ''));
  const [gameDuration, setGameDuration] = useState(String(session.gameDuration ?? ''));

  useEffect(() => {
    setTitle(session.title ?? '');
    setMaxWinners(String(session.maxWinners ?? ''));
    setGameDuration(String(session.gameDuration ?? ''));
  }, [session]);

  const handleSave = async () => {
    try {
      const body: Record<string, any> = {};
      if (title.trim()) body.title = title.trim();
      if (maxWinners)   body.maxWinners   = Number(maxWinners);
      if (gameDuration) body.gameDuration = Number(gameDuration);
      await updateGameSession({ sessionId: session.id, data: body }).unwrap();
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Game session updated.' });
      onClose();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.data?.message ?? 'Failed to update game session.' });
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.header}>
            <Ionicons name="create-outline" size={18} color={neutral[600]} />
            <Text style={m.title}>Edit Game Session</Text>
          </View>

          {isPolicyLoading ? (
            <ActivityIndicator color={brand.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ gap: 12 }}>
              {/* Disclaimer */}
              <View style={m.infoRow}>
                <Ionicons name="alert-circle-outline" size={12} color="#D97706" />
                <Text style={m.infoText}>Games cannot be edited after payment has been made.</Text>
              </View>

              {/* Lock banner */}
              {isPaymentLocked && (
                <View style={m.lockRow}>
                  <Ionicons name="lock-closed-outline" size={12} color={semantic.error} />
                  <Text style={m.lockText}>Games cannot be edited after payment has been made.</Text>
                </View>
              )}
              {!isEditable && !isPaymentLocked && policy?.reason && (
                <View style={m.lockRow}>
                  <Ionicons name="lock-closed-outline" size={12} color={semantic.error} />
                  <Text style={m.lockText}>{policy.reason}</Text>
                </View>
              )}

              <View style={{ gap: 4 }}>
                <Text style={m.fieldLabel}>Title</Text>
                <TextInput
                  style={[m.input, !isEditable && m.inputDisabled]}
                  value={title}
                  onChangeText={isEditable ? setTitle : undefined}
                  editable={isEditable}
                  placeholder="Session title"
                  placeholderTextColor={neutral[400]}
                />
              </View>

              <View style={m.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={m.fieldLabel}>Max Winners</Text>
                  <TextInput
                    style={[m.input, !isEditable && m.inputDisabled]}
                    value={maxWinners}
                    onChangeText={isEditable ? setMaxWinners : undefined}
                    editable={isEditable}
                    keyboardType="number-pad"
                    placeholder="e.g. 5"
                    placeholderTextColor={neutral[400]}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={m.fieldLabel}>Duration (min)</Text>
                  <TextInput
                    style={[m.input, !isEditable && m.inputDisabled]}
                    value={gameDuration}
                    onChangeText={isEditable ? setGameDuration : undefined}
                    editable={isEditable}
                    keyboardType="number-pad"
                    placeholder="e.g. 45"
                    placeholderTextColor={neutral[400]}
                  />
                </View>
              </View>

              <View style={m.btnRow}>
                <TouchableOpacity style={m.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={m.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[m.payBtn, (!isEditable || isSaving) && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!isEditable || isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={m.payText}>Save Changes</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Phase filter tabs ──────────────────────────────────────────────────────────

function PhaseFilterTabs({
  active,
  onChange,
}: {
  active: PhaseFilter;
  onChange: (v: PhaseFilter) => void;
}) {
  const tabs: { value: PhaseFilter; label: string }[] = [
    { value: 'all',        label: 'All' },
    { value: 'pre-event',  label: 'Pre-Event' },
    { value: 'main-event', label: 'Main Event' },
    { value: 'post-event', label: 'Post-Event' },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12 }}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
    >
      {tabs.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <TouchableOpacity
            key={value}
            style={[ft.tab, isActive && ft.tabActive]}
            onPress={() => onChange(value)}
            activeOpacity={0.7}
          >
            <Text style={[ft.tabText, isActive && ft.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Status & phase chips ───────────────────────────────────────────────────────

function StatusChip({ status }: { status: GameStatus }) {
  const configs: Record<GameStatus, { label: string; color: string; bg: string }> = {
    live:    { label: 'Live',    color: semantic.success, bg: `${semantic.success}18` },
    pending: { label: 'Pending', color: neutral[500],     bg: neutral[100] },
    ended:   { label: 'Ended',   color: neutral[400],     bg: neutral[100] },
  };
  const { label, color, bg } = configs[status];
  return (
    <View style={[chip.wrap, { backgroundColor: bg }]}>
      <Text style={[chip.text, { color }]}>{label}</Text>
    </View>
  );
}

function PhaseChip({ phase }: { phase: GamePhase }) {
  const configs: Record<GamePhase, { label: string; color: string }> = {
    'pre-event':  { label: 'Pre-Event',  color: '#D97706' },
    'main-event': { label: 'Main Event', color: brand.primary },
    'post-event': { label: 'Post-Event', color: '#3B82F6' },
    both:         { label: 'Both',       color: neutral[500] },
  };
  const { label, color } = configs[phase];
  return (
    <View style={[chip.wrap, { backgroundColor: `${color}15`, marginTop: 4 }]}>
      <Text style={[chip.text, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#92400E',
    lineHeight: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  addBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    backgroundColor: neutral[50],
  },
  quotaRowWarn: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  quotaText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  quotaTextWarn: { color: '#92400E' },
  quotaBold: { fontFamily: fontFamily.bold, color: neutral[800] },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: semantic.error,
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
});

const gc = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: neutral[0],
    overflow: 'hidden',
  },
  cardLive: {
    borderColor: `${semantic.success}40`,
    backgroundColor: `${semantic.success}04`,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  typeIconLive: { backgroundColor: `${semantic.success}18` },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  sessionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    maxWidth: '60%',
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  lockedChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#D97706',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginRight: 4,
  },
  controls: { alignItems: 'flex-end', gap: 6 },
  iconBtn: { padding: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  startBtn: { backgroundColor: semantic.success, borderColor: semantic.success },
  startText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: '#fff' },
  endBtn:   { borderColor: `${semantic.error}60`, backgroundColor: 'transparent' },
  endText:  { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: semantic.error },
  unlockBtn: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  unlockText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: '#D97706' },
  expanded: {
    borderTopWidth: 1,
    borderTopColor: neutral[200],
    padding: 14,
    gap: 16,
  },
  expandSection: { gap: 8 },
  expandSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: neutral[0],
  },
  roundTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  roundSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 1,
    textTransform: 'capitalize',
  },
});

const lb = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: neutral[50],
  },
  rowMe: {
    backgroundColor: `${brand.primary}10`,
    borderWidth: 1,
    borderColor: `${brand.primary}20`,
  },
  rank: { width: 22, textAlign: 'center', fontSize: 14 },
  name: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[700],
  },
  you: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: brand.primary,
  },
  score: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});

const ft = StyleSheet.create({
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[0],
  },
  tabActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  tabText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textTransform: 'capitalize',
  },
  tabTextActive: { color: '#fff' },
});

const chip = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: neutral[0],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 18,
  },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
  },
  inputDisabled: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#92400E',
    lineHeight: 16,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    backgroundColor: `${semantic.error}06`,
    borderRadius: 8,
    padding: 8,
  },
  lockText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 16,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  payBtn: {
    flex: 1,
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  payText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
});

// ── Wizard modal styles ────────────────────────────────────────────────────────

const wiz = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: neutral[0],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[300],
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    gap: 12,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
