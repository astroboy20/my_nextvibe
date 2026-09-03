# Video Compositing Flow Diagram

## Photo Upload Flow

```
┌─────────────┐
│ User selects│
│   photo     │
└──────┬──────┘
       │
       v
┌─────────────────────────────┐
│  stampOverlay() - Photos    │
│  ────────────────────────   │
│  1. Create 1080×1920 canvas │
│  2. Draw photo (cover-fit)  │
│  3. Draw overlay on top     │
│  4. Export as JPEG base64   │
└──────────┬──────────────────┘
           │
           v
    ┌──────────────┐
    │ Upload JPEG  │
    │  (composited)│
    └──────┬───────┘
           │
           v
    ┌──────────────┐
    │   Storage    │
    │ fileKey only │
    └──────┬───────┘
           │
           v
    ┌─────────────────┐
    │   Response      │
    │ ─────────────── │
    │ mediaUrl        │
    │ mediaType:PHOTO │
    └─────────────────┘
```

## Video Upload Flow

```
┌─────────────┐
│ User selects│
│   video     │
└──────┬──────┘
       │
       v
┌──────────────────────────────────────┐
│  stampOverlay() - Videos             │
│  ──────────────────────────────────  │
│  1. Extract first frame (time: 0)    │
│  2. Create 1080×1920 canvas          │
│  3. Draw frame (cover-fit)           │
│  4. Draw overlay on top              │
│  5. Export thumbnail as JPEG         │
│  6. Return: raw video + thumbnail    │
└──────────┬───────────────────────────┘
           │
           v
    ┌──────────────────┐
    │  Upload 2 files  │
    │  ──────────────  │
    │  1. Raw video    │
    │  2. Thumbnail    │
    └──────┬───────────┘
           │
           v
    ┌────────────────────┐
    │     Storage        │
    │  ────────────────  │
    │  fileKey (video)   │
    │  thumbnailKey      │
    └──────┬─────────────┘
           │
           v
    ┌──────────────────────────┐
    │      Response            │
    │  ──────────────────────  │
    │  mediaUrl (raw video)    │
    │  thumbnailUrl            │
    │  vibeTagOverlayUrl       │
    │  mediaType: VIDEO        │
    └──────────────────────────┘
```

## Display Flow - Feed/Grid Views

```
┌─────────────────┐
│ Render postcard │
│    in feed      │
└────────┬────────┘
         │
         v
   ┌─────────┐
   │ Photo?  │
   └────┬────┘
        │
    ┌───┴───┐
    │       │
   YES     NO
    │       │
    v       v
┌───────┐ ┌──────────────┐
│ Show  │ │   Video      │
│mediaUrl│ │              │
└───────┘ │  Show        │
          │ thumbnailUrl │
          │ + play icon  │
          └──────────────┘
```

## Display Flow - Full-Screen Viewer

```
┌──────────────────┐
│  Open viewer     │
│  at card index   │
└────────┬─────────┘
         │
         v
   ┌──────────┐
   │  Photo?  │
   └─────┬────┘
         │
     ┌───┴───┐
     │       │
    YES     NO (Video)
     │       │
     v       v
┌─────────┐ ┌────────────┐
│  Render │ │  Active?   │
│ mediaUrl│ └─────┬──────┘
│(overlay │       │
│ baked)  │   ┌───┴───┐
└─────────┘   │       │
             YES     NO
              │       │
              v       v
       ┌──────────┐ ┌──────────────┐
       │ PLAYING  │ │ NOT PLAYING  │
       │          │ │              │
       │ Render   │ │ Show         │
       │ <Video>  │ │ thumbnailUrl │
       │          │ │ (static)     │
       │ + Layer  │ └──────────────┘
       │ overlay  │
       │ if non-  │
       │ null     │
       └──────────┘
```

## Video Playback - Overlay Logic

```
┌─────────────────────┐
│ Video is playing    │
│ (active carousel    │
│  item)              │
└──────────┬──────────┘
           │
           v
    ┌──────────────────┐
    │vibeTagOverlayUrl?│
    └──────┬───────────┘
           │
       ┌───┴───┐
       │       │
    NULL   NON-NULL
       │       │
       v       v
┌─────────┐ ┌────────────────┐
│  Play   │ │  Play video    │
│ video   │ │  +             │
│ without │ │  Layer overlay │
│ overlay │ │  on top        │
│         │ │  (65% opacity) │
└─────────┘ └────────────────┘
```

## Component Hierarchy

```
App
└── PostcardCreator
    ├── PostcardCamera (captures media)
    └── stampOverlay() (compositing)
        ├── uriToSkiaImage() (loads images)
        ├── generateVideoThumbnail() (videos)
        │   └── VideoThumbnails.getThumbnailAsync()
        └── Skia compositing logic

PostcardViewer (full-screen)
├── VideoPlayer (active videos)
│   ├── <Video> component
│   └── Overlay <Image> (conditional)
└── <Image> (photos & inactive video thumbnails)

PostcardCard (feed)
└── <Image> (photos OR video thumbnails)
    └── Play button overlay (videos only)

PostcardGrid (profile)
└── <Image> (photos OR video thumbnails)
    └── Play badge (videos only)
```

## Data Flow

```
Client                          Backend                     Storage
──────                          ───────                     ───────

[Select media]
     │
     v
[Composite]
(stampOverlay)
     │
     v
[Upload]────────────────────>[Receive files]
  │                                  │
  │ Raw video                        v
  │ Thumbnail                   [Generate keys]
  │                                  │
  │                                  v
  │                            [Store metadata]────────>[S3/Storage]
  │                                  │                   - video.mp4
  │                                  │                   - thumb.jpg
  │                                  v
  │<──────────────────────────[Return response]
  │                            - mediaUrl
  │                            - thumbnailUrl
  │                            - vibeTagOverlayUrl
  v
[Display in feed/grid]
(shows thumbnail)
     │
     v
[User taps]
     │
     v
[Open viewer]
     │
     v
[Play video + overlay]
```

## File Dependencies

```
PostcardCreator.tsx
├── imports stampOverlay.ts
│   ├── imports @shopify/react-native-skia
│   └── imports expo-video-thumbnails
└── uses types.ts
    └── PostcardMediaItem interface

PostcardViewer.tsx
├── imports types.ts
├── uses expo-av (Video)
└── uses expo-image (Image)

PostcardCard.tsx
└── imports types from usersApi.ts
    └── PostcardItem interface

profile.tsx
└── imports types from usersApi.ts
    └── PostcardItem interface
```

## State Management

```
PostcardCreator
├── items: PickedItem[]              (selected media)
├── uploadProgress: number           (0-100%)
├── uploadStage: string              (stamping|uploading|saving)
└── isSubmitting: boolean            (loading state)

PostcardViewer  
├── activeIndex: number              (current card)
└── PostcardCard
    ├── mediaIdx: number             (current media in carousel)
    ├── liked: boolean               (like state)
    ├── likeCount: number            (like count)
    └── VideoPlayer
        ├── muted: boolean           (audio state)
        └── buffering: boolean       (loading state)

PostcardCard (feed)
├── liked: boolean
├── likeCount: number
├── showComments: boolean
└── thumbnailUrl extracted from media[0]

PostcardGrid (profile)
└── displayUrl: string               (mediaUrl or thumbnailUrl)
```

## Key Points

1. **Photos**: Single upload, overlay baked in, always shows `mediaUrl`
2. **Videos**: Dual upload (video + thumbnail), shows thumbnail when not playing, shows video + live overlay when playing
3. **Thumbnails**: Generated client-side at 1080×1920, composited with Skia
4. **Overlay**: Only rendered during video playback if `vibeTagOverlayUrl` is non-null
5. **Performance**: Parallel processing, progress tracking, memory-efficient
