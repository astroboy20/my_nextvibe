import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const POSTCARD_COL = (width - 16 * 2 - 8) / 2; // 2-col grid with gap

// ─── Mock data (replace with API hooks) ───────────────────────────────────────

const MOCK_PROFILE = {
  displayName: 'Nextvibe User',
  username:    '@nextvibeuser',
  avatarUrl:   null as string | null,
  eventsCount:    4,
  postcardsCount: 6,
  ticketsCount:   2,
};

const MOCK_EVENTS = [
  { id: '1', name: 'Argentina vs. Spain', startsAt: '2026-07-19', status: 'PUBLISHED', locationName: 'Online Event', flierUrl: null },
  { id: '2', name: 'Argentina vs England', startsAt: '2026-07-15', status: 'DRAFT',     locationName: 'Online Event', flierUrl: null },
  { id: '3', name: 'GOAT Exhibition',      startsAt: '2026-07-18', status: 'PUBLISHED', locationName: null,           flierUrl: null },
];

const MOCK_POSTCARDS = [
  { id: '1', caption: 'What a match!',    likeCount: 24, mediaUrl: null, height: 180 },
  { id: '2', caption: 'Electric night',   likeCount: 11, mediaUrl: null, height: 240 },
  { id: '3', caption: 'Goals on goals',   likeCount: 38, mediaUrl: null, height: 160 },
  { id: '4', caption: 'Fan vibes',        likeCount: 5,  mediaUrl: null, height: 210 },
];

const MOCK_TICKETS = [
  { id: '1', eventName: 'Argentina vs. Spain', ticketType: 'VIP',      date: '2026-07-19', ticketNumber: 'TKT-001', status: 'active' },
  { id: '2', eventName: 'GOAT Exhibition',     ticketType: 'Standard', date: '2026-07-18', ticketNumber: 'TKT-002', status: 'used'   },
];

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'events',    label: 'Events',    icon: 'calendar-outline' as const },
  { id: 'postcards', label: 'Postcards', icon: 'images-outline'   as const },
  { id: 'tickets',   label: 'Ticket',    icon: 'ticket-outline'   as const },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ uri, name, size = 80 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name.charAt(0).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={stat.item}>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'PUBLISHED' ? semantic.success :
    status === 'DRAFT'     ? semantic.warning :
    neutral[400];
  const bg =
    status === 'PUBLISHED' ? `${semantic.success}18` :
    status === 'DRAFT'     ? `${semantic.warning}18` :
    neutral[100];
  return (
    <View style={[badge.pill, { backgroundColor: bg }]}>
      <Text style={[badge.text, { color }]}>{status}</Text>
    </View>
  );
}

function EventRow({ item }: { item: typeof MOCK_EVENTS[0] }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={ev.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/events/${item.id}` as any)}
    >
      {/* Flier thumbnail */}
      <View style={ev.thumb}>
        {item.flierUrl ? (
          <Image source={{ uri: item.flierUrl }} style={ev.thumbImg} />
        ) : (
          <View style={[ev.thumbImg, ev.thumbFallback]}>
            <Ionicons name="calendar" size={22} color={brand.primary} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={ev.titleRow}>
          <Text style={ev.name} numberOfLines={1}>{item.name}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={ev.meta}>
          <Ionicons name="calendar-outline" size={11} color={neutral[500]} />
          <Text style={ev.metaText}>
            {new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        {item.locationName && (
          <View style={ev.meta}>
            <Ionicons name="location-outline" size={11} color={neutral[500]} />
            <Text style={ev.metaText}>{item.locationName}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={neutral[300]} />
    </TouchableOpacity>
  );
}

function PostcardGrid({ items }: { items: typeof MOCK_POSTCARDS }) {
  // Split into two columns manually for masonry-like layout
  const left  = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 !== 0);

  const renderCard = (item: typeof MOCK_POSTCARDS[0]) => (
    <TouchableOpacity key={item.id} style={[pc.card, { height: item.height }]} activeOpacity={0.85}>
      <View style={[pc.imgArea, { height: item.height }]}>
        {item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={pc.imgFallback}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}
        {/* Like overlay */}
        <View style={pc.overlay}>
          <Ionicons name="heart" size={12} color="#fff" />
          <Text style={pc.likeText}>{item.likeCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={pc.grid}>
      <View style={pc.col}>{left.map(renderCard)}</View>
      <View style={pc.col}>{right.map(renderCard)}</View>
    </View>
  );
}

function TicketRow({ item }: { item: typeof MOCK_TICKETS[0] }) {
  const isActive = item.status === 'active';
  return (
    <View style={tk.row}>
      <View style={tk.icon}>
        <Ionicons name="ticket-outline" size={22} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tk.name}>{item.eventName}</Text>
        <Text style={tk.meta}>
          {item.ticketType} · {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        {item.ticketNumber && <Text style={tk.number}>#{item.ticketNumber}</Text>}
      </View>
      <View style={[tk.badge, { backgroundColor: isActive ? `${semantic.success}18` : neutral[100] }]}>
        <Text style={[tk.badgeText, { color: isActive ? semantic.success : neutral[400] }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState('events');
  const isLoading = false; // swap with real loading state

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={brand.primary} size="large" />
          </View>
        ) : (
          <>
            {/* ── Header ── */}
            <View style={styles.header}>
              {/* Settings icon top-right */}
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={22} color={neutral[700]} />
              </TouchableOpacity>

              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <Avatar uri={MOCK_PROFILE.avatarUrl} name={MOCK_PROFILE.displayName} size={88} />
                {/* Ring */}
                <View style={styles.avatarRing} />
              </View>

              <Text style={styles.displayName}>{MOCK_PROFILE.displayName}</Text>
              <Text style={styles.username}>{MOCK_PROFILE.username}</Text>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatItem value={MOCK_PROFILE.eventsCount}    label="Events"    />
                <View style={styles.statDivider} />
                <StatItem value={MOCK_PROFILE.postcardsCount} label="Postcards" />
                <View style={styles.statDivider} />
                <StatItem value={MOCK_PROFILE.ticketsCount}   label="Tickets"   />
              </View>

              {/* Action buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/edit-profile')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Dashboard quick-link ── */}
            <TouchableOpacity
              style={styles.dashCard}
              onPress={() => router.push('/dashboard' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.dashIcon}>
                <Ionicons name="grid-outline" size={20} color={brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dashTitle}>Dashboard</Text>
                <Text style={styles.dashSub}>Manage your events</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={neutral[400]} />
            </TouchableOpacity>

            {/* ── Tabs ── */}
            <View style={styles.tabBar}>
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={styles.tabItem}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={active ? brand.primary : neutral[400]}
                    />
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                    {active && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.tabContent}>
              {/* Events */}
              {activeTab === 'events' && (
                MOCK_EVENTS.length > 0 ? (
                  MOCK_EVENTS.map((e) => <EventRow key={e.id} item={e} />)
                ) : (
                  <Text style={styles.empty}>No events yet</Text>
                )
              )}

              {/* Postcards */}
              {activeTab === 'postcards' && (
                MOCK_POSTCARDS.length > 0 ? (
                  <PostcardGrid items={MOCK_POSTCARDS} />
                ) : (
                  <Text style={styles.empty}>No postcards yet</Text>
                )
              )}

              {/* Tickets */}
              {activeTab === 'tickets' && (
                MOCK_TICKETS.length > 0 ? (
                  MOCK_TICKETS.map((t) => <TicketRow key={t.id} item={t} />)
                ) : (
                  <Text style={styles.empty}>No tickets yet</Text>
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40, backgroundColor: '#fff' },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  settingsBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: neutral[100],
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarRing: {
    position: 'absolute',
    inset: -4,
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: `${brand.primary}30`,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  displayName: { fontFamily: fontFamily.bold,    fontSize: fontSize.xl,  color: neutral[900] },
  username:    { fontFamily: fontFamily.regular, fontSize: fontSize.sm,  color: neutral[500], marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statDivider: { width: 1, height: 32, backgroundColor: neutral[200], marginHorizontal: 24 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  editBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: brand.primary,
  },
  editBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },

  // Dashboard card
  dashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.primary}20`,
    backgroundColor: `${brand.primary}08`,
    gap: 12,
  },
  dashIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${brand.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashTitle: { fontFamily: fontFamily.bold,    fontSize: fontSize.base, color: neutral[800] },
  dashSub:   { fontFamily: fontFamily.regular, fontSize: fontSize.xs,   color: neutral[500], marginTop: 1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel:       { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[400] },
  tabLabelActive: { color: brand.primary },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: brand.primary,
    borderRadius: 2,
  },

  tabContent: { paddingHorizontal: 16, paddingTop: 12 },
  empty: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center', paddingVertical: 40 },
});

// Avatar
const av = StyleSheet.create({
  circle:   { backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.bold, color: '#fff' },
});

// Stat item
const stat = StyleSheet.create({
  item:  { alignItems: 'center', flex: 1 },
  value: { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl,  color: neutral[900] },
  label: { fontFamily: fontFamily.regular,   fontSize: fontSize.xs,  color: neutral[500], marginTop: 2 },
});

// Status badge
const badge = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

// Event row
const ev = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  thumb:        { width: 60, height: 60, borderRadius: 12, overflow: 'hidden' },
  thumbImg:     { width: 60, height: 60 },
  thumbFallback:{ backgroundColor: `${brand.primary}12`, alignItems: 'center', justifyContent: 'center' },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  name:         { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800], flex: 1 },
  meta:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText:     { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },
});

// Postcard grid
const pc = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  col:  { flex: 1, gap: 8 },
  card: { borderRadius: 12, overflow: 'hidden' },
  imgArea: {
    borderRadius: 12,
    backgroundColor: neutral[100],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  likeText: { fontFamily: fontFamily.semibold, fontSize: 11, color: '#fff' },
});

// Ticket row
const tk = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  icon:      { width: 44, height: 44, borderRadius: 12, backgroundColor: `${brand.primary}12`, alignItems: 'center', justifyContent: 'center' },
  name:      { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  meta:      { fontFamily: fontFamily.regular,  fontSize: 12, color: neutral[500], marginTop: 2 },
  number:    { fontFamily: fontFamily.regular,  fontSize: 11, color: neutral[400], marginTop: 2 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: 11 },
});
