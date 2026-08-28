import { Skeleton } from '@/components/ui/Skeleton';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
    useGetConversationsQuery,
    type Conversation,
} from '@/store/api/socialApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <View style={sk.row}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={sk.lines}>
        <View style={sk.topLine}>
          <Skeleton width="40%" height={13} borderRadius={6} />
          <Skeleton width={28}  height={10} borderRadius={5} />
        </View>
        <Skeleton width="65%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  lines:   { flex: 1, gap: 0 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function AvatarCircle({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.initials, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConvRow({ item }: { item: Conversation }) {
  const router     = useRouter();
  const hasUnread  = item.unreadCount > 0;
  const name       = item.participant.displayName ?? item.participant.username;

  return (
    <TouchableOpacity
      style={[row.container, hasUnread && row.containerUnread]}
      activeOpacity={0.75}
      onPress={() =>
        router.push({
          pathname: '/chat',
          params: { id: item.id, username: item.participant.username },
        } as any)
      }
    >
      <View style={row.avatarWrap}>
        <AvatarCircle name={name} />
        {hasUnread && <View style={row.onlineDot} />}
      </View>

      <View style={row.body}>
        <View style={row.topLine}>
          <Text style={[row.username, hasUnread && row.usernameBold]} numberOfLines={1}>
            {name}
          </Text>
          {item.lastMessage && (
            <Text style={[row.time, hasUnread && row.timePrimary]}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={row.bottomLine}>
          <Text
            style={[row.preview, hasUnread && row.previewBold]}
            numberOfLines={1}
          >
            {item.lastMessage?.body ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={row.badge}>
              <Text style={row.badgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const [search, setSearch] = useState('');

  const {
    data: convsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetConversationsQuery();

  const conversations: Conversation[] = convsData?.data ?? [];
  const isFirstLoad  = isLoading && !convsData;
  const isRefreshing = isFetching && !!convsData;

  const filtered = conversations.filter((c) =>
    (c.participant.displayName ?? c.participant.username)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // Re-fetch when tab comes into focus — prevents stale data after login/logout
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.sub}>Connect with fellow vibers</Text>
        </View>
        {totalUnread > 0 && (
          <View style={styles.countBadge}>
            <Ionicons name="people-outline" size={14} color={brand.primary} />
            <Text style={styles.countText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={neutral[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
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

      {/* Error state */}
      {isError && !isFirstLoad && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={neutral[300]} />
          <Text style={styles.emptyTitle}>Failed to load conversations</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {!isError && (
        <FlatList
          data={isFirstLoad ? [] : filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConvRow item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={brand.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            isFirstLoad ? (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <React.Fragment key={i}>
                    <ConvSkeleton />
                    {i < 4 && <View style={styles.sep} />}
                  </React.Fragment>
                ))}
              </>
            ) : null
          }
          ListEmptyComponent={
            !isFirstLoad ? (
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={52} color={neutral[200]} />
                <Text style={styles.emptyTitle}>
                  {search ? 'No results found' : 'No conversations yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {search ? 'Try a different name' : 'Connect with attendees at events!'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: fontSize['2xl'], color: neutral[900] },
  sub:   { fontFamily: fontFamily.regular,   fontSize: fontSize.sm,     color: neutral[500], marginTop: 2 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: `${brand.primary}12`,
  },
  countText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: brand.primary },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
  },
  searchIcon:  { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },

  sep:        { height: StyleSheet.hairlineWidth, backgroundColor: neutral[100], marginLeft: 76 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[700], textAlign: 'center' },
  emptySub:   { fontFamily: fontFamily.regular,  fontSize: fontSize.sm,   color: neutral[400], textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: brand.primary },
  retryText:  { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

const av = StyleSheet.create({
  circle:   { backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.bold, color: '#fff' },
});

const row = StyleSheet.create({
  container:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  containerUnread:  { backgroundColor: `${brand.primary}06` },
  avatarWrap:       { position: 'relative' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: brand.primary,
    borderWidth: 2, borderColor: '#fff',
  },
  body:          { flex: 1, gap: 3 },
  topLine:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  username:      { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800], flex: 1 },
  usernameBold:  { fontFamily: fontFamily.extrabold },
  time:          { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  timePrimary:   { color: brand.primary, fontFamily: fontFamily.semibold },
  bottomLine:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  preview:       { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500], flex: 1 },
  previewBold:   { fontFamily: fontFamily.semibold, color: neutral[700] },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: brand.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
});
