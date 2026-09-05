import {
  GoogleFallbackButton,
  PrimaryButton,
} from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import Colors from "@/constants/Colors";
import { layout, radius, space } from "@/constants/Spacing";
import { fontWeight, textStyles } from "@/constants/Typography";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useRegisterMutation } from "@/store/api/authApi";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { type ReactNode, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function RegisterScreen() {
  const colors = Colors.light;
  const router = useRouter();

  // Flow 1A — hosted redirect via expo-web-browser, no native SDK needed
  const {
    signInWithGoogle,
    loading: googleLoading,
    error: googleError,
  } = useGoogleAuth("register");

  const [register, { isLoading }] = useRegisterMutation();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({
    displayName: "",
    email: "",
    username: "",
    password: "",
    agreed: "",
  });

  function validate() {
    const e = {
      displayName: "",
      email: "",
      username: "",
      password: "",
      agreed: "",
    };
    let ok = true;
    if (!displayName.trim()) {
      e.displayName = "Display name is required";
      ok = false;
    }
    if (!email.trim()) {
      e.email = "Email is required";
      ok = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      e.email = "Enter a valid email";
      ok = false;
    }
    if (!username.trim()) {
      e.username = "Username is required";
      ok = false;
    }
    if (password.length < 8) {
      e.password = "At least 8 characters";
      ok = false;
    }
    if (!agreed) {
      e.agreed = "You must agree to continue";
      ok = false;
    }
    setErrors(e);
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        username: username.trim(),
      }).unwrap();
      Toast.show({
        type: "success",
        text1: "Account created! 🎉",
        text2: "Welcome to NextVibe",
        visibilityTime: 2500,
      });
      router.replace("/(auth)/onboarding/vibes" as any);
    } catch (err: any) {
      const msg =
        err?.data?.message ??
        err?.error ??
        "Registration failed. Please try again.";
      Toast.show({
        type: "error",
        text1: "Registration failed",
        text2: msg,
        visibilityTime: 3500,
      });
    }
  }

  const inputBorder = (err: string) => (err ? colors.secondary : colors.border);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        pointerEvents={googleLoading ? "none" : "auto"}
      >
        <AuthHeader
          title="Join NextVibe"
          subtitle="Create your account and start vibing"
        />

        {/* ── Google (Flow 1A — works on all platforms without native SDK) ── */}
        <GoogleFallbackButton
          onPress={signInWithGoogle}
          loading={googleLoading}
          colors={colors}
        />
        {googleError ? (
          <Text
            style={[
              textStyles.caption,
              {
                color: colors.secondary,
                marginTop: space.sm,
                marginBottom: space.sm,
              },
            ]}
          >
            {googleError}
          </Text>
        ) : null}

        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <Text
            style={[
              textStyles.caption,
              {
                color: colors.textTertiary,
                marginHorizontal: space.sm,
                letterSpacing: 1,
              },
            ]}
          >
            OR
          </Text>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        <Field label="Display Name" error={errors.displayName} colors={colors}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: inputBorder(errors.displayName),
                color: colors.text,
              },
            ]}
            placeholder="Enter your display name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            value={displayName}
            onChangeText={(t) => {
              setDisplayName(t);
              setErrors((e) => ({ ...e, displayName: "" }));
            }}
            editable={!googleLoading}
          />
        </Field>

        <Field label="Email" error={errors.email} colors={colors} top>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: inputBorder(errors.email),
                color: colors.text,
              },
            ]}
            placeholder="Enter email"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: "" }));
            }}
            editable={!googleLoading}
          />
        </Field>

        <Field label="Username" error={errors.username} colors={colors} top>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: inputBorder(errors.username),
                color: colors.text,
              },
            ]}
            placeholder="Choose a username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setErrors((e) => ({ ...e, username: "" }));
            }}
            editable={!googleLoading}
          />
        </Field>

        <Field label="Password" error={errors.password} colors={colors} top>
          <View>
            <TextInput
              style={[
                styles.input,
                styles.inputPadR,
                {
                  backgroundColor: colors.surface,
                  borderColor: inputBorder(errors.password),
                  color: colors.text,
                },
              ]}
              placeholder="Create a password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPass}
              autoComplete="new-password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: "" }));
              }}
              editable={!googleLoading}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPass((v) => !v)}
              accessibilityLabel={showPass ? "Hide" : "Show"}
              disabled={googleLoading}
            >
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>
        </Field>

        {/* ── T&C ── */}
        <View style={styles.checkRow}>
          <Pressable
            style={[
              styles.checkbox,
              {
                borderColor: errors.agreed ? colors.secondary : colors.border,
                backgroundColor: agreed ? colors.primary : "transparent",
              },
            ]}
            onPress={() => {
              setAgreed((v) => !v);
              setErrors((e) => ({ ...e, agreed: "" }));
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            disabled={googleLoading}
          >
            {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
          </Pressable>
          <Text
            style={[
              textStyles.bodySm,
              { color: colors.textSecondary, flex: 1, marginLeft: space.sm },
            ]}
          >
            {"I have read and agree to the "}
            <Text
              style={{ color: colors.primary, textDecorationLine: "underline" }}
              onPress={() =>
                !googleLoading &&
                WebBrowser.openBrowserAsync(
                  "https://www.mynextvibe.com/privacy"
                )
              }
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
            {" and "}
            <Text
              style={{ color: colors.primary, textDecorationLine: "underline" }}
              onPress={() =>
                !googleLoading &&
                WebBrowser.openBrowserAsync("https://www.mynextvibe.com/terms")
              }
              accessibilityRole="link"
            >
              Terms of Service
            </Text>
            {"."}
          </Text>
        </View>
        {errors.agreed ? (
          <Text
            style={[
              textStyles.caption,
              { color: colors.secondary, marginTop: 4 },
            ]}
          >
            {errors.agreed}
          </Text>
        ) : null}

        <PrimaryButton
          label="Create Account"
          loading={isLoading}
          onPress={handleSubmit}
          backgroundColor={agreed ? colors.primary : colors.primaryLight}
          marginTop={space.xl}
          disabled={googleLoading}
        />

        <View style={styles.bottomRow}>
          <Text style={[textStyles.bodySm, { color: colors.textSecondary }]}>
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable disabled={googleLoading}>
              <Text
                style={[
                  textStyles.bodySm,
                  {
                    color: colors.primary,
                    fontWeight: fontWeight.bold,
                    textDecorationLine: "underline",
                  },
                ]}
              >
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      {/* Full-screen loading overlay during Google OAuth */}
      {googleLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Ionicons name="logo-google" size={48} color={colors.primary} />
            <Text
              style={[
                textStyles.bodyLg,
                {
                  color: colors.text,
                  marginTop: space.md,
                  fontWeight: fontWeight.semibold,
                },
              ]}
            >
              Signing up with Google
            </Text>
            <Text
              style={[
                textStyles.bodySm,
                {
                  color: colors.textSecondary,
                  marginTop: space.xs,
                  textAlign: "center",
                },
              ]}
            >
              Please wait...
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  colors,
  top,
  children,
}: {
  label: string;
  error: string;
  colors: any;
  top?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={top ? { marginTop: space.lg } : undefined}>
      <Text
        style={[
          textStyles.label,
          { color: colors.textSecondary, marginBottom: space.xs },
        ]}
      >
        {label}
      </Text>
      {children}
      {error ? (
        <Text
          style={[
            textStyles.caption,
            { color: colors.secondary, marginTop: 4 },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space["3xl"] },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    includeFontPadding: false,
  },
  inputPadR: { paddingRight: 52 },
  eyeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: space.lg,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: space.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkMark: { color: "#fff", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: space.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    padding: space["2xl"],
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
  },
});
