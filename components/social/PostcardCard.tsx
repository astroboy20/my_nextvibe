import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useCommentOnPostcardMutation, useGetPostcardCommentsQuery, useToggleLikePostcardMutation } from '@/store/api/eventApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

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
  const [liked,         setLiked]         = useState(item.isLiked ?? false);
  const [likeCount,     setLikeCount]     = useState(item.likeCount ?? 0);
  // Local comment count — incremented optimistically when user posts a comment
  const [commentCount,  setCommentCount]  = useState(item.commentsCount ?? 0);
  const [showComments,  setShowComments]  = useState(false);

  // Double-tap to like
  const lastTapRef = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const [toggleLike] = useToggleLikePostcardMutation();

  const author = item.author;
  const name = author?.displayName ?? author?.username ?? 'User';
  const username = author?.username ?? '';
  const primaryMedia = item.media?.find((m) => !!m.mediaUrl);
  const mediaUrl   = primaryMedia?.mediaUrl ?? null;
  const isVideo    = primaryMedia?.mediaType === 'VIDEO';
  const hasMultiple = (item.media?.filter((m) => !!m.mediaUrl).length ?? 0) > 1;

  const triggerLike = async () => {
    const wasLiked = liked;
    setLiked(true);
    setLikeCount((c) => wasLiked ? c : c + 1);

    // Burst heart animation
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(400),
      Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    if (!wasLiked) {
      try {
        const res = await toggleLike({ eventId: item.event?.id ?? '', postcardId: item.id }).unwrap();
        if (res?.currentLikes !== undefined) setLikeCount(res.currentLikes);
        if (res?.liked !== undefined) setLiked(res.liked);
      } catch {
        setLiked(wasLiked);
        setLikeCount((c) => c - 1);
      }
    }
  };

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      const res = await toggleLike({ eventId: item.event?.id ?? '', postcardId: item.id }).unwrap();
      if (res?.currentLikes !== undefined) setLikeCount(res.currentLikes);
      if (res?.liked !== undefined) setLiked(res.liked);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleMediaPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      triggerLike();
    } else {
      // Single tap — open viewer after short delay to detect double
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 290) {
          onPress(item);
        }
      }, 310);
    }
    lastTapRef.current = now;
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
      <TouchableOpacity activeOpacity={0.92} onPress={handleMediaPress} style={styles.mediaWrap}>
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
        {/* Double-tap heart burst */}
        <Animated.View
          style={[styles.heartBurst, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={80} color={brand.primary} />
        </Animated.View>
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
          <Text style={styles.actionCount}>{commentCount}</Text>
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

      {/* ── Comments sheet ── */}
      {showComments && (
        <Modal
          visible={showComments}
          animationType="slide"
          transparent
          onRequestClose={() => setShowComments(false)}
        >
          <View style={styles.modalOverlay}>
            <CommentSheet
              postcardId={item.id}
              onClose={() => setShowComments(false)}
              onCommentPosted={() => setCommentCount((c) => c + 1)}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Comment Sheet ────────────────────────────────────────────────────────────

function CommentSheet({
  postcardId,
  onClose,
  onCommentPosted,
}: {
  postcardId: string;
  onClose: () => void;
  onCommentPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [postComment, { isLoading: isPosting }] = useCommentOnPostcardMutation();
  const { data: commentsData, isLoading } = useGetPostcardCommentsQuery(postcardId);

  // Local list — starts from server data, optimistic entries appended immediately
  const serverComments: any[] = commentsData?.data ?? commentsData ?? [];
  const [optimisticComments, setOptimisticComments] = useState<any[]>([]);
  const allComments = [...serverComments, ...optimisticComments];

  // Keep optimistic list in sync: drop any optimistic entry whose id now
  // appears in the server list (server confirmed it)
  React.useEffect(() => {
    if (serverComments.length > 0 && optimisticComments.length > 0) {
      const serverIds = new Set(serverComments.map((c) => c.id));
      setOptimisticComments((prev) => prev.filter((c) => !serverIds.has(c.id)));
    }
  }, [serverComments.length]);

  const submit = async () => {
    const t = body.trim();
    if (!t || isPosting) return;

    // 1. Clear input immediately
    setBody('');

    // 2. Add optimistic entry right away
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticEntry = {
      id: optimisticId,
      content: t,
      createdAt: new Date().toISOString(),
      author: { displayName: 'You' },
      _optimistic: true,
    };
    setOptimisticComments((prev) => [...prev, optimisticEntry]);

    // 3. Notify parent so the count badge updates
    onCommentPosted();

    try {
      // 4. Fire API — on success the invalidation refetches server list
      await postComment({ postcardId, content: t }).unwrap();
    } catch {
      // Roll back: remove optimistic entry and restore input
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setBody(t);
      onCommentPosted(); // undo the count increment in the parent
      Toast.show({ type: 'error', text1: 'Could not post comment' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={cs.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={cs.header}>
        <Text style={cs.title}>
          Comments{allComments.length > 0 ? ` (${allComments.length})` : ''}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && allComments.length === 0 ? (
        <View style={cs.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : allComments.length === 0 ? (
        <View style={cs.center}>
          <Text style={cs.empty}>No comments yet. Be the first!</Text>
        </View>
      ) : (
        <FlatList
          data={allComments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          renderItem={({ item: c }) => {
            const name = c.author?.displayName ?? c.author?.username ?? 'User';
            return (
              <View style={[cs.row, c._optimistic && cs.rowOptimistic]}>
                {c.author?.avatarUrl ? (
                  <Image source={{ uri: c.author.avatarUrl }} style={cs.avatar} resizeMode="cover" />
                ) : (
                  <View style={cs.avatarFb}>
                    <Text style={cs.avatarL}>{name[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={cs.name}>{name}</Text>
                  <Text style={cs.content}>{c.content ?? c.body}</Text>
                </View>
                {c._optimistic && (
                  <ActivityIndicator size="small" color={neutral[400]} style={{ marginLeft: 6 }} />
                )}
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={cs.inputRow}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Add a comment…"
          placeholderTextColor={neutral[400]}
          style={cs.input}
          returnKeyType="send"
          onSubmitEditing={submit}
          autoFocus
        />
        <TouchableOpacity
          onPress={submit}
          disabled={!body.trim() || isPosting}
          style={[cs.send, (!body.trim() || isPosting) && { opacity: 0.4 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  heartBurst:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  actions:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 16 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },

  captionRow:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 6 },
  captionUser:  { fontFamily: fontFamily.bold,    fontSize: fontSize.sm, color: neutral[800] },
  caption:      { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], flex: 1 },

  eventRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 },
  eventName:    { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
});

// ─── Comment sheet styles ─────────────────────────────────────────────────────

const cs = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', minHeight: 280 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200],
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  empty: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  row: { flexDirection: 'row', gap: 10 },
  rowOptimistic: { opacity: 0.6 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFb: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${brand.primary}20`, alignItems: 'center', justifyContent: 'center',
  },
  avatarL: { fontFamily: fontFamily.bold, fontSize: 13, color: brand.primary },
  name: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  content: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], marginTop: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral[200],
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  input: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: neutral[200], backgroundColor: neutral[100],
    paddingHorizontal: 14, fontFamily: fontFamily.regular,
    fontSize: fontSize.sm, color: neutral[800],
  },
  send: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center',
  },
});
