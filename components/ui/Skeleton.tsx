/**
 * Skeleton
 *
 * Animated shimmer boxes for loading states.
 * Uses React Native's Animated API — no extra libraries needed.
 */

import { neutral } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

// ── Base animated box ─────────────────────────────────────────────────────────

interface SkeletonProps {
  width:         number | `${number}%`;
  height:        number;
  borderRadius?: number;
  style?:        ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: neutral[200] }, { opacity }, style]}
    />
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <View style={profile.wrap}>
      <Skeleton width={88} height={88} borderRadius={44} />
      <Skeleton width={140} height={18} borderRadius={9}  style={{ marginTop: 14 }} />
      <Skeleton width={90}  height={13} borderRadius={7}  style={{ marginTop: 8  }} />
      <View style={profile.statsRow}>
        {[52, 64, 44].map((w, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={profile.divider} />}
            <View style={profile.statItem}>
              <Skeleton width={32} height={20} borderRadius={6} />
              <Skeleton width={w}  height={11} borderRadius={6} style={{ marginTop: 6 }} />
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={profile.actionRow}>
        <Skeleton width={140} height={40} borderRadius={24} />
        <Skeleton width={40}  height={40} borderRadius={20} />
      </View>
    </View>
  );
}

// ── Event row (profile + dashboard list) ──────────────────────────────────────

export function EventRowSkeleton() {
  return (
    <View style={row.wrap}>
      <Skeleton width={60} height={60} borderRadius={12} />
      <View style={row.lines}>
        <Skeleton width="70%" height={14} borderRadius={7} />
        <Skeleton width="45%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width="35%" height={11} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function DashboardEventsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={row.dashWrap}>
          <Skeleton width={64} height={64} borderRadius={12} />
          <View style={row.lines}>
            <Skeleton width="65%" height={14} borderRadius={7} />
            <Skeleton width="40%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
            <Skeleton width="30%" height={11} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={70} height={26} borderRadius={20} />
        </View>
      ))}
    </>
  );
}

// ── Postcard / ticket (profile tabs) ─────────────────────────────────────────

export function PostcardSkeleton({ height }: { height: number }) {
  return <Skeleton width="100%" height={height} borderRadius={12} />;
}

export function PostcardGridSkeleton() {
  const L = [180, 160, 210];
  const R = [240, 190, 170];
  return (
    <View style={grid.twoCol}>
      <View style={grid.col}>
        {L.map((h, i) => <PostcardSkeleton key={i} height={h} />)}
      </View>
      <View style={grid.col}>
        {R.map((h, i) => <PostcardSkeleton key={i} height={h} />)}
      </View>
    </View>
  );
}

export function TicketRowSkeleton() {
  return (
    <View style={row.ticketWrap}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={row.lines}>
        <Skeleton width="60%" height={13} borderRadius={6} />
        <Skeleton width="42%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={52} height={26} borderRadius={20} />
    </View>
  );
}

// ── Audience card (dashboard) ─────────────────────────────────────────────────

export function AudienceCardSkeleton() {
  return (
    <View style={audience.card}>
      <View style={audience.header}>
        <Skeleton width={30} height={30} borderRadius={8} />
        <View style={{ flex: 1 }}>
          <Skeleton width="50%" height={12} borderRadius={6} />
          <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={80} height={22} borderRadius={20} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={audience.barRow}>
          <View style={audience.barLabel}>
            <Skeleton width="30%" height={11} borderRadius={5} />
            <Skeleton width="25%" height={10} borderRadius={5} />
          </View>
          <Skeleton width="100%" height={6} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ── Home feed grid cards ──────────────────────────────────────────────────────

export function EventCardSkeleton() {
  return (
    <View style={card.wrap}>
      <Skeleton width="100%" height={140} borderRadius={0} />
      <View style={card.info}>
        <Skeleton width="80%" height={13} borderRadius={6} />
        <Skeleton width="60%" height={10} borderRadius={5} style={{ marginTop: 7 }} />
        <Skeleton width="45%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
        <Skeleton width="55%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

export function PostcardCardSkeleton() {
  return (
    <View style={card.wrap}>
      <Skeleton width="100%" height={160} borderRadius={0} />
      <View style={card.info}>
        <Skeleton width="85%" height={10} borderRadius={5} />
        <Skeleton width="65%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

/** Renders count/2 rows of 2-column card skeletons */
export function EventCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: Math.ceil(count / 2) }).map((_, i) => (
        <View key={i} style={grid.row}>
          <View style={grid.cell}><EventCardSkeleton /></View>
          <View style={grid.cell}><EventCardSkeleton /></View>
        </View>
      ))}
    </>
  );
}

export function PostcardCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: Math.ceil(count / 2) }).map((_, i) => (
        <View key={i} style={grid.row}>
          <View style={grid.cell}><PostcardCardSkeleton /></View>
          <View style={grid.cell}><PostcardCardSkeleton /></View>
        </View>
      ))}
    </>
  );
}

// ── PostcardItemSkeleton (single item, variable height) ───────────────────────

export function PostcardItemSkeleton({ height = 200 }: { height?: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Skeleton width="100%" height={height} borderRadius={12} />
    </View>
  );
}

// ── Event detail screen ───────────────────────────────────────────────────────

export function EventDetailHeroSkeleton() {
  return <Skeleton width="100%" height={260} borderRadius={0} />;
}

export function EventDetailTabSkeleton() {
  return (
    <View style={detail.tabBar}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width={52} height={14} borderRadius={7} />
      ))}
    </View>
  );
}

export function EventDetailContentSkeleton() {
  return (
    <View style={detail.content}>
      <Skeleton width="60%"  height={18} borderRadius={9} />
      <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 16 }} />
      <Skeleton width="90%"  height={12} borderRadius={6} style={{ marginTop: 8  }} />
      <Skeleton width="80%"  height={12} borderRadius={6} style={{ marginTop: 8  }} />
      <Skeleton width="55%"  height={12} borderRadius={6} style={{ marginTop: 8  }} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 20 }} />
      <Skeleton width="70%"  height={14} borderRadius={7}  style={{ marginTop: 20 }} />
      <Skeleton width="100%" height={12} borderRadius={6}  style={{ marginTop: 8  }} />
      <Skeleton width="85%"  height={12} borderRadius={6}  style={{ marginTop: 8  }} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const profile = StyleSheet.create({
  wrap:      { alignItems: 'center', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 20 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  statItem:  { alignItems: 'center', width: 72 },
  divider:   { width: 1, height: 32, backgroundColor: neutral[200], marginHorizontal: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  dashWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  ticketWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  lines: { flex: 1 },
});

const grid = StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: 8 },
  col:    { flex: 1, gap: 8 },
  row:    { flexDirection: 'row', paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  cell:   { flex: 1 },
});

const audience = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, borderWidth: 1, borderColor: neutral[200],
    padding: 14, gap: 12,
  },
  header:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  barRow:   {},
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
});

const card = StyleSheet.create({
  wrap: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    backgroundColor: neutral[100],
    borderWidth: 1, borderColor: neutral[100],
  },
  info: { padding: 10 },
});

const detail = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    backgroundColor: '#fff',
  },
  content: { padding: 16 },
});

// ── Edit Event dashboard ──────────────────────────────────────────────────────

export function EditEventHeaderSkeleton() {
  return (
    <View style={editEv.card}>
      <Skeleton width={88} height={88} borderRadius={12} />
      <View style={editEv.info}>
        <Skeleton width="70%" height={16} borderRadius={8} />
        <Skeleton width="50%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width="45%" height={11} borderRadius={6} style={{ marginTop: 6 }} />
        <View style={editEv.actions}>
          <Skeleton width={60} height={28} borderRadius={20} />
          <Skeleton width={60} height={28} borderRadius={20} />
          <Skeleton width={60} height={28} borderRadius={20} />
        </View>
      </View>
    </View>
  );
}

export function EditEventDashboardSkeleton() {
  return (
    <>
      <EditEventHeaderSkeleton />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={editEv.dashCard}>
          <View style={editEv.dashHeader}>
            <Skeleton width={28} height={28} borderRadius={8} />
            <Skeleton width="40%" height={14} borderRadius={7} />
            <Skeleton width={60} height={22} borderRadius={20} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      ))}
    </>
  );
}

const editEv = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    marginBottom: 16,
  },
  info:    { flex: 1, justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dashCard: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});



/** Single postcard card skeleton (full-width feed item) */
export function PostcardFeedSkeleton() {
  return (
    <View style={feed.card}>
      {/* Author row */}
      <View style={feed.authorRow}>
        <Skeleton width={38} height={38} borderRadius={19} />
        <View style={feed.authorLines}>
          <Skeleton width="40%" height={12} borderRadius={6} />
          <Skeleton width="28%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
        </View>
        <Skeleton width={30} height={10} borderRadius={5} />
      </View>
      {/* Media */}
      <Skeleton width="100%" height={280} borderRadius={0} />
      {/* Actions */}
      <View style={feed.actions}>
        <Skeleton width={52} height={14} borderRadius={7} />
        <Skeleton width={52} height={14} borderRadius={7} />
      </View>
      {/* Caption */}
      <View style={feed.caption}>
        <Skeleton width="80%" height={11} borderRadius={5} />
        <Skeleton width="55%" height={11} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

/** Feed list skeleton — 3 cards */
export function FeedListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <PostcardFeedSkeleton />
        </View>
      ))}
    </>
  );
}

/** Single person card skeleton */
export function PersonCardSkeleton() {
  return (
    <View style={person.card}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={person.lines}>
        <Skeleton width="45%" height={13} borderRadius={6} />
        <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
        <Skeleton width="60%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
      <View style={person.btns}>
        <Skeleton width={80} height={32} borderRadius={20} />
        <Skeleton width={34} height={34} borderRadius={17} />
      </View>
    </View>
  );
}

/** People list skeleton — 4 cards */
export function PeopleListSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <PersonCardSkeleton />
        </View>
      ))}
    </>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────

/** Single conversation row skeleton */
export function ConversationRowSkeleton() {
  return (
    <View style={conv.row}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={conv.lines}>
        <View style={conv.topLine}>
          <Skeleton width="40%" height={13} borderRadius={6} />
          <Skeleton width={28} height={10} borderRadius={5} />
        </View>
        <Skeleton width="65%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Conversations list skeleton — 5 rows */
export function ConversationsListSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </>
  );
}

// ── Styles (social + messages) ────────────────────────────────────────────────

const feed = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    overflow: 'hidden',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  authorLines: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  caption: { padding: 12 },
});

const person = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 14,
  },
  lines: { flex: 1 },
  btns:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

const conv = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  lines:   { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
