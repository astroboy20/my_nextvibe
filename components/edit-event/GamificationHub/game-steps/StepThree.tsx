/**
 * StepThree — Game type picker, content method (AI / manual), AI prompt
 */
import { brand, neutral } from '@/constants/Colors';
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
import { ApiGameType, GameType } from '../types';

interface Props {
  roundIndex: number;
  totalRounds: number;
  roundTitle: string;
  roundDescription: string;
  onRoundTitleChange: (v: string) => void;
  onRoundDescriptionChange: (v: string) => void;
  selectedGameType: GameType;
  onGameTypeChange: (v: GameType) => void;
  contentMode: string;
  setContentMode: (v: string) => void;
  aiPrompt: {
    topic: string;
    count: number | null;
    gameType: ApiGameType | '';
    difficulty: string;
    activityTiming: 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT' | 'BOTH' | '';
    eventName: string;
  };
  setAiPrompt: React.Dispatch<React.SetStateAction<any>>;
}

const GAME_TYPES: {
  value: GameType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'trivia',         label: 'Trivia',           description: 'Multiple choice Q&A',       icon: 'help-circle-outline' },
  { value: 'word-puzzle',    label: 'Word Puzzle',      description: 'Find hidden words',          icon: 'grid-outline' },
  { value: 'two-truths',     label: '2 Truths & 1 Lie', description: 'Spot the lie',               icon: 'chatbubbles-outline' },
  { value: 'this-or-that',   label: 'This or That',     description: 'Pick between two',           icon: 'flash-outline' },
  { value: 'feedback',       label: 'Feedback',         description: 'Open-ended, no right answer',icon: 'chatbubble-outline' },
];

export default function StepThree({
  roundIndex,
  totalRounds,
  roundTitle,
  roundDescription,
  onRoundTitleChange,
  onRoundDescriptionChange,
  selectedGameType,
  onGameTypeChange,
  contentMode,
  setContentMode,
  aiPrompt,
  setAiPrompt,
}: Props) {
  const update = (field: string, value: any) =>
    setAiPrompt((prev: any) => ({ ...prev, [field]: value }));

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Round indicator */}
      <View style={s.roundPill}>
        <View style={s.roundBadge}>
          <Text style={s.roundBadgeText}>{roundIndex + 1}</Text>
        </View>
        <View>
          <Text style={s.roundTitle}>
            Round {roundIndex + 1} of {totalRounds}
          </Text>
          <Text style={s.roundSubtitle}>
            Set up the game type and questions for this round.
          </Text>
        </View>
      </View>

      {/* Round title & description */}
      <View style={s.section}>
        <Text style={s.label}>Round Title</Text>
        <TextInput
          style={s.input}
          value={roundTitle}
          onChangeText={onRoundTitleChange}
          placeholder={`Round ${roundIndex + 1} — General Knowledge`}
          placeholderTextColor={neutral[400]}
        />
      </View>
      <View style={s.section}>
        <Text style={s.label}>
          Description <Text style={s.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={s.input}
          value={roundDescription}
          onChangeText={onRoundDescriptionChange}
          placeholder="Answer as fast as you can!"
          placeholderTextColor={neutral[400]}
        />
      </View>

      {/* Game type */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Game Type for this Round</Text>
        <View style={s.gameGrid}>
          {GAME_TYPES.map(({ value, label, description, icon }) => {
            const active = selectedGameType === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.gameCard, active && s.gameCardActive]}
                onPress={() => onGameTypeChange(value)}
                activeOpacity={0.7}
              >
                <View style={[s.gameIcon, active && s.gameIconActive]}>
                  <Ionicons
                    name={icon}
                    size={20}
                    color={active ? '#fff' : neutral[500]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.gameLabel, active && s.gameLabelActive]}>
                    {label}
                  </Text>
                  <Text style={s.gameDesc}>{description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content method */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          How do you want to add questions?
        </Text>
        <View style={s.methodRow}>
          {/* AI */}
          <TouchableOpacity
            style={[s.methodCard, contentMode === 'ai' && s.methodCardActive]}
            onPress={() => setContentMode('ai')}
            activeOpacity={0.7}
          >
            <View
              style={[
                s.methodIcon,
                contentMode === 'ai' && s.methodIconActive,
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={22}
                color={contentMode === 'ai' ? '#fff' : neutral[500]}
              />
            </View>
            <Text
              style={[
                s.methodLabel,
                contentMode === 'ai' && s.methodLabelActive,
              ]}
            >
              AI Generate
            </Text>
            <Text style={s.methodDesc}>
              Let AI write questions from a topic
            </Text>
          </TouchableOpacity>

          {/* Manual */}
          <TouchableOpacity
            style={[
              s.methodCard,
              contentMode === 'manual' && s.methodCardActive,
            ]}
            onPress={() => setContentMode('manual')}
            activeOpacity={0.7}
          >
            <View
              style={[
                s.methodIcon,
                contentMode === 'manual' && s.methodIconActive,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={contentMode === 'manual' ? '#fff' : neutral[500]}
              />
            </View>
            <Text
              style={[
                s.methodLabel,
                contentMode === 'manual' && s.methodLabelActive,
              ]}
            >
              Write Manually
            </Text>
            <Text style={s.methodDesc}>Type your own questions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI prompt fields */}
      {contentMode === 'ai' && (
        <View style={s.aiBox}>
          <Text style={s.aiBoxTitle}>AI Prompt</Text>
          <View style={s.section}>
            <Text style={s.label}>
              Topic <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              value={aiPrompt.topic}
              onChangeText={(v) => update('topic', v)}
              placeholder="e.g. Nigerian history, 90s pop culture"
              placeholderTextColor={neutral[400]}
            />
          </View>
          {selectedGameType !== 'word-puzzle' && (
            <View style={s.section}>
              <Text style={s.label}>
                Number of Questions{' '}
                <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={
                  aiPrompt.count === null ? '' : String(aiPrompt.count)
                }
                onChangeText={(v) =>
                  update('count', v === '' ? null : Number(v))
                }
                placeholder="e.g. 5"
                placeholderTextColor={neutral[400]}
                keyboardType="number-pad"
              />
            </View>
          )}
          <Text style={s.aiTip}>
            {selectedGameType === 'word-puzzle'
              ? 'Tip: Be specific — the AI will hide several words from this topic in a single puzzle grid.'
              : 'Tip: Be specific — "Lagos street food" beats "food".'}
          </Text>
        </View>
      )}

      {contentMode === 'manual' && (
        <View style={s.manualBox}>
          <Ionicons name="create-outline" size={24} color={neutral[400]} />
          <Text style={s.manualText}>
            Tap <Text style={{ fontFamily: fontFamily.bold }}>Next</Text> to
            start adding questions for this round.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${brand.primary}08`,
    borderWidth: 1,
    borderColor: `${brand.primary}20`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  roundBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  roundTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
  roundSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 1,
  },
  section: { marginBottom: 16 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[600],
    marginBottom: 6,
  },
  optional: { fontFamily: fontFamily.regular, color: neutral[400] },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
    backgroundColor: neutral[0],
  },
  gameGrid: { gap: 8 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 12,
    backgroundColor: neutral[0],
  },
  gameCardActive: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}06`,
  },
  gameIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconActive: { backgroundColor: brand.primary },
  gameLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  gameLabelActive: { color: brand.primary },
  gameDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    marginTop: 1,
  },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 16,
    backgroundColor: neutral[0],
  },
  methodCardActive: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}06`,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: brand.primary },
  methodLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  methodLabelActive: { color: brand.primary },
  methodDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
  aiBox: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 14,
    backgroundColor: `${neutral[50]}`,
    marginBottom: 16,
  },
  aiBoxTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  aiTip: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    lineHeight: 16,
  },
  manualBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: neutral[300],
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    backgroundColor: neutral[50],
    marginBottom: 16,
  },
  manualText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    textAlign: 'center',
    lineHeight: 18,
  },
});
