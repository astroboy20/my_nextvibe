import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PeopleTab = "following" | "followers" | "mutuals";

const TABS: PeopleTab[] = ["following", "followers", "mutuals"];

interface PeopleSubTabsProps {
  active: PeopleTab;
  onSelect: (t: PeopleTab) => void;
}

export function PeopleSubTabs({ active, onSelect }: PeopleSubTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: neutral[100],
  },
  tabActive: { backgroundColor: brand.primary },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  labelActive: { color: "#fff" },
});
