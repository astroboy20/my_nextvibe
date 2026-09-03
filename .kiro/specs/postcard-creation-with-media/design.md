# Design Document: Postcard Creation with Media

## Overview

This document defines the technical design for the postcard creation feature with photo and video upload capabilities. The system enables users to create postcards by capturing or uploading media (photos and videos), compositing a vibe tag overlay onto the content using client-side Skia rendering, and submitting postcards to an event through a presigned URL upload flow.

The design implements two distinct media processing pipelines:

1. **Photo pipeline**: Client-side Skia compositing (photo + vibe tag overlay) → presigned URL upload → API creation
2. **Video pipeline**: Raw video upload + first frame extraction + thumbnail compositing → dual presigned URL uploads → API creation with live overlay metadata

The feature enforces a 9:16 portrait aspect ratio throughout the UI for consistency with social media standards and implements a postcard swap mode to handle the 20-item-per-user-per-event limit.

### Key Design Decisions

- **Client-side compositing**: Reduces server load and provides instant visual feedback
- **Live video overlays**: Avoids expensive video encoding; overlay rendered at playback time
- **Presigned URLs**: Direct-to-storage uploads bypass backend bottlenecks for large files
- **Skia for compositing**: Native 2D graphics library already used in VibetagCreator; proven performance
- **XHR for uploads**: Enables progress tracking; FormData handles both file:// URIs and data: URIs correctly on React Native

## Architecture

### Component Hierarchy

```
PostcardCreator (Modal)
├── Stage: Choose
│   ├── VibeTag Preview (full screen)
│   ├── Camera Button
│   └── Gallery Button
├── Stage: Review
│   ├── Media Preview (4:3 aspect with overlay)
│   ├── Thumbnail Strip
│   ├── Caption Input
│   └── Post Button / Progress Card
├── PostcardCamera (Overlay Modal)
│   ├── Camera Preview
│   ├── Live Overlay (60% opacity)
│   └── Capture Controls
├── SwapPicker (Full Screen)
│   └── Grid of Existing Postcards
├── SwapConfirm (Bottom Sheet)
└── AuthModal (Reauthentication)

PostcardViewer (Modal)
├── FlatList (Vertical Paging)
│   └── PostcardCard (per item)
│       ├── Media Carousel (Horizontal)
│       │   ├── Image (direct render)
│       │   └── VideoPlayer (with live overlay)
│       └── Info Overlay (author, caption, actions)
└── CommentSheet (Modal)
```

### Data Flow

#### Photo Upload Flow

```
User selects photo from gallery
    ↓
stampOverlay() composites photo + vibe tag using Skia
    → Output: data:image/jpeg;base64,... (1080×1080)
    ↓
POST /v1/storage/upload-multiple (FormData with data: URI)
    → Returns: [{ fileKey, url, mediaType }]
    ↓
POST /v1/events/:eventId/postcards
    Body: { eventId, vibeTagId, caption, media: [{ fileKey, mediaType: 'PHOTO', orderIndex: 0 }] }
    ↓
Postcard created (vibeTagOverlayUrl is null for photos)
```

#### Video Upload Flow

```
User selects video from gallery
    ↓
Extract first frame at currentTime=0 using canvas
    ↓
stampOverlay() composites frame + vibe tag using Skia
    → Output: data:image/jpeg;base64,... (thumbnail)
    ↓
POST /v1/storage/upload-multiple (FormData with raw video + composited thumbnail)
    → Returns: [{ fileKey: videoKey, url: videoUrl }, { fileKey: thumbKey, url: thumbUrl }]
    ↓
POST /v1/events/:eventId/postcards
    Body: {
        eventId, vibeTagId, caption,
        media: [{
            fileKey: videoKey,
            mediaType: 'VIDEO',
            orderIndex: 0,
            thumbnailKey: thumbKey,
            vibeTagOverlayUrl: overlayUrl  ← stored for playback rendering
        }]
    }
    ↓
Postcard created with vibeTagOverlayUrl metadata
```

#### Camera Capture Flow

```
User opens camera interface
    ↓
PostcardCamera displays live preview with overlay at 60% opacity
    ↓
User captures photo or records video
    ↓
Photo: stampOverlay() → data: URI → upload flow
Video: Raw video file → upload flow (overlay applied at playback)
    ↓
Returns to Review stage with captured media
```

### Storage Layer

The application uses a **presigned URL upload pattern** to bypass backend proxying of large files:

1. Client requests presigned URL(s) from `POST /v1/storage/upload-multiple`
2. Backend generates presigned PUT URLs for cloud storage (S3/R2)
3. Client uploads file bytes directly to presigned URL via XHR
4. Client sends only storage keys (not file bytes) to postcard creation API

This pattern:
- Reduces backend bandwidth and memory usage
- Enables client-side upload progress tracking
- Scales horizontally without backend bottlenecks
- Maintains security through time-limited presigned URLs

## Components and Interfaces

### PostcardCreator

**Responsibility**: Orchestrates the two-stage postcard creation flow (choose → review) and handles all upload logic.

**Props**:
```typescript
interface PostcardCreatorProps {
  vibeTagName?: string;
  vibeTagOverlay?: { imageUrl: string; name: string } | null;
  vibeTagId?: string;
  eventName?: string;
  eventId?: string;
  onClose: () => void;
  onSubmit?: () => void;
  userPostcardCount?: number;
  swapPostcardId?: string;        // When replacing existing postcard
  swapLikeCount?: number;
  swapCommentCount?: number;
}
```

**State**:
```typescript
type Stage = 'choose' | 'review';
interface PickedItem {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
  fileName?: string;
}

const [stage, setStage] = useState<Stage>('choose');
const [items, setItems] = useState<PickedItem[]>([]);
const [activeIdx, setActiveIdx] = useState(0);
const [caption, setCaption] = useState('');
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStage, setUploadStage] = useState<'stamping' | 'uploading' | 'saving'>('stamping');
```

**Key Methods**:

- `openGallery()`: Launches native gallery picker with multi-selection, respects MAX_ITEMS limit
- `onCameraCapture(captured: CapturedMedia[])`: Receives media from PostcardCamera, transitions to review stage
- `removeItem(idx: number)`: Removes item from media array, returns to choose stage if empty
- `doSubmit(targetSwapId?: string)`: Orchestrates stamping → upload → API creation, handles 401 token expiry
- `handlePost()`: Entry point for submission; checks swap mode and postcard limit before calling doSubmit

**Render Logic**:

**Choose Stage**:
- Full-screen vibe tag preview (cover fit) with gradient overlay and tag info badge
- Camera button (primary action, purple background)
- Gallery button (secondary action, light purple background with border)

**Review Stage**:
- Media preview at 4:3 aspect ratio with overlay at 60% opacity
- Thumbnail strip (52×52 tiles) with add buttons when < MAX_ITEMS
- Caption input (300 char limit with counter)
- Post button (disabled during submission) or progress card showing stage and percentage

### stampOverlay

**Responsibility**: Client-side Skia compositing for photos and thumbnails.

**Function Signature**:
```typescript
interface StampResult {
  uri: string;                    // data:image/jpeg;base64,... or original file:// URI
  mimeType: string;
  vibeTagOverlayUrl?: string | null;  // Only for videos
}

async function stampOverlay(
  mediaUri: string,
  mediaType: 'image' | 'video',
  overlayUrl: string | null | undefined,
): Promise<StampResult>
```

**Implementation Details**:

1. **No overlay case**: Returns original URI unchanged
2. **Video case**: Returns raw video URI + overlayUrl for playback rendering
3. **Image case**:
   - Loads photo and overlay images into Skia via `uriToSkiaImage()`
   - Computes cover-fit rectangles for 1080×1080 output
   - Builds React element tree: Canvas → Fill (black) → SkiaImage (photo) → SkiaImage (overlay)
   - Renders offscreen via `drawAsImage({ width: 1080, height: 1080 })`
   - Encodes to JPEG base64 (quality 88)
   - Returns `data:image/jpeg;base64,...` URI
   - Fallback: On any error, returns original URI (never blocks posting)

**Key Algorithms**:

```typescript
// Cover fit: scale to fill OUTPUT_SIZE × OUTPUT_SIZE with no letterboxing
function coverRects(imgW: number, imgH: number, size: number) {
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
```

### PostcardCamera

**Responsibility**: Native camera interface with live vibe tag overlay preview.

**Props**:
```typescript
interface PostcardCameraProps {
  vibeTagOverlay?: { imageUrl: string; name: string } | null;
  vibeTagName?: string;
  onCapture: (captured: CapturedMedia[]) => void;
  onClose: () => void;
}

interface CapturedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
}
```

**Implementation**:
- Uses `expo-camera` for camera access
- Overlay image rendered at 60% opacity on top of camera preview
- Photo capture: saves to file system, compositing happens in stampOverlay
- Video recording: saves raw video, overlay metadata passed to upload flow
- Returns captured media URIs to parent via onCapture callback

### PostcardViewer

**Responsibility**: Full-screen vertical feed for viewing postcards with media carousels.

**Props**:
```typescript
interface PostcardViewerProps {
  postcards: PostcardData[];
  initialIndex: number;
  eventId: string;
  onClose: () => void;
}
```

**Rendering Logic by Media Type**:

1. **Photo (mediaType: "PHOTO")**:
   - Renders `<Image source={{ uri: mediaUrl }} />`
   - No overlay rendering (already composited)
   - Uses contain fit for 9:16 aspect ratio display

2. **Video (mediaType: "VIDEO", not playing)**:
   - If `thumbnailUrl` exists: renders `<Image source={{ uri: thumbnailUrl }} />`
   - Otherwise: renders video poster frame
   - Shows play icon badge

3. **Video (mediaType: "VIDEO", playing)**:
   - Renders `<Video source={{ uri: mediaUrl }} />`
   - If `vibeTagOverlayUrl` is non-null:
     - Renders `<Image source={{ uri: vibeTagOverlayUrl }} style={absoluteFill} />`
     - Overlay positioned absolutely on top of video
     - Uses cover fit to match video dimensions
     - Overlay at 100% opacity (not 60% like preview)
   - If `vibeTagOverlayUrl` is null: renders video only

**Key Features**:
- Vertical FlatList with paging enabled (one postcard per screen)
- Horizontal ScrollView for multi-media items within a postcard
- Active video autoplay: plays only the current postcard's current media item
- Like/comment/view tracking with optimistic updates
- Double-tap to like with heart burst animation
- 1.5s dwell time before view tracking fires
- Polling for fresh like/comment/view counts every 5 seconds

### SwapPicker

**Responsibility**: Grid display of user's existing postcards for replacement selection when at MAX_ITEMS limit.

**Props**:
```typescript
interface SwapPickerProps {
  eventId: string;
  onPick: (postcard: any) => void;
  onCancel: () => void;
}
```

**Display**:
- Two-column grid of thumbnail tiles (TILE_W × TILE_H, 4:3 aspect)
- Each tile shows first media item with play badge for videos
- Bottom overlay showing like count + comment count
- Warning banner explaining consequences of replacement

### SwapConfirm

**Responsibility**: Confirmation dialog before replacing an existing postcard.

**Props**:
```typescript
interface SwapConfirmProps {
  likeCount: number;
  commentCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Display**:
- Semi-transparent overlay at bottom of screen
- Red-tinted warning card showing activity that will be lost
- Cancel (gray border) and Replace (red background) buttons

## Data Models

### PickedItem (Client-side)

Represents a media item selected or captured by the user, before upload:

```typescript
interface PickedItem {
  uri: string;          // file:// or content:// URI from device
  type: 'image' | 'video';
  mimeType?: string;    // 'image/jpeg', 'video/mp4', etc.
  fileName?: string;    // Original filename from gallery
}
```

### StampResult (Client-side)

Result of stampOverlay compositing operation:

```typescript
interface StampResult {
  uri: string;                    // Upload URI (data: for images, file:// for videos)
  mimeType: string;               // MIME type for upload
  vibeTagOverlayUrl?: string | null;  // Overlay URL to persist (videos only)
}
```

### PostcardMediaItem (API Model)

Server-side media item structure returned by API:

```typescript
interface PostcardMediaItem {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  mediaUrl: string;               // Public CDN URL for photo or video
  thumbnailUrl?: string | null;   // Thumbnail URL (videos only)
  vibeTagOverlayUrl?: string | null;  // Overlay URL for live rendering (videos only)
  orderIndex: number;
  fileKey: string;                // Storage key (e.g., 'postcards/123-video.mp4')
}
```

### PostcardData (API Model)

Complete postcard object:

```typescript
interface PostcardData {
  id: string;
  caption?: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  createdAt: string;              // ISO 8601 timestamp
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

### Create Postcard Request

```typescript
interface CreatePostcardRequest {
  eventId: string;
  vibeTagId?: string;
  caption?: string;
  media: Array<{
    fileKey: string;              // Storage key from upload response
    mediaType: 'PHOTO' | 'VIDEO';
    orderIndex: number;
    thumbnailKey?: string;        // Thumbnail storage key (videos only)
    vibeTagOverlayUrl?: string;   // Overlay URL (videos only)
  }>;
}
```

### Upload Response

```typescript
interface UploadFileResult {
  fileKey: string;                // Storage key ('postcards/1234567890-photo.jpg')
  url: string;                    // Public CDN URL
  mediaType: 'PHOTO' | 'VIDEO';
}

interface UploadMultipleResponse {
  data: UploadFileResult[];
}
```

## Error Handling

### Client-side Errors

| Error Scenario | Detection | Handling | User Feedback |
|----------------|-----------|----------|---------------|
| Permission denied (gallery) | `requestMediaLibraryPermissionsAsync()` returns granted=false | Abort gallery picker | Toast: "Media library permission denied" |
| Permission denied (camera) | `requestCameraPermissionsAsync()` returns granted=false | Abort camera launch | Toast: "Camera permission denied" |
| Video duration > 125s | Check video.duration before upload | Reject video | Toast: "Video must be ≤ 125 seconds" |
| Skia compositing failure | Try/catch in stampOverlay | Fallback to original URI | Silent (logs warning, uploads original) |
| Upload to presigned URL fails | XHR onerror or status ≥ 400 | Show error, reset isSubmitting | Toast: "Upload failed" |
| Network error during upload | XHR onerror | Show error, reset isSubmitting | Toast: "Network error" |
| Postcard API error (general) | API returns status ≥ 400 | Show error message from response.data.message | Toast: error message |
| Token expired (401) | API returns 401 | Show AuthModal, preserve pending data | Modal: "Your session expired. Sign in to post your postcard." |

### Server-side Errors

| Error Code | Scenario | Client Handling |
|------------|----------|-----------------|
| 400 Bad Request | Invalid request body (missing fields, invalid media array) | Toast: error message from API |
| 401 Unauthorized | Token expired or missing | Show AuthModal with retry logic |
| 403 Forbidden (swap) | User doesn't own postcard being replaced | Toast: "You can only replace your own postcards." |
| 404 Not Found (swap) | Postcard to replace no longer exists | Toast: "That postcard no longer exists." |
| 413 Payload Too Large | File size exceeds backend limit | Toast: "File too large" (shouldn't occur due to client-side limits) |
| 500 Internal Server Error | Server-side failure during creation | Toast: "Server error. Please try again." |

### Recovery Strategies

**Token Expiry Recovery**:
1. Upload or API call returns 401
2. Store pending state in `pendingSubmitSwapRef.current = targetSwapId`
3. Show AuthModal
4. On successful re-auth: retrieve fresh token, call `doSubmit(pendingSwapRef.current)` with original data
5. On auth cancel: discard pending data, return to review stage

**Upload Retry** (not currently implemented, future enhancement):
- Exponential backoff for network errors
- Resume capability for large video files using multipart upload

## Testing Strategy

### Property-Based Testing Applicability Assessment

**Assessment: PBT is NOT appropriate for this feature.**

**Reasoning**:
This feature is primarily composed of:
- UI rendering and interactions (camera interface, gallery picker, preview screens)
- External service integration (presigned URL uploads, S3/R2 storage, REST API calls)
- Native platform APIs (expo-camera, expo-image-picker, expo-av)
- File I/O operations (reading device files, writing composited images)
- Side-effect-heavy operations (XHR uploads with progress tracking)

The majority of acceptance criteria test:
- UI behavior (buttons, modals, preview rendering)
- Integration points (upload flow, API creation flow)
- Platform-specific functionality (camera permissions, gallery access)
- One-time configuration checks (permission requests, video duration validation)

**Testing Strategy**: This feature will use **integration tests**, **example-based unit tests**, **visual regression tests**, and **manual testing** instead of property-based testing.

The few pure functions in the codebase (cover-fit rectangle calculations, stampOverlay compositing logic) will be tested with example-based unit tests covering common cases and edge cases rather than property-based tests, as the input space is well-defined and bounded.

### Unit Testing

**Focus**: Individual functions and components with clear inputs/outputs.

**Test Categories**:

1. **Utility Functions**:
   - `stampOverlay()` with various input combinations
   - Cover-fit rectangle calculations
   - Time formatting helpers

2. **Component Behavior**:
   - `removeItem()` logic (returns to choose when empty, updates activeIdx when items remain)
   - Gallery picker permission checks
   - Media type detection (image vs video)

3. **Error Handling**:
   - 401 handling shows AuthModal
   - 403/404 swap errors show appropriate messages
   - Skia failures fall back to original URI

**Example Unit Tests**:

```typescript
describe('stampOverlay', () => {
  it('returns original URI when overlayUrl is null', async () => {
    const result = await stampOverlay('file:///photo.jpg', 'image', null);
    expect(result.uri).toBe('file:///photo.jpg');
  });

  it('returns video URI with vibeTagOverlayUrl for videos', async () => {
    const result = await stampOverlay('file:///vid.mp4', 'video', 'https://cdn.com/overlay.png');
    expect(result.uri).toBe('file:///vid.mp4');
    expect(result.vibeTagOverlayUrl).toBe('https://cdn.com/overlay.png');
  });

  it('composites photo and overlay into data URI', async () => {
    const result = await stampOverlay('file:///photo.jpg', 'image', 'https://cdn.com/overlay.png');
    expect(result.uri).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.mimeType).toBe('image/jpeg');
  });
});

describe('PostcardCreator', () => {
  it('returns to choose stage when last item is removed', () => {
    const { result } = renderHook(() => useState(['item1']));
    const [items, setItems] = result.current;
    removeItem(0, items, setItems);
    expect(items).toHaveLength(0);
    expect(stage).toBe('choose');
  });

  it('shows SwapPicker when userPostcardCount >= MAX_ITEMS', () => {
    render(<PostcardCreator userPostcardCount={20} {...defaultProps} />);
    fireEvent.press(screen.getByText('Post'));
    expect(screen.getByText('Replace a Postcard')).toBeVisible();
  });
});
```

### Integration Testing

**Focus**: Multi-component interactions and API integration.

**Test Scenarios**:

1. **Photo Upload Flow**:
   - Mock gallery picker returning image URI
   - Mock stampOverlay returning data URI
   - Mock upload API returning storage key
   - Mock postcard API returning created postcard
   - Verify Toast shows success message
   - Verify onSubmit callback fires

2. **Video Upload Flow**:
   - Mock gallery picker returning video URI
   - Mock stampOverlay returning raw video + overlay URL
   - Mock upload API returning video and thumbnail keys
   - Mock postcard API with vibeTagOverlayUrl
   - Verify correct API payload structure

3. **Token Expiry Recovery**:
   - Mock upload returning 401
   - Verify AuthModal appears
   - Mock successful re-auth
   - Verify doSubmit retries with fresh token

4. **Swap Mode**:
   - Set userPostcardCount to 20
   - Trigger post action
   - Verify SwapPicker appears
   - Select postcard, verify SwapConfirm appears
   - Confirm, verify swap API called with correct postcardId

**Example Integration Tests**:

```typescript
describe('Photo Upload Integration', () => {
  it('completes photo upload flow end-to-end', async () => {
    mockImagePicker.mockResolvedValue({ assets: [{ uri: 'file:///photo.jpg', type: 'image' }] });
    mockStampOverlay.mockResolvedValue({ uri: 'data:image/jpeg;base64,...', mimeType: 'image/jpeg' });
    mockUploadAPI.mockResolvedValue({ data: [{ fileKey: 'postcards/123.jpg', url: 'https://cdn.com/123.jpg' }] });
    mockPostcardAPI.mockResolvedValue({ data: { id: 'postcard-1', media: [...] } });

    const { result } = renderHook(() => usePostcardCreator());
    await act(async () => await result.current.openGallery());
    await act(async () => await result.current.doSubmit());

    expect(mockStampOverlay).toHaveBeenCalledWith('file:///photo.jpg', 'image', 'https://cdn.com/overlay.png');
    expect(mockPostcardAPI).toHaveBeenCalledWith(expect.objectContaining({
      media: [{ fileKey: 'postcards/123.jpg', mediaType: 'PHOTO', orderIndex: 0 }]
    }));
  });
});
```

### Visual Regression Testing

**Focus**: UI appearance consistency across platforms and devices.

**Test Coverage**:
- Choose stage with/without vibe tag overlay
- Review stage with single vs multiple media items
- Progress card showing each upload stage
- SwapPicker grid layout
- SwapConfirm warning card
- PostcardViewer with photo vs video

**Tools**: Detox + screenshot comparison or Storybook with Chromatic

### Manual Testing Checklist

- [ ] Photo upload from gallery (single and multiple)
- [ ] Video upload from gallery (check 125s limit enforcement)
- [ ] Camera capture (photo and video)
- [ ] Live overlay preview at 60% opacity in camera and review
- [ ] Vibe tag compositing quality (1080×1080 output)
- [ ] Upload progress updates smoothly (15% → 85%)
- [ ] Caption input (300 char limit enforced)
- [ ] Remove media items from review (last item returns to choose)
- [ ] Swap mode triggered at 20 postcards
- [ ] Swap confirmation shows correct like/comment counts
- [ ] Token expiry shows AuthModal and retries on success
- [ ] PostcardViewer renders photos correctly (no overlay)
- [ ] PostcardViewer renders videos with live overlay during playback
- [ ] Video thumbnail shows composited overlay when paused
- [ ] Multi-media carousel swipes horizontally
- [ ] Portrait 9:16 aspect ratio maintained throughout

