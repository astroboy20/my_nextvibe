/**
 * EventReminders.tsx  —  React Native
 *
 * Automated email reminder management for an event organiser.
 *
 * Layout:
 *   • Info banner (what reminders do + DRAFT warning)
 *   • 4 timing rows (7d / 5d / 3d / 1d), each with 2 RSVP sub-cards
 *     (CONFIRMED · WAITLISTED) — tap to expand an inline editor
 *   • Delivery Logs collapsible section
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import {
    ReminderLogEntry,
    ReminderLogsResponse,
    ReminderTemplate,
    ReminderTiming,
    RsvpStatus,
    useDeleteReminderMutation,
    useGetReminderLogsQuery,
    useGetRemindersQuery,
    useToggleReminderMutation,
    useUpsertReminderMutation
} from '@/store/api/reminderApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIMINGS: { value: ReminderTiming; label: string; description: string }[] = [
  { value: 'SEVEN_DAYS', label: '7 Days Before', description: 'One-week heads up' },
  { value: 'FIVE_DAYS',  label: '5 Days Before', description: 'Mid-week awareness' },
  { value: 'THREE_DAYS', label: '3 Days Before', description: 'Prep reminder' },
  { value: 'ONE_DAY',    label: '1 Day Before',  description: 'Final nudge' },
];

const RSVP_STATUSES: { value: RsvpStatus; label: string }[] = [
  { value: 'CONFIRMED',  label: 'Going ✓' },
  { value: 'WAITLISTED', label: 'Maybe' },
];

const PLACEHOLDER_CHIPS = [
  { token: '{{name}}',      hint: "Attendee's display name" },
  { token: '{{eventName}}', hint: 'The event name' },
  { token: '{{date}}',      hint: 'Event date & time' },
  { token: '{{location}}',  hint: 'Venue / location' },
];

const KNOWN_TOKENS = PLACEHOLDER_CHIPS.map((c) => c.token);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function hasUnknownTokens(text: string): boolean {
  const found = text.match(/\{\{[^}]+\}\}/g) ?? [];
  return found.some((t) => !KNOWN_TOKENS.includes(t));
}

function daysWarningFor(
  timing: ReminderTiming,
  eventStartsAt?: string,
): string | null {
  if (!eventStartsAt) return null;
  const daysMap: Record<ReminderTiming, number> = {
    ONE_DAY: 1, THREE_DAYS: 3, FIVE_DAYS: 5, SEVEN_DAYS: 7,
  };
  const needed = daysMap[timing];
  const daysUntil = Math.ceil(
    (new Date(eventStartsAt).getTime() - Date.now()) / 86_400_000,
  );
  if (daysUntil < needed) {
    return `Event is ${daysUntil <= 0 ? 'in the past' : `${daysUntil}d away`} — this reminder won't send.`;
  }
  return null;
}

// ─── StatusDot ─────────────────────────────────────────────────────────────────

function StatusDot({ template }: { template?: ReminderTemplate }) {
  if (!template) {
    return (
      <View style={sd.row}>
        <View style={[sd.dot, { backgroundColor: neutral[300] }]} />
        <Text style={sd.label}>Not set</Text>
      </View>
    );
  }
  const color = template.enabled ? '#22c55e' : '#f59e0b';
  return (
    <View style={sd.row}>
      <View style={[sd.dot, { backgroundColor: color }]} />
      <Text style={[sd.label, { color }]}>{template.enabled ? 'Active' : 'Paused'}</Text>
    </View>
  );
}
const sd = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:   { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: fontFamily.regular, fontSize: 11 },
});

// ─── PlaceholderChips ──────────────────────────────────────────────────────────

interface PlaceholderChipsProps {
  onInsert: (token: string) => void;
}
function PlaceholderChips({ onInsert }: PlaceholderChipsProps) {
  return (
    <View style={pc.wrap}>
      <Text style={pc.hint}>Tap a token to insert it:</Text>
      <View style={pc.row}>
        {PLACEHOLDER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.token}
            style={pc.chip}
            onPress={() => onInsert(chip.token)}
            activeOpacity={0.7}
          >
            <Text style={pc.chipText}>{chip.token}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap:     { gap: 6 },
  hint:     { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400] },
  row:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    backgroundColor: `${brand.primary}0D`,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontFamily: fontFamily.regular, fontSize: 11, color: brand.primary },
});

// ─── ReminderCard ──────────────────────────────────────────────────────────────

interface ReminderCardProps {
  eventId: string;
  timing: ReminderTiming;
  rsvpStatus: RsvpStatus;
  template?: ReminderTemplate;
  eventStartsAt?: string;
}

function ReminderCard({
  eventId,
  timing,
  rsvpStatus,
  template,
  eventStartsAt,
}: ReminderCardProps) {
  const [open, setOpen]               = useState(false);
  const [subject, setSubject]         = useState(template?.subject ?? '');
  const [message, setMessage]         = useState(template?.message ?? '');
  const [confirmDel, setConfirmDel]   = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'message'>('subject');

  const subjectRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);
  // cursor position tracking
  const subjectCursor = useRef<number>(0);
  const messageCursor = useRef<number>(0);

  const [upsert, { isLoading: isSaving }]   = useUpsertReminderMutation();
  const [toggle, { isLoading: isToggling }] = useToggleReminderMutation();
  const [remove, { isLoading: isDeleting }] = useDeleteReminderMutation();

  const isDirty =
    subject !== (template?.subject ?? '') ||
    message !== (template?.message ?? '');

  const subjectErr =
    subject.length > 0 && subject.length < 3
      ? 'Min 3 characters'
      : subject.length > 150
      ? 'Max 150 characters'
      : null;

  const messageErr =
    message.length > 0 && message.length < 10
      ? 'Min 10 characters'
      : message.length > 2000
      ? 'Max 2000 characters'
      : null;

  const canSave =
    subject.length >= 3 &&
    subject.length <= 150 &&
    message.length >= 10 &&
    message.length <= 2000 &&
    !hasUnknownTokens(subject) &&
    !hasUnknownTokens(message);

  const warning = daysWarningFor(timing, eventStartsAt);

  const rsvpLabel =
    RSVP_STATUSES.find((r) => r.value === rsvpStatus)?.label ?? rsvpStatus;

  function insertToken(token: string) {
    if (activeField === 'subject') {
      const pos = subjectCursor.current;
      const next = subject.slice(0, pos) + token + subject.slice(pos);
      setSubject(next);
      subjectCursor.current = pos + token.length;
      setTimeout(() => subjectRef.current?.focus(), 50);
    } else {
      const pos = messageCursor.current;
      const next = message.slice(0, pos) + token + message.slice(pos);
      setMessage(next);
      messageCursor.current = pos + token.length;
      setTimeout(() => messageRef.current?.focus(), 50);
    }
  }

  async function handleSave() {
    try {
      await upsert({ eventId, timing, rsvpStatus, subject, message }).unwrap();
      Alert.alert('Saved', 'Reminder saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to save reminder.');
    }
  }

  async function handleToggle(enabled: boolean) {
    if (!template) return;
    try {
      await toggle({ eventId, templateId: template.id, enabled }).unwrap();
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to toggle reminder.');
    }
  }

  async function handleDelete() {
    if (!template) return;
    try {
      await remove({ eventId, templateId: template.id }).unwrap();
      setSubject('');
      setMessage('');
      setConfirmDel(false);
      setOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to delete reminder.');
    }
  }

  return (
    <View style={rc.card}>
      {/* ── Header row ── */}
      <TouchableOpacity
        style={rc.header}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <View style={rc.headerLeft}>
          <View style={rc.badge}>
            <Text style={rc.badgeText}>{rsvpLabel}</Text>
          </View>
          <StatusDot template={template} />
        </View>
        <View style={rc.headerRight}>
          {template && (
            <Switch
              value={template.enabled}
              disabled={isToggling}
              onValueChange={handleToggle}
              trackColor={{ false: neutral[200], true: `${brand.primary}60` }}
              thumbColor={template.enabled ? brand.primary : neutral[400]}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          )}
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={neutral[400]}
          />
        </View>
      </TouchableOpacity>

      {/* ── Expanded body ── */}
      {open && (
        <View style={rc.body}>
          {/* Warning banner */}
          {warning && (
            <View style={rc.warnBox}>
              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
              <Text style={rc.warnText}>{warning}</Text>
            </View>
          )}

          {/* Subject */}
          <View style={rc.fieldGroup}>
            <View style={rc.fieldHeader}>
              <Text style={rc.fieldLabel}>Subject</Text>
              <Text style={[rc.counter, subject.length > 150 && rc.counterRed]}>
                {subject.length}/150
              </Text>
            </View>
            <TextInput
              ref={subjectRef}
              style={[rc.input, activeField === 'subject' && rc.inputFocused]}
              value={subject}
              onChangeText={setSubject}
              onFocus={() => setActiveField('subject')}
              onSelectionChange={(e) => {
                subjectCursor.current = e.nativeEvent.selection.end;
              }}
              placeholder="e.g. {{eventName}} is almost here!"
              placeholderTextColor={neutral[300]}
              returnKeyType="next"
            />
            {subjectErr && <Text style={rc.fieldErr}>{subjectErr}</Text>}
            {hasUnknownTokens(subject) && (
              <Text style={rc.fieldWarn}>Unknown token in subject</Text>
            )}
          </View>

          {/* Message */}
          <View style={rc.fieldGroup}>
            <View style={rc.fieldHeader}>
              <Text style={rc.fieldLabel}>Message</Text>
              <Text style={[rc.counter, message.length > 2000 && rc.counterRed]}>
                {message.length}/2000
              </Text>
            </View>
            <TextInput
              ref={messageRef}
              style={[rc.input, rc.textarea, activeField === 'message' && rc.inputFocused]}
              value={message}
              onChangeText={setMessage}
              onFocus={() => setActiveField('message')}
              onSelectionChange={(e) => {
                messageCursor.current = e.nativeEvent.selection.end;
              }}
              placeholder={`Hey {{name}}, just a reminder — {{eventName}} is happening on {{date}} at {{location}}.`}
              placeholderTextColor={neutral[300]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {messageErr && <Text style={rc.fieldErr}>{messageErr}</Text>}
            {hasUnknownTokens(message) && (
              <Text style={rc.fieldWarn}>Unknown token in message</Text>
            )}
          </View>

          {/* Token chips */}
          <PlaceholderChips onInsert={insertToken} />

          {/* Preview */}
          {(subject.length > 0 || message.length > 0) && (
            <View style={rc.preview}>
              <Text style={rc.previewTitle}>Preview</Text>
              {subject.length > 0 && (
                <Text style={rc.previewSubject} numberOfLines={2}>
                  {subject}
                </Text>
              )}
              {message.length > 0 && (
                <Text style={rc.previewMessage} numberOfLines={6}>
                  {message}
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={rc.actions}>
            {confirmDel ? (
              <View style={rc.confirmRow}>
                <Text style={rc.confirmText}>Delete this reminder?</Text>
                <TouchableOpacity
                  style={rc.dangerBtn}
                  onPress={handleDelete}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={rc.dangerBtnText}>Delete</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={rc.outlineBtn}
                  onPress={() => setConfirmDel(false)}
                  activeOpacity={0.8}
                >
                  <Text style={rc.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[rc.saveBtn, (!canSave || !isDirty || isSaving) && rc.btnDisabled]}
                  onPress={handleSave}
                  disabled={!canSave || !isDirty || isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={rc.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
                {template && (
                  <TouchableOpacity
                    style={rc.deleteIconBtn}
                    onPress={() => setConfirmDel(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={semantic.error} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: 'hidden',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: brand.primary,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: neutral[100],
    padding: 12,
    gap: 12,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
  },
  warnText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  fieldGroup: { gap: 5 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:  { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[700] },
  counter:     { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400] },
  counterRed:  { color: semantic.error },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: neutral[800],
    backgroundColor: neutral[0],
  },
  textarea:    { minHeight: 90, textAlignVertical: 'top' },
  inputFocused: { borderColor: brand.primary },
  fieldErr:    { fontFamily: fontFamily.regular, fontSize: 10, color: semantic.error },
  fieldWarn:   { fontFamily: fontFamily.regular, fontSize: 10, color: '#f59e0b' },
  preview: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}25`,
    backgroundColor: `${brand.primary}06`,
    padding: 12,
    gap: 6,
  },
  previewTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewSubject: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: neutral[800],
    lineHeight: 18,
  },
  previewMessage: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
    lineHeight: 17,
  },
  actions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  confirmText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: semantic.error,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: brand.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#fff',
  },
  btnDisabled: { opacity: 0.45 },
  deleteIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: {
    backgroundColor: semantic.error,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dangerBtnText: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#fff' },
  outlineBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: neutral[300],
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineBtnText: { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[600] },
});

// ─── LogsPanel ─────────────────────────────────────────────────────────────────

function LogsPanel({ eventId }: { eventId: string }) {
  const { data, isLoading } = useGetReminderLogsQuery(eventId);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  if (isLoading) {
    return (
      <View style={lp.loading}>
        <ActivityIndicator size="small" color={brand.primary} />
        <Text style={lp.loadingText}>Loading logs…</Text>
      </View>
    );
  }

  const logs: ReminderLogEntry[]  = data?.logs ?? [];
  const summary = (data as ReminderLogsResponse | undefined)?.summary;

  if (logs.length === 0) {
    return (
      <Text style={lp.empty}>No delivery logs yet.</Text>
    );
  }

  const paginated = logs.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < logs.length;

  return (
    <View style={lp.wrap}>
      {/* Summary grid */}
      {summary && (
        <View style={lp.summaryGrid}>
          {TIMINGS.map(({ value, label }) => {
            const s = summary[value];
            if (!s) return null;
            return (
              <View key={value} style={lp.summaryCard}>
                <Text style={lp.summaryLabel}>{label}</Text>
                <View style={lp.summaryRow}>
                  <Text style={lp.sent}>✓ {s.sent}</Text>
                  {s.failed > 0 && <Text style={lp.failed}>✗ {s.failed}</Text>}
                  <Text style={lp.pending}>⏱ {s.pending}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Log entries */}
      {paginated.map((log) => (
        <View key={log.id} style={lp.row}>
          <View style={lp.rowInfo}>
            <Text style={lp.rowName} numberOfLines={1}>
              {log.user.displayName || log.user.username || 'Unknown'}
            </Text>
            <Text style={lp.rowSub}>
              {TIMINGS.find((t) => t.value === log.timing)?.label} ·{' '}
              {log.rsvpStatus === 'CONFIRMED' ? 'Going' : 'Maybe'}
            </Text>
          </View>
          <View style={lp.rowStatus}>
            {log.sent ? (
              <View style={lp.sentPill}>
                <Ionicons name="send" size={10} color="#16a34a" />
                <Text style={lp.sentText}>Sent</Text>
              </View>
            ) : (
              <View style={lp.pendingPill}>
                <Ionicons name="time-outline" size={10} color={neutral[400]} />
                <Text style={lp.pendingText}>Pending</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {hasMore && (
        <TouchableOpacity
          style={lp.loadMore}
          onPress={() => setPage((p) => p + 1)}
          activeOpacity={0.7}
        >
          <Text style={lp.loadMoreText}>Load more</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const lp = StyleSheet.create({
  loading:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  loadingText: { fontFamily: fontFamily.regular, fontSize: 13, color: neutral[400] },
  empty:       { fontFamily: fontFamily.regular, fontSize: 13, color: neutral[400], textAlign: 'center', paddingVertical: 20 },
  wrap:        { gap: 8 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    padding: 10,
    gap: 4,
  },
  summaryLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[500] },
  summaryRow:   { flexDirection: 'row', gap: 8 },
  sent:         { fontFamily: fontFamily.semibold, fontSize: 11, color: '#16a34a' },
  failed:       { fontFamily: fontFamily.semibold, fontSize: 11, color: semantic.error },
  pending:      { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[400] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    gap: 8,
  },
  rowInfo:  { flex: 1 },
  rowName:  { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[800] },
  rowSub:   { fontFamily: fontFamily.regular,  fontSize: 10, color: neutral[400] },
  rowStatus:{ alignItems: 'flex-end' },
  sentPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sentText:    { fontFamily: fontFamily.semibold, fontSize: 10, color: '#16a34a' },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: neutral[100], borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { fontFamily: fontFamily.semibold, fontSize: 10, color: neutral[400] },
  loadMore: { alignItems: 'center', paddingVertical: 10 },
  loadMoreText: { fontFamily: fontFamily.semibold, fontSize: 12, color: brand.primary },
});

// ─── Main Component ────────────────────────────────────────────────────────────

interface EventRemindersProps {
  eventId: string;
  eventStartsAt?: string;
  eventStatus?: string;
}

export default function EventReminders({
  eventId,
  eventStartsAt,
  eventStatus,
}: EventRemindersProps) {
  const { data: templates = [], isLoading } = useGetRemindersQuery(eventId);
  const [showLogs, setShowLogs] = useState(false);

  // Build lookup: `${timing}_${rsvpStatus}` → template
  const templateMap = templates.reduce<Record<string, ReminderTemplate>>(
    (acc, t) => {
      acc[`${t.timing}_${t.rsvpStatus}`] = t;
      return acc;
    },
    {},
  );

  const activeCount = templates.filter((t) => t.enabled).length;

  if (isLoading) {
    return (
      <View style={er.loading}>
        <ActivityIndicator size="small" color={brand.primary} />
        <Text style={er.loadingText}>Loading reminders…</Text>
      </View>
    );
  }

  return (
    <View style={er.wrap}>
      {/* Info banner */}
      <View style={er.infoBanner}>
        <Text style={er.infoTitle}>Automated email reminders</Text>
        <Text style={er.infoBody}>
          The backend sends these automatically — no scheduling needed. Up to 8
          templates (4 intervals × 2 RSVP statuses). Each attendee receives each
          reminder at most once.
        </Text>
        {eventStatus === 'DRAFT' && (
          <View style={er.draftWarn}>
            <Ionicons name="warning-outline" size={12} color="#f59e0b" />
            <Text style={er.draftWarnText}>
              Reminders only send for PUBLISHED events.
            </Text>
          </View>
        )}
      </View>

      {/* Timing rows */}
      {TIMINGS.map(({ value: timing, label, description }) => (
        <View key={timing} style={er.timingGroup}>
          <View style={er.timingHeader}>
            <Ionicons name="notifications-outline" size={14} color={`${brand.primary}B0`} />
            <Text style={er.timingLabel}>{label}</Text>
            <Text style={er.timingDesc}>— {description}</Text>
          </View>
          <View style={er.timingCards}>
            {RSVP_STATUSES.map(({ value: rsvpStatus }) => (
              <ReminderCard
                key={`${timing}_${rsvpStatus}`}
                eventId={eventId}
                timing={timing}
                rsvpStatus={rsvpStatus}
                template={templateMap[`${timing}_${rsvpStatus}`]}
                eventStartsAt={eventStartsAt}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Delivery Logs toggle */}
      <TouchableOpacity
        style={er.logsToggle}
        onPress={() => setShowLogs((s) => !s)}
        activeOpacity={0.7}
      >
        <View style={er.logsToggleLeft}>
          <Ionicons name="bar-chart-outline" size={16} color={brand.primary} />
          <Text style={er.logsToggleText}>Delivery Logs</Text>
          {activeCount > 0 && (
            <View style={er.activeCountPill}>
              <Text style={er.activeCountText}>{activeCount} active</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={showLogs ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={neutral[400]}
        />
      </TouchableOpacity>

      {showLogs && (
        <View style={er.logsBody}>
          <LogsPanel eventId={eventId} />
        </View>
      )}
    </View>
  );
}

const er = StyleSheet.create({
  loading:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { fontFamily: fontFamily.regular, fontSize: 13, color: neutral[400] },
  wrap:        { gap: 14 },
  infoBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}25`,
    backgroundColor: `${brand.primary}08`,
    padding: 12,
    gap: 4,
  },
  infoTitle: { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[800] },
  infoBody:  { fontFamily: fontFamily.regular,  fontSize: 11, color: neutral[500], lineHeight: 17 },
  draftWarn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  draftWarnText: { fontFamily: fontFamily.regular, fontSize: 11, color: '#f59e0b' },
  timingGroup:  { gap: 6 },
  timingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timingLabel:  { fontFamily: fontFamily.bold, fontSize: 12, color: neutral[800] },
  timingDesc:   { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  timingCards:  { paddingLeft: 20, gap: 4 },
  logsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logsToggleText: { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[700] },
  activeCountPill: {
    borderRadius: 20,
    backgroundColor: `${brand.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeCountText: { fontFamily: fontFamily.semibold, fontSize: 10, color: brand.primary },
  logsBody: { marginTop: 4 },
});
