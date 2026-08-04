import { PrimaryButton } from '@/components/auth/AuthButton';
import AuthHeader from '@/components/auth/AuthHeader';
import Colors from '@/constants/Colors';
import { layout, radius, space } from '@/constants/Spacing';
import { fontWeight, textStyles } from '@/constants/Typography';
import { useForgotPasswordMutation } from '@/store/api/authApi';
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
  View,
} from 'react-native';

type State = 'idle' | 'loading' | 'sent';

export default function ForgotPasswordScreen() {
  const colors = Colors.light;
  const router = useRouter();

  const [forgotPassword] = useForgotPasswordMutation();

  const [email, setEmail]   = useState('');
  const [emailErr, setErr]  = useState('');
  const [apiErr, setApiErr] = useState('');
  const [state, setState]   = useState<State>('idle');

  function validate() {
    if (!email.trim())                       { setErr('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email))        { setErr('Enter a valid email address'); return false; }
    setErr('');
    return true;
  }

  async function handleSend() {
    if (!validate()) return;
    setState('loading');
    setApiErr('');
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setState('sent');
    } catch (err: any) {
      setState('idle');
      setApiErr(err?.data?.message ?? err?.error ?? 'Something went wrong. Please try again.');
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (state === 'sent') {
    return (
      <View style={[styles.centred, { backgroundColor: 'white' }]}>
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

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Reset password" subtitle="We'll send a reset link to your inbox" />

        {/* API error */}
        {apiErr ? (
          <View style={styles.apiErrBox}>
            <Text style={[textStyles.caption, { color: colors.secondary }]}>{apiErr}</Text>
          </View>
        ) : null}

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
              onChangeText={(t) => { setEmail(t); setErr(''); setApiErr(''); }}
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

        <Pressable style={styles.backRow} onPress={() => router.back()} accessibilityRole="button">
          <Text style={[textStyles.body, { color: colors.primary }]}>← Back to login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingHorizontal: space.xl, paddingBottom: space['3xl'] },
  centred:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  iconCircle:   { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  iconText:     { fontSize: 36 },
  apiErrBox:    { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: space.md },
  inputWrapper: {},
  inputIconWrap:{
    flexDirection: 'row', alignItems: 'center',
    height: layout.inputHeight, borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: space.md,
  },
  inputIcon:    { fontSize: 18, marginRight: space.sm },
  iconInput:    { flex: 1, height: '100%', fontFamily: 'NunitoSans_400Regular', fontSize: 15, includeFontPadding: false },
  backRow:      { alignItems: 'center', marginTop: space.xl, paddingVertical: space.sm },
});
