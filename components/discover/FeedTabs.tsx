import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FeedTabDef {
  label: string;
  icon: IoniconName;
}

interface Props {
  tabs: FeedTabDef[];
  active: string;
  onSelect: (label: string) => void;
}

export default function FeedTabs({ tabs, active, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map(({ label, icon }) => {
        const isActive = active === label;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(label)}
            activeOpacity={0.75}
          >
            <Ionicons name={icon} size={14} color={isActive ? '#fff' : neutral[600]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
  },
  tabActive:   { backgroundColor: brand.primaryDark },
  label:       { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
  labelActive: { color: '#fff' },
});
