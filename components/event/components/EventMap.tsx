import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

    if (json?.status !== "OK") {
      console.warn("Geocoding failed:", json?.status, json?.error_message);
      return null;
    }

    const loc = json?.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.warn("Geocoding request error:", err);
    return null;
  }
}

interface EventMapProps {
  address: string;
  latitude?: number;
  longitude?: number;
}

const EventMap = ({ address, latitude, longitude }: EventMapProps) => {
  const hasServerCoords = latitude != null && longitude != null;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    hasServerCoords ? { lat: latitude!, lng: longitude! } : null
  );
  const [loading, setLoading] = useState(!hasServerCoords);

  useEffect(() => {
    if (hasServerCoords) {
      setCoords({ lat: latitude!, lng: longitude! });
      setLoading(false);
      return;
    }

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
  }, [address, hasServerCoords, latitude, longitude]);

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
};

export default EventMap;

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
