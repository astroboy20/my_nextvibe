import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useToggleFollowMutation } from "@/store/api/socialApi";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Toast from "react-native-toast-message";
import type { EventDetail } from "./types";

interface Props {
  event: EventDetail;
}

// ── Geocode an address string → lat/lng ───────────────────────────────────────
// Uses the Google Geocoding REST API (same key as Places)

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "";
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${key}`
    );
    const json = await res.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

// ── Embedded map ──────────────────────────────────────────────────────────────

function EventMap({ address }: { address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    geocodeAddress(address).then((result) => {
      if (!cancelled) {
        setCoords(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const openInMaps = () => {
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
  };

  if (loading) {
    return (
      <View style={map.loader}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  if (!coords) {
    // No API key or geocoding failed — show a tappable fallback
    return (
      <TouchableOpacity
        style={map.fallback}
        onPress={openInMaps}
        activeOpacity={0.8}
      >
        <Ionicons name="map-outline" size={28} color={neutral[400]} />
        <Text style={map.fallbackAddr} numberOfLines={2}>
          {address}
        </Text>
        <View style={map.fallbackPill}>
          <Ionicons name="open-outline" size={12} color={brand.primary} />
          <Text style={map.fallbackPillText}>Open in Maps</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const region = {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  return (
    <TouchableOpacity
      style={map.container}
      activeOpacity={1}
      onPress={openInMaps}
    >
      <MapView
        ref={mapRef}
        style={map.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        pointerEvents="none"
      >
        <Marker
          coordinate={{ latitude: coords.lat, longitude: coords.lng }}
          title={address}
        />
      </MapView>

      {/* "Open in Maps" pill overlay */}
      <View style={map.overlay}>
        <View style={map.overlayPill}>
          <Ionicons name="open-outline" size={12} color="#fff" />
          <Text style={map.overlayText}>Open in Maps</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Organizer avatar ──────────────────────────────────────────────────────────

function OrgAvatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${brand.primary}20`,
        }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        s.orgAvatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[s.orgAvatarText, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.infoRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, onPress && { color: brand.primary }]}>
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="open-outline" size={14} color={brand.primary} />
      )}
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AboutTab({ event }: Props) {
  // useAuth gives us the logged-in user from Redux state — same source of truth
  // used everywhere in the app (set on login/bootstrap, never stale)
  const { user } = useAuth();

  const showLocation = event.mode === "ONSITE" || event.mode === "HYBRID";
  const showVirtual = event.mode === "VIRTUAL" || event.mode === "HYBRID";

  // Compare logged-in user ID against the event organizer ID.
  // If they match, this is the user's own event — hide the follow button.
  const isOwnEvent =
    !!user?.id && !!event.organizer?.id && user.id === event.organizer.id;

  const [isFollowing, setIsFollowing] = useState(
    event.organizer?.isFollowing ?? false
  );

  // Keep local state in sync if the event prop updates (e.g. after cache invalidation)
  const prevOrganizerIdRef = React.useRef(event.organizer?.id);
  React.useEffect(() => {
    // Only resync when the organizer changes or the isFollowing field changes
    if (
      event.organizer?.id !== prevOrganizerIdRef.current ||
      event.organizer?.isFollowing !== undefined
    ) {
      prevOrganizerIdRef.current = event.organizer?.id;
      setIsFollowing(event.organizer?.isFollowing ?? false);
    }
  }, [event.organizer?.id, event.organizer?.isFollowing]);

  const [toggleFollow, { isLoading: isTogglingFollow }] =
    useToggleFollowMutation();

  const handleFollow = async () => {
    if (!event.organizer?.id) return;
    const prev = isFollowing;
    setIsFollowing(!prev); // optimistic
    try {
      await toggleFollow({
        userId: event.organizer.id,
        isCurrentlyFollowing: prev,
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
      setIsFollowing(prev); // revert
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 4 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${brand.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: neutral[500],
  },
  infoValue: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    marginTop: 1,
  },

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
  orgAvatarFallback: {
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  orgAvatarText: { fontFamily: fontFamily.bold, color: "#fff" },
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

const map = StyleSheet.create({
  container: {
    marginTop: 12,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: neutral[100],
  },
  map: { width: "100%", height: "100%" },

  loader: {
    marginTop: 12,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },

  fallback: {
    marginTop: 12,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  fallbackAddr: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    textAlign: "center",
  },
  fallbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brand.primary,
    marginTop: 4,
  },
  fallbackPillText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: brand.primary,
  },

  overlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  overlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: "#fff",
  },
});
