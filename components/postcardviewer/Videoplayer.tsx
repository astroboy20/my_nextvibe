import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { getCachedVideoUri, warmVideoCache } from "./utils/videoCache";

/**
 * Handles video playback with a live VibeTag overlay.
 *
 * When playing:
 * - Renders the video element
 * - If vibeTagOverlayUrl is present, layers it on top absolutely positioned
 *
 * When not playing (controlled by parent via thumbnailUrl):
 * - Parent renders thumbnailUrl as static image instead of this component
 *
 * Also transparently upgrades playback to a locally-cached copy of the video
 * when one is available (see utils/videoCache.ts), and starts warming the
 * cache for next time if it isn't cached yet.
 */
export function VideoPlayer({
  src,
  active,
  overlayUrl,
  isConnected = true,
}: {
  src: string;
  active: boolean;
  overlayUrl?: string | null;
  isConnected?: boolean;
}) {
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(src, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Upgrade to a cached local copy if one exists; otherwise start warming
  // the cache in the background for next time (only when online).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedVideoUri(src);
      if (cancelled) return;
      if (cached) {
        await player.replaceAsync(cached);
      } else if (isConnected) {
        warmVideoCache(src);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, isConnected, player]);

  // Reactive status → buffering indicator
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const buffering = status === "loading";

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [active, player]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      player.muted = next;
      return next;
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {buffering && (
        <View style={styles.buffer}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {overlayUrl && (
        <Image
          source={{ uri: overlayUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          pointerEvents="none"
        />
      )}
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={toggleMute}
        activeOpacity={0.8}
      >
        <Ionicons
          name={muted ? "volume-mute" : "volume-high"}
          size={16}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buffer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 5,
  },
  muteBtn: {
    position: "absolute",
    bottom: 80,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
