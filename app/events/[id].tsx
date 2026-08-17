import AboutTab from "@/components/event/AboutTab";
import ChatTab from "@/components/event/ChatTab";
import GameTab from "@/components/event/GameTab/GameTab";
import PostcardsTab from "@/components/event/PostcardsTab";
import QrTab from "@/components/event/QrTab";
import RsvpTab from "@/components/event/RsvpTab";
import type { EventDetail } from "@/components/event/types";
import { AppHeader } from "@/components/navigation/TopNavBar";
import {
  EventDetailContentSkeleton,
  EventDetailHeroSkeleton,
  EventDetailTabSkeleton,
} from "@/components/ui/Skeleton";
import { brand, neutral, semantic } from "@/constants/Colors";
import { getTagStyle, tagColor } from "@/constants/TagColors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useGetEventByIdQuery, useGetEventVibeTagsQuery } from "@/store/api/eventsApi";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const HERO_H = width * (4 / 3);

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = "about" | "rsvp" | "qr" | "games" | "postcards" | "chat";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  show: (e: EventDetail) => boolean;
}

const TABS: TabDef[] = [
  { id: "about",     label: "About",     icon: "information-circle-outline", show: () => true },
  { id: "rsvp",      label: "RSVP",      icon: "checkmark-circle-outline",   show: () => true },
  { id: "qr",        label: "QR Code",   icon: "qr-code-outline",            show: () => true },
  { id: "games",     label: "Games",     icon: "game-controller-outline",     show: () => true },
  { id: "postcards", label: "Postcards", icon: "images-outline",              show: (e) => !!e.hasVibeTag },
  { id: "chat",      label: "Chat",      icon: "chatbubbles-outline",         show: () => true },
];

// Which tabs manage their own internal scroll — they get full height, no outer scroll
const SELF_SCROLL_TABS: TabId[] = ["chat", "postcards", "games"];

// ─── HeroMedia ────────────────────────────────────────────────────────────────

function HeroMedia({
  flierUrl,
  promoVideoUrl,
}: {
  flierUrl?: string | null;
  promoVideoUrl?: string | null;
}) {
  const hasFlier = !!flierUrl;
  const hasVideo = !!promoVideoUrl;
  const shouldAlternate = hasFlier && hasVideo;

  const flierOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const videoRef     = useRef<Video>(null);
  const showingVideoRef = useRef(false);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const doSwitchRef = useRef<() => void>(null as any);
  doSwitchRef.current = () => {
    const toVideo = !showingVideoRef.current;
    showingVideoRef.current = toVideo;
    const inAnim  = toVideo ? videoOpacity : flierOpacity;
    const outAnim = toVideo ? flierOpacity : videoOpacity;
    Animated.parallel([
      Animated.timing(outAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.timing(inAnim,  { toValue: 1, duration: 800, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (toVideo) videoRef.current?.playAsync().catch(() => {});
      else         videoRef.current?.pauseAsync().catch(() => {});
      timerRef.current = setTimeout(() => doSwitchRef.current?.(), 5000);
    });
  };

  useEffect(() => {
    if (!shouldAlternate) return;
    flierOpacity.setValue(1);
    videoOpacity.setValue(0);
    showingVideoRef.current = false;
    timerRef.current = setTimeout(() => doSwitchRef.current?.(), 5000);
    return () => {
      clearTimer();
      flierOpacity.stopAnimation();
      videoOpacity.stopAnimation();
      videoRef.current?.pauseAsync().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAlternate]);

  if (!hasFlier && !hasVideo) {
    return (
      <View style={styles.heroFallback}>
        <Ionicons name="calendar" size={56} color={`${brand.primary}40`} />
      </View>
    );
  }
  if (hasFlier && !hasVideo) {
    return <Image source={{ uri: flierUrl! }} style={styles.heroImg} resizeMode="cover" />;
  }
  if (!hasFlier && hasVideo) {
    return (
      <Video source={{ uri: promoVideoUrl! }} style={styles.heroImg}
        resizeMode={ResizeMode.COVER} isLooping isMuted shouldPlay />
    );
  }
  return (
    <View style={styles.heroMediaContainer}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: flierOpacity }]}>
        <Image source={{ uri: flierUrl! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <Video ref={videoRef} source={{ uri: promoVideoUrl! }}
          style={StyleSheet.absoluteFillObject} resizeMode={ResizeMode.COVER}
          isLooping isMuted shouldPlay={false} />
      </Animated.View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: eventRes, isLoading, isError, refetch } =
    useGetEventByIdQuery(id ?? "", { skip: !id });

  const event = eventRes?.data;

  const { data: vibeTagsRes } = useGetEventVibeTagsQuery(id ?? "", {
    skip: !id || !event?.hasVibeTag,
  });
  const vibeTagData = event?.vibeTag?.length ? event.vibeTag : (vibeTagsRes?.data ?? null);

  // ── All state and refs declared unconditionally ───────────────────────────
  const [activeTab,     setActiveTab]     = useState<TabId>("about");
  const [liked,         setLiked]         = useState(false);
  const [isPlayingGame, setIsPlayingGame] = useState(false);

  const handleShare = async () => {
    if (!event) return;
    try { await Share.share({ title: event.name, message: `Check out this event on NextVibe: ${event.name}` }); }
    catch {}
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
  const isSelfScroll = SELF_SCROLL_TABS.includes(activeTab);

  // ── Hero block ────────────────────────────────────────────────────────────
  const HeroBlock = (
    <View style={styles.hero}>
      <HeroMedia flierUrl={event.flierUrl} promoVideoUrl={event.promoVideoUrl} />
      <View style={styles.heroOverlay} />
      <View style={styles.heroTopRow}>
        <View style={{ flexDirection: "row", gap: 8, marginLeft: "auto" }}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => setLiked((v) => !v)} activeOpacity={0.8}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#FF6584" : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heroBottom}>
        {(() => {
          const pills: { label: string; color: string; textColor: string }[] = [];
          if (event.mode === "VIRTUAL")     pills.push({ label: "🌐 Virtual", color: tagColor("Virtual"), textColor: getTagStyle("Virtual").text });
          else if (event.mode === "HYBRID") pills.push({ label: "🔀 Hybrid",  color: tagColor("Hybrid"),  textColor: getTagStyle("Hybrid").text  });
          else                              pills.push({ label: "📍 Onsite",  color: tagColor("Onsite"),  textColor: getTagStyle("Onsite").text  });
          if (event.hasGame)    pills.push({ label: "🎮 Games",   color: tagColor("Games"),   textColor: getTagStyle("Games").text   });
          if (event.hasVibeTag) pills.push({ label: "✨ VibeTag", color: tagColor("VibeTag"), textColor: getTagStyle("VibeTag").text });
          return (
            <View style={styles.tagsRow}>
              {pills.map((p) => (
                <View key={p.label} style={[styles.tagPill, { backgroundColor: p.color }]}>
                  <Text style={[styles.tagText, { color: p.textColor }]}>{p.label}</Text>
                </View>
              ))}
            </View>
          );
        })()}
        <Text style={styles.heroTitle} numberOfLines={2}>{event.name}</Text>
      </View>
    </View>
  );

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const TabBar = (
    <View style={styles.tabBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => { setActiveTab(tab.id); if (tab.id !== "games") setIsPlayingGame(false); }}
              activeOpacity={0.75}
            >
              <Ionicons name={tab.icon} size={15} color={active ? brand.primary : neutral[400]} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Game playing — full screen, no hero ───────────────────────────────────
  if (activeTab === "games" && isPlayingGame) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <AppHeader onBack={() => router.back()} notificationCount={0} />
        {TabBar}
        <GameTab
          eventId={event.id} eventName={event.name}
          startsAt={event.startsAt} onPlayingChange={setIsPlayingGame}
        />
      </SafeAreaView>
    );
  }

  // ── Self-scroll tabs (chat, postcards, games lobby) ───────────────────────
  // Hero shown compact above tab bar. Tab content fills remaining flex space.
  // No Animated wrapping — no hook issues, no nested list warnings.
  if (isSelfScroll) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <AppHeader onBack={() => router.back()} notificationCount={0} />
        {/* Compact hero strip — shows name + tags, no full-height image */}
        <View style={styles.compactHero}>
          {event.flierUrl ? (
            <Image source={{ uri: event.flierUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : null}
          <View style={styles.compactHeroOverlay} />
          <View style={styles.compactHeroContent}>
            <Text style={styles.compactHeroTitle} numberOfLines={1}>{event.name}</Text>
            <View style={styles.tagsRow}>
              {event.mode === "VIRTUAL" && (
                <View style={[styles.tagPill, { backgroundColor: tagColor("Virtual") }]}>
                  <Text style={[styles.tagText, { color: getTagStyle("Virtual").text }]}>🌐 Virtual</Text>
                </View>
              )}
              {event.hasGame && (
                <View style={[styles.tagPill, { backgroundColor: tagColor("Games") }]}>
                  <Text style={[styles.tagText, { color: getTagStyle("Games").text }]}>🎮 Games</Text>
                </View>
              )}
              {event.hasVibeTag && (
                <View style={[styles.tagPill, { backgroundColor: tagColor("VibeTag") }]}>
                  <Text style={[styles.tagText, { color: getTagStyle("VibeTag").text }]}>✨ VibeTag</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {TabBar}
        {/* Tab content — flex: 1, manages its own scroll */}
        <View style={styles.fullFlex}>
          {activeTab === "chat"      && <ChatTab eventId={event.id} />}
          {activeTab === "postcards" && (
            <PostcardsTab
              eventId={event.id} vibeTag={vibeTagData}
              eventName={event.name} eventStartsAt={event.startsAt}
            />
          )}
          {activeTab === "games" && (
            <GameTab
              eventId={event.id} eventName={event.name}
              startsAt={event.startsAt} onPlayingChange={setIsPlayingGame}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Simple tabs (about, rsvp, qr) — outer ScrollView is fine ─────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => router.back()} notificationCount={0} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {HeroBlock}
        {TabBar}
        <View style={styles.tabContent}>
          {activeTab === "about" && <AboutTab event={event} />}
          {activeTab === "qr"    && <QrTab event={event} />}
          {activeTab === "rsvp"  && <RsvpTab event={event} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: "#fff" },
  scroll:   { flex: 1 },
  fullFlex: { flex: 1 },

  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  errorTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: neutral[800] },
  errorSub:   { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], textAlign: "center" },
  retryBtn:   { marginTop: 8, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24, backgroundColor: brand.primary },
  retryText:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: "#fff" },

  // Full hero (simple tabs)
  hero:           { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#000" },
  heroMediaContainer: { ...StyleSheet.absoluteFillObject },
  heroImg:        { width: "100%", height: "100%" },
  heroFallback:   { width: "100%", aspectRatio: 3 / 4, alignItems: "center", justifyContent: "center", backgroundColor: neutral[100] },
  heroOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  heroTopRow:     { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroBottom:     { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 16, gap: 6 },
  heroTitle:      { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl, color: "#fff", lineHeight: 28 },

  // Compact hero strip (self-scroll tabs) — short, just name + tags
  compactHero: {
    height: 80,
    backgroundColor: brand.primaryDark,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  compactHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  compactHeroContent: { paddingHorizontal: 14, paddingBottom: 10, gap: 4 },
  compactHeroTitle:   { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: "#fff" },

  tagsRow:  { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tagPill:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText:  { fontFamily: fontFamily.semibold, fontSize: 10, color: "#fff" },

  // Tab bar
  tabBar:     { backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  tabBarInner:{ flexDirection: "row", paddingHorizontal: 8 },
  tab:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, position: "relative" },
  tabLabel:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[400] },
  tabLabelActive: { color: brand.primary },
  tabUnderline:   { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: brand.primary, borderRadius: 2 },

  tabContent: { flex: 1 },
});
