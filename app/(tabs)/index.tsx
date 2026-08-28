import EventCard, { type EventCardData } from "@/components/discover/EventCard";
import FeedTabs, { type FeedTabDef } from "@/components/discover/FeedTabs";
import FilterChips, { type ChipDef } from "@/components/discover/FilterChips";
import SearchFilterCard from "@/components/discover/SearchFilterCard";
import SegmentedControl from "@/components/discover/SegmentedControl";
import TopNavBar from "@/components/navigation/TopNavBar";
import { EventCardGridSkeleton } from "@/components/ui/Skeleton";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationBell } from "@/hooks/useNotificationBell";
import {
  toCardData,
  useGetEventsQuery,
  type DiscoverEvent,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Config ───────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CONTENT_TABS: ("Events" | "Postcards")[] = ["Events", "Postcards"];

const FEED_TABS: FeedTabDef[] = [
  { label: "For You", icon: "sparkles-outline" },
  { label: "Trending", icon: "trending-up-outline" },
  { label: "Near You", icon: "location-outline" },
];

const FILTER_CHIPS: ChipDef[] = [
  { label: "Has Games", icon: "game-controller-outline" },
  { label: "Has VibeTag", icon: "pricetag-outline" },
  { label: "Free", icon: "gift-outline" },
  { label: "Starting Soon", icon: "time-outline" },
];

const PAGE_SIZE = 20;

function isStartingSoon(startsAt?: string): boolean {
  if (!startsAt) return false;
  const diff = new Date(startsAt).getTime() - Date.now();
  return diff > 0 && diff <= 48 * 3_600_000;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { unreadCount, onBellPress } = useNotificationBell();

  // Active tab — driven by both the segmented control AND swipe
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const contentTab = CONTENT_TABS[activeTabIndex];

  // Pager ref for programmatic scroll when tapping the segmented control
  const pagerRef = useRef<ScrollView>(null);
  // Guard so the scroll event doesn't fight the tap handler
  const isTapping = useRef(false);

  const switchTab = (index: number) => {
    if (index === activeTabIndex) return;
    isTapping.current = true;
    setActiveTabIndex(index);
    pagerRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setTimeout(() => {
      isTapping.current = false;
    }, 400);
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isTapping.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (
      newIndex !== activeTabIndex &&
      newIndex >= 0 &&
      newIndex < CONTENT_TABS.length
    ) {
      setActiveTabIndex(newIndex);
    }
  };

  // ── Filter state ───────────────────────────────────────────────────────────
  const [feedTab, setFeedTab] = useState("For You");
  const [search, setSearch] = useState("");
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const toggleChip = (label: string) =>
    setActiveChips((p) =>
      p.includes(label) ? p.filter((c) => c !== label) : [...p, label]
    );

  const clearFilters = () => {
    setActiveChips([]);
    setSelectedVibe(null);
    setLocationLabel(null);
    setSearch("");
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const loadingMore = useRef(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchBase,
  } = useGetEventsQuery({ page, limit: PAGE_SIZE });

  const prevEventsRef = useRef<DiscoverEvent[]>([]);

  const allEvents = useMemo(() => {
    if (!data) return prevEventsRef.current;
    const incoming: DiscoverEvent[] = data?.data?.data ?? [];
    let merged: DiscoverEvent[];
    if (page === 1) {
      merged = incoming;
    } else {
      const seen = new Set(prevEventsRef.current.map((e) => e.id));
      merged = [
        ...prevEventsRef.current,
        ...incoming.filter((e) => !seen.has(e.id)),
      ];
    }
    prevEventsRef.current = merged;
    return merged;
  }, [data, page]);

  const handleRefresh = useCallback(() => {
    loadingMore.current = false;
    prevEventsRef.current = [];
    setPage(1);
    refetchBase();
  }, [refetchBase]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore.current || isFetching || !hasNext) return;
    loadingMore.current = true;
    setPage((p) => p + 1);
  }, [isFetching, hasNext]);

  useEffect(() => {
    if (!data) return;
    const meta = data?.data?.meta;
    const incoming = data?.data?.data ?? [];
    setHasNext(meta?.hasNext ?? incoming.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [data]);

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filtered: EventCardData[] = useMemo(() => {
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
    if (selectedVibe) {
      const v = selectedVibe.toLowerCase();
      list = list.filter(
        (e) =>
          e.tags.some((t) => t.label.toLowerCase().includes(v)) ||
          e.title.toLowerCase().includes(v)
      );
    }
    if (locationLabel) {
      const city = locationLabel.split(",")[0].trim().toLowerCase();
      list = list.filter((e) => e.location.toLowerCase().includes(city));
    }
    return list;
  }, [allEvents, search, activeChips, selectedVibe, locationLabel]);

  const isFirstLoad = isLoading && allEvents.length === 0;
  const isRefreshing = isFetching && page === 1;

  // ── Shared sticky header (above the pager) ─────────────────────────────────
  const SharedHeader = (
    <>
      <View style={s.greeting}>
        <Text style={s.greetingText}>
          Hey
          {user?.displayName
            ? `, ${user.displayName}`
            : user?.username
            ? `, ${user.username}`
            : ""}{" "}
          👋
        </Text>
      </View>

      {/* Segmented control — tapping also scrolls the pager */}
      <View style={s.segRow}>
        <SegmentedControl
          options={["Events", "Postcards"]}
          selected={contentTab}
          onSelect={(v) => {
            const idx = CONTENT_TABS.indexOf(v as "Events" | "Postcards");
            if (idx !== -1) switchTab(idx);
            setSearch("");
            setActiveChips([]);
          }}
        />
      </View>

      <SearchFilterCard
        search={search}
        onSearchChange={setSearch}
        selectedVibe={selectedVibe}
        onVibeChange={setSelectedVibe}
        locationLabel={locationLabel}
        onLocationChange={(_coords, label) => setLocationLabel(label)}
      />

      <FeedTabs tabs={FEED_TABS} active={feedTab} onSelect={setFeedTab} />

      <FilterChips
        chips={FILTER_CHIPS}
        active={activeChips}
        onToggle={toggleChip}
        hasActiveFilters={
          activeChips.length > 0 ||
          !!selectedVibe ||
          !!locationLabel ||
          search.length > 0
        }
        onClearAll={clearFilters}
      />

      <View style={s.divider} />
    </>
  );

  // ── Shared feed list (reused for both tabs, routing differs) ───────────────
  const renderFeed = (tab: "Events" | "Postcards") => (
    <FlatList
      data={isFirstLoad ? [] : filtered}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={s.row}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={brand.primary}
        />
      }
      ListHeaderComponent={
        isFirstLoad ? <EventCardGridSkeleton count={6} /> : null
      }
      ListFooterComponent={
        isFetching && page > 1 ? (
          <View style={s.footer}>
            <ActivityIndicator size="small" color={brand.primary} />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={s.cardWrap}>
          <EventCard
            item={item}
            onPress={
              tab === "Postcards"
                ? () => router.push(`/events/postcards/${item.id}` as any)
                : undefined
            }
          />
        </View>
      )}
      ListEmptyComponent={
        !isFirstLoad && !isFetching ? (
          <View style={s.empty}>
            <Ionicons
              name={tab === "Events" ? "calendar-outline" : "images-outline"}
              size={40}
              color={neutral[200]}
            />
            <Text style={s.emptyText}>
              {tab === "Events" ? "No events found" : "No postcards yet"}
            </Text>
          </View>
        ) : null
      }
    />
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <TopNavBar notificationCount={unreadCount} onNotificationPress={onBellPress} />

      {/* Sticky shared header */}
      {SharedHeader}

      {/* Swipeable pager — horizontal ScrollView with pagingEnabled */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onPagerScroll}
        // Prevent vertical scroll events inside nested FlatLists from
        // accidentally triggering horizontal page swipes
        disableIntervalMomentum
        style={s.pager}
      >
        {/* Page 0 — Events */}
        <View style={s.page}>{renderFeed("Events")}</View>

        {/* Page 1 — Postcards */}
        <View style={s.page}>{renderFeed("Postcards")}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 32 },

  greeting: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 },
  greetingText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: neutral[900],
  },

  segRow: { alignItems: "center", paddingVertical: 12 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginHorizontal: 16,
    marginBottom: 14,
  },

  // Pager
  pager: { flex: 1 },
  page: { width: SCREEN_WIDTH, flex: 1 },

  // Grid
  row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  cardWrap: { flex: 1 },

  // States
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  footer: { paddingVertical: 20, alignItems: "center" },
});
