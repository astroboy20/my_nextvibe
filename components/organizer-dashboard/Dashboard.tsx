import { AppHeader } from "@/components/navigation/TopNavBar";
import {
  AudienceCardSkeleton,
  DashboardEventsSkeleton,
} from "@/components/ui/Skeleton";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import {
  useGetOrganizerEventsQuery,
  type OrganizerEvent,
} from "@/store/api/usersApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudienceLocationCard from "./AudienceLocation";
import EventListItem from "./EventListItem";

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Screen ───────────────────────────────────────────────────────────────────

const  DashboardScreen = ()=> {
  const router = useRouter();
  const { user } = useAuth();

  const userId = user?.id ?? "";

  const {
    data: eventsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrganizerEventsQuery(
    { organizerId: userId, page: 1, limit: 50 },
    { skip: !userId }
  );

  const events = eventsData?.data?.data ?? [];
  const isFirstLoad = isLoading && !eventsData;
  const isRefreshing = isFetching && !!eventsData;

  useRefetchOnFocus(refetch);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => router.back()} />
      <FlatList
        data={isFirstLoad ? [] : events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={brand.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Greeting */}
            <Text style={styles.greeting}>
              Hi, {user?.displayName ?? "there"} 👋
            </Text>

            {/* My Events header row */}
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <View style={styles.titleIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={brand.primary}
                  />
                </View>
                <View>
                  <Text style={styles.titleText}>My Events</Text>
                  <Text style={styles.titleSub}>
                    Organize your events, tickets, and interactions effortlessly
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => router.push("/create")}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newBtnText}>New</Text>
              </TouchableOpacity>
            </View>

            {/* Audience card — skeleton while loading */}
            {isFirstLoad ? (
              <AudienceCardSkeleton />
            ) : (
              eventsData && <AudienceLocationCard />
            )}

            {/* Events list skeleton */}
            {isFirstLoad && <DashboardEventsSkeleton />}

            {/* Divider before real list */}
            {!isFirstLoad && events.length > 0 && (
              <View style={styles.divider} />
            )}
          </View>
        }
        renderItem={({ item }) => <EventListItem item={item} />}
        ListEmptyComponent={
          !isFirstLoad ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={brand.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySub}>
                Create your first event to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/create")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default DashboardScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  listContent: { paddingBottom: 48 },

  headerSection: { paddingTop: 16 },

  greeting: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.lg,
    color: neutral[900],
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${brand.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  titleText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[900],
  },
  titleSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
    marginTop: 2,
    maxWidth: 200,
  },

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brand.primary,
  },
  newBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginHorizontal: 16,
    marginBottom: 8,
  },

  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${brand.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginTop: 4,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: brand.primary,
  },
  emptyBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});
