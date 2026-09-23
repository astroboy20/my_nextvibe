# Requirements Document

## Introduction

The Postcard Reel is a new full-screen viewing mode for the PostcardsTab in the NextVibe React Native / Expo app. It compiles event postcards into a continuous, auto-advancing slideshow — similar to Instagram Stories / Reels. There are three separate reels, one per event phase: Pre-Event, Main Event, and Post-Event. Each reel is accessed via a "Watch Reel" button placed within its corresponding timing section. Photo postcards display for 3 seconds; video postcards play for up to 10 seconds before auto-advancing. The reel loops continuously, and users can navigate, pause, and resume using gesture interactions. The existing 2-column grid and PostcardViewer are not affected.

## Glossary

- **Reel**: The full-screen auto-advancing slideshow component introduced by this feature.
- **Reel_Modal**: The `Modal` component that hosts the Reel, rendered over the PostcardsTab.
- **Reel_Controller**: The state-management logic (timers, index tracking, pause state) that drives the Reel.
- **Progress_Bar**: The segmented horizontal indicator at the top of the Reel that shows per-slide elapsed progress.
- **Slide**: A single postcard displayed within the Reel at any given moment. Each `PostcardData` item is one Slide.
- **Slide_Timer**: The countdown that controls how long a Slide stays visible before auto-advance.
- **Photo_Slide**: A Slide whose first media item has `mediaType` equal to `PHOTO` (or is not `VIDEO`).
- **Video_Slide**: A Slide whose first media item has `mediaType` equal to `VIDEO`.
- **PostcardData**: The existing data model — `id`, `caption`, `likeCount`, `commentCount`, `viewCount`, `isLiked`, `vibeTagId`, `createdAt`, `author`, `media[]`.
- **PostcardMediaItem**: A single media item within a `PostcardData`, with fields `mediaUrl`, `mediaType`, `thumbnailUrl`, `vibeTagOverlayUrl`.
- **PostcardsTab**: The existing tab component (`components/event/PostcardsTab/index.tsx`) containing the timing tabs, VibeTag card, 2-column grid, and section header.
- **PostcardViewer**: The existing TikTok-style vertical FlatList viewer — must not be modified by this feature.
- **Reel_Phase**: One of three event phases — `PRE_EVENT`, `DURING_EVENT`, or `POST_EVENT` — that determines which postcards a given Reel contains.
- **Watch_Reel_Button**: The pressable element rendered within each timing section of the PostcardsTab that opens the Reel_Modal for that phase's postcards.
- **Gesture_Zone**: Either the left or right half of the Reel screen used for tap navigation.
- **VibeTag_Overlay**: The semi-transparent overlay image (`vibeTagOverlayUrl`) composited on top of media during playback, consistent with the existing PostcardViewer.
- **RTK_Query**: The Redux Toolkit Query layer used to fetch data (`useGetEventPostcardsQuery`).

---

## Requirements

### Requirement 1: Watch Reel Entry Point (Per Phase)

**User Story:** As an event attendee, I want a "Watch Reel" button within each event phase section (Pre-Event, Main Event, Post-Event), so that I can launch a reel for that specific phase without leaving the grid view.

#### Acceptance Criteria

1. THE PostcardsTab SHALL render a Watch_Reel_Button inside the VibeTag card for the currently active timing tab (PRE_EVENT, DURING_EVENT, or POST_EVENT).
2. WHILE the count of valid postcards for the active timing phase is zero, THE PostcardsTab SHALL hide the Watch_Reel_Button for that phase.
3. WHEN the Watch_Reel_Button is pressed, THE Reel_Modal SHALL open in full-screen showing only the postcards belonging to the active timing phase.
4. WHEN the Reel_Modal is opened, THE Reel_Controller SHALL begin playback from the first Slide (index 0) of the phase-filtered postcard list.
5. THE PostcardsTab SHALL continue to render the 2-column grid and timing tabs beneath the Reel_Modal without modification.
6. THE PostcardsTab SHALL render a separate Watch_Reel_Button for each phase; switching the active timing tab changes which phase's reel is accessible.

---

### Requirement 2: Postcard Data Loading (Phase-Scoped)

**User Story:** As an event attendee, I want each phase reel to show only postcards from that phase, so that the Pre-Event, Main Event, and Post-Event reels tell distinct stories.

#### Acceptance Criteria

1. THE Reel_Controller SHALL load postcards using `useGetEventPostcardsQuery({ eventId, limit: 100 })` and filter client-side to only those whose associated VibeTag has an `activityTiming` matching the Reel_Phase passed as a prop.
2. THE Reel_Controller SHALL include only postcards that contain at least one `PostcardMediaItem` with a non-null, non-empty `mediaUrl`.
3. THE Reel_Controller SHALL use the same `vibeTagMap` resolution logic as the PostcardsTab to enrich each Slide's `vibeTagOverlayUrl` before playback begins.
4. WHILE the postcard query is loading, THE Reel_Modal SHALL display a full-screen loading indicator in place of slide content.
5. IF the phase-filtered postcard list contains zero valid postcards, THEN THE Reel_Modal SHALL display an empty-state message and a close button.
6. THE `phase` prop passed to `PostcardReel` SHALL be one of `'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT'`.

---

### Requirement 3: Photo Slide Duration

**User Story:** As an event attendee, I want photo postcards to display for exactly 3 seconds before the Reel advances, so that I have enough time to view each image.

#### Acceptance Criteria

1. WHEN a Photo_Slide becomes active, THE Slide_Timer SHALL be set to 3000 milliseconds.
2. WHEN the Slide_Timer for a Photo_Slide reaches zero, THE Reel_Controller SHALL advance to the next Slide.
3. WHILE the Reel is paused, THE Slide_Timer SHALL NOT decrement for the active Photo_Slide.
4. WHEN the Reel resumes from a paused state, THE Slide_Timer SHALL continue from the remaining duration at the point of pause, not from 3000 milliseconds.
5. THE Progress_Bar segment for the active Photo_Slide SHALL reflect `elapsed_ms / 3000` as a value between 0.0 and 1.0.

---

### Requirement 4: Video Slide Duration

**User Story:** As an event attendee, I want video postcards to play for up to 10 seconds before the Reel advances, so that longer videos do not stall the reel.

#### Acceptance Criteria

1. WHEN a Video_Slide becomes active, THE Slide_Timer SHALL be set to `min(actual_video_duration_ms, 10000)` milliseconds.
2. WHEN the Slide_Timer for a Video_Slide reaches zero, THE Reel_Controller SHALL advance to the next Slide regardless of whether the video has finished playing.
3. WHILE the actual video duration is unknown (not yet loaded), THE Reel_Controller SHALL use 10000 milliseconds as the Slide_Timer value and update it when the duration becomes available, provided the Slide has not yet advanced.
4. WHILE the Reel is paused, THE Video_Slide SHALL pause video playback AND halt the Slide_Timer simultaneously.
5. WHEN the Reel resumes from a paused state on a Video_Slide, THE Reel_Controller SHALL resume video playback AND the Slide_Timer from their respective paused positions.
6. THE Progress_Bar segment for the active Video_Slide SHALL reflect `elapsed_ms / effective_duration_ms` where `effective_duration_ms` is `min(actual_video_duration_ms, 10000)`.

---

### Requirement 5: Progress Bar

**User Story:** As an event attendee, I want a segmented progress bar at the top of the Reel, so that I can see how far through the current postcard and the overall reel I am.

#### Acceptance Criteria

1. THE Progress_Bar SHALL render one segment per Slide in the Reel, arranged horizontally across the full width of the screen.
2. THE Progress_Bar SHALL render fully-filled segments (width = 100%) for all Slides with an index less than the current active index.
3. THE Progress_Bar SHALL render an empty segment (width = 0%) for all Slides with an index greater than the current active index.
4. THE Progress_Bar SHALL render a partially-filled segment for the active Slide, with fill width proportional to `elapsed_ms / total_duration_ms`.
5. WHEN the Reel advances to the next Slide, THE Progress_Bar SHALL immediately set the previous segment to fully filled and begin animating the new active segment from 0%.
6. WHEN the Reel navigates backward to a previous Slide, THE Progress_Bar SHALL reset the current segment to empty and set the target segment's fill to represent the restart from 0%.
7. WHILE the Reel is paused, THE Progress_Bar segment fill SHALL remain static at the value it held at the moment of pause.

---

### Requirement 6: Gesture Navigation — Tap to Advance or Go Back

**User Story:** As an event attendee, I want to tap the right or left half of the Reel screen to navigate between postcards, so that I can control the pace of the reel.

#### Acceptance Criteria

1. WHEN the right Gesture_Zone (right 50% of screen width) is tapped, THE Reel_Controller SHALL advance to the next Slide.
2. WHEN the left Gesture_Zone (left 50% of screen width) is tapped and the active Slide index is greater than 0, THE Reel_Controller SHALL navigate to the previous Slide.
3. WHEN the left Gesture_Zone is tapped and the active Slide index is 0, THE Reel_Controller SHALL restart the current Slide from the beginning (reset elapsed time to 0, reset video position to 0).
4. WHEN navigation to a new Slide is triggered by a tap, THE Slide_Timer SHALL reset and begin from 0 for the new active Slide.
5. THE gesture detection SHALL NOT interfere with the long-press pause gesture defined in Requirement 7.

---

### Requirement 7: Long-Press to Pause and Resume

**User Story:** As an event attendee, I want to long-press the Reel screen to pause playback and release to resume, so that I can read captions or inspect a postcard at my own pace.

#### Acceptance Criteria

1. WHEN a long-press gesture begins on the Reel screen, THE Reel_Controller SHALL transition to the paused state.
2. WHILE in the paused state, THE Slide_Timer SHALL NOT advance.
3. WHILE in the paused state and the active Slide is a Video_Slide, THE Video_Slide SHALL pause video playback.
4. WHEN the long-press gesture ends (finger lifted), THE Reel_Controller SHALL transition to the resumed state.
5. WHEN the Reel_Controller transitions to the resumed state, THE Slide_Timer SHALL continue from the elapsed value recorded at the moment of pause.
6. WHEN the Reel_Controller transitions to the resumed state on a Video_Slide, THE Video_Slide SHALL resume video playback from the position recorded at the moment of pause.
7. THE Reel_Controller SHALL expose a boolean `isPaused` value that the Progress_Bar and Video_Slide can observe to synchronise their state.

---

### Requirement 8: Looping

**User Story:** As an event attendee, I want the Reel to loop back to the first postcard after the last one, so that I can keep watching without manually restarting.

#### Acceptance Criteria

1. WHEN the Reel_Controller advances past the last Slide (index equals `postcards.length - 1`), THE Reel_Controller SHALL set the active index to 0 and begin playback of the first Slide.
2. WHEN the Reel loops back to the first Slide, THE Progress_Bar SHALL reset all segments to empty and begin animating the first segment from 0%.
3. THE Reel_Controller SHALL loop indefinitely until the Reel_Modal is closed.

---

### Requirement 9: Close and Exit

**User Story:** As an event attendee, I want a close button on the Reel, so that I can return to the grid view at any time.

#### Acceptance Criteria

1. THE Reel_Modal SHALL render a visible close button in the top-right corner of the screen, above the Progress_Bar layer but accessible during playback.
2. WHEN the close button is pressed, THE Reel_Modal SHALL dismiss and THE PostcardsTab SHALL return to its prior state with the grid and timing tabs intact.
3. WHEN the Reel_Modal is dismissed, THE Reel_Controller SHALL stop all timers and release any held video playback resources.

---

### Requirement 10: Media Rendering and VibeTag Overlay

**User Story:** As an event attendee, I want each postcard in the Reel to display its media and VibeTag overlay consistently with the rest of the app, so that the visual style is cohesive.

#### Acceptance Criteria

1. THE Reel SHALL render Photo_Slides using the `expo-image` `Image` component with `contentFit="cover"` filling the full screen.
2. THE Reel SHALL render Video_Slides using the `expo-av` `Video` component with `ResizeMode.CONTAIN`, `shouldPlay` controlled by the active Slide and pause state.
3. WHERE a Slide has a non-null `vibeTagOverlayUrl`, THE Reel SHALL render the VibeTag_Overlay as a semi-transparent `expo-image` `Image` at `opacity: 0.65` absolutely positioned over the media, matching the behaviour in PostcardViewer.
4. THE Reel SHALL render the postcard author display name (or username as fallback), caption, and engagement counts (likes, comments, views) overlaid at the bottom of each Slide.
5. IF a Slide has no valid media item, THEN THE Reel_Controller SHALL skip that Slide and advance to the next without displaying it.

---

### Requirement 11: Reel Does Not Break Existing Features

**User Story:** As a developer, I want the Reel to be fully additive, so that the existing PostcardViewer and grid are not modified or disrupted.

#### Acceptance Criteria

1. THE PostcardsTab SHALL render the Watch_Reel_Button as an addition inside the VibeTag card for the active timing tab without altering any existing layout, style, or behaviour of that card.
2. THE PostcardViewer component SHALL NOT be modified to support the Reel.
3. THE Reel_Modal SHALL be implemented as a new, self-contained component tree separate from the PostcardViewer component.
4. THE existing `useGetEventPostcardsQuery` call in `PhaseGrid` SHALL NOT be altered by this feature.

---

### Requirement 12: Safe Area and Full-Screen Layout

**User Story:** As an event attendee, I want the Reel to fill the screen correctly on all devices, so that controls are not hidden behind notches or home indicators.

#### Acceptance Criteria

1. THE Reel_Modal SHALL use a `Modal` with `presentationStyle="overFullScreen"` and `transparent={false}` to cover the full screen.
2. THE Reel_Modal SHALL use `SafeAreaView` from `react-native-safe-area-context` to inset the Progress_Bar and close button within safe area boundaries.
3. THE media content area SHALL extend edge-to-edge (full screen dimensions) behind the safe area insets.
