import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

export type ConfirmAction = 'PUBLISHED' | 'CANCELLED' | 'ENDED';

interface Props {
  action: ConfirmAction | null;
  isLoading?: boolean;
  onConfirm: (action: ConfirmAction) => void;
  onDismiss: () => void;
}

const CONFIG: Record<ConfirmAction, {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
}> = {
  PUBLISHED: {
    icon: 'checkmark-circle-outline',
    iconColor: brand.primary,
    title: 'Publish Event?',
    body: 'This will publish your event and make it visible to attendees.',
    confirmLabel: 'Publish',
    confirmColor: brand.primary,
  },
  ENDED: {
    icon: 'stop-circle-outline',
    iconColor: semantic.error,
    title: 'End Event?',
    body: 'This will mark the event as ended. Rewards will be distributed automatically. This action cannot be undone.',
    confirmLabel: 'End Event',
    confirmColor: semantic.error,
  },
  CANCELLED: {
    icon: 'close-circle-outline',
    iconColor: neutral[500],
    title: 'Cancel Event?',
    body: 'This will cancel the event. Attendees will be notified. This action cannot be undone.',
    confirmLabel: 'Cancel Event',
    confirmColor: neutral[500],
  },
};

export default function ConfirmModal({ action, isLoading, onConfirm, onDismiss }: Props) {
  if (!action) return null;
  const cfg = CONFIG[action];

  return (
    <Modal transparent animationType="fade" visible={!!action} onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.center}>
        <View style={s.sheet}>
          <View style={s.iconRow}>
            <Ionicons name={cfg.icon} size={26} color={cfg.iconColor} />
            <Text style={s.title}>{cfg.title}</Text>
          </View>
          <Text style={s.body}>{cfg.body}</Text>

          <View style={s.row}>
            <TouchableOpacity style={s.cancelBtn} onPress={onDismiss} activeOpacity={0.7} disabled={isLoading}>
              <Text style={s.cancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: cfg.confirmColor }]}
              onPress={() => onConfirm(action)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Text style={s.confirmText}>{cfg.confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: neutral[0],
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
