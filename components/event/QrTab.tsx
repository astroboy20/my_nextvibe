import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { EventDetail } from './types';

interface Props {
  event: EventDetail;
}

// ─── Pure-JS QR renderer (no native modules) ─────────────────────────────────

function QRMatrix({ value, size = 200, color = brand.primary }: {
  value: string;
  size?: number;
  color?: string;
}) {
  const [matrix, setMatrix] = useState<boolean[][]>([]);

  useEffect(() => {
    try {
      // QRCode.create is synchronous in the qrcode package
      const qr   = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const data = qr.modules.data as Uint8ClampedArray;
      const side = qr.modules.size as number;
      const grid: boolean[][] = [];
      for (let r = 0; r < side; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < side; c++) {
          row.push(data[r * side + c] === 1);
        }
        grid.push(row);
      }
      setMatrix(grid);
    } catch (e) {
      console.warn('QR generation failed', e);
    }
  }, [value]);

  if (!matrix.length) return <View style={{ width: size, height: size }} />;

  const cellSize = size / matrix.length;

  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {matrix.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((filled, c) => (
            <View
              key={c}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: filled ? color : '#fff',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── QrTab ────────────────────────────────────────────────────────────────────

export default function QrTab({ event }: Props) {
  const [copied, setCopied] = useState(false);
  const eventUrl = `https://mynextvibe.com/events/${event.id}`;
  const qrValue  = event.qrCode ?? eventUrl;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title:   event.name,
        message: `Check out this event on NextVibe: ${eventUrl}`,
        url:     eventUrl,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>

      {/* QR card */}
      <View style={styles.qrCard}>
        <View style={styles.qrBox}>
          <QRMatrix value={qrValue} size={200} color={brand.primary} />
        </View>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.scanHint}>Scan to view event details</Text>
      </View>

      {/* Event link row */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Event Link</Text>
        <View style={styles.linkRow}>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={1}>{eventUrl}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnActive]}
            onPress={handleCopy}
            activeOpacity={0.75}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? '#fff' : neutral[600]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => Alert.alert('Download', 'QR download coming soon.')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="download-outline" size={22} color={brand.primary} />
          </View>
          <Text style={styles.actionLabel}>Download QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleShare}>
          <View style={styles.actionIcon}>
            <Ionicons name="share-social-outline" size={22} color={brand.primary} />
          </View>
          <Text style={styles.actionLabel}>Share Event</Text>
        </TouchableOpacity>
      </View>

      {/* Pro tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Ionicons name="bulb-outline" size={20} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipBody}>
            Print this QR code on your event flyers or banners, or share it on social media so guests can quickly access event details.
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },

  qrCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  eventName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  scanHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
  },

  section: { gap: 8 },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  linkRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[700] },
  copyBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: neutral[200],
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  copyBtnActive: { backgroundColor: semantic.success, borderColor: semantic.success },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    borderRadius: 16, borderWidth: 1,
    borderColor: neutral[200], backgroundColor: '#fff',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 16,
    backgroundColor: `${brand.primary}08`,
    borderWidth: 1, borderColor: `${brand.primary}20`,
  },
  tipIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${brand.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  tipTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800], marginBottom: 4 },
  tipBody:  { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500], lineHeight: 18 },
});
