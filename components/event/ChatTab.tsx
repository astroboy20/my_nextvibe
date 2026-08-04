import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatMsg {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  isOrganizer?: boolean;
}

const ME = 'me';
type Section = 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT';
const SECTION_LABELS: Record<Section, string> = {
  PRE_EVENT:    'Pre-Event',
  DURING_EVENT: 'During',
  POST_EVENT:   'Post-Event',
};

const MOCK_MESSAGES: ChatMsg[] = [
  { id: '1', senderId: 'org1', senderName: 'Organizer', body: 'Welcome everyone! Excited to see you all here 🎉', createdAt: new Date(Date.now() - 3600000).toISOString(), isOrganizer: true },
  { id: '2', senderId: 'u1',   senderName: 'alex_vibe', body: "Can't wait for the match!!",                      createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '3', senderId: ME,     senderName: 'Me',        body: 'Same, this is going to be epic!',                  createdAt: new Date(Date.now() - 900000).toISOString() },
];

function formatTime(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  return `${hours}h`;
}

interface Props { eventId: string }

// ─── Full-screen chat modal ───────────────────────────────────────────────────

function ChatModal({
  visible,
  onClose,
  messages,
  input,
  setInput,
  onSend,
  section,
  setSection,
}: {
  visible: boolean;
  onClose: () => void;
  messages: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  section: Section;
  setSection: (s: Section) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={m.safe}>
        {/* Header */}
        <View style={m.header}>
          <Text style={m.headerTitle}>Event Chat</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={neutral[700]} />
          </TouchableOpacity>
        </View>

        {/* Section tabs */}
        <View style={m.sectionRow}>
          {(Object.keys(SECTION_LABELS) as Section[]).map((sec) => (
            <TouchableOpacity
              key={sec}
              style={[m.secBtn, section === sec && m.secBtnActive]}
              onPress={() => setSection(sec)}
              activeOpacity={0.8}
            >
              <Text style={[m.secLabel, section === sec && m.secLabelActive]}>
                {SECTION_LABELS[sec]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={m.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((item) => {
              const isMine = item.senderId === ME;
              return (
                <View key={item.id} style={[m.msgRow, isMine && m.msgRowRight]}>
                  {!isMine && (
                    <View style={m.avatar}>
                      <Text style={m.avatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[m.bubble, isMine ? m.bubbleMine : m.bubbleTheirs]}>
                    {!isMine && (
                      <View style={m.senderRow}>
                        <Text style={[m.senderName, item.isOrganizer && { color: brand.primary }]}>
                          {item.senderName}
                        </Text>
                        {item.isOrganizer && (
                          <View style={m.orgBadge}>
                            <Text style={m.orgBadgeText}>Organizer</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={isMine ? m.textMine : m.textTheirs}>{item.body}</Text>
                    <Text style={[m.time, isMine && m.timeRight]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Input bar */}
          <View style={m.inputBar}>
            <TextInput
              style={m.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={neutral[400]}
              returnKeyType="send"
              blurOnSubmit={false}
              autoFocus
              onSubmitEditing={onSend}
            />
            <TouchableOpacity
              style={[m.sendBtn, !input.trim() && m.sendBtnDisabled]}
              onPress={onSend}
              disabled={!input.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── ChatTab (preview + tap-to-expand) ───────────────────────────────────────

export default function ChatTab({ eventId }: Props) {
  const [section,   setSection]   = useState<Section>('PRE_EVENT');
  const [messages,  setMessages]  = useState<ChatMsg[]>(MOCK_MESSAGES);
  const [input,     setInput]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const handleSend = () => {
    const body = input.trim();
    if (!body) return;
    setMessages((prev) => [...prev, {
      id: `opt-${Date.now()}`, senderId: ME, senderName: 'Me',
      body, createdAt: new Date().toISOString(),
    }]);
    setInput('');
  };

  const lastMessages = messages.slice(-3);

  return (
    <View style={s.wrap}>
      {/* Section tabs */}
      <View style={s.sectionRow}>
        {(Object.keys(SECTION_LABELS) as Section[]).map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[s.secBtn, section === sec && s.secBtnActive]}
            onPress={() => setSection(sec)}
            activeOpacity={0.8}
          >
            <Text style={[s.secLabel, section === sec && s.secLabelActive]}>
              {SECTION_LABELS[sec]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message preview */}
      <View style={s.preview}>
        {lastMessages.map((item) => {
          const isMine = item.senderId === ME;
          return (
            <View key={item.id} style={[s.msgRow, isMine && s.msgRowRight]}>
              {!isMine && (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                {!isMine && (
                  <View style={s.senderRow}>
                    <Text style={[s.senderName, item.isOrganizer && { color: brand.primary }]}>
                      {item.senderName}
                    </Text>
                    {item.isOrganizer && (
                      <View style={s.orgBadge}>
                        <Text style={s.orgBadgeText}>Organizer</Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={isMine ? s.textMine : s.textTheirs}>{item.body}</Text>
                <Text style={[s.time, isMine && s.timeRight]}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Tap-to-expand input */}
      <TouchableOpacity
        style={s.inputTrigger}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={s.inputTriggerText}>Type a message…</Text>
        <View style={s.sendBtnPreview}>
          <Ionicons name="send" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Full-screen chat modal */}
      <ChatModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        section={section}
        setSection={setSection}
      />
    </View>
  );
}

// ─── Preview styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { paddingBottom: 24 },

  sectionRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  secBtn:         { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: neutral[100], alignItems: 'center' },
  secBtnActive:   { backgroundColor: brand.primaryDark },
  secLabel:       { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
  secLabelActive: { color: '#fff' },

  preview: { paddingHorizontal: 14, gap: 8, marginBottom: 12 },

  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowRight: { flexDirection: 'row-reverse' },
  avatar:      { width: 30, height: 30, borderRadius: 15, backgroundColor: brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: fontFamily.bold, fontSize: 11, color: '#fff' },

  bubble:       { maxWidth: '75%', padding: 10, borderRadius: 14 },
  bubbleMine:   { backgroundColor: brand.primary },
  bubbleTheirs: { backgroundColor: neutral[100] },

  senderRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  senderName:   { fontFamily: fontFamily.bold, fontSize: 11, color: neutral[600] },
  orgBadge:     { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: `${brand.primary}20` },
  orgBadgeText: { fontFamily: fontFamily.semibold, fontSize: 9, color: brand.primary },

  textMine:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: '#fff',       lineHeight: 20 },
  textTheirs: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], lineHeight: 20 },
  time:       { fontFamily: fontFamily.regular, fontSize: 9, color: 'rgba(0,0,0,0.35)', marginTop: 3 },
  timeRight:  { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },

  inputTrigger: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, gap: 8,
    borderRadius: 24, borderWidth: 1.5,
    borderColor: neutral[200], backgroundColor: neutral[50],
    paddingHorizontal: 14, paddingVertical: 10,
  },
  inputTriggerText: {
    flex: 1, fontFamily: fontFamily.regular,
    fontSize: fontSize.sm, color: neutral[400],
  },
  sendBtnPreview: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: neutral[300],
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: neutral[800] },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: neutral[100], alignItems: 'center', justifyContent: 'center' },

  sectionRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  secBtn:         { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: neutral[100], alignItems: 'center' },
  secBtnActive:   { backgroundColor: brand.primaryDark },
  secLabel:       { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
  secLabelActive: { color: '#fff' },

  list:        { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },

  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowRight: { flexDirection: 'row-reverse' },
  avatar:      { width: 30, height: 30, borderRadius: 15, backgroundColor: brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: fontFamily.bold, fontSize: 11, color: '#fff' },

  bubble:       { maxWidth: '75%', padding: 10, borderRadius: 14 },
  bubbleMine:   { backgroundColor: brand.primary },
  bubbleTheirs: { backgroundColor: neutral[100] },

  senderRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  senderName:   { fontFamily: fontFamily.bold, fontSize: 11, color: neutral[600] },
  orgBadge:     { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: `${brand.primary}20` },
  orgBadgeText: { fontFamily: fontFamily.semibold, fontSize: 9, color: brand.primary },

  textMine:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: '#fff',       lineHeight: 20 },
  textTheirs: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800], lineHeight: 20 },
  time:       { fontFamily: fontFamily.regular, fontSize: 9, color: 'rgba(0,0,0,0.35)', marginTop: 3 },
  timeRight:  { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
    gap: 8, backgroundColor: '#fff',
  },
  input: {
    flex: 1, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: neutral[200],
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular, fontSize: fontSize.sm,
    color: neutral[800], backgroundColor: neutral[50],
  },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: neutral[300] },
});
