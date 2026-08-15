import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  "music",
  "tech",
  "party",
  "art",
  "food",
  "fitness",
  "travel",
  "nightlife",
  "festival",
  "wedding",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  /** Controlled selected vibe — null means "All vibes" */
  selectedVibe: string | null;
  onVibeChange: (vibe: string | null) => void;
  /** Controlled location label — null means not set */
  locationLabel: string | null;
  onLocationChange: (coords: { lat: number; lng: number } | null, label: string | null) => void;
}

export default function SearchFilterCard({
  search,
  onSearchChange,
  selectedVibe,
  onVibeChange,
  locationLabel,
  onLocationChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [vibeOpen,      setVibeOpen]      = useState(false);
  const [locLoading,    setLocLoading]    = useState(false);

  // ── Location handler ───────────────────────────────────────────────────────
  async function handleLocationPress() {
    // If location is set, clear it
    if (locationLabel) {
      onLocationChange(null, null);
      return;
    }

    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const label = place
        ? [place.city ?? place.subregion, place.region]
            .filter(Boolean)
            .join(", ")
        : `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;

      onLocationChange(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        label
      );
    } catch {
      // silently fail — don't block the user
    } finally {
      setLocLoading(false);
    }
  }

  const locActive   = !!locationLabel;
  const vibeActive  = !!selectedVibe;

  return (
    <>
      <View style={styles.card}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events by name..."
            placeholderTextColor={neutral[400]}
            value={search}
            onChangeText={onSearchChange}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={neutral[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Location + Vibes */}
        <View style={styles.pillRow}>
          {/* Location pill */}
          <TouchableOpacity
            style={[styles.pill, locActive && styles.pillActive]}
            onPress={handleLocationPress}
            activeOpacity={0.7}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={brand.primary} />
            ) : (
              <Ionicons
                name="location-outline"
                size={14}
                color={locActive ? "#fff" : brand.primary}
              />
            )}
            <Text style={[styles.pillText, locActive && styles.pillTextActive]} numberOfLines={1}>
              {locationLabel ?? "Near me"}
            </Text>
            {locActive && (
              <Ionicons name="close-circle" size={14} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Vibes pill */}
          <TouchableOpacity
            style={[styles.pill, vibeActive && styles.pillActive]}
            onPress={() => setVibeOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="musical-notes-outline"
              size={14}
              color={vibeActive ? "#fff" : neutral[500]}
            />
            <Text style={[styles.pillText, vibeActive && styles.pillTextActive]}>
              {selectedVibe ?? "All vibes"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={vibeActive ? "#fff" : neutral[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vibe dropdown modal */}
      <Modal
        visible={vibeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVibeOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVibeOpen(false)}
        >
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            // Prevent backdrop tap from firing when tapping sheet
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose a vibe</Text>

            {/* Clear option */}
            <TouchableOpacity
              style={[
                styles.option,
                !selectedVibe && styles.optionActive,
              ]}
              onPress={() => { onVibeChange(null); setVibeOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, !selectedVibe && styles.optionTextActive]}>
                All vibes
              </Text>
              {!selectedVibe && (
                <Ionicons name="checkmark" size={16} color={brand.primary} />
              )}
            </TouchableOpacity>

            <FlatList
              data={INTEREST_OPTIONS}
              keyExtractor={(item) => item}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const active = selectedVibe === item;
                return (
                  <TouchableOpacity
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => { onVibeChange(item); setVibeOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={16} color={brand.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: neutral[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: neutral[100],
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  pillActive: {
    backgroundColor: brand.primaryDark,
    borderColor: brand.primaryDark,
  },
  pillText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[600],
    textAlign: "center",
  },
  pillTextActive: {
    color: "#fff",
    fontFamily: fontFamily.semibold,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[900],
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  optionActive: {
    backgroundColor: "transparent",
  },
  optionText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[700],
  },
  optionTextActive: {
    fontFamily: fontFamily.semibold,
    color: brand.primary,
  },
});
