import { brand, neutral } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import type { FeedPostcard } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  item: FeedPostcard;
  onLike?: (id: string) => void;
}

export default function PostcardCard({ item, onLike }: Props) {
  const firstMedia = item.media?.[0];
  const initials   = item.author?.displayName?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <View style={styles.card}>
      {/* ── Media area ── */}
      <View style={styles.imageWrap}>
        {firstMedia?.url ? (
          <Image
            source={{ uri: firstMedia.url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}

        {/* Dark fade */}
        <View style={styles.imageFade} />

        {/* Like button overlay */}
        <TouchableOpacity
          style={styles.likeBtn}
          activeOpacity={0.8}
          onPress={() => onLike?.(item.id)}
        >
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={14}
            color={item.isLiked ? '#FF6584' : '#fff'}
          />
          <Text style={styles.likeCount}>{item.likesCount}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            {item.author?.avatarUrl ? (
              <Image source={{ uri: item.author.avatarUrl }} style={StyleSheet.absoluteFillObject} borderRadius={10} />
            ) : (
              <Text style={styles.avatarInitial}>{initials}</Text>
            )}
          </View>
          <Text style={styles.authorName} numberOfLines={1}>
            @{item.author?.username ?? '—'}
          </Text>
        </View>

        {/* Caption */}
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        ) : null}

        {/* Event link */}
        {item.event?.name ? (
          <View style={styles.eventRow}>
            <Ionicons name="calendar-outline" size={10} color={brand.primary} />
            <Text style={styles.eventName} numberOfLines={1}>{item.event.name}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
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

  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  likeBtn: {
    position: 'absolute',
    bottom: 8, right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  likeCount: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#fff',
  },

  info:   { paddingHorizontal: 10, paddingVertical: 8, gap: 4 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: brand.primary,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
  authorName:    { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[600], flex: 1 },

  caption:   { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[700], lineHeight: 16 },

  eventRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventName: { fontFamily: fontFamily.regular, fontSize: 10, color: brand.primary, flex: 1 },
});
