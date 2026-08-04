import { GoogleFallbackButton, PrimaryButton } from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import Colors from "@/constants/Colors";
import { layout, radius, space } from "@/constants/Spacing";
import { fontWeight, textStyles } from "@/constants/Typography";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useLoginMutation } from "@/store/api/authApi";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("screen").height;

let GoogleSigninButton: any = null;
if (Platform.OS !== "web") {
  try {
    GoogleSigninButton =
      require("@react-native-google-signin/google-signin").GoogleSigninButton;
  } catch { /* Expo Go */ }
}

export default function LoginScreen() {
  const colors = Colors.light;
  const router = useRouter();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr]   = useState("");
  const [apiErr, setApiErr]     = useState("");
  const [focused, setFocused]   = useState<"email" | "password" | null>(null);

  const emailBorder = emailErr ? colors.secondary : focused === "email"    ? colors.primary : colors.border;
  const passBorder  = passErr  ? colors.secondary : focused === "password" ? colors.primary : colors.border;

  function validate() {
    let ok = true;
    setEmailErr(""); setPassErr(""); setApiErr("");
    if (!email.trim())                       { setEmailErr("Email is required"); ok = false; }
    else if (!/\S+@\S+\.\S+/.test(email))   { setEmailErr("Enter a valid email"); ok = false; }
    if (!password)                           { setPassErr("Password is required"); ok = false; }
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      await login({ email: email.trim(), password }).unwrap();
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg =
        err?.data?.message ??
        err?.error ??
        "Login failed. Please check your credentials.";
      setApiErr(msg);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { minHeight: SCREEN_HEIGHT }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Welcome Back" subtitle="Sign in to continue your vibe" />

        {/* API-level error */}
        {apiErr ? (
          <View style={styles.apiErrBox}>
            <Text style={[textStyles.caption, { color: colors.secondary }]}>{apiErr}</Text>
          </View>
        ) : null}

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
          onChangeText={(t) => { setEmail(t); setEmailErr(""); setApiErr(""); }}
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
            onChangeText={(t) => { setPassword(t); setPassErr(""); setApiErr(""); }}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPass((v) => !v)}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        {passErr ? <Text style={[textStyles.caption, styles.err, { color: colors.secondary }]}>{passErr}</Text> : null}

        {/* Forgot password */}
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotRow}>
            <Text style={[textStyles.bodySm, { color: colors.text, fontWeight: fontWeight.medium }]}>Forgot Password?</Text>
          </Pressable>
        </Link>

        <PrimaryButton label="Login" loading={isLoading} onPress={handleLogin} backgroundColor={colors.primary} />

        <OrDivider color={colors.border} textColor={colors.textTertiary} />

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
          <Text style={[textStyles.caption, { color: colors.secondary, textAlign: "center", marginBottom: space.md }]}>{googleError}</Text>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={[textStyles.bodySm, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[textStyles.bodySm, { color: colors.primary, fontWeight: fontWeight.bold, textDecorationLine: "underline" }]}>Sign up</Text>
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

const styles = StyleSheet.create({
  scroll:         { flexGrow: 1, paddingHorizontal: space.xl, paddingVertical: space.xl },
  label:          { marginBottom: space.xs },
  labelTop:       { marginTop: space.lg },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
  },
  inputPadR:      { paddingRight: 52 },
  err:            { marginTop: 4 },
  apiErrBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: space.md,
  },
  eyeBtn: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: 52, alignItems: "center", justifyContent: "center",
  },
  forgotRow:       { alignSelf: "flex-end", paddingVertical: space.sm, marginTop: space.xs, marginBottom: space.md },
  orRow:           { flexDirection: "row", alignItems: "center", marginVertical: space.xl },
  orLine:          { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  googleBtnWrapper:{ alignItems: "center", marginBottom: space["2xl"] },
  googleBtn:       { width: "100%", height: 56 },
  googleLoader:    { position: "absolute", right: space.md, top: 0, bottom: 0 },
  bottomRow:       { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: space.lg },
});
