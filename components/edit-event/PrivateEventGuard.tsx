import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const SESSION_KEY_PREFIX = "private_event_access_";

// ─── PrivateEventGuard ────────────────────────────────────────────────────────

/**
 * Wraps private event content. Compares the user's input directly against the
 * accessKey already present in the event API response — no extra round-trip needed.
 * Persists the unlocked state via AsyncStorage so the user doesn't re-type after
 * app restarts.
 */
export function PrivateEventGuard({
  eventId,
  eventName,
  correctAccessKey,
  children,
}: {
  eventId: string;
  eventName?: string;
  correctAccessKey: string;
  children: React.ReactNode;
}) {
  const storageKey = `${SESSION_KEY_PREFIX}${eventId}`;

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true); // loading cached key

  // Restore from AsyncStorage so the user doesn't re-type after app restart
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then((cached) => {
      if (!cancelled && cached && cached === correctAccessKey) {
        setIsUnlocked(true);
      }
      if (!cancelled) setIsChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, correctAccessKey]);

  const handleVerify = async () => {
    const trimmed = inputKey.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your access key.");
      return;
    }
    if (trimmed === correctAccessKey.toUpperCase()) {
      await AsyncStorage.setItem(storageKey, trimmed);
      setIsUnlocked(true);
    } else {
      setError("Invalid access key. Please check and try again.");
    }
  };

  // Still loading cached key — show nothing to avoid flicker
  if (isChecking) return null;

  if (isUnlocked) return <>{children}</>;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Lock icon */}
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed" size={28} color={brand.primary} />
          </View>

          {/* Heading */}
          <Text style={s.title}>Private Event</Text>
          {eventName ? (
            <Text style={s.eventName} numberOfLines={1}>
              {eventName}
            </Text>
          ) : null}
          <Text style={s.sub}>
            This is a private event. Please enter your access key to view
            details and RSVP.
          </Text>

          {/* Input */}
          <TextInput
            style={[s.input, error ? s.inputError : null]}
            value={inputKey}
            onChangeText={(v) => {
              setInputKey(v.toUpperCase());
              if (error) setError("");
            }}
            placeholder="VIBE-XXXX"
            placeholderTextColor={neutral[400]}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />

          {error ? (
            <View style={s.errorRow}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={semantic.error}
              />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Unlock button */}
          <TouchableOpacity
            style={[s.btn, !inputKey.trim() && s.btnDisabled]}
            onPress={handleVerify}
            disabled={!inputKey.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="key-outline" size={15} color="#fff" />
            <Text style={s.btnText}>Unlock Event</Text>
          </TouchableOpacity>

          <Text style={s.hint}>
            Don't have a code? Contact the event organizer.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── AccessKeyDisplay ─────────────────────────────────────────────────────────

export function AccessKeyDisplay({
  accessKey,
  eventId,
  eventName,
}: {
  accessKey: string;
  eventId: string;
  eventName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const eventUrl = `https://mynextvibe.app/events/${eventId}`;
  const inviteText = `You're invited to a private event!\n\nEvent Link: ${eventUrl}\nAccess Key: ${accessKey}\n\nEnter the access key when prompted to view event details and RSVP.`;

  const handleCopy = async () => {
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url: eventUrl, message: inviteText }
          : { message: inviteText }
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Toast.show({ type: "error", text1: "Error", text2: "Could not share invite." });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url: eventUrl, message: inviteText }
          : { message: inviteText }
      );
    } catch {}
  };

  return (
    <View style={d.container}>
      {/* Header row */}
      <View style={d.headerRow}>
        <Ionicons name="lock-closed-outline" size={14} color={brand.primary} />
        <Text style={d.headerText}>Private Event Access Key</Text>
      </View>

      {/* Key display */}
      <View style={d.keyBox}>
        <Text style={d.keyText} selectable>
          {accessKey}
        </Text>
      </View>

      <Text style={d.hint}>
        Share this key with your invited guests. Only people with this code can
        view event details and RSVP.
      </Text>

      {/* Copy full invite */}
      <TouchableOpacity
        style={d.copyBtn}
        onPress={handleCopy}
        activeOpacity={0.75}
      >
        <Ionicons
          name={copied ? "checkmark-outline" : "copy-outline"}
          size={15}
          color={brand.primary}
        />
        <Text style={d.copyBtnText}>
          {copied ? "Copied!" : "Copy Invite Link & Code"}
        </Text>
      </TouchableOpacity>

      {/* QR Modal */}
      <AccessKeyQRModal
        visible={showQR}
        eventName={eventName}
        eventUrl={eventUrl}
        accessKey={accessKey}
        onDismiss={() => setShowQR(false)}
        onShare={handleShare}
      />
    </View>
  );
}

// ─── AccessKeyQRModal ─────────────────────────────────────────────────────────
// Inline QR modal — encodes eventUrl so guests can scan and open the event.
// The access key is shown below the QR so they have it ready on arrival.

async function generateQRDataUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
}

function AccessKeyQRModal({
  visible,
  eventName,
  eventUrl,
  accessKey,
  onDismiss,
  onShare,
}: {
  visible: boolean;
  eventName?: string;
  eventUrl: string;
  accessKey: string;
  onDismiss: () => void;
  onShare: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    setQrDataUrl(null);
    setGenerating(true);
    generateQRDataUrl(eventUrl).then((res) => {
      if (res) setQrDataUrl(res);
      else setFailed(true);
      setGenerating(false);
    });
  }, [visible, eventUrl]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={qr.backdrop} />
      </TouchableWithoutFeedback>

      <View style={qr.center}>
        <View style={qr.sheet}>
          {/* Close */}
          <TouchableOpacity
            style={qr.closeBtn}
            onPress={onDismiss}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={qr.title} numberOfLines={2}>
            {eventName ?? "Event QR Code"}
          </Text>
          <Text style={qr.subtitle}>
            Guests scan this to open the event page
          </Text>

          {/* QR */}
          <View style={qr.qrBox}>
            {generating ? (
              <View style={qr.qrPlaceholder}>
                <ActivityIndicator size="large" color={brand.primary} />
                <Text style={qr.qrHint}>Generating…</Text>
              </View>
            ) : qrDataUrl ? (
              <Image
                source={{ uri: qrDataUrl }}
                style={qr.qrImage}
                resizeMode="contain"
                accessibilityLabel={`QR code for ${eventName ?? "event"}`}
              />
            ) : (
              <View style={qr.qrPlaceholder}>
                <Ionicons
                  name="qr-code-outline"
                  size={72}
                  color={neutral[300]}
                />
                {failed && <Text style={qr.qrHint}>Couldn't generate QR</Text>}
              </View>
            )}
          </View>

          {/* Access key reminder */}
          <View style={qr.keyRow}>
            <Ionicons name="key-outline" size={13} color={neutral[400]} />
            <Text style={qr.keyLabel}>Access key: </Text>
            <Text style={qr.keyValue} selectable>
              {accessKey}
            </Text>
          </View>

          {/* URL */}
          <Text style={qr.url} numberOfLines={1}>
            {eventUrl}
          </Text>

          {/* Share button */}
          <TouchableOpacity
            style={qr.shareBtn}
            onPress={() => {
              onDismiss();
              onShare();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={16} color="#fff" />
            <Text style={qr.shareBtnText}>Share Invite</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${brand.primary}14`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: neutral[900],
    textAlign: "center",
  },
  eventName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
    textAlign: "center",
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: neutral[200],
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    color: neutral[900],
    backgroundColor: neutral[50],
    letterSpacing: 2,
    textAlign: "center",
  },
  inputError: {
    borderColor: semantic.error,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
    backgroundColor: `${semantic.error}12`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 16,
  },
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 2,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: "#fff",
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
  },
});

const d = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.primary}30`,
    backgroundColor: `${brand.primary}08`,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  keyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  keyText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: brand.primary,
    letterSpacing: 3,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: `${brand.primary}35`,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: `${brand.primary}06`,
  },
  iconBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: brand.primary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: `${brand.primary}40`,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: `${brand.primary}06`,
  },
  copyBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});

// ─── QR modal styles ──────────────────────────────────────────────────────────

const qr = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  sheet: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
    textAlign: "center",
    marginTop: 8,
    maxWidth: "80%",
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
  },
  qrBox: {
    width: 220,
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  qrImage: { width: 210, height: 210 },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: "100%",
  },
  qrHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  keyLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  keyValue: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: brand.primary,
    letterSpacing: 1.5,
  },
  url: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
    paddingHorizontal: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 13,
    borderRadius: 14,
    width: "100%",
    marginTop: 2,
  },
  shareBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});
