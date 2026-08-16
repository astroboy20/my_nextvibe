/**
 * ChatTab — React Native
 *
 * Real-time event chat using socket.io-client.
 * Mirrors the web implementation:
 *   - Three sections: Pre-Event / During / Post-Event
 *   - Optimistic message bubbles replaced by server echo
 *   - Loads history from REST on section change
 *   - Organizer badge, timestamps, my/other bubble styles
 */
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/store/baseQuery';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
} from 'react-native';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'pre-event' | 'during' | 'post-event';

const SECTION_KEY: Record<Section, string> = {
  'pre-event': 'PRE_EVENT',
  during: 'DURING_EVENT',
  'post-event': 'POST_EVENT',
};

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'pre-event', label: 'Pre-Event' },
  { value: 'during', label: 'During' },
  { value: 'post-event', label: 'Post-Event' },
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
  return m.body ?? m.content ?? m.text ?? '';
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
}: {
  msg: ChatMessage;
  isMe: boolean;
}) {
  const router = useRouter();
  const name =
    msg.sender?.displayName?.trim() ||
    msg.sender?.username?.trim() ||
    'User';
  const isOrganizer = msg.sender?.role === 'ORGANIZER' || msg.isOrganizer;
  const ts = timeAgo(msg.createdAt);
  const avatarUrl = msg.sender?.avatarUrl;
  const text = msgText(msg);
  const senderId = msg.sender?.id;

  if (!text) return null;

  return (
    <View style={[b.row, isMe && b.rowReverse]}>
      {/* Avatar — only for others */}
      {!isMe && (
        <TouchableOpacity
          onPress={() => senderId && router.push(`/users/${senderId}` as any)}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={b.avatar} contentFit="cover" />
          ) : (
            <View style={b.avatarFb}>
              <Text style={b.avatarLetter}>{name[0]?.toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={[b.col, isMe && b.colRight]}>
        {!isMe && (
          <View style={b.metaRow}>
            <TouchableOpacity
              onPress={() => senderId && router.push(`/users/${senderId}` as any)}
              activeOpacity={0.8}
            >
              <Text style={b.senderName}>{name}</Text>
            </TouchableOpacity>
            {isOrganizer && (
              <View style={b.organizerBadge}>
                <Text style={b.organizerText}>Organizer</Text>
              </View>
            )}
            {ts ? <Text style={b.ts}>{ts}</Text> : null}
          </View>
        )}

        <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleOther]}>
          <Text style={[b.bubbleText, isMe && b.bubbleTextMe]}>
            {text}
          </Text>
        </View>

        {isMe && ts ? (
          <Text style={[b.ts, { alignSelf: 'flex-end', marginTop: 3 }]}>{ts}</Text>
        ) : null}
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  rowReverse: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginTop: 2 },
  avatarFb: {
    width: 32, height: 32, borderRadius: 16, marginTop: 2,
    backgroundColor: `${brand.primary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fontFamily.bold, fontSize: 13, color: brand.primary },
  col: { flex: 1, maxWidth: '78%', alignItems: 'flex-start' },
  colRight: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  senderName: { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[700] },
  organizerBadge: {
    backgroundColor: `${brand.primary}15`,
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1.5,
  },
  organizerText: { fontFamily: fontFamily.semibold, fontSize: 10, color: brand.primary },
  ts: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[300] },
  bubble: {
    borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleOther: {
    backgroundColor: neutral[100],
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: '#5B1A57',
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fontFamily.regular, fontSize: fontSize.sm,
    color: neutral[800], lineHeight: 20,
  },
  bubbleTextMe: { color: '#fff' },
});

// ─── ChatTab ──────────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
}

export default function ChatTab({ eventId }: Props) {
  const { user, isAuthenticated } = useAuth();

  const [section, setSection] = useState<Section>('pre-event');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pendingRef = useRef<Map<string, string>>(new Map());
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // ── Socket setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!eventId) return;

    let socket: Socket;

    const init = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      const socketUrl = API_URL.replace(/\/$/, '');

      socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        auth: token ? { token: `Bearer ${token}` } : undefined,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join:event-chat', {
          eventId,
          section: SECTION_KEY[section],
        });
      });

      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      socket.on('new:event-chat', (msg: ChatMessage) => {
        setMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
          const isMe =
            msg.sender?.id === user?.id || msg.senderId === user?.id;
          if (isMe) {
            const text = msgText(msg);
            const optId = pendingRef.current.get(text);
            if (optId) {
              pendingRef.current.delete(text);
              return prev.map((m) => (m.id === optId ? msg : m));
            }
          }
          return [msg, ...prev];
        });
      });
    };

    init();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Re-join when section changes
  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('join:event-chat', {
        eventId,
        section: SECTION_KEY[section],
      });
    }
  }, [section, eventId]);

  // ── History ───────────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async (sec: Section) => {
    if (!eventId) return;
    setLoading(true);
    setMessages([]);
    pendingRef.current.clear();
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/chat/${SECTION_KEY[sec]}`,
        { headers },
      );
      if (!res.ok) { setMessages([]); return; }
      const json = await res.json();
      const history: ChatMessage[] = json?.data?.data ?? [];
      setMessages(history); // newest first
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchHistory(section);
  }, [section, fetchHistory]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = () => {
    const text = input.trim();
    if (!text || !connected || !isAuthenticated) return;

    socketRef.current?.emit('send:event-chat', {
      eventId,
      section: SECTION_KEY[section],
      body: text,
    });

    // Optimistic bubble
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
    setMessages((prev) => [optimistic, ...prev]);
    setInput('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
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

      {/* Connection indicator */}
      {!connected && (
        <View style={s.offlineBanner}>
          <ActivityIndicator size="small" color={brand.primary} />
          <Text style={s.offlineText}>Connecting to chat…</Text>
        </View>
      )}

      {/* Message list — inverted so newest is at bottom visually */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={36} color={neutral[300]} />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptySub}>Be the first to start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m, i) => m.id ?? String(i)}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              isMe={item.sender?.id === user?.id || item.senderId === user?.id}
            />
          )}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          windowSize={10}
        />
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        {isAuthenticated ? (
          <>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={connected ? 'Type a message…' : 'Connecting…'}
              placeholderTextColor={neutral[400]}
              style={s.input}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={connected}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || !connected) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || !connected}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <Text style={s.signInPrompt}>
            Sign in to join the conversation
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },

  // Section tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  tab: {
    flex: 1, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: neutral[100],
    alignItems: 'center',
  },
  tabActive: { backgroundColor: brand.primary },
  tabText: { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
  tabTextActive: { color: '#fff' },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: neutral[50],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  offlineText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },

  // Empty / loading
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: neutral[50],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[700] },
  emptySub: {
    fontFamily: fontFamily.regular, fontSize: fontSize.sm,
    color: neutral[400], textAlign: 'center', marginTop: 4, paddingHorizontal: 32,
  },

  // Message list
  listContent: {
    paddingTop: 10,
    paddingBottom: 6,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    backgroundColor: '#fff',
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
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#5B1A57',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  signInPrompt: {
    flex: 1, textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
    paddingVertical: 8,
  },
});
