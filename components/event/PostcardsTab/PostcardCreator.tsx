import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import {
  useCreatePostcardsMutation,
  useGetEventPostcardsQuery,
  useSwapPostcardMutation,
} from '@/store/api/eventsApi';
import { API_URL } from '@/store/baseQuery';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { PostcardCamera, type CapturedMedia } from './PostcardCamera';

const { width: W } = Dimensions.get('window');
const PREVIEW_H = W * (4 / 3);   // 3:4 portrait preview
const MAX_ITEMS = 20;
const TILE_W = (W - 28 - 8) / 2; // two columns with 8px gap inside 14px padding

interface VibeTagOverlay {
  imageUrl: string;
  name: string;
}

interface PickedItem {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
  fileName?: string;
}

export interface PostcardCreatorProps {
  vibeTagName?: string;
  vibeTagOverlay?: VibeTagOverlay | null;
  vibeTagId?: string;
  eventName?: string;
  eventId?: string;
  /** Called when the user dismisses the creator */
  onClose: () => void;
  /** Called after a successful post */
  onSubmit?: () => void;
  /** Per-user count to enforce the 20-cap swap flow */
  userPostcardCount?: number;
  swapPostcardId?: string;
  swapLikeCount?: number;
  swapCommentCount?: number;
}

// ─── SwapConfirmDialog ────────────────────────────────────────────────────────

function SwapConfirmDialog({
  likeCount,
  commentCount,
  onConfirm,
  onCancel,
}: {
  likeCount: number;
  commentCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={sc.backdrop}>
      <View style={sc.sheet}>
        <Text style={sc.title}>Replace this postcard?</Text>
        <Text style={sc.sub}>
          This will permanently delete the existing postcard and all its
          activity:
        </Text>
        <View style={sc.statsRow}>
          <View style={sc.statCol}>
            <Ionicons name="heart" size={16} color={semantic.error} />
            <Text style={sc.statNum}>{likeCount}</Text>
            <Text style={sc.statLabel}>likes</Text>
          </View>
          <View style={sc.statCol}>
            <Ionicons name="chatbubble" size={15} color={semantic.error} />
            <Text style={sc.statNum}>{commentCount}</Text>
            <Text style={sc.statLabel}>comments</Text>
          </View>
          <Text style={sc.warn}>This action cannot be undone.</Text>
        </View>
        <View style={sc.btnRow}>
          <TouchableOpacity
            style={sc.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={sc.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={sc.confirmBtn}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={sc.confirmText}>Replace</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 200,
    padding: 16,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: `${semantic.error}10`,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    borderRadius: 12,
    padding: 12,
  },
  statCol: { alignItems: 'center', gap: 2 },
  statNum: { fontFamily: fontFamily.bold, fontSize: 13, color: semantic.error },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] },
  warn: { flex: 1, fontFamily: fontFamily.regular, fontSize: 11, color: `${semantic.error}CC` },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 14,
    borderWidth: 1.5, borderColor: neutral[200],
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
  confirmBtn: {
    flex: 1, height: 46, borderRadius: 14,
    backgroundColor: semantic.error,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// ─── SwapPicker (screen inside the creator) ───────────────────────────────────

function SwapPicker({
  eventId,
  onPick,
  onCancel,
}: {
  eventId: string;
  onPick: (postcard: any) => void;
  onCancel: () => void;
}) {
  const { data, isLoading } = useGetEventPostcardsQuery(
    { eventId, limit: 50 },
    { skip: !eventId },
  );
  const list: any[] = (
    (data as any)?.data?.data ?? (data as any)?.data ?? []
  ).filter((p: any) => (p?.media ?? []).some((m: any) => !!m.mediaUrl));

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* dimmed background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={sp.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={sp.cancel}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={sp.title}>Replace a Postcard</Text>
            <Text style={sp.sub}>You've hit the 20-postcard limit</Text>
          </View>
          <View style={{ width: 56 }} />
        </View>

        {/* Warning */}
        <View style={sp.warning}>
          <Ionicons name="refresh" size={14} color="#92400E" />
          <Text style={sp.warnText}>
            Pick a postcard to replace. Its likes and comments will be removed.
          </Text>
        </View>

        {isLoading ? (
          <View style={sp.center}>
            <ActivityIndicator color={brand.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={sp.center}>
            <Ionicons name="images-outline" size={36} color={neutral[300]} />
            <Text style={sp.emptyText}>No postcards to replace.</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item, i) => item?.id ?? String(i)}
            numColumns={2}
            contentContainerStyle={{ padding: 14, gap: 0 }}
            columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
            renderItem={({ item }) => {
              const src = item?.media?.[0]?.mediaUrl ?? '';
              const isVideo = item?.media?.[0]?.mediaType === 'VIDEO';
              if (!src) return null;
              return (
                <TouchableOpacity
                  style={[sp.tile, { width: TILE_W, height: TILE_W * (4 / 3) }]}
                  onPress={() => onPick(item)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: src }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  {isVideo && (
                    <View style={sp.playBadge}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  )}
                  <View style={sp.tileBottom}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="heart" size={11} color="#fff" />
                      <Text style={sp.statText}>{item.likeCount ?? 0}</Text>
                      <Ionicons name="chatbubble" size={10} color="#fff" />
                      <Text style={sp.statText}>{item.commentCount ?? 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const sp = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  cancel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FDE68A',
  },
  warnText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: '#92400E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  tile: { borderRadius: 10, overflow: 'hidden', backgroundColor: neutral[100] },
  playBadge: {
    position: 'absolute', bottom: 8, left: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  tileBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 7,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  statText: { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff' },
});

// ─── PostcardCreator ──────────────────────────────────────────────────────────
// Rendered as a full-screen View (not Modal) — the parent conditionally mounts
// it over the tab content.

export function PostcardCreator({
  vibeTagName = 'Event VibeTag',
  vibeTagOverlay,
  vibeTagId,
  eventName = 'Event',
  eventId,
  onClose,
  onSubmit,
  userPostcardCount = 0,
  swapPostcardId,
  swapLikeCount = 0,
  swapCommentCount = 0,
}: PostcardCreatorProps) {
  const isSwapMode = !!swapPostcardId;

  type Screen = 'choose' | 'review';
  const [screen, setScreen] = useState<Screen>('choose');
  const [showCamera, setShowCamera] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [pendingSwapTarget, setPendingSwapTarget] = useState<any>(null);

  const [items, setItems] = useState<PickedItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'saving'>('uploading');

  const [createPostcards] = useCreatePostcardsMutation();
  const [swapPostcard] = useSwapPostcardMutation();

  // ── Pickers ───────────────────────────────────────────────────────────────

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Media library permission denied' });
      return;
    }
    const remaining = MAX_ITEMS - items.length;
    if (remaining <= 0) {
      Toast.show({ type: 'info', text1: `Max ${MAX_ITEMS} items reached` });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'] as any,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      videoMaxDuration: 125,
      orderedSelection: true,
    });
    if (result.canceled) return;
    const newItems: PickedItem[] = result.assets.map((a) => ({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
      mimeType: a.mimeType,
      fileName: a.fileName ?? undefined,
    }));
    const next = [...items, ...newItems].slice(0, MAX_ITEMS);
    const prevLen = items.length;
    setItems(next);
    setActiveIdx(prevLen);
    setScreen('review');
  };

  const handleCameraCapture = (captured: CapturedMedia[]) => {
    setShowCamera(false);
    if (!captured.length) return;
    const newItems: PickedItem[] = captured.map((c) => ({
      uri: c.uri,
      type: c.type,
      mimeType: c.mimeType,
    }));
    const prevLen = items.length;
    const next = [...items, ...newItems].slice(0, MAX_ITEMS);
    setItems(next);
    setActiveIdx(prevLen);
    setScreen('review');
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    if (next.length === 0) {
      setScreen('choose');
    } else {
      setActiveIdx(Math.min(activeIdx, next.length - 1));
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const doSubmit = async (targetSwapId?: string) => {
    if (!items.length || !eventId) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStage('uploading');
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const formData = new FormData();
      for (const item of items) {
        const uri = Platform.OS === 'ios'
          ? item.uri.replace('file://', '')
          : item.uri;
        const ext = item.uri.split('.').pop() ?? (item.type === 'video' ? 'mp4' : 'jpg');
        const mime = item.mimeType ?? (item.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const name = item.fileName ?? `postcard-${Date.now()}.${ext}`;
        (formData as any).append('files', { uri, name, type: mime } as any);
      }
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/v1/storage/upload-multiple`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setUploadProgress(Math.round((e.loaded / e.total) * 85));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Invalid response')); }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText)?.message || 'Upload failed')); }
            catch { reject(new Error('Upload failed')); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      const uploaded = (uploadResult?.data ?? []).map((f: any) => ({
        fileKey: f.fileKey,
        mediaType: f.mediaType,
        mediaUrl: f.url,
      }));
      if (!uploaded.length) {
        Toast.show({ type: 'error', text1: 'Upload failed — no files returned' });
        return;
      }
      setUploadStage('saving');
      setUploadProgress(90);
      if (targetSwapId) {
        await swapPostcard({ postcardId: targetSwapId, eventId, vibeTagId, media: uploaded, caption }).unwrap();
      } else {
        await createPostcards({ eventId, vibeTagId, media: uploaded, caption }).unwrap();
      }
      setUploadProgress(100);
      Toast.show({
        type: 'success',
        text1: targetSwapId
          ? 'Postcard replaced!'
          : `${items.length} item${items.length > 1 ? 's' : ''} posted!`,
      });
      onSubmit?.();
      onClose();
    } catch (err: any) {
      if (targetSwapId && err?.status === 403) {
        Toast.show({ type: 'error', text1: 'You can only replace your own postcards.' });
      } else if (targetSwapId && err?.status === 404) {
        Toast.show({ type: 'error', text1: 'That postcard no longer exists.' });
      } else {
        Toast.show({ type: 'error', text1: err?.data?.message ?? err?.message ?? 'Failed to post.' });
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setShowSwapConfirm(false);
    }
  };

  const handlePost = () => {
    if (!items.length) return;
    if (isSwapMode) { setShowSwapConfirm(true); return; }
    if (userPostcardCount >= MAX_ITEMS) { setShowSwapPicker(true); return; }
    doSubmit();
  };

  const activeItem = items[activeIdx] ?? null;

  // ── Choose screen ─────────────────────────────────────────────────────────

  const ChooseScreen = (
    <View style={{ flex: 1 }}>
      {/* Vibetag preview or placeholder */}
      <View style={[cs.previewWrap, { height: PREVIEW_H }]}>
        {vibeTagOverlay?.imageUrl ? (
          <>
            <View style={cs.previewBg} />
            <Image
              source={{ uri: vibeTagOverlay.imageUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            <View style={cs.previewOverlayLabel}>
              <Ionicons name="sparkles" size={13} color="#fff" />
              <Text style={cs.previewLabelText} numberOfLines={1}>
                {vibeTagName}
              </Text>
            </View>
          </>
        ) : (
          <View style={[cs.previewBg, { alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
            <Ionicons name="image-outline" size={44} color={neutral[300]} />
            <Text style={cs.previewPlaceholder}>
              Your photo will appear here
            </Text>
            <View style={cs.previewLabelBox}>
              <Ionicons name="sparkles" size={13} color={brand.primaryLight} />
              <Text style={cs.previewLabelText} numberOfLines={1}>
                {vibeTagName}
              </Text>
            </View>
            <Text style={cs.previewEventName} numberOfLines={1}>
              {eventName}
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={cs.actions}>
        <TouchableOpacity
          style={cs.primaryBtn}
          onPress={() => setShowCamera(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={cs.primaryBtnText}>Take Photo / Record Video</Text>
            <Text style={cs.primaryBtnSub}>Live VibeTag overlay • max {MAX_ITEMS}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={cs.secondaryBtn}
          onPress={pickFromGallery}
          activeOpacity={0.85}
        >
          <Ionicons name="images-outline" size={22} color={neutral[700]} />
          <View style={{ flex: 1 }}>
            <Text style={cs.secondaryBtnText}>Upload from Gallery</Text>
            <Text style={cs.secondaryBtnSub}>
              max {MAX_ITEMS} · photos & videos ≤ 125s
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={neutral[400]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Review screen ─────────────────────────────────────────────────────────

  const ReviewScreen = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Thumbnail strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rv.strip}
        >
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setActiveIdx(idx)}
              style={[rv.thumb, idx === activeIdx && rv.thumbActive]}
              activeOpacity={0.85}
            >
              {item.type === 'video' ? (
                <View style={rv.thumbVideo}>
                  <Ionicons name="play-circle" size={22} color="#fff" />
                </View>
              ) : (
                <Image
                  source={{ uri: item.uri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  cachePolicy="memory"
                />
              )}
              {/* VibeTag overlay preview on thumbnails */}
              {vibeTagOverlay?.imageUrl && (
                <Image
                  source={{ uri: vibeTagOverlay.imageUrl }}
                  style={[StyleSheet.absoluteFillObject, { opacity: 0.55 }]}
                  contentFit="cover"
                  cachePolicy="memory"
                  pointerEvents="none"
                />
              )}
              <TouchableOpacity
                style={rv.thumbRemove}
                onPress={() => removeItem(idx)}
                hitSlop={4}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Add more button */}
          {items.length < MAX_ITEMS && (
            <View style={rv.thumbAddGroup}>
              <TouchableOpacity
                style={rv.thumbAddBtn}
                onPress={() => setShowCamera(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color={neutral[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={rv.thumbAddBtn}
                onPress={pickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={18} color={neutral[500]} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Active preview */}
        {activeItem && (
          <View style={[rv.previewBox, { height: PREVIEW_H }]}>
            {activeItem.type === 'video' ? (
              <Video
                source={{ uri: activeItem.uri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                useNativeControls
                isLooping
              />
            ) : (
              <Image
                source={{ uri: activeItem.uri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                cachePolicy="memory"
              />
            )}
            {/* Live VibeTag overlay */}
            {vibeTagOverlay?.imageUrl && (
              <Image
                source={{ uri: vibeTagOverlay.imageUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                cachePolicy="memory"
                pointerEvents="none"
              />
            )}
            {/* Remove */}
            <TouchableOpacity
              style={rv.removeBtn}
              onPress={() => removeItem(activeIdx)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Caption */}
        <View style={rv.captionWrap}>
          <Text style={rv.captionLabel}>
            Caption{' '}
            <Text style={rv.captionOptional}>(optional)</Text>
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write something about this moment..."
            placeholderTextColor={neutral[400]}
            style={rv.captionInput}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Submit */}
        <View style={rv.submitWrap}>
          {isSubmitting ? (
            <View style={rv.progressBox}>
              <View style={rv.progressRow}>
                <Text style={rv.progressLabel}>
                  {uploadStage === 'uploading' ? 'Uploading…' : 'Saving…'}
                </Text>
                <Text style={rv.progressPct}>{uploadProgress}%</Text>
              </View>
              <View style={rv.progressTrack}>
                <View style={[rv.progressFill, { width: `${uploadProgress}%` as any }]} />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={rv.submitBtn}
              onPress={handlePost}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={rv.submitText}>
                {isSwapMode
                  ? 'Replace Postcard'
                  : `Post ${items.length} Item${items.length > 1 ? 's' : ''} to Feed`}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={rv.startOver}
            onPress={() => { setItems([]); setActiveIdx(0); setCaption(''); setScreen('choose'); }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={14} color={neutral[500]} />
            <Text style={rv.startOverText}>Start over</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Swap confirm overlay */}
      {showSwapConfirm && (
        <SwapConfirmDialog
          likeCount={pendingSwapTarget?.likeCount ?? swapLikeCount}
          commentCount={pendingSwapTarget?.commentCount ?? swapCommentCount}
          onCancel={() => { setShowSwapConfirm(false); setPendingSwapTarget(null); }}
          onConfirm={() => doSubmit(pendingSwapTarget?.id ?? swapPostcardId)}
        />
      )}
    </KeyboardAvoidingView>
  );

  // ── Root render — positioned absolutely over the parent ───────────────────

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* White background — fills whole screen */}
      <SafeAreaView style={root.container} edges={['top', 'bottom']}>

        {/* Navbar */}
        <View style={root.navbar}>
          <TouchableOpacity
            onPress={screen === 'review' ? () => setScreen('choose') : onClose}
            style={root.navBtn}
            hitSlop={8}
          >
            <Ionicons
              name={screen === 'review' ? 'chevron-back' : 'close'}
              size={22}
              color={neutral[700]}
            />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={root.navTitle}>
              {isSwapMode
                ? 'Replace Postcard'
                : screen === 'review'
                ? 'Review'
                : 'Create Postcard'}
            </Text>
            {screen === 'review' && (
              <Text style={root.navSub}>
                {items.length}/{MAX_ITEMS} item{items.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Right action: add more media when reviewing */}
          {screen === 'review' && items.length < MAX_ITEMS ? (
            <TouchableOpacity
              onPress={() => setShowCamera(true)}
              style={root.navBtn}
              hitSlop={8}
            >
              <Ionicons name="camera-outline" size={22} color={brand.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* VibeTag banner */}
        {vibeTagOverlay && (
          <View style={root.vibeBanner}>
            <Ionicons name="sparkles" size={13} color={brand.primary} />
            <Text style={root.vibeText} numberOfLines={1}>
              {vibeTagOverlay.name}
            </Text>
            <Text style={root.vibeSub}>overlay applied live</Text>
          </View>
        )}

        {/* Screen content */}
        {screen === 'choose' ? ChooseScreen : ReviewScreen}
      </SafeAreaView>

      {/* In-app camera with live VibeTag overlay */}
      {showCamera && (
        <PostcardCamera
          vibeTagOverlay={vibeTagOverlay}
          vibeTagName={vibeTagName}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Swap picker */}
      {showSwapPicker && eventId && (
        <SwapPicker
          eventId={eventId}
          onPick={(postcard) => {
            setPendingSwapTarget(postcard);
            setShowSwapPicker(false);
            setShowSwapConfirm(true);
          }}
          onCancel={() => setShowSwapPicker(false)}
        />
      )}
    </View>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────

const root = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  navSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },
  vibeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: `${brand.primary}08`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${brand.primary}20`,
  },
  vibeText: { fontFamily: fontFamily.semibold, fontSize: 12, color: brand.primary, flex: 1 },
  vibeSub: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
});

// ─── Choose screen styles ─────────────────────────────────────────────────────

const cs = StyleSheet.create({
  previewWrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  previewBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neutral[100],
  },
  previewPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: neutral[400],
  },
  previewLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewOverlayLabel: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewLabelText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#fff',
    flex: 1,
  },
  previewEventName: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  actions: { padding: 16, gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    borderRadius: 16,
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
  },
  primaryBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
  primaryBtnSub: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: neutral[200],
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  secondaryBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
  secondaryBtnSub: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginTop: 1 },
});

// ─── Review screen styles ─────────────────────────────────────────────────────

const rv = StyleSheet.create({
  strip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  thumb: {
    width: 50, height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: neutral[100],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: brand.primary },
  thumbVideo: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbRemove: { position: 'absolute', top: 2, right: 2 },
  thumbAddGroup: {
    width: 50, height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: neutral[300],
    overflow: 'hidden',
  },
  thumbAddBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },

  previewBox: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: neutral[100],
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: 12, right: 12,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  captionWrap: { padding: 16, gap: 6 },
  captionLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  captionOptional: { fontFamily: fontFamily.regular, color: neutral[400] },
  captionInput: {
    borderWidth: 1, borderColor: neutral[200], borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800],
    minHeight: 72, textAlignVertical: 'top',
  },

  submitWrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  progressBox: {
    height: 52, borderRadius: 16, backgroundColor: brand.primary,
    paddingHorizontal: 16, justifyContent: 'center', gap: 4,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#fff' },
  progressPct: { fontFamily: fontFamily.bold, fontSize: 12, color: '#fff' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  submitBtn: {
    height: 52, borderRadius: 16, backgroundColor: brand.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
  startOver: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 4,
  },
  startOverText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] },
});
