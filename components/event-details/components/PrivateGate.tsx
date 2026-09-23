import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { TextInput } from "react-native";
import { Modal } from "react-native";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// ─── Private event gate ───────

interface PrivateGateProps {
  eventName?: string;
  onSubmit: (key: string) => void;
  onBack: () => void;
  isChecking: boolean;
  errorMsg: string | null;
}

const PrivateEventGate = ({
  eventName,
  onSubmit,
  onBack,
  isChecking,
  errorMsg,
}: PrivateGateProps) => {
  const [key, setKey] = useState("");

  return (
    <Modal visible animationType="fade" transparent>
      <View style={gate.backdrop}>
        <View style={gate.card}>
          {/* Lock icon */}
          <View style={gate.iconWrap}>
            <Ionicons name="lock-closed" size={32} color={brand.primary} />
          </View>

          <Text style={gate.title}>Private Event</Text>
          <Text style={gate.sub}>
            {eventName
              ? `${eventName}" is invite-only.`
              : "This event is invite-only."}{" "}
            Enter the access key from your invitation to continue.
          </Text>

          <TextInput
            style={[gate.input, errorMsg ? gate.inputError : null]}
            placeholder="Access key"
            placeholderTextColor={neutral[400]}
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => key.trim() && onSubmit(key.trim())}
          />

          {errorMsg ? <Text style={gate.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            style={[gate.btn, (!key.trim() || isChecking) && gate.btnDisabled]}
            onPress={() => key.trim() && onSubmit(key.trim())}
            activeOpacity={0.8}
            disabled={!key.trim() || isChecking}
          >
            {isChecking ? (
              <Text style={gate.btnText}>Checking…</Text>
            ) : (
              <>
                <Ionicons name="key-outline" size={15} color="#fff" />
                <Text style={gate.btnText}>Access Event</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={gate.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={gate.backText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PrivateEventGate;

// ─── Private gate styles ──────────────────────────────────────────────────────

const gate = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: neutral[900],
    backgroundColor: neutral[50],
    letterSpacing: 1,
  },
  inputError: {
    borderColor: semantic.error,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    textAlign: "center",
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
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: "#fff",
  },
  backBtn: { paddingVertical: 4 },
  backText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
});
