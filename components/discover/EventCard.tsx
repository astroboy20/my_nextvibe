import { brand, neutral } from "@/constants/Colors";
import { getTagStyle } from "@/constants/TagColors";
import { fontFamily } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Tag icon map ──────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAG_ICONS: Record<string, IoniconName> = {
  Virtual: "videocam-outline",
  Hybrid: "git-merge-outline",
  Games: "game-controller-outline",
  VibeTag: "sparkles-outline" as IoniconName,
  Free: "gift-outline",
  Online: "globe-outline",
  Onsite: "location-outline",
};

// ─── Tag badge ────────────────────────────────────────────────────────────────
function Tag({ label, color }: { label: string; color: string }) {
  const iconName = TAG_ICONS[label];
  const { text: textColor } = getTagStyle(label);
  return (
    <View style={[tag.pill, { backgroundColor: color }]}>
      {iconName && (
        <Ionicons name={iconName} size={9} color={textColor} style={tag.icon} />
      )}
      <Text style={[tag.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const tag = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    marginRight: 3,
    marginBottom: 3,
  },
  icon: { marginRight: 3 },
  text: { fontFamily: fontFamily.semibold, fontSize: 9, color: "#fff" },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventCardData {
  id: string;
  title: string;
  date: string;
  startsAt?: string;
  memories: number;
  location: string;
  flierUrl?: string | null;
  isPublic?: boolean;
  eventMode?: "ONSITE" | "VIRTUAL" | "HYBRID";
  hasGames?: boolean;
  hasVibeTag?: boolean;
  tags: Array<{ label: string; color: string }>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function EventCard({ item, onPress }: { item: EventCardData; onPress?: () => void }) {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/events/${item.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        {item.flierUrl ? (
          <Image
            source={{ uri: item.flierUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="stretch"
          />
        ) : (
          <View style={styles.imageFallback} />
        )}

        {/* Bottom gradient-like fade */}
        <View style={styles.imageFade} />

        {/* Tags — top left */}
        <View style={styles.tagRow}>
          {item.tags.map((t) => (
            <Tag key={t.label} label={t.label} color={t.color} />
          ))}
          {/* Fallback: show VibeTag if not already in tags array */}
          {item.hasVibeTag && !item.tags.find((t) => t.label === "VibeTag") && (
            <Tag label="VibeTag" color="#8B5CF6" />
          )}
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        {/* Date row */}
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={11} color={neutral[500]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {" "}
            {item.date}{" "}
          </Text>
          <Text style={styles.dot}>·</Text>
        </View>

        {/* Memories */}
        <Text style={styles.memories} numberOfLines={1}>
          {item.memories} Memories
        </Text>

        {/* Location */}
        <View style={styles.row}>
          <Ionicons name="location-outline" size={11} color={brand.primary} />
          <Text
            style={[styles.metaText, { color: brand.primary, flex: 1 }]}
            numberOfLines={1}
          >
            {" "}
            {item.eventMode === "VIRTUAL" ? "Online Event" : item.location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1, // fills the column width the grid gives it
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: neutral[100],
    shadowColor: "#33243F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // Image — fixed height so both columns always match
  imageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: neutral[200],
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neutral[200],
  },
  // Semi-transparent dark fade at the bottom of the image
  imageFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    // backgroundColor: "rgba(0,0,0,0.28)",
  },
  tagRow: {
    position: "absolute",
    top: 7,
    right: 7,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // Info — fixed height so both grid columns are always equal
  info: { gap: 2, width: "100%", paddingHorizontal: 10, paddingVertical: 8, height: 78, overflow: "hidden" },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: "black",
    marginBottom: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    overflow: "hidden",
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[500],
    // width: "50%",
  },
  dot: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400] },
  memories: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: neutral[600],
  },
});
