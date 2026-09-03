/**
 * PostcardCreator
 *
 * Full-screen overlay (not a Modal) with two stages:
 *   1. Choose  — pick camera or gallery
 *   2. Review  — preview media with VibeTag overlay, caption, post
 *
 * Design: clean Instagram-style with the VibeTag always visibly applied.
 */
import AuthModal from '@/components/auth/AuthModal';
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useAuthModal } from '@/hooks/useAuthModal';
import {
    useCreatePostcardsMutation,
    useGetEventPostcardsQuery,
    useSwapPostcardMutation,
} from '@/store/api/eventsApi';
import { API_URL, tokenStore } from '@/store/baseQuery';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { PostcardCamera, type CapturedMedia } from './PostcardCamera';
import { stampOverlay } from './stampOverlay';

const { width: W, height: H } = Dimensions.get('window');
const TILE_W = (W - 28 - 8) / 2;   // two-column swap grid
const MAX_ITEMS = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  onClose: () => void;
  onSubmit?: () => void;
  userPostcardCount?: number;
  swapPostcardId?: string;
  swapLikeCount?: number;
  swapCommentCount?: number;
}

// ─── SwapConfirm ──────────────────────────────────────────────────────────────

function SwapConfirm({
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
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'flex-end', zIndex: 300, padding: 16 }]}>
      <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14 }}>
        <Text style={{ fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] }}>
          Replace this postcard?
        </Text>
        <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[500] }}>
          This permanently deletes the existing postcard and all its activity:
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, backgroundColor: `${semantic.error}10`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${semantic.error}25` }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Ionicons name="heart" size={16} color={semantic.error} />
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: semantic.error }}>{likeCount}</Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] }}>likes</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Ionicons name="chatbubble" size={15} color={semantic.error} />
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: semantic.error }}>{commentCount}</Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 10, color: neutral[500] }}>comments</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 11, color: `${semantic.error}BB`, alignSelf: 'center' }}>
            This action cannot be undone.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: neutral[200], alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.85}
            style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: semantic.error, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' }}>Replace</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── SwapPicker ───────────────────────────────────────────────────────────────

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
    <SafeAreaView style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff', zIndex: 200 }]} edges={['top', 'bottom']}>
      <View style={sp.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={10}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={sp.headerTitle}>Replace a Postcard</Text>
          <Text style={sp.headerSub}>You've hit the 20 postcard limit</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <View style={sp.warningRow}>
        <Ionicons name="warning-outline" size={15} color="#92400E" />
        <Text style={sp.warningText}>
          Tap a postcard to replace it. Its likes and comments will be removed.
        </Text>
      </View>

      {isLoading ? (
        <View style={sp.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={sp.center}>
          <Ionicons name="images-outline" size={40} color={neutral[200]} />
          <Text style={sp.emptyText}>No postcards to replace</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item?.id ?? String(i)}
          numColumns={2}
          contentContainerStyle={{ padding: 14 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          renderItem={({ item }) => {
            const src = item?.media?.[0]?.mediaUrl ?? '';
            const isVid = item?.media?.[0]?.mediaType === 'VIDEO';
            if (!src) return null;
            return (
              <TouchableOpacity
                style={[sp.tile, { width: TILE_W, height: TILE_W * (4 / 3) }]}
                onPress={() => onPick(item)}
                activeOpacity={0.82}
              >
                <Image source={{ uri: src }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                {isVid && (
                  <View style={sp.playBadge}>
                    <Ionicons name="play" size={13} color="#fff" />
                  </View>
                )}
                <View style={sp.tileGrad} />
                <View style={sp.tileBottom}>
                  <Ionicons name="heart" size={10} color="#fff" />
                  <Text style={sp.tileStat}>{item.likeCount ?? 0}</Text>
                  <Ionicons name="chatbubble" size={9} color="#fff" style={{ marginLeft: 6 }} />
                  <Text style={sp.tileStat}>{item.commentCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const sp = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200],
  },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  headerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },
  warningRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FDE68A',
  },
  warningText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: '#92400E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  tile: { borderRadius: 12, overflow: 'hidden', backgroundColor: neutral[100] },
  playBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  tileGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, backgroundColor: 'rgba(0,0,0,0.35)' },
  tileBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', padding: 8,
  },
  tileStat: { fontFamily: fontFamily.semibold, fontSize: 10, color: '#fff', marginLeft: 3 },
});

// ─── PostcardCreator (main) ───────────────────────────────────────────────────

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

  type Stage = 'choose' | 'review';
  const [stage, setStage] = useState<Stage>('choose');
  const [items, setItems] = useState<PickedItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'stamping' | 'uploading' | 'saving'>('stamping');
  const [showCamera, setShowCamera] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<any>(null);

  // Auth modal — shown when token has expired mid-submit
  const { visible: authModalVisible, showAuthModal, hideAuthModal } = useAuthModal();
  // Keep a ref to the pending swap target so we can retry after re-auth
  const pendingSubmitSwapRef = useRef<string | undefined>(undefined);

  // Slide-up animation for review stage
  const slideAnim = useRef(new Animated.Value(H)).current;

  const showReview = (newItems: PickedItem[], startIdx: number) => {
    setItems(newItems);
    setActiveIdx(startIdx);
    setStage('review');
    slideAnim.setValue(H);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const [createPostcards] = useCreatePostcardsMutation();
  const [swapPostcard] = useSwapPostcardMutation();

  // ── Pickers ───────────────────────────────────────────────────────────────

  const openGallery = async () => {
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
    const prevLen = items.length;
    const next = [...items, ...newItems].slice(0, MAX_ITEMS);
    showReview(next, prevLen);
  };

  const onCameraCapture = (captured: CapturedMedia[]) => {
    setShowCamera(false);
    if (!captured.length) return;
    const newItems: PickedItem[] = captured.map((c) => ({
      uri: c.uri, type: c.type, mimeType: c.mimeType,
    }));
    const prevLen = items.length;
    const next = [...items, ...newItems].slice(0, MAX_ITEMS);
    showReview(next, prevLen);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    if (next.length === 0) {
      setStage('choose');
      setItems([]);
    } else {
      setItems(next);
      setActiveIdx(Math.min(activeIdx, next.length - 1));
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const doSubmit = async (targetSwapId?: string) => {
    if (!items.length || !eventId) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStage('stamping');

    // overlayUrl from vibeTagOverlay prop — used for both stamping and video reference
    const overlayUrl = vibeTagOverlay?.imageUrl ?? null;

    try {
      // ── Step 1: Stamp VibeTag onto every item before upload ─────────────
      // Images  → Skia composites photo + overlay → JPEG data URI
      // Videos  → returned unchanged; overlayUrl stored for playback-time rendering
      // console.log('[PostcardCreator] Starting stamp process with overlay:', overlayUrl?.substring(0, 50));
      setUploadProgress(5);
      const stamped = await Promise.all(
        items.map((item) =>
          stampOverlay(item.uri, item.type, overlayUrl),
        ),
      );
    
      setUploadProgress(15);

      // ── Step 2: Build FormData with stamped URIs ─────────────────────────
      // For videos: upload both the raw video AND the composited thumbnail
      // For photos: upload the composited image
      const token = await tokenStore.get('accessToken');
      const formData = new FormData();

      stamped.forEach((result, i) => {
        const original = items[i];
        let uploadUri = result.uri;


        // Video: upload raw video file
        if (original.type === 'video') {
          const videoName = original.fileName ?? `postcard-video-${Date.now()}-${i}.mp4`;
          (formData as any).append('files', { 
            uri: uploadUri, 
            name: videoName, 
            type: 'video/mp4' 
          } as any);

          // Video: also upload the composited thumbnail if available
          if (result.thumbnailUri) {
            const thumbName = `postcard-thumb-${Date.now()}-${i}.jpg`;
            (formData as any).append('files', { 
              uri: result.thumbnailUri, 
              name: thumbName, 
              type: 'image/jpeg' 
            } as any);
          }
        } else {
          // Photo: composited image (data URI)
          const mime = result.mimeType;
          const ext = mime === 'image/png' ? 'png' : 'jpg';
          const name = original.fileName
            ? original.fileName.replace(/\.(jpg|jpeg)$/i, `.${ext}`)
            : `postcard-photo-${Date.now()}-${i}.${ext}`;

          // For regular file URIs strip the file:// prefix on iOS
          if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
            uploadUri = uploadUri.replace('file://', '');
          }

          (formData as any).append('files', { uri: uploadUri, name, type: mime } as any);
        }
      });

      // ── Step 3: XHR upload with progress ────────────────────────────────
      setUploadStage('uploading');
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/v1/storage/upload-multiple`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            // Reserve 15–85% of progress bar for the upload
            setUploadProgress(15 + Math.round((e.loaded / e.total) * 70));
        };
        xhr.onload = () => {
          if (xhr.status === 401) {
            reject(Object.assign(new Error('Unauthorized'), { status: 401 }));
            return;
          }
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

      // ── Step 4: Build media array — match uploaded files to original items ──
      const uploadedFiles = uploadResult?.data ?? [];
      let uploadIdx = 0;
      const uploaded = stamped.map((result, i) => {
        const original = items[i];
        
        if (original.type === 'video') {
          // Video: next file is the video, file after that is the thumbnail (if exists)
          const videoFile = uploadedFiles[uploadIdx++];
          const thumbnailFile = result.thumbnailUri ? uploadedFiles[uploadIdx++] : null;
         
          return {
            fileKey: videoFile?.fileKey,
            mediaType: 'VIDEO',
            mediaUrl: videoFile?.url,
            thumbnailKey: thumbnailFile?.fileKey ?? null,
            // For video items, persist the overlay URL so the viewer renders it live
            vibeTagOverlayUrl: result.vibeTagOverlayUrl ?? null,
          };
        } else {
          // Photo: next file is the composited photo
          const photoFile = uploadedFiles[uploadIdx++];
          
          return {
            fileKey: photoFile?.fileKey,
            mediaType: 'PHOTO',
            mediaUrl: photoFile?.url,
            // Photos don't need vibeTagOverlayUrl - it's already baked in
            vibeTagOverlayUrl: null,
          };
        }
      });

      if (!uploaded.length) {
        Toast.show({ type: 'error', text1: 'Upload failed' });
        return;
      }

      // ── Step 5: Save postcard ────────────────────────────────────────────
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
        text1: targetSwapId ? 'Postcard replaced!' : `${items.length} item${items.length > 1 ? 's' : ''} posted!`,
      });
      onSubmit?.();
      onClose();
    } catch (err: any) {
      const status = err?.status ?? err?.data?.statusCode;

      // ── Expired / missing token — show re-auth modal ───────────────────
      if (status === 401) {
        pendingSubmitSwapRef.current = targetSwapId;
        showAuthModal();
        return; // keep isSubmitting=false via finally, modal takes over
      }

      // ── Domain errors ──────────────────────────────────────────────────
      if (targetSwapId && status === 403) {
        Toast.show({ type: 'error', text1: 'You can only replace your own postcards.' });
      } else if (targetSwapId && status === 404) {
        Toast.show({ type: 'error', text1: 'That postcard no longer exists.' });
      } else {
        Toast.show({ type: 'error', text1: err?.data?.message ?? err?.message ?? 'Post failed.' });
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>

        {/* ── CHOOSE STAGE ─────────────────────────────────────────────── */}
        {stage === 'choose' && (
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={s.headerBtn}>
                <Ionicons name="close" size={22} color={neutral[700]} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>
                {isSwapMode ? 'Replace Postcard' : 'New Postcard'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {/* VibeTag preview — takes most of the screen */}
            <View style={s.vibePreview}>
              {vibeTagOverlay?.imageUrl ? (
                <>
                  <Image
                    source={{ uri: vibeTagOverlay.imageUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  {/* Dark gradient at bottom */}
                  <View style={s.vibePreviewGrad} pointerEvents="none" />
                  {/* Tag info */}
                  <View style={s.vibePreviewInfo} pointerEvents="none">
                    <View style={s.vibeChip}>
                      <Ionicons name="sparkles" size={12} color="#fff" />
                      <Text style={s.vibeChipText} numberOfLines={1}>
                        {vibeTagOverlay.name}
                      </Text>
                    </View>
                    <Text style={s.vibePreviewHint}>
                      This overlay will appear on your postcards
                    </Text>
                  </View>
                </>
              ) : (
                <View style={s.vibePreviewEmpty}>
                  <View style={s.vibePreviewEmptyIcon}>
                    <Ionicons name="sparkles" size={32} color={brand.primary} />
                  </View>
                  <Text style={s.vibePreviewEmptyTitle}>{vibeTagName}</Text>
                  <Text style={s.vibePreviewEmptySub}>
                    {eventName}
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={s.chooseActions}>
              <TouchableOpacity
                style={s.cameraBtn}
                onPress={() => setShowCamera(true)}
                activeOpacity={0.85}
              >
                <View style={s.cameraBtnIcon}>
                  <Ionicons name="camera" size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cameraBtnTitle}>Camera</Text>
                  <Text style={s.cameraBtnSub}>
                    Photo & video with live VibeTag overlay
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.galleryBtn}
                onPress={openGallery}
                activeOpacity={0.85}
              >
                <View style={s.galleryBtnIcon}>
                  <Ionicons name="images-outline" size={24} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.galleryBtnTitle}>Upload from Gallery</Text>
                  <Text style={s.galleryBtnSub}>
                    Photos & videos · max {MAX_ITEMS} · videos ≤ 125s
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={neutral[400]} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── REVIEW STAGE ─────────────────────────────────────────────── */}
        {stage === 'review' && (
          <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Header */}
              <View style={s.header}>
                <TouchableOpacity
                  onPress={() => { setStage('choose'); setItems([]); }}
                  hitSlop={10}
                  style={s.headerBtn}
                >
                  <Ionicons name="chevron-back" size={22} color={neutral[700]} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.headerTitle}>
                    {isSwapMode ? 'Replace Postcard' : 'Review'}
                  </Text>
                  <Text style={s.headerSub}>
                    {items.length}/{MAX_ITEMS} item{items.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {/* Add more — camera */}
                {items.length < MAX_ITEMS ? (
                  <TouchableOpacity
                    onPress={() => setShowCamera(true)}
                    hitSlop={10}
                    style={s.headerBtn}
                  >
                    <Ionicons name="add" size={24} color={brand.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 36 }} />
                )}
              </View>

              {/* VibeTag banner */}
              {vibeTagOverlay && (
                <View style={s.vibeBanner}>
                  <Ionicons name="sparkles" size={12} color={brand.primary} />
                  <Text style={s.vibeBannerText} numberOfLines={1}>
                    {vibeTagOverlay.name}
                  </Text>
                  <Text style={s.vibeBannerSub}>live overlay applied</Text>
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Active media preview — full width, 4:3 ratio, proper overlay */}
                {activeItem && (
                  <View style={s.mediaPreview}>
                    {/* User's photo / video */}
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
                        cachePolicy="memory-disk"
                      />
                    )}

                    {/* VibeTag overlay — sits on top at 60% opacity so the photo shows through */}
                    {vibeTagOverlay?.imageUrl && (
                      <>
                        <Image
                          source={{ uri: vibeTagOverlay.imageUrl }}
                          style={[StyleSheet.absoluteFillObject, { opacity: 0.65 }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          pointerEvents="none"
                        />
                        {/* Overlay label badge */}
                        <View style={s.overlayBadge} pointerEvents="none">
                          <Ionicons name="sparkles" size={11} color="#fff" />
                          <Text style={s.overlayBadgeText} numberOfLines={1}>
                            {vibeTagOverlay.name}
                          </Text>
                        </View>
                      </>
                    )}

                    {/* Remove current item */}
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => removeItem(activeIdx)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={17} color="#fff" />
                    </TouchableOpacity>

                    {/* Item counter badge */}
                    {items.length > 1 && (
                      <View style={s.counterBadge} pointerEvents="none">
                        <Ionicons name="layers" size={12} color="#fff" />
                        <Text style={s.counterBadgeText}>
                          {activeIdx + 1}/{items.length}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                    {/* Thumbnail strip — only when >1 item */}
                {items.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.thumbStrip}
                  >
                    {items.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setActiveIdx(idx)}
                        style={[s.thumb, idx === activeIdx && s.thumbSelected]}
                        activeOpacity={0.85}
                      >
                        {item.type === 'video' ? (
                          <View style={s.thumbVideo}>
                            <Ionicons name="play-circle" size={20} color="#fff" />
                          </View>
                        ) : (
                          <Image
                            source={{ uri: item.uri }}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        )}
                        {/* Subtle vibeTag tint on thumbnail */}
                        {vibeTagOverlay?.imageUrl && (
                          <Image
                            source={{ uri: vibeTagOverlay.imageUrl }}
                            style={[StyleSheet.absoluteFillObject, { opacity: 0.45 }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            pointerEvents="none"
                          />
                        )}
                        {/* Remove badge */}
                        <TouchableOpacity
                          style={s.thumbRemove}
                          onPress={() => removeItem(idx)}
                          hitSlop={4}
                        >
                          <Ionicons name="close-circle" size={17} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {/* Add more */}
                    {items.length < MAX_ITEMS && (
                      <View style={s.thumbAddWrap}>
                        <TouchableOpacity
                          style={s.thumbAdd}
                          onPress={() => setShowCamera(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="camera-outline" size={17} color={neutral[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.thumbAdd}
                          onPress={openGallery}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="images-outline" size={17} color={neutral[500]} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Caption */}
                <View style={s.captionSection}>
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Add a caption (optional)…"
                    placeholderTextColor={neutral[400]}
                    style={s.captionInput}
                    multiline
                    maxLength={300}
                  />
                  <Text style={s.captionCount}>{caption.length}/300</Text>
                </View>

                {/* Post button */}
                <View style={s.postSection}>
                  {isSubmitting ? (
                    <View style={s.progressCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={s.progressLabel}>
                          {uploadStage === 'stamping'
                            ? `Stamping VibeTag… (${items.filter(i => i.type === 'image').length} image${items.filter(i => i.type === 'image').length !== 1 ? 's' : ''})`
                            : uploadStage === 'uploading'
                            ? 'Uploading media…'
                            : 'Saving postcard…'}
                        </Text>
                        <Text style={s.progressPct}>{uploadProgress}%</Text>
                      </View>
                      <View style={s.progressTrack}>
                        <Animated.View
                          style={[s.progressFill, { width: `${uploadProgress}%` as any }]}
                        />
                      </View>
                      <Text style={s.progressSub}>
                        {uploadStage === 'stamping'
                          ? 'Applying VibeTag overlay…'
                          : uploadStage === 'uploading'
                          ? 'Please keep the app open…'
                          : 'Almost done…'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.postBtn}
                      onPress={handlePost}
                      activeOpacity={0.87}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={s.postBtnText}>
                        {isSwapMode
                          ? 'Replace Postcard'
                          : `Share ${items.length} Item${items.length > 1 ? 's' : ''}`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={s.startOverBtn}
                    onPress={() => { setStage('choose'); setItems([]); setCaption(''); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={14} color={neutral[400]} />
                    <Text style={s.startOverText}>Start over</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Swap confirm sheet */}
            {showSwapConfirm && (
              <SwapConfirm
                likeCount={pendingSwap?.likeCount ?? swapLikeCount}
                commentCount={pendingSwap?.commentCount ?? swapCommentCount}
                onCancel={() => { setShowSwapConfirm(false); setPendingSwap(null); }}
                onConfirm={() => doSubmit(pendingSwap?.id ?? swapPostcardId)}
              />
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Camera overlay */}
      {showCamera && (
        <PostcardCamera
          vibeTagOverlay={vibeTagOverlay}
          vibeTagName={vibeTagName}
          onCapture={onCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Swap picker overlay */}
      {showSwapPicker && eventId && (
        <SwapPicker
          eventId={eventId}
          onPick={(p) => {
            setPendingSwap(p);
            setShowSwapPicker(false);
            setShowSwapConfirm(true);
          }}
          onCancel={() => setShowSwapPicker(false)}
        />
      )}

      {/* Auth modal — shown when the token expired during upload/save */}
      <AuthModal
        visible={authModalVisible}
        onDismiss={() => {
          hideAuthModal();
          pendingSubmitSwapRef.current = undefined;
        }}
        onSuccess={() => {
          hideAuthModal();
          // Retry the submit with the fresh token — capture pending swap before clearing
          const swapTarget = pendingSubmitSwapRef.current;
          pendingSubmitSwapRef.current = undefined;
          doSubmit(swapTarget);
        }}
        message="Your session expired. Sign in to post your postcard."
      />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  headerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400], marginTop: 1 },

  // Choose — VibeTag preview
  vibePreview: {
    flex: 1,
    backgroundColor: neutral[100],
    overflow: 'hidden',
    position: 'relative',
  },
  vibePreviewGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  vibePreviewInfo: {
    position: 'absolute', bottom: 16, left: 16, right: 16, gap: 6,
  },
  vibeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  vibeChipText: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#fff' },
  vibePreviewHint: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  vibePreviewEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24,
  },
  vibePreviewEmptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  vibePreviewEmptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, color: neutral[700] },
  vibePreviewEmptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center' },

  // Choose — action buttons
  chooseActions: {
    padding: 16, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral[100],
  },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: brand.primary,
    borderRadius: 16, padding: 16,
  },
  cameraBtnIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
  cameraBtnSub: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: `${brand.primary}08`,
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: `${brand.primary}18`,
  },
  galleryBtnIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  galleryBtnTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  galleryBtnSub: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginTop: 2 },

  // VibeTag banner in review
  vibeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: `${brand.primary}06`,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${brand.primary}18`,
  },
  vibeBannerText: { fontFamily: fontFamily.semibold, fontSize: 12, color: brand.primary, flex: 1 },
  vibeBannerSub: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },

  // Media preview — full width, 4:3 aspect, overlay stacked on top
  mediaPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  overlayBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  overlayBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: '#fff',
    maxWidth: 180,
  },
  removeBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  counterBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  counterBadgeText: { fontFamily: fontFamily.semibold, fontSize: 11, color: '#fff' },

  // Thumbnail strip
  thumbStrip: {
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  thumb: {
    width: 52, height: 52, borderRadius: 10,
    overflow: 'hidden', backgroundColor: neutral[100],
    borderWidth: 2.5, borderColor: 'transparent',
  },
  thumbSelected: { borderColor: brand.primary },
  thumbVideo: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 1, right: 1 },
  thumbAddWrap: {
    width: 52, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: neutral[300],
    overflow: 'hidden',
  },
  thumbAdd: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[200],
  },

  // Caption
  captionSection: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral[100],
  },
  captionInput: {
    fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[800],
    minHeight: 62, textAlignVertical: 'top',
    paddingVertical: 0,
  },
  captionCount: {
    fontFamily: fontFamily.regular, fontSize: fontSize.xs,
    color: neutral[300], textAlign: 'right', marginTop: 4,
  },

  // Post section
  postSection: { padding: 14, gap: 10 },
  progressCard: {
    backgroundColor: neutral[50], borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: neutral[200],
  },
  progressLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
  progressPct: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: brand.primary },
  progressTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: neutral[200], overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: brand.primary, borderRadius: 3 },
  progressSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400], marginTop: 6 },
  postBtn: {
    height: 54, borderRadius: 16, backgroundColor: brand.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  postBtnText: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: '#fff', letterSpacing: 0.2 },
  startOverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4,
  },
  startOverText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
});
