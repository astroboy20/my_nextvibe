/**
 * EditorScreen — React Native equivalent of the Fabric.js canvas editor.
 *
 * Replaces:
 *  • fabric.Canvas          → @shopify/react-native-skia Canvas + makeImageSnapshot
 *  • fabric.Textbox         → Skia <Text> rendered per element, edited via RN TextInput modal
 *  • fabric.Image           → Skia <Image> per element
 *  • drag/scale/rotate      → react-native-gesture-handler PanGestureHandler + PinchGestureHandler
 *  • canvas.toDataURL()     → canvasRef.current.makeImageSnapshot() → base64 → FormData upload
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useCreateVibeTagMutation } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import {
    Canvas,
    Fill,
    Group,
    Image as SkiaImage,
    useCanvasRef,
    useImage,
} from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    GestureHandlerRootView,
    PanGestureHandler,
    PinchGestureHandler,
    State,
} from 'react-native-gesture-handler';
import {
    FONT_OPTIONS,
    PRESET_COLORS,
    STICKER_URLS
} from './TemplateData';
import type { CanvasElement, CanvasTemplate } from './types';

// ── Canvas dimensions (portrait card, same ratio as web 300×600) ──────────────

const SCREEN_W = Dimensions.get('window').width;
const CANVAS_W = Math.min(SCREEN_W - 32, 300);
const CANVAS_H = CANVAS_W * 2; // 1:2 ratio = 600 virtual

// ── ID generator ─────────────────────────────────────────────────────────────

let _id = 0;
function uid() {
  return `el_${Date.now()}_${_id++}`;
}

// ── Individual draggable/pinchable element overlay ────────────────────────────
// We render the interactive handles as RN Views positioned over the Skia canvas.
// Skia draws the visual; the gesture layer sits on top.

// ── Individual draggable/pinchable element overlay ────────────────────────────
// We render the interactive handles as RN Views positioned over the Skia canvas.
// Skia draws the visual; the gesture layer sits on top.

interface ElementHandleProps {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onScale: (factor: number) => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
  onEdit?: () => void;
}

function ElementHandle({ el, isSelected, onSelect, onMove, onScale, onRotate, onDelete, onEdit }: ElementHandleProps) {
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const lastScale = useRef(1);

  const naturalW = el.naturalW ?? 120;
  const naturalH = el.naturalH ?? (el.kind === 'text' ? 40 : 120);
  const dispW = naturalW * el.scale;
  const dispH = naturalH * el.scale;

  // For text elements render an RN Text overlay so the font is visible
  if (el.kind === 'text') {
    const textW = Math.max(dispW, 80);
    const textH = Math.max(dispH, el.fontSize ?? 22 + 10);
    return (
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={panRef}
        onGestureEvent={(e: any) => {
          const factor = e.nativeEvent.scale / lastScale.current;
          lastScale.current = e.nativeEvent.scale;
          onScale(factor);
        }}
        onHandlerStateChange={(e: any) => {
          if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
            lastScale.current = 1;
          }
        }}
      >
        <PanGestureHandler
          ref={panRef}
          simultaneousHandlers={pinchRef}
          onGestureEvent={(e: any) => {
            onMove(e.nativeEvent.translationX, e.nativeEvent.translationY);
          }}
          onHandlerStateChange={(e: any) => {
            if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
              // accumulated pan is tracked in parent
            }
          }}
        >
          <Pressable
            onPress={() => { onSelect(); onEdit?.(); }}
            style={[
              s.elementHandle,
              {
                left: el.x - textW / 2,
                top: el.y - textH / 2,
                width: textW,
                height: textH,
                borderColor: isSelected ? brand.primary : 'transparent',
                borderWidth: isSelected ? 1.5 : 0,
                borderRadius: 4,
              },
            ]}
          >
            {/* Actual text rendered in RN (no font loading required) */}
            <Text
              style={{
                color: el.fontColor ?? '#000000',
                fontSize: (el.fontSize ?? 22) * el.scale,
                fontWeight: '700',
                textAlign: 'center',
                flexShrink: 1,
              }}
              numberOfLines={5}
            >
              {el.text ?? ''}
            </Text>
            {isSelected && (
              <>
                {/* Delete */}
                <TouchableOpacity style={s.deleteHandle} onPress={onDelete} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={semantic.error} />
                </TouchableOpacity>
                {/* Scale up */}
                <TouchableOpacity style={s.scaleUpHandle} onPress={() => onScale(1.1)} hitSlop={8}>
                  <Ionicons name="add-circle" size={22} color={brand.primary} />
                </TouchableOpacity>
                {/* Scale down */}
                <TouchableOpacity style={s.scaleDownHandle} onPress={() => onScale(0.9)} hitSlop={8}>
                  <Ionicons name="remove-circle" size={22} color={brand.primary} />
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </PanGestureHandler>
      </PinchGestureHandler>
    );
  }

  // Image / sticker handle
  return (
    <PinchGestureHandler
      ref={pinchRef}
      simultaneousHandlers={panRef}
      onGestureEvent={(e: any) => {
        const factor = e.nativeEvent.scale / lastScale.current;
        lastScale.current = e.nativeEvent.scale;
        onScale(factor);
      }}
      onHandlerStateChange={(e: any) => {
        if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
          lastScale.current = 1;
        }
      }}
    >
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={(e: any) => {
          onMove(e.nativeEvent.translationX, e.nativeEvent.translationY);
        }}
        onHandlerStateChange={(e: any) => {
          if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
            // accumulated pan is tracked in parent
          }
        }}
      >
        <Pressable
          onPress={() => onSelect()}
          style={[
            s.elementHandle,
            {
              left: el.x - dispW / 2,
              top:  el.y - dispH / 2,
              width: dispW,
              height: dispH,
              borderColor: isSelected ? brand.primary : 'transparent',
              borderWidth: isSelected ? 1.5 : 0,
              borderRadius: 4,
            },
          ]}
        >
          {isSelected && (
            <>
              {/* Delete — top-right */}
              <TouchableOpacity style={s.deleteHandle} onPress={onDelete} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={semantic.error} />
              </TouchableOpacity>
              {/* Scale up — top-left */}
              <TouchableOpacity style={s.scaleUpHandle} onPress={() => onScale(1.15)} hitSlop={8}>
                <Ionicons name="add-circle" size={22} color={brand.primary} />
              </TouchableOpacity>
              {/* Scale down — bottom-left */}
              <TouchableOpacity style={s.scaleDownHandle} onPress={() => onScale(0.85)} hitSlop={8}>
                <Ionicons name="remove-circle" size={22} color={brand.primary} />
              </TouchableOpacity>
              {/* Rotate CW — bottom-right */}
              <TouchableOpacity style={s.rotateCWHandle} onPress={() => onRotate(0.2)} hitSlop={8}>
                <Ionicons name="refresh" size={22} color="#f97316" />
              </TouchableOpacity>
              {/* Rotate CCW — bottom-center */}
              <TouchableOpacity style={s.rotateCCWHandle} onPress={() => onRotate(-0.2)} hitSlop={8}>
                <Ionicons name="refresh-outline" size={22} color="#f97316" />
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </PanGestureHandler>
    </PinchGestureHandler>
  );
}

// ── Skia layer — renders all elements onto the canvas ─────────────────────────

function SkiaLayer({ elements, frameUri }: { elements: CanvasElement[]; frameUri?: string }) {
  const frameImage = useImage(frameUri ?? null);

  return (
    <>
      {/* White background */}
      <Fill color="#ffffff" />

      {/* Elements: images and stickers only — text is rendered as RN overlay */}
      {elements.map((el) => {
        if (el.kind === 'text') return null;
        return <SkiaElementImage key={el.id} el={el} />;
      })}

      {/* Template frame rendered on top */}
      {frameImage && (
        <SkiaImage
          image={frameImage}
          x={0}
          y={0}
          width={CANVAS_W}
          height={CANVAS_H}
          fit="fill"
        />
      )}
    </>
  );
}

// Individual Skia image element
function SkiaElementImage({ el }: { el: CanvasElement }) {
  const img = useImage(el.uri ?? null);
  if (!img) return null;
  const w = (el.naturalW ?? 120) * el.scale;
  const h = (el.naturalH ?? 120) * el.scale;
  const cx = el.x;
  const cy = el.y;
  const rad = el.rotation ?? 0;
  return (
    <Group
      transform={[
        { translateX: cx },
        { translateY: cy },
        { rotate: rad },
        { translateX: -w / 2 },
        { translateY: -h / 2 },
      ]}
    >
      <SkiaImage image={img} x={0} y={0} width={w} height={h} fit="contain" />
    </Group>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

const DUMMY_BG_POOL = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=85',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=85',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&q=85',
];

function PreviewModal({
  visible,
  snapshotUri,
  onClose,
}: {
  visible: boolean;
  snapshotUri: string | null;
  onClose: () => void;
}) {
  const [bgIdx, setBgIdx] = useState(0);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <Text style={pm.title}>Preview</Text>
          <Text style={pm.hint}>
            The background below is a dummy — shows how it will look on a real photo.
          </Text>
          <View style={pm.composite}>
            <Image source={{ uri: DUMMY_BG_POOL[bgIdx] }} style={pm.bg} resizeMode="cover" />
            {snapshotUri && (
              <Image
                source={{ uri: snapshotUri }}
                style={[pm.bg, { opacity: 0.82 }]}
                resizeMode="cover"
              />
            )}
          </View>
          <TouchableOpacity
            style={pm.swapBtn}
            onPress={() => setBgIdx((i) => (i + 1) % DUMMY_BG_POOL.length)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={14} color={brand.primary} />
            <Text style={pm.swapBtnText}>Try another background</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pm.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={pm.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Text editor modal ─────────────────────────────────────────────────────────

function TextEditorModal({
  visible,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initial: { text: string; color: string; fontSize: number };
  onConfirm: (text: string, color: string, fontSize: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial.text);
  const [color, setColor] = useState(initial.color);
  const [size, setSize] = useState(initial.fontSize);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={te.overlay}>
        <View style={te.sheet}>
          <Text style={te.title}>Edit Text</Text>
          <TextInput
            style={[te.input, { color, fontSize: Math.min(size, 28) }]}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder="Enter your text…"
            placeholderTextColor={neutral[400]}
          />
          <Text style={te.sectionLabel}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={te.colorRow}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  te.colorDot,
                  { backgroundColor: c },
                  color === c && te.colorDotActive,
                  c === '#ffffff' && { borderColor: neutral[200], borderWidth: 1 },
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </ScrollView>
          <Text style={te.sectionLabel}>Size</Text>
          <View style={te.sizeRow}>
            {[16, 20, 24, 28, 36, 44].map((sz) => (
              <TouchableOpacity
                key={sz}
                style={[te.sizeBtn, size === sz && te.sizeBtnActive]}
                onPress={() => setSize(sz)}
              >
                <Text style={[te.sizeBtnText, size === sz && te.sizeBtnTextActive]}>
                  {sz}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={te.actions}>
            <TouchableOpacity style={te.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={te.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={te.confirmBtn}
              onPress={() => onConfirm(text, color, size)}
              activeOpacity={0.8}
            >
              <Text style={te.confirmBtnText}>Add to Canvas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Font picker modal ─────────────────────────────────────────────────────────

function FontPickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (font: (typeof FONT_OPTIONS)[0]) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fp.overlay}>
        <View style={fp.sheet}>
          <View style={fp.header}>
            <Text style={fp.title}>Choose a Text Style</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={neutral[500]} />
            </TouchableOpacity>
          </View>
          <Text style={fp.hint}>Tap a style to add it to the canvas</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={fp.grid}>
              {FONT_OPTIONS.map((font) => {
                const dark = font.color === '#ffffff' || font.color === '#39ff14' || font.color === '#bf5fff';
                return (
                  <TouchableOpacity
                    key={font.name}
                    style={[fp.card, { backgroundColor: dark ? '#1a1a2e' : '#f8f8f8' }]}
                    onPress={() => onSelect(font)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: font.color,
                        fontSize: 17,
                        fontWeight: font.bold ? '700' : '400',
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {font.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Sticker picker modal ──────────────────────────────────────────────────────

function StickerPickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (uri: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sp.overlay}>
        <View style={sp.sheet}>
          <View style={sp.header}>
            <Text style={sp.title}>Add Sticker</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={neutral[500]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={STICKER_URLS}
            numColumns={4}
            columnWrapperStyle={sp.row}
            keyExtractor={(item) => item.url}
            renderItem={({ item }) => (
              <TouchableOpacity style={sp.stickerBtn} onPress={() => onSelect(item.url)} activeOpacity={0.8}>
                <Image source={{ uri: item.url }} style={sp.stickerImg} resizeMode="contain" />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main EditorScreen ─────────────────────────────────────────────────────────

interface Props {
  template: CanvasTemplate | null;
  activityTiming: string;
  eventId: string;
  eventName?: string | null;
  onSaved: (meta: { paymentRequired: boolean; vibeTagId?: string }) => void;
  onBack: () => void;
}

export default function EditorScreen({
  template,
  activityTiming,
  eventId,
  eventName,
  onSaved,
  onBack,
}: Props) {
  const canvasRef = useCanvasRef();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Track accumulated pan offset per element to avoid position jumping
  const panOffsets = useRef<Record<string, { x: number; y: number }>>({});

  // Modals
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingEl, setEditingEl] = useState<CanvasElement | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);

  const [createVibeTag, { isLoading: isSaving }] = useCreateVibeTagMutation();

  // ── Element mutations ────────────────────────────────────────────────────

  const addElement = useCallback((el: CanvasElement) => {
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
    panOffsets.current[el.id] = { x: 0, y: 0 };
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const bringForward = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }, [selectedId]);

  const sendBackward = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === selectedId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      [copy[idx], copy[idx - 1]] = [copy[idx - 1], copy[idx]];
      return copy;
    });
  }, [selectedId]);

  // ── Add text ─────────────────────────────────────────────────────────────

  const handleFontSelect = (font: (typeof FONT_OPTIONS)[0]) => {
    setShowFontPicker(false);
    const el: CanvasElement = {
      id: uid(),
      kind: 'text',
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      scale: 1,
      rotation: 0,
      text: 'Tap to edit',
      fontSize: font.size,
      fontColor: font.color,
      naturalW: 160,
      naturalH: font.size + 10,
    };
    addElement(el);
    // Open text editor right away
    setEditingEl(el);
    setShowTextEditor(true);
  };

  const handleTextConfirm = (text: string, color: string, size: number) => {
    setShowTextEditor(false);
    if (!editingEl) return;
    updateElement(editingEl.id, {
      text,
      fontColor: color,
      fontSize: size,
      naturalH: size + 10,
    });
    setEditingEl(null);
  };

  const openTextEdit = (el: CanvasElement) => {
    setEditingEl(el);
    setShowTextEditor(true);
  };

  // ── Add sticker ──────────────────────────────────────────────────────────

  const handleStickerSelect = (uri: string) => {
    setShowStickers(false);
    addElement({
      id: uid(),
      kind: 'sticker',
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      scale: 1,
      rotation: 0,
      uri,
      naturalW: 100,
      naturalH: 100,
    });
  };

  // ── Upload image from device ─────────────────────────────────────────────

  const handleUploadImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    addElement({
      id: uid(),
      kind: 'image',
      x: CANVAS_W / 2,
      y: CANVAS_H / 3,
      scale: 1,
      rotation: 0,
      uri: asset.uri,
      naturalW: Math.min(asset.width ?? 200, CANVAS_W * 0.8),
      naturalH: Math.min(asset.height ?? 200, CANVAS_H * 0.5),
    });
  };

  // ── Preview ──────────────────────────────────────────────────────────────

  const handlePreview = () => {
    const snapshot = canvasRef.current?.makeImageSnapshot();
    if (snapshot) {
      const b64 = snapshot.encodeToBase64();
      setSnapshotUri(`data:image/png;base64,${b64}`);
    }
    setShowPreview(true);
  };

  // ── Save / upload ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    const snapshot = canvasRef.current?.makeImageSnapshot();
    if (!snapshot) {
      Alert.alert('Error', 'Could not capture canvas. Please try again.');
      return;
    }

    const b64 = snapshot.encodeToBase64();
    const mimeType = 'image/png';
    const fileName = `vibetag_${Date.now()}.png`;

    // Build FormData — the backend expects an image upload via imageKey
    const formData = new FormData();
    formData.append('imageKey', {
      uri: `data:${mimeType};base64,${b64}`,
      name: fileName,
      type: mimeType,
    } as any);
    formData.append('activityTiming', activityTiming);
    if (eventName) formData.append('name', eventName);

    try {
      const res = await createVibeTag({
        eventId,
        name: eventName,
        imageKey: b64, // API may accept base64 or we adjust here
        activityTiming,
      }).unwrap();

      const paymentRequired = res?.data?.paymentRequired ?? false;
      onSaved({ paymentRequired, vibeTagId: res?.data?.id });
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Failed to create VibeTag. Please try again.');
    }
  };

  // ── Gesture handlers for each element ────────────────────────────────────

  const handleMove = useCallback(
    (id: string, dx: number, dy: number) => {
      const offset = panOffsets.current[id] ?? { x: 0, y: 0 };
      updateElement(id, {
        x: (elements.find((e) => e.id === id)?.x ?? 0) + dx - offset.x,
        y: (elements.find((e) => e.id === id)?.y ?? 0) + dy - offset.y,
      });
      panOffsets.current[id] = { x: dx, y: dy };
    },
    [elements, updateElement]
  );

  const handleScale = useCallback(
    (id: string, factor: number) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      updateElement(id, { scale: Math.max(0.2, Math.min(el.scale * factor, 5)) });
    },
    [elements, updateElement]
  );

  const handleRotate = useCallback(
    (id: string, delta: number) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      updateElement(id, { rotation: el.rotation + delta });
    },
    [elements, updateElement]
  );

  const selectedEl = elements.find((e) => e.id === selectedId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.root}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Canvas area ── */}
        <View style={s.canvasWrap}>
          {/* Skia draws everything */}
          <Canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H }}>
            <SkiaLayer elements={elements} frameUri={template?.frame ?? undefined} />
          </Canvas>

          {/* Gesture/selection overlay — sits exactly over the Skia canvas */}
          <View style={[StyleSheet.absoluteFill, { width: CANVAS_W, height: CANVAS_H }]}
            pointerEvents="box-none"
          >
            {/* Deselect tap on empty canvas */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedId(null)}
            />
            {elements.map((el) => (
              <ElementHandle
                key={el.id}
                el={el}
                isSelected={selectedId === el.id}
                onSelect={() => setSelectedId(el.id)}
                onMove={(dx, dy) => handleMove(el.id, dx, dy)}
                onScale={(f) => handleScale(el.id, f)}
                onRotate={(delta) => handleRotate(el.id, delta)}
                onDelete={() => {
                  setElements((p) => p.filter((e) => e.id !== el.id));
                  setSelectedId(null);
                }}
                onEdit={() => openTextEdit(el)}
              />
            ))}
          </View>
        </View>

        {/* ── Tool buttons ── */}
        <View style={s.toolGrid}>
          {[
            { id: 'text',    icon: 'text-outline',    label: 'Add Text',    onPress: () => setShowFontPicker(true) },
            { id: 'sticker', icon: 'happy-outline',   label: 'Stickers',    onPress: () => setShowStickers(true) },
            { id: 'image',   icon: 'image-outline',   label: 'Upload Image',onPress: handleUploadImage },
            { id: 'preview', icon: 'eye-outline',     label: 'Preview',     onPress: handlePreview },
          ].map((btn) => (
            <TouchableOpacity key={btn.id} style={s.toolBtn} onPress={btn.onPress} activeOpacity={0.8}>
              <Ionicons name={btn.icon as any} size={22} color={neutral[700]} />
              <Text style={s.toolBtnLabel}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Selected element actions ── */}
        {selectedEl && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: CANVAS_W }}>
            <View style={s.actionRow}>
              {selectedEl.kind === 'text' && (
                <TouchableOpacity style={s.actionBtn} onPress={() => openTextEdit(selectedEl)} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={16} color={brand.primary} />
                  <Text style={s.actionBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={bringForward} activeOpacity={0.8}>
                <Ionicons name="chevron-up-outline" size={16} color={neutral[600]} />
                <Text style={s.actionBtnText}>Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={sendBackward} activeOpacity={0.8}>
                <Ionicons name="chevron-down-outline" size={16} color={neutral[600]} />
                <Text style={s.actionBtnText}>Back</Text>
              </TouchableOpacity>
              {selectedEl.kind !== 'text' && (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleScale(selectedEl.id, 1.15)} activeOpacity={0.8}>
                    <Ionicons name="add-outline" size={16} color={neutral[600]} />
                    <Text style={s.actionBtnText}>Bigger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleScale(selectedEl.id, 0.85)} activeOpacity={0.8}>
                    <Ionicons name="remove-outline" size={16} color={neutral[600]} />
                    <Text style={s.actionBtnText}>Smaller</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleRotate(selectedEl.id, 0.3)} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={16} color="#f97316" />
                    <Text style={s.actionBtnText}>Rotate →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleRotate(selectedEl.id, -0.3)} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={16} color="#f97316" />
                    <Text style={s.actionBtnText}>← Rotate</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={removeSelected} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color={semantic.error} />
                <Text style={[s.actionBtnText, { color: semantic.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Save VibeTag</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={s.backBtnText}>← Back to Templates</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modals ── */}
      <FontPickerModal
        visible={showFontPicker}
        onSelect={handleFontSelect}
        onClose={() => setShowFontPicker(false)}
      />

      <TextEditorModal
        visible={showTextEditor}
        initial={{
          text: editingEl?.text ?? '',
          color: editingEl?.fontColor ?? '#000000',
          fontSize: editingEl?.fontSize ?? 22,
        }}
        onConfirm={handleTextConfirm}
        onClose={() => { setShowTextEditor(false); setEditingEl(null); }}
      />

      <StickerPickerModal
        visible={showStickers}
        onSelect={handleStickerSelect}
        onClose={() => setShowStickers(false)}
      />

      <PreviewModal
        visible={showPreview}
        snapshotUri={snapshotUri}
        onClose={() => setShowPreview(false)}
      />
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { alignItems: 'center', paddingBottom: 60, gap: 16, paddingTop: 8 },
  canvasWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: neutral[200],
    width: CANVAS_W,
    height: CANVAS_H,
  },
  elementHandle: {
    position: 'absolute',
  },
  deleteHandle: {
    position: 'absolute',
    top: -11,
    right: -11,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  scaleUpHandle: {
    position: 'absolute',
    top: -11,
    left: -11,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  scaleDownHandle: {
    position: 'absolute',
    bottom: -11,
    left: -11,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  rotateCWHandle: {
    position: 'absolute',
    bottom: -11,
    right: -11,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  rotateCCWHandle: {
    position: 'absolute',
    bottom: -11,
    right: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: CANVAS_W,
  },
  toolBtn: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  toolBtnLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[700],
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  actionBtnDanger: { borderColor: `${semantic.error}40` },
  actionBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[600],
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: CANVAS_W,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: '#fff',
  },
  backBtn: { paddingVertical: 6 },
  backBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
});

// ── Preview modal styles ──────────────────────────────────────────────────────

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_W - 40,
    alignItems: 'center',
    gap: 12,
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    textAlign: 'center',
    lineHeight: 16,
  },
  composite: {
    width: 200,
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: neutral[200],
  },
  bg: { ...StyleSheet.absoluteFillObject },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${brand.primary}30`,
    backgroundColor: `${brand.primary}06`,
  },
  swapBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: brand.primary },
  closeBtn: {
    width: '100%',
    backgroundColor: neutral[100],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
});

// ── Text editor modal styles ──────────────────────────────────────────────────

const te = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontFamily: fontFamily.regular,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorRow: { flexGrow: 0 },
  colorDot: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  colorDotActive: { borderWidth: 3, borderColor: brand.primary },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: '#fff',
  },
  sizeBtnActive: { borderColor: brand.primary, backgroundColor: `${brand.primary}10` },
  sizeBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: neutral[600] },
  sizeBtnTextActive: { color: brand.primary },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: brand.primary,
    alignItems: 'center',
  },
  confirmBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// ── Font picker modal styles ──────────────────────────────────────────────────

const fp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  hint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500], marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: neutral[200],
    overflow: 'hidden',
  },
});

// ── Sticker picker styles ─────────────────────────────────────────────────────

const sp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  row: { gap: 10, marginBottom: 10 },
  stickerBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  stickerImg: { width: '100%', height: '100%' },
});
