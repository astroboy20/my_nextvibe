/**
 * Edit Event / Organizer Dashboard
 *
 * Sections:
 *   EventHeaderCard   → flier + event info + QR / Share / View
 *   RsvpTracker       → Going / Maybe / Can't Go counts
 *   EditEventForm     → bottom-sheet modal for editing event fields + media
 *   EventReminders    → push notification reminder toggles
 *   EventTagsEditor   → attach / remove / create tags
 *   GamificationHub   → games list + create
 *   StatusUpdater     → publish / end / cancel actions
 */

import ConfirmModal, {
    type ConfirmAction,
} from "@/components/edit-event/ConfirmModal";
import DashboardCard from "@/components/edit-event/DashboardCard";
import EditEventForm from "@/components/edit-event/EditEventForm";
import EventHeaderCard from "@/components/edit-event/EventHeaderCard";
import EventReminders from "@/components/edit-event/EventReminders";
import EventTagsEditor from "@/components/edit-event/EventTagsEditor";
import GamificationHub from "@/components/edit-event/GamificationHub";
import QRModal from "@/components/edit-event/QRModal";
import RsvpTracker from "@/components/edit-event/RsvpTracker";
import StatusUpdater from "@/components/edit-event/StatusUpdater";
import { isEventStarted } from "@/components/edit-event/types";
import { AppHeader } from "@/components/navigation/TopNavBar";
import { EditEventDashboardSkeleton } from "@/components/ui/Skeleton";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useAddEventTagsMutation,
    useGetEventByIdQuery,
    useRemoveEventTagsMutation,
    useUpdateEventMutation,
    useUpdateEventStatusMutation,
} from "@/store/api/eventsApi";
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
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? "";
  const router = useRouter();

  // ── Fetch event ────────────────────────────────────────────────────────────
  const {
    data: eventData,
    isLoading: isLoadingEvent,
    isError: isErrorEvent,
    refetch: refetchEvent,
  } = useGetEventByIdQuery(eventId, { skip: !eventId });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [updateEvent] = useUpdateEventMutation();
  const [updateEventStatus] = useUpdateEventStatusMutation();
  const [addEventTags] = useAddEventTagsMutation();
  const [removeEventTags] = useRemoveEventTagsMutation();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [showQR, setShowQR] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Optimistic local tags list — seeded from API, updated on add/remove
  const [localTags, setLocalTags] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const event = eventData?.data;

  // Sync local tags when event data arrives
  useEffect(() => {
    if (event?.tags) {
      setLocalTags(event.tags.map((t: any) => ({ id: t.id, name: t.name })));
    }
  }, [event?.tags]);

  const eventUrl = `https://mynextvibe.app/events/${eventId}`;
  const liveGameCount = 1; // TODO: derive from games API

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

  const handleViewEvent = () => {
    router.push(`/events/${eventId}` as any);
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

  const handleAddTag = async (tagId: string) => {
    if (!eventId) return;
    setIsAddingTag(true);
    try {
      await addEventTags({ eventId, tagIds: [tagId] }).unwrap();
      // Optimistically update local tags — full sync happens via cache invalidation
      const allTags: Array<{ id: string; name: string }> =
        (event as any)?._allTags ?? [];
      const tag = allTags.find((t) => t.id === tagId);
      if (tag) setLocalTags((prev) => [...prev, tag]);
    } catch {
      Alert.alert("Error", "Failed to add tag.");
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!eventId) return;
    setRemovingTagId(tagId);
    try {
      await removeEventTags({ eventId, tagIds: [tagId] }).unwrap();
      setLocalTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {
      Alert.alert("Error", "Failed to remove tag.");
    } finally {
      setRemovingTagId(null);
    }
  };

  const handleCreateAndAddTag = async (name: string) => {
    // Tag creation requires a separate vibe-tags endpoint — for now add optimistically
    setIsCreatingTag(true);
    try {
      const tempTag = { id: `temp-${Date.now()}`, name };
      setLocalTags((prev) => [...prev, tempTag]);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoadingEvent) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader onBack={() => router.back()} notificationCount={2} />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <EditEventDashboardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (isErrorEvent || !event) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader onBack={() => router.back()} notificationCount={2} />
        <View style={s.errorWrap}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={neutral[300]}
          />
          <Text style={s.errorTitle}>Event not found</Text>
          <Text style={s.errorSub}>
            We couldn't load this event. Please try again.
          </Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => refetchEvent()}
            activeOpacity={0.8}
          >
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

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

  const allTags: Array<{ id: string; name: string }> =
    (event as any).tags ?? [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <AppHeader onBack={() => router.back()} notificationCount={2} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event summary card */}
        <EventHeaderCard
          event={eventForCard}
          eventId={eventId}
          onQRPress={() => setShowQR(true)}
          isSharing={isSharing}
          onShare={handleShare}
          onViewPress={handleViewEvent}
        />

        {/* ── RSVP Tracker ───────────────────────────────────── */}
        <DashboardCard
          title="RSVP Tracker"
          icon={
            <Ionicons name="people-outline" size={16} color={brand.primary} />
          }
          badge={<InlineBadge label={`${eventForCard.attendingCount} Going`} />}
          defaultOpen
        >
          <RsvpTracker
            counts={{
              going: eventForCard.attendingCount,
              maybe: eventForCard.maybeCount,
              cantGo: eventForCard.cantGoCount,
            }}
          />
        </DashboardCard>

        {/* ── Edit Event ─────────────────────────────────────── */}
        <DashboardCard
          title="Edit Event"
          icon={
            <Ionicons name="create-outline" size={16} color={brand.primary} />
          }
          badge={
            isEventStarted(event.startsAt) ? (
              <InlineBadge label="Locked" danger />
            ) : (
              <InlineBadge label="Editable" success />
            )
          }
        >
          {isEventStarted(event.startsAt) ? (
            <View style={s.infoRow}>
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={semantic.error}
              />
              <Text style={s.infoText}>
                This event has already started. All editing is now locked.
              </Text>
            </View>
          ) : (
            <Text style={s.cardDesc}>
              Update name, description, date & time, flyer, promo video,
              location, or capacity. Editing locks the moment the event starts.
            </Text>
          )}
          <TouchableOpacity
            style={[
              s.primaryBtn,
              isEventStarted(event.startsAt) && s.btnDisabled,
            ]}
            onPress={() => setShowEdit(true)}
            disabled={isEventStarted(event.startsAt)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={s.primaryBtnText}>
              {isEventStarted(event.startsAt) ? "Editing Locked" : "Edit Event"}
            </Text>
          </TouchableOpacity>
        </DashboardCard>

        {/* ── Event Reminders ────────────────────────────────── */}
        <DashboardCard
          title="Event Reminders"
          icon={
            <Ionicons
              name="notifications-outline"
              size={16}
              color={brand.primary}
            />
          }
          badge={<InlineBadge label="2 Active" />}
        >
          <EventReminders
            eventId={eventId}
            eventStartsAt={event.startsAt}
            eventStatus={event.status}
          />
        </DashboardCard>

        {/* ── Event Tags ─────────────────────────────────────── */}
        <DashboardCard
          title="Event Tags"
          icon={
            <Ionicons name="pricetag-outline" size={16} color={brand.primary} />
          }
          badge={
            isEventStarted(event.startsAt) ? (
              <InlineBadge label="Locked" danger />
            ) : (
              <InlineBadge label={`${localTags.length} Tags`} />
            )
          }
        >
          <EventTagsEditor
            event={{ ...eventForCard }}
            allTags={allTags}
            isAdding={isAddingTag}
            isCreating={isCreatingTag}
            removingTagId={removingTagId}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            onCreateAndAdd={handleCreateAndAddTag}
          />
        </DashboardCard>

        {/* ── Ticket Management ──────────────────────────────── */}
        <DashboardCard
          title="Ticket Management"
          icon={
            <Ionicons name="ticket-outline" size={16} color={brand.primary} />
          }
          badge={<InlineBadge label="0 Sold" success />}
        >
          <View style={s.placeholder}>
            <Ionicons name="ticket-outline" size={28} color={neutral[300]} />
            <Text style={s.placeholderText}>No tickets created yet</Text>
            <Text style={s.placeholderSub}>Ticket creator coming soon</Text>
          </View>
        </DashboardCard>

        {/* ── Gamification Hub ───────────────────────────────── */}
        <DashboardCard
          title="Gamification Hub"
          icon={
            <Ionicons
              name="game-controller-outline"
              size={16}
              color={brand.primary}
            />
          }
          badge={<InlineBadge label={`${liveGameCount} Live`} success />}
        >
          <GamificationHub
            eventId={eventId}
            eventStatus={event.status}
            liveCount={liveGameCount}
            onCreateGame={() =>
              Alert.alert("Coming soon", "Game creator is on the way!")
            }
          />
        </DashboardCard>

        {/* ── Analytics ──────────────────────────────────────── */}
        <DashboardCard
          title="Analytics"
          icon={
            <Ionicons
              name="bar-chart-outline"
              size={16}
              color={brand.primary}
            />
          }
          badge={<InlineBadge label="Insights" />}
        >
          <View style={s.statsGrid}>
            <StatBox
              value={eventForCard.attendingCount}
              label="RSVPs"
              color={brand.primary}
            />
            <StatBox value={0} label="Tickets" color={semantic.success} />
            <StatBox value={liveGameCount} label="Games" color="#9B59B6" />
          </View>
          <Text style={[s.cardDesc, { marginTop: 10 }]}>
            Revenue, vibe-tags, postcards, social velocity & audience
            demographics on the full page.
          </Text>
        </DashboardCard>

        {/* ── Update Status ──────────────────────────────────── */}
        <DashboardCard
          title="Update Event Status"
          icon={
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={16}
              color={brand.primary}
            />
          }
          badge={<StatusPill status={event.status} />}
        >
          <StatusUpdater
            status={event.status}
            isLoading={isUpdatingStatus}
            onEnd={() => setConfirmAction("ENDED")}
            onCancel={() => setConfirmAction("CANCELLED")}
          />
        </DashboardCard>
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

// ── Tiny local helpers ────────────────────────────────────────────────────────

function InlineBadge({
  label,
  danger,
  success,
}: {
  label: string;
  danger?: boolean;
  success?: boolean;
}) {
  const bg = danger
    ? `${semantic.error}15`
    : success
    ? `${semantic.success}15`
    : `${brand.primary}12`;
  const color = danger
    ? semantic.error
    : success
    ? semantic.success
    : brand.primary;
  return (
    <View style={[b.pill, { backgroundColor: bg }]}>
      <Text style={[b.text, { color }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status?: string }) {
  const color =
    status === "PUBLISHED" || status === "LIVE"
      ? semantic.success
      : status === "ENDED" || status === "CANCELLED"
      ? neutral[400]
      : semantic.warning;
  return (
    <View style={[b.pill, { backgroundColor: `${color}18` }]}>
      <Text style={[b.text, { color }]}>{status ?? "DRAFT"}</Text>
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
    <View style={b.statBox}>
      <Text style={[b.statVal, { color }]}>{value}</Text>
      <Text style={b.statLbl}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral[50] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },

  // ── Error state ──────────────────────────────────────────────────────────
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

  // ── Card internals ───────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${semantic.error}08`,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 18,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
    marginBottom: 12,
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
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  placeholderText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  placeholderSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
});

const b = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 3,
  },
  statVal: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
  },
  statLbl: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
});
