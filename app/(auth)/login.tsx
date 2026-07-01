import { useTheme } from '@/components/Themed';
import AuthHeader from '@/components/auth/AuthHeader';
import { layout, radius, shadows, space } from '@/constants/Spacing';
import { fontWeight, textStyles } from '@/constants/Typography';
import { Link, useRouter } from 'expo-router';
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

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [passErr, setPassErr]     = useState('');

  function validate() {
    let ok = true;
    setEmailErr(''); setPassErr('');
    if (!email.trim())         { setEmailErr('Email is required'); ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailErr('Enter a valid email'); ok = false; }
    if (!password)             { setPassErr('Password is required'); ok = false; }
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    // TODO: Auth_Service
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1500);
  }

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
        <AuthHeader title="Welcome back" subtitle="Sign in to continue your vibe" />

        {/* Email */}
        <Text style={[textStyles.label, styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: emailErr ? colors.secondary : colors.border,
            color: colors.text,
          }]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={t => { setEmail(t); setEmailErr(''); }}
        />
        {emailErr ? <Text style={[textStyles.caption, styles.err, { color: colors.secondary }]}>{emailErr}</Text> : null}

        {/* Password */}
        <Text style={[textStyles.label, styles.label, styles.labelTop, { color: colors.textSecondary }]}>Password</Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputPadR, {
              backgroundColor: colors.surface,
              borderColor: passErr ? colors.secondary : colors.border,
              color: colors.text,
            }]}
            placeholder="Enter your password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={!showPass}
            autoComplete="current-password"
            value={password}
            onChangeText={t => { setPassword(t); setPassErr(''); }}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPass(v => !v)} accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
            <Text style={[styles.eyeIcon, { color: colors.textTertiary }]}>{showPass ? '○' : '◉'}</Text>
          </Pressable>
        </View>
        {passErr ? <Text style={[textStyles.caption, styles.err, { color: colors.secondary }]}>{passErr}</Text> : null}

        {/* Forgot password */}
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotRow}>
            <Text style={[textStyles.bodySm, { color: colors.text, fontWeight: fontWeight.medium }]}>
              Forgot Password?
            </Text>
          </Pressable>
        </Link>

        {/* Login button */}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, shadows.primaryGlow, {
            backgroundColor: colors.primaryDark,
            opacity: pressed || loading ? 0.9 : 1,
          }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[textStyles.button, { color: '#fff' }]}>Login</Text>
          }
        </Pressable>

        {/* OR */}
        <OrDivider color={colors.border} textColor={colors.textTertiary} />

        {/* Google */}
        <GoogleButton colors={colors} onPress={() => {/* TODO */}} />

        {/* Sign up */}
        <View style={styles.bottomRow}>
          <Text style={[textStyles.bodySm, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[textStyles.bodySm, { color: colors.primary, fontWeight: fontWeight.semibold }]}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function OrDivider({ color, textColor }: { color: string; textColor: string }) {
  return (
    <View style={styles.orRow}>
      <View style={[styles.orLine, { backgroundColor: color }]} />
      <Text style={[textStyles.caption, { color: textColor, marginHorizontal: space.sm, letterSpacing: 1 }]}>OR</Text>
      <View style={[styles.orLine, { backgroundColor: color }]} />
    </View>
  );
}

function GoogleButton({ colors, onPress }: { colors: any; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.googleBtn, shadows.sm, {
        backgroundColor: colors.card,
        borderColor: colors.border,
        opacity: pressed ? 0.88 : 1,
      }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {/* Coloured G text stands in for the logo — replace with an Image once asset is added */}
      <View style={styles.googleContent}>
        <View style={styles.googleLeft}>
          <Text style={styles.googleG}>
            <Text style={{ color: '#4285F4' }}>G</Text>
            <Text style={{ color: '#EA4335' }}>o</Text>
            <Text style={{ color: '#FBBC05' }}>o</Text>
            <Text style={{ color: '#4285F4' }}>g</Text>
            <Text style={{ color: '#34A853' }}>l</Text>
            <Text style={{ color: '#EA4335' }}>e</Text>
          </Text>
          <View style={styles.googleTextBlock}>
            <Text style={[textStyles.bodySm, { color: colors.text, fontWeight: fontWeight.semibold }]}>
              Sign in with Google
            </Text>
          </View>
        </View>
        {/* Dropdown caret — placeholder for account picker */}
        <Text style={[textStyles.caption, { color: colors.textTertiary }]}>▾</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space['3xl'],
  },
  label: {
    marginBottom: space.xs,
  },
  labelTop: {
    marginTop: space.lg,
  },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    ...textStyles.body,
  },
  inputPadR: {
    paddingRight: 52,
  },
  err: {
    marginTop: 4,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: space.sm,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  primaryBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.xl,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  googleBtn: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    marginBottom: space['2xl'],
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  googleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  googleTextBlock: {
    marginLeft: space.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
