import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { EventDetail } from './types';

interface Props { event: EventDetail }

function InfoRow({
  icon, label, value, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.infoRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, onPress && { color: brand.primary }]}>
          {value}
        </Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={14} color={brand.primary} />}
    </TouchableOpacity>
  );
}

export default function AboutTab({ event }: Props) {
  const showLocation = event.mode === 'ONSITE' || event.mode === 'HYBRID';
  const showVirtual  = event.mode === 'VIRTUAL' || event.mode === 'HYBRID';

  return (
    <View style={s.wrap}>
      {/* Date / time */}
      <InfoRow
        icon="calendar-outline"
        label="Date & Time"
        value={new Date(event.startsAt).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })}
      />

      {/* Attendees */}
      <InfoRow
        icon="people-outline"
        label="Attendees"
        value={`${event.attendeeCount ?? 0} attending`}
      />

      {/* Location */}
      {showLocation && event.locationName && (
        <InfoRow
          icon="location-outline"
          label="Location"
          value={event.locationName}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationName!)}`
            )
          }
        />
      )}

      {/* Virtual link */}
      {showVirtual && event.virtualLink && (
        <InfoRow
          icon="videocam-outline"
          label="Meeting Link"
          value={event.virtualLink}
          onPress={() => Linking.openURL(event.virtualLink!)}
        />
      )}

      {/* Description */}
      {event.description ? (
        <View style={s.descCard}>
          <Text style={s.descTitle}>About this event</Text>
          <Text style={s.desc}>{event.description}</Text>
        </View>
      ) : null}

      {/* Organizer */}
      {event.organizer && (
        <View style={s.orgCard}>
          <Text style={s.orgTitle}>Organizer</Text>
          <View style={s.orgRow}>
            <View style={s.orgAvatar}>
              <Text style={s.orgAvatarText}>
                {(event.organizer.displayName ?? event.organizer.username ?? 'O').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.orgName}>
                {event.organizer.displayName ?? event.organizer.username}
              </Text>
              {event.organizer.username && (
                <Text style={s.orgHandle}>@{event.organizer.username}</Text>
              )}
            </View>
            <TouchableOpacity style={s.followBtn} activeOpacity={0.8}>
              <Text style={s.followBtnText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[100],
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[500] },
  infoValue: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800], marginTop: 1 },

  descCard: {
    padding: 14, borderRadius: 14,
    backgroundColor: neutral[50], borderWidth: 1, borderColor: neutral[100],
  },
  descTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800], marginBottom: 8 },
  desc:      { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[600], lineHeight: 22 },

  orgCard: {
    padding: 14, borderRadius: 14,
    backgroundColor: neutral[50], borderWidth: 1, borderColor: neutral[100],
  },
  orgTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800], marginBottom: 12 },
  orgRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgAvatar:{ width: 44, height: 44, borderRadius: 22, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  orgAvatarText: { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: '#fff' },
  orgName:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  orgHandle:{ fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500], marginTop: 1 },
  followBtn:{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: brand.primary },
  followBtnText: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#fff' },
});
