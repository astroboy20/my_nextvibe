/**
 * StepOne — Game name & number of rounds
 */
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  gameName: string;
  setGameName: (v: string) => void;
  numberOfRounds: number;
  setNumberOfRounds: (v: number) => void;
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function StepOne({
  gameName,
  setGameName,
  numberOfRounds,
  setNumberOfRounds,
}: Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.section}>
        <Text style={s.label}>
          Game Name <Text style={s.required}>*</Text>
        </Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Nextvibe Trivia Night"
          placeholderTextColor={neutral[400]}
          value={gameName}
          onChangeText={setGameName}
          autoFocus
        />
      </View>

      <View style={s.section}>
        <Text style={s.label}>Number of Rounds</Text>
        <Text style={s.hint}>
          Each round can have a different game type and its own set of
          questions. Max 10 rounds.
        </Text>
        <View style={s.grid}>
          {ROUND_OPTIONS.map((n) => {
            const active = numberOfRounds === n;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => setNumberOfRounds(n)}
                style={[s.roundBtn, active && s.roundBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.roundNum, active && s.roundNumActive]}>
                  {n}
                </Text>
                <Text style={s.roundLabel}>
                  {n === 1 ? 'round' : 'rounds'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 24 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    marginBottom: 8,
  },
  required: { color: '#EF4444' },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: neutral[800],
    backgroundColor: neutral[0],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roundBtn: {
    width: '18%',
    borderWidth: 2,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    backgroundColor: neutral[0],
  },
  roundBtnActive: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}12`,
  },
  roundNum: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: neutral[800],
  },
  roundNumActive: { color: brand.primary },
  roundLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[400],
  },
});
