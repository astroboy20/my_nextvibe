import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { neutral } from "@/constants/Colors";
import { s } from "./styles";

interface Props {
  caption: string;
  onCaptionChange: (v: string) => void;
  isSubmitting: boolean;
  uploadStage: "stamping" | "uploading" | "saving";
  uploadProgress: number;
  imageCount: number;
  isSwapMode: boolean;
  itemCount: number;
  onPost: () => void;
  onStartOver: () => void;
}

export function PostSection({
  caption,
  onCaptionChange,
  isSubmitting,
  uploadStage,
  uploadProgress,
  imageCount,
  isSwapMode,
  itemCount,
  onPost,
  onStartOver,
}: Props) {
  const stageLabel =
    uploadStage === "stamping"
      ? `Stamping VibeTag… (${imageCount} image${imageCount !== 1 ? "s" : ""})`
      : uploadStage === "uploading"
      ? "Uploading media…"
      : "Saving postcard…";

  const stageSub =
    uploadStage === "stamping"
      ? "Applying VibeTag overlay…"
      : uploadStage === "uploading"
      ? "Please keep the app open…"
      : "Almost done…";

  return (
    <>
      <View style={s.captionSection}>
        <TextInput
          value={caption}
          onChangeText={onCaptionChange}
          placeholder="Add a caption (optional)…"
          placeholderTextColor={neutral[400]}
          style={s.captionInput}
          multiline
          maxLength={300}
        />
        <Text style={s.captionCount}>{caption.length}/300</Text>
      </View>

      <View style={s.postSection}>
        {isSubmitting ? (
          <View style={s.progressCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={s.progressLabel}>{stageLabel}</Text>
              <Text style={s.progressPct}>{uploadProgress}%</Text>
            </View>
            <View style={s.progressTrack}>
              <Animated.View
                style={[s.progressFill, { width: `${uploadProgress}%` as any }]}
              />
            </View>
            <Text style={s.progressSub}>{stageSub}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.postBtn}
            onPress={onPost}
            activeOpacity={0.87}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={s.postBtnText}>
              {isSwapMode
                ? "Replace Postcard"
                : `Share ${itemCount} Item${itemCount > 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={s.startOverBtn}
          onPress={onStartOver}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={14} color={neutral[400]} />
          <Text style={s.startOverText}>Start over</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
