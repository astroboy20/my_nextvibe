import EventCard, { type EventCardData } from '@/components/discover/EventCard';
import FeedTabs, { type FeedTabDef } from '@/components/discover/FeedTabs';
import FilterChips, { type ChipDef } from '@/components/discover/FilterChips';
import SearchFilterCard from '@/components/discover/SearchFilterCard';
import SegmentedControl from '@/components/discover/SegmentedControl';
import TopNavBar from '@/components/navigation/TopNavBar';
import { EventCardGridSkeleton, PostcardItemSkeleton } from '@/components/ui/Skeleton';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
  toCardData,
  useGetDiscoverEventsQuery,
  useGetPostcardsQuery,
  type PostcardItem,
} from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Static config ────────────────────────────────────────────────────────────

const FEED_TABS: FeedTabDef[] = [
  { label: 'For You',  icon: 'sparkles-outline' },
  { label: 'Trending', icon: 'trending-up-outline' },
  { label: 'Near You', icon: 'location-outline' },
];

const FILTER_CHIPS: ChipDef[] = [
  { label: 'Has Games',   icon: 'game-controller-outline' },
  { label: 'Has VibeTag', icon: 'pricetag-outline' },
  { label: 'Free',        icon: 'gift-outline' },
  { label: 'Streaming',   icon: 'radio-outline' },
];

// ─── Postcard card component ──────────────────────────────────────────────────

function PostcardCard({ item }: { item: PostcardItem }) {
  const mediaUrl = item.media?.[0]?.mediaUrl;
  return (
    <View style={pc.card}>
      <View style={pc.imgWrap}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={pc.imgFallback}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}
        {/* Like count overlay */}
        <View style={pc.overlay}>
          <Ionicons name="heart" size={11} color="#fff" />
          <Text style={pc.likeText}>{item.likeCount ?? 0}</Text>
        </View>
      </View>
      {item.caption ? (
        <View style={pc.info}>
          <Text style={pc.caption} numberOfLines={2}>{item.caption}</Text>
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
  const [contentTab,  setContentTab]  = useState<'Events' | 'Postcards'>('Events');
  const [feedTab,     setFeedTab]     = useState('For You');
  const [search,      setSearch]      = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);

  const toggleChip = (label: string) =>
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );

  // ── Events API ─────────────────────────────────────────────────────────────
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    refetch: refetchEvents,
  } = useGetDiscoverEventsQuery({ page: 1, limit: 20 });

  // ── Postcards API ──────────────────────────────────────────────────────────
  const {
    data: postcardsData,
    isLoading: postcardsLoading,
    isFetching: postcardsFetching,
    refetch: refetchPostcards,
  } = useGetPostcardsQuery({ page: 1, limit: 20 }, { skip: contentTab !== 'Postcards' });

  // ── Derived ────────────────────────────────────────────────────────────────
  const rawEvents   = eventsData?.data ?? [];
  const postcards   = postcardsData?.data?.data ?? [];

  const isEventsFirstLoad   = eventsLoading   && !eventsData;
  const isPostcardsFirstLoad = postcardsLoading && !postcardsData;
  const isRefreshing =
    contentTab === 'Events'
      ? eventsFetching   && !!eventsData
      : postcardsFetching && !!postcardsData;

  const handleRefresh = () => {
    if (contentTab === 'Events') refetchEvents();
    else refetchPostcards();
  };

  // Client-side filter on top of API data
  const visibleEvents: EventCardData[] = useMemo(() => {
    let list = rawEvents.map(toCardData);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q),
      );
    }
    if (activeChips.includes('Has Games'))   list = list.filter((e) => e.hasGames);
    if (activeChips.includes('Has VibeTag')) list = list.filter((e) => e.hasVibeTag);
    return list;
  }, [rawEvents, search, activeChips]);

  // ── List header (shared for both tabs) ────────────────────────────────────
  const ListHeader = (
    <>
      {/* Events / Postcards toggle */}
      <View style={styles.segRow}>
        <SegmentedControl
          options={['Events', 'Postcards']}
          selected={contentTab}
          onSelect={(v) => setContentTab(v as 'Events' | 'Postcards')}
        />
      </View>

      {/* Search + filters */}
      <SearchFilterCard
        search={search}
        onSearchChange={setSearch}
        onLocationPress={() => {}}
        onVibesPress={() => {}}
      />

      {/* Feed tabs */}
      <FeedTabs tabs={FEED_TABS} active={feedTab} onSelect={setFeedTab} />

      {/* Filter chips (events only) */}
      {contentTab === 'Events' && (
        <FilterChips chips={FILTER_CHIPS} active={activeChips} onToggle={toggleChip} />
      )}

      <View style={styles.divider} />
    </>
  );

  // ── Events view ────────────────────────────────────────────────────────────
  if (contentTab === 'Events') {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <TopNavBar notificationCount={2} />
        <FlatList
          data={isEventsFirstLoad ? [] : visibleEvents}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
              {isEventsFirstLoad && (
                <EventCardGridSkeleton count={6} />
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <EventCard item={item} />
            </View>
          )}
          ListEmptyComponent={
            !isEventsFirstLoad ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="calendar-outline" size={40} color={neutral[200]} />
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
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <TopNavBar notificationCount={2} />
      <FlatList
        data={isPostcardsFirstLoad ? [] : postcards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
            {isPostcardsFirstLoad && (
              <View style={styles.row}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.cardWrap}>
                    <PostcardItemSkeleton height={i % 2 === 0 ? 200 : 240} />
                  </View>
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <PostcardCard item={item as PostcardItem} />
          </View>
        )}
        ListEmptyComponent={
          !isPostcardsFirstLoad ? (
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
  safe:        { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 32 },

  segRow: {
    alignItems: 'center',
    paddingTop: 18,
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
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
});

// Postcard card styles
const pc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[100],
  },
  imgWrap: {
    width: '100%',
    height: 160,
    backgroundColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  likeText: { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },
  info:     { padding: 8 },
  caption:  { fontFamily: fontFamily.regular,  fontSize: 11, color: neutral[700], lineHeight: 16 },
  author:   { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[500], marginTop: 3 },
});
