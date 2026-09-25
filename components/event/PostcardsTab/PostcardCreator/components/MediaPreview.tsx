import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { s } from "./styles";
import type { PickedItem } from "./usePostcardItems";

interface Props {
  item: PickedItem;
  overlay?: { imageUrl: string; name: string } | null;
  itemCount: number;
  activeIdx: number;
  onRemove: () => void;
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls
    />
  );
}

export function MediaPreview({
  item,
  overlay,
  itemCount,
  activeIdx,
  onRemove,
}: Props) {
  return (
    <View style={s.mediaPreview}>
      {item.type === "video" ? (
        <VideoPreview uri={item.uri} />
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}

      {overlay?.imageUrl && (
        <>
          <Image
            source={{ uri: overlay.imageUrl }}
            style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
            contentFit="contain"
            cachePolicy="memory-disk"
            pointerEvents="none"
          />
          <View style={s.overlayBadge} pointerEvents="none">
            <Ionicons name="sparkles" size={11} color="#fff" />
            <Text style={s.overlayBadgeText} numberOfLines={1}>
              {overlay.name}
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={s.removeBtn}
        onPress={onRemove}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={17} color="#fff" />
      </TouchableOpacity>

      {itemCount > 1 && (
        <View style={s.counterBadge} pointerEvents="none">
          <Ionicons name="layers" size={12} color="#fff" />
          <Text style={s.counterBadgeText}>
            {activeIdx + 1}/{itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}