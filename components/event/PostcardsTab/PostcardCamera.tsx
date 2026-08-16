/**
 * PostcardCamera
 *
 * Full-screen in-app camera with a live VibeTag overlay rendered on top of
 * the viewfinder. Supports photo capture and video recording up to 35s.
 *
 * After capture the user is taken straight to the PostcardCreator review
 * flow with the captured media pre-loaded and the VibeTag overlay visible.
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import {
    CameraMode,
    CameraType,
    CameraView,
    useCameraPermissions,
    useMicrophonePermissions,
} from 'expo-camera';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAX_RECORD_SECS = 35;

export interface CapturedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
}

interface VibeTagOverlay {
  imageUrl: string;
  name: string;
}

interface PostcardCameraProps {
  vibeTagOverlay?: VibeTagOverlay | null;
  vibeTagName?: string;
  onCapture: (media: CapturedMedia[]) => void;
  onClose: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PostcardCamera({
  vibeTagOverlay,
  vibeTagName,
  onCapture,
  onClose,
}: PostcardCameraProps) {
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CameraMode>('picture');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [captures, setCaptures] = useState<CapturedMedia[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Shutter flash animation
  const shutterOpacity = useRef(new Animated.Value(0)).current;

  // Request permissions on mount if not yet decided
  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) return;
    if (cameraPermission && !cameraPermission.granted) requestCameraPermission();
  }, [cameraPermission]);

  useEffect(() => {
    if (micPermission && !micPermission.granted && !micPermission.canAskAgain) return;
    if (micPermission && !micPermission.granted) requestMicPermission();
  }, [micPermission]);

  // Auto-stop at MAX_RECORD_SECS
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingSecs((s) => {
          const next = s + 1;
          if (next >= MAX_RECORD_SECS) stopRecording();
          return next;
        });
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      setRecordingSecs(0);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  // ── Capture ──────────────────────────────────────────────────────────────

  const flashShutter = () => {
    shutterOpacity.setValue(1);
    Animated.timing(shutterOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || isBusy) return;
    setIsBusy(true);
    flashShutter();
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        const newCapture: CapturedMedia = {
          uri: photo.uri,
          type: 'image',
          mimeType: 'image/jpeg',
        };
        setCaptures((prev) => [...prev, newCapture]);
        Toast.show({
          type: 'success',
          text1: `Photo ${captures.length + 1} captured`,
          visibilityTime: 1200,
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not take photo' });
    } finally {
      setIsBusy(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isBusy) return;
    setIsRecording(true);
    setIsBusy(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORD_SECS,
        mute: false,
      });
      if (video?.uri) {
        const newCapture: CapturedMedia = {
          uri: video.uri,
          type: 'video',
          mimeType: Platform.OS === 'ios' ? 'video/mp4' : 'video/mp4',
        };
        setCaptures((prev) => [...prev, newCapture]);
      }
    } catch {
      // recording stopped — normal flow
    } finally {
      setIsRecording(false);
      setIsBusy(false);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const handleShutterPress = () => {
    if (mode === 'picture') {
      takePhoto();
    } else {
      if (isRecording) stopRecording();
      else startRecording();
    }
  };

  // ── Permissions not granted ───────────────────────────────────────────────

  if (!cameraPermission) {
    return (
      <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View style={s.permWrap}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </Modal>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={s.permWrap}>
          <TouchableOpacity style={s.closeAbsolute} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={neutral[700]} />
          </TouchableOpacity>
          <Ionicons name="camera-outline" size={56} color={neutral[300]} />
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permSub}>
            Allow NextVibe to use your camera to create postcards with your VibeTag overlay.
          </Text>
          <TouchableOpacity style={s.permBtn} onPress={requestCameraPermission} activeOpacity={0.85}>
            <Text style={s.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  const recordProgress = (recordingSecs / MAX_RECORD_SECS) * 100;
  const hasCaptures = captures.length > 0;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={s.root}>

        {/* ── Camera viewfinder ──────────────────────────────────────── */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          mode={mode}
          flash={flash}
          mute={false}
          onCameraReady={() => setIsCameraReady(true)}
          onMountError={() =>
            Toast.show({ type: 'error', text1: 'Camera failed to start' })
          }
        />

        {/* VibeTag live overlay */}
        {vibeTagOverlay?.imageUrl && (
          <Image
            source={{ uri: vibeTagOverlay.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            pointerEvents="none"
          />
        )}

        {/* Shutter flash */}
        <Animated.View
          style={[s.shutterFlash, { opacity: shutterOpacity }]}
          pointerEvents="none"
        />

        {/* Not ready overlay */}
        {!isCameraReady && (
          <View style={s.notReady}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={s.notReadyText}>Starting camera…</Text>
          </View>
        )}

        {/* ── Top bar ──────────────────────────────────────────────── */}
        <SafeAreaView style={s.topBar} edges={['top']}>
          <TouchableOpacity style={s.topBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* VibeTag label */}
          {vibeTagOverlay && (
            <View style={s.vibeLabel}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={s.vibeLabelText} numberOfLines={1}>
                {vibeTagName ?? vibeTagOverlay.name}
              </Text>
            </View>
          )}

          {/* Flash toggle */}
          <TouchableOpacity
            style={s.topBtn}
            onPress={() =>
              setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'))
            }
            hitSlop={8}
          >
            <Ionicons
              name={
                flash === 'on'
                  ? 'flash'
                  : flash === 'auto'
                  ? 'flash-outline'
                  : 'flash-off'
              }
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Recording timer */}
        {isRecording && (
          <View style={s.recRow}>
            <View style={s.recDot} />
            <Text style={s.recTime}>{formatTime(recordingSecs)}</Text>
            <Text style={s.recLimit}>/ {formatTime(MAX_RECORD_SECS)}</Text>
          </View>
        )}

        {/* Recording progress bar */}
        {isRecording && (
          <View style={s.recTrack} pointerEvents="none">
            <View style={[s.recFill, { width: `${recordProgress}%` as any }]} />
          </View>
        )}

        {/* ── Mode switcher (Photo / Video) ─────────────────────────── */}
        {!isRecording && (
          <View style={s.modeRow}>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'picture' && s.modeBtnActive]}
              onPress={() => setMode('picture')}
              activeOpacity={0.8}
            >
              <Text style={[s.modeBtnText, mode === 'picture' && s.modeBtnTextActive]}>
                Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'video' && s.modeBtnActive]}
              onPress={() => setMode('video')}
              activeOpacity={0.8}
            >
              <Text style={[s.modeBtnText, mode === 'video' && s.modeBtnTextActive]}>
                Video
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bottom controls ───────────────────────────────────────── */}
        <View style={s.bottomBar}>

          {/* Last capture thumbnail / count */}
          <TouchableOpacity
            style={s.thumbBtn}
            disabled={!hasCaptures}
            onPress={() => hasCaptures && onCapture(captures)}
            activeOpacity={0.85}
          >
            {hasCaptures ? (
              <View style={s.thumbWrap}>
                <Image
                  source={{ uri: captures[captures.length - 1].uri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                {captures.length > 1 && (
                  <View style={s.thumbCount}>
                    <Text style={s.thumbCountText}>{captures.length}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.thumbEmpty} />
            )}
          </TouchableOpacity>

          {/* Shutter button */}
          <TouchableOpacity
            style={[
              s.shutter,
              mode === 'video' && (isRecording ? s.shutterRecording : s.shutterVideo),
              (!isCameraReady || isBusy) && s.shutterDisabled,
            ]}
            onPress={handleShutterPress}
            disabled={!isCameraReady || (isBusy && !isRecording)}
            activeOpacity={0.85}
          >
            {mode === 'video' && isRecording ? (
              <View style={s.stopIcon} />
            ) : null}
          </TouchableOpacity>

          {/* Flip camera */}
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() =>
              setFacing((f) => (f === 'back' ? 'front' : 'back'))
            }
            disabled={isRecording}
            activeOpacity={0.8}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={26}
              color={isRecording ? 'rgba(255,255,255,0.3)' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* "Use photos" button — shown when captures exist and not recording */}
        {hasCaptures && !isRecording && (
          <TouchableOpacity
            style={s.useBtn}
            onPress={() => onCapture(captures)}
            activeOpacity={0.85}
          >
            <Text style={s.useBtnText}>
              Use {captures.length} {captures.length === 1 ? 'Item' : 'Items'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}

      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Permission screen
  permWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 14,
    paddingHorizontal: 32,
  },
  closeAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 16,
  },
  permTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, color: neutral[800] },
  permSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    textAlign: 'center',
  },
  permBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 32,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  vibeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: SCREEN_W * 0.5,
  },
  vibeLabelText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#fff',
  },

  // Not ready overlay
  notReady: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  notReadyText: { fontFamily: fontFamily.regular, fontSize: 14, color: '#fff' },

  // Shutter flash
  shutterFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 50,
    pointerEvents: 'none',
  } as any,

  // Recording indicator
  recRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 68,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: semantic.error,
  },
  recTime: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  recLimit: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Recording progress bar — bottom of viewfinder
  recTrack: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  recFill: {
    height: '100%',
    backgroundColor: semantic.error,
    borderRadius: 2,
  },

  // Mode switcher
  modeRow: {
    position: 'absolute',
    bottom: 136,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 18,
  },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontFamily: fontFamily.semibold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: '#000' },

  // Bottom controls
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Thumbnail
  thumbBtn: { width: 56, height: 56 },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbEmpty: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  thumbCount: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  thumbCountText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },

  // Shutter
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterVideo: {
    backgroundColor: semantic.error,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  shutterRecording: {
    backgroundColor: semantic.error,
    borderColor: '#fff',
    borderWidth: 5,
  },
  shutterDisabled: { opacity: 0.4 },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  // Flip
  flipBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Use button
  useBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 148 : 134,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.primary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  useBtnText: { fontFamily: fontFamily.semibold, fontSize: 13, color: '#fff' },
});
