# Video Compositing Implementation Guide

## Overview

This document explains how photo and video uploads with VibeTag overlay compositing work in the NextVibe app, following the guide specification for client-side processing.

## Key Concepts

### Two Different Flows

1. **Photos** — Fully composited client-side before upload
2. **Videos** — Thumbnail composited client-side, raw video uploaded untouched, overlay applied at playback time

## Implementation Details

### Photo Flow (1080×1920)

<cite index="1-0,1-1">Photos are fully composited client-side. You draw the vibe tag onto the image with Skia before upload. The server stores the file as-is; what you uploaded is exactly what every viewer sees.</cite>

**Steps:**
1. User selects/captures a photo
2. **Client-side compositing** using @shopify/react-native-skia:
   - Create a 1080×1920 canvas
   - Draw the photo with cover-fit
   - Draw the VibeTag overlay on top with cover-fit
   - Export as JPEG (base64 data URI)
3. Upload the composited JPEG
4. Server stores it unchanged
5. Viewers see the exact uploaded image

**Code:** `components/event/PostcardsTab/stampOverlay.ts`

```typescript
// Create surface
const surface = Skia.Surface.Make(1080, 1920);
const canvas = surface.getCanvas();

// Draw photo
canvas.drawImage(photoImg, ...);

// Draw overlay on top
canvas.drawImage(overlayImg, ...);

// Export
const encoded = snapshot.encodeToBase64();
const dataUri = `data:image/jpeg;base64,${encoded}`;
```

### Video Flow (1080×1920)

<cite index="1-4,1-5,1-6,1-7">You never touch the video's pixels. Instead: Grab a single frame from the video (e.g. the first frame) and composite the vibe tag onto that frame only, the same way you would a photo. This becomes the thumbnail — what shows in feeds, grids, and leaderboards whenever the video isn't actively playing. Upload the raw video untouched. The vibe tag itself is layered on top live during playback — you don't composite the video file.</cite>

**Steps:**
1. User selects/captures a video
2. **Extract first frame** using expo-video-thumbnails:
   ```typescript
   const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
     time: 0,
     quality: 0.9,
   });
   ```
3. **Composite the thumbnail** (same as photo):
   - Create 1080×1920 canvas
   - Draw extracted frame with cover-fit
   - Draw VibeTag overlay on top
   - Export as JPEG
4. **Upload both files**:
   - Raw video (untouched)
   - Composited thumbnail (JPEG)
5. **Store overlay URL** with the postcard metadata
6. **Playback:** PostcardViewer renders the video with overlay layered on top live

**Code:** `components/event/PostcardsTab/stampOverlay.ts`

```typescript
async function generateVideoThumbnail(videoUri: string, overlayUrl: string) {
  // Extract first frame
  const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0 });
  
  // Composite frame + overlay (same as photo logic)
  const surface = Skia.Surface.Make(1080, 1920);
  // ... draw frame and overlay ...
  
  return thumbnailDataUri;
}
```

### Upload Structure

According to the document, the API expects:

**For Photos:**
```json
POST /postcards
{
  "eventId": "uuid",
  "vibeTagId": "uuid",
  "caption": "optional",
  "media": [
    {
      "fileKey": "postcards/1723200000000-photo.jpg",
      "mediaType": "PHOTO",
      "orderIndex": 0
    }
  ]
}
```

**For Videos:**
```json
POST /postcards
{
  "eventId": "uuid",
  "vibeTagId": "uuid",
  "caption": "optional",
  "media": [
    {
      "fileKey": "postcards/1723200000000-video.mp4",
      "mediaType": "VIDEO",
      "orderIndex": 0,
      "thumbnailKey": "postcards/1723200000000-thumb.jpg",
      "vibeTagOverlayUrl": "true"
    }
  ]
}
```

<cite index="3-2,3-3">**thumbnailKey** — the storage key of your composited preview frame (uploaded separately via the same presigned flow as any other file). Required for videos to have a tagged preview anywhere they aren't actively playing.</cite>

<cite index="3-4,3-5">**vibeTagOverlayUrl** — send any truthy value ("true" is fine) to tell the server this video needs the tag drawn live during playback. The server ignores whatever value you send and resolves it to the event's own vibe tag image — you can't point it at an arbitrary URL, so don't worry about sending the "real" overlay URL here, just the flag.</cite>

### Response Shape

<cite index="4-0,4-1,4-2,4-3,4-4">Every media item you get back (from POST /postcards, GET /postcards/:id, GET /postcards/event/:eventId, etc.) looks like this: mediaUrl — always present. The actual file: the photo, or the raw video. thumbnailUrl — present only for videos that included a thumbnailKey, null for photos (the photo IS the thumbnail — just use mediaUrl) and for videos that didn't provide one. vibeTagOverlayUrl — present only when the video was flagged for a live overlay, null for photos (always) and for videos that didn't request it. When present, this is a real, safe URL to render — always the event's actual vibe tag image.</cite>

## Technology Stack

### Why Skia?

**@shopify/react-native-skia** is the best choice for this use case:

✅ **Lightweight and fast** — High-performance 2D graphics  
✅ **Handles both images and video frames** — Consistent API  
✅ **Cross-platform** — Same code for iOS and Android  
✅ **Already integrated** — No additional setup needed  
✅ **Canvas-like API** — Familiar for image manipulation

### Alternatives Considered

1. **expo-image-manipulator**
   - ❌ No multi-image compositing support
   - Limited to basic transformations

2. **react-native-canvas**
   - ❌ Heavier dependency
   - Web-focused API
   - Less performant on mobile

3. **FFmpeg (ffmpeg-kit-react-native)**
   - ✅ Handles video frame extraction
   - ❌ Overkill for simple image compositing
   - Very large dependency (~40MB)

4. **Native Modules (Core Graphics/Canvas)**
   - ✅ Maximum performance
   - ❌ Requires platform-specific code
   - Maintenance burden

### Dependencies

```json
{
  "@shopify/react-native-skia": "^2.2.12",
  "expo-video-thumbnails": "~14.0.0",
  "expo-av": "~16.0.8"
}
```

## PostcardViewer Integration

The viewer component has been fully implemented to handle rendering according to the document specification:

### Not Playing (Feed, Grid, Leaderboard):
<cite index="4-5,4-6">**PHOTO**: Render `mediaUrl` directly. **VIDEO**: Render `thumbnailUrl` if present, otherwise fall back to the video's native poster frame (untagged).</cite>

**Implementation:**
- **PostcardCard (feed view)**: Shows `thumbnailUrl` for videos with a play button overlay
- **PostcardGrid (profile view)**: Uses `thumbnailUrl` for videos with a play badge indicator
- **Photos**: Always render `mediaUrl` directly (overlay already baked in)

### Playing:
<cite index="4-7,4-8,4-9">**PHOTO**: n/a (photos don't "play"). **VIDEO**: Render the `<video src={mediaUrl}>` element, and if `vibeTagOverlayUrl` is non-null, absolutely position an `<img>` of it on top of the video (or draw it into a canvas layered over the video, whichever your existing overlay approach already does) — this is the "layer at view time" part.</cite>

**Implementation:**
- VideoPlayer component renders the raw video
- If `vibeTagOverlayUrl` is present and non-null, layers it absolutely positioned on top at 65% opacity
- When video is not actively playing in carousel, shows thumbnail instead
- Mute/unmute controls available during playback

<cite index="4-10,4-11">If `vibeTagOverlayUrl` is null on a video, don't render an overlay layer at all during playback — that video simply wasn't tagged, or the tag is already baked in from an older upload path.</cite>

### Code Implementation

**components/event/PostcardsTab/PostcardViewer.tsx:**
```typescript
// Not playing: render thumbnail
m.thumbnailUrl ? (
  <Image source={{ uri: m.thumbnailUrl }} ... />
) : (
  // Fallback to video poster
  <VideoPlayer src={m.mediaUrl!} active={false} ... />
)

// Playing: render video with live overlay
<VideoPlayer
  src={m.mediaUrl!}
  active={true}
  overlayUrl={m.vibeTagOverlayUrl}  // Layered on top if non-null
/>
```

**components/social/PostcardCard.tsx (feed view):**
```typescript
thumbnailUrl ? (
  <Image source={{ uri: thumbnailUrl }} ... />
  <View style={playOverlay}>
    <Ionicons name="play" />
  </View>
) : (
  // Dark fallback when no thumbnail
  <View>Tap to play</View>
)
```

**app/(tabs)/profile.tsx (grid view):**
```typescript
const displayUrl = isVideo && item.thumbnailUrl 
  ? item.thumbnailUrl 
  : item.mediaUrl;

{isVideo && (
  <View style={playBadge}>
    <Ionicons name="play" />
  </View>
)}
```

## Image Dimensions

All postcards are rendered at **1080×1920 pixels** (9:16 portrait aspect ratio):
- **Width**: 1080px
- **Height**: 1920px
- **Aspect Ratio**: 9:16 (vertical/portrait)
- **Format**: JPEG for images and thumbnails
- **Quality**: 0.85-0.9 for optimal file size

This matches standard social media portrait dimensions (Instagram Stories, TikTok, etc.).

## Performance Considerations

1. **Stamping Progress**: Separate progress tracking for:
   - Stamping (5-15%): Compositing images with Skia
   - Uploading (15-85%): Network transfer
   - Saving (85-100%): API call

2. **Parallel Processing**: Multiple images can be stamped concurrently using `Promise.all()`

3. **Memory Management**: 
   - Use data URIs for composited images (already in memory)
   - Clean up Skia surfaces after use
   - Limit to 20 items per postcard to prevent memory issues

4. **Video Optimization**:
   - Extract only first frame (time: 0)
   - Keep raw video quality unchanged
   - Thumbnail is much smaller than video

## Testing Checklist

- [ ] Photo upload with overlay (1080×1920)
- [ ] Photo upload without overlay
- [ ] Video upload with overlay + thumbnail generation
- [ ] Video upload without overlay
- [ ] Multiple items (photos + videos mixed)
- [ ] Large video files (up to 125 seconds)
- [ ] Progress tracking during upload
- [ ] Error handling (network failures, permission issues)
- [ ] Thumbnail display in feed/grid views
- [ ] Live overlay rendering during video playback
- [ ] iOS platform testing
- [ ] Android platform testing

## Files Modified

1. **`components/event/PostcardsTab/stampOverlay.ts`**
   - Added `expo-video-thumbnails` import
   - Added `generateVideoThumbnail()` function for extracting and compositing first frame
   - Updated `stampOverlay()` to handle video thumbnail extraction
   - Added `thumbnailUri` to `StampResult` interface

2. **`components/event/PostcardsTab/PostcardCreator.tsx`**
   - Updated FormData building to upload both raw video and composited thumbnail
   - Updated media array construction to include `thumbnailKey` for videos
   - Added proper file ordering for upload result mapping
   - Improved logging for debugging upload process

3. **`components/event/PostcardsTab/PostcardViewer.tsx`**
   - Updated VideoPlayer component with documentation about live overlay
   - Modified media rendering logic to show thumbnails when video not actively playing
   - Set overlay opacity to 65% during video playback for better visibility
   - Added conditional rendering: active video gets VideoPlayer, inactive gets thumbnail Image

4. **`components/event/PostcardsTab/types.ts`**
   - Added `thumbnailUrl` field to `PostcardMediaItem` interface

5. **`components/social/PostcardCard.tsx`**
   - Added `thumbnailUrl` and `vibeTagOverlayUrl` to media array in `PostcardItem` interface
   - Updated video rendering to show thumbnail with play button when available
   - Added fallback to dark placeholder when no thumbnail exists
   - Improved video preview UX in feed view

6. **`app/(tabs)/profile.tsx`**
   - Updated `PostcardGrid` to render video thumbnails in grid view
   - Added video play badge indicator on thumbnails
   - Added logic to prefer thumbnailUrl over mediaUrl for videos

7. **`store/api/usersApi.ts`**
   - Added `thumbnailUrl` and `mediaType` fields to `PostcardItem` interface

8. **`package.json`**
   - Added `expo-video-thumbnails` dependency

9. **`VIDEO_COMPOSITING_IMPLEMENTATION.md`**
   - Comprehensive documentation of the implementation

## References

- Original specification: Video compositing guide (PDF attached)
- Skia documentation: https://shopify.github.io/react-native-skia/
- Expo Video Thumbnails: https://docs.expo.dev/versions/latest/sdk/video-thumbnails/
