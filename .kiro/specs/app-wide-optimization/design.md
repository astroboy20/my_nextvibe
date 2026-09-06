# Design Document

## App-Wide Optimization

---

## Overview

This document describes the technical design for the app-wide optimization effort on the NextVibe Expo (SDK 56) React Native application. The goal is to refactor, clean, and harden the codebase across 12 concern areas without breaking any currently working functionality. Every change is safe, incremental, and independently verifiable via TypeScript compilation.

The app is built with Expo Router v6, Redux Toolkit + RTK Query, Firebase push notifications, socket.io-client for real-time messaging, and TypeScript. Key files affected span `app/`, `components/`, `store/`, `hooks/`, `metro.config.js`, and `app.json`.

The optimizations are grouped into four broad categories:

1. **Structural** — file decomposition, API consolidation, dead code removal  
2. **Security / Correctness** — token storage migration, error handling  
3. **Performance** — StyleSheet optimizations, expo-image migration, bundle size  
4. **Maintainability** — code consistency, regression prevention, store synchronization  

---

## Architecture

### Current State

```
app/
  create.tsx          ← 1,255 lines (monolithic)
  events/[id].tsx     ← ~870 lines (monolithic)
  edit-event.tsx      ← ~700 lines (section components still in-file)
  (tabs)/index.tsx    ← pagination + client-side filtering mixed together
  settings.tsx        ← unused vars (switchRole, isOrganizer)

store/api/
  eventApi.ts         ← canonical (948 lines)
  eventsApi.ts        ← shim re-exporting from eventApi
  userApi.ts          ← canonical (slim, 3 endpoints)
  usersApi.ts         ← shim re-exporting from authApi + userApi
  gameApi.ts          ← canonical (rewards + AI generation)
  gamesApi.ts         ← shim re-exporting from eventApi + gameApi
  tagsApi.ts          ← shim re-exporting from discoverApi
  authApi.ts          ← getUser AND getMe both query /v1/users/me

store/
  store.ts            ← verbose per-slice middleware concat (17 slices)
  resetCaches.ts      ← 17 separate dispatch(api.util.resetApiState()) lines

hooks/
  useSocket.ts        ← reads token via AsyncStorage (insecure)

metro.config.js       ← no unstable_enablePackageExports, no path aliases
app.json              ← duplicate android.permissions entries
```

### Target State

```
app/
  create.tsx                   ← orchestration shell only (~200 lines)
  events/[id].tsx              ← orchestration shell only (~400 lines)

components/
  create/
    DateTimePicker.tsx         ← extracted
    FormFields.tsx             ← extracted (StyledInput, SelectDropdown, TagChip, FieldLabel, MediaBox)
    SuccessModal.tsx           ← extracted
  event/
    HeroMedia.tsx              ← extracted
    PrivateEventGate.tsx       ← extracted
  edit-event/sections/
    RsvpTrackerSection.tsx     ← extracted
    EditEventSection.tsx       ← extracted
    EventRemindersSection.tsx  ← extracted
    EventTagsSection.tsx       ← extracted
    VibeTagStudioSection.tsx   ← extracted
    TicketSection.tsx          ← extracted
    GamificationSection.tsx    ← extracted
    AnalyticsSection.tsx       ← extracted
    StatusSection.tsx          ← extracted
    PublishSection.tsx         ← extracted

store/api/
  eventApi.ts    ← single canonical source for events + games + postcards
  userApi.ts     ← expanded: absorbs usersApi content (switchRole, updateMe, getUser)
  authApi.ts     ← single /v1/users/me endpoint (getMe removed)
  discoverApi.ts ← absorbs tagsApi; exports aliases
  gameApi.ts     ← rewards + AI generation only (shim removed)
  (eventsApi.ts, usersApi.ts, gamesApi.ts, tagsApi.ts — DELETED)

store/
  store.ts        ← API_SLICES constant drives both reducer and middleware
  resetCaches.ts  ← iterates API_SLICES constant

hooks/
  useSocket.ts    ← reads token via tokenStore.get('accessToken')

metro.config.js   ← unstable_enablePackageExports + path aliases
app.json          ← deduplicated permissions + plugins
```

---

## Components and Interfaces

### 1. File Decomposition

#### `components/create/DateTimePicker.tsx`

```typescript
export interface DateTimePickerProps {
  visible: boolean;
  initial: Date;
  mode: 'date' | 'time';
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}
export default function DateTimePicker(props: DateTimePickerProps): JSX.Element;
```

Pure JS inline picker (no native module dependency). Extracted verbatim from `app/create.tsx`. All helper functions (`pad`, `formatDisplayDate`, `formatDisplayTime`) that it relies on move into this file. The `Column` sub-component lives inside this file as a private helper.

#### `components/create/FormFields.tsx`

```typescript
export function FieldLabel(props: { text: string; required?: boolean }): JSX.Element;
export function StyledInput(props: StyledInputProps): JSX.Element;
export function SelectDropdown(props: SelectDropdownProps): JSX.Element;
export function TagChip(props: { label: string; onRemove: () => void }): JSX.Element;
export interface UploadState { status: 'idle'|'uploading'|'done'|'error'; progress: number; url: string|null; localUri: string|null; fileName: string|null; }
export const IDLE_UPLOAD: UploadState;
export function MediaBox(props: MediaBoxProps): JSX.Element;
```

`app/create.tsx` imports from this module. All field-specific `StyleSheet.create` entries move with the components.

#### `components/create/SuccessModal.tsx`

```typescript
export interface SuccessModalProps { eventId: string; onClose: () => void; }
export default function SuccessModal(props: SuccessModalProps): JSX.Element;
```

Uses `useRouter` internally. No props beyond `eventId` and `onClose`.

#### `components/event/HeroMedia.tsx`

```typescript
export interface HeroMediaProps { flierUrl?: string | null; promoVideoUrl?: string | null; }
export default function HeroMedia(props: HeroMediaProps): JSX.Element;
```

Manages `Animated` values and timer refs internally. Uses `expo-image` for the flier (see §Image Loading Optimization). Video stays as `expo-av` Video.

#### `components/event/PrivateEventGate.tsx`

```typescript
export interface PrivateEventGateProps {
  eventName?: string;
  onSubmit: (key: string) => void;
  onBack: () => void;
  isChecking: boolean;
  errorMsg: string | null;
}
export default function PrivateEventGate(props: PrivateEventGateProps): JSX.Element;
```

Manages the `key` input state internally.

#### `components/edit-event/sections/` (10 files)

Each section component has a clear, narrow interface derived from what it already receives in `app/edit-event.tsx`. They are co-located with the existing `components/edit-event/` folder. Example:

```typescript
// GamificationSection.tsx
export interface GamificationSectionProps {
  eventId: string;
  eventStatus?: string;
  eventName?: string;
  eventStartsAt?: string;
}
export default function GamificationSection(props: GamificationSectionProps): JSX.Element;
```

`GamificationSection` is the one section that calls its own RTK Query hook (`useGetGamesQuery`) — this is intentional because it owns the live game count badge.

---

### 2. API Layer Consolidation

#### Shim Elimination Strategy

The four shim files (`eventsApi.ts`, `usersApi.ts`, `gamesApi.ts`, `tagsApi.ts`) are deleted. All consumers are updated to import directly from the canonical files. The steps for each:

**eventsApi.ts → eventApi.ts**

`eventsApi.ts` exports:
- Hook aliases (`useGetEventByIdQuery`, `useGetEventVibeTagsQuery`, `useGetEventTicketsQuery`, `useRsvpEventMutation`) — move as named re-exports inside `eventApi.ts`'s export block
- Types (`DiscoverEvent`, `EventCardData`, `FeedPostcard`) — move into `eventApi.ts`
- `toCardData` utility — moves into `eventApi.ts`

`app/(tabs)/index.tsx` currently imports from both; after consolidation imports only from `@/store/api/eventApi`.

**usersApi.ts → userApi.ts + authApi.ts**

`usersApi.ts` re-exports from `authApi` (getMe, getUser, getOrganizerEvents, etc.) and `userApi` (switchRole, updateMe). It also exposes `authApi as usersApi` for `resetApiState` in `useAuth.ts`. After elimination: `useAuth.ts` imports `authApi` directly; all hook imports are updated to point to their canonical source.

**gamesApi.ts → eventApi.ts + gameApi.ts**

The shim re-exports game-session management hooks from `eventApi` and AI/rewards hooks from `gameApi`. After elimination, consumers import from the appropriate canonical file. The `useGenerateAiDraftMutation` alias is added directly to `gameApi.ts`'s export block.

**tagsApi.ts → discoverApi.ts**

The shim exports `useGetAllTagsQuery` (→ `useGetVibeTagsQuery`) and `useCreateTagMutation`. Both aliases are added as named exports in `discoverApi.ts`:

```typescript
// discoverApi.ts — added aliases
export { useGetVibeTagsQuery as useGetAllTagsQuery } from './discoverApi'; // self-alias in export
export { useCreateDiscoverTagMutation as useCreateTagMutation };
export { discoverApi as tagsApi }; // for any resetApiState call sites
```

#### `authApi.ts` — Duplicate Endpoint Removal

`getUser` and `getMe` both query `GET /v1/users/me` with `providesTags: ["User"]`. Remove `getUser`; keep `getMe` as the canonical endpoint. Any consumer of `useGetUserQuery` is updated to use `useGetMeQuery`.

---

### 3. Store Synchronization

The core insight is that `store.ts` and `resetCaches.ts` must always contain the same set of API slices. The design uses a single `API_SLICES` constant shared between both files to enforce this invariant:

```typescript
// store/apiSlices.ts  ← NEW shared constant file
import { adminApi }             from './api/admin';
import { analyticsApi }         from './api/analyticsApi';
import { authApi }              from './api/authApi';
import { campaignApi }          from './api/campaignApi';
import { discoverApi }          from './api/discoverApi';
import { eventsApi }            from './api/eventApi';
import { gamesApi }             from './api/gameApi';
import { launchApi }            from './api/launchApi';
import { messagingApi }         from './api/messagingApi';
import { notificationApi }      from './api/notificationApi';
import { organizerPaymentApi }  from './api/organizerPaymentApi';
import { paymentApi }           from './api/paymentApi';
import { payoutApi }            from './api/payoutApi';
import { pledgeApi }            from './api/pledgeApi';
import { reminderApi }          from './api/reminderApi';
import { socialApi }            from './api/socialApi';
import { userApi }              from './api/userApi';

// Single source of truth for all API slices.
// Add new slices here — store.ts and resetCaches.ts pick them up automatically.
export const API_SLICES = [
  adminApi, analyticsApi, authApi, campaignApi, discoverApi,
  eventsApi, gamesApi, launchApi, messagingApi, notificationApi,
  organizerPaymentApi, paymentApi, payoutApi, pledgeApi,
  reminderApi, socialApi, userApi,
] as const;

export type ApiSlice = typeof API_SLICES[number];
```

```typescript
// store/store.ts
import { API_SLICES } from './apiSlices';

const apiReducers = Object.fromEntries(
  API_SLICES.map((api) => [api.reducerPath, api.reducer])
);

export const store = configureStore({
  reducer: { auth: authReducer, theme: themeReducer, ...apiReducers },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...API_SLICES.map((api) => api.middleware)),
});
```

```typescript
// store/resetCaches.ts
import { API_SLICES } from './apiSlices';

export function resetAllApiCaches(dispatch: DispatchFn): void {
  for (const api of API_SLICES) {
    dispatch(api.util.resetApiState());
  }
}
```

Adding a new slice now requires one change in one place (`apiSlices.ts`).

---

### 4. Token Storage Migration — `useSocket.ts`

Replace `AsyncStorage.getItem('accessToken')` with `tokenStore.get('accessToken')`:

```typescript
// Before
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('accessToken');

// After
import { tokenStore } from '@/store/baseQuery';
const token = await tokenStore.get('accessToken');
```

Behavioral equivalence: `tokenStore.get` returns `string | null`, same type as `AsyncStorage.getItem`. The null-check path (set status to `'error'`, skip io()) is unchanged.

---

### 5. RTK Query Optimization

#### Discover Screen — Server-Side "Free" Filter

Currently `app/(tabs)/index.tsx` uses `activeChips.includes("Free")` to client-side filter events with no ticket tiers. The backend's `getEvents` endpoint already supports query params. The query should be updated:

```typescript
// In eventApi.ts getEvents endpoint
getEvents: builder.query<any, GetEventsParams | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page)    p.set('page',    String(params.page));
    if (params?.limit)   p.set('limit',   String(params.limit));
    if (params?.isPublic !== undefined) p.set('isPublic', String(params.isPublic));
    if (params?.free)    p.set('free',    'true');  // ← new
    return `/v1/events${p.toString() ? `?${p.toString()}` : ''}`;
  },
  providesTags: ['Events'],
}),
```

The "Free" chip in the home screen passes `free: true` to the query. The remaining client-side chips (Has Games, Has VibeTag, Starting Soon) stay client-side as the backend may not support them yet — document with `// TODO(server-filter): ...` comments.

---

### 6. Image Loading — expo-image Migration

`expo-image` is already installed (`"expo-image": "~3.0.11"` in package.json). The migration replaces `import { Image } from 'react-native'` with `import { Image } from 'expo-image'` for components that load remote URLs.

| Component | Current resizeMode | expo-image contentFit |
|---|---|---|
| `components/discover/EventCard.tsx` (flier) | `cover` | `cover` |
| `components/event/HeroMedia.tsx` (flier) | `cover` | `cover` |
| `app/users/[id].tsx` (avatar) | `cover` | `cover` |
| `components/event/AboutTab.tsx` (organizer avatar) | `cover` | `cover` |

Components rendering purely local assets (`require('../assets/...')`) do not need migration.

---

### 7. Bundle Size — Metro Config

```javascript
// metro.config.js
'use strict';
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable package exports for tree-shaking (e.g., date-fns, lodash-es)
config.resolver.unstable_enablePackageExports = true;

// Path alias — @/ → project root
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(__dirname),
};

// Firebase mock (existing, unchanged)
if (process.env.FIREBASE_MOCK === '1') {
  console.log('[Metro] FIREBASE_MOCK=1 — Firebase replaced with no-op stub');
  const mock = path.resolve(__dirname, 'mocks/firebase-mock.js');
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@react-native-firebase/app': mock,
    '@react-native-firebase/messaging': mock,
  };
}

module.exports = config;
```

For icon imports: components that import only `Ionicons` should use `import Ionicons from '@expo/vector-icons/Ionicons'` rather than the barrel `@expo/vector-icons`.

---

### 8. Error Handling

#### Bootstrap Error Retry UI

`store/slices/authSlice.ts` already preserves `bootstrapError` in the rejected case. The missing piece is a retry UI. `app/_layout.tsx`'s `AuthGate` component adds a retry screen when `isBootstrapped && bootstrapError`:

```tsx
// AuthGate — add before the oauthPending check
if (isBootstrapped && bootstrapError && !isAuthenticated) {
  return (
    <View style={styles.retryScreen}>
      <Text style={styles.retryTitle}>Connection Error</Text>
      <Text style={styles.retryMessage}>Could not reach the server. Check your connection.</Text>
      <TouchableOpacity onPress={() => store.dispatch(bootstrapAuth())}>
        <Text style={styles.retryButton}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

#### Silent Catch Blocks

All user-visible mutations must follow the pattern established in `app/edit-event.tsx`:

```typescript
try {
  await doMutation().unwrap();
} catch (err: any) {
  const msg = err?.data?.message ?? 'Something went wrong.';
  Toast.show({ type: 'error', text1: 'Error', text2: msg });
}
```

Files that currently have empty `catch {}` on user-visible mutations: `app/auth/login.tsx`, `app/(auth)/register.tsx` — these will be updated.

---

## Data Models

### `GetEventsParams` (new type in `eventApi.ts`)

```typescript
export interface GetEventsParams {
  page?: number;
  limit?: number;
  isPublic?: boolean;
  free?: boolean;  // ← new: server-side free filter
}
```

### `ApiSlices` shared constant

Defined in `store/apiSlices.ts` (see §Store Synchronization above). This is the canonical source of truth for all registered slices.

### `DiscoverEvent` and `EventCardData` (moved to `eventApi.ts`)

Currently defined in `store/api/eventsApi.ts` (the shim). Moved into `eventApi.ts` as named exports. Import paths updated across the codebase.

### `SocketStatus` (unchanged)

```typescript
export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a refactoring/optimization effort spanning code organization, configuration, and data-fetching. The majority of acceptance criteria are structural (SMOKE) checks verified by TypeScript compilation and file-system assertions. However, several criteria involve universal properties over collections of files or runtime inputs that are worth capturing as property-based tests.

---

### Property 1: Socket token source correctness

*For any* non-null access token value stored via `tokenStore.set('accessToken', token)`, when `useSocket`'s `connect()` function runs, the `io()` call must receive `auth: { token }` equal to that stored value — and `AsyncStorage.getItem` must never be called.

**Validates: Requirements 4.1, 4.3**

---

### Property 2: Null token skips socket connection

*For any* invocation of `useSocket`'s connect logic where `tokenStore.get('accessToken')` returns `null`, the socket status must be set to `'error'` and `io()` must not be called.

**Validates: Requirements 4.4**

---

### Property 3: app.json has no duplicate Android permissions

*For any* state of the `app.json` file, the `expo.android.permissions` array must contain no duplicate string entries.

**Validates: Requirements 5.1**

---

### Property 4: app.json has no duplicate plugin entries

*For any* state of the `app.json` file, the `expo.plugins` array must contain no two entries that resolve to the same plugin name (first element of tuple or string value).

**Validates: Requirements 5.2**

---

### Property 5: resetCaches and store slices are in sync

*For any* API slice registered in `store/store.ts` (keyed by `reducerPath`), that same slice must appear in `resetAllApiCaches` in `store/resetCaches.ts`, and vice versa.

**Validates: Requirements 6.3, 12.5**

---

### Property 6: keepUnusedDataFor is consistent across slices

*For any* RTK Query API slice in `store/api/`, the `keepUnusedDataFor` value must equal 300 unless the slice has a comment explicitly documenting the reason for a different value.

**Validates: Requirements 6.5**

---

### Property 7: Remote image components use expo-image

*For any* JSX file in `components/` or `app/` that renders an `<Image>` component with a `source={{ uri: ... }}` prop pointing to a remote URL, the `Image` import must come from `expo-image`, not `react-native`.

**Validates: Requirements 8.1**

---

### Property 8: No barrel icon imports where only one icon family is used

*For any* TypeScript file that imports from `@expo/vector-icons` (the barrel) and uses only a single icon family (e.g., only `Ionicons`), the import must use the direct sub-path (e.g., `@expo/vector-icons/Ionicons`) instead.

**Validates: Requirements 9.2**

---

### Property 9: No relative imports in core directories

*For any* TypeScript file under `app/`, `components/`, `hooks/`, or `store/`, all intra-project import paths must begin with `@/` and must not begin with `../` or `./`.

**Validates: Requirements 10.1**

---

### Property 10: bootstrapAuth preserves error state on any failure

*For any* error thrown inside the `bootstrapAuth` thunk (network error, JSON parse error, unexpected exception), the resulting Redux state must have `isBootstrapped: true` and `bootstrapError` set to a non-empty string.

**Validates: Requirements 11.2**

---

### Property 11: Deleted shim files have no remaining imports

*For any* file path that is deleted as part of the shim elimination (eventsApi.ts, usersApi.ts, gamesApi.ts, tagsApi.ts), no remaining TypeScript file in the workspace must contain an import referencing that path.

**Validates: Requirements 2.5, 12.4**

---

**Property Reflection:**

- Properties 5 and 11 are complementary: 5 ensures the store/reset sync; 11 ensures deleted shims have no consumers. They validate different aspects with no redundancy.
- Properties 1 and 2 together cover the full socket token migration: non-null and null cases. Property 2 is not subsumed by Property 1 because they test different branches.
- Properties 3 and 4 are structurally similar but target different fields in app.json (permissions vs plugins) — no consolidation needed because the deduplication logic differs.
- Property 9 (no relative imports) could theoretically subsume style-related properties, but style properties (7, 8) are about content of imports, not path format — no redundancy.

---

## Error Handling

### Taxonomy of Error Surfaces

| Surface | Current Behavior | Target Behavior |
|---|---|---|
| RTK mutation failure | Mixed: some show Alert, some have empty `catch {}` | All show `Toast.show` or `Alert.alert` with a human-readable message |
| `bootstrapAuth` network error | Sets `bootstrapError` in Redux but no retry UI | Renders a retry screen in `AuthGate` when `bootstrapError` is non-null |
| Socket connection failure | `status === 'error'` set but UI may show stale data silently | Components consuming `useSocket` check `status === 'error'` and show a non-blocking indicator |
| Image load failure | Relies on RN Image's fallback (blank) | `expo-image` provides built-in blurhash placeholder support |

### Error Propagation Rules

1. **Never swallow errors in user-visible flows.** Any mutation that modifies state the user can see must surface failures.
2. **Network errors on bootstrap are non-fatal.** The `bootstrapAuth` thunk already handles this: it returns `null` (not reject) on network failure. The slice stores `bootstrapError` so the UI can offer retry.
3. **Socket errors are non-blocking.** The socket is a real-time enhancement; its failure must not block navigation or primary data display.
4. **Token errors on socket are fast-fail.** If `tokenStore.get` returns null, the hook sets `'error'` status immediately without attempting connection.

---

## Testing Strategy

### Unit Tests

Unit tests cover specific behaviors with concrete examples and verify edge cases. The project does not currently have a test runner set up. The recommended setup for this codebase is **Jest** with `@testing-library/react-native` for component tests and plain Jest for logic/hook tests.

**Target test files:**

- `hooks/__tests__/useSocket.test.ts` — token migration correctness (Properties 1 & 2)
- `store/__tests__/resetCaches.test.ts` — slice sync (Property 5)
- `store/slices/__tests__/authSlice.test.ts` — bootstrapAuth error handling (Property 10)

Example unit tests:

```typescript
// useSocket.test.ts
it('uses tokenStore, not AsyncStorage, to get access token', async () => {
  const mockToken = 'test-access-token';
  jest.spyOn(tokenStore, 'get').mockResolvedValue(mockToken);
  const mockIo = jest.fn().mockReturnValue(createMockSocket());
  // ... verify io() called with auth: { token: mockToken }
  // ... verify AsyncStorage.getItem never called
});

it('sets status to error and skips io() when tokenStore returns null', async () => {
  jest.spyOn(tokenStore, 'get').mockResolvedValue(null);
  // ... verify io() not called and status === 'error'
});
```

### Property-Based Tests

The project should use **fast-check** for property-based testing (TypeScript-native, no additional native setup required):

```
npm install --save-dev fast-check
```

Configuration: minimum 100 iterations per property test (`fc.assert(fc.asyncProperty(...), { numRuns: 100 })`).

Tag format for each property test:
```typescript
// Feature: app-wide-optimization, Property N: <property text>
```

**app.json structural properties (Properties 3 & 4):**

```typescript
// __tests__/appConfig.property.test.ts
// Feature: app-wide-optimization, Property 3: no duplicate Android permissions

it('android permissions has no duplicates', () => {
  const appJson = require('../app.json');
  const perms: string[] = appJson.expo.android.permissions ?? [];
  expect(new Set(perms).size).toBe(perms.length);
});

it('plugins array has no duplicate entries', () => {
  const appJson = require('../app.json');
  const plugins: (string | any[])[] = appJson.expo.plugins ?? [];
  const names = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  expect(new Set(names).size).toBe(names.length);
});
```

**Store/resetCaches sync (Property 5):**

```typescript
// __tests__/storeSync.property.test.ts
// Feature: app-wide-optimization, Property 5: resetCaches and store slices are in sync

it('every slice in store is also in resetAllApiCaches', () => {
  // Parse store reducerPath keys and compare to API_SLICES
  const { API_SLICES } = require('../store/apiSlices');
  const storeSliceKeys = new Set(API_SLICES.map((s: any) => s.reducerPath));
  // All slices in resetAllApiCaches come from API_SLICES by design
  expect(storeSliceKeys.size).toBe(API_SLICES.length); // no duplicates
});
```

**keepUnusedDataFor consistency (Property 6):**

```typescript
// Feature: app-wide-optimization, Property 6: keepUnusedDataFor is 300 across all slices
import { API_SLICES } from '../store/apiSlices';

test.each(API_SLICES.map((s) => [s.reducerPath, s]))(
  'slice %s has keepUnusedDataFor = 300',
  (_path, api) => {
    // Access internal config — RTK exposes this via api.endpoints (not directly),
    // so this is best checked as a static source-code property test using fast-check
    // over the slice config objects captured at import time.
    expect((api as any).keepUnusedDataFor ?? 300).toBe(300);
  }
);
```

**bootstrapAuth error handling (Property 10):**

```typescript
// Feature: app-wide-optimization, Property 10: bootstrapAuth preserves error state on any failure
import * as fc from 'fast-check';

test('bootstrapAuth sets isBootstrapped=true and bootstrapError on any thrown error', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string({ minLength: 1 }), async (errorMsg) => {
      // Mock fetch to throw
      global.fetch = jest.fn().mockRejectedValue(new Error(errorMsg));
      const result = await store.dispatch(bootstrapAuth());
      const state = store.getState().auth;
      // bootstrapAuth resolves (doesn't reject) even on network error
      expect(state.isBootstrapped).toBe(true);
    }),
    { numRuns: 100 }
  );
});
```

### Smoke Tests / Verification Checklist

These are binary pass/fail gates run before each commit touching the relevant files:

| Gate | Command / Check |
|---|---|
| TypeScript compilation | `npx tsc --noEmit` |
| No unused locals | `npx tsc --noUnusedLocals --noEmit` |
| No deleted shim imports | `grep -r "from.*eventsApi\|from.*usersApi\|from.*gamesApi\|from.*tagsApi" app/ components/ hooks/ store/` → empty |
| No AsyncStorage in useSocket | `grep "AsyncStorage" hooks/useSocket.ts` → empty |
| metro.config has package exports | `grep "unstable_enablePackageExports" metro.config.js` → present |
| No relative imports in core dirs | `grep -rn "from '\.\." app/ components/ hooks/ store/` → empty |

### Integration Tests

Manual verification steps for changes that cannot be unit tested:

1. **After API consolidation**: Launch the app on a simulator. Navigate to Discover (events load), open an event detail (data loads), RSVP (mutation works), check settings (no crash), confirm socket connects in Chat tab.
2. **After store.ts refactor**: Confirm app launches, log in, log out, log in again — confirm no stale data from previous user appears.
3. **After expo-image migration**: Verify event fliers, user avatars, and postcard thumbnails render correctly on both iOS and Android with no blank frames.
4. **After bootstrapAuth error UI**: Simulate network failure at launch; confirm retry button appears and resolves correctly when network returns.
