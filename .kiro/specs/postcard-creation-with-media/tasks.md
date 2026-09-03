# Implementation Plan: Postcard Creation with Media

## Overview

This implementation plan breaks down the postcard creation feature into discrete, testable coding tasks. The feature enables users to create postcards by capturing or uploading photos and videos, applying vibe tag overlays using client-side Skia compositing, and submitting them through a presigned URL upload flow. The implementation follows the two-stage UI pattern (Choose → Review) with support for multi-media items, camera capture with live overlay preview, and postcard swap mode for the 20-item limit.

**Key Technologies**: TypeScript, React Native, Expo SDK v56, @shopify/react-native-skia, expo-camera, expo-image-picker, expo-av

**Implementation Order**: Utility functions → Core components → Integration → Error handling → Swap mode

---

## Tasks

### 1. Implement stampOverlay Utility with Skia Compositing

Create the core client-side compositing utility that combines user media with vibe tag overlays.

- [ ] 1.1 Create stampOverlay utility file and type definitions
  - Create `components/event/PostcardsTab/stampOverlay.ts`
  - Define `StampResult` interface with uri, mimeType, and optional vibeTagOverlayUrl
  - Define function signature: `stampOverlay(mediaUri: string, mediaType: 'image' | 'video', overlayUrl: string | null | undefined): Promise<StampResult>`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.2 Implement video and null-overlay passthrough logic
  - Return original URI unchanged when overlayUrl is null/undefined
  - For video mediaType: return raw video URI with vibeTagOverlayUrl in result for server-side metadata storage
  - Set mimeType appropriately ('video/mp4' for videos)
  - _Requirements: 2.1, 2.2, 2.8_

- [ ] 1.3 Implement Skia image compositing for photos
  - Load photo and overlay images using `uriToSkiaImage()` helper
  - Compute cover-fit rectangles for 1080×1080 output canvas using scale = Math.max(size/imgW, size/imgH)
  - Build React element tree: Canvas → Fill (black background) → SkiaImage (photo with cover fit) → SkiaImage (overlay at 100% opacity)
  - Render offscreen using `drawAsImage({ width: 1080, height: 1080 })`
  - Encode to JPEG base64 at quality 88
  - Return `data:image/jpeg;base64,...` URI with mimeType 'image/jpeg'
  - _Requirements: 1.1, 1.2, 1.3, 15.2_

- [ ] 1.4 Add error handling and fallback logic
  - Wrap compositing in try/catch block
  - On any Skia error: log warning and return original URI (never block posting)
  - Handle missing image loads gracefully
  - _Requirements: 1.1, 14.5_

- [ ]* 1.5 Write unit tests for stampOverlay
  - Test null overlay returns original URI
  - Test video returns raw URI with vibeTagOverlayUrl
  - Test photo compositing returns data URI with correct MIME type
  - Test error fallback returns original URI
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

---

### 2. Update PostcardCreator Component Structure

Refactor the existing PostcardCreator to support the new two-stage flow with multi-media support.

- [ ] 2.1 Add state management for stages and media items
  - Add `Stage` type union: 'choose' | 'review'
  - Add `PickedItem` interface with uri, type, mimeType, fileName
  - Initialize state: stage='choose', items=[], activeIdx=0, caption='', uploadProgress=0, uploadStage='stamping'
  - Add showSwapPicker, showSwapConfirm, pendingSwap state
  - Add slide-up animation ref for review stage transition
  - _Requirements: 1.1, 4.1, 4.2, 12.1_

- [ ] 2.2 Implement Choose stage UI
  - Render full-screen vibe tag preview with cover fit and gradient overlay
  - Display vibe tag info badge with sparkles icon and tag name
  - Render camera button (primary purple background) with icon and description
  - Render gallery button (light purple with border) with icon and description
  - Show event name and "New Postcard" / "Replace Postcard" header based on swap mode
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 7.1_

- [ ] 2.3 Implement Review stage UI with media preview
  - Render 4:3 aspect ratio media preview container
  - Display active media item (Image for photos, Video for videos with native controls)
  - Overlay vibe tag image at 60% opacity on top of media
  - Add overlay badge showing vibe tag name with sparkles icon
  - Add remove button (trash icon) for current item
  - Add item counter badge showing "X/Y" when multiple items
  - _Requirements: 5.1, 5.2, 5.3, 7.2, 15.1, 16.1_

- [ ] 2.4 Implement thumbnail strip for multi-media items
  - Render horizontal ScrollView below main preview
  - Display 52×52 thumbnail tiles for each media item
  - Highlight active thumbnail with border
  - Show play icon badge for video thumbnails
  - Allow tapping thumbnail to change activeIdx
  - Show "Add more" button tiles when items.length < MAX_ITEMS
  - _Requirements: 4.1, 4.2, 4.4, 13.3_

- [ ] 2.5 Add caption input with character limit
  - Render TextInput with placeholder "Add a caption..."
  - Show character counter: "X/300"
  - Limit input to 300 characters
  - Update caption state on change
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 2.6 Implement removeItem logic
  - Remove item at specified index from items array
  - If last item removed: return to choose stage and clear all state
  - If items remain: update activeIdx to min(activeIdx, newLength - 1)
  - Update item counter display
  - _Requirements: 16.2, 16.3, 16.4, 16.5_

---

### 3. Implement Gallery Multi-Selection

Enable users to select multiple photos and videos from their device gallery.

- [ ] 3.1 Implement openGallery method with permissions
  - Request media library permissions using `ImagePicker.requestMediaLibraryPermissionsAsync()`
  - If denied: show Toast "Media library permission denied" and return
  - Calculate remaining slots: MAX_ITEMS - items.length
  - If remaining <= 0: show Toast "Max 20 items reached" and return
  - _Requirements: 13.1, 13.2, 14.1_

- [ ] 3.2 Launch gallery picker with multi-selection
  - Call `ImagePicker.launchImageLibraryAsync()` with:
    - mediaTypes: ['images', 'videos']
    - allowsMultipleSelection: true
    - selectionLimit: remaining
    - quality: 0.85
    - videoMaxDuration: 125
    - orderedSelection: true
  - Map result.assets to PickedItem[] with uri, type, mimeType, fileName
  - _Requirements: 13.3, 13.4, 13.5, 3.1_

- [ ] 3.3 Transition to review stage with selected items
  - Append new items to existing items array (respect MAX_ITEMS cap)
  - Set activeIdx to first newly added item
  - Call showReview() to transition to review stage with slide-up animation
  - _Requirements: 4.1, 13.6_

---

### 4. Create PostcardCamera Component

Build the native camera interface with live vibe tag overlay preview.

- [ ] 4.1 Create PostcardCamera component file and props interface
  - Create `components/event/PostcardsTab/PostcardCamera.tsx`
  - Define props: vibeTagOverlay, vibeTagName, onCapture, onClose
  - Define CapturedMedia interface: uri, type, mimeType
  - Request camera permissions on mount
  - _Requirements: 7.1, 7.5, 13.1_

- [ ] 4.2 Implement camera preview with live overlay
  - Render full-screen CameraView from expo-camera
  - Overlay vibe tag image at 60% opacity using absolutely positioned Image
  - Add camera controls: close button, capture button, flip camera button
  - Show flash toggle and recording indicator
  - _Requirements: 7.1, 7.2, 15.1_

- [ ] 4.3 Implement photo capture
  - On capture button tap: call cameraRef.takePictureAsync()
  - Save photo to device file system
  - Return captured photo URI with type='image' via onCapture callback
  - Note: Skia compositing happens in stampOverlay during upload, not during capture
  - _Requirements: 7.3, 7.5_

- [ ] 4.4 Implement video recording
  - On hold capture button: call cameraRef.recordAsync()
  - Show recording indicator and timer
  - On release: stop recording, save raw video to file system
  - Return video URI with type='video' via onCapture callback
  - Note: Overlay not burned into pixels; metadata stored for playback rendering
  - _Requirements: 7.4, 7.5_

- [ ] 4.5 Integrate camera with PostcardCreator
  - Add showCamera state to PostcardCreator
  - Render PostcardCamera as modal overlay when showCamera=true
  - Implement onCameraCapture callback: append captured media to items, transition to review
  - Add camera button handlers in both choose and review stages
  - _Requirements: 7.1, 7.5_

---

### 5. Implement Upload Flow with Progress Tracking

Build the complete upload pipeline from stamping through presigned URL upload to API creation.

- [ ] 5.1 Create doSubmit orchestration method
  - Accept optional targetSwapId parameter for swap mode
  - Set isSubmitting=true, uploadProgress=0, uploadStage='stamping'
  - Extract overlayUrl from vibeTagOverlay prop
  - Wrap entire flow in try/catch for error handling
  - _Requirements: 9.1, 11.1, 11.5_

- [ ] 5.2 Implement stamping stage with progress
  - Set uploadProgress=5%, uploadStage='stamping'
  - Call stampOverlay for each item in items array using Promise.all
  - Collect stamped results: array of { uri, mimeType, vibeTagOverlayUrl }
  - Set uploadProgress=15% after stamping completes
  - _Requirements: 1.1, 1.2, 9.1_

- [ ] 5.3 Build FormData with stamped media
  - Get access token from tokenStore
  - Create new FormData instance
  - For each stamped result: append file object with { uri, name, type: mimeType }
  - Handle data: URIs (stamped images) and file:// URIs (raw videos) correctly
  - Strip 'file://' prefix on iOS for file URIs
  - _Requirements: 11.4, 11.5_

- [ ] 5.4 Implement XHR upload with progress tracking
  - Set uploadStage='uploading'
  - Create XMLHttpRequest to POST /v1/storage/upload-multiple
  - Set Authorization header with bearer token
  - Attach xhr.upload.onprogress handler: update uploadProgress from 15% to 85% based on e.loaded/e.total
  - Handle xhr.onload: parse JSON response for 2xx status, reject for 401 or other errors
  - Handle xhr.onerror: reject with "Network error"
  - _Requirements: 9.2, 9.3, 11.1, 11.2, 11.3_

- [ ] 5.5 Build media array for postcard API
  - Map upload response data to media array
  - For each uploaded file: extract fileKey, mediaType, mediaUrl
  - Attach vibeTagOverlayUrl from stamped result for video items (null for photos)
  - Set orderIndex sequentially starting from 0
  - _Requirements: 1.7, 2.8, 4.3, 4.4_

- [ ] 5.6 Call postcard creation or swap API
  - Set uploadStage='saving', uploadProgress=90%
  - If targetSwapId: call swapPostcard mutation with postcardId, eventId, vibeTagId, media, caption
  - Else: call createPostcards mutation with eventId, vibeTagId, media, caption
  - Set uploadProgress=100% on success
  - Show success Toast with item count
  - Call onSubmit callback and onClose to dismiss creator
  - _Requirements: 1.7, 1.8, 8.5, 8.6, 9.4, 9.5_

---

### 6. Implement Error Handling and Token Expiry Recovery

Add comprehensive error handling for all failure scenarios.

- [ ] 6.1 Add error handling in doSubmit catch block
  - Extract status code from error.status or error.data.statusCode
  - Check for 401 status: set pendingSubmitSwapRef.current = targetSwapId, call showAuthModal(), return early
  - Check for 403 status in swap mode: show Toast "You can only replace your own postcards."
  - Check for 404 status in swap mode: show Toast "That postcard no longer exists."
  - Default: show Toast with error.data.message or "Post failed."
  - Always reset isSubmitting=false and uploadProgress=0 in finally block
  - _Requirements: 10.1, 14.4, 8.7, 8.8_

- [ ] 6.2 Implement AuthModal integration for token expiry
  - Add useAuthModal hook to PostcardCreator
  - Add pendingSubmitSwapRef to preserve swap target during re-auth
  - Render AuthModal with visible=authModalVisible
  - On auth success: retrieve fresh token, call doSubmit(pendingSubmitSwapRef.current) to retry
  - On auth cancel: clear pendingSubmitSwapRef, keep user on review stage
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 6.3 Add video duration validation
  - Check video duration before adding to items array (in gallery picker videoMaxDuration: 125)
  - If duration > 125s: show Toast "Video must be ≤ 125 seconds"
  - Reject video selection
  - _Requirements: 3.1, 3.2_

- [ ] 6.4 Add error handling for other scenarios
  - Presigned URL request failure: show Toast "Failed to generate upload URL"
  - Upload to presigned URL failure: show Toast "Upload failed"
  - Network error: show Toast "Network error"
  - Reset isSubmitting and uploadProgress on any error
  - _Requirements: 14.2, 14.3, 14.5_

---

### 7. Implement Swap Mode Flow

Build the postcard replacement flow for the 20-item limit.

- [ ] 7.1 Create SwapPicker component
  - Create component file with props: eventId, onPick, onCancel
  - Use useGetEventPostcardsQuery to fetch user's existing postcards
  - Filter postcards to only those with media
  - Render header with close button and "Replace a Postcard" title
  - Show warning banner explaining consequences of replacement
  - _Requirements: 8.1, 8.2_

- [ ] 7.2 Implement SwapPicker grid display
  - Render two-column FlatList with numColumns=2
  - Each tile: TILE_W width, TILE_H height (4:3 aspect ratio)
  - Display first media item thumbnail with play badge for videos
  - Show gradient overlay at bottom with like count and comment count
  - On tile tap: call onPick(postcard) with selected postcard
  - _Requirements: 8.2_

- [ ] 7.3 Create SwapConfirm component
  - Create component with props: likeCount, commentCount, onConfirm, onCancel
  - Render semi-transparent overlay with bottom sheet card
  - Display "Replace this postcard?" title
  - Show red-tinted warning with like/comment counts that will be lost
  - Render Cancel (gray border) and Replace (red background) buttons
  - _Requirements: 8.3, 8.4_

- [ ] 7.4 Integrate swap flow into PostcardCreator
  - In handlePost: check if userPostcardCount >= MAX_ITEMS and not in swap mode
  - If true: call setShowSwapPicker(true) instead of doSubmit
  - On SwapPicker.onPick: store selected postcard in pendingSwap, show SwapConfirm
  - On SwapConfirm.onConfirm: call doSubmit(pendingSwap.id)
  - On confirm/cancel: hide modals and reset state
  - _Requirements: 8.1, 8.4, 8.5_

- [ ]* 7.5 Write integration tests for swap flow
  - Test swap picker appears when userPostcardCount >= 20
  - Test swap confirm shows correct like/comment counts
  - Test swap API called with correct postcardId
  - Test 403 error shows correct message
  - Test 404 error shows correct message
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8_

---

### 8. Implement PostcardViewer Rendering Logic

Update the postcard viewer to handle photo rendering and live video overlays.

- [ ] 8.1 Update PostcardViewer component structure
  - Open existing PostcardViewer component file
  - Review current rendering logic for media items
  - Add logic to handle new media structure with thumbnailUrl and vibeTagOverlayUrl
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8.2 Implement photo rendering logic
  - For mediaType='PHOTO': render Image with source={{ uri: mediaUrl }}
  - Use contain fit within 9:16 aspect ratio container
  - No overlay rendering (overlay already composited into image)
  - _Requirements: 5.1, 5.2, 6.1_

- [ ] 8.3 Implement video thumbnail rendering (paused state)
  - For mediaType='VIDEO' when not playing: check if thumbnailUrl exists
  - If thumbnailUrl exists: render Image with source={{ uri: thumbnailUrl }}
  - Otherwise: render video poster frame
  - Show play icon badge overlay
  - _Requirements: 6.2_

- [ ] 8.4 Implement video playback with live overlay
  - For mediaType='VIDEO' when playing: render Video component with source={{ uri: mediaUrl }}
  - Check if vibeTagOverlayUrl is non-null
  - If vibeTagOverlayUrl exists: render Image with source={{ uri: vibeTagOverlayUrl }} absolutely positioned over video
  - Set overlay opacity to 100% (not 60%)
  - Use cover fit for overlay to match video dimensions
  - If vibeTagOverlayUrl is null: render video only without overlay
  - _Requirements: 6.3, 6.4, 6.5, 15.3_

- [ ] 8.5 Ensure 9:16 portrait aspect ratio rendering
  - Set all postcard containers to 9:16 aspect ratio
  - Use cover fit for media to fill frame without letterboxing
  - Center media content within 9:16 frame
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

### 9. Add Progress Indicators and User Feedback

Implement visual feedback for the upload process and user actions.

- [ ] 9.1 Create progress card component for review stage
  - Render progress card below caption input when isSubmitting=true
  - Display upload stage text: "Stamping VibeTag...", "Uploading...", "Saving..."
  - Show circular progress indicator with uploadProgress percentage
  - Display percentage text: "X%"
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 9.2 Disable interactions during submission
  - Disable Post button when isSubmitting=true
  - Show loading indicator on Post button during submission
  - Prevent media selection and removal during upload
  - _Requirements: 9.5_

- [ ] 9.3 Add success feedback
  - On successful post: show green checkmark animation
  - Display Toast: "X item(s) posted!" or "Postcard replaced!"
  - Automatically close creator after 800ms
  - _Requirements: 9.5_

---

### 10. Polish UI and Add Final Touches

Complete the UI with animations, transitions, and visual polish.

- [ ] 10.1 Implement slide-up animation for review stage
  - Initialize Animated.Value(H) for slideAnim
  - In showReview: set slideAnim.setValue(H), then Animated.spring to 0
  - Apply transform: translateY to review stage container
  - _Requirements: 5.1_

- [ ] 10.2 Add thumbnail strip scrolling behavior
  - Auto-scroll to active thumbnail when activeIdx changes
  - Add horizontal scroll indicators if needed
  - Smooth scroll animation when tapping thumbnail
  - _Requirements: 4.4_

- [ ] 10.3 Add visual feedback for overlay preview
  - Pulse animation on vibe tag badge in review stage
  - Subtle glow effect on overlay at 60% opacity
  - _Requirements: 15.1_

- [ ] 10.4 Ensure consistent styling with design system
  - Use brand.primary, neutral, semantic colors from constants
  - Apply fontFamily and fontSize from Typography constants
  - Match border radius, padding, and spacing with existing components
  - _Requirements: All UI requirements_

---

### 11. Final Checkpoint and Integration Testing

- [ ] 11.1 Checkpoint - Ensure all tests pass
  - Run all unit tests for stampOverlay and utility functions
  - Run integration tests for upload flow and swap mode
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11.2 End-to-end manual testing
  - Test complete photo upload flow from gallery
  - Test complete video upload flow from gallery
  - Test camera capture for both photos and videos
  - Test multi-media item selection and removal
  - Test caption input and character limit
  - Test swap mode when at 20 postcards
  - Test token expiry recovery flow
  - Test all error scenarios (permissions, duration, network errors)
  - Verify overlay rendering at 60% in preview and 100% in viewer
  - Verify 9:16 aspect ratio throughout UI

---

## Notes

- Tasks marked with `*` are optional testing sub-tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Implementation follows the order: utilities → components → integration → error handling → polish
- The existing PostcardCreator.tsx file will be significantly refactored to support the new two-stage flow
- The stampOverlay utility is the critical foundation; ensure it's working correctly before building upload flow
- XHR is used instead of fetch for reliable upload progress tracking in React Native
- FormData in React Native handles both `data:` URIs and `file://` URIs natively
- Video overlay metadata (vibeTagOverlayUrl) is stored server-side and rendered client-side during playback
