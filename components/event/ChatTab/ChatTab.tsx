import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useGetEventChatQuery } from "@/store/api/messagingApi";
import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import MessageBubble from "./MessageBubble";

type Section = "pre-event" | "during" | "post-event";

const SECTION_KEY: Record<
  Section,
  "PRE_EVENT" | "DURING_EVENT" | "POST_EVENT"
> = {
  "pre-event": "PRE_EVENT",
  during: "DURING_EVENT",
  "post-event": "POST_EVENT",
};

const SECTIONS: { value: Section; label: string }[] = [
  { value: "pre-event", label: "Pre-Event" },
  { value: "during", label: "During" },
  { value: "post-event", label: "Post-Event" },
];

const OPTIMISTIC_TIMEOUT_MS = 8000;

import { ChatMessage, msgText } from "./types";


interface Props {
  eventId: string;
}

export default function ChatTab({ eventId }: Props) {
  const { user, isAuthenticated } = useAuth();

  const [section, setSection] = useState<Section>("pre-event");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef<Map<string, string>>(new Map());

  const {
    data: historyData,
    isFetching: loading,
    isError: historyError,
    error: historyErrorObj,
  } = useGetEventChatQuery(
    { eventId, section: SECTION_KEY[section] },
    { skip: !eventId }
  );

  useEffect(() => {
    if (historyData?.data?.data) {
      setMessages([...historyData.data.data].reverse());
      pendingRef.current.clear();
    }
  }, [historyData]);

  useEffect(() => {
    if (historyError) {
      const err = historyErrorObj as any;
      const msg =
        err?.data?.error?.message ??
        err?.data?.message ??
        "Failed to load chat history";
      Toast.show({ type: "error", text1: msg });
      setMessages([]);
    }
  }, [historyError, historyErrorObj]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          50
        );
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { socketRef, isConnected } = useSocket("messaging", {
    enabled: !!eventId,
  });

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;
    socket.emit("join:event-chat", {
      eventId,
      section: SECTION_KEY[section],
    });
  }, [eventId, section, isConnected, socketRef]);

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

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !isConnected || !isAuthenticated) return;

    socketRef.current?.emit("send:event-chat", {
      eventId,
      section: SECTION_KEY[section],
      body: text,
    });

    const optId = `opt-${Date.now()}`;
    pendingRef.current.set(text, optId);
    const optimistic: ChatMessage = {
      id: optId,
      body: text,
      senderId: user?.id,
      sender: {
        id: user?.id,
        displayName: user?.displayName ?? undefined,
        username: user?.username ?? undefined,
        avatarUrl: user?.avatarUrl ?? null,
      },
      createdAt: new Date().toISOString(),
      status: "sending", // NEW
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optId && m.status === "sending"
            ? { ...m, status: "failed" }
            : m
        )
      );
    }, OPTIMISTIC_TIMEOUT_MS);
  };

  // NEW — retry a failed optimistic message
  const handleRetry = useCallback(
    (msg: ChatMessage) => {
      const text = msgText(msg);
      if (!text || !isConnected) return;

      // Drop the failed bubble and its stale pending mapping
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      pendingRef.current.delete(text);

      socketRef.current?.emit("send:event-chat", {
        eventId,
        section: SECTION_KEY[section],
        body: text,
      });

      const optId = `opt-${Date.now()}`;
      pendingRef.current.set(text, optId);
      const optimistic: ChatMessage = {
        ...msg,
        id: optId,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optId && m.status === "sending"
              ? { ...m, status: "failed" }
              : m
          )
        );
      }, OPTIMISTIC_TIMEOUT_MS);
    },
    [eventId, section, isConnected, socketRef]
  );

  return (
    <View style={[s.wrap, { paddingBottom: keyboardHeight }]}>
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
              onRetry={handleRetry}
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

//Styles

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
