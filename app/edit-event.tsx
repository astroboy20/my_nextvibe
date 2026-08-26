import ConfirmModal, {
  type ConfirmAction,
} from "@/components/edit-event/ConfirmModal";
import DashboardCard from "@/components/edit-event/DashboardCard";
import EditEventForm from "@/components/edit-event/EditEventForm";
import EventHeaderCard from "@/components/edit-event/EventHeaderCard";
import EventReminders from "@/components/edit-event/EventReminders";
import EventTagsEditor from "@/components/edit-event/EventTagsEditor";
import GamificationHub from "@/components/edit-event/GamificationHub/GamificationHub";
import QRModal from "@/components/edit-event/QRModal";
import RsvpTracker from "@/components/edit-event/RsvpTracker";
import StatusUpdater from "@/components/edit-event/StatusUpdater";
import TicketManager from "@/components/edit-event/TicketManager";
import { isEventStarted } from "@/components/edit-event/types";
import { AppHeader } from "@/components/navigation/TopNavBar";
import { EditEventDashboardSkeleton } from "@/components/ui/Skeleton";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
  useGetEventByIdQuery,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
} from "@/store/api/eventsApi";
import { useGetRemindersQuery } from "@/store/api/reminderApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? "";
  const router = useRouter();

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    data: eventData,
    isLoading,
    isError,
    refetch,
  } = useGetEventByIdQuery(eventId, { skip: !eventId });

  const { data: reminderTemplates = [] } = useGetRemindersQuery(eventId, {
    skip: !eventId,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const [updateEvent] = useUpdateEventMutation();
  const [updateEventStatus] = useUpdateEventStatusMutation();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showQR, setShowQR] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // local tags for optimistic header display; real management lives in EventTagsEditor
  const [localTags, setLocalTags] = useState<{ id: string; name: string }[]>(
    []
  );

  const event = eventData?.data;
  const eventUrl = `https://mynextvibe.app/events/${eventId}`;

  // Seed local tags once server data arrives
  useEffect(() => {
    if (event?.tags) {
      setLocalTags(
        (event.tags as any[]).map((t) => ({ id: t.id, name: t.name }))
      );
    }
  }, [event?.tags]);

  const activeReminderCount = reminderTemplates.filter((t) => t.enabled).length;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!event) return;
    setIsSharing(true);
    try {
      await Share.share({
        message: `Check out this event: ${event.name}\n${eventUrl}`,
        title: event.name,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = async (payload: Record<string, any>) => {
    if (!eventId) return;
    setIsSaving(true);
    try {
      await updateEvent({ eventId, data: payload }).unwrap();
      setShowEdit(false);
      Alert.alert("Saved", "Event updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (action: ConfirmAction) => {
    if (!eventId) return;
    setIsUpdatingStatus(true);
    try {
      await updateEventStatus({
        eventId,
        status: action as "PUBLISHED" | "CANCELLED" | "ENDED",
      }).unwrap();
      const msg =
        action === "PUBLISHED"
          ? "Event published! It's now live."
          : action === "ENDED"
          ? "Event marked as ended."
          : "Event cancelled.";
      Alert.alert("Updated", msg);
      setConfirmAction(null);
    } catch {
      Alert.alert("Error", "Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader onBack={() => router.back()} notificationCount={2} />
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          <EditEventDashboardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (isError || !event) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader onBack={() => router.back()} notificationCount={2} />
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  // ── Normalise event shape ────────────────────────────────────────────────────

  const eventForCard = {
    id: event.id,
    name: event.name,
    description: event.description ?? "",
    mode: (event.mode ?? "ONSITE") as "ONSITE" | "VIRTUAL" | "HYBRID",
    locationName: event.locationName ?? "",
    virtualLink: event.virtualLink ?? "",
    capacity: String((event as any).capacity ?? ""),
    startsAt: event.startsAt ?? "",
    endsAt: String((event as any).endsAt ?? ""),
    flierUrl: event.flierUrl ?? null,
    promoVideoUrl: event.promoVideoUrl ?? null,
    status: event.status ?? "DRAFT",
    attendingCount:
      (event as any).attendingCount ?? (event as any)._count?.attendees ?? 0,
    maybeCount: (event as any).maybeCount ?? 0,
    cantGoCount: (event as any).cantGoCount ?? 0,
    tags: localTags,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <AppHeader onBack={() => router.back()} notificationCount={2} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1 ── Header */}
        <EventHeaderCard
          event={eventForCard}
          eventId={eventId}
          onQRPress={() => setShowQR(true)}
          isSharing={isSharing}
          onShare={handleShare}
          onViewPress={() => router.push(`/events/${eventId}` as any)}
        />

        {/* 2 ── RSVP */}
        <RsvpTrackerSection
          going={eventForCard.attendingCount}
          maybe={eventForCard.maybeCount}
          cantGo={eventForCard.cantGoCount}
        />

        {/* 3 ── Edit */}
        <EditEventSection
          event={eventForCard}
          isLocked={isEventStarted(event.startsAt)}
          onOpenEdit={() => setShowEdit(true)}
        />

        {/* 4 ── Reminders */}
        <EventRemindersSection
          eventId={eventId}
          eventStartsAt={event.startsAt}
          eventStatus={event.status}
          activeCount={activeReminderCount}
        />

        {/* 5 ── Tags */}
        <EventTagsSection
          event={eventForCard}
          isLocked={isEventStarted(event.startsAt)}
        />

        {/* 6 ── Tickets */}
        <TicketSection eventId={eventId} eventStatus={event.status} />

        {/* 7 ── Games */}
        <GamificationSection
          eventId={eventId}
          eventStatus={event.status}
          eventName={event.name}
          eventStartsAt={event.startsAt}
        />

        {/* 8 ── Analytics */}
        <AnalyticsSection
          eventId={eventId}
          rsvps={eventForCard.attendingCount}
          activeReminders={activeReminderCount}
        />

        {/* 9 ── Status */}
        <StatusSection
          status={event.status}
          isLoading={isUpdatingStatus}
          onEnd={() => setConfirmAction("ENDED")}
          onCancel={() => setConfirmAction("CANCELLED")}
        />
      </ScrollView>

      {/* ── Modals ── */}
      <QRModal
        visible={showQR}
        eventName={event.name}
        eventUrl={eventUrl}
        onDismiss={() => setShowQR(false)}
      />

      <EditEventForm
        event={eventForCard}
        visible={showEdit}
        onDismiss={() => setShowEdit(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmModal
        action={confirmAction}
        isLoading={isUpdatingStatus}
        onConfirm={handleStatusUpdate}
        onDismiss={() => setConfirmAction(null)}
      />
    </SafeAreaView>
  );
}

// ─── Section components ────────────────────────────────────────────────────────

// ── 2. RSVP ────────────────────────────────────────────────────────────────────

function RsvpTrackerSection({
  going,
  maybe,
  cantGo,
}: {
  going: number;
  maybe: number;
  cantGo: number;
}) {
  return (
    <DashboardCard
      title="RSVP Tracker"
      icon={<Ionicons name="people-outline" size={16} color={brand.primary} />}
      badge={<CountBadge label={`${going} Going`} />}
      defaultOpen
    >
      <RsvpTracker counts={{ going, maybe, cantGo }} />
    </DashboardCard>
  );
}

// ── 3. Edit Event ───────────────────────────────────────────────────────────────

function EditEventSection({
  event,
  isLocked,
  onOpenEdit,
}: {
  event: any;
  isLocked: boolean;
  onOpenEdit: () => void;
}) {
  return (
    <DashboardCard
      title="Edit Event"
      icon={<Ionicons name="create-outline" size={16} color={brand.primary} />}
      badge={
        isLocked ? (
          <StatusBadge label="Locked" color={semantic.error} />
        ) : (
          <StatusBadge label="Editable" color={semantic.success} />
        )
      }
    >
      {isLocked ? (
        <View style={sec.lockedRow}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={semantic.error}
          />
          <Text style={sec.lockedText}>
            This event has already started. All editing is now locked.
          </Text>
        </View>
      ) : (
        <Text style={sec.desc}>
          Update name, description, date & time, flyer, promo video, location,
          or capacity. Editing locks the moment the event starts.
        </Text>
      )}
      <PrimaryButton
        label={isLocked ? "Editing Locked" : "Edit Event"}
        icon="create-outline"
        onPress={onOpenEdit}
        disabled={isLocked}
      />
    </DashboardCard>
  );
}

// ── 4. Reminders ────────────────────────────────────────────────────────────────

function EventRemindersSection({
  eventId,
  eventStartsAt,
  eventStatus,
  activeCount,
}: {
  eventId: string;
  eventStartsAt?: string;
  eventStatus?: string;
  activeCount: number;
}) {
  return (
    <DashboardCard
      title="Event Reminders"
      icon={
        <Ionicons
          name="notifications-outline"
          size={16}
          color={brand.primary}
        />
      }
      badge={<CountBadge label={`${activeCount} Active`} />}
    >
      <EventReminders
        eventId={eventId}
        eventStartsAt={eventStartsAt}
        eventStatus={eventStatus}
      />
    </DashboardCard>
  );
}

// ── 5. Tags ─────────────────────────────────────────────────────────────────────

function EventTagsSection({
  event,
  isLocked,
}: {
  event: any;
  isLocked: boolean;
}) {
  return (
    <DashboardCard
      title="Event Tags"
      icon={
        <Ionicons name="pricetag-outline" size={16} color={brand.primary} />
      }
      badge={
        isLocked ? (
          <StatusBadge label="Locked" color={semantic.error} />
        ) : (
          <CountBadge label={`${event.tags?.length ?? 0} Tags`} />
        )
      }
    >
      <EventTagsEditor event={event} />
    </DashboardCard>
  );
}

// ── 6. Tickets ──────────────────────────────────────────────────────────────────

function TicketSection({
  eventId,
  eventStatus,
}: {
  eventId: string;
  eventStatus?: string;
}) {
  return (
    <DashboardCard
      title="Ticket Management"
      icon={<Ionicons name="ticket-outline" size={16} color={brand.primary} />}
      badge={<CountBadge label="Tickets" />}
    >
      <TicketManager eventId={eventId} eventStatus={eventStatus} />
    </DashboardCard>
  );
}

// ── 7. Gamification ─────────────────────────────────────────────────────────────

function GamificationSection({
  eventId,
  eventStatus,
  eventName,
  eventStartsAt,
}: {
  eventId: string;
  eventStatus?: string;
  eventName?: string;
  eventStartsAt?: string;
}) {
  return (
    <DashboardCard
      title="Gamification Hub"
      icon={
        <Ionicons
          name="game-controller-outline"
          size={16}
          color={brand.primary}
        />
      }
      badge={<CountBadge label="Games" color={brand.primary} />}
    >
      <GamificationHub
        eventId={eventId}
        eventStatus={eventStatus}
        eventName={eventName}
        eventStartsAt={eventStartsAt}
      />
    </DashboardCard>
  );
}

// ── 8. Analytics ────────────────────────────────────────────────────────────────

function AnalyticsSection({
  eventId,
  rsvps,
  activeReminders,
}: {
  eventId: string;
  rsvps: number;
  activeReminders: number;
}) {
  const router = useRouter();
  return (
    <DashboardCard
      title="Analytics"
      icon={
        <Ionicons name="bar-chart-outline" size={16} color={brand.primary} />
      }
      badge={<CountBadge label="Insights" />}
    >
      <View style={sec.statsGrid}>
        <StatBox value={rsvps} label="RSVPs" color={brand.primary} />
        <StatBox value={0} label="Tickets" color={semantic.success} />
        <StatBox value={activeReminders} label="Reminders" color="#9B59B6" />
      </View>
      <Text style={[sec.desc, { marginTop: 10 }]}>
        Revenue, vibe-tags, postcards, social velocity & audience demographics
        available on the full analytics page.
      </Text>
      <TouchableOpacity
        style={sec.analyticsBtn}
        onPress={() =>
          router.push({
            pathname: "/analytics",
            params: { id: eventId },
          } as any)
        }
        activeOpacity={0.8}
      >
        <Ionicons name="analytics-outline" size={15} color={brand.primary} />
        <Text style={sec.analyticsBtnText}>View Full Analytics</Text>
        <Ionicons name="chevron-forward" size={14} color={brand.primary} />
      </TouchableOpacity>
    </DashboardCard>
  );
}

// ── 9. Status ───────────────────────────────────────────────────────────────────

function StatusSection({
  status,
  isLoading,
  onEnd,
  onCancel,
}: {
  status?: string;
  isLoading: boolean;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const color =
    status === "PUBLISHED" || status === "LIVE"
      ? semantic.success
      : status === "ENDED" || status === "CANCELLED"
      ? neutral[400]
      : semantic.warning;

  return (
    <DashboardCard
      title="Update Event Status"
      icon={
        <Ionicons
          name="ellipsis-horizontal-circle-outline"
          size={16}
          color={brand.primary}
        />
      }
      badge={
        <View style={[sec.statusPill, { backgroundColor: `${color}18` }]}>
          <Text style={[sec.statusPillText, { color }]}>
            {status ?? "DRAFT"}
          </Text>
        </View>
      }
    >
      <StatusUpdater
        status={status}
        isLoading={isLoading}
        onEnd={onEnd}
        onCancel={onCancel}
      />
    </DashboardCard>
  );
}

// ─── Shared micro-components ───────────────────────────────────────────────────

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[sec.primaryBtn, disabled && sec.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={15} color="#fff" />
      <Text style={sec.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function CountBadge({ label, color }: { label: string; color?: string }) {
  const c = color ?? brand.primary;
  return (
    <View style={[sec.badge, { backgroundColor: `${c}15` }]}>
      <Text style={[sec.badgeText, { color: c }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[sec.badge, { backgroundColor: `${color}15` }]}>
      <Text style={[sec.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={sec.statBox}>
      <Text style={[sec.statValue, { color }]}>{value}</Text>
      <Text style={sec.statLabel}>{label}</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={s.errorWrap}>
      <Ionicons name="alert-circle-outline" size={48} color={neutral[300]} />
      <Text style={s.errorTitle}>Event not found</Text>
      <Text style={s.errorSub}>
        We couldn't load this event. Please try again.
      </Text>
      <TouchableOpacity
        style={s.retryBtn}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={s.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral[50] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 52 },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: neutral[800],
  },
  errorSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: brand.primary,
  },
  retryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});

const sec = StyleSheet.create({
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
    marginBottom: 12,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${semantic.error}08`,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  lockedText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 3,
  },
  statValue: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  // Analytics button
  analyticsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}06`,
  },
  analyticsBtnText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});
