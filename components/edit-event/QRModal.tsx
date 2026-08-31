import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Platform,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  eventName?: string;
  eventUrl: string;
  onDismiss: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function QRModal({ visible, eventName, eventUrl, onDismiss }: Props) {
  const handleShare = async () => {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: eventUrl, message: eventName ?? eventUrl }
          : { message: `${eventName ? `${eventName}\n` : ''}${eventUrl}` },
      );
    } catch {
      // user cancelled or share sheet failed — no-op
    }
    onDismiss();
  };

  const handleCopyLink = async () => {
    // Clipboard API — import dynamically so it doesn't break if module missing
    try {
      const Clipboard = require('@react-native-clipboard/clipboard')?.default
        ?? require('expo-clipboard');
      await (Clipboard.setStringAsync ?? Clipboard.setString)(eventUrl);
    } catch {
      // clipboard not available — fall back to share
      await Share.share({ message: eventUrl });
    }
    onDismiss();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <View style={s.center}>
        <View style={s.sheet}>
          {/* Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>

          {/* Title */}
          {eventName && (
            <Text style={s.title} numberOfLines={2}>{eventName}</Text>
          )}

          {/* QR area */}
          <View style={s.qrContainer}>
            {eventUrl ? (
              <QRCode
                value={eventUrl}
                size={210}
                color="#1a1a2e"
                backgroundColor="#ffffff"
                ecl="M"
              />
            ) : (
              /* Fallback placeholder when there's no URL to encode */
              <View style={s.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color={neutral[700]} />
              </View>
            )}
          </View>

          {/* URL label */}
          <Text style={s.url} numberOfLines={2}>{eventUrl}</Text>

          {/* Action buttons */}
          <TouchableOpacity style={s.primaryBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={17} color="#fff" />
            <Text style={s.primaryBtnText}>Share Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={handleCopyLink} activeOpacity={0.8}>
            <Ionicons name="copy-outline" size={16} color={brand.primary} />
            <Text style={s.secondaryBtnText}>Copy Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  qrContainer: {
    width: 220,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: '100%',
  },
  qrHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
  url: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
  },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
  },
  secondaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});