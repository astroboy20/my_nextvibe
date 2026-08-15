import EventCard, { type EventCardData } from "@/components/discover/EventCard";
import FeedTabs, { type FeedTabDef } from "@/components/discover/FeedTabs";
import FilterChips, { type ChipDef } from "@/components/discover/FilterChips";
import SearchFilterCard from "@/components/discover/SearchFilterCard";
import SegmentedControl from "@/components/discover/SegmentedControl";
import TopNavBar from "@/components/navigation/TopNavBar";
import {
  EventCardGridSkeleton,
  PostcardCardGridSkeleton,
} from "@/components/ui/Skeleton";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import {
  toCardData,
  useGetEventsQuery,
  useGetPostcardsQuery,
  type DiscoverEvent,
  type PostcardItem,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Static config ────────────────────────────────────────────────────────────

const FEED_TABS: FeedTabDef[] = [
  { label: "For You",  icon: "sparkles-outline" },
  { label: "Trending", icon: "trending-up-outline" },
  { label: "Near You", icon: "location-outline" },
];

const FILTER_CHIPS: ChipDef[] = [
  { label: "Has Games",      icon: "game-controller-outline" },
  { label: "Has VibeTag",    icon: "pricetag-outline" },
  { label: "Free",           icon: "gift-outline" },
  { label: "Starting Soon",  icon: "time-outline" },
];

const PAGE_SIZE = 20;

// "Starting Soon" = starts within the next 48 hours
function isStartingSoon(startsAt?: string): boolean {
  if (!startsAt) return false;
  const now  = Date.now();
  const start = new Date(startsAt).getTime();
  return start > now && start - now <= 48 * 60 * 60 * 1000;
}

// ─── Postcard card ────────────────────────────────────────────────────────────

function PostcardCard({ item }: { item: PostcardItem }) {
  const mediaUrl = item.media?.[0]?.mediaUrl;
  return (
    <View style={pc.card}>
      <View style={pc.imgWrap}>
        {mediaUrl ? (
          <Image
            source={{ uri: mediaUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={pc.imgFallback}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}
        <View style={pc.overlay}>
          <Ionicons name="heart" size={11} color="#fff" />
          <Text style={pc.likeText}>{item.likeCount ?? 0}</Text>
        </View>
      </View>
      {item.caption ? (
        <View style={pc.info}>
          <Text style={pc.caption} numberOfLines={2}>
            {item.caption}
          </Text>
          {item.author?.username && (
            <Text style={pc.author}>@{item.author.username}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();

  const [contentTab,  setContentTab]  = useState<"Events" | "Postcards">("Events");
  const [feedTab,     setFeedTab]     = useState("For You");
  const [search,      setSearch]      = useState("");
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [selectedVibe,    setSelectedVibe]    = useState<string | null>(null);
  const [locationLabel,   setLocationLabel]   = useState<string | null>(null);
  const [locationCoords,  setLocationCoords]  = useState<{ lat: number; lng: number } | null>(null);

  const toggleChip = (label: string) =>
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );

  const clearAllFilters = () => {
    setActiveChips([]);
    setSelectedVibe(null);
    setLocationLabel(null);
    setLocationCoords(null);
    setSearch("");
  };

  // ── Events pagination ──────────────────────────────────────────────────────
  const [eventsPage,    setEventsPage]    = useState(1);
  const [allEvents,     setAllEvents]     = useState<DiscoverEvent[]>([]);
  const [hasNextEvents, setHasNextEvents] = useState(true);
  const eventsLoadingMore = useRef(false);

  const {
    data:       eventsData,
    isLoading:  eventsLoading,
    isFetching: eventsFetching,
    refetch:    refetchEventsBase,
  } = useGetEventsQuery({ page: eventsPage, limit: PAGE_SIZE });

  useEffect(() => {
    if (!eventsData) return;
    const incoming: DiscoverEvent[] = eventsData?.data?.data ?? [];

    setAllEvents((prev) => {
      if (eventsPage === 1) return incoming;
      const seen = new Set(prev.map((e) => e.id));
      return [...prev, ...incoming.filter((e) => !seen.has(e.id))];
    });

    const meta = eventsData?.data?.meta;
    setHasNextEvents(meta?.hasNext ?? incoming.length === PAGE_SIZE);
    eventsLoadingMore.current = false;
  }, [eventsData, eventsPage]);

  const handleRefreshEvents = useCallback(() => {
    eventsLoadingMore.current = false;
    setEventsPage(1);
    setAllEvents([]);
    refetchEventsBase();
  }, [refetchEventsBase]);

  const handleLoadMoreEvents = useCallback(() => {
    if (eventsLoadingMore.current || eventsFetching || !hasNextEvents) return;
    eventsLoadingMore.current = true;
    setEventsPage((p) => p + 1);
  }, [eventsFetching, hasNextEvents]);

  // ── Postcards pagination ───────────────────────────────────────────────────
  const [postcardsPage,    setPostcardsPage]    = useState(1);
  const [allPostcards,     setAllPostcards]     = useState<PostcardItem[]>([]);
  const [hasNextPostcards, setHasNextPostcards] = useState(true);
  const postcardsLoadingMore = useRef(false);

  const {
    data:       postcardsData,
    isLoading:  postcardsLoading,
    isFetching: postcardsFetching,
    refetch:    refetchPostcardsBase,
  } = useGetPostcardsQuery(
    { page: postcardsPage, limit: PAGE_SIZE },
    { skip: contentTab !== "Postcards" }
  );

  useEffect(() => {
    if (!postcardsData) return;
    const incoming: PostcardItem[] = (postcardsData?.data as any)?.data ?? [];

    setAllPostcards((prev) => {
      if (postcardsPage === 1) return incoming;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
    });

    const meta = (postcardsData?.data as any)?.meta;
    setHasNextPostcards(meta?.hasNext ?? incoming.length === PAGE_SIZE);
    postcardsLoadingMore.current = false;
  }, [postcardsData, postcardsPage]);

  const handleRefreshPostcards = useCallback(() => {
    postcardsLoadingMore.current = false;
    setPostcardsPage(1);
    setAllPostcards([]);
    refetchPostcardsBase();
  }, [refetchPostcardsBase]);

  const handleLoadMorePostcards = useCallback(() => {
    if (postcardsLoadingMore.current || postcardsFetching || !hasNextPostcards) return;
    postcardsLoadingMore.current = true;
    setPostcardsPage((p) => p + 1);
  }, [postcardsFetching, hasNextPostcards]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isEventsFirstLoad    = eventsLoading    && allEvents.length === 0;
  const isPostcardsFirstLoad = postcardsLoading && allPostcards.length === 0;

  const isRefreshing =
    contentTab === "Events"
      ? eventsFetching   && eventsPage === 1
      : postcardsFetching && postcardsPage === 1;

  const handleRefresh = contentTab === "Events"
    ? handleRefreshEvents
    : handleRefreshPostcards;

  // ── Client-side filters ────────────────────────────────────────────────────
  const visibleEvents: EventCardData[] = useMemo(() => {
    let list = allEvents.map(toCardData);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }

    if (activeChips.includes("Has Games"))
      list = list.filter((e) => e.hasGames);
    if (activeChips.includes("Has VibeTag"))
      list = list.filter((e) => e.hasVibeTag);
    if (activeChips.includes("Starting Soon"))
      list = list.filter((e) => isStartingSoon(e.startsAt));

    // Vibe: match tag labels OR event title containing the vibe word
    if (selectedVibe) {
      const v = selectedVibe.toLowerCase();
      list = list.filter((e) =>
        e.tags.some((t) => t.label.toLowerCase().includes(v)) ||
        e.title.toLowerCase().includes(v)
      );
    }

    // Location: match city/region name inside event's location string
    if (locationLabel) {
      // Extract the first segment (city) from the resolved label e.g. "Lagos, Lagos"
      const city = locationLabel.split(",")[0].trim().toLowerCase();
      list = list.filter((e) =>
        e.location.toLowerCase().includes(city)
      );
    }

    return list;
  }, [allEvents, search, activeChips, selectedVibe, locationLabel]);

  // ── Footer loaders ─────────────────────────────────────────────────────────
  const EventsFooter =
    eventsFetching && eventsPage > 1 ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={brand.primary} />
      </View>
    ) : null;

  const PostcardsFooter =
    postcardsFetching && postcardsPage > 1 ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={brand.primary} />
      </View>
    ) : null;

  // ── Shared list header ─────────────────────────────────────────────────────
  const ListHeader = (
    <>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          Hey
          {user?.displayName
            ? `, ${user.displayName}`
            : user?.username
            ? `, ${user.username}`
            : ""}{" "}
          👋
        </Text>
      </View>

      {/* Events / Postcards toggle */}
      <View style={styles.segRow}>
        <SegmentedControl
          options={["Events", "Postcards"]}
          selected={contentTab}
          onSelect={(v) => setContentTab(v as "Events" | "Postcards")}
        />
      </View>

      {/* Search + filters */}
      <SearchFilterCard
        search={search}
        onSearchChange={setSearch}
        selectedVibe={selectedVibe}
        onVibeChange={setSelectedVibe}
        locationLabel={locationLabel}
        onLocationChange={(coords, label) => {
          setLocationCoords(coords);
          setLocationLabel(label);
        }}
      />

      {/* Feed tabs */}
      <FeedTabs tabs={FEED_TABS} active={feedTab} onSelect={setFeedTab} />

      {/* Filter chips (events only) */}
      {contentTab === "Events" && (
        <FilterChips
          chips={FILTER_CHIPS}
          active={activeChips}
          onToggle={toggleChip}
          hasActiveFilters={
            activeChips.length > 0 || !!selectedVibe || !!locationLabel || search.length > 0
          }
          onClearAll={clearAllFilters}
        />
      )}

      <View style={styles.divider} />
    </>
  );

  // ── Events view ────────────────────────────────────────────────────────────
  if (contentTab === "Events") {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <TopNavBar notificationCount={2} />
        <FlatList
          data={isEventsFirstLoad ? [] : visibleEvents}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreEvents}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <>
              {ListHeader}
              {isEventsFirstLoad && <EventCardGridSkeleton count={6} />}
            </>
          }
          ListFooterComponent={EventsFooter}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <EventCard item={item} />
            </View>
          )}
          ListEmptyComponent={
            !isEventsFirstLoad && !eventsFetching && allEvents.length > 0 && visibleEvents.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={neutral[200]}
                />
                <Text style={styles.emptyText}>No events found</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    );
  }

  // ── Postcards view ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <TopNavBar notificationCount={2} />
      <FlatList
        data={isPostcardsFirstLoad ? [] : allPostcards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMorePostcards}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={brand.primary}
          />
        }
        ListHeaderComponent={
          <>
            {ListHeader}
            {isPostcardsFirstLoad && <PostcardCardGridSkeleton count={6} />}
          </>
        }
        ListFooterComponent={PostcardsFooter}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <PostcardCard item={item as PostcardItem} />
          </View>
        )}
        ListEmptyComponent={
          !isPostcardsFirstLoad && !postcardsFetching ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="images-outline" size={40} color={neutral[200]} />
              <Text style={styles.emptyText}>No postcards yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#fff" },
  listContent: { paddingBottom: 32 },

  greeting: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
  },
  greetingText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: neutral[900],
  },

  segRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginHorizontal: 16,
    marginBottom: 14,
  },
  row: {
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 12,
  },
  cardWrap: { flex: 1 },

  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});

// ─── Postcard styles ──────────────────────────────────────────────────────────

const pc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[100],
  },
  imgWrap: {
    width: "100%",
    height: 160,
    backgroundColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  imgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  likeText: { fontFamily: fontFamily.semibold, fontSize: 10, color: "#fff" },
  info:     { padding: 8 },
  caption:  { fontFamily: fontFamily.regular,  fontSize: 11, color: neutral[700], lineHeight: 16 },
  author:   { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[500], marginTop: 3 },
});
