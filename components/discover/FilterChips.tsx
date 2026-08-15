import { brand, neutral } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ChipDef {
  label: string;
  icon: IoniconName;
}

interface Props {
  chips: ChipDef[];
  active: string[];
  onToggle: (label: string) => void;
  onClearAll?: () => void;
  /** Pass true when any filter (chips, vibe, location, search) is active */
  hasActiveFilters?: boolean;
}

export default function FilterChips({ chips, active, onToggle, onClearAll, hasActiveFilters }: Props) {

  return (
    <View style={styles.wrapper}>
      <FlatList
        horizontal
        data={chips}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item: { label, icon } }) => {
          const isActive = active.includes(label);
          return (
            <TouchableOpacity
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onToggle(label)}
              activeOpacity={0.75}
            >
              <Ionicons name={icon} size={12} color={isActive ? '#fff' : neutral[500]} />
              <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        }}
      />
      {hasActiveFilters && onClearAll && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClearAll}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={13} color={brand.primary} />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[300],
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: brand.primaryDark,
    borderColor: brand.primaryDark,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: neutral[600],
  },
  labelActive: {
    color: '#fff',
    fontFamily: fontFamily.semibold,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 16,
    paddingVertical: 8,
  },
  clearText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: brand.primary,
  },
});
