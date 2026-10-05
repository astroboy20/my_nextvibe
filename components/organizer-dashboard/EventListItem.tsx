import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { type OrganizerEvent } from "@/store/api/usersApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import StatusBadge from "./Badge";

function EventListItem({ item }: { item: OrganizerEvent }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={ev.row}
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: "/edit-event", params: { id: item.id } })
      }
    >
      <View style={ev.thumb}>
        {item.flierUrl ? (
          <Image
            source={{ uri: item.flierUrl }}
            style={ev.thumbImg}
            resizeMode="cover"
          />
        ) : (
          <View style={ev.thumbFallback}>
            <Ionicons name="calendar" size={22} color={brand.primary} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={ev.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={ev.date}>
          {new Date(item.startsAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {item.locationName && (
          <View style={ev.locationRow}>
            <Ionicons name="location-outline" size={11} color={neutral[500]} />
            <Text style={ev.locationText} numberOfLines={1}>
              {item.locationName}
            </Text>
          </View>
        )}
      </View>

      <View style={ev.right}>
        <StatusBadge status={item.status} />
        <Ionicons name="chevron-forward" size={16} color={neutral[300]} />
      </View>
    </TouchableOpacity>
  );
}

export default EventListItem;

const ev = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: "hidden" },
  thumbImg: { width: 64, height: 64 },
  thumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: `${brand.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  date: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: neutral[500],
    marginTop: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  locationText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
    flex: 1,
  },
  right: { alignItems: "flex-end", gap: 6 },
});
