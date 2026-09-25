import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { brand, neutral } from "@/constants/Colors";
import { s } from "./styles";
import { MediaPreview } from "./MediaPreview";
import { ThumbStrip } from "./ThumbStrip";
import { PostSection } from "./PostSection";
import type { PickedItem } from "./usePostcardItems";
import { SwapConfirm } from "./Swap";

interface Props {
  slideAnim: Animated.Value;
  isSwapMode: boolean;
  items: PickedItem[];
  activeIdx: number;
  maxItems: number;
  vibeTagOverlay?: { imageUrl: string; name: string } | null;
  caption: string;
  onCaptionChange: (v: string) => void;
  isSubmitting: boolean;
  uploadStage: "stamping" | "uploading" | "saving";
  uploadProgress: number;
  onBack: () => void;
  onSelect: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddCamera: () => void;
  onAddGallery: () => void;
  onPost: () => void;
  onStartOver: () => void;
  showSwapConfirm: boolean;
  pendingSwap: any;
  swapLikeCount: number;
  swapCommentCount: number;
  swapPostcardId?: string;
  onSwapCancel: () => void;
  onSwapConfirm: () => void;
}

export function ReviewStage({
  slideAnim,
  isSwapMode,
  items,
  activeIdx,
  maxItems,
  vibeTagOverlay,
  caption,
  onCaptionChange,
  isSubmitting,
  uploadStage,
  uploadProgress,
  onBack,
  onSelect,
  onRemove,
  onAddCamera,
  onAddGallery,
  onPost,
  onStartOver,
  showSwapConfirm,
  pendingSwap,
  swapLikeCount,
  swapCommentCount,
  swapPostcardId,
  onSwapCancel,
  onSwapConfirm,
}: Props) {
  const activeItem = items[activeIdx] ?? null;

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} hitSlop={10} style={s.headerBtn}>
            <Ionicons name="chevron-back" size={22} color={neutral[700]} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={s.headerTitle}>
              {isSwapMode ? "Replace Postcard" : "Review"}
            </Text>
            <Text style={s.headerSub}>
              {items.length}/{maxItems} item{items.length > 1 ? "s" : ""}
            </Text>
          </View>
          {items.length < maxItems ? (
            <TouchableOpacity
              onPress={onAddCamera}
              hitSlop={10}
              style={s.headerBtn}
            >
              <Ionicons name="add" size={24} color={brand.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {vibeTagOverlay && (
          <View style={s.vibeBanner}>
            <Ionicons name="sparkles" size={12} color={brand.primary} />
            <Text style={s.vibeBannerText} numberOfLines={1}>
              {vibeTagOverlay.name}
            </Text>
            <Text style={s.vibeBannerSub}>live overlay applied</Text>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeItem && (
            <MediaPreview
              item={activeItem}
              overlay={vibeTagOverlay}
              itemCount={items.length}
              activeIdx={activeIdx}
              onRemove={() => onRemove(activeIdx)}
            />
          )}

          <ThumbStrip
            items={items}
            activeIdx={activeIdx}
            maxItems={maxItems}
            overlayImageUrl={vibeTagOverlay?.imageUrl}
            onSelect={onSelect}
            onRemove={onRemove}
            onAddCamera={onAddCamera}
            onAddGallery={onAddGallery}
          />

          <PostSection
            caption={caption}
            onCaptionChange={onCaptionChange}
            isSubmitting={isSubmitting}
            uploadStage={uploadStage}
            uploadProgress={uploadProgress}
            imageCount={items.filter((i) => i.type === "image").length}
            isSwapMode={isSwapMode}
            itemCount={items.length}
            onPost={onPost}
            onStartOver={onStartOver}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {showSwapConfirm && (
        <SwapConfirm
          likeCount={pendingSwap?.likeCount ?? swapLikeCount}
          commentCount={pendingSwap?.commentCount ?? swapCommentCount}
          onCancel={onSwapCancel}
          onConfirm={onSwapConfirm}
        />
      )}
    </Animated.View>
  );
}
