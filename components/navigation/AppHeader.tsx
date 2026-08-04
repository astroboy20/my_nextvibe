/**
 * AppHeader
 *
 * Unified header used across all non-tab screens.
 * Layout:  [back button]  [logo mark + wordmark]  [notification bell]
 *
 * Props:
 *   onBack             - if omitted, back button is hidden
 *   notificationCount  - badge count on the bell (default 0, hides badge at 0)
 *   onNotificationPress
 *   right              - optional custom right-side element (replaces bell)
 */

import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppHeaderProps {
  onBack?: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
  /** Replaces the bell with a custom element (e.g. a Save button) */
  right?: React.ReactNode;
}

export default function AppHeader({
  onBack,
  notificationCount = 0,
  onNotificationPress,
  right,
}: AppHeaderProps) {
  return (
    <View style={s.bar}>
      {/* Left — back button or spacer */}
      {onBack ? (
        <TouchableOpacity style={s.side} onPress={onBack} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
      ) : (
        <View style={s.side} />
      )}

      {/* Centre — logo */}
      <View style={s.brand}>
        <View style={s.logoMark}>
          <Text style={s.logoGlyph}>{'»'}</Text>
        </View>
        <Text style={s.wordmark}>nextvibe</Text>
      </View>

      {/* Right — bell or custom */}
      {right ? (
        <View style={s.side}>{right}</View>
      ) : (
        <TouchableOpacity
          style={s.side}
          onPress={onNotificationPress}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={neutral[700]} />
          {notificationCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
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
  side: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontFamily.extrabold,
    letterSpacing: -2,
    marginLeft: 2,
    lineHeight: 20,
  },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.xl,
    color: neutral[900],
    letterSpacing: -0.5,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: brand.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: '#fff',
  },
});
