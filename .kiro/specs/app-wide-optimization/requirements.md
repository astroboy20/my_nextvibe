# Requirements Document

## Introduction

NextVibe is an Expo (v56) React Native app that has grown organically across many features — event management, gamification, social feeds, postcards, messaging, payments, and push notifications. As the codebase has evolved, a number of structural and performance issues have accumulated:

- Several screen files exceed 800–1,255 lines, mixing data-fetching, business logic, and UI in a single component
- The `store/api/` directory holds 24 files, many of which are compatibility shims re-exporting from a canonical source, creating an unnecessary indirection layer
- Duplicate API definitions exist (e.g., `eventApi.ts` and `eventsApi.ts`, `userApi.ts` and `usersApi.ts`, `gameApi.ts` and `gamesApi.ts`)
- `useSocket.ts` reads the access token from `AsyncStorage` instead of `SecureStore`, inconsistent with the rest of the token infrastructure
- The `app.json` declares `android.permissions` with duplicate entries
- Unused variables and imports are present (e.g., `switchRole`, `isOrganizer` in `settings.tsx`)
- Client-side pagination and filtering in `app/(tabs)/index.tsx` does work that should be delegated to server-side query parameters
- The `store/store.ts` and `store/resetCaches.ts` must both be updated every time a new API slice is added, creating a maintenance footprint

The goal of this optimization effort is to refactor, clean, and harden the codebase without breaking any currently working functionality. Every change must be safe, incremental, and verifiable.

---

## Glossary

- **App**: The NextVibe Expo React Native application (Expo SDK 56).
- **Screen**: A top-level route component under `app/`.
- **Component**: A reusable UI element under `components/`.
- **API Slice**: An RTK Query `createApi` instance under `store/api/`.
- **Shim File**: A file that only re-exports symbols from another file.
- **Canonical Slice**: The `createApi` instance that actually defines endpoints (as opposed to a shim).
- **Store**: The Redux store configured in `store/store.ts`.
- **Token Store**: The `tokenStore` helper in `store/baseQuery.ts` that wraps `expo-secure-store`.
- **SecureStore**: `expo-secure-store` — the correct storage for auth tokens.
- **AsyncStorage**: `@react-native-async-storage/async-storage` — general-purpose storage, NOT appropriate for auth tokens.
- **RTK Query**: Redux Toolkit Query — the data-fetching and caching layer used throughout the app.
- **Bundle**: The JavaScript bundle produced by Metro for a given platform.
- **Dead Code**: Imported symbols, variables, or functions that are declared but never used.
- **Monolithic File**: A file exceeding ~300 lines that combines data fetching, business logic, and multiple UI sub-components.
- **Section Component**: A focused sub-component extracted from a monolithic screen to improve readability.
- **Inline Style Object**: An anonymous `{}` style passed directly as a prop, bypassing `StyleSheet.create` and re-allocating on every render.

---

## Requirements

### Requirement 1: File Decomposition — Monolithic Screens

**User Story:** As a developer, I want large screen files broken into focused, co-located modules, so that I can understand, test, and modify individual sections without reading the entire file.

#### Acceptance Criteria

1. WHEN a screen file exceeds 300 lines, THE Codebase SHALL extract logically independent sub-components and helpers into dedicated files co-located in a folder named after the screen.
2. THE Codebase SHALL extract the `DateTimePicker` component from `app/create.tsx` into `components/create/DateTimePicker.tsx`.
3. THE Codebase SHALL extract form field helper components (`StyledInput`, `SelectDropdown`, `TagChip`, `MediaBox`, `FieldLabel`) from `app/create.tsx` into `components/create/FormFields.tsx`.
4. THE Codebase SHALL extract the `SuccessModal` component from `app/create.tsx` into `components/create/SuccessModal.tsx`.
5. THE Codebase SHALL extract the `HeroMedia` component from `app/events/[id].tsx` into `components/event/HeroMedia.tsx`.
6. THE Codebase SHALL extract the `PrivateEventGate` component from `app/events/[id].tsx` into `components/event/PrivateEventGate.tsx`.
7. WHEN a section sub-component in `app/edit-event.tsx` has no dependencies outside that file, THE Codebase SHALL extract it into a dedicated file under `components/edit-event/sections/`.
8. THE App SHALL render identically on all affected screens after each extraction, with no regressions in navigation, data loading, or user interaction.

---

### Requirement 2: API Layer Consolidation

**User Story:** As a developer, I want a single authoritative API file per domain, so that I don't have to trace through shim re-exports to understand what endpoints exist or which cache tags are in use.

#### Acceptance Criteria

1. THE Codebase SHALL consolidate `store/api/eventsApi.ts` (shim) and `store/api/eventApi.ts` (canonical) so that a single file `store/api/eventApi.ts` contains all endpoints and exported types.
2. THE Codebase SHALL consolidate `store/api/usersApi.ts` (shim) and `store/api/userApi.ts` so that all user-related endpoints, types, and hooks come from a single canonical file.
3. THE Codebase SHALL consolidate `store/api/gamesApi.ts` (shim) and `store/api/gameApi.ts` so that all game-related endpoints and hooks come from a single canonical file.
4. THE Codebase SHALL consolidate `store/api/tagsApi.ts` (shim) into `store/api/discoverApi.ts`, adding the required re-export aliases directly.
5. WHEN a shim file is eliminated, THE Codebase SHALL update every import in `app/`, `components/`, `hooks/`, and `store/` to point to the canonical file.
6. AFTER consolidation, THE Store SHALL register exactly one RTK Query `reducerPath` per domain (no duplicate reducer paths in `store/store.ts`).
7. THE App SHALL compile without TypeScript errors after consolidation.
8. THE App SHALL pass all existing RTK Query cache invalidation and tag logic correctly after consolidation.

---

### Requirement 3: Dead Code Removal

**User Story:** As a developer, I want unused imports, variables, and commented-out code removed, so that files are shorter and TypeScript diagnostics are meaningful.

#### Acceptance Criteria

1. THE Codebase SHALL remove all TypeScript variables that are declared but never read (e.g., `switchRole` and `isOrganizer` in `app/settings.tsx`).
2. THE Codebase SHALL remove all import statements that import symbols never used in the file.
3. THE Codebase SHALL remove commented-out code blocks that represent permanently disabled features (e.g., the commented `useGetUserPostcardsQuery` and `useGetMyTicketsQuery` blocks in `app/(tabs)/profile.tsx`).
4. IF a commented-out block represents an intentionally deferred feature, THEN THE Codebase SHALL replace it with a `// TODO(feature-name): description` comment of at most one line.
5. THE App SHALL compile without TypeScript `noUnusedLocals` or `noUnusedParameters` warnings after this cleanup.

---

### Requirement 4: Token Storage Consistency

**User Story:** As a security-conscious developer, I want all authentication token reads to use `SecureStore` via the shared `tokenStore` helper, so that tokens are never accessible to other apps or stored in plain text.

#### Acceptance Criteria

1. WHEN `useSocket.ts` needs the access token to authenticate the WebSocket connection, THE Socket_Hook SHALL read the token using `tokenStore.get('accessToken')` from `@/store/baseQuery` instead of `AsyncStorage.getItemAsync`.
2. THE Codebase SHALL remove the `@react-native-async-storage/async-storage` import from `useSocket.ts` after migrating to `tokenStore`.
3. THE App SHALL maintain correct socket authentication behavior (connected status, token passed to `socket.io-client` auth) after the migration.
4. IF `tokenStore.get` returns `null` (no token), THEN THE Socket_Hook SHALL set socket status to `'error'` and skip the connection attempt, matching the existing behavior.

---

### Requirement 5: App Configuration Cleanup

**User Story:** As a developer maintaining the app build configuration, I want `app.json` free of duplicates and lint-safe, so that builds are predictable and the manifest is easy to audit.

#### Acceptance Criteria

1. THE App_Config SHALL contain each Android permission string at most once in the `android.permissions` array.
2. IF a plugin entry appears more than once in `app.json`, THEN THE App_Config SHALL retain only one instance of that entry.
3. THE App_Config SHALL declare the Google Maps API key in exactly one location per platform (not duplicated across `config.googleMaps.apiKey` and other fields).
4. WHEN the cleaned `app.json` is used for an EAS build, THE Build SHALL succeed without warnings about duplicate permissions or plugin conflicts.

---

### Requirement 6: RTK Query Optimization

**User Story:** As a developer, I want RTK Query configured optimally, so that screens avoid redundant network requests and stale data is managed consistently.

#### Acceptance Criteria

1. WHEN `getUser` and `getMe` in `store/api/authApi.ts` both query `GET /v1/users/me` with the same `providesTags: ["User"]`, THE API_Slice SHALL expose a single query endpoint for the current user's profile.
2. THE `store/store.ts` SHALL import and register API middlewares using a single array expression so that adding a new slice requires one change in one place.
3. THE `store/resetCaches.ts` SHALL reset all API caches using a single iterable list of API slices, avoiding repetitive `dispatch(api.util.resetApiState())` lines.
4. WHEN the discover screen `app/(tabs)/index.tsx` applies `activeChips.includes("Free")` client-side, THE Discover_Screen SHALL pass the applicable filter as a query parameter to the `getEvents` endpoint where the backend supports it, reducing unnecessary data transfer.
5. WHEN RTK Query `keepUnusedDataFor` is set, THE value SHALL be consistent across all API slices (300 seconds) unless a specific slice has a documented reason for a different value.

---

### Requirement 7: Render Performance — StyleSheet and Inline Styles

**User Story:** As a developer, I want inline style objects replaced with `StyleSheet.create` entries, so that React Native can cache and diff them efficiently without extra allocations per render.

#### Acceptance Criteria

1. THE Codebase SHALL not pass anonymous object literals (`{{ flex: 1 }}`) directly as `style` props in any component that renders inside a `FlatList` or `ScrollView`.
2. WHERE a `style` prop must be dynamic (e.g., computed width), THE Component SHALL use `StyleSheet.create` for the static base styles and compose them with the dynamic value using an array (`[styles.base, { width: dynamicValue }]`).
3. THE Codebase SHALL move all inline `style={{ ... }}` objects that appear in frequently-rendered list items into `StyleSheet.create` sheets.
4. WHEN these style changes are applied, THE App SHALL show no visible layout regressions on iOS or Android.

---

### Requirement 8: Image Loading Optimization

**User Story:** As a user, I want images to load quickly and smoothly, so that the discover feed and event detail screens feel responsive.

#### Acceptance Criteria

1. WHERE `<Image>` from `react-native` is used to display a remote URL that may be large (event fliers, user avatars, postcard thumbnails), THE Component SHALL use `<Image>` from `expo-image` instead, to benefit from built-in caching and progressive loading.
2. THE `expo-image` component SHALL be configured with `contentFit="cover"` (or the appropriate fit value) to match the current `resizeMode` of the replaced `Image`.
3. WHEN `expo-image` is substituted, THE visual output SHALL be pixel-equivalent to the original `react-native` `Image` on the same screen.
4. THE Codebase SHALL not add new usages of `react-native`'s `Image` component for remote URLs after this requirement is implemented.

---

### Requirement 9: Bundle Size Reduction

**User Story:** As a user, I want the app to download and launch as quickly as possible, so that the install and cold-start experience is fast.

#### Acceptance Criteria

1. THE Metro_Bundler configuration SHALL enable `resolver.unstable_enablePackageExports` to allow tree-shaking of packages that support it.
2. WHERE a module is imported using a barrel import (e.g., `import { X } from '@expo/vector-icons'`) and only one or two icons are used, THE Component SHALL use a direct import (e.g., `import { Ionicons } from '@expo/vector-icons/Ionicons'`) to avoid pulling the entire icon set into the bundle.
3. THE `metro.config.js` SHALL NOT import modules that are only needed at runtime as static top-level requires.
4. WHERE `require(...)` is used inside `useEffect` or event handlers for optional modules (Firebase, ImagePicker), THE pattern SHALL be documented with a comment explaining the lazy-load rationale.
5. THE App SHALL not regress on cold-start time as measured by Expo's `--profile` flag after these changes.

---

### Requirement 10: Code Consistency and Readability

**User Story:** As a developer, I want consistent naming conventions, import aliases, and file structure across the codebase, so that new contributors can orient themselves quickly.

#### Acceptance Criteria

1. THE Codebase SHALL use the `@/` path alias for all intra-project imports; relative imports (`../../`) SHALL NOT appear in any file under `app/`, `components/`, `hooks/`, or `store/`.
2. THE Codebase SHALL use `const` for all module-level style objects and configuration arrays that are never reassigned.
3. WHEN a helper function has no side effects and does not depend on component state or props, THE function SHALL be defined outside the component body to avoid re-creation on every render.
4. THE Codebase SHALL follow a consistent section-comment style (`// ─── Section Name ─────`) within files that use sections, matching the existing convention.
5. WHEN a `type` or `interface` is used in more than one file, THE type SHALL be defined in a dedicated `types.ts` file within its feature folder, and the relevant files SHALL import from it.
6. THE Codebase SHALL not use `any` as a type annotation in new code; existing `any` usages SHALL be replaced with explicit types where the shape is known.

---

### Requirement 11: Error Handling Consistency

**User Story:** As a user, I want to see meaningful error states instead of silent failures, so that I know when something went wrong and what to do next.

#### Acceptance Criteria

1. WHEN an RTK Query mutation fails in any screen, THE Screen SHALL display an error message to the user via `Toast.show` or an `Alert.alert` call — a silent empty `catch {}` block is not acceptable for user-visible mutations.
2. WHEN `bootstrapAuth` in `store/slices/authSlice.ts` catches a network error, THE Slice SHALL preserve the error message in `bootstrapError` state and THE App SHALL display a retry option when `bootstrapError` is non-null and `isBootstrapped` is true.
3. IF a socket connection fails (status `'error'`), THEN THE affected UI component SHALL display a non-blocking status indicator rather than silently rendering stale data.
4. THE Codebase SHALL not swallow errors with empty `catch {}` blocks in mutations that affect visible user state.

---

### Requirement 12: Maintainability — Preventing Regression

**User Story:** As a developer, I want the optimization work to be safe and incremental, so that no currently working feature is accidentally broken.

#### Acceptance Criteria

1. THE Codebase SHALL maintain behavioral parity with the current app for all screens and user flows after each refactoring step.
2. WHEN extracting a component or consolidating an API file, THE Developer SHALL verify that TypeScript compilation (`tsc --noEmit`) succeeds with zero errors before committing the change.
3. THE App SHALL launch successfully on both Android and iOS after every change that touches `store/store.ts`, `app/_layout.tsx`, or `store/baseQuery.ts`.
4. WHEN a shim file is deleted, THE Codebase SHALL have no remaining imports pointing to the deleted file path.
5. THE `store/resetCaches.ts` SHALL always reset every API slice registered in `store/store.ts` — the two lists SHALL be kept in sync.
