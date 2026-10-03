import { fontFamily } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { PostcardCard } from "./Postcardcard";
import type { PostcardData } from "./types";
import { prefetchAdjacentMedia } from "./utils/prefetchMedia";

// Use screen (not window) so height includes the status bar area,
// which matches what statusBarTranslucent exposes in the Modal.
const SCREEN_HEIGHT = Dimensions.get("screen").height;

export interface PostcardViewerProps {
  postcards: PostcardData[];
  initialIndex: number;
  eventId: string;
  onClose: () => void;
  onDeletePostcard?: (postcardId: string) => void;
}

export function PostcardViewer({
  postcards,
  initialIndex,
  eventId,
  onClose,
  onDeletePostcard,
}: PostcardViewerProps) {
  const listRef = useRef<FlatList<PostcardData>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const { isConnected, isWifi } = useNetworkStatus();
  const H = SCREEN_HEIGHT;

  useEffect(() => {
    if (initialIndex > 0) {
      // Small delay so FlatList has laid out
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, []);


  useEffect(() => {
    prefetchAdjacentMedia(postcards, activeIndex, isConnected, isWifi);
  }, [postcards, activeIndex, isConnected, isWifi]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: PostcardData; index: number }) => (
      <PostcardCard
        postcard={item}
        eventId={eventId}
        active={index === activeIndex}
        onDeleted={onDeletePostcard}
        isConnected={isConnected}
        height={H}
      />
    ),
    [activeIndex, eventId, onDeletePostcard, isConnected, H]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: H, offset: H * index, index }),
    [H]
  );

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          ref={listRef}
          data={postcards}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          decelerationRate="fast"
          removeClippedSubviews
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          // Each card renders its own GradientFade and info overlay
          ListHeaderComponent={null}
        />

        {/* Back button — always on top */}
        <SafeAreaView
          style={styles.overlay}
          edges={["top"]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={10}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {postcards.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {postcards.length}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: "#fff",
  },
});