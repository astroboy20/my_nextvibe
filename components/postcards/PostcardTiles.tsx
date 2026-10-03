import { neutral } from "@/constants/Colors";
import { fontFamily } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getThumbnailAsync } from "expo-video-thumbnails";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PostcardData } from "../event/PostcardsTab/types";

const { width: W } = Dimensions.get("window");

// 3-column grid with 1px gaps
const NUM_COLS = 3;
const GAP = 1;
const TILE_W = (W - GAP * (NUM_COLS - 1)) / NUM_COLS;
const TILE_H = TILE_W * 1.2; // uniform height for all tiles

// ─── VideoThumb ───────────────────────────────────────────────────────────────
// Extracts the first frame of a video if no thumbnailUrl is provided.
// Renders nothing while loading — the tile background colour shows instead.
function VideoThumb({
  uri,
  thumbnailUrl,
}: {
  uri: string;
  thumbnailUrl?: string | null;
}) {
  const [thumb, setThumb] = useState<string | null>(thumbnailUrl ?? null);

  useEffect(() => {
    if (thumb) return; // already have one (either prop or previously extracted)
    let cancelled = false;
    getThumbnailAsync(uri, { time: 0, quality: 0.6 })
      .then(({ uri: t }) => {
        if (!cancelled) setThumb(t);
      })
      .catch(() => {}); // silently ignore — blank tile is fine
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!thumb) return null;

  return (
    <Image
      source={{ uri: thumb }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={100}
    />
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────
export const Tile = ({
  postcard,
  index,
  onPress,
}: {
  postcard: PostcardData;
  index: number;
  onPress: () => void;
}) => {
  const media = (postcard.media ?? []).filter((m: any) => !!m.mediaUrl);
  const first = media[0];
  if (!first?.mediaUrl) return null;

  const isVideo = first.mediaType === "VIDEO";
  const hasMultiple = media.length > 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{ width: TILE_W }}
    >
      <View style={t.tile}>
        {isVideo ? (
          <VideoThumb uri={first.mediaUrl} thumbnailUrl={first.thumbnailUrl} />
        ) : (
          <Image
            source={{ uri: first.mediaUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority={index < 9 ? "high" : "normal"}
            recyclingKey={first.mediaUrl}
            transition={100}
          />
        )}

        {/* Video play badge */}
        {isVideo && (
          <View style={t.videoBadge} pointerEvents="none">
            <Ionicons name="play" size={11} color="#fff" />
          </View>
        )}

        {/* Multi-media badge */}
        {hasMultiple && (
          <View style={t.layersBadge} pointerEvents="none">
            <Ionicons name="layers" size={11} color="#fff" />
          </View>
        )}

        {/* Bottom scrim with like count */}
        <View style={t.scrim} pointerEvents="none">
          <View style={t.scrimStats}>
            <Ionicons name="heart" size={9} color="#fff" />
            <Text style={t.scrimText}>{postcard.likeCount ?? 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const t = StyleSheet.create({
  tile: {
    width: TILE_W,
    height: TILE_H,
    overflow: "hidden",
    backgroundColor: neutral[100],
  },
  videoBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  layersBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  scrimStats: { flexDirection: "row", alignItems: "center", gap: 2 },
  scrimText: { fontFamily: fontFamily.bold, fontSize: 9, color: "#fff" },
});
