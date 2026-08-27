import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetEventVibeTagsQuery } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VibeTagEditor from './VibetagCreator/native/VibeTagEditor';

// ── Timing tabs ───────────────────────────────────────────────────────────────

type ActivityTiming = 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT' | 'BOTH';

const TIMING_TABS: { value: ActivityTiming; label: string }[] = [
  { value: 'PRE_EVENT', label: 'Pre-Event' },
  { value: 'DURING_EVENT', label: 'Main Event' },
  { value: 'POST_EVENT', label: 'Post-Event' },
  { value: 'BOTH', label: 'Both' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  eventName?: string | null;
  eventPlan?: {
    vibetagsEnabled: boolean;
    vibetagPhases: string[];
    isQuotaExhausted?: boolean;
  } | null;
}

export default function VibeTagSection({ eventId, eventName, eventPlan }: Props) {
  const [activeTiming, setActiveTiming] = useState<ActivityTiming>('PRE_EVENT');
  const [showEditor, setShowEditor] = useState(false);

  const { data, isLoading, refetch } = useGetEventVibeTagsQuery(eventId, {
    skip: !eventId,
  });

  const allVibeTags = data?.data ?? [];
  const existingTag = allVibeTags.find((t) => t.activityTiming === activeTiming) ?? null;

  const hasPreEvent = allVibeTags.some((t) => t.activityTiming === 'PRE_EVENT');
  const hasDuringEvent = allVibeTags.some((t) => t.activityTiming === 'DURING_EVENT');
  const isBothDisabled = activeTiming === 'BOTH' && hasPreEvent && hasDuringEvent;

  const canCreate = !isBothDisabled && !existingTag;

  const handleEditorClose = (meta?: { paymentRequired: boolean; vibeTagId?: string }) => {
    setShowEditor(false);
    refetch();
  };

  return (
    <View style={s.root}>
      {/* Timing tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
      >
        {TIMING_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[s.tab, activeTiming === tab.value && s.tabActive]}
            onPress={() => setActiveTiming(tab.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[s.tabText, activeTiming === tab.value && s.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* "Both" covered notice */}
      {isBothDisabled && (
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#b45309" />
          <Text style={s.infoText}>
            You already have Pre-Event & Main Event VibeTags — those cover both
            phases, so a separate "Both" tag isn't needed.
          </Text>
        </View>
      )}

      {/* Plan lock notice */}
      {(() => {
        if (!eventPlan) return null;
        const phaseEnabled =
          eventPlan.vibetagsEnabled &&
          (eventPlan.vibetagPhases?.includes(activeTiming) ||
            eventPlan.vibetagPhases?.includes('BOTH'));
        if (phaseEnabled) return null;
        return (
          <View style={s.lockBox}>
            <Ionicons name="lock-closed-outline" size={14} color="#b45309" />
            <Text style={s.infoText}>
              VibeTags for{' '}
              <Text style={s.bold}>
                {TIMING_TABS.find((t) => t.value === activeTiming)?.label}
              </Text>{' '}
              aren't included in your current plan. Creating one will prompt
              payment to unlock it.
            </Text>
          </View>
        );
      })()}

      {/* Content */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : existingTag ? (
        // Existing tag for this timing
        <View style={s.tagCard}>
          {existingTag.imageUrl ? (
            <Image
              source={{ uri: existingTag.imageUrl }}
              style={s.tagThumb}
              resizeMode="contain"
            />
          ) : (
            <View style={[s.tagThumb, s.tagThumbPlaceholder]}>
              <Ionicons name="pricetag-outline" size={20} color={neutral[400]} />
            </View>
          )}
          <View style={s.tagInfo}>
            <Text style={s.tagName} numberOfLines={1}>
              {existingTag.name}
            </Text>
            <View style={s.timingBadge}>
              <Text style={s.timingBadgeText}>
                {TIMING_TABS.find((t) => t.value === activeTiming)?.label}
              </Text>
            </View>
            <Text style={s.tagHint}>Applied to postcards for this phase</Text>
          </View>
        </View>
      ) : (
        // No tag yet
        <View style={s.emptyBox}>
          <Ionicons name="pricetag-outline" size={28} color={neutral[300]} />
          <Text style={s.emptyTitle}>
            No VibeTag for{' '}
            {TIMING_TABS.find((t) => t.value === activeTiming)?.label} yet
          </Text>
          <Text style={s.emptyHint}>
            Create one to stamp this phase's identity on every postcard
          </Text>
        </View>
      )}

      {/* Create / Refresh buttons */}
      <View style={s.btnRow}>
        {canCreate && (
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => setShowEditor(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={s.createBtnText}>
              Create VibeTag for{' '}
              {TIMING_TABS.find((t) => t.value === activeTiming)?.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={14} color={brand.primary} />
          <Text style={s.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen VibeTag editor modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditor(false)}
      >
        <SafeAreaView style={s.editorSafe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={s.editorHeader}>
            <Text style={s.editorHeaderTitle}>VibeTag Studio</Text>
            <TouchableOpacity
              onPress={() => setShowEditor(false)}
              hitSlop={12}
              style={s.editorClose}
            >
              <Ionicons name="close" size={24} color={neutral[600]} />
            </TouchableOpacity>
          </View>

          {/* Editor flow */}
          <VibeTagEditor
            eventId={eventId}
            activityTiming={activeTiming}
            eventName={eventName}
            onClose={handleEditorClose}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 10 },
  tabsRow: { gap: 8, paddingBottom: 2 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  tabActive: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}12`,
  },
  tabText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  tabTextActive: {
    fontFamily: fontFamily.semibold,
    color: brand.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#92400e',
    lineHeight: 17,
  },
  bold: { fontFamily: fontFamily.semibold },
  centered: { alignItems: 'center', paddingVertical: 24 },
  tagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  tagThumb: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: neutral[100],
    backgroundColor: neutral[50],
  },
  tagThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInfo: { flex: 1, gap: 4 },
  tagName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  timingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}08`,
  },
  timingBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: brand.primary,
  },
  tagHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  emptyBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: neutral[200],
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
    lineHeight: 17,
  },
  btnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: brand.primary,
  },
  createBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}30`,
    backgroundColor: `${brand.primary}06`,
  },
  refreshBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: brand.primary,
  },
  editorSafe: { flex: 1, backgroundColor: '#fff' },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  editorHeaderTitle: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  editorClose: {
    padding: 4,
  },
});
