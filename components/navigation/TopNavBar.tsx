import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useNotificationBell } from '@/hooks/useNotificationBell';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Logo mark: plum circle with "»" ──────────────────────────────────────────
function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: size * 0.42,
          fontFamily: fontFamily.extrabold,
          letterSpacing: -2,
          marginLeft: 2,
          lineHeight: size * 0.52,
        }}
      >
        {'»'}
      </Text>
    </View>
  );
}

// ─── Bell button — shared by AppHeader and TopNavBar ─────────────────────────
// If notificationCount / onPress are not provided, falls back to the live
// RTK Query count and automatic navigation to /notifications.

function NotificationBell({
  count: countProp,
  onPress: onPressProp,
  size = 22,
  style,
}: {
  count?: number;
  onPress?: () => void;
  size?: number;
  style?: object;
}) {
  const { unreadCount, onBellPress } = useNotificationBell();
  const count   = countProp   ?? unreadCount;
  const onPress = onPressProp ?? onBellPress;

  return (
    <TouchableOpacity
      style={[bell.wrap, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={size} color={neutral[700]} />
      {count > 0 && (
        <View style={bell.badge}>
          <Text style={bell.text}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bell = StyleSheet.create({
  wrap:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: brand.secondary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { fontFamily: fontFamily.bold, fontSize: 9, color: '#fff' },
});

// ─── AppHeader ─────────────────────────────────────────────────────────────────
// Used on all non-tab screens: [back]  [logo + wordmark]  [bell]
// notificationCount / onNotificationPress are optional — omit them and the
// bell self-manages via useNotificationBell.

export interface AppHeaderProps {
  onBack?: () => void;
  /** Override the badge count. Omit to use live RTK Query unreadCount. */
  notificationCount?: number;
  /** Override the press handler. Omit to auto-navigate to /notifications. */
  onNotificationPress?: () => void;
  /** Replaces the bell entirely with a custom right-side element. */
  right?: React.ReactNode;
}

export function AppHeader({
  onBack,
  notificationCount,
  onNotificationPress,
  right,
}: AppHeaderProps) {
  const RightSlot = right ? (
    <View style={ah.side}>{right}</View>
  ) : (
    <NotificationBell
      count={notificationCount}
      onPress={onNotificationPress}
      size={22}
      style={ah.side}
    />
  );

  if (!onBack) {
    return (
      <View style={ah.bar}>
        <View style={ah.brandLeft}>
          <LogoMark size={34} />
          <Text style={ah.wordmark}>nextvibe</Text>
        </View>
        {RightSlot}
      </View>
    );
  }

  return (
    <View style={ah.bar}>
      <TouchableOpacity style={ah.side} onPress={onBack} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={neutral[800]} />
      </TouchableOpacity>
      <View style={ah.brand}>
        <LogoMark size={34} />
        <Text style={ah.wordmark}>nextvibe</Text>
      </View>
      {RightSlot}
    </View>
  );
}

const ah = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: neutral[0],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  side:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
    color: neutral[900],
    letterSpacing: -0.5,
  },
});

// ─── TopNavBar (tab screens) ──────────────────────────────────────────────────
// notificationCount / onNotificationPress optional — same self-managing bell.

interface TopNavBarProps {
  onNotificationPress?: () => void;
  notificationCount?: number;
}

export default function TopNavBar({
  onNotificationPress,
  notificationCount,
}: TopNavBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brand}>
        <LogoMark size={38} />
        <Text style={styles.brandName}>nextvibe</Text>
      </View>
      <NotificationBell count={notificationCount} onPress={onNotificationPress} size={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  brand:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
    color: neutral[900],
    letterSpacing: -0.5,
  },
});
