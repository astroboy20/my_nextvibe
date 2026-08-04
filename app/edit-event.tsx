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

import ConfirmModal, { type ConfirmAction } from '@/components/edit-event/ConfirmModal';
import DashboardCard from '@/components/edit-event/DashboardCard';
import EditEventForm from '@/components/edit-event/EditEventForm';
import EventHeaderCard from '@/components/edit-event/EventHeaderCard';
import EventReminders from '@/components/edit-event/EventReminders';
import EventTagsEditor from '@/components/edit-event/EventTagsEditor';
import GamificationHub from '@/components/edit-event/GamificationHub';
import QRModal from '@/components/edit-event/QRModal';
import RsvpTracker from '@/components/edit-event/RsvpTracker';
import StatusUpdater from '@/components/edit-event/StatusUpdater';
import { isEventStarted } from '@/components/edit-event/types';
import AppHeader from '@/components/navigation/AppHeader';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Mock data (replace with real API calls) ───────────────────────────────────

const MOCK_EVENT = {
  id: '1',
  name: 'Argentina vs. Spain',
  description: 'Join us for the most electric match of the year! Watch Argentina take on Spain in an unforgettable showdown.',
  mode: 'HYBRID' as const,
  locationName: 'Eko Hotel, Lagos',
  virtualLink: 'https://meet.google.com/abc-defg-hij',
  capacity: '500',
  startsAt: '2026-09-15T20:00:00Z',
  endsAt: '2026-09-15T23:00:00Z',
  flierUrl: null as string | null,
  promoVideoUrl: null as string | null,
  status: 'PUBLISHED',
  attendingCount: 0,
  maybeCount: 0,
  cantGoCount: 0,
};

const MOCK_TAGS = [
  { id: '1', name: 'Sports' },
  { id: '2', name: 'Football' },
  { id: '3', name: 'Virtual' },
  { id: '4', name: 'Games' },
  { id: '5', name: 'Live' },
];

const MOCK_EVENT_TAGS = [
  { id: '1', name: 'Sports' },
  { id: '2', name: 'Football' },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? MOCK_EVENT.id;

  const [event, setEvent] = useState({ ...MOCK_EVENT, tags: MOCK_EVENT_TAGS });
  const [allTags, setAllTags] = useState(MOCK_TAGS);

  const [showQR, setShowQR] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const eventUrl = `https://nextvibe.app/events/${eventId}`;
  const liveGameCount = 1; // TODO: derive from games API

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleShare = async () => {
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
    Linking.openURL(eventUrl).catch(() =>
      Alert.alert('Could not open', 'Unable to open the event page.')
    );
  };

  const handleSave = async (payload: Record<string, any>) => {
    setIsSaving(true);
    try {
      // TODO: replace with updateEvent API call
      setEvent((prev) => ({
        ...prev,
        name:          payload.name          ?? prev.name,
        description:   payload.description   ?? prev.description,
        locationName:  payload.locationName  ?? prev.locationName,
        virtualLink:   payload.virtualLink   ?? prev.virtualLink,
        capacity:      payload.capacity      ? String(payload.capacity) : prev.capacity,
        startsAt:      payload.startsAt      ?? prev.startsAt,
        endsAt:        payload.endsAt        ?? prev.endsAt,
        flierUrl:      payload.flierUrl      ?? prev.flierUrl,
        promoVideoUrl: payload.promoVideoUrl ?? prev.promoVideoUrl,
      }));
      setShowEdit(false);
      Alert.alert('Saved', 'Event updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update event.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (action: ConfirmAction) => {
    setIsUpdatingStatus(true);
    try {
      // TODO: replace with updateEventStatus API call
      setEvent((prev) => ({ ...prev, status: action }));
      const msg =
        action === 'PUBLISHED' ? "Event published! It's now live." :
        action === 'ENDED'     ? 'Event marked as ended.' :
                                 'Event cancelled.';
      Alert.alert('Updated', msg);
      setConfirmAction(null);
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    setIsAddingTag(true);
    try {
      const tag = allTags.find((t) => t.id === tagId);
      if (tag) setEvent((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setRemovingTagId(tagId);
    try {
      setEvent((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== tagId) }));
    } finally {
      setRemovingTagId(null);
    }
  };

  const handleCreateAndAddTag = async (name: string) => {
    setIsCreatingTag(true);
    try {
      const newTag = { id: String(Date.now()), name };
      setAllTags((prev) => [...prev, newTag]);
      setEvent((prev) => ({ ...prev, tags: [...prev.tags, newTag] }));
    } finally {
      setIsCreatingTag(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      <AppHeader onBack={() => router.back()} notificationCount={2} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event summary card */}
        <EventHeaderCard
          event={event}
          eventId={eventId}
          onQRPress={() => setShowQR(true)}
          isSharing={isSharing}
          onShare={handleShare}
          onViewPress={handleViewEvent}
        />

        {/* ── RSVP Tracker ───────────────────────────────────── */}
        <DashboardCard
          title="RSVP Tracker"
          icon={<Ionicons name="people-outline" size={16} color={brand.primary} />}
          badge={<InlineBadge label={`${event.attendingCount} Going`} />}
          defaultOpen
        >
          <RsvpTracker
            counts={{
              going:   event.attendingCount,
              maybe:   event.maybeCount,
              cantGo:  event.cantGoCount,
            }}
          />
        </DashboardCard>

        {/* ── Edit Event ─────────────────────────────────────── */}
        <DashboardCard
          title="Edit Event"
          icon={<Ionicons name="create-outline" size={16} color={brand.primary} />}
          badge={
            isEventStarted(event.startsAt)
              ? <InlineBadge label="Locked" danger />
              : <InlineBadge label="Editable" success />
          }
        >
          {isEventStarted(event.startsAt) ? (
            <View style={s.infoRow}>
              <Ionicons name="lock-closed-outline" size={14} color={semantic.error} />
              <Text style={s.infoText}>
                This event has already started. All editing is now locked.
              </Text>
            </View>
          ) : (
            <Text style={s.cardDesc}>
              Update name, description, date & time, flyer, promo video, location, or capacity.
              Editing locks the moment the event starts.
            </Text>
          )}
          <TouchableOpacity
            style={[s.primaryBtn, isEventStarted(event.startsAt) && s.btnDisabled]}
            onPress={() => setShowEdit(true)}
            disabled={isEventStarted(event.startsAt)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={s.primaryBtnText}>
              {isEventStarted(event.startsAt) ? 'Editing Locked' : 'Edit Event'}
            </Text>
          </TouchableOpacity>
        </DashboardCard>

        {/* ── Event Reminders ────────────────────────────────── */}
        <DashboardCard
          title="Event Reminders"
          icon={<Ionicons name="notifications-outline" size={16} color={brand.primary} />}
          badge={<InlineBadge label="2 Active" />}
        >
          <EventReminders
            eventStartsAt={event.startsAt}
            eventStatus={event.status}
          />
        </DashboardCard>

        {/* ── Event Tags ─────────────────────────────────────── */}
        <DashboardCard
          title="Event Tags"
          icon={<Ionicons name="pricetag-outline" size={16} color={brand.primary} />}
          badge={
            isEventStarted(event.startsAt)
              ? <InlineBadge label="Locked" danger />
              : <InlineBadge label={`${event.tags.length} Tags`} />
          }
        >
          <EventTagsEditor
            event={event}
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
          icon={<Ionicons name="ticket-outline" size={16} color={brand.primary} />}
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
          icon={<Ionicons name="game-controller-outline" size={16} color={brand.primary} />}
          badge={<InlineBadge label={`${liveGameCount} Live`} success />}
        >
          <GamificationHub
            eventId={eventId}
            eventStatus={event.status}
            liveCount={liveGameCount}
            onCreateGame={() => Alert.alert('Coming soon', 'Game creator is on the way!')}
          />
        </DashboardCard>

        {/* ── Analytics ──────────────────────────────────────── */}
        <DashboardCard
          title="Analytics"
          icon={<Ionicons name="bar-chart-outline" size={16} color={brand.primary} />}
          badge={<InlineBadge label="Insights" />}
        >
          <View style={s.statsGrid}>
            <StatBox value={event.attendingCount} label="RSVPs"   color={brand.primary}    />
            <StatBox value={0}                    label="Tickets" color={semantic.success}  />
            <StatBox value={liveGameCount}         label="Games"   color="#9B59B6"           />
          </View>
          <Text style={[s.cardDesc, { marginTop: 10 }]}>
            Revenue, vibe-tags, postcards, social velocity & audience demographics on the full page.
          </Text>
        </DashboardCard>

        {/* ── Update Status ──────────────────────────────────── */}
        <DashboardCard
          title="Update Event Status"
          icon={<Ionicons name="ellipsis-horizontal-circle-outline" size={16} color={brand.primary} />}
          badge={<StatusPill status={event.status} />}
        >
          <StatusUpdater
            status={event.status}
            isLoading={isUpdatingStatus}
            onEnd={() => setConfirmAction('ENDED')}
            onCancel={() => setConfirmAction('CANCELLED')}
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
        event={event}
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

function InlineBadge({ label, danger, success }: { label: string; danger?: boolean; success?: boolean }) {
  const bg    = danger ? `${semantic.error}15`   : success ? `${semantic.success}15`  : `${brand.primary}12`;
  const color = danger ? semantic.error           : success ? semantic.success          : brand.primary;
  return (
    <View style={[b.pill, { backgroundColor: bg }]}>
      <Text style={[b.text, { color }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status?: string }) {
  const color =
    status === 'PUBLISHED' || status === 'LIVE' ? semantic.success :
    status === 'ENDED'     || status === 'CANCELLED' ? neutral[400] :
    semantic.warning;
  return (
    <View style={[b.pill, { backgroundColor: `${color}18` }]}>
      <Text style={[b.text, { color }]}>{status ?? 'DRAFT'}</Text>
    </View>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={b.statBox}>
      <Text style={[b.statVal, { color }]}>{value}</Text>
      <Text style={b.statLbl}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: neutral[50] },
  scroll: { flex: 1 },
  content:{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },

  // ── Card internals ───────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  placeholder: {
    alignItems: 'center',
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
    flexDirection: 'row',
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
    alignItems: 'center',
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
