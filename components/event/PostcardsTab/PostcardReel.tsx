
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetEventPostcardsQuery } from '@/store/api/eventsApi';
import type { PostcardData, VibeTag } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three event phases that can be viewed as separate reels. */
export type ReelPhase = 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT';

/** Props accepted by the top-level PostcardReel component (added in Task 6). */
export interface PostcardReelProps {
  /** The event whose postcards should be loaded. */
  eventId: string;
  /** Which phase's postcards to play. */
  phase: ReelPhase;
  /** VibeTag lookup map shared with PostcardsTab — used for phase filtering and overlay enrichment. */
  vibeTagMap: Record<string, VibeTag>;
  /** Called when the user closes the reel. */
  onClose: () => void;
}

// ─── Pure Utility Functions ───────────────────────────────────────────────────
// All functions below are side-effect-free and contain no React hooks.
// They are exported so property-based tests can import them directly.

/**
 * filterAndEnrichSlides
 *
 * Filters `raw` postcards to only those belonging to `phase` that have at
 * least one media item with a non-null, non-empty `mediaUrl`.  Then enriches
 * each media item's `vibeTagOverlayUrl` from `vibeTagMap` when the item does
 * not already carry one.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export function filterAndEnrichSlides(
  raw: PostcardData[],
  vibeTagMap: Record<string, VibeTag>,
  phase: ReelPhase,
): PostcardData[] {
  return raw
    .filter((p) => {
      const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
      const timingMatches = tag?.activityTiming === phase;
      const hasValidMedia = (p.media ?? []).some(
        (m) => m.mediaUrl != null && m.mediaUrl !== '',
      );
      return timingMatches && hasValidMedia;
    })
    .map((p) => {
      const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
      const overlayUrl = tag?.imageUrl ?? null;
      return {
        ...p,
        media: (p.media ?? []).map((m) => ({
          ...m,
          vibeTagOverlayUrl: m.vibeTagOverlayUrl ?? overlayUrl,
        })),
      };
    });
}

/**
 * effectiveDuration
 *
 * Returns the slide display duration in milliseconds:
 * - VIDEO  →  Math.min(durationMs ?? 10_000, 10_000)
 * - PHOTO (or anything else) → 3_000
 *
 * Requirements: 3.1, 4.1, 4.6
 */
export function effectiveDuration(
  mediaType: string | null | undefined,
  durationMs?: number,
): number {
  if (mediaType === 'VIDEO') {
    return Math.min(durationMs ?? 10_000, 10_000);
  }
  return 3_000;
}

/**
 * computeProgress
 *
 * Returns elapsedMs / totalMs clamped to [0, 1].
 * Used to drive the ProgressBar's active-segment fill fraction.
 *
 * Requirements: 3.5, 5.4
 */
export function computeProgress(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const raw = elapsedMs / totalMs;
  return Math.min(Math.max(raw, 0), 1);
}

/**
 * advanceIndex
 *
 * Returns the next slide index, wrapping back to 0 when the last slide is
 * reached (continuous loop).
 *
 * Requirements: 8.1
 */
export function advanceIndex(current: number, length: number): number {
  return (current + 1) % length;
}

/**
 * goBackIndex
 *
 * Returns the previous slide index.
 * - current > 0 → current - 1
 * - current === 0 → returns -1 as a "restart current slide" signal
 *
 * The caller (Reel_Controller) interprets -1 as "restart the current slide"
 * rather than navigating away from it.
 *
 * Requirements: 6.2
 */
export function goBackIndex(current: number, _length: number): number {
  if (current > 0) {
    return current - 1;
  }
  // Signal: restart the current slide from the beginning
  return -1;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
// Internal component — not exported.
//
// Renders one segment per slide in a horizontal row across the full width of
// the screen (minus horizontal safe-area padding supplied by the parent).
//
// • Segments at index < activeIndex  → fully-filled (width '100%')
// • Segments at index > activeIndex  → empty (width '0%')
// • Active segment                   → Animated.View whose width interpolates
//                                      from '0%' to '100%' driven by
//                                      progressAnim (0 → 1).
//
// useNativeDriver MUST be false because the animation drives a layout property
// (width).
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.7

interface ProgressBarProps {
  /** Total number of slides in the reel. */
  count: number;
  /** Zero-based index of the currently playing slide. */
  activeIndex: number;
  /**
   * Animated.Value in the range [0, 1] that represents how far through the
   * current slide's duration the reel has progressed.
   * 0 = just started, 1 = complete.
   */
  progressAnim: Animated.Value;
}

function ProgressBar({ count, activeIndex, progressAnim }: ProgressBarProps) {
  // Interpolate the 0-1 scalar into a percentage string for the width style.
  const activeWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    // Clamp so the value never exceeds the valid range even if the caller
    // briefly overshoots.
    extrapolate: 'clamp',
  });

  return (
    <View style={progressBarStyles.container}>
      {Array.from({ length: count }, (_, index) => {
        // ── Segment container ───────────────────────────────────────────────
        // Each segment is a thin rounded track (the background) with a
        // coloured fill overlaid on top.
        const isActive = index === activeIndex;
        const isFilled = index < activeIndex;

        return (
          <View key={index} style={progressBarStyles.segmentTrack}>
            {isActive ? (
              // Active segment: animated fill driven by the reel timer.
              <Animated.View
                style={[progressBarStyles.segmentFill, { width: activeWidth }]}
              />
            ) : (
              // Past segment: fully filled; future segment: empty.
              <View
                style={[
                  progressBarStyles.segmentFill,
                  { width: isFilled ? '100%' : '0%' },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const progressBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // gap between segments (Req 5.1 — "gap: 2")
    gap: 2,
    // Takes the full width of its parent; the parent (SafeAreaView) is
    // responsible for applying horizontal safe-area padding.
    width: '100%',
    alignItems: 'center',
  },
  segmentTrack: {
    // Each track expands equally to fill the available width.
    flex: 1,
    height: 2,
    borderRadius: 1,
    // Dim background so the track is visible over any media.
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
});

// Export for testing purposes (computeSegments helper used in optional 2.1 PBT)
// Returns an array of fill fractions: 1.0 for past, 0.0 for future,
// and progressFraction for the active segment.
export function computeSegments(
  count: number,
  activeIndex: number,
  progressFraction: number,
): number[] {
  return Array.from({ length: count }, (_, i) => {
    if (i < activeIndex) return 1.0;
    if (i > activeIndex) return 0.0;
    return Math.min(Math.max(progressFraction, 0), 1);
  });
}

// ─── ReelVideoPlayer ──────────────────────────────────────────────────────────
// Internal component — not exported.
//
// Wraps expo-video <VideoView> for reel playback with:
//  • contentFit="contain" — preserves aspect ratio without cropping
//  • loop=false — the Reel_Controller advances the slide instead
//  • muted=false — audio is on by default (matches reel experience)
//  • shouldPlay prop synced via useEffect → player.play() / player.pause()
//  • sourceLoad event → fires onDurationKnown so the parent can set effectiveDuration
//  • ActivityIndicator shown while statusChange === 'loading'
//  • Optional VibeTag overlay at opacity 0.65 (absolutely positioned, expo-image)
//
// The parent holds the ref and calls player.pause() / player.play() imperatively
// to synchronise with the Reel_Controller pause state (Requirements 4.4, 4.5).
//
// Requirements: 4.1, 4.2, 4.3, 10.2, 10.3

interface ReelVideoPlayerProps {
  /** Remote URI of the video to play. */
  src: string;
  /**
   * Whether the video should be playing.
   * Driven by `activeIndex === currentIndex && !isPaused` in the Reel_Controller.
   */
  shouldPlay: boolean;
  /**
   * Called once when the video has loaded enough to determine its duration.
   * Receives the duration in milliseconds so the Reel_Controller can set
   * effectiveDuration = min(ms, 10_000).
   */
  onDurationKnown: (ms: number) => void;
  /**
   * Forwarded ref so the parent can call player.pause() / player.play() imperatively.
   * Written by this component after the player is created.
   */
  videoRef: React.RefObject<VideoPlayer | null>;
  /** When non-null, renders a semi-transparent VibeTag overlay at opacity 0.65. */
  overlayUrl?: string | null;
}

function ReelVideoPlayer({
  src,
  shouldPlay,
  onDurationKnown,
  videoRef,
  overlayUrl,
}: ReelVideoPlayerProps) {
  const [buffering, setBuffering] = useState(true);

  // Create the player instance for this video source.
  // loop=false — the Reel_Controller advances the slide instead.
  const player = useVideoPlayer({ uri: src }, (p) => {
    p.loop = false;
    p.muted = false;
    if (shouldPlay) {
      p.play();
    }
  });

  // Write the player into the parent's ref so it can call
  // player.pause() / player.play() imperatively (Requirements 4.4, 4.5).
  useEffect(() => {
    (videoRef as React.MutableRefObject<VideoPlayer | null>).current = player;
    return () => {
      (videoRef as React.MutableRefObject<VideoPlayer | null>).current = null;
    };
  }, [player, videoRef]);

  // Sync shouldPlay → player.play() / player.pause() when the prop changes.
  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  // Duration is available once the source has fully loaded its metadata.
  // payload.duration is in seconds — convert to ms for the Reel_Controller.
  useEventListener(player, 'sourceLoad', ({ duration }) => {
    if (duration != null && duration > 0) {
      onDurationKnown(duration * 1_000);
    }
  });

  // Track buffering state via statusChange for the ActivityIndicator.
  useEventListener(player, 'statusChange', ({ status }) => {
    setBuffering(status === 'loading');
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Buffering indicator — shown while status is 'loading' */}
      {buffering && (
        <View style={rvpStyles.bufferOverlay}>
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      )}

      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />

      {/* VibeTag overlay — matches PostcardViewer behaviour (Req 10.3) */}
      {overlayUrl != null && overlayUrl !== '' && (
        <Image
          source={{ uri: overlayUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
          contentFit="cover"
          // Pointer events none so the GestureLayer above receives all touches
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const rvpStyles = StyleSheet.create({
  bufferOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    // Semi-transparent backdrop so the spinner is visible over any media
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    zIndex: 5,
  },
});

// ─── ReelSlide ────────────────────────────────────────────────────────────────
// Internal component — not exported.
//
// Renders the media content for a single postcard slide:
//   • VIDEO first-media → ReelVideoPlayer (expo-video, forwarded ref)
//   • PHOTO (or non-VIDEO) first-media → expo-image Image (contentFit="cover")
//
// Both branches composite a VibeTag overlay at opacity 0.65 when the enriched
// `vibeTagOverlayUrl` is present — matching the behaviour in PostcardViewer.
//
// Requirements: 10.1, 10.2, 10.3

interface ReelSlideProps {
  /** The enriched PostcardData for this slide (media + vibeTagOverlayUrl populated). */
  slide: PostcardData;
  /** True when this slide is the currently active one in the reel. */
  isActive: boolean;
  /** True when the reel is in the long-press paused state. */
  isPaused: boolean;
  /**
   * Ref written by ReelVideoPlayer with the active VideoPlayer instance so the
   * Reel_Controller can call player.pause() / player.play() imperatively
   * (Requirements 4.4, 4.5).
   */
  videoRef: React.RefObject<VideoPlayer | null>;
  /**
   * Called by ReelVideoPlayer once the video duration is known.
   * Signature matches ReelVideoPlayerProps.onDurationKnown.
   */
  onDurationKnown: (ms: number) => void;
}

function ReelSlide({
  slide,
  isActive,
  isPaused,
  videoRef,
  onDurationKnown,
}: ReelSlideProps) {
  // Grab the first media item — the reel always renders from media[0].
  const firstMedia = (slide.media ?? [])[0];

  // Derive whether this is a video slide (Requirement 10.2 vs 10.1).
  const isVideo = firstMedia?.mediaType === 'VIDEO';

  // The overlay URL was enriched by filterAndEnrichSlides (Requirement 10.3).
  const overlayUrl = firstMedia?.vibeTagOverlayUrl ?? null;

  // shouldPlay: only play when this slide is active AND the reel is not paused.
  const shouldPlay = isActive && !isPaused;

  if (!firstMedia?.mediaUrl) {
    // Guard: no valid media — render nothing (Reel_Controller skips these via
    // filterAndEnrichSlides, but be defensive here too).
    return null;
  }

  if (isVideo) {
    // ── Video branch (Requirement 10.2) ──────────────────────────────────────
    return (
      <View style={StyleSheet.absoluteFill}>
        <ReelVideoPlayer
          src={firstMedia.mediaUrl}
          shouldPlay={shouldPlay}
          onDurationKnown={onDurationKnown}
          videoRef={videoRef}
          overlayUrl={overlayUrl}
        />
      </View>
    );
  }

  // ── Photo branch (Requirement 10.1) ────────────────────────────────────────
  // expo-image Image with contentFit="cover" filling the full screen.
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri: firstMedia.mediaUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* VibeTag overlay — semi-transparent, absolutely positioned (Req 10.3) */}
      {overlayUrl != null && overlayUrl !== '' && (
        <Image
          source={{ uri: overlayUrl }}
          style={[StyleSheet.absoluteFill, reelSlideStyles.overlay]}
          contentFit="cover"
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const reelSlideStyles = StyleSheet.create({
  overlay: {
    opacity: 0.65,
  },
});

// ─── BottomInfoOverlay ────────────────────────────────────────────────────────
// Internal component — not exported.
//
// Renders author name, caption, and engagement count badges (likes, comments,
// views) absolutely positioned at the bottom of the full-screen reel view.
// Padding accounts for the device's safe-area bottom inset so content is never
// hidden behind the home indicator.
//
// Requirements: 10.4

interface BottomInfoOverlayProps {
  /** The enriched PostcardData for the currently active slide. */
  slide: PostcardData;
  /** Safe-area bottom inset in pixels (from useSafeAreaInsets). */
  insetBottom: number;
}

function BottomInfoOverlay({ slide, insetBottom }: BottomInfoOverlayProps) {
  // Prefer displayName, fall back to username.
  const authorName =
    slide.author?.displayName ??
    slide.author?.username ??
    'Unknown';

  return (
    <View
      style={[
        bioStyles.container,
        { paddingBottom: insetBottom + 16 },
      ]}
      pointerEvents="none"
    >
      {/* Author name */}
      <Text style={bioStyles.authorName} numberOfLines={1}>
        {authorName}
      </Text>

      {/* Caption — up to 3 lines before truncating */}
      {!!slide.caption && (
        <Text style={bioStyles.caption} numberOfLines={3}>
          {slide.caption}
        </Text>
      )}

      {/* Engagement count badges */}
      <View style={bioStyles.badgeRow}>
        {/* Likes */}
        <View style={bioStyles.badge}>
          <Ionicons name="heart-outline" size={16} color="#ffffff" />
          <Text style={bioStyles.badgeText}>
            {slide.likeCount ?? 0}
          </Text>
        </View>

        {/* Comments */}
        <View style={bioStyles.badge}>
          <Ionicons name="chatbubble-outline" size={16} color="#ffffff" />
          <Text style={bioStyles.badgeText}>
            {slide.commentCount ?? 0}
          </Text>
        </View>

        {/* Views */}
        <View style={bioStyles.badge}>
          <Ionicons name="eye-outline" size={16} color="#ffffff" />
          <Text style={bioStyles.badgeText}>
            {slide.viewCount ?? 0}
          </Text>
        </View>
      </View>
    </View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0, 0, 0, 0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const bioStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    // Gradient-like fade so text is legible over any media colour.
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    ...TEXT_SHADOW,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: '#ffffff',
    lineHeight: 18,
    ...TEXT_SHADOW,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    ...TEXT_SHADOW,
  },
});

// ─── GestureLayer ─────────────────────────────────────────────────────────────
// Internal component — not exported.
//
// Covers the entire screen (absoluteFill, zIndex 10) and handles:
//  • Long-press (≥500ms) on any part of the screen → pause the reel
//  • Finger lift (onPressOut) after a long-press → resume the reel
//  • Short tap on the LEFT 50% → go back one slide (guarded by longPressActiveRef)
//  • Short tap on the RIGHT 50% → advance one slide (guarded by longPressActiveRef)
//
// The `longPressActiveRef` flag prevents the inner TouchableOpacity onPress
// callbacks from firing when the user lifts their finger after a long-press.
//
// Requirements: 6.1, 6.2, 6.5, 7.1, 7.4

interface GestureLayerProps {
  /** Shared ref that is set to true for the duration of a long-press. */
  longPressActiveRef: React.MutableRefObject<boolean>;
  /** Called when a long-press begins — transitions the reel to paused state. */
  pauseReel: () => void;
  /** Called when the finger is lifted after a long-press — resumes the reel. */
  resumeReel: () => void;
  /** Navigates to the previous slide (or restarts if already at index 0). */
  goBack: () => void;
  /** Advances to the next slide (wraps on last). */
  advance: () => void;
}

function GestureLayer({
  longPressActiveRef,
  pauseReel,
  resumeReel,
  goBack,
  advance,
}: GestureLayerProps) {
  return (
    <View style={gestureStyles.container}>
      <TouchableWithoutFeedback
        delayLongPress={500}
        onLongPress={() => {
          longPressActiveRef.current = true;
          pauseReel();
        }}
        onPressOut={() => {
          if (longPressActiveRef.current) {
            longPressActiveRef.current = false;
            resumeReel();
          }
        }}
      >
        {/* Inner View must be a single child of TouchableWithoutFeedback */}
        <View style={gestureStyles.zonesRow}>
          {/* Left zone — go back */}
          <TouchableOpacity
            style={gestureStyles.zone}
            activeOpacity={1}
            onPress={() => {
              if (!longPressActiveRef.current) {
                goBack();
              }
            }}
          />

          {/* Right zone — advance */}
          <TouchableOpacity
            style={gestureStyles.zone}
            activeOpacity={1}
            onPress={() => {
              if (!longPressActiveRef.current) {
                advance();
              }
            }}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const gestureStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  zonesRow: {
    flex: 1,
    flexDirection: 'row',
  },
  zone: {
    flex: 1,
  },
});

// ─── PostcardReel (Reel_Controller) ──────────────────────────────────────────
//
// The main exported component.  It owns:
//   • Data fetching + phase filtering (useGetEventPostcardsQuery + filterAndEnrichSlides)
//   • Reel_Controller state — activeIndex, isPaused
//   • Timer architecture — Animated.timing (progress) + 16ms setInterval (elapsed tracking)
//   • Imperative video control — videoRef player.pause() / player.play()
//   • Navigation handlers — advance, goBack, pauseReel, resumeReel
//   • Rendering — Modal → full-screen View → ReelSlide → BottomInfoOverlay
//                 → GestureLayer → SafeAreaView (ProgressBar + close button)
//                 → loading / empty state branches
//
// Requirements: 1.3, 1.4, 2.4, 2.5, 3.1–3.5, 4.1–4.6, 5.5–5.6,
//               6.1–6.4, 7.1–7.7, 8.1–8.3, 9.1–9.3, 12.1–12.3

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function PostcardReel({
  eventId,
  phase,
  vibeTagMap,
  onClose,
}: PostcardReelProps): React.JSX.Element {
  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: rawData, isLoading } = useGetEventPostcardsQuery(
    { eventId, limit: 100 },
    { skip: !eventId },
  );

  // Unwrap the paginated response envelope — matches the pattern used in PhaseGrid.
  const rawList: PostcardData[] = (rawData as any)?.data?.data
    ?? (rawData as any)?.data
    ?? [];

  // Filter to the active phase and enrich overlays (Requirements 2.1–2.3).
  const slides: PostcardData[] = filterAndEnrichSlides(rawList, vibeTagMap, phase);

  // ── Reel_Controller state ───────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);       // Req 1.4
  const [isPaused, setIsPaused] = useState(false);         // Req 7.7

  // ── Refs ────────────────────────────────────────────────────────────────────
  const elapsedRef   = useRef(0);                                            // ms elapsed on current slide
  const durationRef  = useRef(3_000);                                        // effective duration for current slide
  const animRef      = useRef<Animated.CompositeAnimation | null>(null);     // active Animated.timing handle
  const progressAnim = useRef(new Animated.Value(0)).current;               // 0→1 for the active segment
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);  // 16ms tick handle
  const longPressActiveRef = useRef(false);                                  // long-press disambiguation flag
  const videoRef     = useRef<VideoPlayer | null>(null);                        // imperative video control

  // ── Safe-area inset for BottomInfoOverlay ───────────────────────────────────
  const insets = useSafeAreaInsets();

  // ── Helper: tear down the current slide's timer ──────────────────────────────
  const clearSlideTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animRef.current !== null) {
      animRef.current.stop();
      animRef.current = null;
    }
  }, []);

  // ── Helper: start animation + interval from a given elapsed offset ───────────
  const startSlideTimer = useCallback(
    (fromElapsed: number, totalDuration: number) => {
      const remaining = Math.max(totalDuration - fromElapsed, 0);

      // Drive the progress bar animation (useNativeDriver: false — width property).
      const startValue = totalDuration > 0 ? fromElapsed / totalDuration : 0;
      progressAnim.setValue(startValue);

      const anim = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remaining,
        useNativeDriver: false,
      });
      animRef.current = anim;
      // Note: advance() is resolved via closure captured below in the effect.
      anim.start(({ finished }) => {
        if (finished) {
          // Animated.timing completed naturally — advance to next slide.
          advanceSlide();
        }
      });

      // 16ms interval to track elapsed ms for pause/resume accuracy (Req 3.4, 4.5).
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 16;
        if (elapsedRef.current >= durationRef.current) {
          // Belt-and-suspenders: the animation callback above is the primary
          // driver; this guards against edge cases where animation finishes
          // slightly early/late.
          clearSlideTimer();
          advanceSlide();
        }
      }, 16);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progressAnim, clearSlideTimer],
  );

  // ── Navigation handlers ──────────────────────────────────────────────────────
  // Defined with useCallback so they are stable references inside effects.

  // advanceSlide is captured in startSlideTimer via closure; we define it as a
  // ref-backed stable function to avoid stale closure issues.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const slidesLengthRef = useRef(slides.length);
  slidesLengthRef.current = slides.length;

  function advanceSlide() {
    const next = advanceIndex(activeIndexRef.current, slidesLengthRef.current);
    setActiveIndex(next);
  }

  const advance = useCallback(() => {
    clearSlideTimer();
    const next = advanceIndex(activeIndexRef.current, slidesLengthRef.current);
    setActiveIndex(next);
  }, [clearSlideTimer]);

  const goBack = useCallback(() => {
    clearSlideTimer();
    const result = goBackIndex(activeIndexRef.current, slidesLengthRef.current);
    if (result === -1) {
      // Restart current slide from the beginning (Req 6.3).
      elapsedRef.current = 0;
      progressAnim.setValue(0);
      const dur = durationRef.current;
      startSlideTimer(0, dur);
    } else {
      setActiveIndex(result);
    }
  }, [clearSlideTimer, progressAnim, startSlideTimer]);

  const pauseReel = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeReel = useCallback(() => {
    setIsPaused(false);
  }, []);

  // ── useEffect: slide activation ──────────────────────────────────────────────
  // Fires when activeIndex changes (including on mount for index 0).
  // Resets elapsed/duration/progress and starts the timer for the new slide.
  //
  // Requirements: 1.4, 3.1, 4.3, 5.5, 5.6, 8.2
  useEffect(() => {
    if (slides.length === 0) return;

    const slide = slides[activeIndex];
    if (!slide) return;

    clearSlideTimer();

    // Determine the media type of the first media item.
    const firstMedia = (slide.media ?? [])[0];
    const mediaType = firstMedia?.mediaType ?? null;

    // Default duration — for video we use 10 000ms until onLoad fires (Req 4.3).
    const dur = effectiveDuration(mediaType);
    durationRef.current = dur;
    elapsedRef.current = 0;
    progressAnim.setValue(0);

    startSlideTimer(0, dur);

    return () => {
      clearSlideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slides.length]);

  // ── useEffect: pause / resume ────────────────────────────────────────────────
  // Synchronises Animated.timing + interval + video playback with isPaused.
  //
  // Requirements: 3.3–3.4, 4.4–4.5, 7.1–7.6
  useEffect(() => {
    if (isPaused) {
      // ── Pause ────────────────────────────────────────────────────────────────
      clearSlideTimer();
      // Pause video if the active slide is a video slide (Req 7.3).
      videoRef.current?.pause();
    } else {
      // ── Resume ───────────────────────────────────────────────────────────────
      // Restart animation + interval from the saved elapsed position (Req 3.4, 7.5).
      startSlideTimer(elapsedRef.current, durationRef.current);
      // Resume video playback (Req 4.5, 7.6).
      videoRef.current?.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  // Requirement 9.3
  useEffect(() => {
    return () => {
      clearSlideTimer();
      videoRef.current?.pause();
    };
  }, [clearSlideTimer]);

  // ── Video load handler ───────────────────────────────────────────────────────
  // Called by ReelSlide/ReelVideoPlayer when the video has loaded enough to
  // report its actual duration.  Recalculates effectiveDuration and restarts
  // the animation with the corrected remaining time, provided the slide hasn't
  // already advanced.
  //
  // Requirements: 4.1, 4.3
  const handleVideoLoad = useCallback(
    (durationMs: number) => {
      const effective = effectiveDuration('VIDEO', durationMs);
      // Guard: don't update if the slide has already advanced.
      if (elapsedRef.current >= durationRef.current) return;
      if (effective === durationRef.current) return; // no change needed
      durationRef.current = effective;
      // Restart the animation from current elapsed with the corrected duration.
      clearSlideTimer();
      startSlideTimer(elapsedRef.current, effective);
    },
    [clearSlideTimer, startSlideTimer],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  // Loading state (Req 2.4)
  const loadingNode = (
    <View style={rc.loadingWrap}>
      <ActivityIndicator color="#ffffff" size="large" />
    </View>
  );

  // Empty state (Req 2.5)
  const emptyNode = (
    <View style={rc.emptyWrap}>
      <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.5)" />
      <Text style={rc.emptyTitle}>No postcards for this phase yet</Text>
      <TouchableOpacity onPress={onClose} style={rc.emptyCloseBtn} activeOpacity={0.8}>
        <Text style={rc.emptyCloseBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  const currentSlide = slides[activeIndex] ?? null;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Full-screen black background (Req 12.1, 12.3) */}
      <View style={rc.screenBg}>

        {/* ── Content branches ─────────────────────────────────────────────── */}
        {isLoading ? loadingNode
          : slides.length === 0 ? emptyNode
          : currentSlide != null ? (
            <>
              {/* Media content — fills edge-to-edge behind safe area (Req 12.3) */}
              <ReelSlide
                slide={currentSlide}
                isActive
                isPaused={isPaused}
                videoRef={videoRef}
                onDurationKnown={handleVideoLoad}
              />

              {/* Author / caption / counts overlay at the bottom (Req 10.4) */}
              <BottomInfoOverlay
                slide={currentSlide}
                insetBottom={insets.bottom}
              />

              {/* Gesture capture layer — sits above media, below progress bar (Req 6.1, 6.2, 7.1) */}
              <GestureLayer
                longPressActiveRef={longPressActiveRef}
                pauseReel={pauseReel}
                resumeReel={resumeReel}
                goBack={goBack}
                advance={advance}
              />

              {/* SafeAreaView: Progress bar + close button inset within safe area (Req 12.2) */}
              <SafeAreaView
                edges={['top']}
                style={rc.safeTop}
                pointerEvents="box-none"
              >
                <View style={rc.topBar} pointerEvents="box-none">
                  <ProgressBar
                    count={slides.length}
                    activeIndex={activeIndex}
                    progressAnim={progressAnim}
                  />

                  {/* Close button (Req 9.1, 9.2) */}
                  <TouchableOpacity
                    onPress={onClose}
                    style={rc.closeBtn}
                    hitSlop={10}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </>
          ) : null}

      </View>
    </Modal>
  );
}

const rc = StyleSheet.create({
  screenBg: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000000',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyCloseBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emptyCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // SafeAreaView that wraps the top controls (Req 12.2)
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
