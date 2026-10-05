import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useGetOverviewLocationAnalyticsQuery } from "@/store/api/analyticsApi";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

const AudienceLocationCard = () => {
  const { data, isLoading } = useGetOverviewLocationAnalyticsQuery();

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color={brand.primary} />
      </View>
    );
  }

  const d = data?.data ?? data ?? {};
  const totalAttendees: number = d.totalAttendees ?? 0;
  const byCity: any[] = d.byCity ?? [];
  const byCountry: any[] = d.byCountry ?? [];

  if (totalAttendees === 0) return null;

  // Top 5 cities, Unknown last
  const topCities = [...byCity]
    .sort((a, b) => {
      if (a.city === "Unknown") return 1;
      if (b.city === "Unknown") return -1;
      return b.count - a.count;
    })
    .slice(0, 5);

  const maxCount = topCities[0]?.count ?? 1;
  const unknownCity = byCity.find((c) => c.city === "Unknown");
  const topCountry = byCountry.find((c) => c.country !== "Unknown");

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={s.iconWrap}>
            <Ionicons name="location-outline" size={14} color={brand.primary} />
          </View>
          <View>
            <Text style={s.title}>Audience Locations</Text>
            <Text style={s.subtitle}>
              {totalAttendees.toLocaleString()} attendees across all events
            </Text>
          </View>
        </View>
        {topCountry && (
          <View style={s.countryBadge}>
            <Text style={s.countryBadgeText}>
              🌍 {topCountry.country} {topCountry.percentage}%
            </Text>
          </View>
        )}
      </View>

      {/* City bar list */}
      <View style={s.cityList}>
        {topCities.map((c) => (
          <View key={c.city} style={s.cityItem}>
            <View style={s.cityLabelRow}>
              <View style={s.cityNameRow}>
                {c.city === "Unknown" && (
                  <Ionicons
                    name="information-circle-outline"
                    size={12}
                    color="#f59e0b"
                  />
                )}
                <Text style={s.cityName}>{c.city}</Text>
              </View>
              <Text style={s.cityCount}>
                {c.percentage}% ({c.count.toLocaleString()})
              </Text>
            </View>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  {
                    width: `${Math.min(100, (c.count / maxCount) * 100)}%`,
                    backgroundColor:
                      c.city === "Unknown" ? neutral[300] : brand.primary,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Unknown footnote */}
      {unknownCity && unknownCity.count > 0 && (
        <View style={s.footnoteRow}>
          <Ionicons
            name="information-circle-outline"
            size={12}
            color="#f59e0b"
            style={s.footnoteIcon}
          />
          <Text style={s.footnoteText}>
            Unknown includes attendees who haven't shared their location yet.
          </Text>
        </View>
      )}
    </View>
  );
}

export default AudienceLocationCard;

const s = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: neutral[200],
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${brand.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[800],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[500],
    marginTop: 1,
  },
  countryBadge: {
    backgroundColor: neutral[100],
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countryBadgeText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[500],
  },
  cityList: {
    gap: 8,
  },
  cityItem: {
    gap: 4,
  },
  cityLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityName: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[800],
  },
  cityCount: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[500],
  },
  barTrack: {
    height: 6,
    width: "100%",
    borderRadius: 999,
    backgroundColor: neutral[100],
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  footnoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  footnoteIcon: {
    marginTop: 1,
  },
  footnoteText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[500],
    flex: 1,
  },
});
