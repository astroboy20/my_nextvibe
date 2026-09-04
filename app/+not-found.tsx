import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  const colors = Colors.light;

  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="compass-outline" size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This screen doesn't exist or has been moved.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "NunitoSans_700Bold",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
  },
});
