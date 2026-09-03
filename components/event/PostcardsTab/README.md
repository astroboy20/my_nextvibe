# Postcard Creation Feature

## Overview

The postcard creation feature enables users to create branded postcards by capturing or uploading photos and videos with event-specific vibe tag overlays. The feature implements client-side Skia compositing for images and live overlay rendering for videos, following Instagram/TikTok patterns for AR filters.

## Architecture

### Components

#### PostcardCreator
**File:** `PostcardCreator.tsx`

The main component orchestrating the two-stage creation flow:
1. **Choose Stage:** User selects camera or gallery
2. **Review Stage:** Preview media, add caption, and post

**Key Features:**
- Multi-media support (up to 20 items per postcard)
- Thumbnail navigation strip
- Caption input (300 char limit)
- Progress tracking (stamping → uploading → saving)
- Swap mode for 20-postcard limit
- Token expiry recovery

**Usage:**
```tsx
<PostcardCreator
  vibeTagName="Summer Vibes"
  vibeTagOverlay={{ imageUrl: "...", name: "..." }}
  vibeTagId="vibe-123"
  eventName="Beach Party"
  eventId="event-456"
  onClose={() => setShowCreator(false)}
  onSubmit={() => refetchPostcards()}
  userPostcardCount={5}
/>
```

#### PostcardCamera
**File:** `PostcardCamera.tsx`

Full-screen camera interface with live overlay preview.

**Key Features:**
- Photo capture (quality 0.85)
- Video recording (up to 35 seconds)
- Live vibe tag overlay at 60% opacity
- Flash toggle (off/on/auto)
- Camera flip (front/back)
- Multiple captures support

**Usage:**
```tsx
<PostcardCamera
  vibeTagOverlay={{ imageUrl: "...", name: "..." }}
  vibeTagName="Summer Vibes"
  onCapture={(media) => handleCapture(media)}
  onClose={() => setShowCamera(false)}
/>
```

#### PostcardViewer
**File:** `PostcardViewer.tsx`

Full-screen vertical feed for viewing postcards with media carousels.

**Key Features:**
- Vertical paging (one postcard per screen)
- Horizontal carousel (multiple media per postcard)
- Photo rendering (direct, already composited)
- Video rendering with live overlay (100% opacity)
- Like/comment/view tracking
- Double-tap to like
- 9:16 portrait aspect ratio

**Usage:**
```tsx
<PostcardViewer
  postcards={postcards}
  initialIndex={0}
  eventId="event-456"
  onClose={() => setShowViewer(false)}
/>
```

### Utilities

#### stampOverlay
**File:** `stampOverlay.ts`

Client-side compositing utility using Skia for images.

**Process:**
- **Photos:** Composites photo + overlay → JPEG base64 data URI (1080×1920, 9:16 portrait)
- **Videos:** Returns raw video URI + overlay URL for playback rendering
- **No overlay:** Returns original URI unchanged

**Usage:**
```typescript
const result = await stampOverlay(
  'file:///photo.jpg',
  'image',
  'https://cdn.com/overlay.png'
);
// result.uri: 'data:image/jpeg;base64,...'
// result.mimeType: 'image/jpeg'
```

## Data Flow

### Photo Upload Flow
```
1. User selects photo from gallery
2. stampOverlay() composites photo + vibe tag using Skia
   → Output: data:image/jpeg;base64,... (1080×1920, 9:16 portrait)
3. Upload to presigned URL via XHR
   → Returns: { fileKey, url, mediaType: 'PHOTO' }
4. POST /v1/events/:eventId/postcards
   Body: { media: [{ fileKey, mediaType: 'PHOTO', orderIndex: 0 }] }
5. Postcard created (vibeTagOverlayUrl: null for photos)
```

### Video Upload Flow
```
1. User selects video from gallery
2. stampOverlay() returns raw video + overlay URL
   → Output: { uri: 'file:///video.mp4', vibeTagOverlayUrl: '...' }
3. Upload raw video to presigned URL via XHR
   → Returns: { fileKey, url, mediaType: 'VIDEO' }
4. POST /v1/events/:eventId/postcards
   Body: {
     media: [{
       fileKey,
       mediaType: 'VIDEO',
       orderIndex: 0,
       vibeTagOverlayUrl // Stored for playback rendering
     }]
   }
5. Postcard created with overlay metadata
```

### Playback Rendering (PostcardViewer)
```
Photo Postcard:
- Render <Image source={{ uri: mediaUrl }} />
- No overlay (already composited during upload)

Video Postcard (paused):
- Render <Image source={{ uri: thumbnailUrl }} /> if available
- Otherwise render video poster

Video Postcard (playing):
- Render <Video source={{ uri: mediaUrl }} />
- If vibeTagOverlayUrl exists:
  - Render <Image source={{ uri: vibeTagOverlayUrl }} />
    style={absoluteFill} at 100% opacity
```

## API Endpoints

### Upload
```typescript
POST /v1/storage/upload-multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with files

Response: {
  data: [
    { fileKey: "postcards/123.jpg", url: "https://...", mediaType: "PHOTO" }
  ]
}
```

### Create Postcard
```typescript
POST /v1/events/:eventId/postcards
Content-Type: application/json
Authorization: Bearer <token>

Body: {
  eventId: string,
  vibeTagId?: string,
  caption?: string,
  media: [
    {
      fileKey: string,
      mediaType: "PHOTO" | "VIDEO",
      orderIndex: number,
      thumbnailKey?: string,      // Video only
      vibeTagOverlayUrl?: string  // Video only
    }
  ]
}

Response: {
  data: PostcardData
}
```

### Swap Postcard
```typescript
PUT /v1/postcards/:postcardId/swap
Content-Type: application/json
Authorization: Bearer <token>

Body: {
  eventId: string,
  vibeTagId?: string,
  caption?: string,
  media: [...] // Same as create
}

Response: {
  data: PostcardData
}
```

## Types

### PickedItem (Client-side)
```typescript
interface PickedItem {
  uri: string;          // file:// or content:// URI
  type: 'image' | 'video';
  mimeType?: string;
  fileName?: string;
}
```

### StampResult (Client-side)
```typescript
interface StampResult {
  uri: string;                    // Upload URI
  mimeType: string;
  vibeTagOverlayUrl?: string | null;  // Videos only
}
```

### PostcardMediaItem (API)
```typescript
interface PostcardMediaItem {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  mediaUrl: string;
  thumbnailUrl?: string | null;        // Videos only
  vibeTagOverlayUrl?: string | null;   // Videos only
  orderIndex: number;
  fileKey: string;
}
```

### PostcardData (API)
```typescript
interface PostcardData {
  id: string;
  caption?: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  createdAt: string;
  media: PostcardMediaItem[];
  author?: {
    id: string;
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
  event?: {
    id: string;
    name: string;
  };
  vibeTag?: {
    id: string;
    name: string;
    imageUrl: string;
  };
}
```

## Error Handling

### Permission Errors
- **Gallery denied:** Toast "Media library permission denied"
- **Camera denied:** Show permission screen with grant button
- **Microphone denied:** Show permission screen for video recording

### Upload Errors
- **Network error:** Toast "Network error"
- **Upload failed:** Toast "Upload failed"
- **Token expired (401):** Show AuthModal, preserve data, retry on success
- **Swap forbidden (403):** Toast "You can only replace your own postcards."
- **Postcard not found (404):** Toast "That postcard no longer exists."

### Validation Errors
- **Video > 125s:** Toast "Video must be ≤ 125 seconds"
- **Max items reached:** Toast "Max 20 items reached"

### Compositing Errors
- **Skia failure:** Log warning, upload original image (silent fallback)

## Constants

```typescript
const MAX_ITEMS = 20;           // Max media items per postcard
const MAX_RECORD_SECS = 35;     // Max video recording duration
const OUTPUT_WIDTH = 1080;      // Stamped image width (9:16 aspect ratio)
const OUTPUT_HEIGHT = 1920;     // Stamped image height (9:16 aspect ratio)
const CAPTION_MAX_LENGTH = 300; // Max caption characters
const VIDEO_MAX_DURATION = 125; // Max video duration in seconds
const JPEG_QUALITY = 0.88;      // Skia JPEG encoding quality
const PREVIEW_OPACITY = 0.6;    // Overlay opacity in preview
const PLAYBACK_OPACITY = 1.0;   // Overlay opacity during playback
```

## Performance Considerations

1. **Client-side compositing:** Reduces server load, provides instant feedback
2. **XHR uploads:** Enables progress tracking vs. fetch API
3. **Direct-to-storage:** Bypasses backend proxy for large files
4. **Cover-fit algorithm:** Efficiently scales images to 9:16 portrait (1080×1920) without distortion
5. **Lazy video overlay:** Avoids expensive video encoding
6. **Memory management:** 1080×1920 output size balances quality and memory for mobile devices

## Testing

### Manual Testing Checklist
- [ ] Photo upload from gallery (single)
- [ ] Photo upload from gallery (multiple, up to 20)
- [ ] Video upload from gallery
- [ ] Video duration validation (>125s rejected)
- [ ] Camera photo capture
- [ ] Camera video recording
- [ ] Live overlay preview (60% opacity)
- [ ] Stamped output quality (1080×1920 portrait, 9:16 aspect ratio)
- [ ] Upload progress tracking
- [ ] Caption input (300 char limit)
- [ ] Remove media items
- [ ] Swap mode (at 20 postcards)
- [ ] Swap confirmation
- [ ] Token expiry re-auth
- [ ] PostcardViewer photo rendering
- [ ] PostcardViewer video with overlay
- [ ] Portrait aspect ratio throughout

### Unit Tests
```typescript
// stampOverlay.test.ts
describe('stampOverlay', () => {
  it('returns original URI when overlay is null', async () => {
    const result = await stampOverlay('file:///photo.jpg', 'image', null);
    expect(result.uri).toBe('file:///photo.jpg');
  });

  it('returns video URI with overlayUrl for videos', async () => {
    const result = await stampOverlay('file:///video.mp4', 'video', 'https://overlay.png');
    expect(result.vibeTagOverlayUrl).toBe('https://overlay.png');
  });

  it('composites photo and returns data URI', async () => {
    const result = await stampOverlay('file:///photo.jpg', 'image', 'https://overlay.png');
    expect(result.uri).toMatch(/^data:image\/jpeg;base64,/);
  });
});
```

### Integration Tests
```typescript
// postcard-creation.integration.test.ts
describe('Photo Upload Flow', () => {
  it('completes end-to-end photo upload', async () => {
    mockImagePicker.mockResolvedValue({ assets: [{ uri: 'file:///photo.jpg' }] });
    mockStampOverlay.mockResolvedValue({ uri: 'data:image/jpeg;base64,...' });
    mockUploadAPI.mockResolvedValue({ data: [{ fileKey: 'postcards/123.jpg' }] });
    mockPostcardAPI.mockResolvedValue({ data: { id: 'postcard-1' } });

    const { result } = renderHook(() => usePostcardCreator());
    await act(() => result.current.openGallery());
    await act(() => result.current.doSubmit());

    expect(mockPostcardAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [{ fileKey: 'postcards/123.jpg', mediaType: 'PHOTO' }]
      })
    );
  });
});
```

## Troubleshooting

### Common Issues

**Issue:** Stamping fails silently
- **Cause:** Skia compositing error
- **Solution:** Check console for warnings, verify overlay URL is accessible

**Issue:** Video overlay not showing during playback
- **Cause:** vibeTagOverlayUrl is null
- **Solution:** Verify stampOverlay returns overlayUrl for videos

**Issue:** Upload progress stuck at 15%
- **Cause:** Network timeout or presigned URL expired
- **Solution:** Check network connection, verify presigned URL generation

**Issue:** Token expired during upload
- **Cause:** Long upload time, auth token expired
- **Solution:** AuthModal should appear, user re-authenticates, upload retries

**Issue:** Swap mode not appearing
- **Cause:** userPostcardCount < 20
- **Solution:** Verify postcard count query returns correct value

## Future Enhancements

1. **Upload Retry:** Implement exponential backoff for network failures
2. **Draft Saving:** Persist pending postcards to local storage
3. **Batch Processing:** Optimize stamping for multiple images in parallel
4. **Video Thumbnails:** Extract first frame on client side for thumbnails
5. **Filters:** Add photo filters before stamping
6. **Stickers:** Allow adding stickers on top of vibe tag overlay
7. **Analytics:** Track completion rates, drop-off points

## Dependencies

- `@shopify/react-native-skia` - Client-side image compositing
- `expo-camera` - Camera access and capture
- `expo-image-picker` - Gallery access and selection
- `expo-av` - Video playback
- `expo-image` - Image rendering and caching
- `react-native-toast-message` - User feedback
- `@reduxjs/toolkit/query` - API integration

## Credits

Implemented according to specification in `.kiro/specs/postcard-creation-with-media/`

**Implementation Date:** January 2026  
**Expo SDK Version:** v56.0.0  
**Status:** Production Ready
