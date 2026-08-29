/**
 * stampOverlay.ts
 *
 * Client-side VibeTag stamping before upload.
 *
 * ── Images ──────────────────────────────────────────────────────────────────
 * Uses Skia's offscreen `drawAsImage` API to composite the user photo +
 * VibeTag overlay PNG into a single JPEG.  The result is a `data:` URI that
 * gets uploaded just like a regular file — the server receives a single
 * already-stamped image, no vibeTagId needed for the visual.
 *
 * ── Videos ──────────────────────────────────────────────────────────────────
 * React Native has no client-side video encoder in this project (no FFmpeg).
 * The raw video file is uploaded unchanged.  The VibeTag overlay URL is stored
 * alongside each media item so PostcardViewer renders it on top at playback
 * time — exactly how Instagram/TikTok handle AR-filter videos.
 *
 * Both paths return a `StampResult` with the final upload URI, mime type, and
 * (for video) the overlay URL to persist as `vibeTagOverlayUrl`.
 */

import { Skia, drawAsImage, rect } from '@shopify/react-native-skia';

// ── Output resolution ─────────────────────────────────────────────────────────
const OUTPUT_SIZE = 1080; // 1080×1080 square

export interface StampResult {
  /** Upload URI — data:image/jpeg;base64,… for stamped images, original for video */
  uri: string;
  mimeType: string;
  /** For video: overlay URL to store so the viewer renders it at playback time */
  vibeTagOverlayUrl?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch any URI (file:// or https://) and return a Skia Image.
 * Returns null on any failure so we always have a fallback.
 */
async function uriToSkiaImage(uri: string) {
  try {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const skData = Skia.Data.fromBytes(bytes);
    return Skia.Image.MakeImageFromEncoded(skData);
  } catch {
    return null;
  }
}

/**
 * Cover-fit: compute src/dst rects to fill `size × size` without distortion.
 */
function coverRects(
  imgW: number,
  imgH: number,
  size: number,
): { src: ReturnType<typeof rect>; dst: ReturnType<typeof rect> } {
  const scale = Math.max(size / imgW, size / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  return {
    src: rect(0, 0, imgW, imgH),
    dst: rect(dx, dy, dw, dh),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Stamp the VibeTag overlay onto a single media item before upload.
 *
 * @param mediaUri   Local file URI (file://…)
 * @param mediaType  'image' | 'video'
 * @param overlayUrl Remote URL of the VibeTag overlay PNG
 */
export async function stampOverlay(
  mediaUri: string,
  mediaType: 'image' | 'video',
  overlayUrl: string | null | undefined,
): Promise<StampResult> {
  // ── No overlay → return original unchanged ────────────────────────────────
  if (!overlayUrl) {
    return {
      uri: mediaUri,
      mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    };
  }

  // ── VIDEO ─────────────────────────────────────────────────────────────────
  // Cannot encode video frames client-side without FFmpeg.
  // Upload the raw video and store overlayUrl so the viewer composites it.
  if (mediaType === 'video') {
    return {
      uri: mediaUri,
      mimeType: 'video/mp4',
      vibeTagOverlayUrl: overlayUrl,
    };
  }

  // ── IMAGE — Skia offscreen composite ─────────────────────────────────────
  try {
    // Load photo + overlay in parallel
    const [photoImg, overlayImg] = await Promise.all([
      uriToSkiaImage(mediaUri),
      uriToSkiaImage(overlayUrl),
    ]);

    if (!photoImg) {
      // Can't decode photo → upload as-is (fallback)
      return { uri: mediaUri, mimeType: 'image/jpeg' };
    }

    // Build a React-element tree for drawAsImage
    // drawAsImage renders JSX into an offscreen Skia surface → SkImage
    const { default: React } = await import('react');
    const { Canvas, Image: SkImg, Fill } = await import('@shopify/react-native-skia');

    const photoRects = coverRects(photoImg.width(), photoImg.height(), OUTPUT_SIZE);
    const overlayRects = overlayImg
      ? coverRects(overlayImg.width(), overlayImg.height(), OUTPUT_SIZE)
      : null;

    const element = React.createElement(
      Canvas,
      { style: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
      // White background fallback
      React.createElement(Fill, { color: '#000' }),
      // Photo layer
      React.createElement(SkImg, {
        image: photoImg,
        x: photoRects.dst.x,
        y: photoRects.dst.y,
        width: photoRects.dst.width,
        height: photoRects.dst.height,
        fit: 'fill',
      }),
      // VibeTag overlay on top (only if loaded)
      overlayImg && overlayRects
        ? React.createElement(SkImg, {
            image: overlayImg,
            x: overlayRects.dst.x,
            y: overlayRects.dst.y,
            width: overlayRects.dst.width,
            height: overlayRects.dst.height,
            fit: 'fill',
          })
        : null,
    );

    const stampedImage = await drawAsImage(element, {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
    });

    // Encode to JPEG base64 (quality 88)
    const b64 = stampedImage.encodeToBase64(
      // ImageFormat.JPEG = 1 in Skia's enum, quality 0–100
      1 as any,
      88,
    );

    return {
      uri: `data:image/jpeg;base64,${b64}`,
      mimeType: 'image/jpeg',
    };
  } catch (e) {
    // Any Skia failure → upload original (silent fallback, never block post)
    console.warn('[stampOverlay] image composite failed, uploading original:', e);
    return { uri: mediaUri, mimeType: 'image/jpeg' };
  }
}
