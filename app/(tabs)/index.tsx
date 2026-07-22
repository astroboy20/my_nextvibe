import EventCard, { EventCardData } from '@/components/discover/EventCard';
import FeedTabs, { FeedTabDef } from '@/components/discover/FeedTabs';
import FilterChips, { ChipDef } from '@/components/discover/FilterChips';
import SearchFilterCard from '@/components/discover/SearchFilterCard';
import SegmentedControl from '@/components/discover/SegmentedControl';
import TopNavBar from '@/components/navigation/TopNavBar';
import { neutral } from '@/constants/Colors';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
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

// ─── Mock data (replace with API) ─────────────────────────────────────────────

const MOCK_EVENTS: EventCardData[] = [
  {
    id: '1',
    title: 'Argentina vs. Spain',
    date: 'July 19, 2026',
    memories: 7,
    location: 'Online Event',
    eventMode: 'VIRTUAL',
    tags: [
      { label: 'Virtual', color: '#3B82F6' },
      { label: 'Games',   color: '#EF4444' },
      { label: 'VibeTag', color: '#8B5CF6' },
    ],
  },
  {
    id: '2',
    title: 'Argentina vs England',
    date: 'July 15, 2026',
    memories: 2,
    location: 'Online Event',
    eventMode: 'VIRTUAL',
    tags: [
      { label: 'Virtual', color: '#3B82F6' },
      { label: 'Games',   color: '#EF4444' },
      { label: 'VibeTag', color: '#8B5CF6' },
    ],
  },
  {
    id: '3',
    title: 'A Brand New World',
    date: 'July 20, 2026',
    memories: 5,
    location: 'Online Event',
    tags: [
      { label: 'Games',   color: '#EF4444' },
      { label: 'VibeTag', color: '#8B5CF6' },
    ],
  },
  {
    id: '4',
    title: 'GOAT Exhibition',
    date: 'July 18, 2026',
    memories: 3,
    location: 'Online Event',
    eventMode: 'HYBRID',
    tags: [
      { label: 'Virtual', color: '#3B82F6' },
      { label: 'Games',   color: '#EF4444' },
      { label: 'VibeTag', color: '#8B5CF6' },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [contentTab,   setContentTab]   = useState<'Events' | 'Postcards'>('Events');
  const [feedTab,      setFeedTab]      = useState('For You');
  const [search,       setSearch]       = useState('');
  const [activeChips,  setActiveChips]  = useState<string[]>([]);

  const toggleChip = (label: string) =>
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );

  // Basic client-side filtering — swap with API query params
  const visibleEvents = useMemo(() => {
    let list = MOCK_EVENTS;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }
    if (activeChips.includes('Has Games'))
      list = list.filter((e) => e.hasGames);
    if (activeChips.includes('Has VibeTag'))
      list = list.filter((e) => e.hasVibeTag);
    return list;
  }, [search, activeChips]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <TopNavBar notificationCount={2} />

      <FlatList
        data={visibleEvents}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Events / Postcards toggle */}
            <View style={styles.segRow}>
              <SegmentedControl
                options={['Events', 'Postcards']}
                selected={contentTab}
                onSelect={(v) => setContentTab(v as 'Events' | 'Postcards')}
              />
            </View>

            {/* Search + location/vibes */}
            <SearchFilterCard
              search={search}
              onSearchChange={setSearch}
              onLocationPress={() => {}}
              onVibesPress={() => {}}
            />

            {/* Feed tabs */}
            <FeedTabs tabs={FEED_TABS} active={feedTab} onSelect={setFeedTab} />

            {/* Filter chips */}
            <FilterChips chips={FILTER_CHIPS} active={activeChips} onToggle={toggleChip} />

            {/* Divider */}
            <View style={styles.divider} />
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <EventCard item={item} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

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

  // FlatList grid
  row: {
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 12,
  },
  cardWrap: {
    flex: 1,
  },
});
