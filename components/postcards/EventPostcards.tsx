import type { ReelPhase } from "@/components/event/PostcardsTab/PostcardReel";
import { PostcardReel } from "@/components/event/PostcardsTab/PostcardReel";
import type { PostcardData, VibeTag } from "@/components/event/PostcardsTab/types";
import { phaseToTiming } from "@/components/event/PostcardsTab/types";
import { PostcardViewer } from "@/components/postcardviewer/PostcardViewer";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
  useGetEventByIdQuery,
  useGetEventPostcardsQuery,
  useGetVibeTagsQuery,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../ui/Skeleton";
import { Tile } from "./PostcardTiles";

const { width: W } = Dimensions.get("window");
const NUM_COLS = 3;

type Phase = "all" | "pre-event" | "main-event" | "post-event";

const PHASES: { value: Phase; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pre-event", label: "Pre" },
  { value: "main-event", label: "Main" },
  { value: "post-event", label: "Post" },
];

// Maps the UI phase tab to the ReelPhase the reel component expects.
// "all" defaults to PRE_EVENT — the reel always needs a concrete phase.
const PHASE_TO_REEL: Record<Phase, ReelPhase> = {
  "all":        "PRE_EVENT",
  "pre-event":  "PRE_EVENT",
  "main-event": "DURING_EVENT",
  "post-event": "POST_EVENT",
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EventPostcards() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [phase, setPhase] = useState<Phase>("all");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<PostcardData[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [viewerPostcards, setViewerPostcards] = useState<PostcardData[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const [showReel, setShowReel] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: eventData } = useGetEventByIdQuery(id ?? "", { skip: !id });
  const eventName = eventData?.data?.name ?? "Event";

  const { data: vibeTagData } = useGetVibeTagsQuery(
    { eventId: id ?? "" },
    { skip: !id }
  );
  const allTags: VibeTag[] = (vibeTagData as any)?.data ?? [];
  const vibeTagMap: Record<string, VibeTag> = Object.fromEntries(
    allTags.map((t) => [t.id, t])
  );

  const { data, isLoading, isFetching } = useGetEventPostcardsQuery(
    {
      eventId: id ?? "",
      page,
      limit: 30,
      timing: phaseToTiming(phase),
    },
    { skip: !id }
  );

  // Merge pages locally, clear on tab change
  React.useEffect(() => {
    const rawList: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
    const fresh: PostcardData[] = rawList.filter((p: any) =>
      (p?.media ?? []).some((m: any) => !!m.mediaUrl)
    );
    if (page === 1) {
      setAccumulated(fresh);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...fresh.filter((p) => !existingIds.has(p.id))];
      });
    }
    // Data arrived for page 1 — filter loading is done
    if (page === 1) setFilterLoading(false);
  }, [data]);

  const postcards = accumulated;
  const hasNext = (data as any)?.data?.meta?.hasNext ?? false;
  const total: number = (data as any)?.data?.meta?.total ?? 0;

  const changePhase = (next: Phase) => {
    if (next === phase) return;
    setPhase(next);
    setPage(1);
    setAccumulated([]);
    setFilterLoading(true); // show skeleton until first page arrives
  };

  const openViewer = (index: number) => {
    setViewerPostcards(postcards);
    setViewerIndex(index);
    setShowViewer(true);
  };

  const renderItem = ({ item, index }: { item: PostcardData; index: number }) => (
    <Tile postcard={item} index={index} onPress={() => openViewer(index)} />
  );

  const reelPhase = PHASE_TO_REEL[phase];

  // Show the reel button only when there are postcards and we have at least one
  // vibe tag (reel needs vibeTagMap to filter/enrich). For "all" we always show
  // it if there are any postcards — it'll play PRE_EVENT slides.
  const canShowReel = postcards.length > 0;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={neutral[800]} />
        </TouchableOpacity>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerTitle}>Postcards</Text>
          {isLoading ? (
            <Skeleton width={80} height={10} />
          ) : (
            <Text style={s.headerSub} numberOfLines={1}>
              {eventName}
            </Text>
          )}
        </View>

        {/* Watch Reel button — top-right of header */}
        {canShowReel && (
          <TouchableOpacity
            style={s.reelBtn}
            onPress={() => setShowReel(true)}
            activeOpacity={0.82}
          >
            <Ionicons name="play-circle" size={16} color={brand.primary} />
            <Text style={s.reelBtnText}>Reel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Phase filter ───────────────────────────────────────────── */}
      <View style={s.phaseRow}>
        {PHASES.map((p) => {
          const active = phase === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              style={[s.phaseBtn, active && s.phaseBtnActive]}
              onPress={() => changePhase(p.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.phaseLabel, active && s.phaseLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      {(isLoading || filterLoading) && postcards.length === 0 ? (
        // Skeleton tiles while initial load or tab switch is in-flight
        <View style={s.skeletonGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              width={(W - 2) / NUM_COLS}
              height={((W - 2) / NUM_COLS) * 1.2}
              borderRadius={0}
            />
          ))}
        </View>
      ) : postcards.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="images-outline" size={44} color={neutral[200]} />
          <Text style={s.emptyTitle}>No postcards yet</Text>
          <Text style={s.emptySub}>
            {phase !== "all"
              ? `No postcards for the ${phase} phase`
              : "Be the first to share a memory!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={postcards}
          keyExtractor={(item, i) => (item as any)?.id ?? String(i)}
          numColumns={NUM_COLS}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          onEndReached={() => {
            if (hasNext && !isFetching) setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={s.footerLoader}>
                <ActivityIndicator size="small" color={brand.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── PostcardViewer ─────────────────────────────────────────── */}
      {showViewer && viewerPostcards.length > 0 && (
        <PostcardViewer
          postcards={viewerPostcards}
          initialIndex={viewerIndex}
          eventId={id ?? ""}
          onClose={() => setShowViewer(false)}
        />
      )}

      {/* ── PostcardReel ───────────────────────────────────────────── */}
      {showReel && (
        <PostcardReel
          eventId={id ?? ""}
          phase={reelPhase}
          vibeTagMap={vibeTagMap}
          onClose={() => setShowReel(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 1,
  },

  reelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}08`,
  },
  reelBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: brand.primary,
  },

  phaseRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  phaseBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: neutral[100],
    alignItems: "center",
  },
  phaseBtnActive: { backgroundColor: brand.primary },
  phaseLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: neutral[500],
  },
  phaseLabelActive: { color: "#fff" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: "center",
    paddingHorizontal: 32,
  },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
  },
});
