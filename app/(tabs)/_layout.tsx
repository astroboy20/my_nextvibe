import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// Simple cross-platform tab icon — expo-symbols is iOS-only
function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return (
    <Text style={{ fontSize: 22, color, lineHeight: 28 }}>{symbol}</Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[scheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => <TabIcon symbol="⌂" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <TabIcon
                    symbol="ℹ"
                    color={pressed ? Colors[scheme].tabIconDefault : Colors[scheme].text}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => <TabIcon symbol="☰" color={color} />,
        }}
      />
    </Tabs>
  );
}
