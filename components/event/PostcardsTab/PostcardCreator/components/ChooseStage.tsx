import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { brand, neutral } from "@/constants/Colors";
import { s } from "./styles";

interface Props {
  isSwapMode: boolean;
  vibeTagOverlay?: { imageUrl: string; name: string } | null;
  vibeTagName: string;
  eventName: string;
  maxItems: number;
  onClose: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
}

export function ChooseStage({
  isSwapMode,
  vibeTagOverlay,
  vibeTagName,
  eventName,
  maxItems,
  onClose,
  onOpenCamera,
  onOpenGallery,
}: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={s.headerBtn}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isSwapMode ? "Replace Postcard" : "New Postcard"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.vibePreview}>
        {vibeTagOverlay?.imageUrl ? (
          <>
            <Image
              source={{ uri: vibeTagOverlay.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <View style={s.vibePreviewGrad} pointerEvents="none" />
            <View style={s.vibePreviewInfo} pointerEvents="none">
              <View style={s.vibeChip}>
                <Ionicons name="sparkles" size={12} color="#fff" />
                <Text style={s.vibeChipText} numberOfLines={1}>
                  {vibeTagOverlay.name}
                </Text>
              </View>
              <Text style={s.vibePreviewHint}>
                This overlay will appear on your postcards
              </Text>
            </View>
          </>
        ) : (
          <View style={s.vibePreviewEmpty}>
            <View style={s.vibePreviewEmptyIcon}>
              <Ionicons name="sparkles" size={32} color={brand.primary} />
            </View>
            <Text style={s.vibePreviewEmptyTitle}>{vibeTagName}</Text>
            <Text style={s.vibePreviewEmptySub}>{eventName}</Text>
          </View>
        )}
      </View>

      <View style={s.chooseActions}>
        <TouchableOpacity
          style={s.cameraBtn}
          onPress={onOpenCamera}
          activeOpacity={0.85}
        >
          <View style={s.cameraBtnIcon}>
            <Ionicons name="camera" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cameraBtnTitle}>Camera</Text>
            <Text style={s.cameraBtnSub}>
              Photo & video with live VibeTag overlay
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.galleryBtn}
          onPress={onOpenGallery}
          activeOpacity={0.85}
        >
          <View style={s.galleryBtnIcon}>
            <Ionicons name="images-outline" size={24} color={brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.galleryBtnTitle}>Upload from Gallery</Text>
            <Text style={s.galleryBtnSub}>
              Photos & videos · max {maxItems} · videos ≤ 125s
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={neutral[400]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
