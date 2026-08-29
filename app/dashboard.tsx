import { AppHeader } from '@/components/navigation/TopNavBar';
import { AudienceCardSkeleton, DashboardEventsSkeleton } from '@/components/ui/Skeleton';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrganizerEventsQuery, type OrganizerEvent } from '@/store/api/usersApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'PUBLISHED';
  return (
    <View style={[badge.pill, {
      backgroundColor: isPublished ? `${semantic.success}18` : `${semantic.warning}18`,
    }]}>
      <Text style={[badge.text, {
        color: isPublished ? semantic.success : semantic.warning,
      }]}>
        {status}
      </Text>
    </View>
  );
}

function EventListItem({ item }: { item: OrganizerEvent }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={ev.row}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/edit-event', params: { id: item.id } })}
    >
      <View style={ev.thumb}>
        {item.flierUrl ? (
          <Image source={{ uri: item.flierUrl }} style={ev.thumbImg} resizeMode="cover" />
        ) : (
          <View style={ev.thumbFallback}>
            <Ionicons name="calendar" size={22} color={brand.primary} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={ev.name} numberOfLines={1}>{item.name}</Text>
        <Text style={ev.date}>
          {new Date(item.startsAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </Text>
        {item.locationName && (
          <View style={ev.locationRow}>
            <Ionicons name="location-outline" size={11} color={neutral[500]} />
            <Text style={ev.locationText} numberOfLines={1}>{item.locationName}</Text>
          </View>
        )}
      </View>

      <View style={ev.right}>
        <StatusBadge status={item.status} />
        <Ionicons name="chevron-forward" size={16} color={neutral[300]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router   = useRouter();
  const { user } = useAuth();

  const userId = user?.id ?? '';

  const {
    data: eventsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrganizerEventsQuery(
    { organizerId: userId, page: 1, limit: 50 },
    { skip: !userId },
  );

  const events      = eventsData?.data?.data ?? [];
  const isFirstLoad = isLoading && !eventsData;
  const isRefreshing = isFetching && !!eventsData;



  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader onBack={() => router.back()}  />
      <FlatList
        data={isFirstLoad ? [] : events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={brand.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Greeting */}
            <Text style={styles.greeting}>
              Hi, {user?.displayName ?? 'there'} 👋
            </Text>

            {/* My Events header row */}
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <View style={styles.titleIcon}>
                  <Ionicons name="calendar-outline" size={18} color={brand.primary} />
                </View>
                <View>
                  <Text style={styles.titleText}>My Events</Text>
                  <Text style={styles.titleSub}>
                    Organize your events, tickets, and interactions effortlessly
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => router.push('/create')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newBtnText}>New</Text>
              </TouchableOpacity>
            </View>

            {/* Audience card — skeleton while loading */}
            {isFirstLoad ? (
              <AudienceCardSkeleton />
            ) : (
              eventsData && <AudienceStatsCard totalEvents={events.length} />
            )}

            {/* Events list skeleton */}
            {isFirstLoad && <DashboardEventsSkeleton />}

            {/* Divider before real list */}
            {!isFirstLoad && events.length > 0 && <View style={styles.divider} />}
          </View>
        }
        renderItem={({ item }) => <EventListItem item={item} />}
        ListEmptyComponent={
          !isFirstLoad ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={32} color={brand.primary} />
              </View>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySub}>Create your first event to get started</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/create')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Audience stats card (real data) ─────────────────────────────────────────

function AudienceStatsCard({ totalEvents }: { totalEvents: number }) {
  // This card will be wired to the analytics API in a future iteration.
  // For now it shows the live event count and a placeholder layout.
  return (
    <View style={aud.card}>
      <View style={aud.header}>
        <View style={aud.iconWrap}>
          <Ionicons name="bar-chart-outline" size={16} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={aud.title}>Event Overview</Text>
          <Text style={aud.sub}>{totalEvents} event{totalEvents !== 1 ? 's' : ''} created</Text>
        </View>
        <View style={aud.countryBadge}>
          <Text style={aud.countryText}>Analytics soon</Text>
        </View>
      </View>

      <View style={aud.statsRow}>
        <View style={aud.statBox}>
          <Text style={aud.statValue}>{totalEvents}</Text>
          <Text style={aud.statLabel}>Total Events</Text>
        </View>
        <View style={[aud.statBox, { borderLeftWidth: 1, borderLeftColor: neutral[200] }]}>
          <Text style={aud.statValue}>—</Text>
          <Text style={aud.statLabel}>Attendees</Text>
        </View>
        <View style={[aud.statBox, { borderLeftWidth: 1, borderLeftColor: neutral[200] }]}>
          <Text style={aud.statValue}>—</Text>
          <Text style={aud.statLabel}>Revenue</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 48 },

  headerSection: { paddingTop: 16 },

  greeting: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.lg,
    color: neutral[900],
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  titleIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  titleText: { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[900] },
  titleSub:  { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], marginTop: 2, maxWidth: 200 },

  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: brand.primary,
  },
  newBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginHorizontal: 16,
    marginBottom: 8,
  },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  emptySub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,   color: neutral[500], marginTop: 4, textAlign: 'center' },
  emptyBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, backgroundColor: brand.primary,
  },
  emptyBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

const aud = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, borderWidth: 1, borderColor: neutral[200],
    padding: 14, gap: 12,
  },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  title:        { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[800] },
  sub:          { fontFamily: fontFamily.regular,  fontSize: 10, color: neutral[500], marginTop: 1 },
  countryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: neutral[100] },
  countryText:  { fontFamily: fontFamily.regular,  fontSize: 10, color: neutral[600] },

  statsRow: { flexDirection: 'row' },
  statBox: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: { fontFamily: fontFamily.bold,    fontSize: fontSize.lg, color: neutral[800] },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 10,          color: neutral[500], marginTop: 2 },
});

const ev = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  thumbImg: { width: 64, height: 64 },
  thumbFallback: {
    width: 64, height: 64, borderRadius: 12,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  name:         { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  date:         { fontFamily: fontFamily.regular,  fontSize: 12, color: neutral[500], marginTop: 3 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], flex: 1 },
  right:        { alignItems: 'flex-end', gap: 6 },
});

const badge = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

