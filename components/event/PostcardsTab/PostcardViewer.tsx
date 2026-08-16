import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
  useCommentOnPostcardMutation,
  useGetPostcardCommentsQuery,
  useToggleLikePostcardMutation,
} from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import type { PostcardData, PostcardMediaItem } from './types';

const { width: W, height: H } = Dimensions.get('window');

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

function VideoPlayer({
  src,
  active,
  overlayUrl,
}: {
  src: string;
  active: boolean;
  overlayUrl?: string | null;
}) {
  const videoRef = useRef<Video>(null);
  const [muted, setMuted] = useState(true);
  const [buffering, setBuffering] = useState(true);

  useEffect(() => {
    if (active) {
      videoRef.current?.playAsync().catch(() => {});
    } else {
      videoRef.current?.pauseAsync().catch(() => {});
      videoRef.current?.setPositionAsync(0).catch(() => {});
    }
  }, [active]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {buffering && (
        <View style={vp.buffer}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      <Video
        ref={videoRef}
        source={{ uri: src }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={muted}
        shouldPlay={active}
        onReadyForDisplay={() => setBuffering(false)}
        onLoadStart={() => setBuffering(true)}
      />
      {overlayUrl && (
        <Image
          source={{ uri: overlayUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          pointerEvents="none"
        />
      )}
      <TouchableOpacity
        style={vp.muteBtn}
        onPress={() => setMuted((m) => !m)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const vp = StyleSheet.create({
  buffer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 5,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 80,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

// ─── CommentSheet ─────────────────────────────────────────────────────────────

function CommentSheet({
  postcardId,
  onClose,
}: {
  postcardId: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [postComment, { isLoading: isPosting }] =
    useCommentOnPostcardMutation();
  const { data: commentsData, isLoading, refetch } =
    useGetPostcardCommentsQuery(postcardId);
  const comments = commentsData?.data ?? [];

  const submit = async () => {
    const t = body.trim();
    if (!t) return;
    setBody('');
    try {
      await postComment({ postcardId, content: t }).unwrap();
      refetch();
    } catch {
      setBody(t);
      Toast.show({ type: 'error', text1: 'Could not post comment' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={cs.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={cs.header}>
        <Text style={cs.title}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={cs.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={cs.center}>
          <Text style={cs.empty}>No comments yet. Be the first!</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          renderItem={({ item: c }) => {
            const name =
              c.author?.displayName ?? c.author?.username ?? 'User';
            return (
              <View style={cs.row}>
                {c.author?.avatarUrl ? (
                  <Image
                    source={{ uri: c.author.avatarUrl }}
                    style={cs.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={cs.avatarFb}>
                    <Text style={cs.avatarL}>
                      {name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={cs.name}>{name}</Text>
                  <Text style={cs.content}>{c.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

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
          {isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  row: { flexDirection: 'row', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFb: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${brand.primary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarL: { fontFamily: fontFamily.bold, fontSize: 13, color: brand.primary },
  name: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  content: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
  },
  input: {
    flex: 1, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: neutral[200],
    backgroundColor: neutral[100],
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800],
  },
  send: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── PostcardCard ─────────────────────────────────────────────────────────────
// Full-screen card: media fills entire screen, info overlaid at bottom

function PostcardCard({
  postcard,
  eventId,
  active,
}: {
  postcard: PostcardData;
  eventId: string;
  active: boolean;
}) {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [liked, setLiked] = useState(postcard.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(postcard.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [toggleLike] = useToggleLikePostcardMutation();

  const media: PostcardMediaItem[] = (postcard.media ?? []).filter(
    (m) => !!m.mediaUrl,
  );

  const displayName =
    postcard.author?.displayName?.trim() ||
    postcard.author?.username?.trim() ||
    'User';

  const caption = postcard.caption ?? '';
  const MAX_CAP = 80;
  const isLong = caption.length > MAX_CAP;
  const shownCaption =
    expanded || !isLong ? caption : `${caption.slice(0, MAX_CAP)}…`;

  const timeAgo = postcard.createdAt
    ? getTimeAgo(new Date(postcard.createdAt))
    : '';

  useEffect(() => {
    setMediaIdx(0);
    setLiked(postcard.isLiked ?? false);
    setLikeCount(postcard.likeCount ?? 0);
    setExpanded(false);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [postcard.id]);

  const handleLike = useCallback(async () => {
    if (!postcard.id) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => (was ? c - 1 : c + 1));
    try {
      const res = await toggleLike({
        eventId,
        postcardId: postcard.id,
      }).unwrap();
      if (res?.currentLikes !== undefined) setLikeCount(res.currentLikes);
      if (res?.liked !== undefined) setLiked(res.liked);
    } catch {
      setLiked(was);
      setLikeCount((c) => (was ? c + 1 : c - 1));
    }
  }, [liked, postcard.id, eventId, toggleLike]);

  if (media.length === 0) return null;

  return (
    <View style={{ width: W, height: H, backgroundColor: '#000' }}>
      {/* ── Full-screen media carousel ─────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setMediaIdx(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        style={StyleSheet.absoluteFillObject}
      >
        {media.map((m, i) => (
          <View key={m.id ?? i} style={{ width: W, height: H }}>
            {m.mediaType === 'VIDEO' ? (
              <VideoPlayer
                src={m.mediaUrl!}
                active={active && i === mediaIdx}
                overlayUrl={m.vibeTagOverlayUrl}
              />
            ) : (
              <Image
                source={{ uri: m.mediaUrl! }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Gradient overlay — bottom 45% ──────────────────────────── */}
      <View style={ov.gradient} pointerEvents="none" />

      {/* ── Dot indicators ─────────────────────────────────────────── */}
      {media.length > 1 && (
        <View style={ov.dots} pointerEvents="none">
          {media.map((_, i) => (
            <View
              key={i}
              style={[ov.dot, i === mediaIdx && ov.dotActive]}
            />
          ))}
        </View>
      )}

      {/* ── Multi-media badge ───────────────────────────────────────── */}
      {media.length > 1 && (
        <View style={ov.multiBadge} pointerEvents="none">
          <Ionicons name="layers" size={13} color="#fff" />
          <Text style={ov.multiText}>{media.length}</Text>
        </View>
      )}

      {/* ── Bottom info overlay ─────────────────────────────────────── */}
      <View style={ov.infoWrap} pointerEvents="box-none">
        {/* Author */}
        <View style={ov.authorRow}>
          {postcard.author?.avatarUrl ? (
            <Image
              source={{ uri: postcard.author.avatarUrl }}
              style={ov.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={ov.avatarFb}>
              <Text style={ov.avatarL}>
                {displayName[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={ov.authorName} numberOfLines={1}>
              {displayName}
            </Text>
            {timeAgo ? (
              <Text style={ov.timeAgo}>{timeAgo}</Text>
            ) : null}
          </View>
        </View>

        {/* Caption */}
        {caption ? (
          <Text style={ov.caption}>
            {shownCaption}
            {isLong && (
              <Text
                style={ov.readMore}
                onPress={() => setExpanded((v) => !v)}
              >
                {expanded ? ' less' : ' more'}
              </Text>
            )}
          </Text>
        ) : null}

        {/* Actions row */}
        <View style={ov.actions}>
          <TouchableOpacity
            onPress={handleLike}
            style={ov.actionBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={26}
              color={liked ? '#FF6584' : '#fff'}
            />
            <Text style={ov.actionCount}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowComments(true)}
            style={ov.actionBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
            <Text style={ov.actionCount}>{postcard.commentCount ?? 0}</Text>
          </TouchableOpacity>

          <View style={ov.actionBtn}>
            <Ionicons name="eye-outline" size={24} color="#fff" />
            <Text style={ov.actionCount}>{postcard.viewCount ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* Comments */}
      {showComments && postcard.id && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowComments(false)}
        >
          <CommentSheet
            postcardId={postcard.id}
            onClose={() => setShowComments(false)}
          />
        </Modal>
      )}
    </View>
  );
}

// ── Overlay styles ─────────────────────────────────────────────────────────────

const ov = StyleSheet.create({
  // Black gradient from mid-screen to bottom
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.5,
    // Approximated gradient — solid on bottom, transparent at top
    backgroundColor: 'transparent',
    // We use two views to fake a gradient
  },

  dots: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 16, height: 6, borderRadius: 3,
    backgroundColor: '#fff',
  },

  multiBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 18,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  multiText: { fontFamily: fontFamily.bold, fontSize: 11, color: '#fff' },

  // Overlaid info at bottom of screen
  infoWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 60,
    // Gradient-like darkening
    backgroundColor: 'rgba(0,0,0,0.0)',
    gap: 8,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFb: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${brand.primary}CC`,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarL: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
  authorName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: '#fff',
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  readMore: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 2,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

// ─── GradientFade helper ──────────────────────────────────────────────────────
// Two stacked Views faking a top-transparent → bottom-dark gradient

function GradientFade() {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: H * 0.55,
        // Can't use LinearGradient without expo-linear-gradient in this view,
        // but we have it — let's use it properly with a multi-stop approach
        // via nested views with increasing opacity
      }}
      pointerEvents="none"
    >
      {[0.0, 0.05, 0.12, 0.22, 0.38, 0.55, 0.72].map((op, i, arr) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${op})`,
          }}
        />
      ))}
    </View>
  );
}

// ─── PostcardViewer ───────────────────────────────────────────────────────────

export interface PostcardViewerProps {
  postcards: PostcardData[];
  initialIndex: number;
  eventId: string;
  onClose: () => void;
}

export function PostcardViewer({
  postcards,
  initialIndex,
  eventId,
  onClose,
}: PostcardViewerProps) {
  const listRef = useRef<FlatList<PostcardData>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex > 0) {
      // Small delay so FlatList has laid out
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: PostcardData; index: number }) => (
      <PostcardCard
        postcard={item}
        eventId={eventId}
        active={index === activeIndex}
      />
    ),
    [activeIndex, eventId],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: H, offset: H * index, index }),
    [],
  );

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          ref={listRef}
          data={postcards}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          decelerationRate="fast"
          removeClippedSubviews
          windowSize={3}
          maxToRenderPerBatch={2}
          // Each card renders its own GradientFade and info overlay
          ListHeaderComponent={null}
        />

        {/* Back button — always on top */}
        <SafeAreaView
          style={pv.overlay}
          edges={['top']}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={pv.backBtn}
            onPress={onClose}
            hitSlop={10}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {postcards.length > 1 && (
            <View style={pv.counter}>
              <Text style={pv.counterText}>
                {activeIndex + 1} / {postcards.length}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const pv = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#fff',
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
