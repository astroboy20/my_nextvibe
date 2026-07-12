import { useTheme } from '@/components/Themed';
import { PrimaryButton } from '@/components/auth/AuthButton';
import AuthHeader from '@/components/auth/AuthHeader';
import { layout, radius, space } from '@/constants/Spacing';
import { fontWeight, textStyles } from '@/constants/Typography';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

type State = 'idle' | 'loading' | 'sent';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail]     = useState('');
  const [emailErr, setErr]    = useState('');
  const [state, setState]     = useState<State>('idle');

  function validate() {
    if (!email.trim())                     { setErr('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email))       { setErr('Enter a valid email address'); return false; }
    setErr('');
    return true;
  }

  async function handleSend() {
    if (!validate()) return;
    setState('loading');
    // TODO: Auth_Service — Req 1 §8
    setTimeout(() => setState('sent'), 1500);
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (state === 'sent') {
    return (
      <View style={[styles.centred, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
          <Text style={styles.iconText}>✉</Text>
        </View>
        <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginBottom: space.sm, marginTop: space.xl }]}>
          Check your inbox
        </Text>
        <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: space['2xl'], paddingHorizontal: space.xl }]}>
          We've sent a reset link to{'\n'}
          <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{email}</Text>
        </Text>
        <View style={{ width: '100%', paddingHorizontal: space.xl }}>
          <PrimaryButton
            label="Back to Login"
            loading={false}
            onPress={() => router.replace('/(auth)/login')}
            backgroundColor={colors.primary}
          />
        </View>
      </View>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
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
        <AuthHeader title="Reset password" subtitle="We'll send a reset link to your inbox" />

        {/* Section copy */}
        <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginBottom: space.sm }]}>
          Forgot your password?
        </Text>
        <Text style={[textStyles.body, { color: colors.textTertiary, textAlign: 'center', marginBottom: space['2xl'] }]}>
          Enter your email and we'll send you a reset link
        </Text>

        {/* Email with icon prefix */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputIconWrap, { backgroundColor: colors.surface, borderColor: emailErr ? colors.secondary : colors.border }]}>
            <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>✉</Text>
            <TextInput
              style={[styles.iconInput, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={t => { setEmail(t); setErr(''); }}
            />
          </View>
        </View>
        {emailErr ? <Text style={[textStyles.caption, { color: colors.secondary, marginTop: 4 }]}>{emailErr}</Text> : null}

        <PrimaryButton
          label="Send Reset Link"
          loading={state === 'loading'}
          onPress={handleSend}
          backgroundColor={colors.primary}
          marginTop={space.xl}
        />

        {/* Back to login */}
        <Pressable style={styles.backRow} onPress={() => router.back()} accessibilityRole="button">
          <Text style={[textStyles.body, { color: colors.primary }]}>← Back to login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space['3xl'],
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 36,
  },
  inputWrapper: {},
  inputIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: space.sm,
  },
  iconInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    includeFontPadding: false,
  },
  primaryBtn: {
    height: layout.buttonHeight,
    width: '100%',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: {
    alignItems: 'center',
    marginTop: space.xl,
    paddingVertical: space.sm,
  },
});
