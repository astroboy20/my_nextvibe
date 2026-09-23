import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { Animated, Dimensions, Image, View } from "react-native";

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
  const videoRef = useRef<Video>(null);
  const showingVideoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (toVideo) videoRef.current?.playAsync().catch(() => {});
      else videoRef.current?.pauseAsync().catch(() => {});
      timerRef.current = setTimeout(() => doSwitchRef.current?.(), 5000);
    });
  };

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
      videoRef.current?.pauseAsync().catch(() => {});
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
      <Video
        source={{ uri: promoVideoUrl! }}
        style={styles.heroImg}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />
    );
  }
  return (
    <View style={styles.heroMediaContainer}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: flierOpacity }]}
      >
        <Image
          source={{ uri: flierUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}
      >
        <Video
          ref={videoRef}
          source={{ uri: promoVideoUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay={false}
        />
      </Animated.View>
    </View>
  );
};


export default HeroMedia;

const styles = StyleSheet.create({


  // Full hero (simple tabs)
  hero: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#000" },
  heroMediaContainer: { ...StyleSheet.absoluteFillObject },
  heroImg: { width: "100%", height: "100%" },
  heroFallback: {
    width: "100%",
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: neutral[100],
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
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