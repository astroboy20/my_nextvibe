import { PostcardViewer } from "@/components/event/PostcardsTab/PostcardViewer";
import PersonCard, { type SocialUser } from "@/components/social/PersonCard";
import PostcardCard, {
    type PostcardItem,
} from "@/components/social/PostcardCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import {
    useGetFollowingFeedQuery,
    useGetMutualsQuery,
    useGetMyFollowersQuery,
    useGetMyFollowingQuery,
} from "@/store/api/socialApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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

// ─── Skeleton shapes ──────────────────────────────────────────────────────────

function PostcardSkeleton() {
  return (
    <View style={sk.card}>
      {/* author row */}
      <View style={sk.authorRow}>
        <Skeleton width={38} height={38} borderRadius={19} />
        <View style={{ flex: 1 }}>
          <Skeleton width="40%" height={12} borderRadius={6} />
          <Skeleton
            width="25%"
            height={10}
            borderRadius={5}
            style={{ marginTop: 5 }}
          />
        </View>
        <Skeleton width={30} height={10} borderRadius={5} />
      </View>
      {/* image */}
      <Skeleton width="100%" height={260} borderRadius={0} />
      {/* actions */}
      <View style={sk.actionsRow}>
        <Skeleton width={50} height={12} borderRadius={6} />
        <Skeleton width={50} height={12} borderRadius={6} />
      </View>
      {/* caption */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <Skeleton width="80%" height={11} borderRadius={5} />
        <Skeleton
          width="55%"
          height={11}
          borderRadius={5}
          style={{ marginTop: 5 }}
        />
      </View>
    </View>
  );
}

function PersonSkeleton() {
  return (
    <View style={sk.personCard}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1 }}>
        <Skeleton width="50%" height={13} borderRadius={6} />
        <Skeleton
          width="35%"
          height={10}
          borderRadius={5}
          style={{ marginTop: 6 }}
        />
      </View>
      <Skeleton width={88} height={32} borderRadius={20} />
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 14,
  },
});

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: {
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={tb.bar}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <TouchableOpacity
            key={t.id}
            style={tb.tab}
            onPress={() => onSelect(t.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={isActive ? brand.primary : neutral[400]}
            />
            <Text style={[tb.label, isActive && tb.labelActive]}>
              {t.label}
            </Text>
            {isActive && <View style={tb.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    position: "relative",
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  labelActive: { color: brand.primary },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: brand.primary,
    borderRadius: 2,
  },
});

// ─── People sub-tabs ──────────────────────────────────────────────────────────

type PeopleTab = "following" | "followers" | "mutuals";

function PeopleSubTabs({
  active,
  onSelect,
}: {
  active: PeopleTab;
  onSelect: (t: PeopleTab) => void;
}) {
  const tabs: PeopleTab[] = ["following", "followers", "mutuals"];
  return (
    <View style={ptb.row}>
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <TouchableOpacity
            key={t}
            style={[ptb.tab, isActive && ptb.tabActive]}
            onPress={() => onSelect(t)}
            activeOpacity={0.8}
          >
            <Text style={[ptb.label, isActive && ptb.labelActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ptb = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: neutral[100],
  },
  tabActive: { backgroundColor: brand.primary },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  labelActive: { color: "#fff" },
});

// ─── Main tabs config ─────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: "feed", label: "Feed", icon: "images-outline" as const },
  { id: "people", label: "People", icon: "people-outline" as const },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const [mainTab, setMainTab] = useState<"feed" | "people">("feed");
  const [peopleTab, setPeopleTab] = useState<PeopleTab>("following");
  const [search, setSearch] = useState("");

  // Postcard viewer state
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  // ── Feed API ───────────────────────────────────────────────────────────────
  const {
    data: feedData,
    isLoading: feedLoading,
    isFetching: feedFetching,
    refetch: refetchFeed,
  } = useGetFollowingFeedQuery(
    { page: 1, limit: 20 },
    { skip: mainTab !== "feed" }
  );

  // ── People API ─────────────────────────────────────────────────────────────
  const {
    data: followingData,
    isLoading: followingLoading,
    refetch: refetchFollowing,
  } = useGetMyFollowingQuery(undefined, {
    skip: mainTab !== "people" || peopleTab !== "following",
  });

  const {
    data: followersData,
    isLoading: followersLoading,
    refetch: refetchFollowers,
  } = useGetMyFollowersQuery(undefined, {
    skip: mainTab !== "people" || peopleTab !== "followers",
  });

  const {
    data: mutualsData,
    isLoading: mutualsLoading,
    refetch: refetchMutuals,
  } = useGetMutualsQuery(undefined, {
    skip: mainTab !== "people" || peopleTab !== "mutuals",
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  // Normalize API shape → PostcardCard's expected shape.
  // The feed API uses `likesCount` + `user` + `gallery_items`;
  // PostcardCard expects `likeCount` + `author` + `media`.
  const feedItems: PostcardItem[] = (feedData?.data?.data ?? []).map((raw: any) => ({
    ...raw,
    id: raw.id ?? raw._id ?? raw.post_id,
    likeCount: raw.likeCount ?? raw.likesCount ?? 0,
    commentsCount: raw.commentsCount ?? 0,
    isLiked: raw.isLiked ?? false,
    author: raw.author ?? raw.user
      ? {
          id: (raw.author ?? raw.user)?.id,
          username: (raw.author ?? raw.user)?.username,
          displayName: (raw.author ?? raw.user)?.displayName ?? (raw.author ?? raw.user)?.name,
          avatarUrl: (raw.author ?? raw.user)?.avatarUrl ?? (raw.author ?? raw.user)?.avatar,
        }
      : null,
    media: (raw.media ?? raw.gallery_items ?? []).map((m: any) => ({
      mediaUrl: m.mediaUrl ?? m.url,
      mediaType: (m.mediaType ?? m.type ?? "PHOTO").toUpperCase() === "VIDEO" ? "VIDEO" : "PHOTO",
    })),
    event: raw.event ?? (raw.event_id || raw.eventId)
      ? { id: raw.event?.id ?? raw.event_id ?? raw.eventId, name: raw.event?.name ?? "" }
      : null,
  }));

  const peopleMap: Record<PeopleTab, SocialUser[]> = {
    following: followingData?.data ?? [],
    followers: followersData?.data ?? [],
    mutuals: mutualsData?.data ?? [],
  };

  const currentPeopleLoading =
    (peopleTab === "following" && followingLoading && !followingData) ||
    (peopleTab === "followers" && followersLoading && !followersData) ||
    (peopleTab === "mutuals" && mutualsLoading && !mutualsData);

  const isFeedFirstLoad = feedLoading && !feedData;
  const isRefreshing = feedFetching && !!feedData;

  const filteredPeople = useMemo(() => {
    const list = peopleMap[peopleTab] ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        (u.displayName ?? "").toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q)
    );
  }, [peopleMap, peopleTab, search]);

  const handleRefresh = () => {
    if (mainTab === "feed") refetchFeed();
    else if (peopleTab === "following") refetchFollowing();
    else if (peopleTab === "followers") refetchFollowers();
    else refetchMutuals();
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
          postcards={feedItems.map((item) => ({
            id: item.id,
            caption: item.caption,
            likeCount: item.likeCount,
            isLiked: item.isLiked,
            commentCount: item.commentsCount,
            viewCount: 0,
            createdAt: item.createdAt,
            author: item.author
              ? {
                  id: item.author.id,
                  username: item.author.username,
                  displayName: item.author.displayName,
                  avatarUrl: item.author.avatarUrl,
                }
              : undefined,
            media: (item.media ?? []).map((m) => ({
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType,
            })),
          }))}
          initialIndex={viewerIndex}
          eventId=""
          onClose={() => setViewerVisible(false)}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
