import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface SocialUser {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isFollowing?: boolean;
}

function AvatarCircle({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.initials, { fontSize: size * 0.38 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

interface Props {
  user: SocialUser;
  defaultFollowing?: boolean;
}

export default function PersonCard({ user, defaultFollowing = false }: Props) {
  const router = useRouter();
  const [following,    setFollowing]    = useState(user.isFollowing ?? defaultFollowing);
  const [startingChat, setStartingChat] = useState(false);

  const name = user.displayName ?? user.username ?? 'User';

  const handleToggleFollow = () => {
    setFollowing((v) => !v);
    // TODO: call toggleFollow API
  };

  const handleChat = async () => {
    setStartingChat(true);
    // TODO: call startConversation API then navigate
    setTimeout(() => {
      setStartingChat(false);
      router.push(`/chat?id=${user.id}&username=${user.username ?? name}` as any);
    }, 500);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => router.push(`/users/${user.id}` as any)}
        activeOpacity={0.85}
      >
        <AvatarCircle uri={user.avatarUrl} name={name} size={48} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        {user.username && (
          <Text style={styles.handle}>@{user.username.replace(/^@/, '')}</Text>
        )}
        {user.bio && (
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>
        )}
      </View>

      <View style={styles.btns}>
        <TouchableOpacity
          style={[styles.followBtn, following && styles.followingBtn]}
          onPress={handleToggleFollow}
          activeOpacity={0.8}
        >
          <Ionicons
            name={following ? 'checkmark' : 'person-add-outline'}
            size={12}
            color={following ? brand.primary : '#fff'}
          />
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={handleChat}
          disabled={startingChat}
          activeOpacity={0.8}
        >
          {startingChat
            ? <ActivityIndicator size="small" color={neutral[500]} />
            : <Ionicons name="chatbubble-outline" size={16} color={neutral[600]} />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const av = StyleSheet.create({
  circle:   { backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.bold, color: '#fff' },
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  name:   { fontFamily: fontFamily.semibold, fontSize: fontSize.sm,  color: neutral[800] },
  handle: { fontFamily: fontFamily.regular,  fontSize: 11,           color: neutral[500], marginTop: 1 },
  bio:    { fontFamily: fontFamily.regular,  fontSize: 11,           color: neutral[500], marginTop: 2 },

  btns: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: brand.primary,
  },
  followingBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: brand.primary,
  },
  followBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: '#fff',
  },
  followingBtnText: { color: brand.primary },

  chatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
