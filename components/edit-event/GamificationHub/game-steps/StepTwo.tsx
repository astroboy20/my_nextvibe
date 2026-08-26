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
  /** ISO string or '' */
  startsAt: string;
  setStartsAt: (v: string) => void;
  /** ISO string or '' */
  gameEndsAt: string;
  setGameEndsAt: (v: string) => void;
  /** ISO string — upper bound for startsAt when phase=pre-event */
  maxStartsAt: string;
  repetitions: number;
  setRepetitions: (v: number) => void;
  gameDuration: number;
  setGameDuration: (v: number) => void;
  maxWinners: number;
  setMaxWinners: (v: number) => void;
  scheduleMode: ScheduleMode;
  setScheduleMode: (v: ScheduleMode) => void;
  /** Field-level errors injected by the wizard's validateStep */
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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse an ISO string to a Date, falling back to now. */
const toDate = (iso: string): Date =>
  iso ? new Date(iso) : new Date();

/** Format a Date to a readable local string like "Wed 26 Aug, 09:30 PM" */
const formatDisplay = (iso: string): string => {
  if (!iso) return 'Tap to set';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    hour:    '2-digit',
    minute:  '2-digit',
  });
};

// ── Native DateTime Picker ─────────────────────────────────────────────────────

/**
 * Cross-platform date+time picker.
 * - iOS: wraps in a modal with an inline spinner for both date and time.
 * - Android: uses the native two-step dialog (date → time).
 */
function DateTimeTrigger({
  label,
  value,
  onChange,
  disabled,
  hint,
  required,
  error,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [showPicker, setShowPicker] = useState(false);
  // Android needs a two-step flow: date then time
  const [androidMode, setAndroidMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate]       = useState<Date>(toDate(value));

  const currentDate = toDate(value);
  const hasValue = !!value;

  // ── Android flow ──────────────────────────────────────────────────────────
  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (!selected) return;

    if (androidMode === 'date') {
      // Carry over existing time onto the new date
      const merged = new Date(selected);
      merged.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
      setTempDate(merged);
      // Move to time picker
      setAndroidMode('time');
    } else {
      // Merge the picked time into tempDate
      const final = new Date(tempDate);
      final.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(final.toISOString());
      setShowPicker(false);
      setAndroidMode('date'); // reset for next open
    }
  };

  // ── iOS flow ───────────────────────────────────────────────────────────────
  const handleIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const handleIOSConfirm = () => {
    onChange(tempDate.toISOString());
    setShowPicker(false);
  };

  const handleIOSCancel = () => {
    setTempDate(currentDate); // revert
    setShowPicker(false);
  };

  const openPicker = () => {
    if (disabled) return;
    setTempDate(currentDate);
    setAndroidMode('date');
    setShowPicker(true);
  };

  return (
    <View style={dtp.wrap}>
      <Text style={dtp.label}>
        {label}
        {required && <Text style={dtp.required}> *</Text>}
        {disabled && (
          <>
            {' '}
            <Ionicons name="lock-closed-outline" size={10} color={neutral[400]} />
          </>
        )}
      </Text>

      <TouchableOpacity
        style={[
          dtp.trigger,
          hasValue && dtp.triggerFilled,
          error  && dtp.triggerError,
          disabled && dtp.triggerDisabled,
        ]}
        onPress={openPicker}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={15}
          color={disabled ? neutral[300] : hasValue ? brand.primary : neutral[400]}
        />
        <Text
          style={[
            dtp.triggerText,
            hasValue ? dtp.triggerTextFilled : dtp.triggerTextEmpty,
            disabled && dtp.triggerTextDisabled,
          ]}
          numberOfLines={1}
        >
          {formatDisplay(value)}
        </Text>
        {!disabled && (
          <Ionicons
            name="chevron-down"
            size={13}
            color={neutral[400]}
          />
        )}
      </TouchableOpacity>

      {/* Error */}
      {error ? (
        <View style={dtp.errorRow}>
          <Ionicons name="alert-circle-outline" size={11} color={semantic.error} />
          <Text style={dtp.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={dtp.hint}>{hint}</Text>
      ) : null}

      {/* ── Android native dialog ── */}
      {Platform.OS !== 'ios' && showPicker && (
        <DateTimePicker
          value={androidMode === 'date' ? tempDate : tempDate}
          mode={androidMode}
          display="default"
          onChange={handleAndroidChange}
          minimumDate={androidMode === 'date' ? minimumDate : undefined}
          maximumDate={androidMode === 'date' ? maximumDate : undefined}
        />
      )}

      {/* ── iOS inline modal ── */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View style={dtp.iosOverlay}>
            <View style={dtp.iosSheet}>
              {/* Header */}
              <View style={dtp.iosHeader}>
                <TouchableOpacity onPress={handleIOSCancel}>
                  <Text style={dtp.iosCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={dtp.iosTitle}>{label}</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={dtp.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleIOSChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Main StepTwo ───────────────────────────────────────────────────────────────

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
  const endLocked = isEndLocked(phase);

  const maxStartDate = maxStartsAt ? new Date(maxStartsAt) : undefined;
  const minEndDate   = startsAt    ? new Date(startsAt)    : undefined;

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Phase */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>When does this game run?</Text>
        <Text style={s.hint}>Choose which phase of the event this game belongs to.</Text>
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

      {/* Timing */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Game Timing</Text>
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

      {/* Duration */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Duration per Question</Text>
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

      {/* Winners */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Number of Winners</Text>
        <Text style={s.hint}>You'll set a reward for each winner in the next step.</Text>
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
                <Text style={[s.chipText, active && s.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Repetitions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Repetitions</Text>
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

      {/* Schedule Mode */}
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
  section:      { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[800],
    marginBottom: 8,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
    color:      neutral[400],
    marginBottom: 10,
    lineHeight: 16,
  },
  fieldError: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
    color:      semantic.error,
    marginBottom: 6,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phaseCard: {
    width: '48%',
    borderWidth: 2,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 12,
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
    flex: 1,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems:   'flex-start',
    gap:          12,
    borderWidth:  2,
    borderColor:  neutral[200],
    borderRadius: 12,
    padding:      12,
    marginBottom: 8,
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
    width:       18,
    height:      18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: neutral[400],
    marginTop:   2,
    alignItems:  'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: brand.primary },
  radioDot: {
    width:  8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.primary,
  },
});

const dtp = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.xs,
    color:      neutral[600],
    marginBottom: 5,
  },
  required: { color: semantic.error },
  trigger: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    borderWidth:    1,
    borderColor:    neutral[200],
    borderRadius:   12,
    paddingHorizontal: 12,
    paddingVertical:   12,
    backgroundColor: neutral[0],
  },
  triggerFilled:   { borderColor: `${brand.primary}50`, backgroundColor: `${brand.primary}04` },
  triggerError:    { borderColor: semantic.error },
  triggerDisabled: { opacity: 0.45, backgroundColor: neutral[100] },
  triggerText: {
    flex:       1,
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
  },
  triggerTextFilled:   { color: neutral[800] },
  triggerTextEmpty:    { color: neutral[400] },
  triggerTextDisabled: { color: neutral[400] },
  errorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     4,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.xs,
    color:      semantic.error,
    lineHeight: 16,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize:   10,
    color:      neutral[400],
    marginTop:  3,
    lineHeight: 14,
  },

  // iOS modal
  iosOverlay: {
    flex:            1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosSheet: {
    backgroundColor:    neutral[0],
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingBottom:        34,
  },
  iosHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
  },
  iosTitle: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[800],
  },
  iosCancelText: {
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.sm,
    color:      neutral[500],
  },
  iosDoneText: {
    fontFamily: fontFamily.bold,
    fontSize:   fontSize.sm,
    color:      brand.primary,
  },
});
