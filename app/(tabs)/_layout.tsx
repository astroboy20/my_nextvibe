import BottomTabBar from '@/components/navigation/BottomTabBar';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  // Set up foreground notification listener and tap-through deep linking.
  // Mounted here so it's only active while the user is authenticated.
  usePushNotifications();

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
