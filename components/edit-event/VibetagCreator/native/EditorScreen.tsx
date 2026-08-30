/**
 * EditorScreen — Native Skia canvas editor for VibeTag creation.
 *
 * Canvas logical size: 1080 × 1920 px (9:16 portrait).
 * Displayed scaled-down to fit the screen; snapshot always exports full size.
 *
 * Fixes:
 *  1. remove.bg API key from EXPO_PUBLIC_REMOVE_BG_API_KEY env var
 *  2. Toast works correctly (deferred after modal close)
 *  3. Icons visible — element handles use proper zIndex + hitSlop
 *  4. Fonts loaded via Skia useFont for real styled text on canvas
 *  5. Free W+H resize independently
 *  6. Preview captures everything (text rendered in Skia)
 *  7. Always exports PNG
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily as appFontFamily, fontSize } from '@/constants/Typography';
import { useCreateVibeTagMutation } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import {
    Canvas,
    Fill,
    Group,
    Image as SkiaImage,
    Text as SkiaText,
    matchFont,
    useCanvasRef,
    useFont,
    useImage
} from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import Toast from 'react-native-toast-message';
import {
    FONT_OPTIONS,
    PRESET_COLORS,
    STICKER_URLS,
} from './TemplateData';
import type { CanvasElement, CanvasTemplate } from './types';
import { encode as base64Encode } from 'base-64';

// ── remove.bg API key from env ────────────────────────────────────────────────
const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY ?? '';

// ── Canvas logical dimensions (9:16 portrait) ─────────────────────────────────
const LOGICAL_W = 1080;
const LOGICAL_H = 1920;

const SCREEN_W = Dimensions.get('window').width;
const DISPLAY_W = Math.min(SCREEN_W - 32, 360);
const DISPLAY_H = DISPLAY_W * (LOGICAL_H / LOGICAL_W);
const SCALE = DISPLAY_W / LOGICAL_W;

// ── ID generator ──────────────────────────────────────────────────────────────
let _id = 0;
function uid() { return `el_${Date.now()}_${_id++}`; }

// ── Font style presets (match FONT_OPTIONS names) ─────────────────────────────
// Each preset is what gets applied to the RN text overlay AND Skia canvas text.
const STYLE_PRESETS: Record<string, {
  color: string;
  bold: boolean;
  italic?: boolean;
  shadow?: string;
  outline?: string;
}> = {
  'Classic':   { color: '#000000', bold: false },
  'Bold':      { color: '#000000', bold: true },
  'Elegant':   { color: '#4a2c5e', bold: false },
  'Neon':      { color: '#39ff14', bold: true, shadow: '#39ff14' },
  'Rose':      { color: '#ec4899', bold: false },
  'Gold':      { color: '#f7d060', bold: true },
  'Sky Blue':  { color: '#00d4ff', bold: false },
  'White Pop': { color: '#ffffff', bold: true },
  'Sunset':    { color: '#ff6b35', bold: true },
  'Purple':    { color: '#a855f7', bold: true },
  'Neon Pink': { color: '#ff2d78', bold: true, shadow: '#ff2d78' },
  'Red Bold':  { color: '#e53935', bold: true },
};

// ── Skia canvas layer ─────────────────────────────────────────────────────────

function SkiaLayer({
  elements,
  frameUri,
  regularFont,
  boldFont,
}: {
  elements: CanvasElement[];
  frameUri?: string;
  regularFont: ReturnType<typeof useFont>;
  boldFont: ReturnType<typeof useFont>;
}) {
  const frameImage = useImage(frameUri ?? null);
  return (
    <>
      <Fill color="#ffffff" />
      {elements.map((el) =>
        el.kind === 'text'
          ? <SkiaTextEl key={el.id} el={el} regularFont={regularFont} boldFont={boldFont} />
          : <SkiaImgEl key={el.id} el={el} />
      )}
      {frameImage && (
        <SkiaImage image={frameImage} x={0} y={0} width={LOGICAL_W} height={LOGICAL_H} fit="fill" />
      )}
    </>
  );
}

function SkiaTextEl({
  el,
  regularFont,
  boldFont,
}: {
  el: CanvasElement;
  regularFont: ReturnType<typeof useFont>;
  boldFont: ReturnType<typeof useFont>;
}) {
  const baseFont = el.bold ? boldFont : regularFont;
  // Scale the font size for the logical canvas
  const logicalSize = el.fontSize ?? 64;

  // useFont is a hook so we can't conditionally call it — we use matchFont as fallback
  const fallback = matchFont({
    fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif' }) ?? 'sans-serif',
    fontSize: logicalSize,
    fontWeight: el.bold ? 'bold' : 'normal',
  });

  const font = baseFont ?? fallback;
  if (!font) return null;

  const text = el.text ?? '';
  const w = el.naturalW ?? 600;
  const h = el.naturalH ?? logicalSize + 20;
  const color = el.fontColor ?? '#000000';
  const shadow = (STYLE_PRESETS[el.fontStyle ?? '']?.shadow);

  return (
    <Group
      transform={[
        { translateX: el.x },
        { translateY: el.y },
        { rotate: el.rotation ?? 0 },
        { translateX: -w / 2 },
        { translateY: -h / 2 },
      ]}
    >
      {/* Shadow layer for neon/glow styles */}
      {shadow && (
        <SkiaText
          x={4}
          y={logicalSize}
          text={text}
          font={font}
          color={shadow}
          opacity={0.6}
        />
      )}
      <SkiaText
        x={0}
        y={logicalSize}
        text={text}
        font={font}
        color={color}
      />
    </Group>
  );
}

function SkiaImgEl({ el }: { el: CanvasElement }) {
  const img = useImage(el.uri ?? null);
  if (!img) return null;
  const w = el.naturalW ?? 300;
  const h = el.naturalH ?? 300;
  return (
    <Group
      transform={[
        { translateX: el.x },
        { translateY: el.y },
        { rotate: el.rotation ?? 0 },
        { translateX: -w / 2 },
        { translateY: -h / 2 },
      ]}
    >
      {/* fill = stretch to exact W×H with no whitespace letterboxing */}
      <SkiaImage image={img} x={0} y={0} width={w} height={h} fit="fill" />
    </Group>
  );
}

// ── Resize directions ─────────────────────────────────────────────────────────
type ResizeDir = 'nw' | 'ne' | 'se' | 'sw';

// ── Draggable resize corner ────────────────────────────────────────────────────
// Each corner pan gesture adjusts W and H independently as you drag.
// SE corner → drag right = wider, drag down = taller (free resize)
// SW corner → drag left = wider, drag down = taller
// NE/NW corners mirror the same logic but from the other axis.

interface ResizeCornerProps {
  dir: ResizeDir;
  onResize: (dir: ResizeDir, dw: number, dh: number) => void;
  style: object;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function ResizeCorner({ dir, onResize, style, icon, color }: ResizeCornerProps) {
  const lastPan = useRef({ x: 0, y: 0 });
  return (
    <PanGestureHandler
      onGestureEvent={(e: any) => {
        const rawDx = e.nativeEvent.translationX - lastPan.current.x;
        const rawDy = e.nativeEvent.translationY - lastPan.current.y;
        lastPan.current = { x: e.nativeEvent.translationX, y: e.nativeEvent.translationY };
        // Convert display-space delta → logical-space delta
        const ldx = rawDx / SCALE;
        const ldy = rawDy / SCALE;
        // Determine W/H change by corner direction
        let dw = 0;
        let dh = 0;
        if (dir === 'se') { dw = ldx;  dh = ldy; }
        if (dir === 'sw') { dw = -ldx; dh = ldy; }
        if (dir === 'ne') { dw = ldx;  dh = -ldy; }
        if (dir === 'nw') { dw = -ldx; dh = -ldy; }
        onResize(dir, dw, dh);
      }}
      onHandlerStateChange={(e: any) => {
        if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
          lastPan.current = { x: 0, y: 0 };
        }
      }}
    >
      {/* PanGestureHandler requires a single native child */}
      <View style={[sh.cornerHandle, style]} hitSlop={12}>
        <View style={sh.iconBg}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
    </PanGestureHandler>
  );
}

// ── Element gesture + selection handle ───────────────────────────────────────

interface ElementHandleProps {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onResize: (dir: ResizeDir, dw: number, dh: number) => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
  onEdit?: () => void;
}

function ElementHandle({
  el, isSelected, onSelect, onMove, onResize, onRotate, onDelete, onEdit,
}: ElementHandleProps) {
  const movePanRef = useRef(null);
  const pinchRef = useRef(null);
  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });

  const dispW = (el.naturalW ?? 300) * SCALE;
  const dispH = (el.naturalH ?? (el.kind === 'text' ? (el.fontSize ?? 64) + 16 : 300)) * SCALE;
  const dispX = el.x * SCALE - dispW / 2;
  const dispY = el.y * SCALE - dispH / 2;

  return (
    // Outer container — absolutely positioned, overflow visible so corner handles
    // can poke outside the element bounds. pointerEvents="box-none" means the
    // View itself doesn't swallow touches — only its children do.
    <View
      style={[
        sh.handle,
        {
          left: dispX,
          top: dispY,
          width: Math.max(dispW, 40),
          height: Math.max(dispH, 40),
        },
      ]}
      pointerEvents="box-none"
    >
      {/* ── Move / pinch layer ── */}
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={movePanRef}
        onGestureEvent={(e: any) => {
          const factor = e.nativeEvent.scale / lastScale.current;
          lastScale.current = e.nativeEvent.scale;
          // Pinch = proportional scale (keeps aspect ratio)
          const curW = el.naturalW ?? 300;
          const curH = el.naturalH ?? 300;
          onResize('se', curW * (factor - 1) * 0.5, curH * (factor - 1) * 0.5);
        }}
        onHandlerStateChange={(e: any) => {
          if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
            lastScale.current = 1;
          }
        }}
      >
        <PanGestureHandler
          ref={movePanRef}
          simultaneousHandlers={pinchRef}
          onGestureEvent={(e: any) => {
            const dx = (e.nativeEvent.translationX - lastPan.current.x) / SCALE;
            const dy = (e.nativeEvent.translationY - lastPan.current.y) / SCALE;
            lastPan.current = { x: e.nativeEvent.translationX, y: e.nativeEvent.translationY };
            onMove(dx, dy);
          }}
          onHandlerStateChange={(e: any) => {
            if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
              lastPan.current = { x: 0, y: 0 };
            }
          }}
        >
          <Pressable
            onPress={() => {
              if (!isSelected) {
                // First tap — just select
                onSelect();
              } else if (el.kind === 'text') {
                // Second tap on already-selected text — open editor
                onEdit?.();
              }
            }}
            style={[
              sh.movable,
              {
                width: Math.max(dispW, 40),
                height: Math.max(dispH, 40),
                borderColor: isSelected ? brand.primary : 'transparent',
                borderWidth: isSelected ? 1.5 : 0,
              },
            ]}
          >
            {/* Text preview overlay — visible but not blocking gestures */}
            {el.kind === 'text' && (
              <Text
                style={{
                  color: el.fontColor ?? '#000000',
                  fontSize: Math.max(Math.round((el.fontSize ?? 64) * SCALE), 10),
                  fontWeight: el.bold ? '700' : '400',
                  textAlign: 'center',
                  flexShrink: 1,
                }}
                numberOfLines={4}
                pointerEvents="none"
              >
                {el.text ?? ''}
              </Text>
            )}
          </Pressable>
        </PanGestureHandler>
      </PinchGestureHandler>

      {/* ── Selection controls (only when selected) ── */}
      {isSelected && (
        <>
          {/* DELETE — top-right ✕ (tap) */}
          <TouchableOpacity
            style={sh.btn_tr}
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <View style={sh.iconBg}>
              <Ionicons name="close-circle" size={22} color={semantic.error} />
            </View>
          </TouchableOpacity>

          {/* ROTATE — top-left ↻ (tap) */}
          <TouchableOpacity
            style={sh.btn_tl}
            onPress={(e) => { e.stopPropagation(); onRotate(0.2); }}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <View style={sh.iconBg}>
              <Ionicons name="refresh" size={20} color="#f97316" />
            </View>
          </TouchableOpacity>

          {/* EDIT TEXT — centre-right ✏ (tap, text only) */}
          {el.kind === 'text' && (
            <TouchableOpacity
              style={sh.btn_mr}
              onPress={(e) => { e.stopPropagation(); onEdit?.(); }}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <View style={sh.iconBg}>
                <Ionicons name="pencil" size={18} color={brand.primary} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Drag-to-resize corners ──
               SE = drag to freely change W and H
               SW = drag to change W (from left) and H
               NE = drag to change W and H (from top)
               NW = drag to change W (from left) and H (from top)
          */}
          <ResizeCorner
            dir="se"
            onResize={onResize}
            style={sh.btn_br}
            icon="resize"
            color={brand.primary}
          />
          <ResizeCorner
            dir="sw"
            onResize={onResize}
            style={sh.btn_bl}
            icon="resize"
            color={neutral[500]}
          />
          <ResizeCorner
            dir="ne"
            onResize={onResize}
            style={sh.btn_tr2}
            icon="resize"
            color={neutral[500]}
          />
        </>
      )}
    </View>
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
  visible, snapshotUri, onClose,
}: { visible: boolean; snapshotUri: string | null; onClose: () => void }) {
  const [bgIdx, setBgIdx] = useState(0);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <Text style={pm.title}>Preview</Text>
          <Text style={pm.hint}>
            Background is a dummy — shows how it looks on a real photo.
          </Text>
          {snapshotUri ? (
            <View style={pm.composite}>
              <Image source={{ uri: DUMMY_BG_POOL[bgIdx] }} style={pm.bg} resizeMode="cover" />
              <Image source={{ uri: snapshotUri }} style={[pm.bg, { opacity: 0.92 }]} resizeMode="contain" />
            </View>
          ) : (
            <View style={[pm.composite, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color={brand.primary} />
              <Text style={{ marginTop: 8, color: neutral[500], fontSize: 12 }}>Generating preview…</Text>
            </View>
          )}
          <TouchableOpacity style={pm.swapBtn} onPress={() => setBgIdx((i) => (i + 1) % DUMMY_BG_POOL.length)} activeOpacity={0.8}>
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
  visible, initial, onConfirm, onClose,
}: {
  visible: boolean;
  initial: { text: string; color: string; fontSize: number };
  onConfirm: (text: string, color: string, fontSize: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial.text);
  const [color, setColor] = useState(initial.color);
  const [size, setSize] = useState(initial.fontSize);

  React.useEffect(() => {
    if (visible) {
      setText(initial.text);
      setColor(initial.color);
      setSize(initial.fontSize);
    }
  }, [visible, initial.text, initial.color, initial.fontSize]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={te.overlay}>
        <View style={te.sheet}>
          <Text style={te.title}>Edit Text</Text>
          <TextInput
            style={[te.input, { color, fontSize: Math.max(Math.round(size * SCALE), 14) }]}
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
                  c === '#ffffff' && { borderColor: neutral[300], borderWidth: 1 },
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </ScrollView>
          <Text style={te.sectionLabel}>Size</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={te.sizeRow}>
              {[48, 64, 80, 96, 120, 160, 200].map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[te.sizeBtn, size === sz && te.sizeBtnActive]}
                  onPress={() => setSize(sz)}
                >
                  <Text style={[te.sizeBtnText, size === sz && te.sizeBtnTextActive]}>{sz}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={te.actions}>
            <TouchableOpacity style={te.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={te.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={te.confirmBtn} onPress={() => onConfirm(text, color, size)} activeOpacity={0.8}>
              <Text style={te.confirmBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Font picker modal ─────────────────────────────────────────────────────────

function FontPickerModal({
  visible, onSelect, onClose,
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
                const preset = STYLE_PRESETS[font.name] ?? {};
                const isDark = preset.color === '#ffffff' || preset.color === '#39ff14'
                  || preset.color === '#bf5fff' || preset.color === '#ff2d78';
                return (
                  <TouchableOpacity
                    key={font.name}
                    style={[
                      fp.card,
                      { backgroundColor: isDark ? '#1a1a2e' : '#f8f8f8' },
                      preset.shadow ? { borderColor: preset.color, borderWidth: 1 } : {},
                    ]}
                    onPress={() => onSelect(font)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: preset.color ?? font.color,
                        fontSize: 17,
                        fontWeight: font.bold ? '700' : '400',
                        textAlign: 'center',
                        textShadowColor: preset.shadow ?? 'transparent',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: preset.shadow ? 8 : 0,
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
  visible, onSelect, onClose,
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

// ── Image upload options modal ────────────────────────────────────────────────

function ImageUploadModal({
  visible, onPickNormal, onPickWithBgRemoval, isProcessing, onClose,
}: {
  visible: boolean;
  onPickNormal: () => void;
  onPickWithBgRemoval: () => void;
  isProcessing: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={iu.overlay}>
        <View style={iu.sheet}>
          <View style={iu.header}>
            <Text style={iu.title}>Upload Image</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={neutral[500]} />
            </TouchableOpacity>
          </View>
          <Text style={iu.hint}>Choose how to add your image to the canvas.</Text>

          {/* Normal upload */}
          <TouchableOpacity style={iu.optionBtn} onPress={onPickNormal} activeOpacity={0.8} disabled={isProcessing}>
            <View style={iu.optionIcon}>
              <Ionicons name="image-outline" size={22} color={brand.primary} />
            </View>
            <View style={iu.optionText}>
              <Text style={iu.optionTitle}>Upload Image</Text>
              <Text style={iu.optionDesc}>Add your photo as-is (PNG/JPG)</Text>
            </View>
          </TouchableOpacity>

          {/* Remove background */}
          <TouchableOpacity
            style={[iu.optionBtn, isProcessing && { opacity: 0.6 }]}
            onPress={onPickWithBgRemoval}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <View style={[iu.optionIcon, { backgroundColor: `${brand.primary}15` }]}>
              {isProcessing
                ? <ActivityIndicator size="small" color={brand.primary} />
                : <Ionicons name="cut-outline" size={22} color={brand.primary} />
              }
            </View>
            <View style={iu.optionText}>
              <Text style={iu.optionTitle}>Remove Background (PNG)</Text>
              <Text style={iu.optionDesc}>
                {isProcessing
                  ? 'Removing background… please wait'
                  : 'Background auto-removed — uploads as transparent PNG'}
              </Text>
            </View>
          </TouchableOpacity>
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
  template, activityTiming, eventId, eventName, onSaved, onBack,
}: Props) {
  const canvasRef = useCanvasRef();

  // Load Nunito Sans fonts into Skia for canvas text rendering
  const regularFont = useFont(
    require('@/assets/fonts/NunitoSans_400Regular.ttf'),
    64
  );
  const boldFont = useFont(
    require('@/assets/fonts/NunitoSans_700Bold.ttf'),
    64
  );

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [editingEl, setEditingEl] = useState<CanvasElement | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const [createVibeTag, { isLoading: isSaving }] = useCreateVibeTagMutation();

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addElement = useCallback((el: CanvasElement) => {
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
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

  const handleMove = useCallback((id: string, dx: number, dy: number) => {
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, x: e.x + dx, y: e.y + dy } : e));
  }, []);

  const handleResize = useCallback((id: string, _dir: ResizeDir, dw: number, dh: number) => {
    setElements((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      return {
        ...e,
        naturalW: Math.max(40, (e.naturalW ?? 300) + dw),
        naturalH: Math.max(20, (e.naturalH ?? 300) + dh),
      };
    }));
  }, []);

  const handleRotate = useCallback((id: string, delta: number) => {
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, rotation: (e.rotation ?? 0) + delta } : e));
  }, []);

  // ── Add text ───────────────────────────────────────────────────────────────

  const handleFontSelect = (font: (typeof FONT_OPTIONS)[0]) => {
    setShowFontPicker(false);
    const preset = STYLE_PRESETS[font.name] ?? {};
    const el: CanvasElement = {
      id: uid(),
      kind: 'text',
      x: LOGICAL_W / 2,
      y: LOGICAL_H / 2,
      scale: 1,
      rotation: 0,
      text: 'Tap to edit',
      fontSize: font.size,
      fontColor: preset.color ?? font.color,
      bold: preset.bold ?? font.bold,
      fontStyle: font.name,
      naturalW: 700,
      naturalH: font.size + 30,
    };
    addElement(el);
    setEditingEl(el);
    setShowTextEditor(true);
  };

  const handleTextConfirm = (text: string, color: string, size: number) => {
    setShowTextEditor(false);
    if (!editingEl) return;
    updateElement(editingEl.id, { text, fontColor: color, fontSize: size, naturalH: size + 30 });
    setEditingEl(null);
  };

  const openTextEdit = (el: CanvasElement) => {
    setEditingEl(el);
    setShowTextEditor(true);
  };

  // ── Add sticker ────────────────────────────────────────────────────────────

  const handleStickerSelect = (uri: string) => {
    setShowStickers(false);
    addElement({
      id: uid(), kind: 'sticker',
      x: LOGICAL_W / 2, y: LOGICAL_H / 2,
      scale: 1, rotation: 0, uri,
      naturalW: 240, naturalH: 240,
    });
  };

  // ── Image picker helper ────────────────────────────────────────────────────

  const pickImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow photo library access to upload images.' });
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.95,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0];
  };

  // ── Normal upload ──────────────────────────────────────────────────────────

  const handleUploadNormal = async () => {
    setShowImageUpload(false);
    const asset = await pickImage();
    if (!asset) return;
    const w = Math.min(asset.width ?? 600, LOGICAL_W * 0.8);
    const h = asset.height && asset.width ? (w / asset.width) * asset.height : w;
    addElement({
      id: uid(), kind: 'image',
      x: LOGICAL_W / 2, y: LOGICAL_H / 3,
      scale: 1, rotation: 0, uri: asset.uri,
      naturalW: w, naturalH: h,
    });
    Toast.show({ type: 'success', text1: 'Image added', text2: 'Drag and resize it on the canvas.' });
  };

  // ── Background removal upload ──────────────────────────────────────────────



const handleUploadWithBgRemoval = async () => {
  setShowImageUpload(false);
  const asset = await pickImage();
  if (!asset) return;

  if (!REMOVE_BG_API_KEY) {
    Toast.show({ type: 'error', text1: 'Missing API key', text2: 'EXPO_PUBLIC_REMOVE_BG_API_KEY not set.' });
    return;
  }

  setIsRemovingBg(true);

  try {
    // remove.bg file upload — React Native supports { uri, name, type } in FormData
    const formData = new FormData();
    formData.append('image_file', {
      uri: asset.uri,
      name: `photo_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as any);
    formData.append('size', 'auto');
    formData.append('format', 'auto');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Accept': 'application/json', // this is what actually gets us the JSON/base64 envelope
        // Do NOT set Content-Type — fetch sets multipart boundary automatically
      },
      body: formData,
    });

    let errMsg = `HTTP ${res.status}`;
    const contentType = res.headers.get('content-type') ?? '';

    if (!res.ok) {
      try {
        const errJson = await res.json();
        errMsg = errJson?.errors?.[0]?.title ?? errJson?.message ?? errMsg;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    let pngUri: string;

    if (contentType.includes('application/json')) {
      // JSON response contains base64 result
      const json = await res.json();
      const b64 = json?.data?.result_b64 ?? json?.result_b64;
      if (!b64) throw new Error('No image data in response.');
      pngUri = `data:image/png;base64,${b64}`;
    } else {
      // Binary PNG response — convert using Uint8Array + base-64 lib in chunks
      // (not relying on global btoa, which isn't guaranteed to exist in Hermes)
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...(bytes.subarray(i, i + chunk) as any));
      }
      pngUri = `data:image/png;base64,${base64Encode(binary)}`;
    }

    const w = Math.min(asset.width ?? 600, LOGICAL_W * 0.8);
    const h = asset.height && asset.width ? (w / asset.width) * asset.height : w;

    addElement({
      id: uid(), kind: 'image',
      x: LOGICAL_W / 2, y: LOGICAL_H / 3,
      scale: 1, rotation: 0,
      uri: pngUri,
      naturalW: w, naturalH: h,
    });

    Toast.show({ type: 'success', text1: 'Background removed!', text2: 'Transparent PNG added to canvas.' });
  } catch (err: any) {
    Toast.show({
      type: 'error',
      text1: 'Background removal failed',
      text2: err?.message ?? 'Unknown error. Try uploading the image normally.',
    });
  } finally {
    setIsRemovingBg(false);
  }
};

  // ── Preview ────────────────────────────────────────────────────────────────

  const handlePreview = () => {
    setSnapshotUri(null);
    setShowPreview(true);
    setTimeout(() => {
      try {
        const snapshot = canvasRef.current?.makeImageSnapshot();
        if (!snapshot) {
          Toast.show({ type: 'error', text1: 'Preview failed', text2: 'Could not capture canvas.' });
          setShowPreview(false);
          return;
        }
        setSnapshotUri(`data:image/png;base64,${snapshot.encodeToBase64()}`);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Preview error', text2: String(e?.message ?? e) });
        setShowPreview(false);
      }
    }, 150);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  // Double-tap guard — ref (not state) so it's synchronous
  const isSavingRef = useRef(false);

  const handleSave = async () => {
    if (isSavingRef.current || isSaving || savedSuccessfully) return;
    isSavingRef.current = true;
    try {
      const snapshot = canvasRef.current?.makeImageSnapshot();
      if (!snapshot) {
        Toast.show({ type: 'error', text1: 'Capture failed', text2: 'Could not capture canvas. Please try again.' });
        return;
      }

      const b64 = snapshot.encodeToBase64();

      const res = await createVibeTag({
        eventId,
        name: eventName ?? 'VibeTag',
        imageKey: b64,
        activityTiming,
      }).unwrap();

      const paymentRequired = res?.data?.paymentRequired ?? false;
      const vibeTagId = res?.data?.id;

      // Mark as saved immediately so the button can't be pressed again
      setSavedSuccessfully(true);

      Toast.show({
        type: 'success',
        text1: 'VibeTag saved! 🎉',
        text2: paymentRequired ? 'Payment required to activate.' : 'Your VibeTag is now live.',
        visibilityTime: 3000,
      });

      setTimeout(() => {
        onSaved({ paymentRequired, vibeTagId });
      }, 800);

    } catch (err: any) {
      const msg =
        err?.data?.message ??
        err?.data?.error ??
        err?.error ??
        err?.message ??
        'Failed to save VibeTag. Please try again.';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg, visibilityTime: 5000 });
    } finally {
      isSavingRef.current = false;
    }
  };

  const selectedEl = elements.find((e) => e.id === selectedId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ── remove.bg full-screen loading overlay ── */}
      {isRemovingBg && (
        <View style={s.bgRemoveOverlay} pointerEvents="none">
          <View style={s.bgRemoveCard}>
            <ActivityIndicator color={brand.primary} size="large" />
            <Text style={s.bgRemoveTitle}>Removing background…</Text>
            <Text style={s.bgRemoveHint}>This takes a few seconds, please wait.</Text>
          </View>
        </View>
      )}

      {/* ── Toast rendered inside this screen so it sits above the pageSheet modal ── */}
      <Toast topOffset={60} />

      <ScrollView
        contentContainerStyle={s.root}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Canvas size hint */}
        <View style={s.canvasLabel}>
          <Ionicons name="grid-outline" size={11} color={neutral[400]} />
          <Text style={s.canvasLabelText}>1080 × 1920 (9:16)</Text>
        </View>

        {/* ── Canvas ── */}
        <View style={[s.canvasWrap, { width: DISPLAY_W, height: DISPLAY_H }]}>
          {/* Skia renders ALL elements including text */}
          <Canvas ref={canvasRef} style={{ width: DISPLAY_W, height: DISPLAY_H }}>
            <Group transform={[{ scale: SCALE }]}>
              <SkiaLayer
                elements={elements}
                frameUri={template?.frame ?? undefined}
                regularFont={regularFont}
                boldFont={boldFont}
              />
            </Group>
          </Canvas>

          {/* Gesture + selection overlay — sits on top of Skia */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Tap empty area to deselect */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
            {elements.map((el) => (
              <ElementHandle
                key={el.id}
                el={el}
                isSelected={selectedId === el.id}
                onSelect={() => setSelectedId(el.id)}
                onMove={(dx, dy) => handleMove(el.id, dx, dy)}
                onResize={(dir, dw, dh) => handleResize(el.id, dir, dw, dh)}
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

        {/* ── Tool buttons — 2 per row ── */}
        <View style={s.toolGrid}>
          {([
            { id: 'text',    icon: 'text-outline',   label: 'Add Text',     action: () => setShowFontPicker(true) },
            { id: 'sticker', icon: 'happy-outline',  label: 'Add Sticker',  action: () => setShowStickers(true) },
            { id: 'image',   icon: 'image-outline',  label: 'Upload Image', action: () => setShowImageUpload(true) },
            { id: 'preview', icon: 'eye-outline',    label: 'Preview',      action: handlePreview },
          ] as const).map((btn) => (
            <TouchableOpacity key={btn.id} style={s.toolBtn} onPress={btn.action} activeOpacity={0.8}>
              <Ionicons name={btn.icon} size={20} color={brand.primary} />
              <Text style={s.toolBtnLabel}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Selected element controls ── */}
        {selectedEl && (
          <View style={s.controlsCard}>
            <Text style={s.controlsTitle}>
              {selectedEl.kind === 'text' ? '✏️  Text' : '🖼  Image'} Controls
              {'  '}
              <Text style={{ fontWeight: '400', color: neutral[400] }}>
                · drag corners on canvas to resize freely
              </Text>
            </Text>

            {/* Layer / edit / rotate / delete — all side by side */}
            <View style={s.controlRow}>
              {selectedEl.kind === 'text' && (
                <TouchableOpacity style={s.ctrlBtn} onPress={() => openTextEdit(selectedEl)} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={15} color={brand.primary} />
                  <Text style={[s.ctrlBtnText, { color: brand.primary }]}>Edit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.ctrlBtn} onPress={bringForward} activeOpacity={0.8}>
                <Ionicons name="chevron-up-outline" size={15} color={neutral[600]} />
                <Text style={s.ctrlBtnText}>Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctrlBtn} onPress={sendBackward} activeOpacity={0.8}>
                <Ionicons name="chevron-down-outline" size={15} color={neutral[600]} />
                <Text style={s.ctrlBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctrlBtn} onPress={() => handleRotate(selectedEl.id, -0.2)} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={15} color="#f97316" />
                <Text style={s.ctrlBtnText}>← Rot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctrlBtn} onPress={() => handleRotate(selectedEl.id, 0.2)} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color="#f97316" />
                <Text style={s.ctrlBtnText}>Rot →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ctrlBtn, s.ctrlDanger]} onPress={removeSelected} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={15} color={semantic.error} />
                <Text style={[s.ctrlBtnText, { color: semantic.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[s.saveBtn, (isSaving || savedSuccessfully) && { opacity: 0.55 }]}
          onPress={handleSave}
          disabled={isSaving || savedSuccessfully}
          activeOpacity={0.8}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" size="small" />
            : savedSuccessfully
            ? <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Saved ✓</Text>
              </>
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Save VibeTag</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back-outline" size={14} color={neutral[500]} />
          <Text style={s.backBtnText}>Back to Templates</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modals ── */}
      <FontPickerModal visible={showFontPicker} onSelect={handleFontSelect} onClose={() => setShowFontPicker(false)} />

      <TextEditorModal
        visible={showTextEditor}
        initial={{ text: editingEl?.text ?? '', color: editingEl?.fontColor ?? '#000000', fontSize: editingEl?.fontSize ?? 64 }}
        onConfirm={handleTextConfirm}
        onClose={() => { setShowTextEditor(false); setEditingEl(null); }}
      />

      <StickerPickerModal visible={showStickers} onSelect={handleStickerSelect} onClose={() => setShowStickers(false)} />

      <ImageUploadModal
        visible={showImageUpload}
        onPickNormal={handleUploadNormal}
        onPickWithBgRemoval={handleUploadWithBgRemoval}
        isProcessing={isRemovingBg}
        onClose={() => setShowImageUpload(false)}
      />

      <PreviewModal visible={showPreview} snapshotUri={snapshotUri} onClose={() => setShowPreview(false)} />
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { alignItems: 'center', paddingBottom: 60, gap: 12, paddingTop: 8 },
  canvasLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  canvasLabelText: { fontFamily: appFontFamily.regular, fontSize: 10, color: neutral[400] },
  canvasWrap: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: neutral[200],
  },
  toolGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: DISPLAY_W,
  },
  toolBtn: {
    width: (DISPLAY_W - 8) / 2,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: `${brand.primary}30`,
    backgroundColor: `${brand.primary}06`,
  },
  toolBtnLabel: { fontFamily: appFontFamily.semibold, fontSize: fontSize.xs, color: brand.primary },
  controlsCard: {
    width: DISPLAY_W, borderRadius: 12, borderWidth: 1,
    borderColor: neutral[200], backgroundColor: '#fff', padding: 12, gap: 8,
  },
  controlsTitle: { fontFamily: appFontFamily.semibold, fontSize: fontSize.xs, color: neutral[600], marginBottom: 2 },
  controlRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ctrlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderColor: neutral[200], backgroundColor: neutral[50],
  },
  ctrlDanger: { borderColor: `${semantic.error}40`, backgroundColor: `${semantic.error}06` },
  ctrlBtnText: { fontFamily: appFontFamily.semibold, fontSize: 11, color: neutral[600] },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: DISPLAY_W, backgroundColor: brand.primary, paddingVertical: 14, borderRadius: 12,
  },
  saveBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: '#fff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  backBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.sm, color: neutral[500] },
  // remove.bg full-screen loading overlay
  bgRemoveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  bgRemoveCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: 260,
  },
  bgRemoveTitle: {
    fontFamily: appFontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  bgRemoveHint: {
    fontFamily: appFontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    textAlign: 'center',
    lineHeight: 17,
  },
});

// ── Element handle styles ─────────────────────────────────────────────────────

const sh = StyleSheet.create({
  // Outer absolutely-positioned wrapper — overflow visible so corners stick out
  handle: {
    position: 'absolute',
    overflow: 'visible',
  },
  // Inner pressable that receives move gestures
  movable: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconBg: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fffffff0',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // Drag-resize corner — plain View (no tap, only pan)
  cornerHandle: {
    position: 'absolute',
    zIndex: 30,
  },
  // Tap-only control positions
  btn_tr:  { position: 'absolute', top: -14,  right: -14, zIndex: 30 },
  btn_tr2: { position: 'absolute', top: -14,  right: 22,  zIndex: 30 }, // NE resize (offset from delete)
  btn_tl:  { position: 'absolute', top: -14,  left: -14,  zIndex: 30 },
  btn_br:  { position: 'absolute', bottom: -14, right: -14, zIndex: 30 }, // SE drag-resize
  btn_bl:  { position: 'absolute', bottom: -14, left: -14,  zIndex: 30 }, // SW drag-resize
  btn_mr:  { position: 'absolute', top: '40%', right: -28, zIndex: 30 }, // text edit
});

// ── Preview modal styles ──────────────────────────────────────────────────────

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: SCREEN_W - 40, alignItems: 'center', gap: 12,
  },
  title: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  hint: { fontFamily: appFontFamily.regular, fontSize: fontSize.xs, color: neutral[500], textAlign: 'center', lineHeight: 16 },
  composite: {
    width: 200, height: Math.min(200 * (LOGICAL_H / LOGICAL_W), 340),
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: neutral[200],
  },
  bg: { ...StyleSheet.absoluteFillObject },
  swapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: `${brand.primary}30`, backgroundColor: `${brand.primary}06`,
  },
  swapBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.xs, color: brand.primary },
  closeBtn: { width: '100%', backgroundColor: neutral[100], paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.sm, color: neutral[700] },
});

// ── Text editor styles ────────────────────────────────────────────────────────

const te = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  title: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  input: {
    borderWidth: 1, borderColor: neutral[200], borderRadius: 10,
    padding: 12, minHeight: 80, fontFamily: appFontFamily.regular, textAlignVertical: 'top',
  },
  sectionLabel: {
    fontFamily: appFontFamily.semibold, fontSize: fontSize.xs, color: neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  colorRow: { flexGrow: 0 },
  colorDot: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  colorDotActive: { borderWidth: 3, borderColor: brand.primary },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: neutral[200], backgroundColor: '#fff',
  },
  sizeBtnActive: { borderColor: brand.primary, backgroundColor: `${brand.primary}10` },
  sizeBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.xs, color: neutral[600] },
  sizeBtnTextActive: { color: brand.primary },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: neutral[200], alignItems: 'center' },
  cancelBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: brand.primary, alignItems: 'center' },
  confirmBtnText: { fontFamily: appFontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

// ── Font picker styles ────────────────────────────────────────────────────────

const fp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  hint: { fontFamily: appFontFamily.regular, fontSize: fontSize.xs, color: neutral[500], marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%', height: 64, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: neutral[200], overflow: 'hidden',
  },
});

// ── Sticker picker styles ─────────────────────────────────────────────────────

const sp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, maxHeight: '50%', paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  row: { gap: 10, marginBottom: 10 },
  stickerBtn: {
    flex: 1, aspectRatio: 1, borderRadius: 12,
    borderWidth: 1, borderColor: neutral[200], backgroundColor: neutral[50],
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  stickerImg: { width: '100%', height: '100%' },
});

// ── Image upload modal styles ─────────────────────────────────────────────────

const iu = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 14, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: appFontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
  hint: { fontFamily: appFontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: neutral[200], backgroundColor: '#fff',
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${brand.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: appFontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  optionDesc: { fontFamily: appFontFamily.regular, fontSize: fontSize.xs, color: neutral[500], lineHeight: 16 },
});
