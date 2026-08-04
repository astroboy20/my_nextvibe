import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import type { EventDraft } from './types';

interface Props {
  event: EventDraft & {
    flierUrl?: string | null;
    status?: string;
    attendingCount?: number;
    rsvpCount?: number;
    locationName?: string;
    startsAt?: string;
  };
  eventId: string;
  onQRPress: () => void;
  isSharing?: boolean;
  onShare: () => void;
  onViewPress: () => void;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const isLive = status === 'LIVE';
  const isDraft = status === 'DRAFT';
  const isCancelled = status === 'CANCELLED';
  const isEnded = status === 'ENDED';

  const bg = isLive
    ? semantic.success
    : isDraft
    ? neutral[500]
    : isCancelled || isEnded
    ? neutral[400]
    : brand.primary;

  return (
    <View style={[s.statusBadge, { backgroundColor: bg }]}>
      {isLive && <View style={s.liveDot} />}
      <Text style={s.statusText}>{status}</Text>
    </View>
  );
}

export default function EventHeaderCard({ event, eventId, onQRPress, isSharing, onShare, onViewPress }: Props) {
  const startsAtLabel = event.startsAt
    ? new Date(event.startsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' • ' +
      new Date(event.startsAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={s.card}>
      {/* Flier thumbnail */}
      <View style={s.thumbWrap}>
        {event.flierUrl ? (
          <Image source={{ uri: event.flierUrl }} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={s.thumbPlaceholder}>
            <Ionicons name="image-outline" size={28} color={neutral[300]} />
          </View>
        )}
        <StatusBadge status={event.status} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{event.name}</Text>
        {startsAtLabel && <Text style={s.meta}>{startsAtLabel}</Text>}
        {event.locationName ? <Text style={s.meta} numberOfLines={1}>{event.locationName}</Text> : null}

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={onQRPress} activeOpacity={0.7}>
            <Ionicons name="qr-code-outline" size={15} color={brand.primary} />
            <Text style={s.actionBtnText}>QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} onPress={onShare} activeOpacity={0.7} disabled={isSharing}>
            {isSharing ? (
              <ActivityIndicator size={15} color={brand.primary} />
            ) : (
              <Ionicons name="share-outline" size={15} color={brand.primary} />
            )}
            <Text style={s.actionBtnText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} onPress={onViewPress} activeOpacity={0.7}>
            <Ionicons name="open-outline" size={15} color={brand.primary} />
            <Text style={s.actionBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: neutral[0],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.primary}22`,
    marginBottom: 16,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: neutral[100],
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${brand.primary}10`,
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  statusText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },
  info: { flex: 1, justifyContent: 'space-between' },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
    lineHeight: 22,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
  },
  actionBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: brand.primary,
  },
});
