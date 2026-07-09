import { useTheme } from '@/components/Themed';
import AuthHeader from '@/components/auth/AuthHeader';
import { layout, radius, shadows, space } from '@/constants/Spacing';
import { fontWeight, textStyles } from '@/constants/Typography';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors] = useState({ displayName: '', email: '', username: '', password: '', agreed: '' });

  function validate() {
    const e = { displayName: '', email: '', username: '', password: '', agreed: '' };
    let ok = true;
    if (!displayName.trim())             { e.displayName = 'Display name is required'; ok = false; }
    if (!email.trim())                   { e.email = 'Email is required'; ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { e.email = 'Enter a valid email'; ok = false; }
    if (!username.trim())                { e.username = 'Username is required'; ok = false; }
    if (password.length < 8)             { e.password = 'At least 8 characters required'; ok = false; }
    if (!agreed)                         { e.agreed = 'You must agree to continue'; ok = false; }
    setErrors(e);
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    // TODO: Auth_Service — Req 1 §2
    setTimeout(() => setLoading(false), 1500);
  }

  const inputBorder = (err: string) => err ? colors.secondary : colors.border;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Join NextVibe" subtitle="Create your account and start vibing" />

        {/* Google */}
        <View style={styles.googleBtnWrapper}>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
            disabled={googleLoading}
            style={styles.googleBtn}
          />
          {googleLoading && (
            <ActivityIndicator
              size="small"
              style={styles.googleLoader}
              color={colors.textTertiary}
            />
          )}
        </View>
        {googleError ? (
          <Text style={[textStyles.caption, { color: colors.secondary, marginTop: space.sm }]}>{googleError}</Text>
        ) : null}

        {/* OR divider */}
        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <Text style={[textStyles.caption, { color: colors.textTertiary, marginHorizontal: space.sm, letterSpacing: 1 }]}>OR</Text>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Display Name */}
        <Field label="Display Name" error={errors.displayName} colors={colors}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: inputBorder(errors.displayName), color: colors.text }]}
            placeholder="Enter your display name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            value={displayName}
            onChangeText={t => { setDisplayName(t); setErrors(e => ({ ...e, displayName: '' })); }}
          />
        </Field>

        {/* Email */}
        <Field label="Email" error={errors.email} colors={colors} top>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: inputBorder(errors.email), color: colors.text }]}
            placeholder="Enter email"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
          />
        </Field>

        {/* Username */}
        <Field label="Username" error={errors.username} colors={colors} top>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: inputBorder(errors.username), color: colors.text }]}
            placeholder="Choose a username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            value={username}
            onChangeText={t => { setUsername(t); setErrors(e => ({ ...e, username: '' })); }}
          />
        </Field>

        {/* Password */}
        <Field label="Password" error={errors.password} colors={colors} top>
          <View>
            <TextInput
              style={[styles.input, styles.inputPadR, { backgroundColor: colors.surface, borderColor: inputBorder(errors.password), color: colors.text }]}
              placeholder="Create a password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPass}
              autoComplete="new-password"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPass(v => !v)} accessibilityLabel={showPass ? 'Hide' : 'Show'}>
              <Text style={[styles.eyeIcon, { color: colors.textTertiary }]}>{showPass ? '○' : '◉'}</Text>
            </Pressable>
          </View>
        </Field>

        {/* T&C */}
        <View style={styles.checkRow}>
          <Pressable
            style={[styles.checkbox, {
              borderColor: errors.agreed ? colors.secondary : colors.border,
              backgroundColor: agreed ? colors.primary : 'transparent',
            }]}
            onPress={() => setAgreed(v => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
          </Pressable>
          <Text style={[textStyles.bodySm, { color: colors.textSecondary, flex: 1, marginLeft: space.sm }]}>
            {'I have read and agree to the '}
            <Text style={[textStyles.bodySm, { color: colors.primary, textDecorationLine: 'underline' }]}>Privacy Policy</Text>
            {' and '}
            <Text style={[textStyles.bodySm, { color: colors.secondary, textDecorationLine: 'underline' }]}>Terms of Service</Text>
            {'.'}
          </Text>
        </View>
        {errors.agreed ? <Text style={[textStyles.caption, { color: colors.secondary, marginTop: 4 }]}>{errors.agreed}</Text> : null}

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, shadows.primaryGlow, {
            backgroundColor: agreed ? colors.primaryDark : colors.primaryLight,
            opacity: pressed || loading ? 0.9 : 1,
            marginTop: space.xl,
          }]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[textStyles.button, { color: '#fff' }]}>Submit</Text>
          }
        </Pressable>

        {/* Sign in */}
        <View style={styles.bottomRow}>
          <Text style={[textStyles.bodySm, { color: colors.textSecondary }]}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[textStyles.bodySm, { color: colors.primary, fontWeight: fontWeight.semibold }]}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, colors, top, children }: {
  label: string; error: string; colors: any; top?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={top ? { marginTop: space.lg } : undefined}>
      <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: space.xs }]}>{label}</Text>
      {children}
      {error ? <Text style={[textStyles.caption, { color: colors.secondary, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space['3xl'],
  },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    ...textStyles.body,
  },
  inputPadR: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 52, alignItems: 'center', justifyContent: 'center',
  },
  eyeIcon: { fontSize: 20 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: space.lg },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  googleBtnWrapper: {
    alignItems: 'center',
    marginBottom: space.xs,
  },
  googleBtn: {
    width: '100%',
    height: 56,
  },
  googleLoader: {
    position: 'absolute',
    right: space.md,
    top: 0,
    bottom: 0,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.lg },
  checkbox: {
    width: 20, height: 20, borderRadius: radius.xs, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkMark: { color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  primaryBtn: {
    height: layout.buttonHeight, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space.xl },
});
