/**
 * ChatTab — React Native
 *
 * Real-time event chat.
 * - Uses the shared useSocket hook (no duplicate socket logic)
 * - ScrollView instead of FlatList — avoids nested VirtualizedList warning
 * - Messages ordered oldest→newest, auto-scrolls to bottom on new message
 * - Optimistic bubbles replaced by server echo
 * - Avatar from URL with letter fallback
 */
import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { API_URL, tokenStore } from "@/store/baseQuery";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "pre-event" | "during" | "post-event";

const SECTION_KEY: Record<Section, string> = {
  "pre-event": "PRE_EVENT",
  during: "DURING_EVENT",
  "post-event": "POST_EVENT",
};

const SECTIONS: { value: Section; label: string }[] = [
  { value: "pre-event", label: "Pre-Event" },
  { value: "during", label: "During" },
  { value: "post-event", label: "Post-Event" },
];

interface ChatMessage {
  id: string;
  body?: string;
  content?: string;
  text?: string;
  senderId?: string;
  isOrganizer?: boolean;
  createdAt?: string;
  sender?: {
    id?: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
    role?: string;
  };
}

function msgText(m: ChatMessage): string {
  return m.body ?? m.content ?? m.text ?? "";
}

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

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const router = useRouter();
  const name =
    msg.sender?.displayName?.trim() || msg.sender?.username?.trim() || "User";
  const isOrg = msg.sender?.role === "ORGANIZER" || msg.isOrganizer;
  const ts = timeAgo(msg.createdAt);
  const text = msgText(msg);
  const senderId = msg.sender?.id;
  const avatar = msg.sender?.avatarUrl;

  if (!text) return null;

  return (
    <View style={[b.row, isMe && b.rowReverse]}>
      {/* Avatar — only for others */}
      {!isMe && (
        <TouchableOpacity
          onPress={() => senderId && router.push(`/users/${senderId}` as any)}
          activeOpacity={0.8}
          style={b.avatarTouch}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={b.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={b.avatarFb}>
              <Text style={b.avatarL}>{name[0]?.toUpperCase()}</Text>
            </View>
          )}
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

        <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleOther]}>
          <Text style={[b.bubbleText, isMe && b.bubbleTextMe]}>{text}</Text>
        </View>

        {isMe && ts ? <Text style={[b.ts, b.tsRight]}>{ts}</Text> : null}
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rowReverse: { flexDirection: "row-reverse" },
  avatarTouch: { marginTop: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${brand.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarL: { fontFamily: fontFamily.bold, fontSize: 13, color: brand.primary },
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
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    lineHeight: 20,
  },
  bubbleTextMe: { color: "#fff" },
});

// ─── ChatTab ──────────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
}

export default function ChatTab({ eventId }: Props) {
  const { user, isAuthenticated } = useAuth();

  const [section, setSection] = useState<Section>("pre-event");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef<Map<string, string>>(new Map());

  // ── Keyboard height tracking — works on both iOS and Android ─────────────
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom so the last message stays visible above the keyboard
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Socket — use shared hook ───────────────────────────────────────────────
  const { socketRef, isConnected } = useSocket("messaging", {
    enabled: !!eventId,
  });

  // Join the correct room whenever section changes or socket connects
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;
    socket.emit("join:event-chat", {
      eventId,
      section: SECTION_KEY[section],
    });
  }, [eventId, section, isConnected, socketRef]);

  // Listen for incoming messages (stable — only re-registers if eventId changes)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleMsg = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        const isMe = msg.sender?.id === user?.id || msg.senderId === user?.id;
        if (isMe) {
          const text = msgText(msg);
          const optId = pendingRef.current.get(text);
          if (optId) {
            pendingRef.current.delete(text);
            return prev.map((m) => (m.id === optId ? msg : m));
          }
        }
        return [...prev, msg];
      });
    };

    socket.on("new:event-chat", handleMsg);
    return () => {
      socket.off("new:event-chat", handleMsg);
    };
  }, [eventId, socketRef, user?.id]);

  // ── History ────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (sec: Section) => {
      if (!eventId) return;
      setLoading(true);
      setMessages([]);
      pendingRef.current.clear();
      try {
        const token = await tokenStore.get("accessToken");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_URL}/v1/events/${eventId}/chat/${SECTION_KEY[sec]}`,
          { headers }
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const msg = errorData?.error?.message ?? errorData?.message;
          if (msg) Toast.show({ type: "error", text1: msg });
          setMessages([]);
          return;
        }
        const json = await res.json();
        // API returns newest-first — reverse so oldest is at top, newest at bottom
        const history: ChatMessage[] = (json?.data?.data ?? []).reverse();
        setMessages(history);
      } catch (err: any) {
        Toast.show({ type: "error", text1: err?.message ?? "Failed to load chat history" });
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    fetchHistory(section);
  }, [section, fetchHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text || !isConnected || !isAuthenticated) return;

    socketRef.current?.emit("send:event-chat", {
      eventId,
      section: SECTION_KEY[section],
      body: text,
    });

    // Optimistic bubble — appended at bottom
    const optId = `opt-${Date.now()}`;
    pendingRef.current.set(text, optId);
    const optimistic: ChatMessage = {
      id: optId,
      body: text,
      senderId: user?.id,
      sender: {
        id: user?.id,
        displayName: user?.displayName,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.wrap, { paddingBottom: keyboardHeight }]}>
      {/* Section tabs */}
      <View style={s.tabs}>
        {SECTIONS.map((sec) => {
          const active = section === sec.value;
          return (
            <TouchableOpacity
              key={sec.value}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setSection(sec.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {sec.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Connection banner */}
      {!isConnected && (
        <View style={s.offlineBanner}>
          <ActivityIndicator size="small" color={brand.primary} />
          <Text style={s.offlineText}>Connecting to chat…</Text>
        </View>
      )}

      {/* Message list — ScrollView, not FlatList, so no nesting warning */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={neutral[300]}
            />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptySub}>
            Be the first to start the conversation!
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={s.msgList}
          contentContainerStyle={s.msgContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id ?? i}
              msg={msg}
              isMe={msg.sender?.id === user?.id || msg.senderId === user?.id}
            />
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        {isAuthenticated ? (
          <>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={isConnected ? "Type a message…" : "Connecting…"}
              placeholderTextColor={neutral[400]}
              style={s.input}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={isConnected}
              multiline
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                (!input.trim() || !isConnected) && s.sendBtnDim,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || !isConnected}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <Text style={s.signIn}>Sign in to join the conversation</Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: neutral[100],
    alignItems: "center",
  },
  tabActive: { backgroundColor: brand.primary },
  tabText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: neutral[500],
  },
  tabTextActive: { color: "#fff" },

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: neutral[50],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  offlineText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
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
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 32,
  },

  // Plain ScrollView — no nesting warning
  msgList: { flex: 1 },
  msgContent: { paddingTop: 10, paddingBottom: 8 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5B1A57",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDim: { opacity: 0.35 },
  signIn: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    paddingVertical: 8,
  },
});
