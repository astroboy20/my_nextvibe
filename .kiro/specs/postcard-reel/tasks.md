# Implementation Plan: Postcard Reel

## Overview

Build the self-contained `PostcardReel` component in a single new file, then wire it into the existing `PostcardsTab` with a Watch Reel button and a single boolean state toggle. All timer logic, gestures, and sub-components live in `PostcardReel.tsx`. `PostcardViewer.tsx` and the `PhaseGrid` query are not touched.

## Tasks

- [x] 1. Export pure utility functions from `PostcardReel.tsx`
  - Create `components/event/PostcardsTab/PostcardReel.tsx` with only the pure, side-effect-free functions and TypeScript types (no JSX yet):
    - `ReelPhase` type and `PostcardReelProps` interface
    - `filterAndEnrichSlides(raw, vibeTagMap, phase)` — filter by `activityTiming` + valid `mediaUrl`, then enrich `vibeTagOverlayUrl`
    - `effectiveDuration(mediaType, durationMs?)` — returns `Math.min(durationMs ?? 10000, 10000)` for VIDEO, `3000` for PHOTO
    - `computeProgress(elapsedMs, totalMs)` — returns `elapsedMs / totalMs` clamped to `[0, 1]`
    - `advanceIndex(current, length)` — returns `(current + 1) % length`
    - `goBackIndex(current, length)` — returns `current - 1` for `current > 0`, signals restart otherwise
  - Export all six symbols so property tests can import them directly
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 4.1, 4.6, 8.1_

  - [ ]* 1.1 Write property-based tests for pure functions (fast-check, ≥100 runs each)
    - **Property 1: Valid media filter — all filtered slides have a non-null, non-empty `mediaUrl`**
    - **Validates: Requirements 2.2, 10.5**
    - **Property 2: VibeTag overlay enrichment — `vibeTagOverlayUrl` equals `vibeTagMap[vibeTagId].imageUrl` after enrichment**
    - **Validates: Requirements 2.3**
    - **Property 3b: Phase filter scopes slides correctly — every result slide has `activityTiming === phase`**
    - **Validates: Requirements 2.1**
    - **Property 8: Photo progress fraction is `elapsed / 3000`, clamped to `[0, 1]`**
    - **Validates: Requirements 3.5, 5.4**
    - **Property 9: `effectiveDuration('VIDEO', D)` equals `Math.min(D, 10000)` for all D**
    - **Validates: Requirements 4.1, 4.6**
    - **Property 10: `advanceIndex(N-1, N)` equals `0` for all N ≥ 1**
    - **Validates: Requirements 8.1**
    - **Property 12: `goBackIndex(i, N)` equals `i - 1` for all `i > 0`**
    - **Validates: Requirements 6.2**
    - Tag each test: `// Feature: postcard-reel, Property N: <description>`
    - File: `components/event/PostcardsTab/__tests__/PostcardReel.pure.test.ts`

- [x] 2. Implement `ProgressBar` sub-component inside `PostcardReel.tsx`
  - Add the `ProgressBar` internal component after the pure functions
  - Accepts `count`, `activeIndex`, `progressAnim: Animated.Value`
  - Renders `count` segments in a horizontal row with `gap: 2` and full-width minus safe-area padding
  - Segments `< activeIndex`: static `width: '100%'` fill
  - Segments `> activeIndex`: static `width: '0%'` fill (empty)
  - Active segment: `Animated.View` whose width is `progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] })`
  - Use `useNativeDriver: false` (width interpolation requires layout driver)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

  - [ ]* 2.1 Write property-based test for `ProgressBar` segment count and fill invariant
    - Extract a `computeSegments(count, activeIndex, progressFraction)` helper and test it
    - **Property 4: segment array length equals slide count**
    - **Property 5: segments `< activeIndex` are 1.0; segments `> activeIndex` are 0.0**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 3. Implement `ReelVideoPlayer` sub-component inside `PostcardReel.tsx`
  - Add the `ReelVideoPlayer` internal component after `ProgressBar`
  - Props: `src`, `shouldPlay`, `onDurationKnown(ms: number)`, `videoRef: React.RefObject<Video>`, `overlayUrl?`
  - Uses `expo-av` `Video` with `ResizeMode.CONTAIN`, `isLooping={false}`, `isMuted={false}`
  - Calls `onDurationKnown(status.durationMillis)` from the `onLoad` callback when `status.isLoaded`
  - Renders `vibeTagOverlayUrl` overlay at `opacity: 0.65` using `expo-image` `Image` (absolutely positioned, `contentFit="cover"`) when `overlayUrl` is non-null
  - Shows an `ActivityIndicator` while buffering (`onLoadStart` → buffering true, `onReadyForDisplay` → buffering false)
  - _Requirements: 4.1, 4.2, 4.3, 10.2, 10.3_

- [x] 4. Implement `ReelSlide` sub-component inside `PostcardReel.tsx`
  - Add the `ReelSlide` internal component after `ReelVideoPlayer`
  - For VIDEO first-media: renders `ReelVideoPlayer` (forwarded ref, `shouldPlay`, `onDurationKnown`)
  - For PHOTO first-media: renders `expo-image` `Image` with `contentFit="cover"` filling full screen + VibeTag overlay at `opacity: 0.65` when `vibeTagOverlayUrl` is non-null
  - The component accepts the enriched `PostcardData` slide, `isActive`, `isPaused`, and `videoRef`
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 5. Implement `BottomInfoOverlay` and `GestureLayer` sub-components inside `PostcardReel.tsx`
  - `BottomInfoOverlay`: renders author `displayName` (fallback to `username`), caption, and three count badges (likes `heart-outline`, comments `chatbubble-outline`, views `eye-outline`) at the bottom of the screen using absolute positioning with safe-area bottom padding
  - `GestureLayer`: `View` with `StyleSheet.absoluteFillObject` and `zIndex: 10`
    - Outer `TouchableWithoutFeedback`: `onLongPress` sets `longPressActiveRef.current = true` and calls `pauseReel()`; `onPressOut` calls `resumeReel()` and clears the flag; `delayLongPress={500}`
    - Two sibling `TouchableOpacity` zones each `flex: 1`: left calls `goBack()`, right calls `advance()` — both guarded by `if (!longPressActiveRef.current)`
  - _Requirements: 6.1, 6.2, 6.5, 7.1, 7.4, 10.4_

- [x] 6. Implement `Reel_Controller` state and timer logic in `PostcardReel.tsx`
  - Add the `PostcardReel` exported component with full state and timer wiring:
    - `useState`: `activeIndex`, `isPaused`
    - `useRef`: `elapsedRef`, `durationRef`, `animRef`, `progressAnim` (`new Animated.Value(0)`), `intervalRef`, `longPressActiveRef`, `videoRef`
  - `useGetEventPostcardsQuery({ eventId, limit: 100 })` → filter + enrich via `filterAndEnrichSlides`
  - `useEffect([activeIndex])`: clears prior interval + stops animation → resets `elapsedRef`, `durationRef`, `progressAnim` → starts `Animated.timing` + 16 ms `setInterval`; interval callback increments `elapsedRef` and calls `advance()` when `elapsed >= duration`; cleanup tears down both
  - `useEffect([isPaused])`: on pause — `animRef.stop()`, `clearInterval`, `videoRef.pauseAsync()`; on resume — restart timing with `remaining = duration - elapsed`, restart interval from current elapsed, `videoRef.playAsync()`
  - `handleVideoLoad`: updates `durationRef` and restarts animation with corrected remaining duration (guards against already-advanced slide)
  - `advance()`, `goBack()`, `pauseReel()`, `resumeReel()` functions wired to `GestureLayer`
  - Renders: `Modal` (overFullScreen) → full-screen `#000` View → `ReelSlide` → `BottomInfoOverlay` → `GestureLayer` → `SafeAreaView` (edges top) with `ProgressBar` + close button → loading / empty state branches
  - _Requirements: 1.3, 1.4, 2.4, 2.5, 3.1–3.5, 4.1–4.6, 5.5–5.6, 6.1–6.4, 7.1–7.7, 8.1–8.3, 9.1–9.3, 12.1–12.3_

  - [ ]* 6.1 Write unit tests for `Reel_Controller` timer state transitions
    - Reel opens at index 0 (Req 1.4)
    - Photo slide duration initialised to 3000 ms (Req 3.1)
    - Timer advance triggers slide advance at 3000 ms (Req 3.2)
    - Video slide defaults to 10000 ms before `onLoad` (Req 4.3)
    - `onLoad` with 6000 ms sets `durationRef = 6000` (Req 4.1)
    - `onLoad` with 15000 ms caps `durationRef = 10000` (Req 4.1)
    - Loop: advancing from last index sets index to 0 with 3 slides (Req 8.1)
    - Empty state shown when query returns zero valid postcards (Req 2.5)
    - Loading indicator shown while query is fetching (Req 2.4)
    - File: `components/event/PostcardsTab/__tests__/PostcardReel.unit.test.tsx`

- [ ] 7. Checkpoint — ensure all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire `PostcardReel` into `PostcardsTab/index.tsx`
  - Add to `index.tsx` (minimal, additive-only changes):
    - Import `PostcardReel` and `ReelPhase` from `./PostcardReel`
    - Add `const [showReel, setShowReel] = useState(false)` state
    - Derive `phasePostcardCounts` from the existing `myPostcardsData` result — a `Record<ActivityTiming, number>` counting postcards with valid `mediaUrl` per `activityTiming` using `vibeTagMap`
    - Inside the VibeTag card JSX, after `vibeAppliedBadge` and before the `createBtn`, conditionally render `Watch_Reel_Button` when `phasePostcardCounts[activeTiming] > 0`:
      ```tsx
      {phasePostcardCounts[activeTiming] > 0 && (
        <TouchableOpacity onPress={() => setShowReel(true)} style={s.watchReelBtn}>
          <Ionicons name="play-circle" size={16} color={brand.primary} />
          <Text style={s.watchReelBtnText}>Watch Reel</Text>
        </TouchableOpacity>
      )}
      ```
    - Add `watchReelBtn` and `watchReelBtnText` to the `StyleSheet`
    - After the existing `PostcardViewer` block, add:
      ```tsx
      {showReel && (
        <PostcardReel
          eventId={eventId}
          phase={activeTiming}
          vibeTagMap={vibeTagMap}
          onClose={() => setShowReel(false)}
        />
      )}
      ```
    - No other changes to `index.tsx`; `PostcardViewer.tsx` and `PhaseGrid` are untouched
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 11.1, 11.2, 11.4_

  - [ ]* 8.1 Write unit tests for Watch_Reel_Button visibility
    - Button hidden when `phasePostcardCounts[activeTiming] === 0` (Req 1.2)
    - Button visible when count > 0 (Req 1.1)
    - Switching active timing tab changes which phase's reel is accessible (Req 1.6)
    - File: `components/event/PostcardsTab/__tests__/PostcardsTab.reel.test.tsx`

- [ ] 9. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `PostcardViewer.tsx` MUST NOT be modified — non-regression rule from design doc
- `PhaseGrid` query MUST NOT be changed — Req 11.4
- Pure functions (`filterAndEnrichSlides`, `effectiveDuration`, `computeProgress`, `advanceIndex`, `goBackIndex`) are exported from `PostcardReel.tsx` for testability; they contain no React hooks or side effects
- `useNativeDriver: false` is required for the progress bar width animation — native driver does not support layout properties
- Property tests use fast-check with `numRuns: 100`; each test is tagged `// Feature: postcard-reel, Property N: <text>`
- Properties covered by PBT: 1, 2, 3b, 4, 5, 8, 9, 10, 12
- Properties 3, 6, 7, 11, 13, 14 are covered by unit / integration tests or visual inspection
