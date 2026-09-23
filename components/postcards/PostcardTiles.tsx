import { Image } from "expo-image";
import { PostcardData } from "../event/PostcardsTab/types";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { neutral } from "@/constants/Colors";
import { fontFamily } from "@/constants/Typography";

const { width: W } = Dimensions.get("window");
// 3-column grid, 1px gaps between tiles
const NUM_COLS = 3;

const TILE_W = (W - (NUM_COLS - 1)) / NUM_COLS;
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

  // Vary tile heights for visual interest (3-column masonry feel)
  const heights = [
    TILE_W * 1.4,
    TILE_W * 1.1,
    TILE_W * 1.6,
    TILE_W * 1.25,
    TILE_W * 1.0,
    TILE_W * 1.5,
  ];
  const h = heights[index % heights.length];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{ width: TILE_W }}
    >
      <View style={[t.tile, { height: h }]}>
        <Image
          source={{ uri: first.mediaUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority={index < 9 ? "high" : "normal"}
          recyclingKey={first.mediaUrl}
          transition={100}
        />
        {isVideo && (
          <View style={t.videoBadge} pointerEvents="none">
            <Ionicons name="play" size={11} color="#fff" />
          </View>
        )}
        {hasMultiple && (
          <View style={t.layersBadge} pointerEvents="none">
            <Ionicons name="layers" size={11} color="#fff" />
          </View>
        )}
        {/* Bottom scrim */}
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
  tile: { overflow: "hidden", backgroundColor: neutral[100] },
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
