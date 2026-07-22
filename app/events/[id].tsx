import AboutTab from '@/components/event/AboutTab';
import ChatTab from '@/components/event/ChatTab';
import PostcardsTab from '@/components/event/PostcardsTab';
import RsvpTab from '@/components/event/RsvpTab';
import type { EventDetail } from '@/components/event/types';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const HERO_H    = width * 0.65;

// ─── Mock event (replace with useGetEventDetailsQuery(id)) ────────────────────

const MOCK_EVENT: EventDetail = {
  id:           '1',
  name:         'Argentina vs. Spain',
  description:  'Join us for the most electric match of the year! Watch Argentina take on Spain in an unforgettable showdown. Postcards, games, and live chat included.',
  flierUrl:     null,
  promoVideoUrl:null,
  startsAt:     '2026-07-19T20:00:00Z',
  status:       'PUBLISHED',
  mode:         'VIRTUAL',
  locationName: null,
  virtualLink:  'https://meet.google.com/abc-defg-hij',
  isPublic:     true,
  hasGame:      true,
  hasVibeTag:   true,
  attendeeCount: 247,
  isRsvped:     false,
  rsvpStatus:   null,
  organizer: {
    id: 'org1',
    username:    'nextvibe_events',
    displayName: 'NextVibe Events',
    avatarUrl:   null,
    isFollowing: false,
  },
  tags: ['Virtual', 'Games', 'VibeTag'],
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

type TabId = 'about' | 'rsvp' | 'postcards' | 'chat';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  show: (e: EventDetail) => boolean;
}

const TABS: TabDef[] = [
  { id: 'about',    label: 'About',     icon: 'information-circle-outline', show: () => true },
  { id: 'rsvp',     label: 'RSVP',      icon: 'checkmark-circle-outline',   show: () => true },
  { id: 'postcards',label: 'Postcards', icon: 'images-outline',             show: (e) => !!e.hasVibeTag },
  { id: 'chat',     label: 'Chat',      icon: 'chatbubbles-outline',        show: () => true },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: replace with real API call
  // const { data, isLoading } = useGetEventDetailsQuery(id);
  // const event: EventDetail | null = data?.data ?? null;
  const isLoading = false;
  const event     = MOCK_EVENT;

  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [liked,     setLiked]     = useState(false);

  const visibleTabs = TABS.filter((t) => t.show(event));

  const handleShare = async () => {
    try {
      await Share.share({
        title:   event.name,
        message: `Check out this event on NextVibe: ${event.name}`,
        // url: `https://nextvibe.com/events/${event.id}`,
      });
    } catch {}
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Tab bar sticks
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          {event.flierUrl ? (
            <Image source={{ uri: event.flierUrl }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="calendar" size={56} color={`${brand.primary}40`} />
            </View>
          )}

          {/* Dark overlay */}
          <View style={styles.heroOverlay} />

          {/* Back + actions */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.heroBtn} onPress={() => setLiked((v) => !v)} activeOpacity={0.8}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#FF6584' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Event name + tags at bottom of hero */}
          <View style={styles.heroBottom}>
            {event.tags && event.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {event.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.heroTitle} numberOfLines={2}>{event.name}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{event.attendeeCount ?? 0} attending</Text>
              <View style={styles.heroDot} />
              <View style={[styles.modePill, { backgroundColor: event.mode === 'VIRTUAL' ? '#3B82F6CC' : '#22C55ECC' }]}>
                <Text style={styles.modeText}>
                  {event.mode === 'VIRTUAL' ? '🌐 Virtual' : event.mode === 'HYBRID' ? '🔀 Hybrid' : '📍 Onsite'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Sticky tab bar ── */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={tab.icon} size={14} color={active ? brand.primary : neutral[400]} />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                  {active && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'about'     && <AboutTab     event={event} />}
          {activeTab === 'rsvp'      && <RsvpTab      event={event} />}
          {activeTab === 'postcards' && <PostcardsTab eventId={event.id} />}
          {activeTab === 'chat'      && <ChatTab      eventId={event.id} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  scroll:      { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero:        { width: '100%', height: HERO_H, backgroundColor: neutral[200] },
  heroImg:     { width: '100%', height: '100%' },
  heroFallback:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: neutral[100] },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },

  heroTopRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  heroBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingBottom: 16, gap: 6,
  },
  tagsRow:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tagPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  tagText:    { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },
  heroTitle:  { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl, color: '#fff', lineHeight: 28 },
  heroMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  heroDot:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  modePill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  modeText:   { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },

  // Tab bar
  tabBar:      { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  tabBarInner: { paddingHorizontal: 12, paddingVertical: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 10, position: 'relative',
  },
  tabActive:    {},
  tabLabel:     { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[400] },
  tabLabelActive: { color: brand.primary },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: brand.primary, borderRadius: 2,
  },

  tabContent: { flex: 1 },
});
