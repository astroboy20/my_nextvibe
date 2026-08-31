import { AppHeader } from '@/components/navigation/TopNavBar';
import { brand } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useTheme } from '@/hooks/useTheme';
import { changeTheme, type ThemePreference } from '@/store/slices/themeSlice';
import type { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

// ─── Option definitions ───────────────────────────────────────────────────────

type Option = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const OPTIONS: Option[] = [
  {
    value: 'system',
    label: 'System Default',
    description: "Follows your phone's light or dark setting automatically.",
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Always use the light theme regardless of system setting.',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use the dark theme regardless of system setting.',
    icon: 'moon-outline',
  },
];

// ─── Mini preview ─────────────────────────────────────────────────────────────

function ThemePreview({ value }: { value: ThemePreference }) {
  const isDark = value === 'dark';
  const isSystem = value === 'system';

  if (isSystem) {
    return (
      <View style={prev.wrap}>
        <View style={[prev.half, { backgroundColor: '#FFFFFF' }]}>
          <View style={[prev.bar, { backgroundColor: brand.primary }]} />
          <View style={[prev.line, { backgroundColor: '#E3D8E3', width: '70%' }]} />
          <View style={[prev.line, { backgroundColor: '#E3D8E3', width: '50%' }]} />
          <View style={[prev.pill, { backgroundColor: brand.primary }]} />
        </View>
        <View style={[prev.half, { backgroundColor: '#1E1E2E' }]}>
          <View style={[prev.bar, { backgroundColor: '#8B3A86' }]} />
          <View style={[prev.line, { backgroundColor: '#3D3D56', width: '70%' }]} />
          <View style={[prev.line, { backgroundColor: '#3D3D56', width: '50%' }]} />
          <View style={[prev.pill, { backgroundColor: '#8B3A86' }]} />
        </View>
        <View style={prev.splitDivider} />
      </View>
    );
  }

  const bg        = isDark ? '#1E1E2E' : '#FFFFFF';
  const barColor  = isDark ? '#8B3A86' : brand.primary;
  const lineColor = isDark ? '#3D3D56' : '#E3D8E3';

  return (
    <View style={[prev.wrap, { backgroundColor: bg }]}>
      <View style={[prev.bar, { backgroundColor: barColor }]} />
      <View style={[prev.line, { backgroundColor: lineColor, width: '75%' }]} />
      <View style={[prev.line, { backgroundColor: lineColor, width: '55%' }]} />
      <View style={[prev.line, { backgroundColor: lineColor, width: '65%' }]} />
      <View style={[prev.pill, { backgroundColor: barColor }]} />
    </View>
  );
}

const prev = StyleSheet.create({
  wrap: {
    width: 80,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(158,132,157,0.25)',
    flexDirection: 'row',
    padding: 6,
    gap: 4,
  },
  half: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  bar:          { height: 8, borderRadius: 4, width: '100%' },
  line:         { height: 5, borderRadius: 3 },
  pill:         { height: 14, borderRadius: 7, width: '80%', marginTop: 2 },
  splitDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1.5,
    backgroundColor: 'rgba(158,132,157,0.4)',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AppearanceScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const preference = useSelector((s: RootState) => s.theme.preference);

  const select = (value: ThemePreference) => {
    dispatch(changeTheme(value) as any);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <AppHeader onBack={() => router.back()} />

      <View style={s.content}>
        <Text style={[s.heading, { color: colors.text }]}>Appearance</Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>
          Choose how NextVibe looks on your device.
        </Text>

        <View style={[s.list, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {OPTIONS.map((opt, i) => {
            const active = preference === opt.value;
            return (
              <React.Fragment key={opt.value}>
                <TouchableOpacity
                  style={[
                    s.option,
                    { backgroundColor: colors.card },
                    active && { backgroundColor: `${brand.primary}09` },
                  ]}
                  onPress={() => select(opt.value)}
                  activeOpacity={0.75}
                >
                  <ThemePreview value={opt.value} />

                  <View style={s.optionText}>
                    <View style={s.optionLabelRow}>
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={active ? brand.primary : colors.textSecondary}
                      />
                      <Text style={[s.optionLabel, { color: active ? brand.primary : colors.text }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Text style={[s.optionDesc, { color: colors.textTertiary }]}>
                      {opt.description}
                    </Text>
                  </View>

                  <View style={[s.radio, { borderColor: active ? brand.primary : colors.border }]}>
                    {active && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>

                {i < OPTIONS.length - 1 && (
                  <View style={[s.sep, { backgroundColor: colors.divider }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Current mode indicator */}
        <Text style={[s.currentMode, { color: colors.textTertiary }]}>
          Currently using{' '}
          <Text style={{ color: brand.primary, fontFamily: fontFamily.semibold }}>
            {isDark ? 'dark' : 'light'}
          </Text>{' '}
          mode
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },

  heading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginBottom: 24,
  },

  list: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },

  optionText:     { flex: 1, gap: 4 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  optionDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.primary,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 110,
  },

  currentMode: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: 20,
  },
});
