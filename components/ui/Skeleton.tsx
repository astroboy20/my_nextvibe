/**
 * Skeleton
 *
 * A single animated shimmer box used to build skeleton loading states.
 * Uses react-native's Animated API — no extra libraries needed.
 *
 * Usage:
 *   <Skeleton width={120} height={14} borderRadius={7} />
 *   <Skeleton width="100%" height={60} borderRadius={12} />
 */

import { neutral } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

interface SkeletonProps {
  width:        number | `${number}%`;
  height:       number;
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
      style={[
        sk.box,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

// ── Pre-built skeleton shapes ─────────────────────────────────────────────────

/** One event row skeleton (used in profile + dashboard) */
export function EventRowSkeleton() {
  return (
    <View style={sk.eventRow}>
      <Skeleton width={60} height={60} borderRadius={12} />
      <View style={sk.eventLines}>
        <Skeleton width="70%" height={14} borderRadius={7} />
        <Skeleton width="45%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width="35%" height={11} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** One postcard card skeleton */
export function PostcardSkeleton({ height }: { height: number }) {
  return <Skeleton width="100%" height={height} borderRadius={12} />;
}

/** Two-column postcard grid skeleton */
export function PostcardGridSkeleton() {
  const leftHeights  = [180, 160, 210];
  const rightHeights = [240, 190, 170];
  return (
    <View style={sk.pcGrid}>
      <View style={sk.pcCol}>
        {leftHeights.map((h, i) => (
          <PostcardSkeleton key={i} height={h} />
        ))}
      </View>
      <View style={sk.pcCol}>
        {rightHeights.map((h, i) => (
          <PostcardSkeleton key={i} height={h} />
        ))}
      </View>
    </View>
  );
}

/** Ticket row skeleton */
export function TicketRowSkeleton() {
  return (
    <View style={sk.ticketRow}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={sk.ticketLines}>
        <Skeleton width="60%" height={13} borderRadius={6} />
        <Skeleton width="42%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={52} height={26} borderRadius={20} />
    </View>
  );
}

/** Profile header skeleton (avatar + name + stats) */
export function ProfileHeaderSkeleton() {
  return (
    <View style={sk.profileHeader}>
      {/* Avatar */}
      <Skeleton width={88} height={88} borderRadius={44} />
      {/* Name + username */}
      <Skeleton width={140} height={18} borderRadius={9} style={{ marginTop: 14 }} />
      <Skeleton width={90}  height={13} borderRadius={7} style={{ marginTop: 8 }} />
      {/* Stats row */}
      <View style={sk.statsRow}>
        <View style={sk.statItem}>
          <Skeleton width={32} height={20} borderRadius={6} />
          <Skeleton width={52} height={11} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <View style={sk.statDivider} />
        <View style={sk.statItem}>
          <Skeleton width={32} height={20} borderRadius={6} />
          <Skeleton width={64} height={11} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <View style={sk.statDivider} />
        <View style={sk.statItem}>
          <Skeleton width={32} height={20} borderRadius={6} />
          <Skeleton width={44} height={11} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Buttons */}
      <View style={sk.actionRow}>
        <Skeleton width={140} height={40} borderRadius={24} />
        <Skeleton width={40}  height={40} borderRadius={20} />
      </View>
    </View>
  );
}

/** Dashboard event list skeleton (shows 4 rows) */
export function DashboardEventsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={sk.dashRow}>
          <Skeleton width={64} height={64} borderRadius={12} />
          <View style={sk.dashLines}>
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

/** Audience card skeleton */
export function AudienceCardSkeleton() {
  return (
    <View style={sk.audCard}>
      <View style={sk.audHeader}>
        <Skeleton width={30} height={30} borderRadius={8} />
        <View style={{ flex: 1 }}>
          <Skeleton width="50%" height={12} borderRadius={6} />
          <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={80} height={22} borderRadius={20} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={sk.audBar}>
          <View style={sk.audBarLabel}>
            <Skeleton width="30%" height={11} borderRadius={5} />
            <Skeleton width="25%" height={10} borderRadius={5} />
          </View>
          <Skeleton width="100%" height={6} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  box: { backgroundColor: neutral[200] },

  // Event row
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  eventLines: { flex: 1, gap: 0 },

  // Postcard grid
  pcGrid: { flexDirection: 'row', gap: 8 },
  pcCol:  { flex: 1, gap: 8 },

  // Ticket row
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  ticketLines: { flex: 1 },

  // Profile header
  profileHeader: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 20 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  statItem:  { alignItems: 'center', width: 72 },
  statDivider: { width: 1, height: 32, backgroundColor: neutral[200], marginHorizontal: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },

  // Dashboard event
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  dashLines: { flex: 1 },

  // Audience card
  audCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 14,
    gap: 12,
  },
  audHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  audBar:    { gap: 0 },
  audBarLabel: { flexDirection: 'row', justifyContent: 'space-between' },
});

// ── Grid card skeletons (for index.tsx feed) ──────────────────────────────────

/** Mimics an EventCard in 2-col grid layout */
export function EventCardSkeleton() {
  return (
    <View style={card.wrap}>
      {/* Image area */}
      <Skeleton width="100%" height={140} borderRadius={0} />
      {/* Info */}
      <View style={card.info}>
        <Skeleton width="80%" height={13} borderRadius={6} />
        <Skeleton width="60%" height={10} borderRadius={5} style={{ marginTop: 7 }} />
        <Skeleton width="45%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
        <Skeleton width="55%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

/** Mimics a PostcardCard in 2-col grid layout */
export function PostcardCardSkeleton() {
  return (
    <View style={card.wrap}>
      {/* Image area */}
      <Skeleton width="100%" height={140} borderRadius={0} />
      {/* Info */}
      <View style={card.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width="50%" height={10} borderRadius={5} />
        </View>
        <Skeleton width="85%" height={10} borderRadius={5} style={{ marginTop: 7 }} />
        <Skeleton width="65%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

/** Full 2-column grid of card skeletons (8 cards) */
export function CardGridSkeleton({ type = 'event' }: { type?: 'event' | 'postcard' }) {
  return (
    <View style={card.grid}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={card.cell}>
          {type === 'event' ? <EventCardSkeleton /> : <PostcardCardSkeleton />}
        </View>
      ))}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: neutral[200],
    borderWidth: 1,
    borderColor: neutral[100],
  },
  info: { padding: 10, gap: 0 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  cell: { width: '47%' },
});

/** Single event card skeleton (for 2-col grid) */
export function EventCardSkeleton() {
  return (
    <View style={card.wrap}>
      {/* Image area */}
      <Skeleton width="100%" height={140} borderRadius={0} />
      {/* Info area */}
      <View style={card.info}>
        <Skeleton width="80%" height={12} borderRadius={6} />
        <Skeleton width="55%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
        <Skeleton width="60%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Postcard item skeleton (for a flat list or grid) */
export function PostcardItemSkeleton({ height = 200 }: { height?: number }) {
  return (
    <View style={pcard.wrap}>
      <Skeleton width="100%" height={height} borderRadius={12} />
      <View style={pcard.info}>
        <Skeleton width="70%" height={11} borderRadius={5} style={{ marginTop: 8 }} />
        <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** 2-col grid of event card skeletons */
export function EventCardGridSkeleton({ count = 4 }: { count?: number }) {
  const pairs = Array.from({ length: Math.ceil(count / 2) });
  return (
    <>
      {pairs.map((_, i) => (
        <View key={i} style={grid.row}>
          <View style={grid.cell}><EventCardSkeleton /></View>
          <View style={grid.cell}><EventCardSkeleton /></View>
        </View>
      ))}
    </>
  );
}

/** Hero skeleton for event detail screen */
export function EventDetailHeroSkeleton() {
  return <Skeleton width="100%" height={260} borderRadius={0} />;
}

/** Tab bar skeleton for event detail */
export function EventDetailTabSkeleton() {
  return (
    <View style={detailTab.wrap}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width={64} height={14} borderRadius={7} />
      ))}
    </View>
  );
}

/** Content block skeleton used inside event detail tabs */
export function EventDetailContentSkeleton() {
  return (
    <View style={detailContent.wrap}>
      <Skeleton width="60%"  height={18} borderRadius={9}  />
      <Skeleton width="100%" height={12} borderRadius={6}  style={{ marginTop: 16 }} />
      <Skeleton width="90%"  height={12} borderRadius={6}  style={{ marginTop: 8  }} />
      <Skeleton width="80%"  height={12} borderRadius={6}  style={{ marginTop: 8  }} />
      <Skeleton width="55%"  height={12} borderRadius={6}  style={{ marginTop: 8  }} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 20 }} />
      <Skeleton width="70%"  height={14} borderRadius={7}  style={{ marginTop: 20 }} />
      <Skeleton width="100%" height={12} borderRadius={6}  style={{ marginTop: 8  }} />
      <Skeleton width="85%"  height={12} borderRadius={6}  style={{ marginTop: 8  }} />
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[100],
  },
  info: { padding: 10 },
});

const pcard = StyleSheet.create({
  wrap: { flex: 1 },
  info: { paddingHorizontal: 4 },
});

const grid = StyleSheet.create({
  row:  { flexDirection: 'row', paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  cell: { flex: 1 },
});

const detailTab = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    backgroundColor: '#fff',
  },
});

const detailContent = StyleSheet.create({
  wrap: { padding: 16 },
});
