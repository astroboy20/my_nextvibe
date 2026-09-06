/**
 * ChatScreen — React Native
 *
 * Opens a 1-to-1 DM conversation.
 *
 * Params (via expo-router):
 *   id        — either a conversationId  (coming from /messages list)
 *               or a userId              (coming from a user profile / PersonCard)
 *   username  — display name shown in the header
 *
 * If `id` looks like a userId (not found in existing conversations) the screen
 * calls startConversation first, then uses the returned conversationId.
 *
 * Real-time:
 *   join:dm   → join the socket room
 *   send:dm   → emit a new message
 *   new:dm    → receive messages from the other participant (or own echo)
 */
import { AppHeader } from "@/components/navigation/TopNavBar";
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import {
    useGetConversationsQuery,
    useGetMessagesQuery,
    useStartConversationMutation,
    type Message,
} from "@/store/api/messagingApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

const RADIUS = 18;
const CORNER = 5;

function Bubble({
  msg,
  isMine,
  isFirst,
  isLast,
  participantName,
}: {
  msg: Message;
  isMine: boolean;
  isFirst: boolean;
  isLast: boolean;
  participantName: string;
}) {
  return (
    <View
      style={[
        bub.row,
        isMine ? bub.rowRight : bub.rowLeft,
        isLast && bub.groupEnd,
      ]}
    >
      {!isMine && (
        <View style={bub.avatarSlot}>
          {isLast && (
            <View style={bub.avatar}>
              <Text style={bub.avatarText}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={[bub.col, isMine && bub.colRight]}>
        <View
          style={[
            bub.bubble,
            isMine ? bub.bubbleMine : bub.bubbleTheirs,
            isMine && !isFirst && bub.mineNotFirst,
            isMine && !isLast && bub.mineNotLast,
            !isMine && !isFirst && bub.theirNotFirst,
            !isMine && !isLast && bub.theirNotLast,
          ]}
        >
          <Text style={isMine ? bub.textMine : bub.textTheirs}>{msg.body}</Text>
        </View>
        {isLast && (
          <Text style={[bub.time, isMine && bub.timeRight]}>
            {formatTime(msg.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const { id, username } = useLocalSearchParams<{
    id: string;
    username: string;
  }>();

  const { user } = useAuth();
  const myId = user?.id ?? "";

  // ── Resolve conversationId ────────────────────────────────────────────────
  // `id` from params might be a conversationId (from messages list) or a
  // userId (from user profile). We resolve it here.
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const { data: convsData } = useGetConversationsQuery();
  const [startConversation] = useStartConversationMutation();

  useEffect(() => {
    if (!id) return;

    const conversations = convsData?.data ?? [];

    // Check if `id` matches an existing conversation directly
    const directMatch = conversations.find((c) => c.id === id);
    if (directMatch) {
      setConversationId(id);
      setResolving(false);
      return;
    }

    // Otherwise treat `id` as a userId and start/fetch the conversation
    const resolve = async () => {
      try {
        const res = await startConversation({ userId: id }).unwrap();
        const cid = res?.data?.id;
        if (cid) {
          setConversationId(cid);
        } else {
          Toast.show({ type: "error", text1: "Could not open conversation" });
          router.back();
        }
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: err?.data?.error?.message ?? err?.data?.message ?? "Failed to open conversation",
        });
        router.back();
      } finally {
        setResolving(false);
      }
    };

    // Only resolve once we know conversations have loaded (or there are none)
    if (convsData !== undefined) {
      resolve();
    }
  }, [id, convsData, startConversation, router]);

  // ── Message history ───────────────────────────────────────────────────────
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const pendingRef = useRef<Map<string, string>>(new Map());
  const flatRef = useRef<FlatList>(null);

  const { data: messagesData, isLoading: loadingMessages } =
    useGetMessagesQuery(
      { conversationId: conversationId! },
      { skip: !conversationId, refetchOnMountOrArgChange: true }
    );

  // Seed local state from REST — API returns newest-first, reverse for display
  useEffect(() => {
    if (messagesData?.data) {
      const msgs = [...messagesData.data.data].reverse();
      setLocalMessages(msgs);
    }
  }, [messagesData]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (localMessages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [localMessages]);

  // ── Socket ────────────────────────────────────────────────────────────────
  const { socketRef, isConnected, status } = useSocket("messaging", {
    enabled: !!conversationId,
  });

  // Join room and listen for incoming DMs
  useEffect(() => {
    if (!conversationId) return;
    const socket = socketRef.current;
    if (!socket) return;

    const joinRoom = () => {
      console.log(`[chat] 🔗 join:dm  conv=${conversationId}  socketId=${socket.id ?? "pending"}`);
      socket.emit("join:dm", { conversationId });
    };

    const handleNewDm = (msg: Message) => {
      console.log(`[chat] 📨 new:dm received`, msg);

      setLocalMessages((prev) => {
        // Dedupe — server may echo to sender
        if (prev.some((m) => m.id === msg.id)) return prev;

        // Replace optimistic bubble with server echo
        if (msg.senderId === myId) {
          const optId = pendingRef.current.get(msg.body);
          if (optId) {
            pendingRef.current.delete(msg.body);
            return prev.map((m) => (m.id === optId ? msg : m));
          }
        }

        return [...prev, msg];
      });
    };

    socket.on("connect", joinRoom);
    socket.on("new:dm", handleNewDm);
    if (socket.connected) joinRoom();

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new:dm", handleNewDm);
    };
  }, [conversationId, socketRef, myId]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(() => {
    const body = input.trim();
    if (!body || !conversationId) return;

    if (!isConnected || !socketRef.current) {
      Toast.show({ type: "error", text1: "Not connected — please wait" });
      return;
    }

    console.log(`[chat] 📤 send:dm  conv=${conversationId}  body="${body}"`);
    socketRef.current.emit("send:dm", { conversationId, body });

    // Optimistic bubble
    const optimisticId = `opt-${Date.now()}`;
    pendingRef.current.set(body, optimisticId);
    const optimistic: Message = {
      id: optimisticId,
      senderId: myId,
      body,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(false);
  }, [input, conversationId, isConnected, socketRef, myId]);

  // ── Render ────────────────────────────────────────────────────────────────

  const displayName = username ?? "Chat";

  if (resolving || (conversationId && loadingMessages && localMessages.length === 0)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <AppHeader onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isMine = item.senderId === myId;
    const prev = localMessages[index - 1];
    const next = localMessages[index + 1];
    return (
      <Bubble
        msg={item}
        isMine={isMine}
        isFirst={!prev || prev.senderId !== item.senderId}
        isLast={!next || next.senderId !== item.senderId}
        participantName={displayName}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <AppHeader onBack={() => router.back()} />
      <View style={styles.chatBar}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{displayName}</Text>
          <Text
            style={[
              styles.statusText,
              status === "connected" && styles.statusConnected,
              status === "connecting" && styles.statusConnecting,
              status === "error" && styles.statusError,
            ]}
          >
            {status === "connected"
              ? "online"
              : status === "connecting"
              ? "connecting…"
              : status === "error"
              ? "connection error"
              : "offline"}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={neutral[600]} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* Messages list */}
        {localMessages.length === 0 && !loadingMessages ? (
          <View style={styles.center}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={neutral[200]}
            />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Say hello!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={localMessages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {!isConnected && (
            <Text style={styles.offlineNote}>
              {status === "connecting" ? "Connecting…" : "Reconnecting — messages may be delayed"}
            </Text>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={isConnected ? "Type a message…" : "Waiting for connection…"}
              placeholderTextColor={neutral[400]}
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              editable={isConnected}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!input.trim() || !isConnected || sending) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || !isConnected || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[700],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },

  chatBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    gap: 10,
    backgroundColor: "#fff",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: "#fff",
  },
  headerName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[900],
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
    marginTop: 1,
  },
  statusConnected: { color: "#22C55E" },
  statusConnecting: { color: "#F59E0B" },
  statusError: { color: "#EF4444" },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8, gap: 2 },

  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    backgroundColor: "#fff",
  },
  offlineNote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
    textAlign: "center",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: neutral[200],
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    backgroundColor: neutral[50],
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: neutral[300] },
});

const bub = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 1,
    paddingHorizontal: 4,
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  groupEnd: { marginBottom: 6 },

  avatarSlot: {
    width: 30,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${brand.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fontFamily.bold, fontSize: 11, color: "#fff" },

  col: { maxWidth: "75%", gap: 2 },
  colRight: { alignItems: "flex-end" },

  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS },
  bubbleMine: {
    backgroundColor: brand.primary,
    borderBottomRightRadius: RADIUS,
  },
  bubbleTheirs: {
    backgroundColor: neutral[100],
    borderBottomLeftRadius: RADIUS,
  },

  mineNotFirst: { borderTopRightRadius: CORNER },
  mineNotLast: { borderBottomRightRadius: CORNER },
  theirNotFirst: { borderTopLeftRadius: CORNER },
  theirNotLast: { borderBottomLeftRadius: CORNER },

  textMine: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: "#fff",
    lineHeight: 20,
  },
  textTheirs: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    lineHeight: 20,
  },

  time: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[400],
    marginTop: 2,
    paddingHorizontal: 4,
  },
  timeRight: { textAlign: "right" },
});
