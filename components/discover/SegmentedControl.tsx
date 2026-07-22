import { neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}

export default function SegmentedControl({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: neutral[100],
    borderRadius: 24,
    padding: 4,
  },
  option: {
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 20,
  },
  optionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  label:       { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[500] },
  labelActive: { color: neutral[800] },
});
