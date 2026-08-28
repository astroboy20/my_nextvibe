/**
 * app/notifications.tsx
 *
 * In-app notification centre.
 * Data from GET /v1/notifications — RTK Query cache, 1-minute TTL.
 * Marks individual notifications read on tap (PATCH /v1/notifications/:id/read).
 * "Mark all read" button hits PATCH /v1/notifications/read-all.
 *
 * Per MOBILE-INTEGRATION.md §2:
 *   - Route on data.targetType + data.targetId, never by parsing body text
 *   - unreadCount comes from meta.unreadCount (don't count client-side)
 */

import { AppHeader } from "@/components/navigation/TopNavBar";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    type Notification,
    useGetNotificationsQuery,
    useMarkAllReadMutation,
    useMarkOneReadMutation,
} from "@/store/api/notificationApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Icon + colour per notification type ────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TYPE_META: Record<string, { icon: IoniconName; color: string }> = {
  FOLLOW:            { icon: "person-add-outline",       color: brand.primary   },
  LIKE:              { icon: "heart-outline",             color: "#e11d48"       },
  COMMENT:           { icon: "chatbubble-outline",        color: "#0284c7"       },
  TAG:               { icon: "pricetag-outline",          color: "#9333ea"       },
  RSVP:              { icon: "checkmark-circle-outline",  color: semantic.success },
  GAME_RESULT:       { icon: "trophy-outline",            color: "#f59e0b"       },
  EVENT_REMINDER:    { icon: "alarm-outline",             color: "#ea580c"       },
  CHECK_IN:          { icon: "location-outline",          color: semantic.success },
  PAYMENT_CONFIRMED: { icon: "card-outline",              color: semantic.success },
  PAYMENT_FAILED:    { icon: "alert-circle-outline",      color: semantic.error  },
  EVENT_PUBLISHED:   { icon: "megaphone-outline",         color: brand.primary   },
  TICKET_PURCHASED:  { icon: "ticket-outline",            color: "#9333ea"       },
  GAME_UNLOCKED:     { icon: "game-controller-outline",   color: "#ea580c"       },
  VIBETAG_ACTIVATED: { icon: "sparkles-outline",          color: "#8B5CF6"       },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? { icon: "notifications-outline" as IoniconName, color: neutral[500] };
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Single row ──────────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) {
  const { icon, color } = getMeta(item.type);
  const actorName = item.actor?.displayName ?? item.actor?.username ?? "Someone";

  return (
    <TouchableOpacity
      style={[row.container, !item.isRead && row.unread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Icon circle */}
      <View style={[row.iconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      {/* Text */}
      <View style={row.body}>
        <Text style={row.message} numberOfLines={2}>
          {item.message ?? buildDefaultMessage(item.type, actorName)}
        </Text>
        <Text style={row.time}>{timeAgo(item.createdAt)}</Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && <View style={[row.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

function buildDefaultMessage(type: string, actor: string): string {
  switch (type) {
    case "FOLLOW":            return `${actor} started following you`;
    case "LIKE":              return `${actor} liked your post`;
    case "COMMENT":           return `${actor} commented on your post`;
    case "TAG":               return `${actor} tagged you`;
    case "RSVP":              return `${actor} RSVP'd to your event`;
    case "GAME_RESULT":       return "Your game results are ready";
    case "EVENT_REMINDER":    return "Reminder: an event is coming up";
    case "CHECK_IN":          return `${actor} checked in to your event`;
    case "PAYMENT_CONFIRMED": return "Payment confirmed";
    case "PAYMENT_FAILED":    return "Payment failed — please retry";
    case "EVENT_PUBLISHED":   return "Your event is now live";
    case "TICKET_PURCHASED":  return `${actor} purchased a ticket`;
    case "GAME_UNLOCKED":     return "A new game session was unlocked";
    case "VIBETAG_ACTIVATED": return "A VibeTags session started";
    default:                  return "You have a new notification";
  }
}

const row = StyleSheet.create({
  container: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
    backgroundColor: "#fff",
  },
  unread: { backgroundColor: `${brand.primary}05` },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  body:    { flex: 1, gap: 3 },
  message: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], lineHeight: 19 },
  time:    { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  dot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetNotificationsQuery();

  const [markOneRead]  = useMarkOneReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

  const notifications  = data?.data?.data    ?? [];
  const unreadCount    = data?.data?.meta?.unreadCount ?? 0;
  const isFirstLoad    = isLoading && notifications.length === 0;
  const isRefreshing   = isFetching && !isLoading;

  // Tap → mark read + deep-link
  const handlePress = useCallback(async (item: Notification) => {
    if (!item.isRead) {
      await markOneRead(item.id).catch(() => {});
    }
    // Route on data fields per the integration guide
    navigate(item, router);
  }, [markOneRead, router]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => router.back()} />

      {/* ── Title row ── */}
      <View style={s.titleRow}>
        <View>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={s.subtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[s.markAllBtn, markingAll && { opacity: 0.5 }]}
            onPress={() => markAllRead()}
            disabled={markingAll}
            activeOpacity={0.75}
          >
            {markingAll
              ? <ActivityIndicator size="small" color={brand.primary} />
              : <Text style={s.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── Loading skeleton ── */}
      {isFirstLoad && (
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      )}

      {/* ── Error state ── */}
      {isError && !isFirstLoad && (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={44} color={neutral[300]} />
          <Text style={s.emptyTitle}>Could not load notifications</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch} activeOpacity={0.8}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── List ── */}
      {!isFirstLoad && !isError && (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={handlePress} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="notifications-off-outline" size={52} color={neutral[200]} />
              <Text style={s.emptyTitle}>No notifications yet</Text>
              <Text style={s.emptySub}>Activity from your events and connections will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Deep-link routing ────────────────────────────────────────────────────────

function navigate(item: Notification, router: ReturnType<typeof useRouter>) {
  const { targetType, targetId } = item;
  if (!targetId) return;
  switch (targetType) {
    case "EVENT":   router.push(`/events/${targetId}` as any);            break;
    case "POSTCARD": router.push(`/events/postcards/${targetId}` as any); break;
    case "GAME":
    case "TICKET":
    case "PAYMENT": router.push("/dashboard" as any);                     break;
    case "USER":    router.push("/(tabs)/profile" as any);                break;
    default:        break;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#fff" },
  titleRow: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  title:    { fontFamily: fontFamily.extrabold, fontSize: fontSize["2xl"], color: neutral[900] },
  subtitle: { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,    color: neutral[500], marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}08`,
    minWidth: 48, alignItems: "center",
  },
  markAllText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: brand.primary },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 10, paddingHorizontal: 32, paddingTop: 60,
  },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[700], textAlign: "center" },
  emptySub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,  color: neutral[400], textAlign: "center" },
  retryBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: brand.primary },
  retryText:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: "#fff" },
});
