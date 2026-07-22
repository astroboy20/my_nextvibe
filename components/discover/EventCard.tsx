import { brand, neutral } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Tag badge (inline — no extra import needed) ──────────────────────────────
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[tag.pill, { backgroundColor: color }]}>
      <Text style={tag.text}>{label}</Text>
    </View>
  );
}

const tag = StyleSheet.create({
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, marginRight: 3 },
  text: { fontFamily: fontFamily.semibold, fontSize: 9, color: '#fff' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventCardData {
  id: string;
  title: string;
  date: string;
  memories: number;
  location: string;
  flierUrl?: string | null;
  isPublic?: boolean;
  eventMode?: 'ONSITE' | 'VIRTUAL' | 'HYBRID';
  hasGames?: boolean;
  hasVibeTag?: boolean;
  tags: Array<{ label: string; color: string }>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function EventCard({ item }: { item: EventCardData }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/events/${item.id}` as any)}
    >
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        {item.flierUrl ? (
          <Image
            source={{ uri: item.flierUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
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
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          🏆 {item.title}
        </Text>

        {/* Date row */}
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={11} color={neutral[500]} />
          <Text style={styles.metaText}> {item.date} </Text>
          <Text style={styles.dot}>·</Text>
        </View>

        {/* Memories */}
        <Text style={styles.memories}>{item.memories} Memories</Text>

        {/* Location */}
        <View style={styles.row}>
          <Ionicons name="globe-outline" size={11} color={brand.primary} />
          <Text style={[styles.metaText, { color: brand.primary }]}> {item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,                 // fills the column width the grid gives it
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  // Image
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: neutral[200],
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neutral[200],
  },
  // Semi-transparent dark fade at the bottom of the image
  imageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  tagRow: {
    position: 'absolute',
    top: 7,
    left: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Info
  info:     { paddingHorizontal: 10, paddingVertical: 8, gap: 3 },
  title:    { fontFamily: fontFamily.bold,    fontSize: 12, color: neutral[800], marginBottom: 1 },
  row:      { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] },
  dot:      { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400] },
  memories: { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[600] },
});
