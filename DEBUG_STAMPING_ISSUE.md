# Debug: No Stamp on Images Issue

## Problem

Based on the user's screenshot and the video compositing guide document, **photos should have the vibe tag stamped on them**, but currently:
- ✅ The preview shows "live overlay applied" at 60% opacity
- ❌ The uploaded image does NOT have the vibe tag stamped on it

## Expected Behavior (from document)

**Photos:**
> "fully composited client-side. You draw the vibe tag onto the image with Skia before upload. The server stores the file as-is; what you uploaded is exactly what every viewer sees."

**Current behavior:** The image is being uploaded WITHOUT the stamp.

## Investigation Steps

### 1. Code Review ✅

The `stampOverlay()` function IS being called in the upload flow:
```typescript
const stamped = await Promise.all(
  items.map((item) =>
    stampOverlay(item.uri, item.type, overlayUrl),
  ),
);
```

The function IS implemented correctly:
- Loads photo and overlay images
- Composites them using Skia
- Returns a `data:image/jpeg;base64,...` URI

### 2. Possible Issues

**Issue A: Stamping is silently failing**
- The try/catch in `stampOverlay()` has a fallback that returns the original image
- If Skia compositing fails, it logs a warning and uploads the original
- **Solution:** Added detailed logging to trace execution

**Issue B: Data URI not being uploaded correctly**
- React Native FormData might not handle `data:` URIs properly
- The upload might be succeeding but sending the wrong data
- **Solution:** Added logging to verify FormData construction

**Issue C: Overlay URL is null/undefined**
- If `vibeTagOverlay?.imageUrl` is null, stampOverlay returns original
- **Solution:** Added logging to verify overlay URL is present

## Debugging Changes Made

### File: `components/event/PostcardsTab/stampOverlay.ts`

Added comprehensive logging:

```typescript
// Entry point
console.log('[stampOverlay] Starting:', { mediaUri, mediaType, overlayUrl });

// No overlay case
console.log('[stampOverlay] No overlay provided, returning original');

// Video case  
console.log('[stampOverlay] Video detected, returning with overlayUrl');

// Image compositing
console.log('[stampOverlay] Starting image compositing with Skia...');
console.log('[stampOverlay] Photo loaded:', photoImg.width(), 'x', photoImg.height());
console.log('[stampOverlay] Overlay loaded:', overlayImg ? '${width}x${height}' : 'null');

// Success
console.log('[stampOverlay] ✅ SUCCESS! Stamped image created:', dataUri.substring(0, 100) + '...');

// Failure
console.error('[stampOverlay] ❌ FAILED! Image composite error:', e);
```

### File: `components/event/PostcardsTab/PostcardCreator.tsx`

Added upload flow logging:

```typescript
// Before stamping
console.log('[PostcardCreator] Starting stamp process with overlay:', overlayUrl);

// After stamping
console.log('[PostcardCreator] Stamping complete. Results:', stamped.map(s => ({
  uriType: s.uri.startsWith('data:') ? 'data URI' : 'file URI',
  length: s.uri.length,
  hasOverlay: !!s.vibeTagOverlayUrl
})));

// FormData construction
console.log(`[PostcardCreator] Processing item ${i}:`, {
  originalType, resultUri, isDataUri, mimeType
});
console.log(`[PostcardCreator] Appending to FormData:`, { name, type, uri });
```

## How to Debug

### Step 1: Test the flow

1. Run the app: `npx expo start`
2. Open the console/logs
3. Create a postcard with a photo
4. Watch the console output

### Step 2: Check the logs

Look for these patterns:

**✅ Success pattern:**
```
[stampOverlay] Starting: { mediaUri: "file://...", mediaType: "image", overlayUrl: "https://..." }
[stampOverlay] Starting image compositing with Skia...
[stampOverlay] Photo loaded: 3024 x 4032
[stampOverlay] Overlay loaded: 1080x1920
[stampOverlay] Encoding stamped image to JPEG...
[stampOverlay] ✅ SUCCESS! Stamped image created: data:image/jpeg;base64,/9j/4AAQ... (length: 524288)
[PostcardCreator] Stamping complete. Results: [{ uriType: "data URI", length: 524288, hasOverlay: false }]
[PostcardCreator] Processing item 0: { originalType: "image", isDataUri: true, ... }
```

**❌ Failure patterns:**

**Pattern 1: No overlay URL**
```
[stampOverlay] Starting: { ... overlayUrl: undefined }
[stampOverlay] No overlay provided, returning original
```
→ **Fix:** Verify `vibeTagOverlay?.imageUrl` is populated in PostcardCreator props

**Pattern 2: Skia failure**
```
[stampOverlay] Starting image compositing with Skia...
[stampOverlay] ❌ FAILED! Image composite error: TypeError: ...
```
→ **Fix:** Check Skia installation, imports, or image loading

**Pattern 3: Photo won't load**
```
[stampOverlay] Starting image compositing with Skia...
[stampOverlay] Could not decode photo, uploading original
```
→ **Fix:** Check if photo URI is accessible, permissions

**Pattern 4: Overlay won't load**
```
[stampOverlay] Photo loaded: 3024 x 4032
[stampOverlay] Overlay loaded: null
[stampOverlay] ✅ SUCCESS! Stamped image created: ...
```
→ **Fix:** Check if overlay URL is accessible (CORS, network)

## Root Cause Hypotheses

### Most Likely:
1. **Skia is throwing an error** and falling back to original image
2. **Overlay URL is null/undefined** so stampOverlay returns original
3. **Data URI upload is failing** on the native side

### Less Likely:
4. Stamping works but server is ignoring the stamped image
5. FormData isn't constructed correctly for data URIs
6. Platform-specific issue (iOS vs Android)

## Next Steps

1. **Run the app with logging** and capture console output
2. **Identify which pattern** appears in the logs
3. **Apply the appropriate fix** based on the failure pattern
4. **Verify the fix** by checking uploaded images have the stamp

## Expected Console Output (Success Case)

```
[stampOverlay] Starting: { mediaUri: "file:///data/.../photo.jpg", mediaType: "image", overlayUrl: "https://cdn.../vibetag.png" }
[stampOverlay] Starting image compositing with Skia...
[stampOverlay] Photo loaded: 3024 x 4032
[stampOverlay] Overlay loaded: 1080x1920
[stampOverlay] Encoding stamped image to JPEG...
[stampOverlay] ✅ SUCCESS! Stamped image created: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA... (length: 458752)
[PostcardCreator] Stamping complete. Results: [{ uriType: "data URI", length: 458752, hasOverlay: false }]
[PostcardCreator] Processing item 0: { originalType: "image", resultUri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...", isDataUri: true, mimeType: "image/jpeg" }
[PostcardCreator] Appending to FormData: { name: "postcard-1234567890-0.jpg", type: "image/jpeg", uri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..." }
```

## Document Reference

According to the "Postcards — Photo & Video Upload Guide (Vibe Tag Overlay)" document:

**Step 2a — Photo postcard:**
- No `thumbnailKey` needed
- No `vibeTagOverlayUrl` needed
- Photos are always treated as pre-composited
- Server stores the file as-is

This confirms that **stamping MUST happen client-side before upload** for photos.

## Verification Checklist

After applying the fix:
- [ ] Console shows `[stampOverlay] ✅ SUCCESS!`
- [ ] Console shows `uriType: "data URI"`
- [ ] Uploaded image file includes the vibe tag overlay
- [ ] Image dimensions are 1080×1920 (9:16 portrait)
- [ ] Overlay is at 100% opacity (not 60%)
- [ ] No errors in console during compositing

## Files Modified

1. ✅ `components/event/PostcardsTab/stampOverlay.ts` - Added detailed logging
2. ✅ `components/event/PostcardsTab/PostcardCreator.tsx` - Added upload flow logging

No diagnostics errors - code compiles successfully.
