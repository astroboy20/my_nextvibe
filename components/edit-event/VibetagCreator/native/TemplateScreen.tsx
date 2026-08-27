import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CATEGORY_META, VIBE_TEMPLATES } from './TemplateData';
import type { CanvasTemplate } from './types';

// Stable dummy backgrounds for the preview cards (cycles through the pool)
const DUMMY_POOL = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80',
];

function getDummyBg(index: number) {
  return DUMMY_POOL[index % DUMMY_POOL.length];
}

interface Props {
  onSelect: (template: CanvasTemplate | null) => void; // null = start from scratch
}

export default function TemplateScreen({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', ...Array.from(new Set(VIBE_TEMPLATES.map((t) => t.category)))];

  const filtered =
    activeCategory === 'all'
      ? VIBE_TEMPLATES
      : VIBE_TEMPLATES.filter((t) => t.category === activeCategory);

  const data: Array<CanvasTemplate | 'scratch'> = ['scratch', ...filtered];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Choose a Template</Text>
        <Text style={s.subtitle}>Filter by category, then tap to use</Text>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillsRow}
      >
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, emoji: '🏷️' };
          const count =
            cat === 'all'
              ? VIBE_TEMPLATES.length
              : VIBE_TEMPLATES.filter((t) => t.category === cat).length;
          const isActive = cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              style={[s.pill, isActive && s.pillActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={s.pillEmoji}>{meta.emoji}</Text>
              <Text style={[s.pillLabel, isActive && s.pillLabelActive]}>
                {meta.label}
              </Text>
              <View style={[s.pillCount, isActive && s.pillCountActive]}>
                <Text style={[s.pillCountText, isActive && s.pillCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={data}
        numColumns={2}
        columnWrapperStyle={s.row}
        keyExtractor={(item) => (item === 'scratch' ? '__scratch__' : item.id)}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          if (item === 'scratch') {
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => onSelect(null)}
                activeOpacity={0.85}
              >
                <View style={s.scratchInner}>
                  <View style={s.scratchCircle}>
                    <Ionicons name="pencil-outline" size={18} color={brand.primary} />
                  </View>
                  <Text style={s.scratchLabel}>START FROM{'\n'}SCRATCH</Text>
                </View>
              </TouchableOpacity>
            );
          }

          const t = item as CanvasTemplate;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => onSelect(t)}
              activeOpacity={0.85}
            >
              {/* Dummy person behind */}
              <Image
                source={{ uri: getDummyBg(index) }}
                style={s.cardBg}
                resizeMode="cover"
              />
              {/* Template mock overlay */}
              <Image
                source={{ uri: t.mock }}
                style={[s.cardBg, { opacity: 0.75 }]}
                resizeMode="cover"
              />
              {/* Preview pill */}
              <View style={s.previewPill}>
                <Text style={s.previewPillText}>Preview</Text>
              </View>
              {/* Bottom label */}
              <View style={s.cardFooter}>
                <Text style={s.cardFooterText} numberOfLines={1}>
                  {CATEGORY_META[t.category]?.label ?? t.category}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {filtered.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>🔍</Text>
          <Text style={s.emptyText}>No templates in this category yet</Text>
        </View>
      )}
    </View>
  );
}

const CARD_GAP = 10;

const s = StyleSheet.create({
  root: { gap: 14, paddingBottom: 80 },
  header: { alignItems: 'center', gap: 2 },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  pillsRow: { gap: 8, paddingBottom: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  pillActive: { borderColor: brand.primary, backgroundColor: brand.primary },
  pillEmoji: { fontSize: 13 },
  pillLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  pillLabelActive: { color: '#fff' },
  pillCount: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: neutral[100],
  },
  pillCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  pillCountText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: neutral[500],
    lineHeight: 11,
  },
  pillCountTextActive: { color: '#fff' },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[100],
  },
  cardBg: { ...StyleSheet.absoluteFillObject },
  scratchInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(240,240,245,0.9)',
  },
  scratchCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  previewPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewPillText: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardFooterText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#fff',
    textTransform: 'capitalize',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyEmoji: { fontSize: 28 },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
});
