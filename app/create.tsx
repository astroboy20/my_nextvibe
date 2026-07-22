import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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

// Lazy-load pickers — avoids crash if native module isn't ready in Expo Go
let ImagePicker: typeof import('expo-image-picker') | null = null;
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { DocumentPicker = require('expo-document-picker'); } catch {}

// ─── Data ─────────────────────────────────────────────────────────────────────

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

// ─── Reusable components ──────────────────────────────────────────────────────

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
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: any;
  error?: string;
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          field.input,
          multiline && field.textarea,
          focused && field.inputFocused,
          !!error && field.inputError,
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

function MediaBox({
  icon,
  title,
  subtitle,
  fileName,
  onPress,
  onRemove,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  fileName?: string | null;
  onPress: () => void;
  onRemove: () => void;
}) {
  if (fileName) {
    return (
      <View style={media.picked}>
        <Ionicons name={icon} size={20} color={brand.primary} />
        <Text style={media.fileName} numberOfLines={1}>{fileName}</Text>
        <TouchableOpacity onPress={onRemove} style={media.removeBtn} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={20} color={neutral[400]} />
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <TouchableOpacity style={media.box} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={26} color={neutral[400]} />
      <Text style={media.title}>{title}</Text>
      {subtitle && <Text style={media.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
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
  virtualLink: string;
  date: string;
  time: string;
  flierName: string | null;
  videoName: string | null;
}

const INITIAL: FormState = {
  name: '',
  description: '',
  tier: '',
  visibility: '',
  tags: [],
  eventMode: '',
  locationName: '',
  virtualLink: '',
  date: '',
  time: '',
  flierName: null,
  videoName: null,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const set = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const showLocation = form.eventMode === 'ONSITE' || form.eventMode === 'HYBRID';
  const showVirtual  = form.eventMode === 'VIRTUAL' || form.eventMode === 'HYBRID';
  const availableTags = EVENT_TYPES.filter((t) => !form.tags.includes(t.id));

  const pickFlier = async () => {
    if (!ImagePicker) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        set('flierName', result.assets[0].uri.split('/').pop() ?? 'flyer.jpg');
      }
    } catch (e) { console.warn('Image picker error', e); }
  };

  const pickVideo = async () => {
    if (!DocumentPicker) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm'],
        copyToCacheDirectory: false,
      });
      if (result.assets?.[0]) set('videoName', result.assets[0].name);
    } catch (e) { console.warn('Document picker error', e); }
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())  e.name = 'Event title is required';
    if (!form.tier)         e.tier = 'Event tier is required';
    if (!form.visibility)   e.visibility = 'Event type is required';
    if (!form.eventMode)    e.eventMode = 'Event mode is required';
    if (form.tags.length === 0) e.tags = 'Select at least one tag';
    if (showLocation && !form.locationName.trim()) e.locationName = 'Location is required';
    if (showVirtual  && !form.virtualLink.trim())  e.virtualLink = 'Meeting link is required';
    if (showVirtual  && form.virtualLink && !form.virtualLink.startsWith('https://')) {
      e.virtualLink = 'Meeting link must start with https://';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    // TODO: replace with actual API call
    setTimeout(() => {
      setSubmitting(false);
      router.back();
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Event</Text>
          <Text style={styles.headerSub}>Share your next experience</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Event Type (public/private) — now a select */}
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

          {/* Date & Time */}
          <View style={styles.group}>
            <FieldLabel text="Date & Time" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <StyledInput value={form.date} onChangeText={(v) => set('date', v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <StyledInput value={form.time} onChangeText={(v) => set('time', v)} placeholder="HH:MM" keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* Location */}
          {showLocation && (
            <View style={styles.group}>
              <FieldLabel text="Location" required={form.eventMode === 'ONSITE'} />
              <StyledInput
                value={form.locationName}
                onChangeText={(v) => set('locationName', v)}
                placeholder="Search or enter location"
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
              fileName={form.flierName}
              onPress={pickFlier}
              onRemove={() => set('flierName', null)}
            />
          </View>

          {/* Video */}
          <View style={styles.group}>
            <FieldLabel text="Promotional Video" />
            <MediaBox
              icon="videocam-outline"
              title="Upload promotional video"
              subtitle="MP4, MOV or WebM · max 350 MB"
              fileName={form.videoName}
              onPress={pickVideo}
              onRemove={() => set('videoName', null)}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitLabel}>Create Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: neutral[100],
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[900] },
  headerSub:   { fontFamily: fontFamily.regular, fontSize: 12, color: neutral[500], marginTop: 1 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  group:   { marginBottom: 20 },
  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  row:     { flexDirection: 'row' },
  hint:    { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], marginTop: 4 },

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
  label:       { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700], marginBottom: 6 },
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
  textarea:         { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  inputFocused:     { borderColor: brand.primary },
  inputError:       { borderColor: semantic.error },
  errorText:        { fontFamily: fontFamily.regular, fontSize: 11, color: semantic.error, marginTop: 4 },
  selectRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue:      { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], flex: 1 },
  selectPlaceholder:{ fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], flex: 1 },
});

const chip = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${brand.primary}12`,
    borderWidth: 1,
    borderColor: `${brand.primary}30`,
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
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  fileName:  { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700] },
  removeBtn: { padding: 4 },
});

const drop = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '65%',
  },
  title:          { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[800], marginBottom: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  itemActive:      { backgroundColor: `${brand.primary}08` },
  itemLabel:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700], flex: 1 },
  itemLabelActive: { fontFamily: fontFamily.semibold, color: brand.primary },
  itemSub:         { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginRight: 8 },
});
