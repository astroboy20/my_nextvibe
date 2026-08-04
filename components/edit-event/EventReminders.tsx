import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  label: string;          // e.g. "1 day before"
  offsetHours: number;    // hours before event
  enabled: boolean;
}

// ── Default reminder templates ────────────────────────────────────────────────

const DEFAULT_REMINDERS: Reminder[] = [
  { id: '1w', label: '1 week before',  offsetHours: 168, enabled: false },
  { id: '1d', label: '1 day before',   offsetHours: 24,  enabled: true  },
  { id: '3h', label: '3 hours before', offsetHours: 3,   enabled: true  },
  { id: '1h', label: '1 hour before',  offsetHours: 1,   enabled: false },
];

interface Props {
  eventStartsAt?: string | null;
  eventStatus?: string;
}

export default function EventReminders({ eventStartsAt, eventStatus }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS);

  const isLocked =
    !eventStartsAt ||
    eventStatus === 'ENDED' ||
    eventStatus === 'CANCELLED';

  const activeCount = reminders.filter((r) => r.enabled).length;

  const toggle = (id: string) => {
    if (isLocked) return;
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <View style={s.root}>
      {isLocked && (
        <View style={s.lockedRow}>
          <Ionicons name="lock-closed-outline" size={13} color={neutral[400]} />
          <Text style={s.lockedText}>
            Reminders cannot be changed once the event has ended or been cancelled.
          </Text>
        </View>
      )}

      <View style={s.summary}>
        <Ionicons name="notifications-outline" size={15} color={brand.primary} />
        <Text style={s.summaryText}>
          {activeCount} reminder{activeCount !== 1 ? 's' : ''} active
        </Text>
      </View>

      <View style={s.list}>
        {reminders.map((r) => (
          <View key={r.id} style={s.row}>
            <View style={s.rowLeft}>
              <View style={[s.dot, r.enabled ? s.dotActive : s.dotInactive]} />
              <Text style={[s.rowLabel, !r.enabled && s.rowLabelMuted]}>
                {r.label}
              </Text>
            </View>
            <Switch
              value={r.enabled}
              onValueChange={() => toggle(r.id)}
              disabled={isLocked}
              trackColor={{ false: neutral[200], true: `${brand.primary}60` }}
              thumbColor={r.enabled ? brand.primary : neutral[300]}
              ios_backgroundColor={neutral[200]}
            />
          </View>
        ))}
      </View>

      <Text style={s.hint}>
        Reminders are sent as push notifications to all RSVPed attendees.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },

  lockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: neutral[100],
  },
  lockedText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    lineHeight: 17,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },

  list: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
    backgroundColor: neutral[0],
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive:   { backgroundColor: brand.primary },
  dotInactive: { backgroundColor: neutral[200] },
  rowLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  rowLabelMuted: { color: neutral[400] },

  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    lineHeight: 17,
  },
});
