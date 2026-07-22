import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const ME = 'me';

// ─── Mock messages ────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  { id: '1', senderId: 'u1', body: 'Hey! Are you going to the match tonight?', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', senderId: ME,   body: "Yes! Can't wait 🔥",                         createdAt: new Date(Date.now() - 3500000).toISOString() },
  { id: '3', senderId: 'u1', body: 'Argentina is going to destroy them',         createdAt: new Date(Date.now() - 3400000).toISOString() },
  { id: '4', senderId: ME,   body: "Let's gooo! See you there",                  createdAt: new Date(Date.now() - 3300000).toISOString() },
  { id: '5', senderId: 'u1', body: 'See you at the match! 🔥',                   createdAt: new Date(Date.now() -  300000).toISOString() },
];

// ─── Bubble ───────────────────────────────────────────────────────────────────

const RADIUS = 18;
const CORNER = 5;

function Bubble({
  msg, isMine, isFirst, isLast, participantName,
}: {
  msg: Message; isMine: boolean; isFirst: boolean; isLast: boolean; participantName: string;
}) {
  return (
    <View style={[bub.row, isMine ? bub.rowRight : bub.rowLeft, isLast && bub.groupEnd]}>
      {!isMine && (
        <View style={bub.avatarSlot}>
          {isLast && (
            <View style={bub.avatar}>
              <Text style={bub.avatarText}>{participantName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}
      <View style={[bub.col, isMine && bub.colRight]}>
        <View style={[
          bub.bubble,
          isMine ? bub.bubbleMine : bub.bubbleTheirs,
          isMine  && !isFirst && bub.mineNotFirst,
          isMine  && !isLast  && bub.mineNotLast,
          !isMine && !isFirst && bub.theirNotFirst,
          !isMine && !isLast  && bub.theirNotLast,
        ]}>
          <Text style={isMine ? bub.textMine : bub.textTheirs}>{msg.body}</Text>
        </View>
        {isLast && (
          <Text style={[bub.time, isMine && bub.timeRight]}>{formatTime(msg.createdAt)}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router  = useRouter();
  const { username } = useLocalSearchParams<{ id: string; username: string }>();

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const handleSend = () => {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    setMessages((prev) => [...prev, {
      id:        `opt-${Date.now()}`,
      senderId:  ME,
      body,
      createdAt: new Date().toISOString(),
    }]);
    setInput('');
    // TODO: socket.emit('send:dm', { conversationId: id, body })
    setTimeout(() => setSending(false), 300);
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMine  = item.senderId === ME;
    const prev    = messages[index - 1];
    const next    = messages[index + 1];
    return (
      <Bubble
        msg={item}
        isMine={isMine}
        isFirst={!prev || prev.senderId !== item.senderId}
        isLast={!next  || next.senderId !== item.senderId}
        participantName={username ?? '?'}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={neutral[800]} />
        </TouchableOpacity>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{(username ?? '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{username ?? 'Chat'}</Text>
          <Text style={styles.statusText}>online</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={neutral[600]} />
        </TouchableOpacity>
      </View>

      {/* ── Keyboard-aware body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Messages list */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {/* ── Input bar ──
            paddingBottom = safe-area bottom (home indicator) + 12 breathing room
        */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={neutral[400]}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
    gap: 10,
  },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: neutral[100] },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ fontFamily: fontFamily.bold, fontSize: fontSize.base, color: '#fff' },
  headerName:   { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: neutral[900] },
  statusText:   { fontFamily: fontFamily.regular, fontSize: 11, color: '#22C55E', marginTop: 1 },
  headerBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8, gap: 2 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,    // covers home indicator on most devices
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    gap: 8,
    backgroundColor: '#fff',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: neutral[300] },
});

const bub = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 1, paddingHorizontal: 4 },
  rowLeft:  { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  groupEnd: { marginBottom: 6 },

  avatarSlot: { width: 30, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
  avatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.bold, fontSize: 11, color: '#fff' },

  col:      { maxWidth: '75%', gap: 2 },
  colRight: { alignItems: 'flex-end' },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS,
  },
  bubbleMine:   { backgroundColor: brand.primary,  borderBottomRightRadius: RADIUS },
  bubbleTheirs: { backgroundColor: neutral[100],    borderBottomLeftRadius:  RADIUS },

  mineNotFirst:  { borderTopRightRadius:    CORNER },
  mineNotLast:   { borderBottomRightRadius: CORNER },
  theirNotFirst: { borderTopLeftRadius:     CORNER },
  theirNotLast:  { borderBottomLeftRadius:  CORNER },

  textMine:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: '#fff',       lineHeight: 20 },
  textTheirs: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], lineHeight: 20 },

  time:      { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[400], marginTop: 2, paddingHorizontal: 4 },
  timeRight: { textAlign: 'right' },
});
