import AboutTab from '@/components/event/AboutTab';
import ChatTab from '@/components/event/ChatTab';
import PostcardsTab from '@/components/event/PostcardsTab';
import QrTab from '@/components/event/QrTab';
import RsvpTab from '@/components/event/RsvpTab';
import type { EventDetail } from '@/components/event/types';
import { AppHeader } from '@/components/navigation/TopNavBar';
import {
    EventDetailContentSkeleton,
    EventDetailHeroSkeleton,
    EventDetailTabSkeleton,
} from '@/components/ui/Skeleton';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetEventByIdQuery } from '@/store/api/eventsApi';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
const HERO_H = width * 0.65;

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'about' | 'rsvp' | 'postcards' | 'chat' | 'qr';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  show: (e: EventDetail) => boolean;
}

const TABS: TabDef[] = [
  { id: 'about',     label: 'About',     icon: 'information-circle-outline', show: () => true },
  { id: 'rsvp',      label: 'RSVP',      icon: 'checkmark-circle-outline',   show: () => true },
  { id: 'postcards', label: 'Postcards', icon: 'images-outline',             show: (e) => !!e.hasVibeTag },
  { id: 'chat',      label: 'Chat',      icon: 'chatbubbles-outline',        show: () => true },
  { id: 'qr',        label: 'QR Code',   icon: 'qr-code-outline',            show: () => true },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: eventRes,
    isLoading,
    isError,
    refetch,
  } = useGetEventByIdQuery(id ?? '', { skip: !id });

  const event = eventRes?.data;

  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [liked,     setLiked]     = useState(false);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.name,
        message: `Check out this event on NextVibe: ${event.name}`,
      });
    } catch {}
  };

  // ── Skeleton / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <AppHeader onBack={() => router.back()} notificationCount={0} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <EventDetailHeroSkeleton />
          <EventDetailTabSkeleton />
          <EventDetailContentSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError || !event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <AppHeader onBack={() => router.back()} notificationCount={0} />
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={semantic.error} />
          <Text style={styles.errorTitle}>Couldn't load event</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const visibleTabs = TABS.filter((t) => t.show(event));

  // ── Hero ──────────────────────────────────────────────────────────────────
  const HeroBlock = (
    <View style={[styles.hero, { height: HERO_H }]}>
      {event.flierUrl ? (
        <Image source={{ uri: event.flierUrl }} style={styles.heroImg} resizeMode="cover" />
      ) : (
        <View style={styles.heroFallback}>
          <Ionicons name="calendar" size={56} color={`${brand.primary}40`} />
        </View>
      )}
      <View style={styles.heroOverlay} />

      {/* Top action row */}
      <View style={styles.heroTopRow}>
        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => setLiked((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#FF6584' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom info */}
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
          <View style={[
            styles.modePill,
            { backgroundColor: event.mode === 'VIRTUAL' ? '#3B82F6CC' : '#22C55ECC' },
          ]}>
            <Text style={styles.modeText}>
              {event.mode === 'VIRTUAL' ? '🌐 Virtual' :
               event.mode === 'HYBRID'  ? '🔀 Hybrid'  : '📍 Onsite'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const TabBar = (
    <View style={styles.tabBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarInner}
      >
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? brand.primary : neutral[400]}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader onBack={() => router.back()} notificationCount={0} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {HeroBlock}
        {TabBar}
        <View style={styles.tabContent}>
          {activeTab === 'about'     && <AboutTab     event={event} />}
          {activeTab === 'rsvp'      && <RsvpTab      event={event} />}
          {activeTab === 'postcards' && <PostcardsTab eventId={event.id} />}
          {activeTab === 'chat'      && <ChatTab      eventId={event.id} />}
          {activeTab === 'qr'        && <QrTab        event={event} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },

  // Error state
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  errorTitle: { fontFamily: fontFamily.bold,    fontSize: fontSize.lg, color: neutral[800] },
  errorSub:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 24, backgroundColor: brand.primary,
  },
  retryText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },

  // Hero
  hero:         { width: '100%', backgroundColor: neutral[200] },
  heroImg:      { width: '100%', height: '100%' },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: neutral[100] },
  heroOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },

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
  tagsRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tagPill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  tagText:      { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },
  heroTitle:    { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl, color: '#fff', lineHeight: 28 },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  heroDot:      { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  modePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  modeText:     { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },

  // Tab bar
  tabBar:      { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  tabBarInner: { flexDirection: 'row', paddingHorizontal: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12, position: 'relative',
  },
  tabLabel:       { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[400] },
  tabLabelActive: { color: brand.primary },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: brand.primary, borderRadius: 2,
  },

  tabContent: { flex: 1 },
});
