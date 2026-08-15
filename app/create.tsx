import AddressSearch from '@/components/create/AddressSearch';
import { AppHeader } from '@/components/navigation/TopNavBar';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useCreateEventMutation, useUploadIntentMutation } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Lazy-load native pickers
let ImagePicker: typeof import('expo-image-picker') | null = null;
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { DocumentPicker = require('expo-document-picker'); } catch {}

// ─── Static data ──────────────────────────────────────────────────────────────

const EVENT_TIERS = [
  { id: 'MICRO',      label: 'Micro',      sub: '50 Attendees' },
  { id: 'SMALL',      label: 'Small',      sub: '200 Attendees' },
  { id: 'MEDIUM',     label: 'Medium',     sub: '500 Attendees' },
  { id: 'LARGE',      label: 'Large',      sub: '2,000 Attendees' },
  { id: 'ENTERPRISE', label: 'Enterprise', sub: 'Unlimited' },
];

const EVENT_VISIBILITY = [
  { id: 'public',  label: 'Public' },
  { id: 'private', label: 'Private' },
];

const EVENT_TYPES = [
  { id: 'concert',    name: 'Concert' },
  { id: 'conference', name: 'Conference' },
  { id: 'workshop',   name: 'Workshop' },
  { id: 'webinar',    name: 'Webinar' },
  { id: 'festival',   name: 'Festival' },
  { id: 'party',      name: 'Party' },
  { id: 'sports',     name: 'Sports Event' },
  { id: 'exhibition', name: 'Exhibition' },
  { id: 'networking', name: 'Networking Event' },
  { id: 'seminar',    name: 'Seminar' },
  { id: 'wedding',    name: 'Wedding' },
  { id: 'birthday',   name: 'Birthday Party' },
  { id: 'religious',  name: 'Religious Event' },
  { id: 'launch',     name: 'Product Launch' },
  { id: 'others',     name: 'Others' },
];

const EVENT_MODES = [
  { id: 'ONSITE',  label: 'Onsite' },
  { id: 'HYBRID',  label: 'Hybrid' },
  { id: 'VIRTUAL', label: 'Virtual' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDisplayTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Upload a file to a presigned URL via XMLHttpRequest (supports progress)
function uploadToUrl(
  uri: string,
  uploadUrl: string,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error'));

    // React Native fetch-friendly body
    fetch(uri)
      .then((r) => r.blob())
      .then((blob) => xhr.send(blob))
      .catch(reject);
  });
}

// ─── Date/Time picker modal ───────────────────────────────────────────────────

/**
 * Pure-JS date/time picker that works on all platforms without native modules.
 * Renders inline scroll columns for year, month, day, hour, minute, AM/PM.
 */
function DateTimePicker({
  visible,
  initial,
  mode,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initial: Date;
  mode: 'date' | 'time';
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Date>(initial);

  // Re-sync when opened
  React.useEffect(() => {
    if (visible) setSelected(initial);
  }, [visible]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const years  = Array.from({ length: 6 }, (_, i) => now.getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const days   = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours  = Array.from({ length: 12 }, (_, i) => i + 1);   // 1-12
  const mins   = Array.from({ length: 60 }, (_, i) => i);

  const isAM = selected.getHours() < 12;
  const display12h = selected.getHours() % 12 || 12;

  const setYear  = (y: number)  => setSelected((d) => { const n = new Date(d); n.setFullYear(y); return n; });
  const setMonth = (m: number)  => setSelected((d) => { const n = new Date(d); n.setMonth(m); return n; });
  const setDay   = (day: number)=> setSelected((d) => { const n = new Date(d); n.setDate(day); return n; });
  const setHour  = (h: number)  => setSelected((d) => {
    const n = new Date(d);
    n.setHours(isAM ? h % 12 : (h % 12) + 12);
    return n;
  });
  const setMin   = (m: number)  => setSelected((d) => { const n = new Date(d); n.setMinutes(m); return n; });
  const toggleAM = () => setSelected((d) => {
    const n = new Date(d);
    n.setHours(isAM ? n.getHours() + 12 : n.getHours() - 12);
    return n;
  });

  function Column<T>({
    items,
    selected: sel,
    format,
    onSelect,
    width = 56,
  }: {
    items: T[];
    selected: T;
    format: (v: T) => string;
    onSelect: (v: T) => void;
    width?: number;
  }) {
    return (
      <ScrollView
        style={{ width, maxHeight: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={String(item)}
            style={[pk.colItem, item === sel && pk.colItemActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={[pk.colText, item === sel && pk.colTextActive]}>
              {format(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pk.backdrop}>
        <View style={pk.sheet}>
          {/* Header */}
          <View style={pk.header}>
            <TouchableOpacity onPress={onCancel} style={pk.headerBtn}>
              <Text style={pk.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={pk.headerTitle}>{mode === 'date' ? 'Select Date' : 'Select Time'}</Text>
            <TouchableOpacity onPress={() => onConfirm(selected)} style={pk.headerBtn}>
              <Text style={pk.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={pk.preview}>
            <Text style={pk.previewText}>
              {mode === 'date' ? formatDisplayDate(selected) : formatDisplayTime(selected)}
            </Text>
          </View>

          {/* Columns */}
          <View style={pk.columns}>
            {mode === 'date' ? (
              <>
                <Column items={months} selected={selected.getMonth()} format={(m) => MONTHS[m]} onSelect={setMonth} width={52} />
                <Column items={days} selected={selected.getDate()} format={(d) => pad(d)} onSelect={setDay} width={44} />
                <Column items={years} selected={selected.getFullYear()} format={String} onSelect={setYear} width={64} />
              </>
            ) : (
              <>
                <Column items={hours} selected={display12h} format={String} onSelect={setHour} width={44} />
                <Text style={pk.colon}>:</Text>
                <Column items={mins} selected={selected.getMinutes()} format={(m) => pad(m)} onSelect={setMin} width={44} />
                <TouchableOpacity style={pk.ampmBtn} onPress={toggleAM} activeOpacity={0.8}>
                  <Text style={pk.ampmText}>{isAM ? 'AM' : 'PM'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────

function SuccessModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <Modal visible transparent animationType="fade">
      <Pressable
        style={sm.backdrop}
        onPress={onClose}
      >
        <Pressable style={sm.card} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity style={sm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={neutral[400]} />
          </TouchableOpacity>

          {/* Header band */}
          <View style={sm.banner}>
            <View style={sm.iconCircle}>
              <Ionicons name="checkmark-circle" size={36} color="#fff" />
            </View>
            <Text style={sm.bannerTitle}>Event Created!</Text>
            <Text style={sm.bannerSub}>What would you like to do next?</Text>
          </View>

          {/* Actions */}
          <View style={sm.actions}>
            <TouchableOpacity
              style={sm.primaryBtn}
              activeOpacity={0.85}
              onPress={() => { onClose(); router.push({ pathname: '/edit-event', params: { id: eventId } } as any); }}
            >
              <Ionicons name="grid-outline" size={18} color="#fff" />
              <Text style={sm.primaryBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={sm.outlineBtn}
              activeOpacity={0.85}
              onPress={() => { onClose(); router.push({ pathname: '/edit-event', params: { id: eventId } } as any); }}
            >
              <Ionicons name="create-outline" size={18} color={brand.primary} />
              <Text style={sm.outlineBtnText}>Continue Editing</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Reusable field components ────────────────────────────────────────────────

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={field.label}>
      {text}
      {required && <Text style={{ color: semantic.error }}> *</Text>}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  error,
  editable = true,
}: {
  value: string;
  onChangeText?: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: any;
  error?: string;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={neutral[400]}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          field.input,
          multiline && field.textarea,
          focused && editable && field.inputFocused,
          !!error && field.inputError,
          !editable && field.inputDisabled,
        ]}
      />
      {!!error && <Text style={field.errorText}>{error}</Text>}
    </>
  );
}

function SelectDropdown({
  placeholder,
  value,
  options,
  onSelect,
  error,
}: {
  placeholder: string;
  value: string;
  options: { id: string; label: string; sub?: string }[];
  onSelect: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <>
      <TouchableOpacity
        style={[field.input, field.selectRow, !!error && field.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={selected ? field.selectValue : field.selectPlaceholder}>
          {selected
            ? `${selected.label}${selected.sub ? ` — ${selected.sub}` : ''}`
            : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={neutral[500]} />
      </TouchableOpacity>
      {!!error && <Text style={field.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={drop.backdrop} onPress={() => setOpen(false)}>
          <View style={drop.sheet}>
            <Text style={drop.title}>{placeholder}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[drop.item, opt.id === value && drop.itemActive]}
                  onPress={() => { onSelect(opt.id); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[drop.itemLabel, opt.id === value && drop.itemLabelActive]}>
                      {opt.label}
                    </Text>
                    {opt.sub && <Text style={drop.itemSub}>{opt.sub}</Text>}
                  </View>
                  {opt.id === value && (
                    <Ionicons name="checkmark-circle" size={18} color={brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function TagChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={chip.container}>
      <Text style={chip.label}>{label}</Text>
      <TouchableOpacity onPress={onRemove} style={chip.remove} activeOpacity={0.7}>
        <Ionicons name="close" size={12} color={brand.primary} />
      </TouchableOpacity>
    </View>
  );
}

// Upload state per-file
interface UploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  url: string | null;
  localUri: string | null;
  fileName: string | null;
}
const IDLE_UPLOAD: UploadState = { status: 'idle', progress: 0, url: null, localUri: null, fileName: null };

function MediaBox({
  icon,
  title,
  subtitle,
  upload,
  onPick,
  onRemove,
  onRetry,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  upload: UploadState;
  onPick: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  if (upload.status === 'idle') {
    return (
      <TouchableOpacity style={media.box} onPress={onPick} activeOpacity={0.8}>
        <Ionicons name={icon} size={26} color={neutral[400]} />
        <Text style={media.title}>{title}</Text>
        {subtitle && <Text style={media.subtitle}>{subtitle}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={media.picked}>
      {upload.status === 'uploading' ? (
        <>
          <ActivityIndicator size="small" color={brand.primary} />
          <View style={{ flex: 1, marginLeft: 10, gap: 4 }}>
            <Text style={media.fileName} numberOfLines={1}>{upload.fileName}</Text>
            <View style={media.progressTrack}>
              <View style={[media.progressFill, { width: `${upload.progress}%` as any }]} />
            </View>
            <Text style={media.progressText}>{upload.progress}%</Text>
          </View>
        </>
      ) : upload.status === 'error' ? (
        <>
          <Ionicons name="alert-circle" size={20} color={semantic.error} />
          <Text style={[media.fileName, { color: semantic.error, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
            Upload failed
          </Text>
          <TouchableOpacity onPress={onRetry} style={media.retryBtn} activeOpacity={0.7}>
            <Text style={media.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={media.removeBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={neutral[400]} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name={icon} size={20} color={brand.primary} />
          <Text style={media.fileName} numberOfLines={1}>{upload.fileName}</Text>
          <Ionicons name="checkmark-circle" size={18} color={semantic.success} style={{ marginRight: 4 }} />
          <TouchableOpacity onPress={onRemove} style={media.removeBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={neutral[400]} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  tier: string;
  visibility: string;
  tags: string[];
  eventMode: string;
  locationName: string;
  coordinates: { lat: number; lon: number } | null;
  virtualLink: string;
  startsAt: Date | null;
}

const INITIAL: FormState = {
  name: '',
  description: '',
  tier: '',
  visibility: '',
  tags: [],
  eventMode: '',
  locationName: '',
  coordinates: null,
  virtualLink: '',
  startsAt: null,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const router = useRouter();
  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [uploadIntent] = useUploadIntentMutation();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Date/time pickers
  const [datePicker, setDatePicker] = useState(false);
  const [timePicker, setTimePicker] = useState(false);

  // Tag picker
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // Success modal
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // File uploads
  const [flierUpload, setFlierUpload] = useState<UploadState>(IDLE_UPLOAD);
  const [videoUpload, setVideoUpload] = useState<UploadState>(IDLE_UPLOAD);

  // Keep latest upload state in refs for retry closures
  const flierLocalRef = useRef<{ uri: string; name: string; type: string } | null>(null);
  const videoLocalRef = useRef<{ uri: string; name: string; type: string } | null>(null);

  const set = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const showLocation = form.eventMode === 'ONSITE' || form.eventMode === 'HYBRID';
  const showVirtual  = form.eventMode === 'VIRTUAL' || form.eventMode === 'HYBRID';
  const availableTags = EVENT_TYPES.filter((t) => !form.tags.includes(t.id));
  const anyUploading = flierUpload.status === 'uploading' || videoUpload.status === 'uploading';

  // ── Upload helpers ─────────────────────────────────────────────────────────

  const doFlierUpload = useCallback(async (file: { uri: string; name: string; type: string }) => {
    flierLocalRef.current = file;
    setFlierUpload({ status: 'uploading', progress: 0, url: null, localUri: file.uri, fileName: file.name });
    try {
      const intent = await uploadIntent({ filename: file.name, contentType: file.type, folder: 'events' }).unwrap();
      await uploadToUrl(file.uri, intent.data.uploadUrl, file.type, (pct) =>
        setFlierUpload((p) => ({ ...p, progress: pct }))
      );
      setFlierUpload({ status: 'done', progress: 100, url: intent.data.fileUrl, localUri: file.uri, fileName: file.name });
    } catch {
      setFlierUpload((p) => ({ ...p, status: 'error', progress: 0 }));
      Toast.show({ type: 'error', text1: 'Flyer upload failed', text2: 'Tap retry to try again' });
    }
  }, [uploadIntent]);

  const doVideoUpload = useCallback(async (file: { uri: string; name: string; type: string }) => {
    videoLocalRef.current = file;
    setVideoUpload({ status: 'uploading', progress: 0, url: null, localUri: file.uri, fileName: file.name });
    try {
      const intent = await uploadIntent({ filename: file.name, contentType: file.type, folder: 'events' }).unwrap();
      await uploadToUrl(file.uri, intent.data.uploadUrl, file.type, (pct) =>
        setVideoUpload((p) => ({ ...p, progress: pct }))
      );
      setVideoUpload({ status: 'done', progress: 100, url: intent.data.fileUrl, localUri: file.uri, fileName: file.name });
    } catch {
      setVideoUpload((p) => ({ ...p, status: 'error', progress: 0 }));
      Toast.show({ type: 'error', text1: 'Video upload failed', text2: 'Tap retry to try again' });
    }
  }, [uploadIntent]);

  const pickFlier = async () => {
    if (!ImagePicker) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission required', 'Please allow access to your photo library.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const name = asset.uri.split('/').pop() ?? 'flyer.jpg';
        const type = asset.mimeType ?? 'image/jpeg';
        doFlierUpload({ uri: asset.uri, name, type });
      }
    } catch (e) { console.warn('Image picker error', e); }
  };

  const pickVideo = async () => {
    if (!DocumentPicker) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm'],
        copyToCacheDirectory: true,
      });
      if (result.assets?.[0]) {
        const asset = result.assets[0];
        doVideoUpload({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'video/mp4' });
      }
    } catch (e) { console.warn('Document picker error', e); }
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())       e.name = 'Event title is required';
    if (!form.tier)              e.tier = 'Event tier is required';
    if (!form.visibility)        e.visibility = 'Event type is required';
    if (!form.eventMode)         e.eventMode = 'Event mode is required';
    if (form.tags.length === 0)  e.tags = 'Select at least one tag';
    if (!form.startsAt)          e.startsAt = 'Date & time is required';
    if (showLocation && !form.locationName.trim()) e.locationName = 'Location is required';
    if (showVirtual  && !form.virtualLink.trim())  e.virtualLink = 'Meeting link is required';
    if (showVirtual  && form.virtualLink && !form.virtualLink.startsWith('https://')) {
      e.virtualLink = 'Meeting link must start with https://';
    }
    if (flierUpload.status === 'error') e.name = (e.name ?? '') || 'Flyer upload failed — please retry';
    if (videoUpload.status === 'error') e.name = (e.name ?? '') || 'Video upload failed — please retry';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    if (anyUploading) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Uploads still in progress…' });
      return;
    }

    try {
      const body: Record<string, any> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.visibility === 'public',
        mode: form.eventMode,
        tier: form.tier,
        startsAt: form.startsAt!.toISOString(),
        tags: form.tags,
        ...(flierUpload.url  && { flierUrl:     flierUpload.url }),
        ...(videoUpload.url  && { promoVideoUrl: videoUpload.url }),
      };

      if (showLocation) {
        body.locationName = form.locationName.trim();
        if (form.coordinates) {
          body.latitude  = form.coordinates.lat;
          body.longitude = form.coordinates.lon;
        }
      }
      if (showVirtual) {
        body.virtualLink = form.virtualLink.trim();
      }

      const res = await createEvent(body).unwrap();
      const eventId = res?.data?.id ?? '';
      setCreatedEventId(eventId);
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message ?? 'Failed to create event. Please try again.';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg, visibilityTime: 4000 });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageIconWrap}>
              <Ionicons name="calendar-outline" size={22} color={brand.primary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Create Event</Text>
              <Text style={styles.pageSub}>Share your next experience</Text>
            </View>
          </View>

          {/* Event Title */}
          <View style={styles.group}>
            <FieldLabel text="Event Title" required />
            <StyledInput value={form.name} onChangeText={(v) => set('name', v)} placeholder="Give your event a name" error={errors.name} />
          </View>

          {/* Description */}
          <View style={styles.group}>
            <FieldLabel text="Event Description" />
            <StyledInput value={form.description} onChangeText={(v) => set('description', v)} placeholder="Give your event description" multiline />
          </View>

          {/* Tier */}
          <View style={styles.group}>
            <FieldLabel text="Event Tier" required />
            <SelectDropdown
              placeholder="Select event tier"
              value={form.tier}
              options={EVENT_TIERS}
              onSelect={(v) => set('tier', v)}
              error={errors.tier}
            />
          </View>

          {/* Visibility */}
          <View style={styles.group}>
            <FieldLabel text="Event Type" required />
            <SelectDropdown
              placeholder="Select event type"
              value={form.visibility}
              options={EVENT_VISIBILITY}
              onSelect={(v) => set('visibility', v)}
              error={errors.visibility}
            />
          </View>

          {/* Tags */}
          <View style={styles.group}>
            <FieldLabel text="Event Tags" required />
            {availableTags.length > 0 && (
              <TouchableOpacity
                style={[field.input, field.selectRow]}
                onPress={() => setTagPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={form.tags.length > 0 ? field.selectValue : field.selectPlaceholder}>
                  {form.tags.length > 0
                    ? `${form.tags.length} tag${form.tags.length > 1 ? 's' : ''} selected`
                    : 'Select event category'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={neutral[500]} />
              </TouchableOpacity>
            )}
            {form.tags.length > 0 && (
              <View style={styles.tagRow}>
                {form.tags.map((tagId) => {
                  const tag = EVENT_TYPES.find((t) => t.id === tagId);
                  return (
                    <TagChip
                      key={tagId}
                      label={tag?.name ?? tagId}
                      onRemove={() => set('tags', form.tags.filter((t) => t !== tagId))}
                    />
                  );
                })}
              </View>
            )}
            {!!errors.tags && <Text style={field.errorText}>{errors.tags}</Text>}
          </View>

          {/* Event Mode */}
          <View style={styles.group}>
            <FieldLabel text="Event Mode" required />
            <SelectDropdown
              placeholder="Select event mode"
              value={form.eventMode}
              options={EVENT_MODES}
              onSelect={(v) => {
                set('eventMode', v);
                if (v === 'VIRTUAL') set('locationName', '');
                if (v === 'ONSITE')  set('virtualLink', '');
              }}
              error={errors.eventMode}
            />
          </View>

          {/* Date & Time — native pickers */}
          <View style={styles.group}>
            <FieldLabel text="Date & Time" required />
            <View style={styles.dateTimeRow}>
              {/* Date picker trigger */}
              <TouchableOpacity
                style={[styles.dateTimeBtn, !!errors.startsAt && field.inputError]}
                onPress={() => setDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={brand.primary} style={{ marginRight: 8 }} />
                <Text style={form.startsAt ? styles.dateTimeValue : styles.dateTimePlaceholder}>
                  {form.startsAt ? formatDisplayDate(form.startsAt) : 'Select date'}
                </Text>
              </TouchableOpacity>

              {/* Time picker trigger */}
              <TouchableOpacity
                style={[styles.dateTimeBtn, styles.timeBtn, !!errors.startsAt && field.inputError]}
                onPress={() => setTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color={brand.primary} style={{ marginRight: 8 }} />
                <Text style={form.startsAt ? styles.dateTimeValue : styles.dateTimePlaceholder}>
                  {form.startsAt ? formatDisplayTime(form.startsAt) : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>
            {!!errors.startsAt && <Text style={field.errorText}>{errors.startsAt}</Text>}
          </View>

          {/* Location */}
          {showLocation && (
            <View style={styles.group}>
              <FieldLabel text="Location" required={form.eventMode === 'ONSITE'} />
              <AddressSearch
                value={form.locationName}
                onChange={(v, coords) => {
                  set('locationName', v);
                  setForm((p) => ({ ...p, coordinates: coords ?? null }));
                  setErrors((p) => ({ ...p, locationName: undefined }));
                }}
                error={errors.locationName}
              />
            </View>
          )}

          {/* Meeting Link */}
          {showVirtual && (
            <View style={styles.group}>
              <FieldLabel text="Meeting Link" required />
              <StyledInput
                value={form.virtualLink}
                onChangeText={(v) => set('virtualLink', v)}
                placeholder="https://meetinglink.us"
                keyboardType="url"
                error={errors.virtualLink}
              />
              <Text style={styles.hint}>Supports Zoom, Google Meet, Teams, or any HTTPS URL</Text>
            </View>
          )}

          {/* Flyer */}
          <View style={styles.group}>
            <FieldLabel text="Event Flyer" />
            <MediaBox
              icon="image-outline"
              title="Upload flyer image"
              subtitle="PNG or JPEG · max 10 MB"
              upload={flierUpload}
              onPick={pickFlier}
              onRemove={() => { setFlierUpload(IDLE_UPLOAD); flierLocalRef.current = null; }}
              onRetry={() => { if (flierLocalRef.current) doFlierUpload(flierLocalRef.current); }}
            />
          </View>

          {/* Video */}
          <View style={styles.group}>
            <FieldLabel text="Promotional Video" />
            <MediaBox
              icon="videocam-outline"
              title="Upload promotional video"
              subtitle="MP4, MOV or WebM · max 350 MB"
              upload={videoUpload}
              onPick={pickVideo}
              onRemove={() => { setVideoUpload(IDLE_UPLOAD); videoLocalRef.current = null; }}
              onRetry={() => { if (videoLocalRef.current) doVideoUpload(videoLocalRef.current); }}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (creating || anyUploading) && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={creating || anyUploading}
            activeOpacity={0.85}
          >
            {creating ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitLabel}>Creating event…</Text>
              </>
            ) : anyUploading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitLabel}>Uploading files…</Text>
              </>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitLabel}>Create Event</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker */}
      <DateTimePicker
        visible={datePicker}
        initial={form.startsAt ?? new Date()}
        mode="date"
        onConfirm={(d) => {
          const merged = form.startsAt ? new Date(form.startsAt) : new Date();
          merged.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          set('startsAt', merged);
          setDatePicker(false);
        }}
        onCancel={() => setDatePicker(false)}
      />

      {/* Time picker */}
      <DateTimePicker
        visible={timePicker}
        initial={form.startsAt ?? new Date()}
        mode="time"
        onConfirm={(d) => {
          const merged = form.startsAt ? new Date(form.startsAt) : new Date();
          merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
          set('startsAt', merged);
          setTimePicker(false);
        }}
        onCancel={() => setTimePicker(false)}
      />

      {/* Tag picker sheet */}
      <Modal visible={tagPickerOpen} transparent animationType="fade">
        <Pressable style={drop.backdrop} onPress={() => setTagPickerOpen(false)}>
          <View style={drop.sheet}>
            <Text style={drop.title}>Select Event Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={drop.item}
                  onPress={() => { set('tags', [...form.tags, tag.id]); setTagPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={drop.itemLabel}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Success modal */}
      {!!createdEventId && (
        <SuccessModal
          eventId={createdEventId}
          onClose={() => { setCreatedEventId(null); setForm(INITIAL); setFlierUpload(IDLE_UPLOAD); setVideoUpload(IDLE_UPLOAD); }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  scrollContent:  { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  group:          { marginBottom: 20 },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  hint:           { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], marginTop: 4 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: neutral[900] },
  pageSub:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], marginTop: 1 },

  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  timeBtn: { flex: 1 },
  dateTimeValue:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], flex: 1 },
  dateTimePlaceholder: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], flex: 1 },

  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: '#fff' },
});

const field = StyleSheet.create({
  label:            { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700], marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: neutral[200],
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    backgroundColor: '#fff',
  },
  textarea:          { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  inputFocused:      { borderColor: brand.primary },
  inputError:        { borderColor: semantic.error },
  inputDisabled:     { backgroundColor: neutral[50] },
  errorText:         { fontFamily: fontFamily.regular, fontSize: 11, color: semantic.error, marginTop: 4 },
  selectRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], flex: 1 },
  selectPlaceholder: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], flex: 1 },
});

const chip = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${brand.primary}12`,
    borderWidth: 1, borderColor: `${brand.primary}30`,
  },
  label:  { fontFamily: fontFamily.semibold, fontSize: 12, color: brand.primary },
  remove: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
});

const media = StyleSheet.create({
  box: {
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: neutral[50],
  },
  title:    { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[500] },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  picked: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  fileName:      { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700] },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: neutral[200], overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2, backgroundColor: brand.primary },
  progressText:  { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] },
  removeBtn:     { padding: 4 },
  retryBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${brand.primary}15`,
  },
  retryText: { fontFamily: fontFamily.semibold, fontSize: 11, color: brand.primary },
});

const drop = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40,
    maxHeight: '65%',
  },
  title:           { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[800], marginBottom: 12 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  itemActive:      { backgroundColor: `${brand.primary}08` },
  itemLabel:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], flex: 1 },
  itemLabelActive: { fontFamily: fontFamily.semibold, color: brand.primary },
  itemSub:         { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginRight: 8 },
});

// Date/time picker styles
const pk = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200],
  },
  headerBtn:   { paddingHorizontal: 4, minWidth: 60 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: neutral[900] },
  cancelText:  { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  confirmText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: brand.primary, textAlign: 'right' },

  preview: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: `${brand.primary}08`,
  },
  previewText: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: brand.primary },

  columns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  colon: { fontFamily: fontFamily.bold, fontSize: 24, color: neutral[400], marginBottom: 4 },

  colItem: {
    height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  colItemActive: { backgroundColor: `${brand.primary}15` },
  colText:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  colTextActive: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: brand.primary },

  ampmBtn: {
    width: 56, height: 44, borderRadius: 10,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  ampmText: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: brand.primary },
});

// Success modal styles
const sm = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%', maxWidth: 400,
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  banner: {
    backgroundColor: brand.primary,
    paddingTop: 32, paddingBottom: 24,
    alignItems: 'center', gap: 8,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  bannerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: '#fff' },
  bannerSub:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.75)' },

  actions: { padding: 20, gap: 12 },
  primaryBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: brand.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: '#fff' },
  outlineBtn: {
    height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: `${brand.primary}40`,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: `${brand.primary}06`,
  },
  outlineBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: brand.primary },
});
