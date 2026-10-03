import { PostcardViewer } from "@/components/postcardviewer/PostcardViewer";
import { mapToViewerPostcards } from "@/components/social/hooks/Maptoviewerpostcards";
import { useSocialData } from "@/components/social/hooks/useSocialData";
import {
  PeopleSubTabs,
  type PeopleTab,
} from "@/components/social/Peoplesubtabs";
import PersonCard from "@/components/social/PersonCard";
import PostcardCard from "@/components/social/PostcardCard";
import {
  PersonSkeleton,
  PostcardSkeleton,
} from "@/components/social/Socialskeletons";
import { TabBar, type TabBarItem } from "@/components/social/TabBar";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAIN_TABS: TabBarItem[] = [
  { id: "feed", label: "Feed", icon: "images-outline" },
  { id: "people", label: "People", icon: "people-outline" },
];

export default function SocialScreen() {
  const [mainTab, setMainTab] = useState<"feed" | "people">("feed");
  const [peopleTab, setPeopleTab] = useState<PeopleTab>("following");
  const [search, setSearch] = useState("");

  // Postcard viewer state
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  const {
    feedItems,
    isFeedFirstLoad,
    isRefreshing,
    refetchFeed,
    filteredPeople,
    currentPeopleLoading,
    refetchPeople,
  } = useSocialData({ mainTab, peopleTab, search });

  const handleRefresh = () => {
    if (mainTab === "feed") refetchFeed();
    else refetchPeople();
  };

  // Re-fetch when tab comes into focus
  useRefetchOnFocus(refetchFeed);

  return (
    <>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Social</Text>
        </View>

        {/* Main tabs */}
        <TabBar
          tabs={MAIN_TABS}
          active={mainTab}
          onSelect={(id) => setMainTab(id as "feed" | "people")}
        />

        {/* ── Feed tab ── */}
        {mainTab === "feed" && (
          <FlatList
            data={isFeedFirstLoad ? [] : feedItems}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => (
              <PostcardCard
                item={item}
                onPress={() => {
                  setViewerIndex(index);
                  setViewerVisible(true);
                }}
              />
            )}
            contentContainerStyle={styles.feedList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={brand.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListHeaderComponent={
              isFeedFirstLoad ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ marginBottom: 12 }}>
                      <PostcardSkeleton />
                    </View>
                  ))}
                </>
              ) : null
            }
            ListEmptyComponent={
              !isFeedFirstLoad ? (
                <View style={styles.center}>
                  <Ionicons
                    name="images-outline"
                    size={52}
                    color={neutral[200]}
                  />
                  <Text style={styles.emptyTitle}>
                    Nothing in your feed yet
                  </Text>
                  <Text style={styles.emptySub}>
                    Follow people to see their postcards here.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* ── People tab ── */}
        {mainTab === "people" && (
          <View style={{ flex: 1 }}>
            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color={neutral[400]}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people…"
                placeholderTextColor={neutral[400]}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={neutral[400]}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Sub-tabs */}
            <PeopleSubTabs active={peopleTab} onSelect={setPeopleTab} />

            {/* People list */}
            <FlatList
              data={currentPeopleLoading ? [] : filteredPeople}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <PersonCard
                  user={item}
                  defaultFollowing={peopleTab !== "followers"}
                />
              )}
              contentContainerStyle={styles.peopleList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={handleRefresh}
                  tintColor={brand.primary}
                />
              }
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListHeaderComponent={
                currentPeopleLoading ? (
                  <>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <PersonSkeleton />
                      </View>
                    ))}
                  </>
                ) : null
              }
              ListEmptyComponent={
                !currentPeopleLoading ? (
                  <View style={styles.center}>
                    <Ionicons
                      name="people-outline"
                      size={52}
                      color={neutral[200]}
                    />
                    <Text style={styles.emptyTitle}>
                      {search ? "No results found" : `No ${peopleTab} yet`}
                    </Text>
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </SafeAreaView>

      {/* Postcard viewer — opens when tapping a feed card */}
      {viewerVisible && feedItems.length > 0 && (
        <PostcardViewer
          postcards={mapToViewerPostcards(feedItems)}
          initialIndex={viewerIndex}
          eventId=""
          onClose={() => setViewerVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize["2xl"],
    color: neutral[900],
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[700],
    textAlign: "center",
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: "center",
  },

  feedList: { padding: 16, paddingBottom: 40 },
  peopleList: { paddingHorizontal: 16, paddingBottom: 40 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
});
