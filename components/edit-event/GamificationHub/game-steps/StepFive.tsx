/**
 * StepFive — Reward tiers for each winner position
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DiscountType, ORDINALS, RewardTier, RewardType } from '../types';

interface Props {
  rewardTiers: RewardTier[];
  updateRewardTier: (id: string, field: keyof RewardTier, value: string | number) => void;
  priceCurrency: string;
}

const REWARD_TYPES: { value: RewardType; label: string }[] = [
  { value: 'CASH',        label: 'Cash' },
  { value: 'COUPON',      label: 'Coupon' },
  { value: 'MERCHANDISE', label: 'Merch' },
  { value: 'FREE_TICKET', label: 'Free Ticket' },
  { value: 'BADGE',       label: 'Badge' },
  { value: 'POINTS',      label: 'Points' },
  { value: 'OTHER',       label: 'Other' },
];

const RANK_COLORS: Record<number, string> = {
  1: '#EAB308',  // gold
  2: '#9CA3AF',  // silver
  3: '#D97706',  // bronze
};

export default function StepFive({ rewardTiers, updateRewardTier, priceCurrency }: Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>Reward Tiers</Text>
        <Text style={s.subtitle}>
          Set a prize for each of the {rewardTiers.length} winner
          {rewardTiers.length !== 1 ? 's' : ''}.
        </Text>
      </View>

      {rewardTiers.map((tier) => (
        <TierCard
          key={tier.id}
          tier={tier}
          priceCurrency={priceCurrency}
          rankColor={RANK_COLORS[tier.rank] ?? neutral[400]}
          update={(field, value) => updateRewardTier(tier.id, field, value)}
        />
      ))}
    </ScrollView>
  );
}

function TierCard({
  tier,
  priceCurrency,
  rankColor,
  update,
}: {
  tier: RewardTier;
  priceCurrency: string;
  rankColor: string;
  update: (field: keyof RewardTier, value: string | number) => void;
}) {
  const hasValue = !!tier.value;

  return (
    <View style={[tc.card, hasValue && tc.cardFilled]}>
      {/* Rank header */}
      <View style={tc.rankRow}>
        <View style={[tc.rankBadge, { backgroundColor: rankColor }]}>
          <Ionicons name="trophy" size={16} color="#fff" />
        </View>
        <View>
          <Text style={tc.rankLabel}>
            {ORDINALS[tier.rank - 1] ?? `${tier.rank}th`} Place
          </Text>
          <Text style={tc.rankSub}>Rank #{tier.rank}</Text>
        </View>
      </View>

      {/* Reward Type chips */}
      <View style={tc.section}>
        <Text style={tc.fieldLabel}>Reward Type</Text>
        <View style={tc.chipRow}>
          {REWARD_TYPES.map(({ value, label }) => {
            const active = tier.type === value;
            return (
              <TouchableOpacity
                key={value}
                style={[tc.chip, active && tc.chipActive]}
                onPress={() => update('type', value)}
                activeOpacity={0.7}
              >
                <Text style={[tc.chipText, active && tc.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Title */}
      <View style={tc.section}>
        <Text style={tc.fieldLabel}>Prize Title</Text>
        <TextInput
          style={tc.input}
          value={tier.title}
          onChangeText={(v) => update('title', v)}
          placeholder={`${ORDINALS[tier.rank - 1] ?? `${tier.rank}th`} Place Winner`}
          placeholderTextColor={neutral[400]}
        />
      </View>

      {/* Description */}
      <View style={tc.section}>
        <Text style={tc.fieldLabel}>Description</Text>
        <TextInput
          style={tc.input}
          value={tier.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Prize for the top performer."
          placeholderTextColor={neutral[400]}
        />
      </View>

      {/* Value */}
      <View style={tc.section}>
        <Text style={tc.fieldLabel}>
          {tier.type === 'CASH'
            ? `Cash Amount (${priceCurrency})`
            : tier.type === 'POINTS'
            ? 'Points Amount'
            : tier.type === 'BADGE'
            ? 'Badge Name / ID'
            : 'Value'}
          {(tier.type === 'CASH' || tier.type === 'POINTS') && (
            <Text style={{ color: semantic.error }}> *</Text>
          )}
        </Text>
        <TextInput
          style={[
            tc.input,
            (tier.type === 'CASH' || tier.type === 'POINTS') &&
              (!tier.value || Number(tier.value) <= 0) &&
              tc.inputError,
          ]}
          value={tier.value}
          onChangeText={(v) => update('value', v)}
          keyboardType={
            tier.type === 'CASH' || tier.type === 'POINTS'
              ? 'decimal-pad'
              : 'default'
          }
          placeholder={
            tier.type === 'CASH'        ? 'e.g. 10000'
            : tier.type === 'POINTS'    ? 'e.g. 500'
            : tier.type === 'BADGE'     ? 'e.g. Champion'
            : tier.type === 'FREE_TICKET' ? 'e.g. VIP Pass'
            : tier.type === 'MERCHANDISE' ? 'e.g. Event T-Shirt'
            : 'Describe the reward'
          }
          placeholderTextColor={neutral[400]}
        />
      </View>

      {/* Coupon extras */}
      {tier.type === 'COUPON' && (
        <>
          <View style={tc.section}>
            <Text style={tc.fieldLabel}>Discount Type</Text>
            <View style={tc.chipRow}>
              {(['PERCENTAGE', 'FIXED_AMOUNT'] as DiscountType[]).map((v) => {
                const active = tier.discountType === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[tc.chip, active && tc.chipActive]}
                    onPress={() => update('discountType', v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[tc.chipText, active && tc.chipTextActive]}>
                      {v === 'PERCENTAGE' ? '%' : 'Fixed'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={tc.row}>
            <View style={{ flex: 1 }}>
              <Text style={tc.fieldLabel}>Discount Value</Text>
              <TextInput
                style={tc.input}
                value={String(tier.discountValue)}
                onChangeText={(v) => update('discountValue', Number(v))}
                keyboardType="decimal-pad"
                placeholder="20"
                placeholderTextColor={neutral[400]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tc.fieldLabel}>Usage Limit</Text>
              <TextInput
                style={tc.input}
                value={String(tier.usageLimit)}
                onChangeText={(v) => update('usageLimit', Number(v))}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={neutral[400]}
              />
            </View>
          </View>
        </>
      )}

      {/* Quantity (non cash/points) */}
      {tier.type !== 'CASH' && tier.type !== 'POINTS' && (
        <View style={tc.section}>
          <Text style={tc.fieldLabel}>Quantity</Text>
          <TextInput
            style={tc.input}
            value={String(tier.quantity)}
            onChangeText={(v) => update('quantity', Number(v))}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={neutral[400]}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { marginBottom: 16 },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.md, color: neutral[800] },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], marginTop: 2 },
});

const tc = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: neutral[200],
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: neutral[0],
    gap: 4,
  },
  cardFilled: { borderColor: `${semantic.success}60` },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  rankSub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.xs, color: neutral[400] },
  section: { marginBottom: 8 },
  row:     { flexDirection: 'row', gap: 10, marginBottom: 8 },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
    backgroundColor: neutral[0],
  },
  inputError: { borderColor: semantic.error },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  chipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  chipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  chipTextActive: { color: '#fff' },
});
