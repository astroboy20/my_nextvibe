/**
 * stampOverlay.ts
 *
 * Client-side VibeTag stamping before upload.
 * Uses @shopify/react-native-skia for compositing.
 */

import { ImageFormat, Skia, type SkImage } from '@shopify/react-native-skia';
import * as VideoThumbnails from 'expo-video-thumbnails';

// 9:16 portrait — standard social media
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

export interface StampResult {
  uri: string;
  mimeType: string;
  thumbnailUri?: string | null;
  vibeTagOverlayUrl?: string | null;
}

// ─── Image loader ─────────────────────────────────────────────────────────────

async function uriToSkiaImage(uri: string): Promise<SkImage | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      console.error('[stampOverlay] fetch failed:', response.status, uri.substring(0, 80));
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length === 0) {
      console.error('[stampOverlay] empty response for', uri.substring(0, 80));
      return null;
    }
    const data = Skia.Data.fromBytes(bytes);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) {
      console.error('[stampOverlay] MakeImageFromEncoded returned null for', uri.substring(0, 80));
      return null;
    }
    return image;
  } catch (err) {
    console.error('[stampOverlay] uriToSkiaImage error:', err);
    return null;
  }
}

// ─── Core compositing ─────────────────────────────────────────────────────────

/**
 * Draws photoImg then overlayImg into a 1080×1920 Skia surface (cover-fit both).
 * Returns a base64 data URI or null on failure.
 */
function composite(photoImg: SkImage, overlayImg: SkImage): string | null {
  const surface = Skia.Surface.Make(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (!surface) {
    console.error('[stampOverlay] Surface.Make returned null');
    return null;
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('black'));

  // cover-fit helper
  const drawCover = (img: SkImage) => {
    const sw = img.width();
    const sh = img.height();
    const scale = Math.max(OUTPUT_WIDTH / sw, OUTPUT_HEIGHT / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (OUTPUT_WIDTH - dw) / 2;
    const dy = (OUTPUT_HEIGHT - dh) / 2;
    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale, scale);
    canvas.drawImage(img, 0, 0);
    canvas.restore();
  };

  drawCover(photoImg);
  drawCover(overlayImg);

  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  if (!snapshot) {
    console.error('[stampOverlay] makeImageSnapshot returned null');
    return null;
  }

  // Use PNG (lossless, always works). JPEG encoding in Skia/RN can return null.
  const encoded = snapshot.encodeToBase64(ImageFormat.PNG, 100);
  if (!encoded) {
    console.error('[stampOverlay] encodeToBase64 returned null');
    return null;
  }
f
  return `data:image/png;base64,${encoded}`;
}

// ─── Video thumbnail ──────────────────────────────────────────────────────────

async function generateVideoThumbnail(
  videoUri: string,
  overlayUrl: string,
): Promise<string | null> {
  try {
    const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 0,
      quality: 1,
    });

    const [frameImg, overlayImg] = await Promise.all([
      uriToSkiaImage(frameUri),
      uriToSkiaImage(overlayUrl),
    ]);

    if (!frameImg || !overlayImg) return null;
    return composite(frameImg, overlayImg);
  } catch (err) {
    console.error('[stampOverlay] generateVideoThumbnail error:', err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function stampOverlay(
  mediaUri: string,
  mediaType: 'image' | 'video',
  overlayUrl: string | null | undefined,
): Promise<StampResult> {

  if (!overlayUrl) {
    return { uri: mediaUri, mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg' };
  }

  // ── Video ────────────────────────────────────────────────────────────────
  if (mediaType === 'video') {
    const thumbnailUri = await generateVideoThumbnail(mediaUri, overlayUrl);
    return {
      uri: mediaUri,
      mimeType: 'video/mp4',
      thumbnailUri,
      vibeTagOverlayUrl: overlayUrl,
    };
  }

  // ── Photo ────────────────────────────────────────────────────────────────
  const [photoImg, overlayImg] = await Promise.all([
    uriToSkiaImage(mediaUri),
    uriToSkiaImage(overlayUrl),
  ]);

  if (!photoImg) {
    // console.warn('[stampOverlay] photo load failed, uploading original');
    return { uri: mediaUri, mimeType: 'image/jpeg' };
  }
  if (!overlayImg) {
    // console.warn('[stampOverlay] overlay load failed, uploading photo only');
    return { uri: mediaUri, mimeType: 'image/jpeg' };
  }

  const composited = composite(photoImg, overlayImg);
  if (!composited) {
    // console.warn('[stampOverlay] composite failed, uploading original');
    return { uri: mediaUri, mimeType: 'image/jpeg' };
  }

  return { uri: composited, mimeType: 'image/png' };
}
