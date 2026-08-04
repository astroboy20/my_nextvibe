import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

// qrcode is a web library — on RN we render a simple placeholder
// swap this for react-native-qrcode-svg when added to the project
interface Props {
  visible: boolean;
  eventName?: string;
  eventUrl: string;
  onDismiss: () => void;
}

export default function QRModal({ visible, eventName, eventUrl, onDismiss }: Props) {
  const handleCopy = () => {
    Share.share({ message: eventUrl, title: eventName });
    onDismiss();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.center}>
        <View style={s.sheet}>
          <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>

          {eventName && <Text style={s.title} numberOfLines={2}>{eventName}</Text>}

          {/* QR placeholder — replace with <QRCode value={eventUrl} size={200} /> once react-native-qrcode-svg is installed */}
          <View style={s.qrBox}>
            <Ionicons name="qr-code-outline" size={120} color={neutral[800]} />
            <Text style={s.qrHint}>QR Code</Text>
          </View>

          <Text style={s.url} numberOfLines={2}>{eventUrl}</Text>

          <TouchableOpacity style={s.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={s.copyText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: neutral[0],
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
    textAlign: 'center',
    marginTop: 8,
  },
  qrBox: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: neutral[200],
    gap: 6,
  },
  qrHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  url: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  copyText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
