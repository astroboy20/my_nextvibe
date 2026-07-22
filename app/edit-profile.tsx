import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Lazy-load image picker
let ImagePicker: typeof import('expo-image-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateForm(values: FormState) {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!values.displayName.trim()) {
    e.displayName = 'Display name is required';
  } else if (values.displayName.trim().length < 2) {
    e.displayName = 'Display name must be at least 2 characters';
  } else if (values.displayName.trim().length > 50) {
    e.displayName = 'Display name must be 50 characters or less';
  }
  if (!values.username.trim()) {
    e.username = 'Username is required';
  } else if (values.username.trim().length < 3) {
    e.username = 'Username must be at least 3 characters';
  } else if (values.username.trim().length > 20) {
    e.username = 'Username must be 20 characters or less';
  } else if (!/^[a-zA-Z0-9_]+$/.test(values.username)) {
    e.username = 'Only letters, numbers and underscores allowed';
  }
  if (values.bio && values.bio.length > 160) {
    e.bio = 'Bio must be 160 characters or less';
  }
  return e;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUri: string | null;
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function AvatarPicker({
  uri,
  name,
  uploading,
  onPick,
}: {
  uri: string | null;
  name: string;
  uploading: boolean;
  onPick: () => void;
}) {
  const initials = name?.charAt(0)?.toUpperCase() || 'U';
  return (
    <View style={av.wrap}>
      <TouchableOpacity onPress={onPick} activeOpacity={0.85} disabled={uploading}>
        <View style={av.circle}>
          {uri ? (
            // Using View as placeholder since Image needs a URI to show
            <View style={[av.circle, { backgroundColor: brand.primaryLight }]}>
              <Text style={av.initials}>{initials}</Text>
            </View>
          ) : (
            <View style={[av.circle, { backgroundColor: brand.primary }]}>
              <Text style={av.initials}>{initials}</Text>
            </View>
          )}
          {/* Camera badge */}
          <View style={av.badge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <Text style={av.hint}>Tap to change photo</Text>
    </View>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  icon,
  disabled,
  multiline,
  maxLength,
  error,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  error?: string;
  keyboardType?: any;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={f.group}>
      <Text style={f.label}>{label}</Text>
      <View
        style={[
          f.inputWrap,
          focused && !disabled && f.inputFocused,
          !!error && f.inputError,
          disabled && f.inputDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? neutral[300] : neutral[500]}
            style={f.icon}
          />
        )}
        {prefix && <Text style={[f.prefix, disabled && { color: neutral[300] }]}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={neutral[400]}
          editable={!disabled}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            f.input,
            multiline && f.multiline,
            disabled && f.inputTextDisabled,
          ]}
        />
        {multiline && maxLength && (
          <Text style={f.charCount}>{value.length}/{maxLength}</Text>
        )}
      </View>
      {!!error && <Text style={f.error}>{error}</Text>}
      {!!hint && !error && <Text style={f.hint}>{hint}</Text>}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();

  // Mock initial state — replace with API data
  const [form, setForm] = useState<FormState>({
    displayName: 'Nextvibe User',
    username:    'nextvibeuser',
    email:       'user@nextvibe.com',
    bio:         '',
    avatarUri:   null,
  });
  const [errors, setErrors]     = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof FormState, value: string | null) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handlePickAvatar = async () => {
    if (!ImagePicker) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        // TODO: upload to presigned URL here, then store returned URL
        setTimeout(() => {
          set('avatarUri', result.assets[0].uri);
          setUploading(false);
        }, 800);
      }
    } catch (e) { console.warn(e); }
  };

  const handleSave = async () => {
    const e = validateForm(form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    // TODO: call updateUser API here
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
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
          {/* Avatar */}
          <AvatarPicker
            uri={form.avatarUri}
            name={form.displayName}
            uploading={uploading}
            onPick={handlePickAvatar}
          />

          {/* Profile Information card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile Information</Text>

            <Field
              label="Display Name"
              value={form.displayName}
              onChangeText={(v) => set('displayName', v)}
              placeholder="Your name"
              icon="person-outline"
              maxLength={50}
              error={errors.displayName}
            />

            <Field
              label="Username"
              value={form.username}
              onChangeText={(v) => set('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              prefix="@"
              maxLength={20}
              error={errors.username}
            />

            <Field
              label="Email"
              value={form.email}
              placeholder="email"
              icon="mail-outline"
              disabled
              hint="Email cannot be changed"
            />

            <Field
              label="Bio"
              value={form.bio}
              onChangeText={(v) => set('bio', v)}
              placeholder="Tell others about yourself..."
              multiline
              maxLength={160}
              error={errors.bio}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.65 }]}
            onPress={handleSave}
            disabled={saving || uploading}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[900],
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 16,
    gap: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
    marginBottom: 12,
  },

  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: '#fff' },
});

const av = StyleSheet.create({
  wrap:     { alignItems: 'center', marginBottom: 24 },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fontFamily.extrabold, fontSize: 36, color: '#fff' },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: brand.primary,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500], marginTop: 8 },
});

const f = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700], marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  inputFocused:  { borderColor: brand.primary },
  inputError:    { borderColor: semantic.error },
  inputDisabled: { backgroundColor: neutral[50] },
  icon:    { marginTop: 14, marginRight: 8 },
  prefix:  { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], marginTop: 14, marginRight: 2 },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    paddingVertical: 12,
  },
  multiline:       { paddingTop: 12, textAlignVertical: 'top', minHeight: 100 },
  inputTextDisabled: { color: neutral[400] },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[400],
  },
  error: { fontFamily: fontFamily.regular, fontSize: 11, color: semantic.error, marginTop: 4 },
  hint:  { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500],   marginTop: 4 },
});
