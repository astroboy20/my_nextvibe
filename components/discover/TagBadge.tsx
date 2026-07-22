import { fontFamily } from '@/constants/Typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  color: string;
}

export default function TagBadge({ label, color }: Props) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 3,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: '#fff',
  },
});
