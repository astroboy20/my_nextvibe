/**
 * Home Screen
 *
 * Two tabs: Events and Postcards.
 * Both use the SAME events endpoint and the SAME EventCard component.
 * The only difference:
 *   Events  → tap navigates to /events/:id
 *   Postcards → tap navigates to /events/postcards/:id  (the postcard grid)
 *
 * The Postcards tab additionally filters to only show events that
 * have at least one postcard (hasVibeTag flag acts as a proxy until
 * the API returns a postcards count directly).
 */
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
import {
  toCardData,
  useGetEventsQuery,
  type DiscoverEvent,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Config ───────────────────────────────────────────────────────────────────

const FEED_TABS: FeedTabDef[] = [
  { label: "For You",  icon: "sparkles-outline" },
  { label: "Trending", icon: "trending-up-outline" },
  { label: "Near You", icon: "location-outline" },
];

const FILTER_CHIPS: ChipDef[] = [
  { label: "Has Games",     icon: "game-controller-outline" },
  { label: "Has VibeTag",   icon: "pricetag-outline" },
  { label: "Free",          icon: "gift-outline" },
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
  const router   = useRouter();

  const [contentTab, setContentTab] = useState<"Events" | "Postcards">("Events");
  const [feedTab,    setFeedTab]    = useState("For You");
  const [search,     setSearch]     = useState("");
  const [activeChips,   setActiveChips]   = useState<string[]>([]);
  const [selectedVibe,  setSelectedVibe]  = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const toggleChip  = (label: string) =>
    setActiveChips((p) => p.includes(label) ? p.filter((c) => c !== label) : [...p, label]);

  const clearFilters = () => {
    setActiveChips([]);
    setSelectedVibe(null);
    setLocationLabel(null);
    setSearch("");
  };

  // ── Pagination (shared — both tabs use the same query) ─────────────────────
  const [page,      setPage]      = useState(1);
  const [allEvents, setAllEvents] = useState<DiscoverEvent[]>([]);
  const [hasNext,   setHasNext]   = useState(true);
  const loadingMore = useRef(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchBase,
  } = useGetEventsQuery({ page, limit: PAGE_SIZE });

  useEffect(() => {
    if (!data) return;
    const incoming: DiscoverEvent[] = data?.data?.data ?? [];
    setAllEvents((prev) => {
      if (page === 1) return incoming;
      const seen = new Set(prev.map((e) => e.id));
      return [...prev, ...incoming.filter((e) => !seen.has(e.id))];
    });
    const meta = data?.data?.meta;
    setHasNext(meta?.hasNext ?? incoming.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [data, page]);

  const handleRefresh = useCallback(() => {
    loadingMore.current = false;
    setPage(1);
    setAllEvents([]);
    refetchBase();
  }, [refetchBase]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore.current || isFetching || !hasNext) return;
    loadingMore.current = true;
    setPage((p) => p + 1);
  }, [isFetching, hasNext]);

  // ── Client-side filter (applied to both tabs) ──────────────────────────────
  const filtered: EventCardData[] = useMemo(() => {
    let list = allEvents.map(toCardData);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q),
      );
    }
    if (activeChips.includes("Has Games"))     list = list.filter((e) => e.hasGames);
    if (activeChips.includes("Has VibeTag"))   list = list.filter((e) => e.hasVibeTag);
    if (activeChips.includes("Starting Soon")) list = list.filter((e) => isStartingSoon(e.startsAt));

    if (selectedVibe) {
      const v = selectedVibe.toLowerCase();
      list = list.filter(
        (e) =>
          e.tags.some((t) => t.label.toLowerCase().includes(v)) ||
          e.title.toLowerCase().includes(v),
      );
    }
    if (locationLabel) {
      const city = locationLabel.split(",")[0].trim().toLowerCase();
      list = list.filter((e) => e.location.toLowerCase().includes(city));
    }

    // Postcards tab shows all events — same data, different tap routing.
    // No extra filtering needed here.

    return list;
  }, [allEvents, search, activeChips, selectedVibe, locationLabel, contentTab]);

  const isFirstLoad = isLoading && allEvents.length === 0;
  const isRefreshing = isFetching && page === 1;

  // ── Shared header ──────────────────────────────────────────────────────────
  const ListHeader = (
    <>
      <View style={s.greeting}>
        <Text style={s.greetingText}>
          Hey
          {user?.displayName ? `, ${user.displayName}`
            : user?.username  ? `, ${user.username}` : ""} 👋
        </Text>
      </View>

      <View style={s.segRow}>
        <SegmentedControl
          options={["Events", "Postcards"]}
          selected={contentTab}
          onSelect={(v) => {
            setContentTab(v as "Events" | "Postcards");
            // Reset filters when switching tabs
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

      {/* Filter chips — same on both tabs */}
      <FilterChips
        chips={FILTER_CHIPS}
        active={activeChips}
        onToggle={toggleChip}
        hasActiveFilters={
          activeChips.length > 0 || !!selectedVibe || !!locationLabel || search.length > 0
        }
        onClearAll={clearFilters}
      />

      <View style={s.divider} />
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <TopNavBar notificationCount={2} />
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
          <>
            {ListHeader}
            {isFirstLoad && <EventCardGridSkeleton count={6} />}
          </>
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
              // Postcards tab routes to the postcard grid; Events tab uses
              // the default EventCard routing (/events/:id)
              onPress={
                contentTab === "Postcards"
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
                name={contentTab === "Events" ? "calendar-outline" : "images-outline"}
                size={40}
                color={neutral[200]}
              />
              <Text style={s.emptyText}>
                {contentTab === "Events" ? "No events found" : "No postcards yet"}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#fff" },
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

  row:     { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  cardWrap: { flex: 1 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },

  footer: { paddingVertical: 20, alignItems: "center" },
});
