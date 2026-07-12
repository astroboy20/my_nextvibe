import { useTheme } from "@/components/Themed";
import { GoogleFallbackButton, PrimaryButton } from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import { layout, radius, space } from "@/constants/Spacing";
import { fontWeight, textStyles } from "@/constants/Typography";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get('screen').height;

let GoogleSigninButton: any = null;
if (Platform.OS !== "web") {
  try {
    GoogleSigninButton =
      require("@react-native-google-signin/google-signin").GoogleSigninButton;
  } catch {
    // Expo Go — native module not available
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  const emailBorder = emailErr ? colors.secondary : focused === "email" ? colors.primary : colors.border;
  const passBorder  = passErr  ? colors.secondary : focused === "password" ? colors.primary : colors.border;

  function validate() {
    let ok = true;
    setEmailErr(""); setPassErr("");
    if (!email.trim()) { setEmailErr("Email is required"); ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailErr("Enter a valid email"); ok = false; }
    if (!password) { setPassErr("Password is required"); ok = false; }
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); router.replace("/(tabs)"); }, 1500);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { minHeight: SCREEN_HEIGHT }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Welcome Back" subtitle="Sign in to continue your vibe" />

        {/* Email */}
        <Text style={[textStyles.label, styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: emailBorder, color: colors.text }]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          onChangeText={(t) => { setEmail(t); setEmailErr(""); }}
        />
        {emailErr ? <Text style={[textStyles.caption, styles.err, { color: colors.secondary }]}>{emailErr}</Text> : null}

        {/* Password */}
        <Text style={[textStyles.label, styles.label, styles.labelTop, { color: colors.textSecondary }]}>Password</Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputPadR, { backgroundColor: colors.surface, borderColor: passBorder, color: colors.text }]}
            placeholder="Enter your password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={!showPass}
            autoComplete="current-password"
            value={password}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            onChangeText={(t) => { setPassword(t); setPassErr(""); }}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPass((v) => !v)}>
            <Text style={[styles.eyeIcon, { color: colors.textTertiary }]}>{showPass ? "○" : "◉"}</Text>
          </Pressable>
        </View>
        {passErr ? <Text style={[textStyles.caption, styles.err, { color: colors.secondary }]}>{passErr}</Text> : null}

        {/* Forgot password */}
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotRow}>
            <Text style={[textStyles.bodySm, { color: colors.text, fontWeight: fontWeight.medium }]}>Forgot Password?</Text>
          </Pressable>
        </Link>

        {/* Login button */}
        <PrimaryButton
          label="Login"
          loading={loading}
          onPress={handleLogin}
          backgroundColor={colors.primary}
        />

        {/* OR divider */}
        <OrDivider color={colors.border} textColor={colors.textTertiary} />

        {/* Google button */}
        {Platform.OS !== "web" && GoogleSigninButton ? (
          <View style={styles.googleBtnWrapper}>
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={signInWithGoogle}
              disabled={googleLoading}
              style={styles.googleBtn}
            />
            {googleLoading && <ActivityIndicator size="small" style={styles.googleLoader} color={colors.textTertiary} />}
          </View>
        ) : (
          <GoogleFallbackButton onPress={signInWithGoogle} loading={googleLoading} colors={colors} />
        )}
        {googleError ? (
          <Text style={[textStyles.caption, { color: colors.secondary, textAlign: 'center', marginBottom: space.md }]}>{googleError}</Text>
        ) : null}

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

function OrDivider({ color, textColor }: { color: string; textColor: string }) {
  return (
    <View style={styles.orRow}>
      <View style={[styles.orLine, { backgroundColor: color }]} />
      <Text style={[textStyles.caption, { color: textColor, marginHorizontal: space.sm, letterSpacing: 1 }]}>OR</Text>
      <View style={[styles.orLine, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
  },
  label: { marginBottom: space.xs },
  labelTop: { marginTop: space.lg },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
  },
  inputPadR: { paddingRight: 52 },
  err: { marginTop: 4 },
  eyeBtn: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: 52, alignItems: "center", justifyContent: "center",
  },
  eyeIcon: { fontSize: 20 },
  forgotRow: {
    alignSelf: "flex-end",
    paddingVertical: space.sm,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: space.xl,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  googleBtnWrapper: { alignItems: "center", marginBottom: space["2xl"] },
  googleBtn: { width: "100%", height: 56 },
  googleLoader: { position: "absolute", right: space.md, top: 0, bottom: 0 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: space.lg,
  },
});
