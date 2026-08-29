/**
 * User Profile Screen — /users/:id
 *
 * Shows a user's public profile: avatar, name, username, bio,
 * and action buttons for Follow/Unfollow and Chat.
 */

import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useToggleFollowMutation } from '@/store/api/socialApi';
import { useGetUserBasicQuery } from '@/store/api/usersApi';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ uri, name, size = 88 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        s.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[s.avatarInitial, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const me      = useAppSelector((st) => st.auth.user);

  const { data, isLoading, isError } = useGetUserBasicQuery(id ?? '', {
    skip: !id,
  });

  const [toggleFollow] = useToggleFollowMutation();
  const userRaw = data?.data ?? data;
  const [following,    setFollowing]    = useState<boolean>(userRaw?.isFollowing ?? false);
  const [followBusy,   setFollowBusy]   = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  // Re-sync once data arrives
  React.useEffect(() => {
    if (userRaw?.isFollowing !== undefined) {
      setFollowing(userRaw.isFollowing);
    }
  }, [userRaw?.isFollowing]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <Header onBack={() => router.back()} />
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !userRaw) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <Header onBack={() => router.back()} />
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={neutral[300]} />
          <Text style={s.errorText}>Could not load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const name     = userRaw.displayName ?? userRaw.username ?? 'User';
  const username = userRaw.username ?? '';
  const isSelf   = me?.id === id;

  const handleFollow = async () => {
    if (followBusy) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowBusy(true);
    try {
      await toggleFollow({ userId: id!, isFollowing: wasFollowing }).unwrap();
    } catch {
      setFollowing(wasFollowing);
      Toast.show({ type: 'error', text1: 'Action failed', text2: 'Please try again.' });
    } finally {
      setFollowBusy(false);
    }
  };

  const handleChat = () => {
    setStartingChat(true);
    setTimeout(() => {
      setStartingChat(false);
      router.push(`/chat?id=${id}&username=${username || name}` as any);
    }, 300);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <Header onBack={() => router.back()} title="Profile" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={s.heroSection}>
          <Avatar uri={userRaw.avatarUrl} name={name} size={88} />
          <Text style={s.displayName}>{name}</Text>
          {username ? (
            <Text style={s.username}>@{username.replace(/^@/, '')}</Text>
          ) : null}
          {userRaw.bio ? (
            <Text style={s.bio}>{userRaw.bio}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {userRaw.eventsAttended != null && (
            <StatItem label="Events" value={userRaw.eventsAttended} />
          )}
          {userRaw.postcardsCount != null && (
            <StatItem label="Postcards" value={userRaw.postcardsCount} />
          )}
          {userRaw.followersCount != null && (
            <StatItem label="Followers" value={userRaw.followersCount} />
          )}
        </View>

        {/* Action buttons — only shown if viewing someone else's profile */}
        {!isSelf && (
          <View style={s.actionsRow}>
            {/* Follow / Unfollow */}
            <TouchableOpacity
              style={[
                s.actionBtn,
                following ? s.actionBtnOutline : s.actionBtnFill,
              ]}
              onPress={handleFollow}
              activeOpacity={0.8}
              disabled={followBusy}
            >
              {followBusy ? (
                <ActivityIndicator
                  size="small"
                  color={following ? brand.primary : '#fff'}
                />
              ) : (
                <>
                  <Ionicons
                    name={following ? 'checkmark-circle-outline' : 'person-add-outline'}
                    size={18}
                    color={following ? brand.primary : '#fff'}
                  />
                  <Text
                    style={[
                      s.actionBtnText,
                      following ? s.actionBtnTextOutline : s.actionBtnTextFill,
                    ]}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Chat */}
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnOutline]}
              onPress={handleChat}
              activeOpacity={0.8}
              disabled={startingChat}
            >
              {startingChat ? (
                <ActivityIndicator size="small" color={brand.primary} />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={18} color={brand.primary} />
                  <Text style={[s.actionBtnText, s.actionBtnTextOutline]}>Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* City / country */}
        {(userRaw.city || userRaw.country) && (
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={14} color={neutral[400]} />
            <Text style={s.locationText}>
              {[userRaw.city, userRaw.country].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title?: string }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={8} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={neutral[800]} />
      </TouchableOpacity>
      {title ? <Text style={s.headerTitle}>{title}</Text> : <View />}
      <View style={{ width: 38 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 16,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },

  heroSection: {
    alignItems: 'center',
    gap: 8,
  },

  avatarFallback: {
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.bold,
    color: '#fff',
  },

  displayName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: neutral[800],
    marginTop: 4,
  },
  username: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  bio: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[600],
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    paddingHorizontal: 16,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: neutral[100],
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: neutral[800],
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnFill: {
    backgroundColor: brand.primary,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: brand.primary,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  actionBtnTextFill: { color: '#fff' },
  actionBtnTextOutline: { color: brand.primary },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
});
