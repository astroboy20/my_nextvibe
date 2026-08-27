/**
 * AuthModal
 *
 * Shown when a user tries to create a postcard / play a game and their
 * session has expired.  Presents Login and Register tabs — each with
 * email/password fields and a Google option — inside a bottom-sheet modal.
 *
 * Usage
 * ─────
 * const { visible, showAuthModal, hideAuthModal } = useAuthModal();
 *
 * <AuthModal
 *   visible={visible}
 *   onDismiss={hideAuthModal}
 *   onSuccess={hideAuthModal}   // called after successful auth
 * />
 */

import Colors from '@/constants/Colors';
import { layout, radius, space } from '@/constants/Spacing';
import { fontFamily, fontSize, textStyles } from '@/constants/Typography';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useLoginMutation, useRegisterMutation } from '@/store/api/authApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

let GoogleSigninButton: any = null;
if (Platform.OS !== 'web') {
  try {
    GoogleSigninButton =
      require('@react-native-google-signin/google-signin').GoogleSigninButton;
  } catch { /* Expo Go */ }
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: 'login' | 'register';
  onChange: (t: 'login' | 'register') => void;
  colors: ReturnType<typeof getColors>;
}

function TabBar({ active, onChange, colors }: TabBarProps) {
  return (
    <View style={[tabStyles.row, { borderBottomColor: colors.border }]}>
      {(['login', 'register'] as const).map((tab) => {
        const isActive = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[tabStyles.tab, isActive && { borderBottomColor: colors.primary }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                tabStyles.label,
                { color: isActive ? colors.primary : colors.textTertiary },
              ]}
            >
              {tab === 'login' ? 'Sign In' : 'Register'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row:   { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
});

// ─── Input field ──────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  colors: ReturnType<typeof getColors>;
}

function Field({
  label, value, onChange, error, placeholder,
  secure, keyboardType, autoCapitalize, colors,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const borderColor = error ? colors.secondary : colors.border;

  return (
    <View style={{ marginTop: space.md }}>
      <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: 4 }]}>
        {label}
      </Text>
      <View>
        <TextInput
          style={[fieldStyles.input, {
            borderColor,
            backgroundColor: colors.surface,
            color: colors.text,
            paddingRight: secure ? 52 : space.md,
          }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
        />
        {secure && (
          <Pressable
            style={fieldStyles.eye}
            onPress={() => setShow((v) => !v)}
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={[textStyles.caption, { color: colors.secondary, marginTop: 4 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    includeFontPadding: false,
  },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Google row ───────────────────────────────────────────────────────────────

function GoogleRow({ onPress, loading, colors }: { onPress: () => void; loading: boolean; colors: ReturnType<typeof getColors> }) {
  if (Platform.OS !== 'web' && GoogleSigninButton) {
    return (
      <View style={{ alignItems: 'center', marginTop: space.md }}>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={onPress}
          disabled={loading}
          style={{ width: '100%', height: 52 }}
        />
        {loading && <ActivityIndicator style={{ position: 'absolute', right: space.md }} color={colors.textTertiary} />}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={loading}
      style={[googleStyles.btn, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <>
          <Image
            source={require('@/assets/images/google-logo.png')}
            style={googleStyles.logo}
            resizeMode="contain"
          />
          <Text style={[googleStyles.label, { color: colors.textSecondary }]}>
            Continue with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const googleStyles = StyleSheet.create({
  btn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
  },
  logo:  { width: 20, height: 20, marginRight: 10 },
  label: { fontFamily: fontFamily.medium, fontSize: fontSize.base, includeFontPadding: false },
});

// ─── OR divider ───────────────────────────────────────────────────────────────

function OrDivider({ colors }: { colors: ReturnType<typeof getColors> }) {
  return (
    <View style={orStyles.row}>
      <View style={[orStyles.line, { backgroundColor: colors.border }]} />
      <Text style={[orStyles.text, { color: colors.textTertiary }]}>OR</Text>
      <View style={[orStyles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const orStyles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', marginVertical: space.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  text: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, marginHorizontal: space.sm, letterSpacing: 1 },
});

// ─── Login tab ────────────────────────────────────────────────────────────────

interface LoginFormProps {
  onSuccess: () => void;
  colors: ReturnType<typeof getColors>;
}

function LoginForm({ onSuccess, colors }: LoginFormProps) {
  const [login, { isLoading }] = useLoginMutation();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({ email: '', password: '' });

  function validate() {
    const e = { email: '', password: '' };
    let ok = true;
    if (!email.trim())                     { e.email = 'Email is required'; ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { e.email = 'Enter a valid email'; ok = false; }
    if (!password)                         { e.password = 'Password is required'; ok = false; }
    setErrors(e);
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      await login({ email: email.trim(), password }).unwrap();
      Toast.show({ type: 'success', text1: 'Welcome back! 👋' });
      onSuccess();
    } catch (err: any) {
      const msg = err?.data?.message ?? 'Login failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Login failed', text2: msg });
    }
  }

  async function handleGoogle() {
    await signInWithGoogle();
    // AuthGate or parent will respond to the state change
    onSuccess();
  }

  return (
    <View>
      <GoogleRow onPress={handleGoogle} loading={googleLoading} colors={colors} />
      <OrDivider colors={colors} />

      <Field
        label="Email"
        value={email}
        onChange={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
        error={errors.email}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        colors={colors}
      />
      <Field
        label="Password"
        value={password}
        onChange={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
        error={errors.password}
        placeholder="Enter your password"
        secure
        autoCapitalize="none"
        colors={colors}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogin}
        disabled={isLoading}
        style={[submitStyles.btn, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={submitStyles.label}>Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Register tab ─────────────────────────────────────────────────────────────

interface RegisterFormProps {
  onSuccess: () => void;
  colors: ReturnType<typeof getColors>;
}

function RegisterForm({ onSuccess, colors }: RegisterFormProps) {
  const [register, { isLoading }] = useRegisterMutation();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  const [displayName, setDisplayName] = useState('');
  const [username,    setUsername]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [errors, setErrors] = useState({ displayName: '', username: '', email: '', password: '' });

  function validate() {
    const e = { displayName: '', username: '', email: '', password: '' };
    let ok = true;
    if (!displayName.trim())                 { e.displayName = 'Display name is required'; ok = false; }
    if (!username.trim())                    { e.username = 'Username is required'; ok = false; }
    if (!email.trim())                       { e.email = 'Email is required'; ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email))   { e.email = 'Enter a valid email'; ok = false; }
    if (password.length < 8)                 { e.password = 'At least 8 characters'; ok = false; }
    setErrors(e);
    return ok;
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        username: username.trim(),
      }).unwrap();
      Toast.show({ type: 'success', text1: 'Account created! 🎉', text2: 'Welcome to NextVibe' });
      onSuccess();
    } catch (err: any) {
      const msg = err?.data?.message ?? 'Registration failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Registration failed', text2: msg });
    }
  }

  async function handleGoogle() {
    await signInWithGoogle();
    onSuccess();
  }

  return (
    <View>
      <GoogleRow onPress={handleGoogle} loading={googleLoading} colors={colors} />
      <OrDivider colors={colors} />

      <Field
        label="Display Name"
        value={displayName}
        onChange={(t) => { setDisplayName(t); setErrors((e) => ({ ...e, displayName: '' })); }}
        error={errors.displayName}
        placeholder="Your display name"
        autoCapitalize="words"
        colors={colors}
      />
      <Field
        label="Username"
        value={username}
        onChange={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
        error={errors.username}
        placeholder="Choose a username"
        autoCapitalize="none"
        colors={colors}
      />
      <Field
        label="Email"
        value={email}
        onChange={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
        error={errors.email}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        colors={colors}
      />
      <Field
        label="Password"
        value={password}
        onChange={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
        error={errors.password}
        placeholder="Create a password (min 8 chars)"
        secure
        autoCapitalize="none"
        colors={colors}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleRegister}
        disabled={isLoading}
        style={[submitStyles.btn, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={submitStyles.label}>Create Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const submitStyles = StyleSheet.create({
  btn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xl,
    ...Platform.select({
      ios: { shadowColor: '#5B1A57', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: '#fff',
    includeFontPadding: false,
  },
});

// ─── Colour helper ────────────────────────────────────────────────────────────

function getColors() {
  return Colors.light;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface AuthModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Called when the user dismisses (backdrop tap or close button) */
  onDismiss: () => void;
  /** Called after a successful login/register — use to retry the blocked action */
  onSuccess: () => void;
  /** Optional message shown at the top (e.g. "Sign in to upload your postcard") */
  message?: string;
}

export default function AuthModal({
  visible,
  onDismiss,
  onSuccess,
  message,
}: AuthModalProps) {
  const colors = Colors.light;
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Reset tab when modal opens
  const prevVisible = useRef(visible);
  if (visible !== prevVisible.current) {
    if (visible) setActiveTab('login');
    prevVisible.current = visible;
  }

  const handleSuccess = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={modalStyles.backdrop} onPress={onDismiss} />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={modalStyles.kvContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[modalStyles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />

          {/* Close button */}
          <Pressable
            onPress={onDismiss}
            style={modalStyles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>

          {/* Optional context message */}
          {message ? (
            <View style={[modalStyles.msgBanner, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[textStyles.bodySm, { color: colors.primary, flex: 1 }]}>{message}</Text>
            </View>
          ) : null}

          <TabBar active={activeTab} onChange={setActiveTab} colors={colors} />

          <ScrollView
            contentContainerStyle={modalStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'login' ? (
              <LoginForm onSuccess={handleSuccess} colors={colors} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} colors={colors} />
            )}

            {/* Bottom spacer for keyboard */}
            <View style={{ height: space['2xl'] }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kvContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: SCREEN_H * 0.92,
    paddingTop: space.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: space.sm,
  },
  closeBtn: {
    position: 'absolute',
    top: space.sm,
    right: space.md,
    padding: 4,
    zIndex: 10,
  },
  msgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.md,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  scrollContent: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
});
