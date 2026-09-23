import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useGetEventPostcardsQuery } from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import type {
  ActivityTiming,
  PostcardData,
  PostcardPhase,
  VibeTag,
} from "./types";
import { TIMING_META, TIMING_PILL } from "./types";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 14;
// No gap between tiles — flush grid, taller tiles to show more content
const TILE_W = SCREEN_W / 2;
const TILE_H = TILE_W * (5 / 4); // taller: was 4/3, now shows more

const TIMING_TABS: ActivityTiming[] = [
  "PRE_EVENT",
  "DURING_EVENT",
  "POST_EVENT",
];

// ─── PostcardTile ─────────────────────────────────────────────────────────────

const PostcardTile = ({
  postcard,
  vibeTagMap,
  onPress,
  index,
}: {
  postcard: any;
  vibeTagMap: Record<string, VibeTag>;
  onPress: () => void;
  index: number;
}) => {
  const tag = vibeTagMap[postcard?.vibeTagId];
  const timing: string = tag?.activityTiming ?? "";
  const pill = TIMING_PILL[timing];
  const authorName =
    postcard?.author?.displayName?.trim() ||
    postcard?.author?.username?.trim() ||
    "";

  const mediaItems: any[] = postcard?.media ?? [];
  const firstMedia = mediaItems[0];
  const src = firstMedia?.mediaUrl ?? "";
  const isVideo = firstMedia?.mediaType === "VIDEO";
  const hasMultiple = mediaItems.filter((m: any) => !!m.mediaUrl).length > 1;

  if (!src) return null;

  return (
    <TouchableOpacity style={tile.wrap} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: src }}
        style={tile.img}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        priority={index < 6 ? "high" : "normal"}
        recyclingKey={src}
      />

      {isVideo && (
        <View style={tile.videoBadge} pointerEvents="none">
          <Ionicons name="play" size={13} color="#fff" />
        </View>
      )}

      {hasMultiple && (
        <View style={tile.multiBadge} pointerEvents="none">
          <Ionicons name="layers" size={12} color="#fff" />
        </View>
      )}

      {pill && (
        <View
          style={[tile.pill, { backgroundColor: pill.color }]}
          pointerEvents="none"
        >
          <Text style={tile.pillText}>{pill.label}</Text>
        </View>
      )}

      <View style={tile.bottom} pointerEvents="none">
        {authorName ? (
          <Text style={tile.author} numberOfLines={1}>
            @{authorName}
          </Text>
        ) : null}
        <View style={tile.stats}>
          <View style={tile.statItem}>
            <Ionicons name="heart" size={11} color="#fff" />
            <Text style={tile.statText}>{postcard?.likeCount ?? 0}</Text>
          </View>
          <View style={tile.statItem}>
            <Ionicons name="chatbubble" size={10} color="#fff" />
            <Text style={tile.statText}>{postcard?.commentCount ?? 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── PhaseGrid ────────────────────────────────────────────────────────────────

const PhaseGrid = ({
  eventId,
  phase,
  vibeTagMap,
  onSelect,
}: {
  eventId: string;
  phase: PostcardPhase;
  vibeTagMap: Record<string, VibeTag>;
  onSelect: (postcards: PostcardData[], index: number) => void;
}) => {
  const { data, isLoading } = useGetEventPostcardsQuery(
    { eventId, phase: phase === "all" ? undefined : phase },
    { skip: !eventId }
  );

  const rawList: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const postcards: PostcardData[] = rawList
    .filter((p: any) => (p?.media ?? []).some((m: any) => !!m.mediaUrl))
    .map((p: any) => ({
      ...p,
      vibeTagId: p.vibeTagId ?? p.vibeTag?.id ?? null,
    }));

  if (isLoading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  if (postcards.length === 0) {
    return (
      <View style={grid.empty}>
        <Ionicons name="images-outline" size={36} color={neutral[300]} />
        <Text style={grid.emptyTitle}>No postcards yet</Text>
        <Text style={grid.emptySub}>Be the first to share a memory!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={postcards}
      keyExtractor={(item, i) => (item as any)?.id ?? String(i)}
      numColumns={2}
      scrollEnabled={false}
      // No gap — flush grid
      columnWrapperStyle={{ gap: 0 }}
      ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
      renderItem={({ item, index }) => (
        <PostcardTile
          postcard={item}
          vibeTagMap={vibeTagMap}
          onPress={() => onSelect(postcards, index)}
          index={index}
        />
      )}
    />
  );
};

const grid = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 40, gap: 6 },
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
  },
});

// ─── Main PostcardsTab ────────────────────────────────────────────────────────

// ─── Tile styles ──────────────────────────────────────────────────────────────

const tile = StyleSheet.create({
  wrap: {
    width: TILE_W,
    height: TILE_H,
    overflow: "hidden",
    // No borderRadius, no margin — flush grid
  },
  img: {
    ...StyleSheet.absoluteFillObject,
  },
  // Video play badge — bottom left
  videoBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Multi-media indicator — top right
  multiBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Timing pill — top left
  pill: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  pillText: { fontFamily: fontFamily.bold, fontSize: 9, color: "#fff" },
  // Bottom overlay
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 7,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  author: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: "#fff",
    marginBottom: 3,
  },
  stats: { flexDirection: "row", alignItems: "center", gap: 8 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
  },
});

export { PhaseGrid };
