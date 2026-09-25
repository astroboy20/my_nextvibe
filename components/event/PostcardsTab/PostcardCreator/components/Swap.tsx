import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useGetEventPostcardsQuery } from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");
const TILE_W = (W - 28 - 8) / 2; // two-column swap grid

const SwapConfirm = ({
  likeCount,
  commentCount,
  onConfirm,
  onCancel,
}: {
  likeCount: number;
  commentCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "flex-end",
          zIndex: 300,
          padding: 16,
        },
      ]}
    >
      <View
        style={{
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 20,
          gap: 14,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.semibold,
            fontSize: fontSize.base,
            color: neutral[800],
          }}
        >
          Replace this postcard?
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.regular,
            fontSize: fontSize.sm,
            color: neutral[500],
          }}
        >
          This permanently deletes the existing postcard and all its activity:
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            backgroundColor: `${semantic.error}10`,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: `${semantic.error}25`,
          }}
        >
          <View style={{ alignItems: "center", gap: 2 }}>
            <Ionicons name="heart" size={16} color={semantic.error} />
            <Text
              style={{
                fontFamily: fontFamily.bold,
                fontSize: 13,
                color: semantic.error,
              }}
            >
              {likeCount}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.regular,
                fontSize: 10,
                color: neutral[500],
              }}
            >
              likes
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Ionicons name="chatbubble" size={15} color={semantic.error} />
            <Text
              style={{
                fontFamily: fontFamily.bold,
                fontSize: 13,
                color: semantic.error,
              }}
            >
              {commentCount}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.regular,
                fontSize: 10,
                color: neutral[500],
              }}
            >
              comments
            </Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: fontFamily.regular,
              fontSize: 11,
              color: `${semantic.error}BB`,
              alignSelf: "center",
            }}
          >
            This action cannot be undone.
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: neutral[200],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.semibold,
                fontSize: fontSize.sm,
                color: neutral[700],
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.85}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 14,
              backgroundColor: semantic.error,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.semibold,
                fontSize: fontSize.sm,
                color: "#fff",
              }}
            >
              Replace
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const SwapPicker = ({
  eventId,
  onPick,
  onCancel,
}: {
  eventId: string;
  onPick: (postcard: any) => void;
  onCancel: () => void;
}) => {
  const { data, isLoading } = useGetEventPostcardsQuery(
    { eventId, limit: 50 },
    { skip: !eventId }
  );
  const list: any[] = (
    (data as any)?.data?.data ??
    (data as any)?.data ??
    []
  ).filter((p: any) => (p?.media ?? []).some((m: any) => !!m.mediaUrl));

  return (
    <SafeAreaView
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#fff", zIndex: 200 },
      ]}
      edges={["top", "bottom"]}
    >
      <View style={sp.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={10}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={sp.headerTitle}>Replace a Postcard</Text>
          <Text style={sp.headerSub}>You've hit the 20 postcard limit</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <View style={sp.warningRow}>
        <Ionicons name="warning-outline" size={15} color="#92400E" />
        <Text style={sp.warningText}>
          Tap a postcard to replace it. Its likes and comments will be removed.
        </Text>
      </View>

      {isLoading ? (
        <View style={sp.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={sp.center}>
          <Ionicons name="images-outline" size={40} color={neutral[200]} />
          <Text style={sp.emptyText}>No postcards to replace</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item?.id ?? String(i)}
          numColumns={2}
          contentContainerStyle={{ padding: 14 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          renderItem={({ item }) => {
            const src = item?.media?.[0]?.mediaUrl ?? "";
            const isVid = item?.media?.[0]?.mediaType === "VIDEO";
            if (!src) return null;
            return (
              <TouchableOpacity
                style={[sp.tile, { width: TILE_W, height: TILE_W * (4 / 3) }]}
                onPress={() => onPick(item)}
                activeOpacity={0.82}
              >
                <Image
                  source={{ uri: src }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                {isVid && (
                  <View style={sp.playBadge}>
                    <Ionicons name="play" size={13} color="#fff" />
                  </View>
                )}
                <View style={sp.tileGrad} />
                <View style={sp.tileBottom}>
                  <Ionicons name="heart" size={10} color="#fff" />
                  <Text style={sp.tileStat}>{item.likeCount ?? 0}</Text>
                  <Ionicons
                    name="chatbubble"
                    size={9}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                  <Text style={sp.tileStat}>{item.commentCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export { SwapConfirm, SwapPicker };

const sp = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEF3C7",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#FDE68A",
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: "#92400E",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  tile: { borderRadius: 12, overflow: "hidden", backgroundColor: neutral[100] },
  playBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  tileBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  tileStat: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: "#fff",
    marginLeft: 3,
  },
});
