/**
 * Avatar — unified avatar component for the entire app.
 *
 * Features:
 * - Uses expo-image for caching + smooth transitions
 * - Falls back to the person's initial when no image URL is provided,
 *   when the URL doesn't start with http, or when the image fails to load
 * - Optional border (width + color)
 * - Supports numeric `size` prop (default 38) or named sizes
 * - `style` prop for additional overrides on the outer container
 *
 * Usage:
 *   <Avatar uri={user.avatarUrl} name={user.displayName} size={48} />
 *   <Avatar uri={user.avatarUrl} name={user.displayName} size="lg" border />
 *   <Avatar uri={null} name="John Doe" size={34} variant="light" />
 */

import { brand } from "@/constants/Colors";
import { fontFamily } from "@/constants/Typography";
import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

// ─── Named sizes ──────────────────────────────────────────────────────────────

const NAMED_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
} as const;

type NamedSize = keyof typeof NAMED_SIZES;

// ─── Variant controls fallback bg / text colour ───────────────────────────────
// "brand"  → solid brand.primary bg, white text   (default, used on dark media)
// "light"  → faint brand.primary20 bg, brand text  (used on white backgrounds)

type AvatarVariant = "brand" | "light";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  /** Remote image URL. Null/undefined → initials fallback. */
  uri?: string | null;
  /** Person's name — first character is used as the initials fallback. */
  name?: string | null;
  /**
   * Diameter in dp, or a named size token.
   * @default 38
   */
  size?: number | NamedSize;
  /**
   * Controls the fallback background and text colours.
   * - "brand"  → solid brand.primary bg, white text   (default)
   * - "light"  → faint brand tint bg, brand text
   */
  variant?: AvatarVariant;
  /**
   * When true, draws a 1.5pt semi-white border — suitable for use over
   * dark/media backgrounds (PostcardViewer, Reel).
   */
  border?: boolean;
  /** Override the border colour. Only applies when `border` is true. */
  borderColor?: string;
  /** Additional styles on the outer container View. */
  style?: StyleProp<ViewStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Avatar = memo(function Avatar({
  uri,
  name,
  size = 38,
  variant = "brand",
  border = false,
  borderColor = "rgba(255,255,255,0.5)",
  style,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Resolve numeric size
  const dim: number =
    typeof size === "string" ? NAMED_SIZES[size] : size;

  // Only try to load the image if the URL looks valid
  const validUri =
    uri && (uri.startsWith("http://") || uri.startsWith("https://"))
      ? uri
      : null;

  const showImage = !!validUri && !imgFailed;

  // Derive the initial — first character of display name, upper-cased
  const initial =
    name && name.trim().length > 0
      ? name.trim()[0].toUpperCase()
      : "?";

  const fontSize = Math.round(dim * 0.38);

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...(border
      ? { borderWidth: 1.5, borderColor }
      : {}),
    ...(showImage
      ? {}
      : variant === "light"
      ? { backgroundColor: `${brand.primary}20` }
      : { backgroundColor: `${brand.primary}CC` }),
  };

  return (
    <View style={[containerStyle, style]}>
      {showImage ? (
        <Image
          source={{ uri: validUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text
          style={[
            s.initial,
            {
              fontSize,
              color: variant === "light" ? brand.primary : "#fff",
            },
          ]}
          allowFontScaling={false}
        >
          {initial}
        </Text>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  initial: {
    fontFamily: fontFamily.bold,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
