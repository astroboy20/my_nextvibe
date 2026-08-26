/**
 * analytics.tsx — Event Analytics Screen (React Native)
 *
 * Tabbed analytics dashboard for an event organiser.
 *
 * Tabs:  Summary · Revenue · Social · Games · Postcards
 *
 * API endpoints (per Analytics Frontend Guide):
 *   GET /analytics/events/:id              → EventSummaryTab
 *   GET /analytics/events/:id/revenue      → RevenueTab
 *   GET /analytics/events/:id/social       → SocialTab
 *   GET /analytics/events/:id/games        → GamesTab
 *   GET /analytics/events/:id/postcards    → PostcardsTab
 *   GET /analytics/events/:id/vibetags     → VibeTagsTab (inside PostcardsTab)
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
  useGetEventAnalyticsQuery,
  useGetEventGameAnalyticsQuery,
  useGetEventPostcardAnalyticsQuery,
  useGetEventRevenueAnalyticsQuery,
  useGetEventSocialAnalyticsQuery,
  useGetEventVibeTagAnalyticsQuery,
} from '@/store/api/analyticsApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const BRAND = brand.primary;

function fmt(n?: number | null) {
  return n == null ? '0' : n.toLocaleString();
}

function fmtMoney(kobo?: number | null) {
  if (!kobo) return '₦0';
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000)     return `₦${(naira / 1_000).toFixed(1)}K`;
  return `₦${naira.toLocaleString()}`;
}

function fmtPct(n?: number | null) {
  return `${(n ?? 0).toFixed(1)}%`;
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────

function KPICard({
  label, value, sub, iconName, color = BRAND,
}: {
  label: string; value: string; sub?: string;
  iconName: React.ComponentProps<typeof Ionicons>['name']; color?: string;
}) {
  return (
    <View style={kpi.card}>
      <View style={[kpi.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={iconName} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={kpi.label} numberOfLines={1}>{label}</Text>
        <Text style={[kpi.value, { color }]}>{value}</Text>
        {sub && <Text style={kpi.sub}>{sub}</Text>}
      </View>
    </View>
  );
}

const kpi = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: neutral[200], backgroundColor: neutral[0], flex: 1 },
  iconWrap:{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label:   { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },
  value:   { fontFamily: fontFamily.extrabold, fontSize: fontSize.lg, lineHeight: 26 },
  sub:     { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400], marginTop: 1 },
});

function KPIGrid({ children }: { children: React.ReactNode }) {
  return <View style={kg.grid}>{children}</View>;
}

const kg = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sc.card}>
      <Text style={sc.title}>{title}</Text>
      {children}
    </View>
  );
}

const sc = StyleSheet.create({
  card:  { borderRadius: 16, borderWidth: 1, borderColor: neutral[200], backgroundColor: neutral[0], padding: 16, gap: 12 },
  title: { fontFamily: fontFamily.bold, fontSize: 12, color: neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },
});

function ProgressBar({ value, max, color = BRAND }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: neutral[100], overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3 },
});

function BarRow({ label, value, max, color = BRAND, valueFmt }: {
  label: string; value: number; max: number; color?: string; valueFmt?: string;
}) {
  return (
    <View style={br.row}>
      <Text style={br.label} numberOfLines={1}>{label}</Text>
      <View style={br.barWrap}>
        <ProgressBar value={value} max={max} color={color} />
      </View>
      <Text style={br.value}>{valueFmt ?? fmt(value)}</Text>
    </View>
  );
}

const br = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label:  { fontFamily: fontFamily.regular, fontSize: 12, color: neutral[600], width: 90 },
  barWrap:{ flex: 1 },
  value:  { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[700], width: 56, textAlign: 'right' },
});

function SectionLoading() {
  return (
    <View style={sl.wrap}>
      {[1, 2, 3, 4].map((i) => <View key={i} style={sl.bone} />)}
    </View>
  );
}

const sl = StyleSheet.create({
  wrap: { gap: 10 },
  bone: { height: 60, borderRadius: 14, backgroundColor: neutral[100] },
});

function SectionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={se.wrap}>
      <Ionicons name="alert-circle-outline" size={28} color={neutral[300]} />
      <Text style={se.text}>Could not load data</Text>
      {onRetry && (
        <TouchableOpacity style={se.btn} onPress={onRetry} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={14} color={BRAND} />
          <Text style={se.btnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const se = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: 28, gap: 8 },
  text:    { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: `${BRAND}40` },
  btnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: BRAND },
});

function Empty({ icon, message }: { icon: React.ComponentProps<typeof Ionicons>['name']; message: string }) {
  return (
    <View style={em.wrap}>
      <View style={em.iconWrap}><Ionicons name={icon} size={24} color={neutral[300]} /></View>
      <Text style={em.text}>{message}</Text>
    </View>
  );
}

const em = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: 28, gap: 8 },
  iconWrap:{ width: 48, height: 48, borderRadius: 24, backgroundColor: neutral[100], alignItems: 'center', justifyContent: 'center' },
  text:    { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center', maxWidth: 240 },
});

// ─── Tab 1: Summary ────────────────────────────────────────────────────────────

function SummaryTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useGetEventAnalyticsQuery(eventId);

  if (isLoading) return <SectionLoading />;
  if (isError)   return <SectionError onRetry={refetch} />;

  const d: any = data?.data ?? {};
  const rsvpTotal     = d.rsvps?.total      ?? 0;
  const checkinTotal  = d.checkIns?.total   ?? 0;
  const checkinRate   = d.checkIns?.rate    ?? 0;
  const ticketsSold   = d.ticketsSold       ?? 0;
  const postcardTotal = d.postcards?.total  ?? 0;
  const revenue       = d.revenue?.total    ?? 0;
  const sessions: any[] = Array.isArray(d.gameSessions) ? d.gameSessions : [];
  const activeGames   = sessions.filter((g) => g.status === 'ACTIVE').length;
  const tierData: any[] = d.rsvps?.byTier ?? [];

  return (
    <View style={tab.wrap}>
      {/* KPI grid */}
      <KPIGrid>
        <View style={{ width: '47%' }}><KPICard label="Total RSVPs"   value={fmt(rsvpTotal)}    iconName="people-outline"     color={BRAND}            /></View>
        <View style={{ width: '47%' }}><KPICard label="Check-ins"     value={fmt(checkinTotal)} iconName="checkmark-done-outline" color="#2563eb" sub={`${fmtPct(checkinRate)} rate`} /></View>
        <View style={{ width: '47%' }}><KPICard label="Tickets Sold"  value={fmt(ticketsSold)}  iconName="ticket-outline"      color="#9333ea"          /></View>
        <View style={{ width: '47%' }}><KPICard label="Revenue"       value={fmtMoney(revenue)} iconName="cash-outline"        color={semantic.success} /></View>
        <View style={{ width: '47%' }}><KPICard label="Game Sessions" value={fmt(sessions.length)} iconName="game-controller-outline" color="#ea580c" sub={`${activeGames} active`} /></View>
        <View style={{ width: '47%' }}><KPICard label="Postcards"     value={fmt(postcardTotal)} iconName="images-outline"     color="#0891b2"          /></View>
      </KPIGrid>

      {/* RSVP → Checkin conversion */}
      {rsvpTotal > 0 && (
        <SectionCard title="RSVP → Check-in Conversion">
          <View style={tab.convRow}>
            <Text style={tab.convRate}>{fmtPct(checkinRate)}</Text>
            <Text style={tab.convSub}>{fmt(checkinTotal)} checked in of {fmt(rsvpTotal)} RSVPs</Text>
          </View>
          <ProgressBar value={checkinTotal} max={rsvpTotal} />
        </SectionCard>
      )}

      {/* RSVPs by ticket tier */}
      {tierData.length > 0 && (
        <SectionCard title="RSVPs by Ticket Tier">
          {tierData.map((t: any) => (
            <BarRow key={t.tierId} label={t.tierName} value={t.count}
              max={Math.max(...tierData.map((x: any) => x.count))} />
          ))}
        </SectionCard>
      )}

      {/* Game sessions list */}
      {sessions.length > 0 && (
        <SectionCard title="Game Sessions">
          {sessions.map((g: any) => (
            <View key={g.id} style={tab.sessionRow}>
              <View style={[tab.statusDot, { backgroundColor: g.status === 'ACTIVE' ? semantic.success : neutral[300] }]} />
              <Text style={tab.sessionTitle} numberOfLines={1}>{g.title}</Text>
              <Text style={tab.sessionPlayers}>{fmt(g.participantCount)} players</Text>
              <View style={[tab.statusPill, { backgroundColor: g.status === 'ACTIVE' ? `${semantic.success}15` : neutral[100] }]}>
                <Text style={[tab.statusPillText, { color: g.status === 'ACTIVE' ? semantic.success : neutral[400] }]}>
                  {g.status}
                </Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}
    </View>
  );
}

// ─── Tab 2: Revenue ────────────────────────────────────────────────────────────

function RevenueTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useGetEventRevenueAnalyticsQuery(eventId);

  if (isLoading) return <SectionLoading />;
  if (isError)   return <SectionError onRetry={refetch} />;

  const d: any = data?.data ?? {};
  const totalRevenue       = d.totalRevenue       ?? 0;
  const completedPurchases = d.completedPurchases ?? 0;
  const refundCount        = d.refundCount        ?? 0;
  const byStatus: any[]    = d.byStatus           ?? [];
  const byTier: any[]      = d.byTier             ?? [];

  if (!totalRevenue && !completedPurchases && !byStatus.length)
    return <Empty icon="cash-outline" message="No revenue data yet. Appears once tickets are purchased." />;

  const maxTierRevenue = Math.max(...byTier.map((t: any) => t.revenue ?? 0), 1);
  const maxStatusCount = Math.max(...byStatus.map((s: any) => s.count ?? 0), 1);

  return (
    <View style={tab.wrap}>
      <KPIGrid>
        <View style={{ width: '47%' }}><KPICard label="Total Revenue"   value={fmtMoney(totalRevenue)}    iconName="cash-outline"        color={semantic.success} /></View>
        <View style={{ width: '47%' }}><KPICard label="Completed Sales" value={fmt(completedPurchases)}  iconName="trending-up-outline" color={BRAND}            /></View>
        <View style={{ width: '47%' }}><KPICard label="Refunds"         value={fmt(refundCount)}          iconName="refresh-outline"     color={semantic.error}   /></View>
        <View style={{ width: '47%' }}><KPICard
          label="Avg per Sale"
          value={completedPurchases > 0 ? fmtMoney(Math.round(totalRevenue / completedPurchases)) : '—'}
          iconName="calculator-outline" color="#9333ea" /></View>
      </KPIGrid>

      {byTier.length > 0 && (
        <SectionCard title="Revenue by Ticket Tier">
          {byTier.map((t: any) => (
            <View key={t.tierName} style={tab.tierRow}>
              <BarRow
                label={t.tierName ?? 'Tier'}
                value={t.revenue ?? 0}
                max={maxTierRevenue}
                color={BRAND}
                valueFmt={fmtMoney(t.revenue)}
              />
              <Text style={tab.tierSub}>{fmt(t.sold)} sold</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {byStatus.length > 0 && (
        <SectionCard title="Transactions by Status">
          {byStatus.map((s: any, i: number) => (
            <BarRow
              key={i}
              label={s.status ?? `Status ${i + 1}`}
              value={s.count ?? 0}
              max={maxStatusCount}
              color={s.status === 'COMPLETED' ? semantic.success : s.status === 'REFUNDED' ? semantic.error : neutral[500]}
            />
          ))}
        </SectionCard>
      )}
    </View>
  );
}

// ─── Tab 3: Social ─────────────────────────────────────────────────────────────

function SocialTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useGetEventSocialAnalyticsQuery(eventId);

  if (isLoading) return <SectionLoading />;
  if (isError)   return <SectionError onRetry={refetch} />;

  const d: any = data?.data ?? {};
  const eventLikes    = d.event?.likes    ?? 0;
  const eventShares   = d.event?.shares   ?? 0;
  const eventComments = d.event?.comments ?? 0;
  const pcTotal       = d.postcards?.totalPostcards      ?? 0;
  const pcLikes       = d.postcards?.totalLikes          ?? 0;
  const pcShares      = d.postcards?.totalShares         ?? 0;
  const pcComments    = d.postcards?.totalComments       ?? 0;
  const pcAvgLikes    = d.postcards?.avgLikesPerPostcard ?? 0;
  const totalLikes    = d.combined?.totalLikes    ?? (eventLikes    + pcLikes);
  const totalShares   = d.combined?.totalShares   ?? (eventShares   + pcShares);
  const totalComments = d.combined?.totalComments ?? (eventComments + pcComments);

  if (!pcTotal && !totalLikes && !totalShares && !totalComments)
    return <Empty icon="share-social-outline" message="No social activity yet. Interactions appear as attendees engage." />;

  const maxCombined = Math.max(totalLikes, totalShares, totalComments, 1);

  return (
    <View style={tab.wrap}>
      {/* Combined KPIs */}
      <KPIGrid>
        <View style={{ width: '30%' }}><KPICard label="Likes"    value={fmt(totalLikes)}    iconName="heart-outline"         color="#e11d48" /></View>
        <View style={{ width: '30%' }}><KPICard label="Shares"   value={fmt(totalShares)}   iconName="share-social-outline"  color="#9333ea" /></View>
        <View style={{ width: '30%' }}><KPICard label="Comments" value={fmt(totalComments)} iconName="chatbubble-outline"    color="#0284c7" /></View>
      </KPIGrid>

      {/* Engagement mix */}
      <SectionCard title="Engagement Mix">
        <BarRow label="Likes"    value={totalLikes}    max={maxCombined} color="#e11d48" />
        <BarRow label="Shares"   value={totalShares}   max={maxCombined} color="#9333ea" />
        <BarRow label="Comments" value={totalComments} max={maxCombined} color="#0284c7" />
      </SectionCard>

      {/* Event vs Postcards */}
      <SectionCard title="Event vs Postcard Breakdown">
        <View style={tab.compareHeader}>
          <Text style={tab.compareCol}>Event</Text>
          <Text style={tab.compareCol}>Postcards</Text>
        </View>
        {[
          { label: 'Likes',    ev: eventLikes,    pc: pcLikes    },
          { label: 'Shares',   ev: eventShares,   pc: pcShares   },
          { label: 'Comments', ev: eventComments, pc: pcComments },
        ].map((row) => (
          <View key={row.label} style={tab.compareRow}>
            <Text style={tab.compareLabel}>{row.label}</Text>
            <Text style={tab.compareVal}>{fmt(row.ev)}</Text>
            <Text style={tab.compareVal}>{fmt(row.pc)}</Text>
          </View>
        ))}
        {pcTotal > 0 && (
          <View style={tab.compareRow}>
            <Text style={tab.compareLabel}>Avg Likes/Post</Text>
            <Text style={tab.compareVal}>—</Text>
            <Text style={tab.compareVal}>{pcAvgLikes.toFixed(1)}</Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
}

// ─── Tab 4: Games ──────────────────────────────────────────────────────────────

function GamesTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useGetEventGameAnalyticsQuery(eventId);

  if (isLoading) return <SectionLoading />;
  if (isError)   return <SectionError onRetry={refetch} />;

  const d: any = data?.data ?? {};
  const totalSessions  = d.totalSessions  ?? 0;
  const totalPlayers   = d.totalPlayers   ?? 0;
  const totalWinners   = d.totalWinners   ?? 0;
  const engagementRate = d.engagementRate ?? 0;
  const sessions: any[] = Array.isArray(d.sessions) ? d.sessions : [];
  const winners: any[]  = Array.isArray(d.winners)  ? d.winners  : [];

  if (!totalSessions)
    return <Empty icon="game-controller-outline" message="No game sessions have been run for this event yet." />;

  const rankedWinners = [...winners].sort((a, b) => (a.reward?.rank ?? 0) - (b.reward?.rank ?? 0));
  const medals = ['🥇', '🥈', '🥉'];

  const statusColor: Record<string, string> = {
    ACTIVE:  semantic.success,
    PENDING: semantic.warning,
    ENDED:   neutral[400],
  };

  const fmtReward = (reward: any) => {
    if (!reward) return '';
    if (reward.type === 'CASH') {
      const n = Number(reward.value);
      return `₦${Number.isFinite(n) ? n.toLocaleString() : reward.value}`;
    }
    return reward.value ?? '';
  };

  return (
    <View style={tab.wrap}>
      <KPIGrid>
        <View style={{ width: '47%' }}><KPICard label="Sessions"   value={fmt(totalSessions)}     iconName="game-controller-outline" color="#ea580c" /></View>
        <View style={{ width: '47%' }}><KPICard label="Players"    value={fmt(totalPlayers)}      iconName="people-outline"          color={BRAND}   /></View>
        <View style={{ width: '47%' }}><KPICard label="Winners"    value={fmt(totalWinners)}      iconName="trophy-outline"          color="#f59e0b" /></View>
        <View style={{ width: '47%' }}><KPICard label="Engagement" value={fmtPct(engagementRate)} iconName="trending-up-outline"    color={semantic.success} sub="of RSVPs played" /></View>
      </KPIGrid>

      {sessions.length > 0 && (
        <SectionCard title="Sessions">
          {sessions.map((s: any) => (
            <View key={s.id} style={tab.sessionRow}>
              <View style={[tab.statusDot, { backgroundColor: statusColor[s.status] ?? neutral[300] }]} />
              <Text style={tab.sessionTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={tab.sessionPlayers}>{fmt(s.playerCount)} players</Text>
              <View style={[tab.statusPill, { backgroundColor: `${statusColor[s.status] ?? neutral[300]}18` }]}>
                <Text style={[tab.statusPillText, { color: statusColor[s.status] ?? neutral[400] }]}>{s.status}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {rankedWinners.length > 0 && (
        <SectionCard title="Winners">
          {rankedWinners.map((w: any, i: number) => {
            const rank = w.reward?.rank ?? i + 1;
            const name = w.user?.displayName ?? w.user?.username ?? 'Unknown';
            const statusColor2: Record<string, string> = {
              FULFILLED: semantic.success,
              REJECTED:  semantic.error,
              WON:       '#f59e0b',
              CLAIMED:   '#0284c7',
              APPROVED:  semantic.success,
            };
            const statusLabel: Record<string, string> = {
              WON: 'Unclaimed', CLAIMED: 'In review', APPROVED: 'Approved',
              FULFILLED: 'Received', REJECTED: 'Declined',
            };
            return (
              <View key={w.rewardId ?? i} style={tab.winnerRow}>
                <Text style={tab.medal}>{medals[rank - 1] ?? `#${rank}`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={tab.winnerName} numberOfLines={1}>{name}</Text>
                  <Text style={tab.winnerSession} numberOfLines={1}>
                    {w.session?.title ?? ''}
                    {w.reward?.title ? ` · ${w.reward.title}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[tab.rewardVal, { color: BRAND }]}>{fmtReward(w.reward)}</Text>
                  <Text style={[tab.rewardStatus, { color: statusColor2[w.status] ?? neutral[400] }]}>
                    {statusLabel[w.status] ?? w.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}
    </View>
  );
}

// ─── Tab 5: Postcards ──────────────────────────────────────────────────────────

function PostcardsTab({ eventId }: { eventId: string }) {
  const { data: pcData, isLoading: pcLoading, isError: pcError, refetch: pcRefetch } =
    useGetEventPostcardAnalyticsQuery(eventId);
  const { data: vtData, isLoading: vtLoading } =
    useGetEventVibeTagAnalyticsQuery(eventId);

  if (pcLoading || vtLoading) return <SectionLoading />;
  if (pcError) return <SectionError onRetry={pcRefetch} />;

  const d: any = pcData?.data ?? {};
  const total        = d.total ?? 0;
  const byVibeTag: any[]   = d.byVibeTag   ?? [];
  const topPostcards: any[] = d.topPostcards ?? [];
  const byVis = d.byVisibility ?? {};

  const vibeTags: any[] = vtData?.data?.vibeTags ?? [];

  if (!total)
    return <Empty icon="images-outline" message="No postcards created for this event yet." />;

  const maxVT = Math.max(...byVibeTag.map((v: any) => v.count), 1);

  return (
    <View style={tab.wrap}>
      {/* KPI */}
      <KPIGrid>
        <View style={{ width: '47%' }}><KPICard label="Total Postcards" value={fmt(total)} iconName="images-outline" color="#0891b2" /></View>
        {Object.entries(byVis).slice(0, 1).map(([k, v]) => (
          <View key={k} style={{ width: '47%' }}>
            <KPICard label={k} value={fmt(v as number)} iconName="eye-outline" color={BRAND} />
          </View>
        ))}
      </KPIGrid>

      {/* By vibe tag */}
      {byVibeTag.length > 0 && (
        <SectionCard title="Postcards by Vibe Tag">
          {byVibeTag.map((v: any) => (
            <BarRow key={v.tagName} label={v.tagName} value={v.count} max={maxVT} color="#0891b2" />
          ))}
        </SectionCard>
      )}

      {/* Vibe tag engagement */}
      {vibeTags.length > 0 && (
        <SectionCard title="Vibe Tag Engagement">
          {vibeTags.map((vt: any) => (
            <View key={vt.id} style={tab.vtRow}>
              {vt.imageUrl ? (
                <Image source={{ uri: vt.imageUrl }} style={tab.vtImg} />
              ) : (
                <View style={tab.vtImgPlaceholder}>
                  <Ionicons name="pricetag-outline" size={14} color={neutral[400]} />
                </View>
              )}
              <Text style={tab.vtName} numberOfLines={1}>{vt.name}</Text>
              <View style={tab.vtStats}>
                <Text style={tab.vtStat}>{fmt(vt.totalPostcards)} posts</Text>
                <Text style={tab.vtStat}>{fmt(vt.totalLikes)} likes</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Top postcards */}
      {topPostcards.length > 0 && (
        <SectionCard title="Top Postcards">
          {topPostcards.slice(0, 10).map((p: any, i: number) => (
            <View key={p.id} style={tab.topPostRow}>
              <Text style={tab.topPostRank}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={tab.topPostAuthor} numberOfLines={1}>
                  {p.author?.displayName ?? p.author?.username ?? 'Unknown'}
                </Text>
                {p.caption && <Text style={tab.topPostCaption} numberOfLines={1}>{p.caption}</Text>}
              </View>
              <View style={tab.topPostLikes}>
                <Ionicons name="heart" size={12} color="#e11d48" />
                <Text style={tab.topPostLikeCount}>{fmt(p.likeCount)}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}
    </View>
  );
}

// ─── Shared tab styles ─────────────────────────────────────────────────────────

const tab = StyleSheet.create({
  wrap:        { gap: 14 },
  convRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  convRate:    { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl, color: BRAND },
  convSub:     { fontFamily: fontFamily.regular, fontSize: 12, color: neutral[500] },
  sessionRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  sessionTitle:{ flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[800] },
  sessionPlayers:{ fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  statusPill:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontFamily: fontFamily.semibold, fontSize: 10 },
  tierRow:     { gap: 3 },
  tierSub:     { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400], paddingLeft: 100 },
  compareHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: neutral[200] },
  compareCol:    { flex: 1, fontFamily: fontFamily.bold, fontSize: 11, color: neutral[500], textAlign: 'right' },
  compareRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  compareLabel:{ flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: neutral[600] },
  compareVal:  { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[700], textAlign: 'right' },
  winnerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100] },
  medal:       { fontSize: 20, width: 28 },
  winnerName:  { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[800] },
  winnerSession:{ fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginTop: 2 },
  rewardVal:   { fontFamily: fontFamily.bold, fontSize: 13 },
  rewardStatus:{ fontFamily: fontFamily.regular, fontSize: 10, marginTop: 2 },
  vtRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vtImg:       { width: 32, height: 32, borderRadius: 8 },
  vtImgPlaceholder: { width: 32, height: 32, borderRadius: 8, backgroundColor: neutral[100], alignItems: 'center', justifyContent: 'center' },
  vtName:      { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[800] },
  vtStats:     { alignItems: 'flex-end' },
  vtStat:      { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400] },
  topPostRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  topPostRank: { fontFamily: fontFamily.bold, fontSize: 12, color: neutral[400], width: 26 },
  topPostAuthor: { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[800] },
  topPostCaption:{ fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginTop: 2 },
  topPostLikes:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topPostLikeCount: { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[600] },
});

// ─── Tab bar ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'summary',   label: 'Summary',   icon: 'bar-chart-outline'          },
  { key: 'revenue',   label: 'Revenue',   icon: 'cash-outline'               },
  { key: 'social',    label: 'Social',    icon: 'share-social-outline'       },
  { key: 'games',     label: 'Games',     icon: 'game-controller-outline'    },
  { key: 'postcards', label: 'Postcards', icon: 'images-outline'             },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  // For RefreshControl — we just refetch the active tab's query
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'summary':   return <SummaryTab   eventId={eventId} />;
      case 'revenue':   return <RevenueTab   eventId={eventId} />;
      case 'social':    return <SocialTab    eventId={eventId} />;
      case 'games':     return <GamesTab     eventId={eventId} />;
      case 'postcards': return <PostcardsTab eventId={eventId} />;
    }
  };

  return (
    <SafeAreaView style={scr.safe} edges={['top']}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={scr.backBtn}>
          <Ionicons name="arrow-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={scr.title}>Event Analytics</Text>
          <Text style={scr.subtitle}>Full performance overview</Text>
        </View>
        <View style={scr.iconBadge}>
          <Ionicons name="analytics-outline" size={20} color={BRAND} />
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={scr.tabBar}
        style={scr.tabBarWrap}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[scr.tabBtn, active && scr.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t.icon as any}
                size={15}
                color={active ? '#fff' : neutral[500]}
              />
              <Text style={[scr.tabBtnText, active && scr.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={scr.scroll}
        contentContainerStyle={scr.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND}
          />
        }
      >
        {renderTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: neutral[50] },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: neutral[0], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: neutral[100], alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: neutral[800] },
  subtitle:{ fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400], marginTop: 1 },
  iconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${BRAND}12`, alignItems: 'center', justifyContent: 'center' },
  tabBarWrap: { backgroundColor: neutral[0], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  tabBar:  { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  tabBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: neutral[200], backgroundColor: neutral[0] },
  tabBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  tabBtnText: { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[500] },
  tabBtnTextActive: { color: '#fff' },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
});

