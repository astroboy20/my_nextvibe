/**
 * QRModal.tsx
 *
 * Displays a scannable QR code for an event URL plus a share action.
 *
 * QR generation: uses the `qrcode` npm package (already in node_modules)
 * to render a data-URI PNG, then displays it via <Image>.
 *
 * Falls back to a placeholder icon if generation fails.
 */

import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  eventName?: string;
  eventUrl: string;
  onDismiss: () => void;
}

// ─── QR generation helper ──────────────────────────────────────────────────────

async function generateQRDataUrl(url: string): Promise<string | null> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark:  '#1a1a2e',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch {
    return null;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function QRModal({ visible, eventName, eventUrl, onDismiss }: Props) {
  const [qrDataUrl, setQrDataUrl]   = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genFailed, setGenFailed]   = useState(false);

  // Generate QR whenever the modal opens or the URL changes
  useEffect(() => {
    if (!visible || !eventUrl) return;
    setGenFailed(false);
    setQrDataUrl(null);
    setIsGenerating(true);
    generateQRDataUrl(eventUrl).then((result) => {
      if (result) {
        setQrDataUrl(result);
      } else {
        setGenFailed(true);
      }
      setIsGenerating(false);
    });
  }, [visible, eventUrl]);

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
            {isGenerating ? (
              <View style={s.qrPlaceholder}>
                <ActivityIndicator size="large" color={brand.primary} />
                <Text style={s.qrHint}>Generating QR…</Text>
              </View>
            ) : qrDataUrl ? (
              <Image
                source={{ uri: qrDataUrl }}
                style={s.qrImage}
                resizeMode="contain"
                accessibilityLabel={`QR code for ${eventName ?? 'event'}`}
              />
            ) : (
              /* Fallback placeholder */
              <View style={s.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color={neutral[700]} />
                {genFailed && (
                  <Text style={s.qrHint}>Couldn't generate QR</Text>
                )}
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
  qrImage: {
    width: 210,
    height: 210,
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
