import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onDesignWithTemplate: () => void;
}

export default function StartScreen({ onDesignWithTemplate }: Props) {
  return (
    <View style={s.root}>
      {/* Warning */}
      <View style={s.warningBox}>
        <Ionicons name="warning-outline" size={16} color="#b45309" style={{ marginTop: 1 }} />
        <Text style={s.warningText}>
          <Text style={s.warningBold}>Once created, a VibeTag cannot be edited or deleted.</Text>{' '}
          Please review your design carefully before saving.
        </Text>
      </View>

      {/* Design with Templates card */}
      <TouchableOpacity
        style={s.card}
        onPress={onDesignWithTemplate}
        activeOpacity={0.85}
      >
        <View style={s.cardHeader}>
          <View style={s.iconCircle}>
            <Ionicons name="grid-outline" size={22} color={brand.primary} />
          </View>
          <View>
            <Text style={s.cardTitle}>Design with Templates</Text>
            <Text style={s.cardSubtitle}>Pick a frame, add text & stickers</Text>
          </View>
        </View>

        {/* Template previews row */}
        <View style={s.previewRow}>
          <View style={[s.previewThumb, s.previewThumbSmall, { backgroundColor: '#ffe4e1' }]}>
            <Ionicons name="image-outline" size={20} color="#f43f5e" />
          </View>
          <View style={[s.previewThumb, s.previewThumbLarge, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="image-outline" size={28} color="#0ea5e9" />
          </View>
        </View>

        <View style={s.arrowRow}>
          <Text style={s.arrowLabel}>Get started</Text>
          <Ionicons name="arrow-forward" size={16} color={brand.primary} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#92400e',
    lineHeight: 18,
  },
  warningBold: { fontFamily: fontFamily.semibold },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  cardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginTop: 2,
  },
  previewRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 4 },
  previewThumb: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewThumbSmall: { width: '35%', aspectRatio: 3 / 4 },
  previewThumbLarge: { flex: 1, aspectRatio: 3 / 4 },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  arrowLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});
