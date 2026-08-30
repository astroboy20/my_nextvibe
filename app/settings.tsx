import { AppHeader } from "@/components/navigation/TopNavBar";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useGetMeQuery, useSwitchRoleMutation } from "@/store/api/usersApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert, Linking, ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface SettingRow {
  id: string;
  label: string;
  sublabel?: string;
  icon: IoniconName;
  iconColor?: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

// ─── Row component ────────────────────────────────────────────────────────────

function SettingsRow({ row }: { row: SettingRow }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={row.onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: row.danger
              ? `${semantic.error}15`
              : `${brand.primary}12`,
          },
        ]}
      >
        <Ionicons
          name={row.icon}
          size={18}
          color={row.danger ? semantic.error : row.iconColor ?? brand.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>
          {row.label}
        </Text>
        {row.sublabel ? (
          <Text style={styles.rowSublabel}>{row.sublabel}</Text>
        ) : null}
      </View>
      {row.badge ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: row.badgeColor ?? `${brand.primary}18` },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: row.badgeColor ? "#fff" : brand.primary },
            ]}
          >
            {row.badge}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={neutral[300]} />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoggingOut } = useAuth();

  const { data: meData } = useGetMeQuery();
  const [switchRole, { isLoading: switching }] = useSwitchRoleMutation();

  const profile = meData?.data ?? user;
  const isOrganizer = profile?.role === "ORGANIZER";

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  // ── Section config ─────────────────────────────────────────────────────────
  const sections: SettingSection[] = [
    {
      title: "App Settings",
      rows: [
        {
          id: "notifications",
          label: "Notifications",
          icon: "notifications-outline",
          onPress: () => {},
        },
        {
          id: "appearance",
          label: "Appearance",
          icon: "color-palette-outline",
          onPress: () => router.push("/appearance"),
        },
      ],
    },
    {
      title: "Support",
      rows: [
        {
          id: "privacy",
          label: "Privacy Policy",
          icon: "lock-closed-outline",
          onPress: () => Linking.openURL("https://mynextvibe.com/privacy"),
        },
        {
          id: "help",
          label: "Help & Support",
          icon: "help-circle-outline",
          onPress: () => Linking.openURL("https://mynextvibe.com/cntact"),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile summary card */}
        {profile && (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push("/edit-profile")}
            activeOpacity={0.8}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {profile.displayName?.charAt(0)?.toUpperCase() ?? "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile.displayName}</Text>
              <Text style={styles.profileUsername}>@{profile.username}</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{profile.role}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Settings sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, index) => (
                <View key={row.id}>
                  {/* Show spinner inline for role switch */}
                  {row.id === "role" && switching ? (
                    <View style={[styles.row, { justifyContent: "center" }]}>
                      <ActivityIndicator color={brand.primary} size="small" />
                      <Text style={[styles.rowLabel, { marginLeft: 10 }]}>
                        Switching…
                      </Text>
                    </View>
                  ) : (
                    <SettingsRow row={row} />
                  )}
                  {index < section.rows.length - 1 && (
                    <View style={styles.sep} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, isLoggingOut && { opacity: 0.65 }]}
          onPress={handleSignOut}
          disabled={isLoggingOut}
          activeOpacity={0.85}
        >
          {isLoggingOut ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.signOutText}>Signing out…</Text>
            </>
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>NextVibe v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },

  // Profile summary card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: `${brand.primary}06`,
    marginBottom: 24,
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: "#fff",
  },
  profileName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[900],
  },
  profileUsername: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginTop: 1,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: `${brand.primary}18`,
  },
  rolePillText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: brand.primary,
  },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  rowLabelDanger: { color: semantic.error },
  rowSublabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
    marginTop: 1,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
    marginLeft: 62,
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: semantic.error,
    marginBottom: 24,
    shadowColor: semantic.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: "#fff",
  },

  version: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
  },
});
