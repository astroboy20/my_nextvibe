import { Skeleton } from "@/components/ui/Skeleton";
import { brand } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeletePostcardMutation,
  useGetPostcardQuery,
  useToggleLikePostcardMutation,
  useTrackPostcardViewMutation,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { CommentSheet } from "./Commentsheet";
import { GradientFade } from "./Gradientfade";
import type { PostcardData, PostcardMediaItem } from "./types";
import { getTimeAgo } from "./utils/timeAgo";
import { VideoPlayer } from "./Videoplayer";
import { Avatar } from "../ui/Avatar";

const { width: W } = Dimensions.get("window");

// Full-screen card: media fills entire screen, info overlaid at bottom
export const PostcardCard = React.memo(function PostcardCard({
  postcard,
  eventId,
  active,
  onDeleted,
  isConnected = true,
  height: H,
}: {
  postcard: PostcardData;
  eventId: string;
  active: boolean;
  onDeleted?: (postcardId: string) => void;
  isConnected?: boolean;
  height: number;
}) {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [liked, setLiked] = useState(postcard.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(postcard.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // ── Double-tap heart burst ────────────────────────────────────────────────
  const lastTapRef = useRef(0);
  // Guards against a swipe-between-media being misread as a tap — set on
  // drag start, checked (and cleared) on touch end.
  const didScrollRef = useRef(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const [toggleLike] = useToggleLikePostcardMutation();
  const [trackView] = useTrackPostcardViewMutation();
  const [deletePostcard, { isLoading: isDeleting }] =
    useDeletePostcardMutation();
  const { user } = useAuth();

  // ── View tracking — 1.5 s dwell when card is active ──────────────────────
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (active && postcard.id && !hasTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        hasTrackedRef.current = true;
        trackView({ postcardId: postcard.id! }).catch(() => {});
      }, 1500);
    } else {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    }
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [active, postcard.id]);

  // Reset tracking flag when postcard changes
  useEffect(() => {
    hasTrackedRef.current = false;
  }, [postcard.id]);

  const media: PostcardMediaItem[] = (postcard.media ?? []).filter(
    (m) => !!m.mediaUrl
  );

  // Only poll for fresh stats on the active card, and only while online —
  // previously every mounted card (within the FlatList's render window)
  // polled independently, tripling network usage for no visible benefit.
  const { data: freshPostcard, isLoading } = useGetPostcardQuery(postcard.id!, {
    skip: !postcard.id,
    pollingInterval: active && isConnected ? 5_000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const freshData = freshPostcard?.data ?? freshPostcard;

  // Is the current user the author of this postcard?
  const isOwner =
    !!user?.id &&
    (freshData?.author?.id === user.id ||
      (postcard as any).authorId === user.id ||
      (postcard as any).author?.id === user.id);

  const displayName =
    freshData?.author?.displayName?.trim() ||
    freshData?.author?.username?.trim() ||
    postcard.author?.displayName?.trim() ||
    postcard.author?.username?.trim() ||
    "User";

  // Keep comment/view counts in sync with fresh polled data
  const freshCommentCount =
    freshData?.commentCount ??
    freshData?.commentsCount ??
    postcard.commentCount ??
    0;

  const freshViewCount = freshData?.viewCount ?? postcard.viewCount ?? 0;

  // Sync fresh liked state from server (only when not locally modified)
  useEffect(() => {
    if (freshData?.isLiked !== undefined) {
      setLiked(freshData.isLiked);
    }
    if (freshData?.likeCount !== undefined) {
      setLikeCount(freshData.likeCount);
    }
  }, [freshData?.isLiked, freshData?.likeCount]);

  const caption = postcard.caption ?? "";
  const MAX_CAP = 80;
  const isLong = caption.length > MAX_CAP;
  const shownCaption =
    expanded || !isLong ? caption : `${caption.slice(0, MAX_CAP)}…`;

  const timeAgo = postcard.createdAt
    ? getTimeAgo(new Date(postcard.createdAt))
    : "";

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

  // Burst the heart and fire like (only if not already liked)
  const burstLike = useCallback(async () => {
    // Always show the animation
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 14,
        speed: 14,
      }),
      Animated.delay(380),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    if (!postcard.id) return;
    // If already liked, just show the burst (no toggle)
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    try {
      const res = await toggleLike({
        eventId,
        postcardId: postcard.id,
      }).unwrap();
      if (res?.currentLikes !== undefined) setLikeCount(res.currentLikes);
      if (res?.liked !== undefined) setLiked(res.liked);
    } catch {
      setLiked(false);
      setLikeCount((c) => c - 1);
    }
  }, [liked, postcard.id, eventId, toggleLike, heartScale, heartOpacity]);

  // Single tap → no-op on media; double-tap → like burst.
  //
  // This listens directly on the media ScrollView's onTouchEnd rather than
  // wrapping it in a Touchable. A Touchable wrapping a ScrollView has to
  // wait for the ScrollView's own gesture-responder negotiation ("is this a
  // scroll or a tap?") before onPress fires — on a rapid double-tap that
  // delay eats into the 320ms window (and on Android the second tap can be
  // swallowed outright while the responder is still settling from the
  // first). onScrollBeginDrag sets didScrollRef so a swipe-between-media
  // isn't misread as a tap.
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      burstLike();
    }
    lastTapRef.current = now;
  }, [burstLike]);

  const handleDelete = useCallback(() => {
    if (!postcard.id) return;
    Alert.alert(
      "Delete Postcard",
      "This will permanently delete this postcard and all its likes and comments. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePostcard({
                postcardId: postcard.id!,
                eventId,
              }).unwrap();
              Toast.show({ type: "success", text1: "Postcard deleted" });
              onDeleted?.(postcard.id!);
            } catch (err: any) {
              const status = err?.status ?? err?.data?.statusCode;
              if (status === 403) {
                Toast.show({
                  type: "error",
                  text1: "You can only delete your own postcards.",
                });
              } else if (status === 404) {
                Toast.show({ type: "error", text1: "Postcard not found." });
                onDeleted?.(postcard.id!);
              } else {
                Toast.show({
                  type: "error",
                  text1: err?.data?.message ?? "Delete failed.",
                });
              }
            }
          },
        },
      ]
    );
  }, [postcard.id, eventId, deletePostcard, onDeleted]);

  if (media.length === 0) return null;

  // Only show the author skeleton on a true first paint — i.e. we have
  // nothing to show yet. If the postcard prop already carries author info
  // (the common case — it was passed in from the parent list), show that
  // immediately instead of flashing a skeleton every time the background
  // poll re-fires.
  const hasInitialAuthor = !!(
    postcard.author?.displayName || postcard.author?.username
  );
  const showAuthorSkeleton = isLoading && !hasInitialAuthor && !freshData;

  return (
    <View style={{ width: W, height: H, backgroundColor: "#000" }}>
      {/* ── Full-screen media carousel ─────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          didScrollRef.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          setMediaIdx(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        onTouchEnd={() => {
          if (didScrollRef.current) {
            didScrollRef.current = false;
            return;
          }
          handleMediaTap();
        }}
        style={StyleSheet.absoluteFill}
      >
        {media.map((m, i) => (
          <View key={m.id ?? i} style={{ width: W, height: H }}>
            {m.mediaType === "VIDEO" ? (
              active && i === mediaIdx ? (
                // VIDEO PLAYING: Render video with live overlay
                <VideoPlayer
                  src={m.mediaUrl!}
                  active={true}
                  overlayUrl={m.vibeTagOverlayUrl}
                  isConnected={isConnected}
                />
              ) : // VIDEO NOT PLAYING: Render thumbnail if present, otherwise fall back to video poster
              m.thumbnailUrl ? (
                <Image
                  source={{ uri: m.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  priority={i === mediaIdx ? "high" : "low"}
                />
              ) : (
                // Fallback to video's native poster frame
                <VideoPlayer
                  src={m.mediaUrl!}
                  active={false}
                  overlayUrl={m.vibeTagOverlayUrl}
                  isConnected={isConnected}
                />
              )
            ) : (
              // PHOTO: Always render directly (overlay already baked in)
              <Image
                source={{ uri: m.mediaUrl! }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                priority={i === mediaIdx ? "high" : "low"}
                recyclingKey={m.id ?? m.mediaUrl ?? undefined}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Double-tap heart burst ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.heartBurst,
          { opacity: heartOpacity, transform: [{ scale: heartScale }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="heart" size={120} color={brand.primary} />
      </Animated.View>

      {/* ── Gradient — bottom 50% so info is readable ──────────────── */}
      <GradientFade />

      {/* ── Bottom info overlay ─────────────────────────────────────── */}
      <View
        style={[styles.infoWrap, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        pointerEvents="box-none"
      >
        {/* Dot indicators — right above the author row, clearly visible */}
        {media.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {media.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === mediaIdx && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Author */}
        <View style={styles.authorRow}>
          {showAuthorSkeleton ? (
            <Skeleton width={36} height={36} borderRadius={19} />
          ) : (
            <Avatar
              uri={freshData?.author?.avatarUrl ?? postcard.author?.avatarUrl}
              name={displayName}
              size={38}
              border
            />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            {showAuthorSkeleton ? (
              <Skeleton width={100} height={13} borderRadius={6} />
            ) : (
              <Text style={styles.authorName} numberOfLines={1}>
                {displayName}
              </Text>
            )}
            {timeAgo ? <Text style={styles.timeAgo}>{timeAgo}</Text> : null}
          </View>
        </View>
        {/* Caption */}
        {caption ? (
          <Text style={styles.caption}>
            {shownCaption}
            {isLong && (
              <Text
                style={styles.readMore}
                onPress={() => setExpanded((v) => !v)}
              >
                {expanded ? " less" : " more"}
              </Text>
            )}
          </Text>
        ) : null}

        {/* Actions row */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleLike}
            style={styles.actionBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? brand.primary : "#fff"}
            />
            <Text style={styles.actionCount}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowComments(true)}
            style={styles.actionBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
            <Text style={styles.actionCount}>{freshCommentCount}</Text>
          </TouchableOpacity>

          <View style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={24} color="#fff" />
            <Text style={styles.actionCount}>{freshViewCount}</Text>
          </View>

          {/* Delete — only visible to the postcard owner */}
          {isOwner && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.actionBtn, { marginLeft: "auto" }]}
              activeOpacity={0.8}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size={18} color="rgba(255,255,255,0.8)" />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color="rgba(255,80,80,0.9)"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Multi-media badge — top right, small */}
      {media.length > 1 && (
        <View style={[styles.multiBadge, { top: insets.top + 12 }]} pointerEvents="none">
          <Ionicons name="layers" size={12} color="#fff" />
          <Text style={styles.multiText}>{media.length}</Text>
        </View>
      )}

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
});

const styles = StyleSheet.create({
  // Dots — inside infoWrap, above author row
  dots: {
    flexDirection: "row",
    gap: 5,
    alignSelf: "center",
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },

  // Multi-media badge — top right corner
  multiBadge: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  multiText: { fontFamily: fontFamily.bold, fontSize: 11, color: "#fff" },

  // Bottom info overlay — sits on top of the gradient
  infoWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 20,
    gap: 8,
  },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeAgo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: "#fff",
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  readMore: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.85)",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heartBurst: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
