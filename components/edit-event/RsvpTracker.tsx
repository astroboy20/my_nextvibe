import { neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RsvpCounts {
  going: number;
  maybe: number;
  cantGo: number;
}

interface Props {
  counts: RsvpCounts;
}

interface StatCardProps {
  value: number;
  label: string;
  valueColor: string;
  bgColor: string;
}

function StatCard({ value, label, valueColor, bgColor }: StatCardProps) {
  return (
    <View style={[s.card, { backgroundColor: bgColor }]}>
      <Text style={[s.value, { color: valueColor }]}>{value}</Text>
      <Text style={[s.label, { color: valueColor }]}>{label}</Text>
    </View>
  );
}

export default function RsvpTracker({ counts }: Props) {
  return (
    <View style={s.row}>
      <StatCard
        value={counts.going}
        label="Going"
        valueColor="#16A34A"
        bgColor="#DCFCE7"
      />
      <StatCard
        value={counts.maybe}
        label="Maybe"
        valueColor="#D97706"
        bgColor="#FEF3C7"
      />
      <StatCard
        value={counts.cantGo}
        label="Can't Go"
        valueColor="#64748B"
        bgColor={neutral[100]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  value: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
});
