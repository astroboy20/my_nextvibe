import AuthModal from "@/components/auth/AuthModal";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/hooks/useAuthModal";
import {
    useGetActiveGameStatusQuery,
    useGetGameSessionQuery,
    useGetGamesQuery,
    useJoinGameSessionMutation,
    useSubmitRoundAnswersMutation
} from "@/store/api/gamesApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { RoundPlayer } from "./RoundPlayer";
import { SessionCard } from "./SessionCard";
import type { PhaseTab } from "./types";
import { mapPhase, mapStatus, mapType } from "./types";

// ── Phase tabs ────────────────────────────────────────────────────────────────

const PHASE_TABS: { value: PhaseTab; label: string }[] = [
  { value: "pre-event", label: "Pre-Event" },
  { value: "main-event", label: "Main Event" },
  { value: "post-event", label: "Post-Event" },
  { value: "both", label: "Both" },
];

// ── SessionFetcher ────────────────────────────────────────────────────────────
// Rendered only in the sessions-list view (not while playing) so it always
// has an active subscription and its refetch fn is never stale.

function SessionFetcher({
  sessionId,
  onData,
}: {
  sessionId: string;
  onData: (id: string, data: any) => void;
}) {
  const { data } = useGetGameSessionQuery(sessionId, {
    refetchOnMountOrArgChange: true,
  });
  useEffect(() => {
    if (data?.data) onData(sessionId, data.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  eventId:          string;
  eventName?:       string;
  startsAt?:        string;
  onPlayingChange?: (playing: boolean) => void;
}

export default function GameTab({ eventId, eventName, startsAt, onPlayingChange }: Props) {
  const { isAuthenticated } = useAuth();
  const { visible: authModalVisible, showAuthModal, hideAuthModal } = useAuthModal();

  // Remember the pending action type so we can retry after auth
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);

  // ── API ───────────────────────────────────────────────────────────────────
  const {
    data: gamesData,
    isLoading: isLoadingGames,
    refetch: refetchGames,
  } = useGetGamesQuery(eventId, {
    skip: !eventId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: statusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useGetActiveGameStatusQuery(eventId, {
    skip: !eventId || !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });

  const [joinSession, { isLoading: isJoining }] = useJoinGameSessionMutation();
  const [submitAnswers, { isLoading: isSubmitting }] =
    useSubmitRoundAnswersMutation();

  // ── Local state ───────────────────────────────────────────────────────────
  const [activePhase, setActivePhase] = useState<PhaseTab>("pre-event");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [playingRoundId, setPlayingRoundId] = useState<string | null>(null);
  const [lastRoundScore, setLastRoundScore] = useState<number | null>(null);
  const [sessionDataMap, setSessionDataMap] = useState<Record<string, any>>({});
  const [joinedSessions, setJoinedSessions] = useState<Set<string>>(new Set());
  const [playedRounds, setPlayedRounds] = useState<Set<string>>(new Set());

  // ── Derived ───────────────────────────────────────────────────────────────
  const isJoinedFromStatus = statusData?.data?.isJoined ?? false;
  const activeSessionFromApi = statusData?.data?.session?.id;
  const eventHasStarted = startsAt ? new Date() >= new Date(startsAt) : false;

  const allSessions = (gamesData?.data ?? []).map((g: any) => ({
    ...g,
    mappedType: mapType(g.rounds?.[0]?.gameType ?? "TRIVIA"),
    mappedStatus: mapStatus(g.status),
    mappedPhase: mapPhase(g.activityTiming ?? "DURING_EVENT"),
  }));

  const tabsWithSessions = PHASE_TABS.filter((tab) =>
    allSessions.some((s: any) => s.mappedPhase === tab.value)
  );

  const sessions = allSessions.filter(
    (s: any) => s.mappedPhase === activePhase
  );

  // Auto-select first available phase
  useEffect(() => {
    if (
      tabsWithSessions.length > 0 &&
      !tabsWithSessions.find((t) => t.value === activePhase)
    ) {
      setActivePhase(tabsWithSessions[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesData]);

  // Seed joined state from status endpoint
  useEffect(() => {
    if (isJoinedFromStatus && activeSessionFromApi) {
      setJoinedSessions((prev) => new Set([...prev, activeSessionFromApi]));
    }
  }, [isJoinedFromStatus, activeSessionFromApi]);

  // Clear last score when leaving the playing view
  useEffect(() => {
    if (!playingRoundId) setLastRoundScore(null);
  }, [playingRoundId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleJoin = async (sessionId: string) => {
    if (!isAuthenticated) {
      setPendingJoinId(sessionId);
      showAuthModal();
      return;
    }
    await _doJoin(sessionId);
  };

  const _doJoin = async (sessionId: string) => {
    try {
      await joinSession(sessionId).unwrap();
      setJoinedSessions((prev) => new Set([...prev, sessionId]));
      setActiveSessionId(sessionId);
      refetchStatus();
      // Refetch session list so hasPlayed / isJoined updates
      refetchGames();
      Toast.show({
        type: "success",
        text1: "Joined!",
        text2: "Wait for the organizer to start a round.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not join",
        text2: err?.data?.message ?? "Please try again.",
      });
    }
  };

  const handleSubmit = async (
    roundId: string,
    answers: (number | string)[],
    timeTakenMs: number
  ): Promise<{ ok: boolean; score?: number }> => {
    if (!isAuthenticated) {
      Toast.show({
        type: "info",
        text1: "Sign in required",
        text2: "Please log in to submit.",
      });
      return { ok: false };
    }
    if (activeSessionId) {
      try {
        await joinSession(activeSessionId).unwrap();
      } catch {
        /* already joined */
      }
    }
    try {
      const res = await submitAnswers({
        roundId,
        answers,
        timeTakenMs,
      }).unwrap();
      Toast.show({ type: "success", text1: "Answers submitted!" });
      const score = res?.data?.score ?? res?.data?.totalScore ?? 0;
      return { ok: true, score };
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Submission failed",
        text2: err?.data?.message ?? "Please try again.",
      });
      return { ok: false };
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoadingGames || isLoadingStatus) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={brand.primary} size="large" />
      </View>
    );
  }

  if (allSessions.length === 0) {
    return (
      <View style={s.center}>
        <View style={s.emptyIcon}>
          <Ionicons name="flash-outline" size={32} color={neutral[400]} />
        </View>
        <Text style={s.emptyTitle}>No games yet</Text>
        <Text style={s.emptySub}>The organizer hasn't added any games.</Text>
      </View>
    );
  }

  // ── Playing a round ───────────────────────────────────────────────────────
  // Fill the entire available space so the player never needs to scroll
  // to see the game — no outer ScrollView here.
  if (playingRoundId) {
    const session = allSessions.find((ss: any) => ss.id === activeSessionId);
    const round = session?.rounds?.find((r: any) => r.id === playingRoundId);
    const detail = sessionDataMap[activeSessionId ?? ""];
    const alreadyPlayed =
      (playedRounds.has(playingRoundId) ||
        detail?.rounds?.find((r: any) => r.id === playingRoundId)?.hasPlayed) &&
      lastRoundScore === null;

    return (
      <View style={s.playerScreen}>
        {/* Back row — fixed at top, never scrolls away */}
        <TouchableOpacity
          style={s.backRow}
          onPress={() => {
            setPlayingRoundId(null);
            onPlayingChange?.(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={neutral[600]} />
          <Text style={s.backText}>{session?.title ?? "Back"}</Text>
        </TouchableOpacity>

        {/* Content fills remaining space */}
        <View style={s.playerContent}>
          {alreadyPlayed ? (
            <View style={s.center}>
              <View
                style={[
                  s.emptyIcon,
                  { backgroundColor: `${semantic.success}12` },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={32}
                  color={semantic.success}
                />
              </View>
              <Text style={s.emptyTitle}>Already completed</Text>
              <Text style={s.emptySub}>
                You've already submitted your answers for this round.
              </Text>
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => {
                  setPlayingRoundId(null);
                  onPlayingChange?.(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={s.backBtnText}>Back to Lobby</Text>
              </TouchableOpacity>
            </View>
          ) : round ? (
            <RoundPlayer
              round={round}
              session={session}
              eventName={eventName}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onComplete={(score) => {
                setPlayedRounds((prev) => new Set([...prev, playingRoundId!]));
                setLastRoundScore(score);
                onPlayingChange?.(false);
                refetchGames();
              }}
            />
          ) : (
            <Text style={s.notFound}>Round not found.</Text>
          )}
        </View>
      </View>
    );
  }

  // ── Sessions list ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Fetch per-session detail — only rendered in list view */}
        {allSessions.map((sess: any) => (
          <SessionFetcher
            key={sess.id}
            sessionId={sess.id}
            onData={(id, data) =>
              setSessionDataMap((prev) =>
                prev[id] === data ? prev : { ...prev, [id]: data }
              )
            }
          />
        ))}

        {/* Phase tabs */}
        {tabsWithSessions.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.phaseBar}
            contentContainerStyle={s.phaseBarContent}
          >
            {tabsWithSessions.map((tab) => {
              const count = allSessions.filter(
                (ss: any) => ss.mappedPhase === tab.value
              ).length;
              const active = activePhase === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={[s.phaseBtn, active && s.phaseBtnActive]}
                  onPress={() => setActivePhase(tab.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.phaseBtnText, active && s.phaseBtnTextActive]}>
                    {tab.label}
                  </Text>
                  <View
                    style={[s.phaseBtnCount, active && s.phaseBtnCountActive]}
                  >
                    <Text
                      style={[
                        s.phaseBtnCountText,
                        active && s.phaseBtnCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {sessions.length === 0 && (
          <View style={s.center}>
            <Text style={s.emptySub}>No games for this phase.</Text>
          </View>
        )}

        <View style={s.list}>
          {sessions.map((session: any) => {
            const isActive = session.mappedStatus === "live";
            const isEnded = session.mappedStatus === "ended";
            const isJoined =
              joinedSessions.has(session.id) ||
              (isJoinedFromStatus && session.id === activeSessionFromApi);
            return (
              <SessionCard
                key={session.id}
                session={session}
                isActive={isActive}
                isEnded={isEnded}
                isJoined={isJoined}
                isJoining={isJoining}
                eventHasStarted={eventHasStarted}
                sessionData={sessionDataMap[session.id] ?? null}
                playedRounds={playedRounds}
                onJoin={() => handleJoin(session.id)}
                onPlay={(roundId) => {
                  setActiveSessionId(session.id);
                  setPlayingRoundId(roundId);
                  onPlayingChange?.(true);
                }}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Auth modal — shown when user is not logged in and tries to join a game */}
      <AuthModal
        visible={authModalVisible}
        onDismiss={() => { hideAuthModal(); setPendingJoinId(null); }}
        onSuccess={() => {
          hideAuthModal();
          if (pendingJoinId) {
            const id = pendingJoinId;
            setPendingJoinId(null);
            _doJoin(id);
          }
        }}
        message="Sign in to join this game"
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Sessions list
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 4,
  },

  // Shared empty / loading
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[700],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: "center",
  },

  // Phase tabs
  phaseBar: { flexGrow: 0, marginBottom: 12 },
  phaseBarContent: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  phaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: neutral[100],
  },
  phaseBtnActive: { backgroundColor: brand.primary },
  phaseBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  phaseBtnTextActive: { color: "#fff" },
  phaseBtnCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  phaseBtnCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  phaseBtnCountText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: neutral[600],
  },
  phaseBtnCountTextActive: { color: "#fff" },

  list: { gap: 12 },

  // ── Playing view ─────────────────────────────────────────────────────────
  // flex:1 so it fills whatever space the parent gives it — no outer scroll
  playerScreen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  backText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[700],
  },
  // Fills remaining space below the back row
  playerContent: { flex: 1 },

  backBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: brand.primary,
  },
  backBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
  notFound: {
    textAlign: "center",
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    paddingVertical: 24,
  },
});
