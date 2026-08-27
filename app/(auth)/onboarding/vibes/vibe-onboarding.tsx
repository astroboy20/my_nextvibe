/**
 * VibeOnboarding (React Native)
 *
 * Shown once after a new user registers (email/password or Google).
 * Lets them pick their interest tags, saves them via PATCH /v1/users/me/vibes,
 * then clears the isNewUser flag and navigates to /(tabs).
 */

import AuthHeader from '@/components/auth/AuthHeader';
import Colors from '@/constants/Colors';
import { radius, space } from '@/constants/Spacing';
import { fontFamily, fontSize, textStyles } from '@/constants/Typography';
import { useGetAllTagsQuery } from '@/store/api/tagsApi';
import { useSaveVibesMutation } from '@/store/api/usersApi';
import { useAppDispatch } from '@/store/hooks';
import { clearNewUser } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// ─── Colour cycle for tag cards ───────────────────────────────────────────────

const COLOR_CYCLE: Array<{ bg: string; text: string; border: string }> = [
  { bg: 'rgba(0,188,212,0.12)',  text: '#00BCD4', border: 'rgba(0,188,212,0.35)'  },
  { bg: 'rgba(103,58,183,0.12)', text: '#7B5EA7', border: 'rgba(103,58,183,0.35)' },
  { bg: 'rgba(255,101,132,0.12)',text: '#FF6584', border: 'rgba(255,101,132,0.35)'},
  { bg: 'rgba(91,26,87,0.12)',   text: '#5B1A57', border: 'rgba(91,26,87,0.35)'   },
];

function colorAt(index: number) {
  return COLOR_CYCLE[index % COLOR_CYCLE.length];
}

// ─── Icon map for known tag names ─────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  tech:        'laptop-outline',
  technology:  'laptop-outline',
  music:       'musical-notes-outline',
  rave:        'musical-notes-outline',
  festival:    'balloon-outline',
  concert:     'mic-outline',
  wedding:     'heart-outline',
  birthday:    'gift-outline',
  hangout:     'people-outline',
  conference:  'business-outline',
  social:      'people-outline',
  party:       'balloon-outline',
  sports:      'football-outline',
  art:         'color-palette-outline',
  food:        'restaurant-outline',
  travel:      'airplane-outline',
  fitness:     'barbell-outline',
  gaming:      'game-controller-outline',
};

function iconFor(name: string): string {
  return ICON_MAP[name.toLowerCase()] ?? 'pricetag-outline';
}

// ─── Tag Card ─────────────────────────────────────────────────────────────────

interface TagCardProps {
  tag: { id: string; name: string; imageUrl?: string | null };
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}

function TagCard({ tag, index, selected, onToggle }: TagCardProps) {
  const colors = Colors.light;
  const palette = colorAt(index);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onToggle(tag.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={tag.name}
      style={[
        styles.tagCard,
        {
          borderColor:     selected ? colors.primary : palette.border,
          backgroundColor: selected ? `${colors.primary}10` : palette.bg,
        },
        selected && styles.tagCardSelected,
      ]}
    >
      {/* Checkmark */}
      {selected && (
        <View style={[styles.check, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}

      {/* Icon / image */}
      {tag.imageUrl ? (
        <Image
          source={{ uri: tag.imageUrl }}
          style={styles.tagImage}
          resizeMode="cover"
          accessibilityLabel={tag.name}
        />
      ) : (
        <View style={[styles.tagIconWrap, { backgroundColor: selected ? `${colors.primary}18` : palette.bg }]}>
          <Ionicons
            name={iconFor(tag.name) as any}
            size={26}
            color={selected ? colors.primary : palette.text}
          />
        </View>
      )}

      <Text
        style={[styles.tagLabel, { color: selected ? colors.primary : colors.text }]}
        numberOfLines={2}
      >
        {tag.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VibeOnboarding() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const colors   = Colors.light;

  const [selected, setSelected] = useState<string[]>([]);
  const { data: tags = [], isLoading, isError, refetch } = useGetAllTagsQuery();
  const [saveVibes, { isLoading: isSaving }] = useSaveVibesMutation();

  function toggleTag(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleContinue() {
    if (selected.length === 0) {
      Toast.show({ type: 'error', text1: 'Pick at least one vibe to continue.' });
      return;
    }

    try {
      await saveVibes({ tagIds: selected }).unwrap();
      dispatch(clearNewUser());
      Toast.show({ type: 'success', text1: 'Vibes saved!', text2: 'Your feed is now personalised 🎉' });
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg =
        err?.data?.message ??
        err?.data?.error?.message ??
        'Failed to save vibes. Please try again.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[textStyles.body, { color: colors.textSecondary, marginTop: space.md }]}>
            Loading vibes…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError || tags.length === 0) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[textStyles.h4, { color: colors.text, marginTop: space.md, textAlign: 'center' }]}>
            Couldn't load vibes
          </Text>
          <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center', marginTop: space.xs }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[textStyles.bodySm, { color: colors.textSecondary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AuthHeader
          title="What's your vibe?"
          subtitle="Select your interests to personalise your event feed"
        />

        {/* Tag grid — 2 columns */}
        <View style={styles.grid}>
          {tags.map((tag, index) => (
            <TagCard
              key={tag.id}
              tag={tag}
              index={index}
              selected={selected.includes(tag.id)}
              onToggle={toggleTag}
            />
          ))}
        </View>

        {/* Spacer so button isn't covered by grid on short screens */}
        <View style={{ height: space['2xl'] }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {selected.length === 0 && (
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>
            Pick at least one to continue
          </Text>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleContinue}
          disabled={selected.length === 0 || isSaving}
          accessibilityRole="button"
          style={[
            styles.continueBtn,
            {
              backgroundColor:
                selected.length === 0 ? colors.primaryLight : colors.primary,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>Continue</Text>
              {selected.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{selected.length}</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = 12;
const CARD_WIDTH = '47.5%';

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  scroll:       { paddingHorizontal: space.md, paddingBottom: space['3xl'] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    justifyContent: 'space-between',
  },
  tagCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
    paddingHorizontal: space.sm,
    borderRadius: radius.xl,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
  },
  tagCardSelected: {
    // slight elevation on selected
    ...Platform.select({
      ios: { shadowColor: '#5B1A57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  tagIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagImage: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
  },
  tagLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  footer: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: 8,
  },
  hintText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  continueBtn: {
    height: 52,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#5B1A57', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  continueBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: '#fff',
    includeFontPadding: false,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
});
