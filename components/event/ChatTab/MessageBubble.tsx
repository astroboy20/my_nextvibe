import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ChatMessage, msgText } from "./types";
import { Avatar } from "@/components/ui/Avatar";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const MessageBubble = ({
  msg,
  isMe,
  onRetry,
}: {
  msg: ChatMessage;
  isMe: boolean;
  onRetry?: (msg: ChatMessage) => void;
}) => {
  const router = useRouter();
  const name =
    msg.sender?.displayName?.trim() || msg.sender?.username?.trim() || "User";
  const isOrg = msg.sender?.role === "ORGANIZER" || msg.isOrganizer;
  const ts = timeAgo(msg.createdAt);
  const text = msgText(msg);
  const senderId = msg.sender?.id;
  const avatar = msg.sender?.avatarUrl;

  const isSending = msg.status === "sending";
  const isFailed = msg.status === "failed";

  if (!text) return null;

  return (
    <View style={[b.row, isMe && b.rowReverse]}>
      {!isMe && (
        <TouchableOpacity
          onPress={() => senderId && router.push(`/users/${senderId}` as any)}
          activeOpacity={0.8}
          style={b.avatarTouch}
        >
          <Avatar uri={avatar} name={name} size={32} variant="light" />
        </TouchableOpacity>
      )}

      <View style={[b.col, isMe && b.colRight]}>
        {!isMe && (
          <View style={b.metaRow}>
            <TouchableOpacity
              onPress={() =>
                senderId && router.push(`/users/${senderId}` as any)
              }
              activeOpacity={0.8}
            >
              <Text style={b.senderName}>{name}</Text>
            </TouchableOpacity>
            {isOrg && (
              <View style={b.orgBadge}>
                <Text style={b.orgText}>Organizer</Text>
              </View>
            )}
            {ts ? <Text style={b.ts}>{ts}</Text> : null}
          </View>
        )}

        <View
          style={[
            b.bubble,
            isMe ? b.bubbleMe : b.bubbleOther,
            isSending && b.bubbleSending,
          ]}
        >
          <Text style={[b.bubbleText, isMe && b.bubbleTextMe]}>{text}</Text>
        </View>

        {isMe ? (
          <View style={b.statusRow}>
            {isSending ? (
              <View style={b.statusInline}>
                <ActivityIndicator size="small" color={neutral[300]} />
                <Text style={b.ts}>Sending…</Text>
              </View>
            ) : isFailed ? (
              <TouchableOpacity
                onPress={() => onRetry?.(msg)}
                activeOpacity={0.7}
                style={b.statusInline}
              >
                <Ionicons name="alert-circle" size={12} color="#D92D20" />
                <Text style={b.retryText}>Failed · Tap to retry</Text>
              </TouchableOpacity>
            ) : ts ? (
              <Text style={[b.ts, b.tsRight]}>{ts}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default MessageBubble;

const b = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rowReverse: { flexDirection: "row-reverse" },
  avatarTouch: { marginTop: 2 },
  col: { flex: 1, maxWidth: "78%", alignItems: "flex-start" },
  colRight: { alignItems: "flex-end" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  senderName: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: neutral[700],
  },
  orgBadge: {
    backgroundColor: `${brand.primary}15`,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  orgText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: brand.primary,
  },
  ts: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[300] },
  tsRight: { alignSelf: "flex-end", marginTop: 3 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    maxWidth: "100%",
  },
  bubbleOther: { backgroundColor: neutral[100], borderTopLeftRadius: 4 },
  bubbleMe: { backgroundColor: "#5B1A57", borderTopRightRadius: 4 },
  bubbleSending: { opacity: 0.55 }, // NEW
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    lineHeight: 20,
  },
  bubbleTextMe: { color: "#fff" },
  // NEW — status row styles
  statusRow: { marginTop: 3, alignSelf: "flex-end" },
  statusInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: "#D92D20",
  },
});
