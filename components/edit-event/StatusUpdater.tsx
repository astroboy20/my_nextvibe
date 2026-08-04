import { neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  status?: string;
  isLoading?: boolean;
  onEnd: () => void;
  onCancel: () => void;
}

export default function StatusUpdater({ status, isLoading, onEnd, onCancel }: Props) {
  if (status === 'DRAFT') {
    return (
      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={neutral[400]} />
        <Text style={s.infoText}>
          Your event is a draft. Use the publish section to choose a plan and go live.
        </Text>
      </View>
    );
  }

  if (status === 'PUBLISHED' || status === 'LIVE') {
    return (
      <View style={s.root}>
        {/* End event */}
        <View style={[s.actionBox, s.dangerBox]}>
          <Text style={s.actionDesc}>
            Mark the event as ended once it's over. Rewards will be distributed automatically.
          </Text>
          <TouchableOpacity
            style={[s.btn, s.dangerBtn]}
            onPress={onEnd}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="stop-circle-outline" size={16} color={semantic.error} />
            <Text style={[s.btnText, { color: semantic.error }]}>End Event</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel event */}
        <View style={[s.actionBox, s.mutedBox]}>
          <Text style={s.actionDesc}>
            Cancel the event. Attendees will be notified.
          </Text>
          <TouchableOpacity
            style={[s.btn, s.mutedBtn]}
            onPress={onCancel}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color={neutral[500]} />
            <Text style={[s.btnText, { color: neutral[500] }]}>Cancel Event</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === 'ENDED' || status === 'CANCELLED') {
    return (
      <View style={s.infoBox}>
        <Ionicons name="checkmark-done-circle-outline" size={16} color={neutral[400]} />
        <Text style={s.infoText}>
          This event has been {status === 'ENDED' ? 'ended' : 'cancelled'} and cannot be modified.
        </Text>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  root: { gap: 10 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
  },
  actionBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  dangerBox: {
    borderColor: `${semantic.error}30`,
    backgroundColor: `${semantic.error}06`,
  },
  mutedBox: {
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  actionDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerBtn: {
    borderColor: `${semantic.error}50`,
  },
  mutedBtn: {
    borderColor: neutral[300],
  },
  btnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
});
