import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useToggleFollowMutation } from "@/store/api/socialApi";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import type { EventDetail } from "./types";
import { useGetMeQuery } from "@/store/api/usersApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EventMap from "./components/EventMap";
import OrgAvatar from "./components/Avatar";
import InfoRow from "./components/InfoRow";

interface Props {
  event: EventDetail;
}
export default function AboutTab({ event }: Props) {
  const token = AsyncStorage.getItem("accessToken");
  const showLocation = event.mode === "ONSITE" || event.mode === "HYBRID";
  const showVirtual = event.mode === "VIRTUAL" || event.mode === "HYBRID";

  const { data: me, isLoading: isLoadingUser } = useGetMeQuery(undefined, {
    skip: !token,
  });

  const isOwnEvent =
    me?.data?.id && event?.organizer?.id
      ? me.data.id === event.organizer.id
      : false;

  const [isFollowing, setIsFollowing] = useState(
    event.organizer?.isFollowing ?? false
  );

  const [toggleFollow, { isLoading: isTogglingFollow }] =
    useToggleFollowMutation();

  const handleFollow = async () => {
    if (!event.organizer?.id) return;
    const prev = isFollowing;
    setIsFollowing(!prev); // optimistic
    try {
      const res = await toggleFollow({
        userId: event.organizer.id,
        isFollowing: prev,
      }).unwrap();
      Toast.show({
        type: "success",
        text1: prev ? "Unfollowed" : "Following!",
        text2: prev
          ? `You unfollowed ${event.organizer.displayName ?? "this organizer"}`
          : `You are now following ${
              event.organizer.displayName ?? "this organizer"
            }`,
        visibilityTime: 2500,
      });
    } catch (err: any) {
      setIsFollowing(prev);
      Toast.show({
        type: "error",
        text1: "Something went wrong",
        text2: err?.data?.message ?? "Could not update follow status.",
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={s.wrap}>
      {/* Date / time */}
      <InfoRow
        icon="calendar-outline"
        label="Date & Time"
        value={new Date(event.startsAt).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      />

      {/* Attendees */}
      <InfoRow
        icon="people-outline"
        label="Attendees"
        value={`${event.attendingCount ?? 0} attending`}
      />

      {/* Location info row */}
      {showLocation && event.locationName && (
        <InfoRow
          icon="location-outline"
          label="Location"
          value={event.locationName}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                event.locationName!
              )}`
            )
          }
        />
      )}

      {/* Virtual link */}
      {showVirtual && event.virtualLink && (
        <InfoRow
          icon="videocam-outline"
          label="Meeting Link"
          value={event.virtualLink}
          onPress={() => Linking.openURL(event.virtualLink!)}
        />
      )}

      {/* Description */}
      {event.description ? (
        <View style={s.descCard}>
          <Text style={s.descTitle}>About this event</Text>
          <Text style={s.desc}>{event.description}</Text>
        </View>
      ) : null}

      {/* Organizer */}
      {event.organizer && (
        <View style={s.orgCard}>
          <Text style={s.orgTitle}>Organized by</Text>
          <View style={s.orgRow}>
            <OrgAvatar
              uri={event.organizer.avatarUrl}
              name={
                event.organizer.displayName ?? event.organizer.username ?? "O"
              }
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.orgName}>
                {event.organizer.displayName ?? event.organizer.username}
              </Text>
              {event.organizer.username && (
                <Text style={s.orgHandle}>@{event.organizer.username}</Text>
              )}
            </View>

            {/* Hidden when viewing your own event */}
            {!isOwnEvent && (
              <TouchableOpacity
                style={[s.followBtn, isFollowing && s.followBtnActive]}
                activeOpacity={0.8}
                onPress={handleFollow}
                disabled={isTogglingFollow}
              >
                {isTogglingFollow ? (
                  <ActivityIndicator
                    size={12}
                    color={isFollowing ? "#fff" : brand.primary}
                  />
                ) : (
                  <Text
                    style={[
                      s.followBtnText,
                      isFollowing && s.followBtnTextActive,
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Real embedded map — only for ONSITE / HYBRID events with a location */}
      {showLocation && event.locationName && (
        <EventMap address={event.locationName} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 4 },

  descCard: { padding: 14 },
  descTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#5A4C76",
    marginBottom: 8,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[600],
    lineHeight: 22,
  },

  orgCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[100],
    marginTop: 8,
  },
  orgTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: "#9AA6B1",
    marginBottom: 12,
  },
  orgRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  orgName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  orgHandle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
    marginTop: 1,
  },

  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: brand.primary,
    minWidth: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnActive: { backgroundColor: brand.primary },
  followBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: brand.primary,
  },
  followBtnTextActive: { color: "#fff" },
});
