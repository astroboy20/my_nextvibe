import { AppHeader } from "@/components/navigation/TopNavBar";
import {
    EventRowSkeleton,
    PostcardGridSkeleton,
    ProfileHeaderSkeleton,
    TicketRowSkeleton,
} from "@/components/ui/Skeleton";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useGetMeQuery,
    useGetOrganizerEventsQuery,
    useGetUserActivityQuery,
    type OrganizerEvent,
    type PostcardItem,
    type UserTicket,
} from "@/store/api/usersApi";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "events", label: "Events", icon: "calendar-outline" as const },
  { id: "postcards", label: "Postcards", icon: "images-outline" as const },
  { id: "tickets", label: "Ticket", icon: "ticket-outline" as const },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  uri,
  name,
  size = 80,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name?.charAt(0)?.toUpperCase() || "U";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
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
    status === "PUBLISHED"
      ? semantic.success
      : status === "DRAFT"
      ? semantic.warning
      : neutral[400];
  const bg =
    status === "PUBLISHED"
      ? `${semantic.success}18`
      : status === "DRAFT"
      ? `${semantic.warning}18`
      : neutral[100];
  return (
    <View style={[badge.pill, { backgroundColor: bg }]}>
      <Text style={[badge.text, { color }]}>{status}</Text>
    </View>
  );
}

function EventRow({ item }: { item: OrganizerEvent }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={ev.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/events/${item.id}` as any)}
    >
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
          <Text style={ev.name} numberOfLines={1}>
            {item.name}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={ev.meta}>
          <Ionicons name="calendar-outline" size={11} color={neutral[500]} />
          <Text style={ev.metaText}>
            {new Date(item.startsAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
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

function PostcardGrid({ items }: { items: PostcardItem[] }) {
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 !== 0);
  const heights = [180, 240, 160, 210, 190, 230];

  const renderCard = (item: PostcardItem, idx: number) => {
    const h = heights[idx % heights.length];
    return (
      <TouchableOpacity
        key={item.id}
        style={[pc.card, { height: h }]}
        activeOpacity={0.85}
      >
        <View style={[pc.imgArea, { height: h }]}>
          {item.mediaUrl ? (
            <Image
              source={{ uri: item.mediaUrl }}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View style={pc.imgFallback}>
              <Ionicons name="image-outline" size={28} color={neutral[300]} />
            </View>
          )}
          <View style={pc.overlay}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={pc.likeText}>{item.likeCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={pc.grid}>
      <View style={pc.col}>
        {left.map((item, i) => renderCard(item, i * 2))}
      </View>
      <View style={pc.col}>
        {right.map((item, i) => renderCard(item, i * 2 + 1))}
      </View>
    </View>
  );
}

function TicketRow({ item }: { item: UserTicket }) {
  const isActive = item.status === "active";
  return (
    <View style={tk.row}>
      <View style={tk.icon}>
        <Ionicons name="ticket-outline" size={22} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tk.name}>{item.eventName}</Text>
        <Text style={tk.meta}>
          {item.ticketType} ·{" "}
          {new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {item.ticketNumber && (
          <Text style={tk.number}>#{item.ticketNumber}</Text>
        )}
      </View>
      <View
        style={[
          tk.badge,
          {
            backgroundColor: isActive ? `${semantic.success}18` : neutral[100],
          },
        ]}
      >
        <Text
          style={[
            tk.badgeText,
            { color: isActive ? semantic.success : neutral[400] },
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  message: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={40} color={neutral[200]} />
      <Text style={styles.empty}>{message}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("events");

  // ── API ────────────────────────────────────────────────────────────────────
  const {
    data: meData,
    isLoading: meLoading,
    refetch: refetchMe,
  } = useGetMeQuery();

  const user = meData?.data;
  const userId = user?.id ?? "";

  const {
    data: activityData,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useGetUserActivityQuery(userId, { skip: !userId });

  const {
    data: eventsData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useGetOrganizerEventsQuery(
    { organizerId: userId, page: 1, limit: 20 },
    { skip: !userId }
  );

  // const {
  //   data: postcardsData,
  //   isLoading: postcardsLoading,
  //   refetch: refetchPostcards,
  // } = useGetUserPostcardsQuery(
  //   { userId, page: 1, limit: 20 },
  //   { skip: !userId }
  // );

  // const {
  //   data: ticketsData,
  //   isLoading: ticketsLoading,
  //   refetch: refetchTickets,
  // } = useGetMyTicketsQuery();

  // ── Derived ────────────────────────────────────────────────────────────────
  const activity = activityData?.data;
  const events = eventsData?.data?.data ?? [];
  const postcards = activityData?.data?.postcards ?? [];
  const tickets = activityData?.data?.tickets ?? [];

  // Header skeleton: only on true first load (no cached data yet)
  const activityStarted = !!userId; // becomes true once fired
  const headerLoading =
    meLoading || (activityStarted && activityLoading && !activityData);

  // Per-tab skeleton: only when data has never been fetched for that tab
  const isTabLoading =
    (activeTab === "events" && eventsLoading && !eventsData) ||
    (activeTab === "postcards" && activityLoading && !activityData) ||
    (activeTab === "tickets" && activityLoading && !activityData);

  // Pull-to-refresh indicator: only when re-fetching data that already exists
  const isRefreshing =
    (meLoading && !!meData) ||
    (activityLoading && !!activityData) ||
    (activeTab === "events" && eventsLoading && !!eventsData);

  const handleRefresh = () => {
    refetchMe();
    refetchActivity();
    refetchEvents();
  };

  // Re-fetch every time this tab comes into focus — ensures fresh data after
  // login, logout+login with a different account, or returning from another screen.
  useFocusEffect(
    useCallback(() => {
      refetchMe();
    }, [refetchMe])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" backgroundColor="#fff" />
      <AppHeader notificationCount={2} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={brand.primary}
          />
        }
      >
        {/* ── Header ── */}
        {headerLoading ? (
          <ProfileHeaderSkeleton />
        ) : (
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              <Avatar
                uri={user?.avatarUrl}
                name={user?.displayName ?? "U"}
                size={88}
              />
              <View style={styles.avatarRing} />
            </View>

            <Text style={styles.displayName}>{user?.displayName ?? "—"}</Text>
            <Text style={styles.username}>@{user?.username ?? "—"}</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatItem
                value={eventsData?.data?.meta?.total ?? events.length ?? 0}
                label="Events"
              />
              <View style={styles.statDivider} />
              <StatItem
                value={activity?.postcardsCount ?? 0}
                label="Postcards"
              />
              <View style={styles.statDivider} />
              <StatItem value={tickets?.length ?? 0} label="Tickets" />
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push("/edit-profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => router.push("/settings")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={brand.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Dashboard quick-link ── */}
        <TouchableOpacity
          style={styles.dashCard}
          onPress={() => router.push("/dashboard" as any)}
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
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {/* ── Events ── */}
          {activeTab === "events" &&
            (isTabLoading ? (
              [0, 1, 2, 3].map((i) => <EventRowSkeleton key={i} />)
            ) : events.length > 0 ? (
              events?.map((e: any) => <EventRow key={e.id} item={e} />)
            ) : (
              <EmptyState icon="calendar-outline" message="No events yet" />
            ))}

          {/* ── Postcards ── */}
          {activeTab === "postcards" &&
            (isTabLoading ? (
              <PostcardGridSkeleton />
            ) : postcards.length > 0 ? (
              <PostcardGrid items={postcards} />
            ) : (
              <EmptyState icon="images-outline" message="No postcards yet" />
            ))}

          {/* ── Tickets ── */}
          {activeTab === "tickets" &&
            (isTabLoading ? (
              [0, 1, 2].map((i) => <TicketRowSkeleton key={i} />)
            ) : tickets.length > 0 ? (
              tickets.map((t: any) => <TicketRow key={t.id} item={t} />)
            ) : (
              <EmptyState icon="ticket-outline" message="No tickets yet" />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40, backgroundColor: "#fff" },

  header: {
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatarRing: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: `${brand.primary}30`,
  },
  displayName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: neutral[900],
  },
  username: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: neutral[200],
    marginHorizontal: 24,
  },

  actionsRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  editBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: brand.primary,
  },
  editBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${brand.primary}40`,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${brand.primary}08`,
  },

  dashCard: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  dashTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  dashSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginTop: 1,
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  tabLabelActive: { color: brand.primary },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: brand.primary,
    borderRadius: 2,
  },

  tabContent: { paddingHorizontal: 16, paddingTop: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10 },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: "center",
  },
});

const av = StyleSheet.create({
  circle: {
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fontFamily.bold, color: "#fff" },
});

const stat = StyleSheet.create({
  item: { alignItems: "center", flex: 1 },
  value: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
    color: neutral[900],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginTop: 2,
  },
});

const badge = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

const ev = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  thumb: { width: 60, height: 60, borderRadius: 12, overflow: "hidden" },
  thumbImg: { width: 60, height: 60 },
  thumbFallback: {
    backgroundColor: `${brand.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    flex: 1,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
  },
});

const pc = StyleSheet.create({
  grid: { flexDirection: "row", gap: 8 },
  col: { flex: 1, gap: 8 },
  card: { borderRadius: 12, overflow: "hidden" },
  imgArea: {
    borderRadius: 12,
    backgroundColor: neutral[100],
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imgFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  likeText: { fontFamily: fontFamily.semibold, fontSize: 11, color: "#fff" },
});

const tk = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${brand.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: neutral[500],
    marginTop: 2,
  },
  number: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
    marginTop: 2,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: 11 },
});
