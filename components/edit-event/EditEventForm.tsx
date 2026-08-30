/**
 * EditEventForm.tsx — React Native
 *
 * Virtual event support (per Virtual Events Frontend Guide):
 *  • Mode selector: ONSITE | VIRTUAL | HYBRID pills
 *    - ONSITE  → show Location,     hide Meeting Link
 *    - VIRTUAL → show Meeting Link, hide Location
 *    - HYBRID  → show both
 *  • Meeting link validated to start with https://
 *  • Mode change clears the irrelevant field
 */

import DateTimeTrigger from '@/components/ui/DateTimeTrigger';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import FieldInput from './FieldInput';
import LockedBanner from './LockedBanner';
import { FlierPicker, VideoPicker } from './MediaPicker';
import type { EventDraft, MediaState } from './types';
import { IDLE_MEDIA, isEventStarted } from './types';

let ImagePicker: typeof import('expo-image-picker') | null = null;
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { DocumentPicker = require('expo-document-picker'); } catch {}

const MAX_FLIER_MB = 10;
const MAX_VIDEO_MB = 350;

type EventMode = 'ONSITE' | 'VIRTUAL' | 'HYBRID';

const EVENT_MODES: {
  id: EventMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { id: 'ONSITE',  label: 'Onsite',  icon: 'location-outline' },
  { id: 'VIRTUAL', label: 'Virtual', icon: 'videocam-outline'  },
  { id: 'HYBRID',  label: 'Hybrid',  icon: 'git-merge-outline' },
];

interface FormState {
  name: string;
  description: string;
  mode: EventMode;
  locationName: string;
  virtualLink: string;
  capacity: string;
  startsAt: string;
  endsAt: string;
  isPublic: boolean;
}

interface FormErrors {
  name?: string;
  locationName?: string;
  virtualLink?: string;
}

interface Props {
  event: EventDraft & { flierUrl?: string | null; promoVideoUrl?: string | null };
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: Record<string, any>) => Promise<void>;
  isSaving?: boolean;
}

export default function EditEventForm({ event, visible, onDismiss, onSave, isSaving }: Props) {
  const locked = isEventStarted(event?.startsAt);

  const [form, setForm]     = useState<FormState>(buildForm(event));
  const [errors, setErrors] = useState<FormErrors>({});
  const [flier, setFlier]   = useState<MediaState>(mediaFromUrl(event?.flierUrl));
  const [video, setVideo]   = useState<MediaState>(mediaFromUrl(event?.promoVideoUrl));

  useEffect(() => {
    if (visible) {
      setForm(buildForm(event));
      setErrors({});
      setFlier(mediaFromUrl(event?.flierUrl));
      setVideo(mediaFromUrl(event?.promoVideoUrl));
    }
  }, [visible]);

  const anyUploading = flier.status === 'uploading' || video.status === 'uploading';

  // Visibility rules per the guide
  const showLocation    = form.mode === 'ONSITE'  || form.mode === 'HYBRID';
  const showVirtualLink = form.mode === 'VIRTUAL' || form.mode === 'HYBRID';

  const handleModeChange = (mode: EventMode) => {
    setForm((f) => ({
      ...f,
      mode,
      locationName: mode === 'VIRTUAL' ? '' : f.locationName,
      virtualLink:  mode === 'ONSITE'  ? '' : f.virtualLink,
    }));
    setErrors({});
  };

  const pickFlier = async () => {
    if (!ImagePicker) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FLIER_MB * 1024 * 1024) { return; }
      setFlier({ status: 'picked', uri: asset.uri, fileName: asset.fileName ?? 'flyer.jpg', remoteUrl: null });
    } catch {}
  };

  const pickVideo = async () => {
    if (!DocumentPicker) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_VIDEO_MB * 1024 * 1024) { return; }
      setVideo({ status: 'picked', uri: asset.uri, fileName: asset.name ?? 'video.mp4', remoteUrl: null });
    } catch {}
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) {
      e.name = 'Event name is required.';
    }
    if (showLocation && !form.locationName.trim()) {
      e.locationName = 'Location is required for onsite / hybrid events.';
    }
    if (showVirtualLink) {
      if (!form.virtualLink.trim()) {
        e.virtualLink = 'Meeting link is required for virtual / hybrid events.';
      } else if (!form.virtualLink.trim().startsWith('https://')) {
        e.virtualLink = 'Meeting link must start with https://';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (anyUploading) return;
    if (!validate()) return;

    const payload: Record<string, any> = { mode: form.mode };
    if (form.name)        payload.name        = form.name;
    if (form.description) payload.description = form.description;
    if (form.capacity)    payload.capacity    = Number(form.capacity);
    if (form.startsAt)    payload.startsAt    = form.startsAt;
    if (form.endsAt)      payload.endsAt      = form.endsAt;

    // Send field only if relevant; clear the other
    payload.locationName = showLocation    ? form.locationName : '';
    payload.virtualLink  = showVirtualLink ? form.virtualLink  : '';

    payload.isPublic      = form.isPublic;
    payload.flierUri      = flier.uri       ?? null;
    payload.flierUrl      = flier.remoteUrl ?? null;
    payload.promoVideoUri = video.uri       ?? null;
    payload.promoVideoUrl = video.remoteUrl ?? null;

    await onSave(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Ionicons name="create-outline" size={18} color={brand.primary} />
          <Text style={s.sheetTitle}>Edit Event</Text>
          <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {locked && <LockedBanner />}

          <FieldInput
            label="Event Name"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Event name"
            disabled={locked}
            error={errors.name}
          />

          <FieldInput
            label="Description"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Describe your event"
            multiline
            disabled={locked}
          />

          <DateTimeTrigger
            label="Start Date & Time"
            value={form.startsAt}
            onChange={(v) => setForm((f) => ({ ...f, startsAt: v }))}
            disabled={locked}
            required
          />

          <DateTimeTrigger
            label="End Date & Time"
            value={form.endsAt}
            onChange={(v) => setForm((f) => ({ ...f, endsAt: v }))}
            disabled={locked}
            minimumDate={form.startsAt ? new Date(form.startsAt) : undefined}
          />

          {/* ── Event Mode selector ─────────────────────────────── */}
          <View style={s.modeGroup}>
            <Text style={s.sectionLabel}>Event Mode</Text>
            <View style={s.modeRow}>
              {EVENT_MODES.map((m) => {
                const active = form.mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      s.modePill,
                      active && s.modePillActive,
                      locked && s.modePillDisabled,
                    ]}
                    onPress={() => !locked && handleModeChange(m.id)}
                    activeOpacity={locked ? 1 : 0.7}
                  >
                    <Ionicons
                      name={m.icon}
                      size={14}
                      color={active ? '#fff' : neutral[500]}
                    />
                    <Text style={[s.modePillText, active && s.modePillTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Privacy toggle ───────────────────────────────────── */}
          <View style={s.privacyGroup}>
            <View style={s.privacyLeft}>
              <View style={s.privacyIconWrap}>
                <Ionicons
                  name={form.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                  size={16}
                  color={form.isPublic ? brand.primary : '#b45309'}
                />
              </View>
              <View style={s.privacyTextWrap}>
                <Text style={s.privacyTitle}>
                  {form.isPublic ? 'Public Event' : 'Private Event'}
                </Text>
                <Text style={s.privacyDesc}>
                  {form.isPublic
                    ? 'Discoverable by everyone on the feed'
                    : 'Hidden from feed — access by invite link only'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => !locked && setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
              activeOpacity={locked ? 1 : 0.8}
              style={[
                s.toggle,
                form.isPublic ? s.toggleOn : s.toggleOff,
                locked && s.toggleDisabled,
              ]}
            >
              <View style={[s.toggleThumb, form.isPublic ? s.toggleThumbOn : s.toggleThumbOff]} />
            </TouchableOpacity>
          </View>

          {/* ── Location — ONSITE & HYBRID only ─────────────────── */}          {showLocation && (
            <FieldInput
              label="Location"
              value={form.locationName}
              onChangeText={(v) => setForm((f) => ({ ...f, locationName: v }))}
              placeholder="Venue name or address"
              disabled={locked}
              error={errors.locationName}
            />
          )}

          {/* ── Meeting link — VIRTUAL & HYBRID only ─────────────── */}
          {showVirtualLink && (
            <FieldInput
              label="Meeting Link"
              value={form.virtualLink}
              onChangeText={(v) => setForm((f) => ({ ...f, virtualLink: v }))}
              placeholder="https://zoom.us/j/..."
              disabled={locked}
              error={errors.virtualLink}
              hint="Supports Zoom, Google Meet, Teams, or any https:// URL"
            />
          )}

          <FieldInput
            label="Capacity"
            value={form.capacity}
            onChangeText={(v) => setForm((f) => ({ ...f, capacity: v }))}
            placeholder="500"
            keyboardType="number-pad"
            disabled={locked}
          />

          {/* ── Flier ───────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Event Flyer</Text>
          <FlierPicker
            state={flier}
            locked={locked}
            onPick={pickFlier}
            onRemove={() => setFlier(IDLE_MEDIA)}
          />

          {/* ── Promo video ──────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Promotional Video</Text>
          <VideoPicker
            state={video}
            locked={locked}
            onPick={pickVideo}
            onRemove={() => setVideo(IDLE_MEDIA)}
          />

          {/* ── Actions ─────────────────────────────────────────── */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, (locked || isSaving || anyUploading) && s.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={locked || isSaving || anyUploading}
            >
              {isSaving ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Text style={s.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildForm(event: any): FormState {
  return {
    name:         event?.name          ?? '',
    description:  event?.description   ?? '',
    mode:         (event?.mode as EventMode) ?? 'ONSITE',
    locationName: event?.locationName  ?? '',
    virtualLink:  event?.virtualLink   ?? '',
    capacity:     event?.capacity != null ? String(event.capacity) : '',
    startsAt:     event?.startsAt ?? '',
    endsAt:       event?.endsAt   ?? '',
    isPublic:     event?.isPublic !== false, // default public unless explicitly false
  };
}

function mediaFromUrl(url?: string | null): MediaState {
  if (!url) return IDLE_MEDIA;
  return { status: 'done', uri: null, fileName: null, remoteUrl: url };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0, top: '8%',
    backgroundColor: neutral[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  sheetTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  closeBtn: { padding: 2 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: neutral[700],
    marginBottom: 8,
  },

  // Mode selector
  modeGroup: { marginBottom: 16 },
  modeRow:   { flexDirection: 'row', gap: 8 },

  // Privacy toggle
  privacyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  privacyLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTextWrap: { flex: 1 },
  privacyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  privacyDesc:  { fontFamily: fontFamily.regular,  fontSize: 11,          color: neutral[500], marginTop: 2 },

  // Custom toggle (replaces Switch — removed in RN 0.70+)
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn:  { backgroundColor: brand.primary },
  toggleOff: { backgroundColor: '#f59e0b60' },
  toggleDisabled: { opacity: 0.5 },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn:  { alignSelf: 'flex-end' },
  toggleThumbOff: { alignSelf: 'flex-start' },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  modePillActive:   { backgroundColor: brand.primary, borderColor: brand.primary },
  modePillDisabled: { opacity: 0.5 },
  modePillText:     { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
  modePillTextActive: { color: '#fff' },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: brand.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
