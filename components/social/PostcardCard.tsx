import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostcardItem {
  id: string;
  caption?: string | null;
  likeCount?: number;
  isLiked?: boolean;
  commentsCount?: number;
  createdAt: string;
  event?: { id: string; name: string } | null;
  author?: {
    id?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  } | null;
  media?: Array<{
    mediaUrl?: string | null;
    mediaType?: 'PHOTO' | 'VIDEO' | null;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function AvatarCircle({ uri, name, size = 36 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.initials, { fontSize: size * 0.38 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface Props {
  item: PostcardItem;
  onPress: (item: PostcardItem) => void;
}

export default function PostcardCard({ item, onPress }: Props) {
  const [liked,      setLiked]      = useState(item.isLiked ?? false);
  const [likeCount,  setLikeCount]  = useState(item.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);

  const author     = item.author;
  const name       = author?.displayName ?? author?.username ?? 'User';
  const username   = author?.username ?? '';
  const primaryMedia = item.media?.find((m) => !!m.mediaUrl);
  const mediaUrl   = primaryMedia?.mediaUrl ?? null;
  const isVideo    = primaryMedia?.mediaType === 'VIDEO';
  const hasMultiple = (item.media?.filter((m) => !!m.mediaUrl).length ?? 0) > 1;

  const handleLike = () => {
    setLiked((v) => !v);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    // TODO: call toggleLikePostcard API
  };

  return (
    <View style={styles.card}>
      {/* ── Author row ── */}
      <View style={styles.authorRow}>
        <AvatarCircle uri={author?.avatarUrl} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{name}</Text>
          {username ? <Text style={styles.authorHandle}>@{username.replace(/^@/, '')}</Text> : null}
        </View>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>

      {/* ── Media ── */}
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(item)} style={styles.mediaWrap}>
        {mediaUrl ? (
          <>
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
            {isVideo && (
              <View style={styles.playOverlay}>
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={20} color="#fff" />
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.mediaFallback}>
            <Ionicons name="image-outline" size={36} color={neutral[300]} />
          </View>
        )}
        {hasMultiple && (
          <View style={styles.multiIcon}>
            <Ionicons name="copy-outline" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.75}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? brand.primary : neutral[700]}
          />
          <Text style={[styles.actionCount, liked && { color: brand.primary }]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments((v) => !v)}
          activeOpacity={0.75}
        >
          <Ionicons name="chatbubble-outline" size={21} color={neutral[700]} />
          <Text style={styles.actionCount}>{item.commentsCount ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 'auto' }]} activeOpacity={0.75}>
          <Ionicons name="share-social-outline" size={21} color={neutral[700]} />
        </TouchableOpacity>
      </View>

      {/* ── Caption ── */}
      {item.caption ? (
        <View style={styles.captionRow}>
          {username ? <Text style={styles.captionUser}>@{username.replace(/^@/, '')} </Text> : null}
          <Text style={styles.caption}>{item.caption}</Text>
        </View>
      ) : null}

      {/* ── Event tag ── */}
      {item.event?.name ? (
        <View style={styles.eventRow}>
          <Ionicons name="calendar-outline" size={12} color={neutral[500]} />
          <Text style={styles.eventName}>{item.event.name}</Text>
        </View>
      ) : null}

      {/* ── Comments stub ── */}
      {showComments && (
        <View style={styles.commentStub}>
          <Text style={styles.commentStubText}>Comments coming soon</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const av = StyleSheet.create({
  circle:   { backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.bold, color: '#fff' },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorName:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm,  color: neutral[800] },
  authorHandle: { fontFamily: fontFamily.regular,  fontSize: 11,           color: neutral[500] },
  time:         { fontFamily: fontFamily.regular,  fontSize: 11,           color: neutral[400] },

  mediaWrap:    { width: '100%', aspectRatio: 1, backgroundColor: neutral[100] },
  media:        { width: '100%', height: '100%' },
  mediaFallback:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: neutral[100] },
  playOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  playBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  multiIcon:    { position: 'absolute', top: 8, right: 8 },

  actions:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 16 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },

  captionRow:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 6 },
  captionUser:  { fontFamily: fontFamily.bold,    fontSize: fontSize.sm, color: neutral[800] },
  caption:      { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], flex: 1 },

  eventRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 },
  eventName:    { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },

  commentStub:  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral[100], padding: 12 },
  commentStubText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center' },
});
