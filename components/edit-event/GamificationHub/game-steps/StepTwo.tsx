/**
 * StepTwo — Schedule, phase, timing, duration, winners, repetitions
 */
import DateTimeTrigger from '@/components/ui/DateTimeTrigger';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EventPhase, ScheduleMode } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  phase: EventPhase;
  setPhase: (v: EventPhase) => void;
  startsAt: string;
  setStartsAt: (v: string) => void;
  gameEndsAt: string;
  setGameEndsAt: (v: string) => void;
  maxStartsAt: string;
  repetitions: number;
  setRepetitions: (v: number) => void;
  gameDuration: number;
  setGameDuration: (v: number) => void;
  maxWinners: number;
  setMaxWinners: (v: number) => void;
  scheduleMode: ScheduleMode;
  setScheduleMode: (v: ScheduleMode) => void;
  errors?: Partial<StepTwoErrors>;
}

export interface StepTwoErrors {
  startsAt: string;
  gameEndsAt: string;
  gameDuration: string;
  maxWinners: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PHASES: { value: EventPhase; label: string; desc: string }[] = [
  { value: 'pre-event',  label: 'Pre-Event',  desc: 'Before the event starts' },
  { value: 'main-event', label: 'Main Event', desc: 'During the event'        },
  { value: 'post-event', label: 'Post-Event', desc: 'After the event ends'    },
  { value: 'both',       label: 'Both',       desc: 'Pre & main event'        },
];

const SCHEDULE_MODES: { value: ScheduleMode; label: string; desc: string }[] = [
  { value: 'concurrent', label: 'All at Once', desc: 'All rounds available simultaneously' },
  { value: 'daily',      label: 'Daily',       desc: 'New round unlocks each day'          },
  { value: 'weekly',     label: 'Weekly',      desc: 'New round unlocks each week'         },
];

const isEndLocked = (phase: EventPhase) => phase === 'pre-event';

// ── Component ──────────────────────────────────────────────────────────────────

export default function StepTwo({
  phase, setPhase,
  startsAt, setStartsAt,
  gameEndsAt, setGameEndsAt,
  maxStartsAt,
  repetitions, setRepetitions,
  gameDuration, setGameDuration,
  maxWinners, setMaxWinners,
  scheduleMode, setScheduleMode,
  errors = {},
}: Props) {
  const endLocked    = isEndLocked(phase);
  const maxStartDate = maxStartsAt ? new Date(maxStartsAt) : undefined;
  const minEndDate   = startsAt    ? new Date(startsAt)    : undefined;

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Phase ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>When does this game run?</Text>
        <Text style={s.hint}>
          Choose which phase of the event this game belongs to.
        </Text>
        <View style={s.grid2}>
          {PHASES.map(({ value, label, desc }) => {
            const active = phase === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.phaseCard, active && s.phaseCardActive]}
                onPress={() => setPhase(value)}
                activeOpacity={0.7}
              >
                <Text style={[s.phaseLabel, active && s.phaseLabelActive]}>
                  {label}
                </Text>
                <Text style={s.phaseDesc}>{desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Timing ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="calendar-outline" size={13} color={neutral[600]} />{' '}
          Game Timing
        </Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <DateTimeTrigger
              label="Starts At"
              value={startsAt}
              onChange={setStartsAt}
              required
              error={errors.startsAt}
              hint={
                endLocked && maxStartsAt
                  ? 'Must start before event begins'
                  : undefined
              }
              maximumDate={endLocked ? maxStartDate : undefined}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeTrigger
              label="Ends At"
              value={gameEndsAt}
              onChange={setGameEndsAt}
              disabled={endLocked}
              error={errors.gameEndsAt}
              hint={
                endLocked
                  ? 'Auto: 10 min before event starts'
                  : 'Set when this game ends'
              }
              minimumDate={minEndDate}
            />
          </View>
        </View>
      </View>

      {/* ── Duration per question ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="time-outline" size={13} color={neutral[600]} />{' '}
          Duration per Question
        </Text>
        {errors.gameDuration && (
          <Text style={s.fieldError}>{errors.gameDuration}</Text>
        )}
        <View style={s.chipRow}>
          {[15, 30, 45, 60].map((sec) => {
            const active = gameDuration === sec;
            return (
              <TouchableOpacity
                key={sec}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setGameDuration(sec)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {sec}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Winners ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="people-outline" size={13} color={neutral[600]} />{' '}
          Number of Winners
        </Text>
        <Text style={s.hint}>
          You'll set a reward for each winner in the next step.
        </Text>
        {errors.maxWinners && (
          <Text style={s.fieldError}>{errors.maxWinners}</Text>
        )}
        <View style={s.chipRow}>
          {[1, 3, 5, 10].map((n) => {
            const active = maxWinners === n;
            return (
              <TouchableOpacity
                key={n}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setMaxWinners(n)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Repetitions ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="refresh-outline" size={13} color={neutral[600]} />{' '}
          Repetitions
        </Text>
        <Text style={s.hint}>How many times the game session repeats.</Text>
        <View style={s.chipRow}>
          {[1, 2, 3, 5].map((n) => {
            const active = repetitions === n;
            return (
              <TouchableOpacity
                key={n}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setRepetitions(n)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {n}×
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Round schedule ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Round Schedule</Text>
        {SCHEDULE_MODES.map(({ value, label, desc }) => {
          const active = scheduleMode === value;
          return (
            <TouchableOpacity
              key={value}
              style={[s.scheduleCard, active && s.scheduleCardActive]}
              onPress={() => setScheduleMode(value)}
              activeOpacity={0.7}
            >
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.scheduleLabel}>{label}</Text>
                <Text style={s.scheduleDesc}>{desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily:   fontFamily.semibold,
    fontSize:     fontSize.sm,
    color:        neutral[800],
    marginBottom: 8,
  },
  hint: {
    fontFamily:   fontFamily.regular,
    fontSize:     fontSize.xs,
    color:        neutral[400],
    marginBottom: 10,
    lineHeight:   16,
  },
  fieldError: {
    fontFamily:   fontFamily.regular,
    fontSize:     fontSize.xs,
    color:        semantic.error,
    marginBottom: 6,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phaseCard: {
    width:           '48%',
    borderWidth:     2,
    borderColor:     neutral[200],
    borderRadius:    12,
    padding:         12,
    backgroundColor: neutral[0],
  },
  phaseCardActive: {
    borderColor:     brand.primary,
    backgroundColor: `${brand.primary}08`,
  },
  phaseLabel: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[800],
  },
  phaseLabelActive: { color: brand.primary },
  phaseDesc: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
    color:      neutral[400],
    marginTop:  2,
  },
  row:     { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex:            1,
    borderWidth:     1,
    borderColor:     neutral[200],
    borderRadius:    20,
    paddingVertical: 10,
    alignItems:      'center',
    backgroundColor: neutral[0],
  },
  chipActive: {
    borderColor:     brand.primary,
    backgroundColor: brand.primary,
  },
  chipText: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[600],
  },
  chipTextActive: { color: '#fff' },
  scheduleCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             12,
    borderWidth:     2,
    borderColor:     neutral[200],
    borderRadius:    12,
    padding:         12,
    marginBottom:    8,
    backgroundColor: neutral[0],
  },
  scheduleCardActive: {
    borderColor:     brand.primary,
    backgroundColor: `${brand.primary}08`,
  },
  scheduleLabel: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[800],
  },
  scheduleDesc: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
    color:      neutral[400],
    marginTop:  2,
  },
  radio: {
    width:          18,
    height:         18,
    borderRadius:   9,
    borderWidth:    2,
    borderColor:    neutral[400],
    marginTop:      2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: brand.primary },
  radioDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: brand.primary,
  },
});
