# Requirements Document

## Introduction

This document defines the requirements for the postcard creation feature with photo and video upload capabilities. The system enables users to create postcards by capturing or uploading media (photos and videos), compositing a vibe tag overlay onto the content, and submitting the postcards to an event. The feature supports two distinct media processing flows: client-side compositing for photos and server-side overlay metadata storage for videos.

## Glossary

- **Postcard**: A user-generated content item containing media (photo or video) with an optional vibe tag overlay and caption, associated with a specific event
- **Vibe_Tag**: A graphical overlay image with a name that is applied to postcards to brand them with event-specific styling
- **Media_Item**: A single photo or video file that forms the content of a postcard
- **Compositing**: The process of combining a user's photo with a vibe tag overlay into a single image
- **Thumbnail**: A static image extracted from a video's first frame with the vibe tag composited onto it
- **Upload_Service**: The backend service that generates presigned URLs for direct file upload to cloud storage
- **Postcard_API**: The REST API endpoint that creates postcard records in the system
- **Storage_Key**: A unique identifier for a file stored in cloud storage (e.g., "postcards/1723200000000-photo.jpg")
- **Presigned_URL**: A temporary URL that grants permission to upload a file directly to cloud storage without backend proxy
- **Live_Overlay**: A vibe tag overlay that is rendered dynamically during video playback rather than being burned into the video pixels
- **Postcard_Viewer**: The component responsible for rendering postcards in feeds, grids, and detail views
- **Skia**: A 2D graphics library used for client-side image compositing in React Native
- **Portrait_Orientation**: A 9:16 aspect ratio (vertical) display format
- **Max_Postcard_Limit**: The maximum number of postcards a user can have per event (20)
- **Swap_Mode**: The operation where a user replaces an existing postcard with a new one when at the max postcard limit

## Requirements

### Requirement 1: Photo Upload and Compositing

**User Story:** As an event attendee, I want to upload photos with the vibe tag composited onto them, so that my postcards display the event branding.

#### Acceptance Criteria

1. WHEN a user selects a photo from their gallery, THE Photo_Processor SHALL composite the vibe tag overlay onto the photo using Skia before upload
2. THE Photo_Processor SHALL export the composited image as a JPEG with quality 0.85
3. THE Photo_Processor SHALL preserve the original photo dimensions during compositing
4. WHEN the compositing is complete, THE Upload_Service SHALL generate a presigned upload URL for the composited JPEG
5. THE Client SHALL upload the composited JPEG file to the presigned URL using HTTP PUT
6. WHEN the upload succeeds, THE Client SHALL obtain the storage key and public file URL from the Upload_Service response
7. THE Client SHALL create a postcard via POST /postcards with eventId, vibeTagId, caption (optional), and media array containing one item with fileKey (storage key), mediaType "PHOTO", and orderIndex 0
8. THE Postcard_API SHALL return the created postcard with media items including id, mediaType, mediaUrl, thumbnailUrl (null for photos), vibeTagOverlayUrl (null for photos), and orderIndex

### Requirement 2: Video Upload with Separate Thumbnail

**User Story:** As an event attendee, I want to upload videos with a vibe tag overlay visible during playback, so that I can share video content with event branding.

#### Acceptance Criteria

1. WHEN a user selects a video from their gallery, THE Client SHALL upload the raw video file without modifying the video pixels
2. THE Client SHALL extract the first frame from the video at currentTime 0 using a canvas element
3. THE Client SHALL composite the vibe tag overlay onto the extracted frame using Skia
4. THE Client SHALL export the composited frame as a JPEG
5. THE Upload_Service SHALL generate two presigned upload URLs: one for the raw video and one for the composited thumbnail
6. THE Client SHALL upload the raw video to its presigned URL and obtain the video storage key
7. THE Client SHALL upload the composited thumbnail JPEG to its presigned URL and obtain the thumbnail storage key
8. THE Client SHALL create a postcard via POST /postcards with eventId, vibeTagId, caption (optional), and media array containing one item with fileKey (video storage key), mediaType "VIDEO", orderIndex 0, thumbnailKey (thumbnail storage key), and vibeTagOverlayUrl "true"
9. THE Postcard_API SHALL return the created postcard with media items including id, mediaType "VIDEO", mediaUrl (raw video URL), thumbnailUrl (composited thumbnail URL), vibeTagOverlayUrl (non-null value), and orderIndex

### Requirement 3: Video Duration Validation

**User Story:** As a system administrator, I want to enforce a maximum video duration, so that storage and bandwidth costs remain manageable.

#### Acceptance Criteria

1. THE Client SHALL reject videos longer than 125 seconds before upload
2. WHEN a user selects a video exceeding 125 seconds, THE Client SHALL display an error message indicating the maximum duration limit
3. THE Client SHALL not generate presigned URLs for videos exceeding the duration limit

### Requirement 4: Multiple Media Items per Postcard

**User Story:** As an event attendee, I want to add up to 20 photos or videos to a single postcard, so that I can share multiple moments from the event.

#### Acceptance Criteria

1. THE Client SHALL allow users to select up to 20 media items (photos and/or videos) for a single postcard
2. WHEN a user attempts to add more than 20 items, THE Client SHALL display an info message indicating the limit has been reached
3. THE Client SHALL assign orderIndex values to each media item starting from 0 and incrementing sequentially
4. THE Postcard_API SHALL accept media arrays with 1 to 20 items
5. THE Postcard_API SHALL return all media items in the response ordered by orderIndex

### Requirement 5: Portrait Aspect Ratio Display

**User Story:** As an event attendee, I want postcards displayed in 9:16 portrait orientation, so that content is not cut off and matches social media standards.

#### Acceptance Criteria

1. THE Postcard_Viewer SHALL render all postcards in 9:16 aspect ratio (portrait orientation)
2. THE Postcard_Viewer SHALL use cover fit for media to fill the 9:16 frame without letterboxing
3. THE Postcard_Viewer SHALL overlay the vibe tag image on top of the media at 60% opacity for preview
4. THE Postcard_Viewer SHALL center media content within the 9:16 frame

### Requirement 6: Postcard Viewer Rendering Logic

**User Story:** As an event attendee, I want postcards to display correctly in feeds and during playback, so that I can view content with the appropriate vibe tag overlay.

#### Acceptance Criteria

1. WHEN a photo postcard is displayed in a feed or grid, THE Postcard_Viewer SHALL render the mediaUrl directly without additional overlay
2. WHEN a video postcard is displayed in a feed or grid (not playing), THE Postcard_Viewer SHALL render the thumbnailUrl if present, otherwise render the video poster frame
3. WHEN a video postcard is playing, THE Postcard_Viewer SHALL render a video element with src set to mediaUrl
4. WHEN a video postcard is playing and vibeTagOverlayUrl is non-null, THE Postcard_Viewer SHALL absolutely position an image element of the vibe tag overlay on top of the video element
5. WHEN a video postcard is playing and vibeTagOverlayUrl is null, THE Postcard_Viewer SHALL render only the video element without overlay

### Requirement 7: Camera Capture with Live Overlay Preview

**User Story:** As an event attendee, I want to capture photos and videos using the camera with a live vibe tag overlay preview, so that I can see how my postcard will look before capturing.

#### Acceptance Criteria

1. WHEN a user opens the camera interface, THE Camera_Component SHALL display a live camera preview
2. THE Camera_Component SHALL overlay the vibe tag image on top of the camera preview at 60% opacity
3. WHEN a user captures a photo, THE Camera_Component SHALL composite the vibe tag onto the captured image using Skia
4. WHEN a user records a video, THE Camera_Component SHALL record the raw video without burning the overlay into the pixels
5. THE Camera_Component SHALL return captured media with uri, type (image or video), and mimeType

### Requirement 8: Postcard Swap Mode

**User Story:** As an event attendee, I want to replace an existing postcard when I reach the 20 postcard limit, so that I can continue sharing new content.

#### Acceptance Criteria

1. WHEN a user has 20 postcards for an event and attempts to create a new postcard, THE Client SHALL display a postcard selection interface showing all existing postcards
2. THE Postcard_Selection_Interface SHALL display each postcard as a thumbnail with like count and comment count
3. WHEN a user selects a postcard to replace, THE Client SHALL display a confirmation dialog showing the like count and comment count that will be lost
4. WHEN a user confirms replacement, THE Client SHALL call the swap postcard endpoint with the postcardId, eventId, vibeTagId, media array, and caption
5. THE Postcard_API SHALL delete the existing postcard and all its associated likes and comments
6. THE Postcard_API SHALL create a new postcard with the provided media and caption
7. IF the user does not own the postcard being replaced, THE Postcard_API SHALL return a 403 Forbidden error
8. IF the postcard to be replaced does not exist, THE Postcard_API SHALL return a 404 Not Found error

### Requirement 9: Upload Progress Tracking

**User Story:** As an event attendee, I want to see upload progress when creating a postcard, so that I know the operation is in progress and not stalled.

#### Acceptance Criteria

1. WHEN the client begins compositing media, THE Client SHALL display a progress indicator with stage "stamping" and progress 5%
2. WHEN the client begins uploading files, THE Client SHALL display a progress indicator with stage "uploading" and progress between 15% and 85%
3. THE Client SHALL update the progress percentage in real-time based on XHR upload.onprogress events
4. WHEN the client calls the Postcard_API, THE Client SHALL display a progress indicator with stage "saving" and progress 90%
5. WHEN the postcard creation succeeds, THE Client SHALL display progress 100% and show a success message
6. WHEN any step fails, THE Client SHALL hide the progress indicator and display an error message

### Requirement 10: Authentication Token Expiry Handling

**User Story:** As an event attendee, I want to re-authenticate if my session expires during upload, so that I don't lose my postcard content.

#### Acceptance Criteria

1. WHEN an upload or API call returns a 401 Unauthorized status, THE Client SHALL display an authentication modal
2. THE Client SHALL preserve the pending postcard data (media, caption, swap target) in memory while the auth modal is visible
3. WHEN the user successfully re-authenticates, THE Client SHALL automatically retry the failed upload or API call with the new token
4. WHEN the user cancels authentication, THE Client SHALL discard the pending postcard and return to the review stage

### Requirement 11: Presigned URL Upload Flow

**User Story:** As a system architect, I want media files uploaded directly to cloud storage via presigned URLs, so that the backend server is not a bottleneck for large file uploads.

#### Acceptance Criteria

1. THE Upload_Service SHALL provide an endpoint that generates presigned upload URLs
2. WHEN called, THE Upload_Service SHALL return uploadUrl (presigned PUT URL), fileUrl (public GET URL), and storage key
3. THE Client SHALL upload file bytes to the uploadUrl using HTTP PUT with Content-Type header matching the file MIME type
4. THE Client SHALL not send raw file bytes through the Postcard_API endpoint
5. THE Client SHALL pass only storage keys to the Postcard_API in the media array

### Requirement 12: Caption Input

**User Story:** As an event attendee, I want to add an optional caption to my postcard, so that I can provide context or commentary.

#### Acceptance Criteria

1. THE Client SHALL provide a text input field for caption entry in the review stage
2. THE Client SHALL allow captions up to 500 characters in length
3. WHEN a user submits a postcard with an empty caption field, THE Client SHALL send caption as an empty string
4. THE Postcard_API SHALL accept caption as an optional field and store it with the postcard

### Requirement 13: Gallery Multi-Selection

**User Story:** As an event attendee, I want to select multiple photos and videos from my gallery at once, so that I can create a postcard efficiently.

#### Acceptance Criteria

1. THE Client SHALL request media library permissions before accessing the gallery
2. WHEN permissions are granted, THE Client SHALL open the native gallery picker with multi-selection enabled
3. THE Client SHALL set the selection limit to the remaining available slots (MAX_ITEMS - current item count)
4. THE Client SHALL allow selection of both photos and videos (mediaTypes includes images and videos)
5. THE Client SHALL preserve the user's selection order via orderedSelection
6. WHEN the user confirms selection, THE Client SHALL add the selected items to the postcard media array

### Requirement 14: Error Handling for Upload Failures

**User Story:** As an event attendee, I want clear error messages when uploads fail, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. WHEN a presigned URL request fails, THE Client SHALL display an error toast with message "Failed to generate upload URL"
2. WHEN a file upload to presigned URL fails, THE Client SHALL display an error toast with message "Upload failed"
3. WHEN a network error occurs during upload, THE Client SHALL display an error toast with message "Network error"
4. WHEN the Postcard_API returns an error response, THE Client SHALL extract the error message from response.data.message and display it in an error toast
5. WHEN an error occurs, THE Client SHALL reset isSubmitting state to false and uploadProgress to 0

### Requirement 15: Vibe Tag Overlay Opacity

**User Story:** As an event attendee, I want the vibe tag overlay to be semi-transparent during preview, so that I can see both my media content and the branding.

#### Acceptance Criteria

1. WHEN rendering a vibe tag overlay in the review stage, THE Client SHALL set the overlay opacity to 60%
2. WHEN compositing a vibe tag onto a photo or video thumbnail for upload, THE Client SHALL render the overlay at 100% opacity (fully opaque) in the final output
3. WHEN rendering a live video overlay during playback, THE Postcard_Viewer SHALL render the overlay at 100% opacity

### Requirement 16: Media Removal from Review

**User Story:** As an event attendee, I want to remove individual media items from the review stage, so that I can curate my postcard before posting.

#### Acceptance Criteria

1. THE Client SHALL display a delete button on each media item in the review stage
2. WHEN a user taps the delete button, THE Client SHALL remove that item from the media array
3. WHEN the last item is removed, THE Client SHALL return to the choose stage and clear all postcard state
4. WHEN an item is removed and other items remain, THE Client SHALL update the active item index to min(activeIdx, newLength - 1)
5. THE Client SHALL update the item counter display to reflect the new count

