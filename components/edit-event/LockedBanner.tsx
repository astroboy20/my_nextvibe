import { brand, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  message?: string;
}

export default function LockedBanner({
  message = 'This event has already started. All editing is now locked.',
}: Props) {
  return (
    <View style={s.wrap}>
      <Ionicons name="lock-closed" size={14} color={semantic.error} style={{ marginTop: 1 }} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${semantic.error}40`,
    backgroundColor: `${semantic.error}08`,
    marginBottom: 20,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: semantic.error,
    flex: 1,
    lineHeight: 20,
  },
});
