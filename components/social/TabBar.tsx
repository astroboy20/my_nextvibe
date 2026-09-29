import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface TabBarItem {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

interface TabBarProps {
  tabs: TabBarItem[];
  active: string;
  onSelect: (id: string) => void;
}

export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <TouchableOpacity
            key={t.id}
            style={styles.tab}
            onPress={() => onSelect(t.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={isActive ? brand.primary : neutral[400]}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t.label}
            </Text>
            {isActive && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    position: "relative",
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  labelActive: { color: brand.primary },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: brand.primary,
    borderRadius: 2,
  },
});
