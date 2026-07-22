import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  onLocationPress: () => void;
  onVibesPress: () => void;
  vibeLabel?: string;
}

export default function SearchFilterCard({
  search,
  onSearchChange,
  onLocationPress,
  onVibesPress,
  vibeLabel = 'All vibes',
}: Props) {
  return (
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
          <TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Location + Vibes */}
      <View style={styles.pillRow}>
        <TouchableOpacity style={styles.pill} onPress={onLocationPress} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={14} color={brand.primary} />
          <Text style={styles.pillText}>Location</Text>
          <Ionicons name="location-outline" size={14} color={neutral[300]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.pill} onPress={onVibesPress} activeOpacity={0.7}>
          <Text style={styles.pillText}>{vibeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={neutral[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  pillText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
});
