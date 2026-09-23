# Design Document: Postcard Reel

## Overview

The Postcard Reel is a full-screen, auto-advancing slideshow (Stories-style) that compiles event postcards for a specific phase into a continuous viewing experience. There are three separate reels — Pre-Event, Main Event, and Post-Event — each accessed from within its corresponding VibeTag card in `PostcardsTab` via a "Watch Reel" button. Photo slides display for 3 seconds; video slides play for up to 10 seconds. Users navigate with left/right tap zones and pause with a long-press. The reel loops indefinitely until closed.

The component is implemented as a single self-contained file: `components/event/PostcardsTab/PostcardReel.tsx`, accepting a `phase` prop to scope which postcards it plays. It mounts inside a `Modal` rendered by `PostcardsTab/index.tsx`. The existing `PostcardViewer` is not modified.

---

## Architecture

### Component Tree

```
PostcardsTab (index.tsx)
├── ... existing content (ScrollView, PhaseGrid, PostcardViewer, etc.) — UNCHANGED
└── PostcardReel (PostcardReel.tsx)           ← new Modal, rendered conditionally
    ├── Modal (presentationStyle="overFullScreen")
    │   ├── View [full-screen background, #000]
    │   │   ├── ReelSlide (active slide — media + overlay)
    │   │   │   ├── Image (photo) | ReelVideoPlayer (video)
    │   │   │   └── VibeTagOverlay (opacity 0.65, absolute)
    │   │   ├── BottomInfoOverlay (author, caption, counts)
    │   │   ├── GestureLayer (TouchableWithoutFeedback wrapping left+right zones)
    │   │   │   ├── TouchableOpacity [left 50%] — go back
    │   │   │   └── TouchableOpacity [right 50%] — advance
    │   │   ├── SafeAreaView (edges=['top'])
    │   │   │   ├── ProgressBar (segmented)
    │   │   │   └── CloseButton (top-right)
    │   │   └── LoadingState | EmptyState (conditional)
```

### Module Responsibilities

| Module | Responsibility |
|---|---|
| `PostcardsTab/index.tsx` | Adds Watch_Reel_Button inside the active timing VibeTag card; tracks `activeReelPhase` state; conditionally renders `<PostcardReel>`; passes `eventId`, `phase`, `vibeTagMap`, `onClose` |
| `PostcardReel.tsx` | Owns data fetching + phase filtering, Reel_Controller state, timer logic, animation, gesture handling, and full rendering |
| `PostcardReel.tsx / ReelVideoPlayer` | Internal sub-component for `expo-av` video playback with imperative `ref` pause/resume |
| `PostcardReel.tsx / ProgressBar` | Internal sub-component rendering animated segments |

---

## Components and Interfaces

### `PostcardReel` (public export)

```tsx
export type ReelPhase = 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT';

export interface PostcardReelProps {
  eventId: string;
  phase: ReelPhase;                          // which phase's postcards to play
  vibeTagMap: Record<string, VibeTag>;
  onClose: () => void;
}

export function PostcardReel(props: PostcardReelProps): JSX.Element
```

Rendered from `PostcardsTab/index.tsx` when the user taps "Watch Reel" inside the active timing VibeTag card:

```tsx
// Inside the VibeTag card (rendered for the activeTiming tab):
{phaseHasValidPostcards && (
  <TouchableOpacity onPress={() => setShowReel(true)}>
    <Ionicons name="play-circle" size={16} color={brand.primary} />
    <Text>Watch Reel</Text>
  </TouchableOpacity>
)}

// Conditionally in the component body:
{showReel && (
  <PostcardReel
    eventId={eventId}
    phase={activeTiming}           // 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT'
    vibeTagMap={vibeTagMap}
    onClose={() => setShowReel(false)}
  />
)}
```

The Watch_Reel_Button visibility is derived from a `phasePostcardCounts` map computed from the existing `useGetEventPostcardsQuery` result, keyed by `activityTiming`. No new network queries are needed in the parent.

### Phase Filtering Inside `PostcardReel`

On mount, `PostcardReel` fetches all postcards (`limit: 100`, no phase filter) and then filters client-side:

```ts
const slides = rawPostcards.filter((p) => {
  const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
  return tag?.activityTiming === phase && (p.media ?? []).some(m => !!m.mediaUrl);
});
```

This keeps the single RTK Query cache entry warm (the same query key used by `PhaseGrid`) and avoids an extra network round-trip.

### `ReelVideoPlayer` (internal)

```tsx
interface ReelVideoPlayerProps {
  src: string;
  shouldPlay: boolean;                       // driven by activeIndex + isPaused
  onDurationKnown: (ms: number) => void;     // fires once when Video.onLoad resolves
  videoRef: React.RefObject<Video>;          // forwarded so parent can call pauseAsync / playAsync
  overlayUrl?: string | null;
}
```

Wraps `expo-av Video` with `ResizeMode.CONTAIN`, `isLooping={false}`, and `isMuted={false}` (reel uses audio). Reports loaded duration via `onLoad` callback. The parent holds the `ref` and calls `pauseAsync()` / `playAsync()` imperatively to sync with the Reel_Controller pause state.

### `ProgressBar` (internal)

```tsx
interface ProgressBarProps {
  count: number;                             // total number of slides
  activeIndex: number;
  progressAnim: Animated.Value;             // 0→1 for the active segment
}
```

Renders `count` segments. Segments at index < `activeIndex` use `width: '100%'`. Segments at index > `activeIndex` use `width: '0%'`. The active segment's fill width is an interpolated `Animated.Value` driven by `Animated.timing`.

---

## Data Models

### Internal Reel State

```ts
// Reel_Controller state managed in PostcardReel via useRef + useState
interface ReelState {
  slides: PostcardData[];          // filtered + enriched postcards
  activeIndex: number;             // current slide index (useState)
  isPaused: boolean;               // long-press pause state (useState)
  elapsedRef: React.MutableRefObject<number>;    // ms elapsed on current slide (useRef)
  durationRef: React.MutableRefObject<number>;   // effective duration for current slide (useRef)
  animRef: React.MutableRefObject<Animated.CompositeAnimation | null>; // active Animated.timing
  progressAnim: Animated.Value;    // 0→1, useRef(new Animated.Value(0))
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}
```

Derived values (not stored in state):
- `effectiveDuration(slide)` → `slide` has `VIDEO` first-media? `Math.min(videoDurationMs, 10000)` : `3000`
- `isVideoSlide(slide)` → `slide.media[0]?.mediaType === 'VIDEO'`

### Slide Enrichment and Phase Filtering

Before playback, postcards are filtered by phase and enriched the same way `PostcardsTab.openViewer` does it:

```ts
const slides = rawPostcards
  .filter((p) => {
    const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
    return tag?.activityTiming === phase && (p.media ?? []).some(m => !!m.mediaUrl);
  })
  .map((p) => {
    const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
    const overlayUrl = tag?.imageUrl ?? null;
    return {
      ...p,
      media: (p.media ?? []).map((m) => ({
        ...m,
        vibeTagOverlayUrl: m.vibeTagOverlayUrl ?? overlayUrl,
      })),
    };
  });
```

---

## State Management and Timer Architecture

### Timer Design (critical)

The Reel_Controller uses `Animated.timing` as the primary animation driver — **not** a `setInterval` for the progress animation. A `setInterval` at 16ms is used only to track `elapsedRef` for snapshot purposes (so pause/resume knows how far along we are).

```
On slide activation:
  1. elapsedRef.current = 0
  2. durationRef.current = effectiveDuration(slide)
  3. progressAnim.setValue(0)
  4. Start Animated.timing(progressAnim, { toValue: 1, duration: durationRef.current, useNativeDriver: false })
     → store result in animRef.current
  5. Start setInterval(16ms tick) → each tick: elapsedRef.current += 16
     When elapsedRef.current >= durationRef.current → clearInterval, advance()

On pause (long-press begin):
  1. animRef.current?.stop()                 // freezes the Animated.Value
  2. clearInterval(intervalRef.current)      // stops elapsed tracking
  3. setIsPaused(true)
  4. videoRef.current?.pauseAsync()          // video slides only

On resume (long-press end):
  1. setIsPaused(false)
  2. const remaining = durationRef.current - elapsedRef.current
  3. Re-start Animated.timing(progressAnim, { toValue: 1, duration: remaining, useNativeDriver: false })
  4. Re-start setInterval(16ms) from current elapsedRef.current
  5. videoRef.current?.playAsync()           // video slides only

On tap-navigate (advance or go back):
  1. clearInterval(intervalRef.current)
  2. animRef.current?.stop()
  3. setActiveIndex(newIndex)
  → useEffect on activeIndex re-runs slide activation sequence
```

### Video Duration Handling

`onLoad` from `expo-av` Video returns a status object that includes `durationMillis`. When this fires for the currently active slide and the slide has not yet advanced:

```ts
const handleVideoLoad = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) return;
  const dMs = status.durationMillis ?? 10000;
  const effective = Math.min(dMs, 10000);
  if (effective === durationRef.current) return;   // no change needed
  // Recalculate: remaining = effective - elapsedRef.current
  durationRef.current = effective;
  animRef.current?.stop();
  const remaining = Math.max(effective - elapsedRef.current, 0);
  animRef.current = Animated.timing(progressAnim, {
    toValue: 1,
    duration: remaining,
    useNativeDriver: false,
  });
  animRef.current.start(({ finished }) => { if (finished) advance(); });
};
```

### useEffect Structure in PostcardReel

```
useEffect([activeIndex]) →
  • Clear previous interval + stop animation
  • Reset elapsedRef, durationRef, progressAnim
  • If video: set durationRef = 10000 (default until onLoad)
  • Start animation + interval
  • Return cleanup: clearInterval + animation.stop()

useEffect([isPaused]) →
  • If pausing: stop animation, clear interval, pause video
  • If resuming: restart animation with remaining duration, restart interval, play video

useEffect([] — unmount) →
  • clearInterval, stop animation, release video ref
```

---

## Gesture Handling

### Layout

The gesture layer sits below the SafeAreaView (progress bar + close button) in Z-order but covers the entire screen. It uses two sibling `TouchableOpacity` zones, each 50% width, wrapped in a `TouchableWithoutFeedback` that captures `onLongPress`, `onPressIn`, and `onPressOut`.

```
View [absolute fill, zIndex 10]
  TouchableWithoutFeedback
    [onLongPress → pause, onPressOut → resume if was paused]
    View [flex row, full screen height]
      TouchableOpacity [flex 1] → go back (left zone)
      TouchableOpacity [flex 1] → advance (right zone)
```

Tap vs long-press disambiguation follows the same pattern as the existing `PostcardViewer`: `onLongPress` fires after the OS threshold (~500ms); short taps fire `onPress` on the inner zone `TouchableOpacity`. The `TouchableWithoutFeedback` wrapper must set `delayLongPress` to match React Native's default (500ms) so it fires before the inner zone's `onPress` resolves — or use separate gesture state with a flag `isLongPressingRef` set in `onPressIn` cleared in `onPressOut`.

Recommended implementation using `isPausedRef`:

```tsx
const longPressActiveRef = useRef(false);

// Wrapper:
onLongPress={() => { longPressActiveRef.current = true; pauseReel(); }}
onPressOut={() => { if (longPressActiveRef.current) { longPressActiveRef.current = false; resumeReel(); } }}

// Inner zones (only fire if not a long press):
onPress={() => { if (!longPressActiveRef.current) goBack(); }}   // left
onPress={() => { if (!longPressActiveRef.current) advance(); }}  // right
```

### Navigation Logic

```ts
const advance = () => {
  const next = (activeIndex + 1) % slides.length;   // wraps → loop
  setActiveIndex(next);
};

const goBack = () => {
  if (activeIndex === 0) {
    // Restart current slide
    elapsedRef.current = 0;
    progressAnim.setValue(0);
    restartAnimation();
  } else {
    setActiveIndex(activeIndex - 1);
  }
};
```

---

## Data Flow

```
PostcardsTab
  │  eventId, vibeTagMap, activeTiming
  ▼
PostcardReel (phase = activeTiming)
  │  useGetEventPostcardsQuery({ eventId, limit: 100 })
  │    → rawData → filter(phase match + hasValidMedia) → enrich(vibeTagMap) → slides[]
  │
  ├─ Reel_Controller
  │    activeIndex ──────────────────────────────► ReelSlide (which postcard to show)
  │    isPaused ────────────────────────────────► ReelVideoPlayer (shouldPlay)
  │    progressAnim (Animated.Value 0→1) ──────► ProgressBar (active segment fill)
  │    elapsedRef / durationRef ───────────────► (internal timing only)
  │
  ├─ ReelSlide
  │    slide.media[0].mediaType === 'VIDEO' ?
  │      → ReelVideoPlayer (expo-av, ref, onLoad → durationKnown)
  │      → VibeTagOverlay (vibeTagOverlayUrl, opacity 0.65)
  │    : Image (expo-image, contentFit="cover")
  │      → VibeTagOverlay
  │
  ├─ BottomInfoOverlay
  │    slide.author.displayName / username
  │    slide.caption
  │    slide.likeCount / commentCount / viewCount
  │
  ├─ ProgressBar
  │    count = slides.length
  │    activeIndex
  │    progressAnim
  │
  └─ GestureLayer
       tap-left → goBack()
       tap-right → advance()
       long-press → pauseReel() / resumeReel()
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid media filter — all filtered slides have media

*For any* array of `PostcardData` objects passed through the Reel filter function, every item in the resulting array SHALL contain at least one `PostcardMediaItem` with a non-null, non-empty `mediaUrl`.

**Validates: Requirements 2.2, 10.5**

---

### Property 2: VibeTag overlay enrichment

*For any* `PostcardData` whose `vibeTagId` is a key in `vibeTagMap`, after the enrichment function is applied, every media item in that postcard's `media` array SHALL have a `vibeTagOverlayUrl` equal to `vibeTagMap[vibeTagId].imageUrl` (unless the item already had a non-null value).

**Validates: Requirements 2.3**

---

### Property 3: Watch Reel Button hidden when no valid postcards for that phase

*For any* list of `PostcardData` objects and a given `phase`, where no postcard has a matching VibeTag `activityTiming` and at least one valid `mediaUrl`, the Watch_Reel_Button for that phase SHALL NOT be rendered.

**Validates: Requirements 1.2**

---

### Property 3b: Phase filter scopes slides correctly

*For any* array of `PostcardData` objects and a given `phase`, every slide in the filtered result SHALL have a VibeTag `activityTiming` equal to `phase`.

**Validates: Requirements 2.1**

---

### Property 4: Progress bar segment count matches slide count

*For any* array of N valid slides, the `ProgressBar` component SHALL render exactly N segments.

**Validates: Requirements 5.1**

---

### Property 5: Progress bar fill invariant for non-active segments

*For any* active index `i` and slide array of length N, after rendering `ProgressBar`:
- Every segment at index `j < i` SHALL have fill value `1.0` (fully filled)
- Every segment at index `j > i` SHALL have fill value `0.0` (empty)

**Validates: Requirements 5.2, 5.3**

---

### Property 6: Pause freezes elapsed time

*For any* slide type (photo or video) and any elapsed time `E` at the moment of pause, after the reel enters the paused state, the `elapsedRef.current` value SHALL remain equal to `E` regardless of how much wall-clock time passes.

**Validates: Requirements 3.3, 4.4, 7.2**

---

### Property 7: Resume continues from saved position

*For any* slide type and any elapsed time `E` recorded at the moment of pause, after the reel resumes, the `Animated.timing` SHALL be started with `duration = effectiveDuration - E` (not from the full slide duration), and `elapsedRef.current` SHALL continue incrementing from `E`.

**Validates: Requirements 3.4, 4.5, 7.5**

---

### Property 8: Photo slide progress fraction is in [0.0, 1.0]

*For any* elapsed value `E` in the range `[0, 3000]`, the progress fraction computed for a photo slide SHALL equal `E / 3000` and SHALL be clamped to the range `[0.0, 1.0]`.

**Validates: Requirements 3.5, 5.4**

---

### Property 9: Effective video duration is min(actual, 10000)

*For any* video whose loaded duration is `D` milliseconds, the `effectiveDuration` used by the Reel_Controller SHALL equal `Math.min(D, 10000)`.

**Validates: Requirements 4.1, 4.6**

---

### Property 10: Loop wraps active index to 0

*For any* slide array of length N, when `advance()` is called while `activeIndex === N - 1`, the resulting `activeIndex` SHALL equal `0`.

**Validates: Requirements 8.1**

---

### Property 11: Navigation resets elapsed to 0

*For any* navigation action (tap-right advance, tap-left go-back when index > 0, or loop wrap), immediately after the new active index is set, `elapsedRef.current` SHALL equal `0` and `progressAnim` SHALL be set to `0`.

**Validates: Requirements 5.5, 5.6, 6.4**

---

### Property 12: Left-tap decrements index for any index > 0

*For any* active slide index `i > 0`, tapping the left gesture zone SHALL result in `activeIndex` becoming `i - 1`.

**Validates: Requirements 6.2**

---

### Property 13: VibeTag overlay rendered at opacity 0.65

*For any* slide whose first `PostcardMediaItem` has a non-null `vibeTagOverlayUrl`, the rendered slide SHALL include an `Image` component sourced from that URL with `opacity: 0.65`, absolutely positioned over the media.

**Validates: Requirements 10.3**

---

### Property 14: Bottom overlay includes author and counts for any slide

*For any* `PostcardData` slide, the bottom overlay SHALL render the author's `displayName` (or `username` as fallback), and the `likeCount`, `commentCount`, and `viewCount` values.

**Validates: Requirements 10.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Query loading | Render full-screen `ActivityIndicator`; show no slide content |
| Query error | Treat as empty state: render empty-state message + close button |
| Zero valid postcards | Empty state UI with close button (Requirement 2.5) |
| Video `onLoad` fails | Keep `durationRef = 10000` (default); log warning; timer proceeds normally |
| Video playback error | Log and advance to next slide after brief delay |
| Single postcard | Reel works normally; looping restarts the same single slide |
| `vibeTagId` not in `vibeTagMap` | `overlayUrl` remains `null`; no overlay rendered |
| Media item with null `mediaUrl` | Filtered out before slides array is built; never shown |
| Component unmounts mid-play | `useEffect` cleanup clears interval and stops animation |

---

## Testing Strategy

### Property-Based Testing Library

Use [**fast-check**](https://github.com/dubzzz/fast-check) for TypeScript/React Native. Configure each property test to run a minimum of **100 iterations**.

Tag format for each test: `// Feature: postcard-reel, Property N: <property_text>`

### Unit Tests (example-based)

Focus on specific state transitions and integration points that are not covered by property tests:

- Reel opens at index 0 (Requirement 1.4)
- Photo slide duration initialised to 3000ms (Requirement 3.1)
- Timer advance triggers slide advance at 3000ms (Requirement 3.2)
- Video slide defaults to 10000ms before `onLoad` (Requirement 4.3)
- `onLoad` with 6000ms video sets `durationRef = 6000` (Requirement 4.1)
- `onLoad` with 15000ms video sets `durationRef = 10000` (Requirement 4.1 cap)
- Right-zone tap calls `advance()` (Requirement 6.1)
- Left-zone tap at index 0 resets elapsed and restarts slide (Requirement 6.3)
- Long-press calls `pauseReel()` (Requirement 7.1)
- Release after long-press calls `resumeReel()` (Requirement 7.4)
- Close button calls `onClose` and cleanup fires (Requirement 9.2, 9.3)
- Loop: advancing from last index sets index to 0 (example with 3 slides)
- Empty state shown when query returns zero valid postcards (Requirement 2.5)
- Loading indicator shown while query is fetching (Requirement 2.4)

### Property-Based Test Sketches

```ts
import fc from 'fast-check';
import { filterValidSlides, enrichSlides, computeProgress, effectiveDuration } from '../PostcardReel';

// Feature: postcard-reel, Property 1: Valid media filter
test('Property 1: all filtered slides have valid mediaUrl', () => {
  fc.assert(fc.property(fc.array(arbitraryPostcardData()), (postcards) => {
    const filtered = filterValidSlides(postcards);
    return filtered.every(p =>
      (p.media ?? []).some(m => !!m.mediaUrl && m.mediaUrl.length > 0)
    );
  }), { numRuns: 100 });
});

// Feature: postcard-reel, Property 2: VibeTag enrichment
test('Property 2: vibeTagOverlayUrl is set from vibeTagMap', () => {
  fc.assert(fc.property(
    fc.array(arbitraryPostcardData()),
    arbitraryVibeTagMap(),
    (postcards, vibeTagMap) => {
      const enriched = enrichSlides(postcards, vibeTagMap);
      return enriched.every(p => {
        if (!p.vibeTagId || !vibeTagMap[p.vibeTagId]) return true;
        const expected = vibeTagMap[p.vibeTagId].imageUrl;
        return (p.media ?? []).every(m =>
          m.vibeTagOverlayUrl === expected || m.vibeTagOverlayUrl != null
        );
      });
    }
  ), { numRuns: 100 });
});

// Feature: postcard-reel, Property 4+5: Progress bar segment count and fill invariant
test('Property 4+5: segment count and fill values are consistent', () => {
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 50 }),
    fc.integer({ min: 0 }),
    (n, rawIdx) => {
      const activeIndex = rawIdx % n;
      const segments = computeSegments(n, activeIndex, 0.5);
      expect(segments).toHaveLength(n);
      segments.forEach((fill, i) => {
        if (i < activeIndex) expect(fill).toBe(1.0);
        if (i > activeIndex) expect(fill).toBe(0.0);
      });
    }
  ), { numRuns: 100 });
});

// Feature: postcard-reel, Property 8: Photo progress fraction clamped
test('Property 8: photo progress fraction in [0, 1]', () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 3000 }), (elapsed) => {
    const fraction = computeProgress(elapsed, 3000);
    return fraction >= 0.0 && fraction <= 1.0 && Math.abs(fraction - elapsed / 3000) < 1e-9;
  }), { numRuns: 100 });
});

// Feature: postcard-reel, Property 9: Effective video duration = min(actual, 10000)
test('Property 9: effectiveDuration is min(actual, 10000)', () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 60000 }), (durationMs) => {
    return effectiveDuration('VIDEO', durationMs) === Math.min(durationMs, 10000);
  }), { numRuns: 100 });
});

// Feature: postcard-reel, Property 10: Loop wraps to 0
test('Property 10: advancing from last index wraps to 0', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
    return advanceIndex(n - 1, n) === 0;
  }), { numRuns: 100 });
});

// Feature: postcard-reel, Property 12: Left tap decrements index
test('Property 12: left tap decrements active index for any i > 0', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), (i) => {
    return goBackIndex(i, i + 1) === i - 1;   // i is activeIndex, i+1 is slides.length
  }), { numRuns: 100 });
});
```

The pure functions (`filterValidSlides`, `enrichSlides`, `computeProgress`, `effectiveDuration`, `advanceIndex`, `goBackIndex`, `computeSegments`) are extracted from `PostcardReel.tsx` and exported for testability — they contain no React hooks or side effects.

### Integration Tests

- Smoke test: `PostcardReel` renders within a test harness with mocked RTK Query provider and advances through 2 slides without crashing.
- Verify `useGetEventPostcardsQuery` is called with `{ eventId, limit: 100 }` and slides are then filtered client-side by the `phase` prop.
- Smoke test: switching `activeTiming` in PostcardsTab and opening the reel plays only slides matching that phase.
