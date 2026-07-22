import PersonCard, { SocialUser } from '@/components/social/PersonCard';
import PostcardCard, { PostcardItem } from '@/components/social/PostcardCard';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Mock data (replace with API hooks) ───────────────────────────────────────

const MOCK_FEED: PostcardItem[] = [
  {
    id: 'p1',
    caption: 'What a match!! Argentina forever 🔥',
    likeCount: 42,
    isLiked: false,
    commentsCount: 8,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    event: { id: 'e1', name: 'Argentina vs. Spain' },
    author: { id: 'u1', username: 'alex_vibe',  displayName: 'Alex Vibe',  avatarUrl: null },
    media: [{ mediaUrl: null, mediaType: 'PHOTO' }],
  },
  {
    id: 'p2',
    caption: 'Best night ever 🏆',
    likeCount: 18,
    isLiked: true,
    commentsCount: 3,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    event: { id: 'e2', name: 'GOAT Exhibition' },
    author: { id: 'u2', username: 'sarah_games', displayName: 'Sarah Games', avatarUrl: null },
    media: [{ mediaUrl: null, mediaType: 'PHOTO' }],
  },
];

const MOCK_FOLLOWING: SocialUser[] = [
  { id: 'u1', username: 'alex_vibe',    displayName: 'Alex Vibe',    avatarUrl: null, bio: 'Sports & vibes 🏆',           isFollowing: true  },
  { id: 'u2', username: 'sarah_games',  displayName: 'Sarah Games',  avatarUrl: null, bio: 'Gamer & event lover',         isFollowing: true  },
  { id: 'u5', username: 'nextviber99',  displayName: 'Nextviber 99', avatarUrl: null, bio: null,                          isFollowing: true  },
];

const MOCK_FOLLOWERS: SocialUser[] = [
  { id: 'u3', username: 'nextvibe_fan', displayName: 'Nextvibe Fan', avatarUrl: null, bio: 'Living for the vibes ✨',      isFollowing: false },
  { id: 'u4', username: 'match_day',    displayName: 'Match Day',    avatarUrl: null, bio: null,                          isFollowing: true  },
];

const MOCK_MUTUALS: SocialUser[] = [
  { id: 'u2', username: 'sarah_games',  displayName: 'Sarah Games',  avatarUrl: null, bio: 'Gamer & event lover',         isFollowing: true  },
  { id: 'u4', username: 'match_day',    displayName: 'Match Day',    avatarUrl: null, bio: null,                          isFollowing: true  },
];

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={tb.bar}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <TouchableOpacity
            key={t.id}
            style={[tb.tab, isActive && tb.tabActive]}
            onPress={() => onSelect(t.id)}
            activeOpacity={0.75}
          >
            <Ionicons name={t.icon} size={16} color={isActive ? brand.primary : neutral[400]} />
            <Text style={[tb.label, isActive && tb.labelActive]}>{t.label}</Text>
            {isActive && <View style={tb.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar:      { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200] },
  tab:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, position: 'relative' },
  tabActive:{},
  label:    { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[400] },
  labelActive: { color: brand.primary },
  underline:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: brand.primary, borderRadius: 2 },
});

// ─── People sub-tabs ──────────────────────────────────────────────────────────

type PeopleTab = 'following' | 'followers' | 'mutuals';

function PeopleSubTabs({ active, onSelect }: { active: PeopleTab; onSelect: (t: PeopleTab) => void }) {
  const tabs: PeopleTab[] = ['following', 'followers', 'mutuals'];
  return (
    <View style={ptb.row}>
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <TouchableOpacity
            key={t}
            style={[ptb.tab, isActive && ptb.tabActive]}
            onPress={() => onSelect(t)}
            activeOpacity={0.8}
          >
            <Text style={[ptb.label, isActive && ptb.labelActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ptb = StyleSheet.create({
  row:        { flexDirection: 'row', marginBottom: 12, gap: 8, paddingHorizontal: 16 },
  tab:        { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: neutral[100] },
  tabActive:  { backgroundColor: brand.primary },
  label:      { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[500] },
  labelActive:{ color: '#fff' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'feed',   label: 'Feed',   icon: 'images-outline'  as const },
  { id: 'people', label: 'People', icon: 'people-outline'  as const },
];

export default function SocialScreen() {
  const [mainTab,    setMainTab]    = useState<'feed' | 'people'>('feed');
  const [peopleTab,  setPeopleTab]  = useState<PeopleTab>('following');
  const [search,     setSearch]     = useState('');
  const isLoading = false;

  const peopleMap: Record<PeopleTab, SocialUser[]> = {
    following: MOCK_FOLLOWING,
    followers: MOCK_FOLLOWERS,
    mutuals:   MOCK_MUTUALS,
  };

  const filtered = (peopleMap[peopleTab] ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.displayName ?? '').toLowerCase().includes(q) ||
      (u.username    ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
      </View>

      {/* Main tabs */}
      <TabBar tabs={MAIN_TABS} active={mainTab} onSelect={(id) => setMainTab(id as 'feed' | 'people')} />

      {/* ── Feed ── */}
      {mainTab === 'feed' && (
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.primary} />
          </View>
        ) : MOCK_FEED.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="images-outline" size={52} color={neutral[200]} />
            <Text style={styles.emptyTitle}>Nothing in your feed yet</Text>
            <Text style={styles.emptySub}>Follow people to see their postcards here.</Text>
          </View>
        ) : (
          <FlatList
            data={MOCK_FEED}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <PostcardCard item={item} onPress={() => {}} />
            )}
            contentContainerStyle={styles.feedList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )
      )}

      {/* ── People ── */}
      {mainTab === 'people' && (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={neutral[400]} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people…"
              placeholderTextColor={neutral[400]}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sub-tabs */}
          <PeopleSubTabs active={peopleTab} onSelect={setPeopleTab} />

          {/* List */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={brand.primary} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={52} color={neutral[200]} />
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : `No ${peopleTab} yet`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <PersonCard user={item} defaultFollowing={peopleTab !== 'followers'} />
              )}
              contentContainerStyle={styles.peopleList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize['2xl'],
    color: neutral[900],
  },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[700], textAlign: 'center' },
  emptySub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,   color: neutral[400], textAlign: 'center' },

  feedList:   { padding: 16, paddingBottom: 40 },
  peopleList: { paddingHorizontal: 16, paddingBottom: 40 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
});
