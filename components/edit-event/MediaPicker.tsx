import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { MediaState } from './types';

//  Flier picker 

interface FlierPickerProps {
  state: MediaState;
  locked: boolean;
  onPick: () => void;
  onRemove: () => void;
}

export function FlierPicker({ state, locked, onPick, onRemove }: FlierPickerProps) {
  const uri = state.uri ?? state.remoteUrl;

  if (state.status === 'uploading') {
    return (
      <View style={[s.placeholder, { height: 96 }]}>
        <ActivityIndicator color={brand.primary} />
        <Text style={s.progressText}>{state.fileName ? `Uploading` : 'Uploading'}</Text>
      </View>
    );
  }

  if (uri) {
    return (
      <View style={s.previewWrap}>
        <Image source={{ uri }} style={s.previewImage} resizeMode="cover" />
        {!locked && (
          <View style={s.previewActions}>
            <TouchableOpacity style={s.previewBtn} onPress={onPick} activeOpacity={0.8}>
              <Ionicons name="image-outline" size={14} color="#fff" />
              <Text style={s.previewBtnText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.previewBtn, s.removeBtn]} onPress={onRemove} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={s.previewBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (locked) {
    return (
      <View style={[s.placeholder, s.lockedPlaceholder]}>
        <Ionicons name="image-outline" size={24} color={neutral[300]} />
        <Text style={[s.placeholderText, { color: neutral[300] }]}>No flyer</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={s.placeholder} onPress={onPick} activeOpacity={0.8}>
      <Ionicons name="cloud-upload-outline" size={28} color={neutral[400]} />
      <Text style={s.placeholderText}>Upload event flyer</Text>
      <Text style={s.placeholderSub}>PNG, JPEG or WebP  max 10 MB</Text>
    </TouchableOpacity>
  );
}

//  Video picker 

interface VideoPickerProps {
  state: MediaState;
  locked: boolean;
  onPick: () => void;
  onRemove: () => void;
}

export function VideoPicker({ state, locked, onPick, onRemove }: VideoPickerProps) {
  if (state.status === 'uploading') {
    return (
      <View style={[s.placeholder, { height: 72 }]}>
        <ActivityIndicator color={brand.primary} />
        <Text style={s.progressText}>Uploading video</Text>
      </View>
    );
  }

  if (state.fileName || state.remoteUrl) {
    const label = state.fileName ?? 'Promotional video';
    return (
      <View style={s.filePicked}>
        <Ionicons name="videocam-outline" size={20} color={brand.primary} />
        <Text style={s.filePickedName} numberOfLines={1}>{label}</Text>
        {!locked && (
          <View style={s.filePickedActions}>
            <TouchableOpacity onPress={onPick} style={s.fileAction} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal-outline" size={16} color={brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRemove} style={s.fileAction} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={16} color={semantic.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (locked) {
    return (
      <View style={[s.placeholder, s.lockedPlaceholder, { height: 72 }]}>
        <Ionicons name="videocam-outline" size={22} color={neutral[300]} />
        <Text style={[s.placeholderText, { color: neutral[300] }]}>No video</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={[s.placeholder, { height: 72 }]} onPress={onPick} activeOpacity={0.8}>
      <Ionicons name="videocam-outline" size={26} color={neutral[400]} />
      <Text style={s.placeholderText}>Upload promo video</Text>
      <Text style={s.placeholderSub}>MP4, MOV or WebM  max 350 MB</Text>
    </TouchableOpacity>
  );
}

//  Styles 

const s = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 130,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  lockedPlaceholder: {
    borderColor: neutral[100],
    backgroundColor: neutral[50],
  },
  placeholderText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  placeholderSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
  },
  progressText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    marginTop: 6,
  },

  // Image preview
  previewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 160,
    backgroundColor: neutral[800],
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  removeBtn: {
    flex: 0,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(239,68,68,0.65)',
  },
  previewBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#fff',
  },

  // File row (video)
  filePicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  filePickedName: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[700],
  },
  filePickedActions: {
    flexDirection: 'row',
    gap: 4,
  },
  fileAction: {
    padding: 4,
  },
});
