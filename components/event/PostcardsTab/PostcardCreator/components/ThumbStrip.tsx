import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { neutral } from "@/constants/Colors";
import { s } from "./styles";
import type { PickedItem } from "./usePostcardItems";

interface Props {
  items: PickedItem[];
  activeIdx: number;
  maxItems: number;
  overlayImageUrl?: string | null;
  onSelect: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddCamera: () => void;
  onAddGallery: () => void;
}

export function ThumbStrip({
  items,
  activeIdx,
  maxItems,
  overlayImageUrl,
  onSelect,
  onRemove,
  onAddCamera,
  onAddGallery,
}: Props) {
  if (items.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.thumbStrip}
    >
      {items.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => onSelect(idx)}
          style={[s.thumb, idx === activeIdx && s.thumbSelected]}
          activeOpacity={0.85}
        >
          {item.type === "video" ? (
            <View style={s.thumbVideo}>
              <Ionicons name="play-circle" size={20} color="#fff" />
            </View>
          ) : (
            <Image
              source={{ uri: item.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
          {overlayImageUrl && (
            <Image
              source={{ uri: overlayImageUrl }}
              style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              pointerEvents="none"
            />
          )}
          <TouchableOpacity
            style={s.thumbRemove}
            onPress={() => onRemove(idx)}
            hitSlop={4}
          >
            <Ionicons name="close-circle" size={17} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {items.length < maxItems && (
        <View style={s.thumbAddWrap}>
          <TouchableOpacity
            style={s.thumbAdd}
            onPress={onAddCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={17} color={neutral[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.thumbAdd}
            onPress={onAddGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={17} color={neutral[500]} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
