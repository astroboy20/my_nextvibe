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
    View,
} from 'react-native';
import FieldInput from './FieldInput';
import LockedBanner from './LockedBanner';
import { FlierPicker, VideoPicker } from './MediaPicker';
import type { EventDraft, MediaState } from './types';
import { IDLE_MEDIA, isEventStarted, toLocalInput } from './types';

// ── Upload helpers ────────────────────────────────────────────────────────────

let ImagePicker: typeof import('expo-image-picker') | null = null;
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { DocumentPicker = require('expo-document-picker'); } catch {}

const MAX_FLIER_MB = 10;
const MAX_VIDEO_MB = 350;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  locationName: string;
  virtualLink: string;
  capacity: string;
  startsAt: string;   // "YYYY-MM-DD HH:MM"
  endsAt: string;     // "YYYY-MM-DD HH:MM"
}

interface Props {
  event: EventDraft & { flierUrl?: string | null; promoVideoUrl?: string | null };
  visible: boolean;
  onDismiss: () => void;
  /** Called with the patch payload when user saves */
  onSave: (payload: Record<string, any>) => Promise<void>;
  isSaving?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditEventForm({ event, visible, onDismiss, onSave, isSaving }: Props) {
  const locked = isEventStarted(event?.startsAt);

  const [form, setForm] = useState<FormState>(buildForm(event));
  const [flier, setFlier] = useState<MediaState>(mediaFromUrl(event?.flierUrl));
  const [video, setVideo] = useState<MediaState>(mediaFromUrl(event?.promoVideoUrl));

  // Reset state each time the modal opens
  useEffect(() => {
    if (visible) {
      setForm(buildForm(event));
      setFlier(mediaFromUrl(event?.flierUrl));
      setVideo(mediaFromUrl(event?.promoVideoUrl));
    }
  }, [visible]);

  const anyUploading = flier.status === 'uploading' || video.status === 'uploading';

  // ── Media pickers ─────────────────────────────────────────────────────────

  const pickFlier = async () => {
    if (!ImagePicker) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FLIER_MB * 1024 * 1024) {
        alert(`Flyer must be ${MAX_FLIER_MB} MB or less.`);
        return;
      }
      setFlier({ status: 'picked', uri: asset.uri, fileName: asset.fileName ?? 'flyer.jpg', remoteUrl: null });
    } catch { /* ignore */ }
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
      if (asset.size && asset.size > MAX_VIDEO_MB * 1024 * 1024) {
        alert(`Video must be ${MAX_VIDEO_MB} MB or less.`);
        return;
      }
      setVideo({ status: 'picked', uri: asset.uri, fileName: asset.name ?? 'video.mp4', remoteUrl: null });
    } catch { /* ignore */ }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (anyUploading) return;
    const payload: Record<string, any> = {};
    if (form.name)        payload.name        = form.name;
    if (form.description) payload.description = form.description;
    if (form.locationName) payload.locationName = form.locationName;
    if (form.virtualLink)  payload.virtualLink  = form.virtualLink;
    if (form.capacity)     payload.capacity     = Number(form.capacity);
    if (form.startsAt)     payload.startsAt     = form.startsAt;
    if (form.endsAt)       payload.endsAt       = form.endsAt;
    // local media URIs are passed through so the parent can upload them
    payload.flierUri      = flier.uri ?? null;
    payload.flierUrl      = flier.remoteUrl ?? null;
    payload.promoVideoUri = video.uri ?? null;
    payload.promoVideoUrl = video.remoteUrl ?? null;
    await onSave(payload);
  };

  const showLocation     = !event?.mode || event.mode === 'ONSITE'  || event.mode === 'HYBRID';
  const showVirtualLink  = event?.mode === 'VIRTUAL' || event?.mode === 'HYBRID';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        {/* Header */}
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
          />

          <FieldInput
            label="Description"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Describe your event"
            multiline
            disabled={locked}
          />

          <FieldInput
            label="Start (YYYY-MM-DD HH:MM)"
            value={form.startsAt}
            onChangeText={(v) => setForm((f) => ({ ...f, startsAt: v }))}
            placeholder="2026-09-15 20:00"
            disabled={locked}
          />

          <FieldInput
            label="End (YYYY-MM-DD HH:MM)"
            value={form.endsAt}
            onChangeText={(v) => setForm((f) => ({ ...f, endsAt: v }))}
            placeholder="2026-09-15 23:00"
            disabled={locked}
          />

          {showLocation && (
            <FieldInput
              label="Location"
              value={form.locationName}
              onChangeText={(v) => setForm((f) => ({ ...f, locationName: v }))}
              placeholder="Venue name or address"
              disabled={locked}
            />
          )}

          {showVirtualLink && (
            <FieldInput
              label="Meeting Link"
              value={form.virtualLink}
              onChangeText={(v) => setForm((f) => ({ ...f, virtualLink: v }))}
              placeholder="https://meet.example.com/..."
              disabled={locked}
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

          {/* Flier */}
          <Text style={s.sectionLabel}>Event Flyer</Text>
          <FlierPicker
            state={flier}
            locked={locked}
            onPick={pickFlier}
            onRemove={() => setFlier(IDLE_MEDIA)}
          />

          {/* Promo video */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Promotional Video</Text>
          <VideoPicker
            state={video}
            locked={locked}
            onPick={pickVideo}
            onRemove={() => setVideo(IDLE_MEDIA)}
          />

          {/* Actions */}
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
    locationName: event?.locationName  ?? '',
    virtualLink:  event?.virtualLink   ?? '',
    capacity:     event?.capacity != null ? String(event.capacity) : '',
    startsAt:     toLocalInput(event?.startsAt),
    endsAt:       toLocalInput(event?.endsAt),
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
    bottom: 0,
    left: 0,
    right: 0,
    top: '10%',
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
