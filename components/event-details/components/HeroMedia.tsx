import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");
const HERO_H = width * (4 / 3);

// ─── HeroMedia ────────────────────────────────────────────────────────────────

const HeroMedia = ({
  flierUrl,
  promoVideoUrl,
}: {
  flierUrl?: string | null;
  promoVideoUrl?: string | null;
}) => {
  const hasFlier = !!flierUrl;
  const hasVideo = !!promoVideoUrl;
  const shouldAlternate = hasFlier && hasVideo;

  const flierOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const showingVideoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Created unconditionally (hooks can't be conditional). Passing `null`
  // when there's no video URL gives an idle player that renders nothing.
  const player = useVideoPlayer(promoVideoUrl ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const doSwitchRef = useRef<() => void>(null as any);
  doSwitchRef.current = () => {
    const toVideo = !showingVideoRef.current;
    showingVideoRef.current = toVideo;
    const inAnim = toVideo ? videoOpacity : flierOpacity;
    const outAnim = toVideo ? flierOpacity : videoOpacity;
    Animated.parallel([
      Animated.timing(outAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(inAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      try {
        if (toVideo) player.play();
        else player.pause();
      } catch {
        // Player may have been released if the component unmounted during animation
        return;
      }
      timerRef.current = setTimeout(() => doSwitchRef.current?.(), 5000);
    });
  };

  // Video-only fallback: always playing, muted, looping.
  useEffect(() => {
    if (hasVideo && !hasFlier) {
      try { player.play(); } catch { /* already released */ }
    }
  }, [hasVideo, hasFlier, player]);

  useEffect(() => {
    if (!shouldAlternate) return;
    flierOpacity.setValue(1);
    videoOpacity.setValue(0);
    showingVideoRef.current = false;
    timerRef.current = setTimeout(() => doSwitchRef.current?.(), 5000);
    return () => {
      clearTimer();
      flierOpacity.stopAnimation();
      videoOpacity.stopAnimation();
      try { player.pause(); } catch { /* already released */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAlternate]);

  if (!hasFlier && !hasVideo) {
    return (
      <View style={styles.heroFallback}>
        <Ionicons name="calendar" size={56} color={`${brand.primary}40`} />
      </View>
    );
  }
  if (hasFlier && !hasVideo) {
    return (
      <Image
        source={{ uri: flierUrl! }}
        style={styles.heroImg}
        resizeMode="cover"
      />
    );
  }
  if (!hasFlier && hasVideo) {
    return (
      <VideoView
        player={player}
        style={styles.heroImg}
        contentFit="cover"
        nativeControls={false}
      />
    );
  }
  return (
    <View style={styles.heroMediaContainer}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: flierOpacity }]}
      >
        <Image
          source={{ uri: flierUrl! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>
    </View>
  );
};
export default HeroMedia;

const styles = StyleSheet.create({


  // Full hero (simple tabs)
  hero: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#000" },
  heroMediaContainer: { ...StyleSheet.absoluteFill },
  heroImg: { width: "100%", height: "100%" },
  heroFallback: {
    width: "100%",
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: neutral[100],
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  heroTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  heroTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
    color: "#fff",
    lineHeight: 28,
  },

  // Compact hero strip (self-scroll tabs) — short, just name + tags
  compactHero: {
    height: 80,
    backgroundColor: brand.primaryDark,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  compactHeroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  compactHeroContent: { paddingHorizontal: 14, paddingBottom: 10, gap: 4 },
  compactHeroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: "#fff",
  },

  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontFamily: fontFamily.semibold, fontSize: 10, color: "#fff" },

  
});