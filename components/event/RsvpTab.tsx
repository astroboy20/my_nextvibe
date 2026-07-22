import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { EventAttendee, EventDetail } from './types';

// ─── Mock attendees (replace with API) ───────────────────────────────────────
const MOCK_ATTENDEES: EventAttendee[] = [
  { id: 'a1', displayName: 'Alex Vibe',    username: 'alex_vibe',    avatarUrl: null, rsvpStatus: 'CONFIRMED' },
  { id: 'a2', displayName: 'Sarah Games',  username: 'sarah_games',  avatarUrl: null, rsvpStatus: 'CONFIRMED' },
  { id: 'a3', displayName: 'Nextvibe Fan', username: 'nextvibe_fan', avatarUrl: null, rsvpStatus: 'WAITLIST'  },
];

type RsvpChoice = 'going' | 'waitlisted' | 'not-going' | null;

function AvatarCircle({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.text, { fontSize: size * 0.38 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  circle: { backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  text:   { fontFamily: fontFamily.bold, color: '#fff' },
});

interface Props { event: EventDetail }

export default function RsvpTab({ event }: Props) {
  const [status,  setStatus]  = useState<RsvpChoice>(
    event.rsvpStatus === 'CONFIRMED' ? 'going'
    : event.rsvpStatus === 'WAITLIST' ? 'waitlisted'
    : event.rsvpStatus === 'CANCELLED' ? 'not-going'
    : event.isRsvped ? 'going'
    : null
  );
  const [loading, setLoading] = useState<RsvpChoice>(null);

  const handleRsvp = async (choice: NonNullable<RsvpChoice>) => {
    if (loading) return;
    setLoading(choice);
    // TODO: call rsvpMutation({ eventId: event.id, status: ... })
    await new Promise((r) => setTimeout(r, 700));
    setStatus(choice);
    setLoading(null);
  };

  const RsvpBtn = ({
    choice, label, icon, color, bg,
  }: {
    choice: NonNullable<RsvpChoice>;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    bg: string;
  }) => {
    const isActive  = status === choice;
    const isLoading = loading === choice;
    return (
      <TouchableOpacity
        style={[s.rsvpBtn, { backgroundColor: isActive ? bg : neutral[50], borderColor: isActive ? color : neutral[200] }]}
        onPress={() => handleRsvp(choice)}
        activeOpacity={0.8}
        disabled={!!loading}
      >
        {isLoading
          ? <ActivityIndicator size="small" color={color} />
          : <Ionicons name={icon} size={22} color={isActive ? color : neutral[400]} />
        }
        <Text style={[s.rsvpLabel, { color: isActive ? color : neutral[500] }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.wrap}>
      {/* Status banner */}
      {status && (
        <View style={[s.banner, {
          backgroundColor: status === 'going' ? `${semantic.success}18`
            : status === 'waitlisted' ? `${semantic.warning}18`
            : `${semantic.error}18`,
        }]}>
          <Ionicons
            name={status === 'going' ? 'checkmark-circle' : status === 'waitlisted' ? 'time' : 'close-circle'}
            size={18}
            color={status === 'going' ? semantic.success : status === 'waitlisted' ? semantic.warning : semantic.error}
          />
          <Text style={[s.bannerText, {
            color: status === 'going' ? semantic.success : status === 'waitlisted' ? semantic.warning : semantic.error,
          }]}>
            {status === 'going' ? "You're going! 🎉"
              : status === 'waitlisted' ? "You're on the waitlist ⏳"
              : "You're not going 😢"}
          </Text>
        </View>
      )}

      {/* RSVP buttons */}
      <View style={s.btnRow}>
        <RsvpBtn choice="going"     label="Going"      icon="checkmark-circle-outline" color={semantic.success} bg={`${semantic.success}18`} />
        <RsvpBtn choice="waitlisted" label="Waitlist"   icon="time-outline"             color={semantic.warning} bg={`${semantic.warning}18`} />
        <RsvpBtn choice="not-going" label="Can't Go"   icon="close-circle-outline"     color={semantic.error}   bg={`${semantic.error}18`} />
      </View>

      {/* Who's going */}
      <View style={s.attendeesCard}>
        <Text style={s.attendeesTitle}>Who's Going</Text>
        {MOCK_ATTENDEES.map((a) => {
          const name = a.displayName ?? a.username ?? 'User';
          const isConfirmed = a.rsvpStatus === 'CONFIRMED';
          return (
            <View key={a.id} style={s.attendeeRow}>
              <AvatarCircle name={name} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={s.attendeeName}>{name}</Text>
                {a.username && <Text style={s.attendeeHandle}>@{a.username}</Text>}
              </View>
              <View style={[s.statusPill, { backgroundColor: isConfirmed ? `${semantic.success}18` : `${semantic.warning}18` }]}>
                <Text style={[s.statusText, { color: isConfirmed ? semantic.success : semantic.warning }]}>
                  {isConfirmed ? 'Going' : 'Waitlist'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 14 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12,
  },
  bannerText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, flex: 1 },

  btnRow: { flexDirection: 'row', gap: 10 },
  rsvpBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  rsvpLabel: { fontFamily: fontFamily.semibold, fontSize: 11 },

  attendeesCard: {
    borderRadius: 14, borderWidth: 1, borderColor: neutral[100],
    backgroundColor: neutral[50], overflow: 'hidden',
  },
  attendeesTitle: {
    fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800],
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  attendeeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral[100],
  },
  attendeeName:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  attendeeHandle: { fontFamily: fontFamily.regular,  fontSize: 11,          color: neutral[500] },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:     { fontFamily: fontFamily.semibold, fontSize: 11 },
});
