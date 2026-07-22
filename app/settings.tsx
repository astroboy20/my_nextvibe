import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRow {
  id: string;
  label: string;
  icon: IoniconName;
  iconColor?: string;
  onPress: () => void;
  danger?: boolean;
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
      <View style={[styles.rowIcon, { backgroundColor: row.danger ? `${semantic.error}15` : `${brand.primary}12` }]}>
        <Ionicons
          name={row.icon}
          size={18}
          color={row.danger ? semantic.error : (row.iconColor ?? brand.primary)}
        />
      </View>
      <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>
        {row.label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={neutral[300]} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            // TODO: call logout mutation + clear tokens
            setTimeout(() => {
              setSigningOut(false);
              router.replace('/(auth)/login');
            }, 800);
          },
        },
      ]
    );
  };

  const sections: SettingSection[] = [
    {
      title: 'App Settings',
      rows: [
        {
          id: 'privacy',
          label: 'Privacy Policy',
          icon: 'lock-closed-outline',
          onPress: () => router.push('/privacy' as any),
        },
        {
          id: 'help',
          label: 'Help & Support',
          icon: 'help-circle-outline',
          onPress: () => router.push('/contact' as any),
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: 'notifications-outline',
          onPress: () => {},
        },
        {
          id: 'appearance',
          label: 'Appearance',
          icon: 'color-palette-outline',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, index) => (
                <View key={row.id}>
                  <SettingsRow row={row} />
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
          style={[styles.signOutBtn, signingOut && { opacity: 0.65 }]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.85}
        >
          {signingOut ? (
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

        {/* Version */}
        <Text style={styles.version}>NextVibe v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: neutral[100],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[900],
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  rowLabelDanger: { color: semantic.error },

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
    marginLeft: 62,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#fff',
  },

  version: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
});
