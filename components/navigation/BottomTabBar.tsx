import { brand, neutral } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Icon config ──────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  index:    { active: 'home',       inactive: 'home-outline' },
  social:   { active: 'people',     inactive: 'people-outline' },
  messages: { active: 'chatbubble', inactive: 'chatbubble-outline' },
  profile:  { active: 'person',     inactive: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  index:    'Home',
  social:   'Social',
  messages: 'Messages',
  profile:  'Profile',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const leftRoutes  = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  function renderTab(route: (typeof state.routes)[0], index: number) {
    const isFocused = state.index === index;
    const label     = TAB_LABELS[route.name] ?? route.name;
    const icons     = TAB_ICONS[route.name];
    const color     = isFocused ? brand.primary : neutral[400];
    const iconName  = icons ? (isFocused ? icons.active : icons.inactive) : 'ellipse-outline';

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isFocused }}
      >
        <Ionicons name={iconName} size={22} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
        {leftRoutes.map((route, i) => renderTab(route, i))}

        {/* Center FAB — navigates to Create Event page */}
        <View style={styles.fabWrap}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/create')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create event"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {rightRoutes.map((route, i) => renderTab(route, leftRoutes.length + i))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    marginTop: 1,
  },
  fabWrap: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
});
