import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  style?: object;
}

export default function DashboardCard({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
  style,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Chevron rotation animation
  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  function toggle() {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsOpen((v) => !v);
  }

  return (
    <View style={[s.card, isOpen && s.cardOpen, style]}>
      {/* Header — tap to toggle */}
      <TouchableOpacity
        style={s.header}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <View style={s.left}>
          <View style={s.iconWrap}>{icon}</View>
          <Text style={s.title}>{title}</Text>
        </View>

        <View style={s.right}>
          {badge && <View>{badge}</View>}
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={16} color={neutral[400]} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Collapsible body */}
      {isOpen && (
        <View style={s.body}>
          {children}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  cardOpen: {
    borderColor: `${brand.primary}30`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
  },
});
