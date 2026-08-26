/**
 * DateTimeTrigger — shared native date+time picker component
 *
 * - iOS  : slides up a modal with an inline spinner (date+time together)
 * - Android : two-step native dialog — date first, then time
 *
 * Usage:
 *   <DateTimeTrigger
 *     label="Starts At"
 *     value={iso}          // ISO string or ''
 *     onChange={setIso}    // receives ISO string
 *     required
 *     error="Pick a date"
 *   />
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Helpers ────────────────────────────────────────────────────────────────────

const toDate = (iso: string): Date =>
  iso ? new Date(iso) : new Date();

export const formatDisplay = (iso: string): string => {
  if (!iso) return 'Tap to set';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DateTimeTrigger({
  label,
  value,
  onChange,
  disabled,
  hint,
  required,
  error,
  minimumDate,
  maximumDate,
}: Props) {
  const [showPicker,   setShowPicker]   = useState(false);
  const [androidMode,  setAndroidMode]  = useState<'date' | 'time'>('date');
  const [tempDate,     setTempDate]     = useState<Date>(toDate(value));

  const currentDate = toDate(value);
  const hasValue    = !!value;

  // ── Android two-step ────────────────────────────────────────────────────────
  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (!selected) return;

    if (androidMode === 'date') {
      const merged = new Date(selected);
      merged.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
      setTempDate(merged);
      setAndroidMode('time');
    } else {
      const final = new Date(tempDate);
      final.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(final.toISOString());
      setShowPicker(false);
      setAndroidMode('date');
    }
  };

  // ── iOS spinner ─────────────────────────────────────────────────────────────
  const handleIOSChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const handleIOSConfirm = () => {
    onChange(tempDate.toISOString());
    setShowPicker(false);
  };

  const handleIOSCancel = () => {
    setTempDate(currentDate);
    setShowPicker(false);
  };

  const open = () => {
    if (disabled) return;
    setTempDate(currentDate);
    setAndroidMode('date');
    setShowPicker(true);
  };

  return (
    <View style={s.wrap}>
      {/* Label */}
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {required && <Text style={s.required}>*</Text>}
        {disabled && (
          <Ionicons name="lock-closed-outline" size={11} color={neutral[400]} style={{ marginLeft: 3 }} />
        )}
      </View>

      {/* Trigger button */}
      <TouchableOpacity
        style={[
          s.trigger,
          hasValue  && s.triggerFilled,
          !!error   && s.triggerError,
          disabled  && s.triggerDisabled,
        ]}
        onPress={open}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={disabled ? neutral[300] : hasValue ? brand.primary : neutral[400]}
        />
        <Text
          style={[
            s.triggerText,
            hasValue ? s.triggerTextFilled : s.triggerTextEmpty,
            disabled && s.triggerTextDisabled,
          ]}
          numberOfLines={1}
        >
          {formatDisplay(value)}
        </Text>
        {!disabled && (
          <Ionicons name="chevron-down" size={13} color={neutral[400]} />
        )}
      </TouchableOpacity>

      {/* Inline error or hint */}
      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={semantic.error} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={s.hint}>{hint}</Text>
      ) : null}

      {/* ── Android native dialog ── */}
      {Platform.OS !== 'ios' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode={androidMode}
          display="default"
          onChange={handleAndroidChange}
          minimumDate={androidMode === 'date' ? minimumDate : undefined}
          maximumDate={androidMode === 'date' ? maximumDate : undefined}
        />
      )}

      {/* ── iOS bottom-sheet modal ── */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosHeader}>
                <TouchableOpacity onPress={handleIOSCancel} hitSlop={12}>
                  <Text style={s.iosCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={s.iosTitle}>{label}</Text>
                <TouchableOpacity onPress={handleIOSConfirm} hitSlop={12}>
                  <Text style={s.iosDoneText}>Done</Text>
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },

  labelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  5,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.xs,
    color:      neutral[600],
  },
  required: {
    fontFamily: fontFamily.bold,
    fontSize:   fontSize.xs,
    color:      semantic.error,
    marginLeft: 3,
  },

  trigger: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderWidth:       1,
    borderColor:       neutral[200],
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   13,
    backgroundColor:   neutral[0],
  },
  triggerFilled:   { borderColor: `${brand.primary}50`, backgroundColor: `${brand.primary}04` },
  triggerError:    { borderColor: semantic.error },
  triggerDisabled: { opacity: 0.45, backgroundColor: neutral[100] },

  triggerText: {
    flex:       1,
    fontFamily: fontFamily.regular,
    fontSize:   fontSize.sm,
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
    marginTop:  4,
    lineHeight: 14,
  },

  // iOS
  iosOverlay: {
    flex:            1,
    justifyContent:  'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosSheet: {
    backgroundColor:      neutral[0],
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingBottom:        34,
  },
  iosHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
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
