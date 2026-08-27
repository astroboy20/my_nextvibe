import { AppHeader } from '@/components/navigation/TopNavBar';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import {
    useGetMeQuery,
    useUpdateMeMutation,
    useUploadFileMutation,
} from '@/store/api/usersApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import Toast from 'react-native-toast-message';

// Lazy-load image picker to avoid crash if expo-image-picker isn't linked yet
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
  avatarUri: string | null;   // local file URI (picked but not yet uploaded)
  avatarUrl: string | null;   // remote URL (already on server)
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function AvatarPicker({
  localUri,
  remoteUrl,
  name,
  uploading,
  onPick,
}: {
  localUri: string | null;
  remoteUrl: string | null;
  name: string;
  uploading: boolean;
  onPick: () => void;
}) {
  const initials   = name?.charAt(0)?.toUpperCase() || 'U';
  const displayUri = localUri ?? remoteUrl;

  return (
    <View style={av.wrap}>
      <TouchableOpacity onPress={onPick} activeOpacity={0.85} disabled={uploading}>
        <View style={av.circle}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={StyleSheet.absoluteFillObject} borderRadius={48} />
          ) : (
            <Text style={av.initials}>{initials}</Text>
          )}
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
  const router    = useRouter();
  const { user }  = useAuth();

  // ── API ────────────────────────────────────────────────────────────────────
  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const [updateMe,    { isLoading: saving }]   = useUpdateMeMutation();
  const [uploadFile,  { isLoading: uploading }] = useUploadFileMutation();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm]     = useState<FormState>({
    displayName: '',
    username:    '',
    email:       '',
    bio:         '',
    avatarUri:   null,
    avatarUrl:   null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Seed form when profile loads
  useEffect(() => {
    const profile = meData?.data ?? user;
    if (!profile) return;
    setForm({
      displayName: profile.displayName ?? '',
      username:    profile.username    ?? '',
      email:       profile.email       ?? '',
      bio:         (profile as any).bio ?? '',
      avatarUri:   null,
      avatarUrl:   profile.avatarUrl   ?? null,
    });
  }, [meData?.data]);

  const set = (key: keyof FormState, value: string | null) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // ── Avatar pick ────────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    if (!ImagePicker) {
      Alert.alert('Not available', 'Image picker is not available on this device.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        set('avatarUri', result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Avatar pick error:', e);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validateForm(form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    try {
      let finalAvatarUrl = form.avatarUrl;

      // Upload new avatar first if one was picked
      if (form.avatarUri) {
        const fd = new FormData();
        fd.append('file', {
          uri:  form.avatarUri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
        const uploaded = await uploadFile(fd).unwrap();
        finalAvatarUrl = uploaded.data.url;
      }

      await updateMe({
        displayName: form.displayName.trim(),
        username:    form.username.trim(),
        bio:         form.bio.trim() || undefined,
        avatarUrl:   finalAvatarUrl,
      }).unwrap();

      Toast.show({
        type: "success",
        text1: "Profile updated ✓",
        text2: "Your changes have been saved",
        visibilityTime: 2500,
      });
      router.back();
    } catch (err: any) {
      const msg =
        err?.data?.message ??
        err?.message ??
        'Failed to save changes. Please try again.';
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: msg,
        visibilityTime: 3500,
      });
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (meLoading && !form.displayName) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <AppHeader onBack={() => router.back()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

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
          {/* Avatar */}
          <AvatarPicker
            localUri={form.avatarUri}
            remoteUrl={form.avatarUrl}
            name={form.displayName}
            uploading={uploading}
            onPick={handlePickAvatar}
          />

          {/* Profile Information */}
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
            style={[styles.saveBtn, (saving || uploading) && { opacity: 0.65 }]}
            onPress={handleSave}
            disabled={saving || uploading}
            activeOpacity={0.85}
          >
            {saving || uploading ? (
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
  safe:        { flex: 1, backgroundColor: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  wrap:  { alignItems: 'center', marginBottom: 24 },
  circle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: fontFamily.extrabold, fontSize: 36, color: '#fff' },
  badge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: brand.primary,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
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
  inputFocused:      { borderColor: brand.primary },
  inputError:        { borderColor: semantic.error },
  inputDisabled:     { backgroundColor: neutral[50] },
  icon:              { marginTop: 14, marginRight: 8 },
  prefix:            { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], marginTop: 14, marginRight: 2 },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    paddingVertical: 12,
  },
  multiline:         { paddingTop: 12, textAlignVertical: 'top', minHeight: 100 },
  inputTextDisabled: { color: neutral[400] },
  charCount: {
    position: 'absolute',
    bottom: 8, right: 10,
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[400],
  },
  error: { fontFamily: fontFamily.regular, fontSize: 11, color: semantic.error, marginTop: 4 },
  hint:  { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500],   marginTop: 4 },
});
