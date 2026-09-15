# Bugfix Requirements Document

## Introduction

Three bugs have been identified in the postcard creation flow (`PostcardCreator` / `PostcardCamera` / `stampOverlay`).
They block users from previewing their media correctly, completing an upload, and accessing the camera or media picker without the app locking up.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Preview is zoomed in**

1.1 WHEN a user selects a photo or video and reaches the review stage, THEN the system renders the media preview in a 4:3 landscape container while the vibe tag overlay image is composited at a 9:16 portrait output ratio (1080×1920), causing the overlay to be severely cropped and zoomed in and the media to not display correctly alongside the overlay

1.2 WHEN the vibe tag overlay is rendered on top of the media preview in the review stage, THEN the system applies `contentFit="cover"` to both the media and the overlay inside a 4:3 container, causing the overlay — which is a tall portrait-format image — to be scaled up and zoomed in beyond the visible bounds of the preview area

**Bug 2 — Upload stalls at 5% / upload button reappears**

2.1 WHEN a user taps the post button and the stamping step completes, THEN the system shows progress at 5% and then moves to the uploading stage, but the XHR `upload.onprogress` event does not fire reliably for large in-memory `data:` URI payloads on React Native, leaving the progress bar stuck without advancing

2.2 WHEN the upload or save step throws an error or completes, THEN the system executes the `finally` block which sets `isSubmitting` to `false` before `onClose()` is called, causing the post button to flash back briefly and appear re-enabled mid-flow, misleading the user into thinking they need to tap again

2.3 WHEN a composited PNG image is appended to `FormData` as a `data:image/png;base64,...` URI on Android, THEN the system fails to upload because React Native's `XMLHttpRequest` FormData implementation does not reliably handle raw `data:` URIs on all platforms, causing the upload to stall or return an error

**Bug 3 — App freezes after selecting camera or gallery**

3.1 WHEN a user taps the Camera button in the choose or review stage, THEN the system attempts to mount a `<PostcardCamera>` `<Modal>` nested inside the already-open `<PostcardCreator>` `<Modal>`, causing the app to freeze or become unresponsive due to nested Modal rendering on iOS

3.2 WHEN a user taps the "Upload from Gallery" button while `PostcardCreator` is presented as a `pageSheet` Modal, THEN the system calls `ImagePicker.launchImageLibraryAsync()` from within an active modal presentation context, causing the app to freeze because the system image picker cannot be reliably launched from inside a React Native Modal on iOS

---

### Expected Behavior (Correct)

**Bug 1 — Preview is zoomed in**

2.1 WHEN a user selects a photo or video and reaches the review stage, THEN the system SHALL render the media preview container using a 9:16 portrait aspect ratio to match the composited output dimensions, so the media and overlay are displayed without unwanted cropping or zoom

2.2 WHEN the vibe tag overlay is rendered on top of the media preview in the review stage, THEN the system SHALL scale both the media and the overlay consistently within the 9:16 container so the overlay is visible at the intended size and proportion

**Bug 2 — Upload stalls at 5% / upload button reappears**

2.3 WHEN a user taps the post button and the stamping step completes, THEN the system SHALL display meaningful progress increments during the upload phase, with the progress bar advancing even when `onprogress` events are sparse or absent (e.g. by setting a determinate midpoint value once the request is sent)

2.4 WHEN the upload and save steps complete successfully, THEN the system SHALL keep `isSubmitting` set to `true` until after `onClose()` is called, so the post button does not re-appear between completion and modal dismissal

2.5 WHEN a composited image is appended to `FormData` for upload, THEN the system SHALL write the `data:` URI to a temporary file on the device file system first and append the resulting `file://` URI to `FormData`, ensuring reliable multipart upload across both iOS and Android

**Bug 3 — App freezes after selecting camera or gallery**

2.6 WHEN a user taps the Camera button, THEN the system SHALL dismiss or defer the `PostcardCreator` modal presentation before mounting the `PostcardCamera` modal (or render the camera inline without a nested Modal), so that no two full-screen Modals are active simultaneously

2.7 WHEN a user taps the "Upload from Gallery" button, THEN the system SHALL launch the image picker in a way that is compatible with an active modal presentation context (e.g. using a `ref`-based imperative trigger or dismissing the creator modal first), so the app does not freeze

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user completes the postcard creation flow with a photo, THEN the system SHALL CONTINUE TO composite the vibe tag overlay onto the photo via Skia before upload and produce a valid `data:image/png;base64,...` URI

3.2 WHEN a user completes the postcard creation flow with a video, THEN the system SHALL CONTINUE TO upload the raw video file and generate a composited thumbnail using `stampOverlay`, preserving the `vibeTagOverlayUrl` for live playback rendering

3.3 WHEN upload progress advances, THEN the system SHALL CONTINUE TO display the three upload stages (`stamping`, `uploading`, `saving`) and the percentage in the progress card

3.4 WHEN a user has reached the 20-postcard limit, THEN the system SHALL CONTINUE TO show the swap picker and confirmation flow before submitting

3.5 WHEN a 401 Unauthorized response is received during upload or save, THEN the system SHALL CONTINUE TO show the AuthModal and retry the submission after successful re-authentication

3.6 WHEN a user removes all media items in the review stage, THEN the system SHALL CONTINUE TO return to the choose stage and clear all postcard state

3.7 WHEN the camera captures a photo or video, THEN the system SHALL CONTINUE TO pass the captured media back to `PostcardCreator` via the `onCapture` callback and transition to the review stage

---

## Bug Condition Pseudocode

### Bug 1 — Preview Zoom (aspectRatio mismatch)

```pascal
FUNCTION isBugCondition_Bug1(X)
  INPUT: X of type { containerAspectRatio: number, outputAspectRatio: number }
  OUTPUT: boolean

  // Bug fires when the preview container aspect ratio does not match the output aspect ratio
  RETURN X.containerAspectRatio ≠ X.outputAspectRatio
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_Bug1(X) DO
  preview ← renderMediaPreview(X)
  ASSERT preview.containerAspectRatio = (9 / 16)   // 0.5625 portrait
  ASSERT no_zoom_artifact(preview)
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugCondition_Bug1(X) DO
  ASSERT renderMediaPreview(F(X)) = renderMediaPreview(F'(X))
END FOR
```

### Bug 2 — Upload stall / button reappears

```pascal
FUNCTION isBugCondition_Bug2(X)
  INPUT: X of type { mediaType: 'image' | 'video', uploadUri: string, platform: 'ios' | 'android' }
  OUTPUT: boolean

  // Bug fires when uploading a composited data: URI via XHR FormData
  RETURN X.uploadUri.startsWith('data:') AND X.mediaType = 'image'
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_Bug2(X) DO
  result ← doSubmit(X)
  ASSERT result.progressAdvancedBeyond5 = true
  ASSERT result.postButtonReappearedBeforeClose = false
  ASSERT result.uploadSucceeded = true
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugCondition_Bug2(X) DO
  ASSERT doSubmit(F(X)) = doSubmit(F'(X))
END FOR
```

### Bug 3 — Freeze on camera/gallery open

```pascal
FUNCTION isBugCondition_Bug3(X)
  INPUT: X of type { action: 'openCamera' | 'openGallery', parentModalActive: boolean }
  OUTPUT: boolean

  // Bug fires when camera or gallery is opened while a Modal is already active
  RETURN X.parentModalActive = true AND (X.action = 'openCamera' OR X.action = 'openGallery')
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_Bug3(X) DO
  result ← triggerMediaPicker(X)
  ASSERT result.appFrozen = false
  ASSERT result.pickerOpened = true
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugCondition_Bug3(X) DO
  ASSERT triggerMediaPicker(F(X)) = triggerMediaPicker(F'(X))
END FOR
```
