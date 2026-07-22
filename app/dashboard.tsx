import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardEvent {
  id: string;
  name: string;
  flierUrl?: string | null;
  startsAt: string;
  status: 'PUBLISHED' | 'DRAFT' | string;
  locationName?: string | null;
}

// ─── Mock data (replace with API hooks) ───────────────────────────────────────

const MOCK_EVENTS: DashboardEvent[] = [
  { id: '1', name: 'Argentina vs. Spain',  startsAt: '2026-07-19', status: 'PUBLISHED', locationName: 'Online Event' },
  { id: '2', name: 'Argentina vs England', startsAt: '2026-07-15', status: 'DRAFT',     locationName: 'Online Event' },
  { id: '3', name: 'GOAT Exhibition',      startsAt: '2026-07-18', status: 'PUBLISHED', locationName: null },
  { id: '4', name: 'A Brand New World',    startsAt: '2026-07-20', status: 'DRAFT',     locationName: 'Lagos, Nigeria' },
];

// ─── Audience location mock (replace with analytics API) ─────────────────────

const MOCK_AUDIENCE = {
  totalAttendees: 1240,
  topCountry: { country: 'Nigeria', percentage: 62 },
  byCity: [
    { city: 'Lagos',   count: 540, percentage: 44 },
    { city: 'Abuja',   count: 210, percentage: 17 },
    { city: 'London',  count: 180, percentage: 15 },
    { city: 'Unknown', count: 120, percentage: 10 },
  ],
};

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

function AudienceCard() {
  const { totalAttendees, topCountry, byCity } = MOCK_AUDIENCE;
  const maxCount = byCity[0]?.count ?? 1;

  return (
    <View style={aud.card}>
      {/* Header */}
      <View style={aud.header}>
        <View style={aud.iconWrap}>
          <Ionicons name="location-outline" size={16} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={aud.title}>Audience Locations</Text>
          <Text style={aud.sub}>{totalAttendees.toLocaleString()} attendees across all events</Text>
        </View>
        <View style={aud.countryBadge}>
          <Text style={aud.countryText}>🌍 {topCountry.country} {topCountry.percentage}%</Text>
        </View>
      </View>

      {/* City bars */}
      {byCity.map((c) => (
        <View key={c.city} style={aud.cityRow}>
          <View style={aud.cityLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {c.city === 'Unknown' && (
                <Ionicons name="information-circle-outline" size={13} color={semantic.warning} />
              )}
              <Text style={aud.cityName}>{c.city}</Text>
            </View>
            <Text style={aud.cityPct}>{c.percentage}% ({c.count.toLocaleString()})</Text>
          </View>
          <View style={aud.barBg}>
            <View style={[
              aud.barFill,
              {
                width: `${Math.min(100, (c.count / maxCount) * 100)}%` as any,
                backgroundColor: c.city === 'Unknown' ? neutral[300] : brand.primary,
              },
            ]} />
          </View>
        </View>
      ))}

      {/* Unknown footnote */}
      <View style={aud.footnote}>
        <Ionicons name="information-circle-outline" size={12} color={semantic.warning} />
        <Text style={aud.footnoteText}>
          Unknown includes attendees who haven't shared their location yet.
        </Text>
      </View>
    </View>
  );
}

function EventListItem({ item }: { item: DashboardEvent }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={ev.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/events/${item.id}` as any)}
    >
      {/* Thumbnail */}
      <View style={ev.thumb}>
        {item.flierUrl ? (
          <Image source={{ uri: item.flierUrl }} style={ev.thumbImg} resizeMode="cover" />
        ) : (
          <View style={ev.thumbFallback}>
            <Ionicons name="calendar" size={22} color={brand.primary} />
          </View>
        )}
      </View>

      {/* Info */}
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

      {/* Status + chevron */}
      <View style={ev.right}>
        <StatusBadge status={item.status} />
        <Ionicons name="chevron-forward" size={16} color={neutral[300]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const isLoading = false; // swap with real loading state
  const displayName = 'Nextvibe User'; // swap with currentUser?.data?.displayName

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={MOCK_EVENTS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Greeting */}
            <Text style={styles.greeting}>Hi, {displayName} 👋</Text>

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

            {/* Audience location card */}
            <AudienceCard />

            {/* List divider */}
            {MOCK_EVENTS.length > 0 && <View style={styles.divider} />}
          </View>
        }
        renderItem={({ item }) =>
          isLoading ? (
            <View style={sk.row}>
              <View style={sk.thumb} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={sk.line1} />
                <View style={sk.line2} />
                <View style={sk.line3} />
              </View>
            </View>
          ) : (
            <EventListItem item={item} />
          )
        }
        ListEmptyComponent={
          !isLoading ? (
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
        // Header with back button inside the safe area
        ListHeaderComponentStyle={{ paddingTop: 0 }}
      />

      {/* Sticky back button in top-left */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={neutral[800]} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 48 },

  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSection: { paddingTop: 16 },

  greeting: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.lg,
    color: neutral[900],
    paddingHorizontal: 16,
    paddingTop: 36, // space below back btn
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleText: { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[900] },
  titleSub:  { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], marginTop: 2, maxWidth: 200 },

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brand.primary,
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
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  emptySub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,   color: neutral[500], marginTop: 4, textAlign: 'center' },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: brand.primary,
  },
  emptyBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// Audience card
const aud = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 14,
    gap: 12,
  },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title:        { fontFamily: fontFamily.semibold, fontSize: 12,         color: neutral[800] },
  sub:          { fontFamily: fontFamily.regular,  fontSize: 10,         color: neutral[500], marginTop: 1 },
  countryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: neutral[100] },
  countryText:  { fontFamily: fontFamily.regular,  fontSize: 10,         color: neutral[600] },

  cityRow:     { gap: 4 },
  cityLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityName:    { fontFamily: fontFamily.regular, fontSize: 12, color: neutral[800] },
  cityPct:     { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] },
  barBg:       { height: 6, borderRadius: 6, backgroundColor: neutral[100], overflow: 'hidden' },
  barFill:     { height: 6, borderRadius: 6 },

  footnote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  footnoteText: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500], flex: 1 },
});

// Event list item
const ev = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  thumbImg: { width: 64, height: 64 },
  thumbFallback: {
    width: 64, height: 64, borderRadius: 12,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  name:        { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  date:        { fontFamily: fontFamily.regular,  fontSize: 12,          color: neutral[500], marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText:{ fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], flex: 1 },
  right:       { alignItems: 'flex-end', gap: 6 },
});

// Badge
const badge = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

// Skeleton rows
const sk = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: neutral[100] },
  line1: { height: 14, width: '70%', borderRadius: 7, backgroundColor: neutral[100] },
  line2: { height: 11, width: '50%', borderRadius: 6, backgroundColor: neutral[100] },
  line3: { height: 11, width: '35%', borderRadius: 6, backgroundColor: neutral[100] },
});
