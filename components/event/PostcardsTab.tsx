import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { EventPostcard } from './types';

const { width } = Dimensions.get('window');
const COL_GAP  = 8;
const H_PAD    = 16;
const TILE_W   = (width - H_PAD * 2 - COL_GAP) / 2;

// ─── Mock postcards (replace with API) ───────────────────────────────────────
const MOCK_POSTCARDS: EventPostcard[] = [
  { id: 'p1', caption: 'What a match! 🔥', likeCount: 24, commentCount: 3, author: { username: 'alex_vibe' }, media: [] },
  { id: 'p2', caption: 'Electric night',   likeCount: 11, commentCount: 1, author: { username: 'sarah_games' }, media: [] },
  { id: 'p3', caption: 'Goals on goals',   likeCount: 38, commentCount: 7, author: { username: 'nextvibe_fan' }, media: [] },
  { id: 'p4', caption: 'Fan vibes ✨',     likeCount: 5,  commentCount: 0, author: { username: 'match_day' }, media: [] },
];

const PHASES = ['Pre-Event', 'Main Event', 'Post-Event'] as const;
type Phase = typeof PHASES[number];

function PostcardTile({ item }: { item: EventPostcard }) {
  const mediaUrl = item.media?.[0]?.mediaUrl ?? null;
  const isVideo  = item.media?.[0]?.mediaType === 'VIDEO';
  const author   = item.author?.username ?? item.author?.displayName ?? '';

  return (
    <TouchableOpacity style={[tile.wrap, { width: TILE_W }]} activeOpacity={0.88}>
      <View style={[tile.img, { width: TILE_W, height: TILE_W * 1.2 }]}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={tile.imgFallback}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}
        {isVideo && (
          <View style={tile.playBtn}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        )}
        {/* Overlay */}
        <View style={tile.overlay}>
          {author ? <Text style={tile.author} numberOfLines={1}>@{author}</Text> : null}
          <View style={tile.stats}>
            <Ionicons name="heart" size={11} color="#fff" />
            <Text style={tile.statText}>{item.likeCount ?? 0}</Text>
            <Ionicons name="chatbubble" size={10} color="#fff" style={{ marginLeft: 6 }} />
            <Text style={tile.statText}>{item.commentCount ?? 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface Props { eventId: string }

export default function PostcardsTab({ eventId }: Props) {
  const [phase, setPhase] = useState<Phase>('Main Event');
  // TODO: const { data, isLoading } = useGetEventPostcardsQuery({ eventId, phase })

  return (
    <View style={s.wrap}>
      {/* Phase picker */}
      <View style={s.phaseRow}>
        {PHASES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.phaseBtn, phase === p && s.phaseBtnActive]}
            onPress={() => setPhase(p)}
            activeOpacity={0.8}
          >
            <Text style={[s.phaseLabel, phase === p && s.phaseLabelActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {MOCK_POSTCARDS.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="images-outline" size={48} color={neutral[200]} />
          <Text style={s.emptyText}>No postcards yet</Text>
          <Text style={s.emptySub}>Be the first to share your experience!</Text>
        </View>
      ) : (
        <FlatList
          data={MOCK_POSTCARDS}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          scrollEnabled={false}
          renderItem={({ item }) => <PostcardTile item={item} />}
          contentContainerStyle={s.grid}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 32 },

  phaseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  phaseBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: neutral[100], alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: brand.primaryDark },
  phaseLabel:     { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
  phaseLabelActive: { color: '#fff' },

  grid: { gap: COL_GAP },
  row:  { gap: COL_GAP, marginBottom: COL_GAP },

  empty:    { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText:{ fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[600] },
  emptySub: { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,   color: neutral[400], textAlign: 'center' },
});

const tile = StyleSheet.create({
  wrap:       { borderRadius: 12, overflow: 'hidden' },
  img:        { backgroundColor: neutral[100], borderRadius: 12, overflow: 'hidden' },
  imgFallback:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  author:   { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff', marginBottom: 2 },
  stats:    { flexDirection: 'row', alignItems: 'center' },
  statText: { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff', marginLeft: 3 },
});
