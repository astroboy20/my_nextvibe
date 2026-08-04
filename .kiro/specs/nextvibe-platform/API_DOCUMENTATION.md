# NextVibe API Documentation

> Complete reference for all backend endpoints  how they are implemented with RTK Query in the Next.js web app, their request/response shapes, and how to implement them in **React Native using Redux Toolkit Query**.

## Table of Contents

1. [Setup & Base Configuration](#1-setup--base-configuration)
2. [Authentication](#2-authentication)
3. [Users & Profile](#3-users--profile)
4. [Events](#4-events)
5. [Tickets](#5-tickets)
6. [Postcards & Gallery](#6-postcards--gallery)
7. [Vibe Tags](#7-vibe-tags)
8. [Games & Rounds](#8-games--rounds)
9. [Payments  Attendee](#9-payments--attendee)
10. [Organizer Payments & Plans](#10-organizer-payments--plans)
11. [Reminders](#11-reminders)
12. [Pledges](#12-pledges)
13. [Notifications](#13-notifications)
14. [Messaging & Chat](#14-messaging--chat)
15. [Social  Feed, Follow, Likes, Comments](#15-social--feed-follow-likes-comments)
16. [Discover](#16-discover)
17. [Analytics](#17-analytics)
18. [Rewards](#18-rewards)
19. [Admin](#19-admin)
20. [Launch / Waitlist](#20-launch--waitlist)
21. [Storage / File Upload](#21-storage--file-upload)
---

## 1. Setup & Base Configuration

### Base URL

All backend calls target the environment variable:

```
EXPO_PUBLIC_API_URL=https://api.nextvibe.co
```

### Standard response envelope

Most endpoints return:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20, "hasNext": true }
}
```

### React Native  baseQuery with auto token refresh

Store tokens in `@react-native-async-storage/async-storage` (no cookies in RN).

**Install:**
```bash
npm install @reduxjs/toolkit react-redux @react-native-async-storage/async-storage
```

**store/baseQuery.ts**
```ts
import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.nextvibe.co';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

let isRefreshing = false;
let pendingQueue: { resolve: () => void; reject: () => void }[] = [];

function flushQueue(ok: boolean) {
  const q = pendingQueue; pendingQueue = [];
  q.forEach(({ resolve, reject }) => (ok ? resolve() : reject()));
}

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extra) => {
    let result = await rawBaseQuery(args, api, extra);
    if (result.error?.status !== 401) return result;

    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false; flushQueue(false);
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        return result;
      }
      const r = await rawBaseQuery(
        { url: '/v1/auth/refresh', method: 'POST', body: { refreshToken } },
        api, extra
      );
      if (r.data) {
        const d = r.data as any;
        await AsyncStorage.setItem('accessToken', d.data?.accessToken ?? d.accessToken);
        const newRefresh = d.data?.refreshToken ?? d.refreshToken;
        if (newRefresh) await AsyncStorage.setItem('refreshToken', newRefresh);
        isRefreshing = false; flushQueue(true);
        result = await rawBaseQuery(args, api, extra);
      } else {
        isRefreshing = false; flushQueue(false);
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      }
    } else {
      await new Promise<void>((res, rej) => pendingQueue.push({ resolve: res, reject: rej }));
      result = await rawBaseQuery(args, api, extra);
    }
    return result;
  };
```

**store/store.ts**
```ts
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import { eventsApi } from './api/eventsApi';
// import all other slices ...

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
    // ...add all others
  },
  middleware: (gDM) => gDM().concat(authApi.middleware, eventsApi.middleware /*, ... */),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**App.tsx (wrap with Provider)**
```tsx
import { Provider } from 'react-redux';
import { store } from './store/store';
export default function App() {
  return <Provider store={store}><RootNavigator /></Provider>;
}
```

---

## 2. Authentication

Base path: `/v1/auth` | Auth required: **No** (these endpoints issue tokens)

---

### POST /v1/auth/register

Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "Jane Doe",
  "username": "janedoe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "uuid", "email": "user@example.com", "username": "janedoe", "role": "USER" }
  }
}
```

**React Native RTK Query:**
```ts
register: build.mutation<
  { success: boolean; data: { accessToken: string; refreshToken: string; user: any } },
  { email: string; password: string; displayName: string; username: string }
>({
  query: (body) => ({ url: '/v1/auth/register', method: 'POST', body }),
  async onQueryStarted(_, { queryFulfilled }) {
    const { data } = await queryFulfilled;
    await AsyncStorage.setItem('accessToken', data.data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
  },
}),
```

---

### POST /v1/auth/login

Login with email and password.

**Request body:**
```json
{ "email": "user@example.com", "password": "SecurePass123!" }
```

**Response:** Same shape as `/v1/auth/register`.

**React Native RTK Query:**
```ts
login: build.mutation<
  { success: boolean; data: { accessToken: string; refreshToken: string; user: any } },
  { email: string; password: string }
>({
  query: (body) => ({ url: '/v1/auth/login', method: 'POST', body }),
  async onQueryStarted(_, { queryFulfilled }) {
    const { data } = await queryFulfilled;
    await AsyncStorage.setItem('accessToken', data.data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
  },
}),
```

---

### POST /v1/auth/oauth/google

Sign in with a Google ID token (from `@react-native-google-signin/google-signin`).

**Request body:**
```json
{ "idToken": "google-id-token" }
```

**Response:** Same shape as login.

**React Native RTK Query:**
```ts
googleLogin: build.mutation<
  { success: boolean; data: { accessToken: string; refreshToken: string; user: any } },
  { idToken: string }
>({
  query: (body) => ({ url: '/v1/auth/oauth/google', method: 'POST', body }),
  async onQueryStarted(_, { queryFulfilled }) {
    const { data } = await queryFulfilled;
    await AsyncStorage.setItem('accessToken', data.data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
  },
}),
// In your screen, get the idToken via GoogleSignin.signIn() then pass it here.
```

---

### POST /v1/auth/forgot-password

Send a password reset email.

**Request body:**
```json
{ "email": "user@example.com" }
```

**Response:**
```json
{ "success": true, "message": "Reset email sent" }
```

**React Native RTK Query:**
```ts
forgotPassword: build.mutation<{ success: boolean; message: string }, { email: string }>({
  query: (body) => ({ url: '/v1/auth/forgot-password', method: 'POST', body }),
}),
```

---

### POST /v1/auth/reset-password

Reset password using the token from the email link.

**Request body:**
```json
{ "token": "reset-token-from-email", "newPassword": "NewPass123!" }
```

**Response:**
```json
{ "success": true, "message": "Password updated" }
```

**React Native RTK Query:**
```ts
resetPassword: build.mutation<{ success: boolean }, { token: string; newPassword: string }>({
  query: (body) => ({ url: '/v1/auth/reset-password', method: 'POST', body }),
}),
```

---

### POST /v1/auth/refresh

Exchange a refresh token for a new access token. Called automatically by `baseQueryWithReauth` on 401  you should not call this manually.

**Request body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response:**
```json
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

---

### POST /v1/auth/logout

Revoke the refresh token server-side. Always clear local tokens after.

**Auth required:** Yes

**Request body:**
```json
{ "refreshToken": "eyJ..." }
```

**React Native RTK Query:**
```ts
logout: build.mutation<void, void>({
  queryFn: async () => {
    try {
      const [accessToken, refreshToken] = await AsyncStorage.multiGet(['accessToken','refreshToken']);
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken[1]}` },
        body: JSON.stringify({ refreshToken: refreshToken[1] }),
      });
    } finally {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
    return { data: undefined };
  },
}),
```

---

## 3. Users & Profile

Base path: `/v1/users` | Auth required: **Yes** (except `/basic` and `/activity`)

---

### GET /v1/users/me

Get the authenticated user's profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "janedoe",
    "displayName": "Jane Doe",
    "avatarUrl": "https://...",
    "bio": "...",
    "role": "USER",
    "city": "Lagos",
    "country": "Nigeria",
    "isEmailVerified": true
  }
}
```

**React Native RTK Query:**
```ts
getMe: build.query<{ success: boolean; data: User }, void>({
  query: () => '/v1/users/me',
  providesTags: ['User'],
}),
// Usage:
const { data, isLoading } = useGetMeQuery();
```

---

### PATCH /v1/users/me

Update the current user's profile fields.

**Request body (all optional):**
```json
{
  "displayName": "Jane Doe",
  "username": "janedoe",
  "bio": "Event lover",
  "avatarUrl": "https://cdn.../avatar.jpg",
  "city": "Lagos",
  "country": "Nigeria"
}
```

**Response:** Updated user object (same shape as GET /v1/users/me).

**React Native RTK Query:**
```ts
updateMe: build.mutation<{ success: boolean; data: User }, Partial<User>>({
  query: (body) => ({ url: '/v1/users/me', method: 'PATCH', body }),
  invalidatesTags: ['User'],
}),
```

---

### POST /v1/users/me/switch-role

Switch the authenticated user's role (e.g. USER -> ORGANIZER).

**Request body:**
```json
{ "role": "ORGANIZER" }
```

**Response:**
```json
{ "success": true, "data": { "id": "uuid", "role": "ORGANIZER" } }
```

**React Native RTK Query:**
```ts
switchRole: build.mutation<{ success: boolean; data: any }, { role: string }>({
  query: (body) => ({ url: '/v1/users/me/switch-role', method: 'POST', body }),
  invalidatesTags: ['User'],
}),
```

---

### PATCH /v1/users/me/vibes

Save the user's selected vibe tag IDs.

**Request body:**
```json
{ "tagIds": ["tag-uuid-1", "tag-uuid-2"] }
```

**Response:**
```json
{ "success": true, "message": "Vibes saved" }
```

**React Native RTK Query:**
```ts
saveVibes: build.mutation<{ success: boolean }, { tagIds: string[] }>({
  query: (body) => ({ url: '/v1/users/me/vibes', method: 'PATCH', body }),
}),
```

---

### GET /v1/users/:userId/basic

Get a public profile card for any user.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "janedoe",
    "displayName": "Jane Doe",
    "avatarUrl": "https://...",
    "bio": "...",
    "isFollowing": false
  }
}
```

**React Native RTK Query:**
```ts
getUserBasic: build.query<{ success: boolean; data: any }, string>({
  query: (userId) => `/v1/users/${userId}/basic`,
}),
```

---

### GET /v1/users/:userId/activity

Get a user's activity stats (events attended, postcards posted, etc.).

**Response:**
```json
{
  "success": true,
  "data": {
    "eventsAttended": 12,
    "postcardsCount": 34,
    "followersCount": 100,
    "followingCount": 50
  }
}
```

**React Native RTK Query:**
```ts
getUserActivity: build.query<{ success: boolean; data: any }, string>({
  query: (userId) => `/v1/users/${userId}/activity`,
}),
```

---

### GET /v1/events/organizer/:organizerId

Get events created by a specific organizer (paginated).

**Query params:** `page`, `limit`

**Response:**
```json
{ "success": true, "data": [ { "id": "...", "name": "...", "status": "PUBLISHED" } ], "meta": { "total": 10, "page": 1 } }
```

**React Native RTK Query:**
```ts
getOrganizerEvents: build.query<any, { organizerId: string; page?: number; limit?: number }>({
  query: ({ organizerId, page = 1, limit = 10 }) =>
    `/v1/events/organizer/${organizerId}?page=${page}&limit=${limit}`,
}),
```

---

## 4. Events

Base path: `/v1/events` | Auth required: **Yes** for create/update/delete. GET is public.

---

### GET /v1/events

List events. Optionally filter by `isPublic`.

**Query params:** `page`, `limit`, `isPublic`

**Response:**
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "Summer Gala", "status": "PUBLISHED", "startsAt": "2026-08-10T18:00:00Z" }],
  "meta": { "total": 50, "page": 1, "limit": 20, "hasNext": true }
}
```

**React Native RTK Query:**
```ts
getEvents: build.query<any, { page?: number; limit?: number; isPublic?: boolean } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    if (params?.isPublic !== undefined) p.set('isPublic', String(params.isPublic));
    const qs = p.toString();
    return `/v1/events${qs ? `?${qs}` : ''}`;
  },
  providesTags: ['Events'],
}),
```

---

### GET /v1/events/:eventId

Get full details for a single event.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Summer Gala",
    "description": "...",
    "status": "PUBLISHED",
    "mode": "PHYSICAL",
    "locationName": "Eko Hotel, Lagos",
    "latitude": "6.4281",
    "longitude": "3.4219",
    "startsAt": "2026-08-10T18:00:00Z",
    "endsAt": "2026-08-10T23:00:00Z",
    "isPublic": true,
    "capacity": 500,
    "flierUrl": "https://cdn.../flier.jpg",
    "organizer": { "id": "uuid", "username": "orguser", "displayName": "Org Name" },
    "ticketTiers": [],
    "tags": []
  }
}
```

**React Native RTK Query:**
```ts
getEventDetails: build.query<any, string>({
  query: (eventId) => `/v1/events/${eventId}`,
  providesTags: (_, __, id) => [{ type: 'Event', id }],
}),
```

---

### POST /v1/events

Create a new event. Auth required (must be ORGANIZER role).

**Request body:**
```json
{
  "name": "Summer Gala",
  "description": "An amazing night out",
  "mode": "PHYSICAL",
  "locationName": "Eko Hotel, Lagos",
  "latitude": "6.4281",
  "longitude": "3.4219",
  "startsAt": "2026-08-10T18:00:00Z",
  "endsAt": "2026-08-10T23:00:00Z",
  "isPublic": true,
  "capacity": 500,
  "flierUrl": "https://cdn.../flier.jpg",
  "category": "MUSIC"
}
```

**Response:** Created event object wrapped in `{ success, data }`.

**React Native RTK Query:**
```ts
createEvent: build.mutation<any, Record<string, any>>({
  query: (body) => ({ url: '/v1/events', method: 'POST', body }),
  invalidatesTags: ['Events'],
}),
```

---

### PATCH /v1/events/:eventId

Update event fields. Null/undefined fields are filtered out.

**Request body:** Any subset of event fields (same as create).

**React Native RTK Query:**
```ts
updateEvent: build.mutation<any, { eventId: string; data: Record<string, any> }>({
  query: ({ eventId, data }) => ({
    url: `/v1/events/${eventId}`,
    method: 'PATCH',
    body: Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)),
  }),
  invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
}),
```

---

### DELETE /v1/events/:eventId

Delete an event. Auth required (organizer only).

**Response:**
```json
{ "success": true, "message": "Event deleted" }
```

**React Native RTK Query:**
```ts
deleteEvent: build.mutation<any, string>({
  query: (eventId) => ({ url: `/v1/events/${eventId}`, method: 'DELETE' }),
  invalidatesTags: ['Events'],
}),
```

---

### PATCH /v1/events/:eventId/status

Transition event status: `DRAFT -> PUBLISHED`, `PUBLISHED -> CANCELLED`, `PUBLISHED -> ENDED`.

**Request body:**
```json
{ "status": "PUBLISHED" }
```

**Response:** Updated event object.

**React Native RTK Query:**
```ts
updateEventStatus: build.mutation<any, { eventId: string; status: 'PUBLISHED' | 'CANCELLED' | 'ENDED' }>({
  query: ({ eventId, status }) => ({
    url: `/v1/events/${eventId}/status`,
    method: 'PATCH',
    body: { status },
  }),
  invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }, 'Events'],
}),
```

---

### POST /v1/events/checkin

Check in to an event using the event QR code.

**Auth required:** Yes

**Request body:**
```json
{ "qrCode": "event-qr-code-value" }
```

**Response:**
```json
{ "success": true, "data": { "checkedIn": true, "eventId": "uuid" } }
```

**React Native RTK Query:**
```ts
checkinEvent: build.mutation<any, { qrCode: string }>({
  query: (body) => ({ url: '/v1/events/checkin', method: 'POST', body }),
}),
// Scan QR with expo-camera or react-native-vision-camera, then pass the decoded string.
```

---

### POST /v1/events/:eventId/rsvp

RSVP to a free event.

**Request body:**
```json
{ "status": "CONFIRMED", "ticketTierId": "optional-uuid" }
```

**`status` values:** `CONFIRMED` | `WAITLIST` | `CANCELLED`

**React Native RTK Query:**
```ts
rsvp: build.mutation<any, { eventId: string; status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED'; ticketTierId?: string }>({
  query: ({ eventId, status, ticketTierId }) => ({
    url: `/v1/events/${eventId}/rsvp`,
    method: 'POST',
    body: { status, ...(ticketTierId ? { ticketTierId } : {}) },
  }),
}),
```

---

### GET /v1/events/:eventId/attendees

Get the list of attendees for an event (organizer only).

**Query params:** `page`, `limit`

**Response:**
```json
{ "success": true, "data": [{ "userId": "uuid", "displayName": "...", "checkedIn": true }], "meta": { "total": 100 } }
```

**React Native RTK Query:**
```ts
getEventAttendees: build.query<any, { eventId: string; page?: number; limit?: number }>({
  query: ({ eventId, page = 1, limit = 20 }) =>
    `/v1/events/${eventId}/attendees?page=${page}&limit=${limit}`,
}),
```

---

### GET /v1/events/:eventId/active-game-status

Check whether the current user is checked in and get info about any active game session.

**Response:**
```json
{
  "success": true,
  "data": {
    "isCheckedIn": true,
    "activeGame": { "sessionId": "uuid", "title": "Trivia Night", "status": "ACTIVE" }
  }
}
```

**React Native RTK Query:**
```ts
getActiveGameStatus: build.query<any, string>({
  query: (eventId) => `/v1/events/${eventId}/active-game-status`,
}),
```

---

### POST /v1/events/:eventId/tags/add  &  POST /v1/events/:eventId/tags/remove

Add or remove vibe tags from an event (organizer only, locked once started).

**Request body:**
```json
{ "tagIds": ["tag-uuid-1", "tag-uuid-2"] }
```

**React Native RTK Query:**
```ts
addEventTags: build.mutation<any, { eventId: string; tagIds: string[] }>({
  query: ({ eventId, tagIds }) => ({ url: `/v1/events/${eventId}/tags/add`, method: 'POST', body: { tagIds } }),
}),
removeEventTags: build.mutation<any, { eventId: string; tagIds: string[] }>({
  query: ({ eventId, tagIds }) => ({ url: `/v1/events/${eventId}/tags/remove`, method: 'POST', body: { tagIds } }),
}),
```

---

## 5. Tickets

Base path: `/v1/events/:eventId/tickets` | Auth required: **Yes**

---

### GET /v1/events/:eventId/tickets

List all ticket tiers for an event.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "VIP", "price": 5000, "currency": "NGN", "capacity": 100, "available": 72 }
  ]
}
```

**React Native RTK Query:**
```ts
getTickets: build.query<any, string>({
  query: (eventId) => `/v1/events/${eventId}/tickets`,
  providesTags: (_, __, id) => [{ type: 'Event', id }],
}),
```

---

### POST /v1/events/:eventId/tickets

Create a new ticket tier for an event.

**Request body:**
```json
{
  "name": "VIP",
  "price": 5000,
  "currency": "NGN",
  "capacity": 100,
  "description": "Front row seats"
}
```

**Response:** Created ticket tier object.

**React Native RTK Query:**
```ts
createTicket: build.mutation<any, { eventId: string; ticketData: any }>({
  query: ({ eventId, ticketData }) => ({
    url: `/v1/events/${eventId}/tickets`,
    method: 'POST',
    body: ticketData,
  }),
  invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
}),
```

---

### PATCH /v1/events/:eventId/tickets/:ticketId

Update a ticket tier.

**Request body:** Any updatable ticket fields (name, price, capacity, description).

**React Native RTK Query:**
```ts
updateTicket: build.mutation<any, { eventId: string; ticketId: string; ticketData: any }>({
  query: ({ eventId, ticketId, ticketData }) => ({
    url: `/v1/events/${eventId}/tickets/${ticketId}`,
    method: 'PATCH',
    body: ticketData,
  }),
  invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
}),
```

---

### DELETE /v1/events/:eventId/tickets/:ticketId

Delete a ticket tier.

**React Native RTK Query:**
```ts
deleteTicket: build.mutation<any, { eventId: string; ticketId: string }>({
  query: ({ eventId, ticketId }) => ({
    url: `/v1/events/${eventId}/tickets/${ticketId}`,
    method: 'DELETE',
  }),
  invalidatesTags: (_, __, { eventId }) => [{ type: 'Event', id: eventId }],
}),
```

---

## 6. Postcards & Gallery

Base path: `/v1/postcards`, `/v1/events/:eventId/postcards` | Auth required: **Yes** for create/like/comment

---

### GET /v1/postcards

Global postcards feed. Optionally filter by `eventId` or `userId`.

**Query params:** `page`, `limit`, `eventId`, `userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [{ "id": "uuid", "caption": "...", "media": [], "author": { "username": "..." }, "likesCount": 12 }],
    "meta": { "total": 100, "page": 1, "limit": 20, "hasNext": true }
  }
}
```

**React Native RTK Query:**
```ts
getPostcards: build.query<any, { page?: number; limit?: number; eventId?: string; userId?: string } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    if (params?.eventId) p.set('eventId', params.eventId);
    if (params?.userId) p.set('userId', params.userId);
    const qs = p.toString();
    return `/v1/postcards${qs ? `?${qs}` : ''}`;
  },
}),
```

---

### GET /v1/postcards/:postcardId

Get a single postcard with like count.

**React Native RTK Query:**
```ts
getPostcard: build.query<any, string>({
  query: (postcardId) => `/v1/postcards/${postcardId}`,
}),
```

---

### POST /v1/storage/upload-multiple  then  POST /v1/postcards

Two-step flow to create a postcard with media:

**Step 1  Upload files:**

**Request:** `multipart/form-data` with one or more `files` fields.

**Response:**
```json
{ "success": true, "data": [{ "url": "https://cdn.../img.jpg", "fileKey": "uploads/abc.jpg", "mediaType": "image" }] }
```

**Step 2  Create postcard:**

**Request body:**
```json
{
  "eventId": "uuid",
  "caption": "What a night!",
  "vibeTagId": "optional-uuid",
  "media": [{ "fileKey": "uploads/abc.jpg", "mediaType": "image", "mediaUrl": "https://cdn.../img.jpg" }]
}
```

**React Native RTK Query:**
```ts
uploadMultipleFiles: build.mutation<
  { success: boolean; data: { url: string; fileKey: string; mediaType: string }[] },
  FormData
>({
  query: (formData) => ({
    url: '/v1/storage/upload-multiple',
    method: 'POST',
    body: formData,
  }),
}),
createPostcards: build.mutation<any, {
  eventId: string;
  caption?: string;
  vibeTagId?: string;
  media: { fileKey: string; mediaType: string; mediaUrl?: string }[];
}>({
  query: (body) => ({ url: '/v1/postcards', method: 'POST', body }),
}),

// In your screen:
// 1. Pick image with expo-image-picker
// 2. Build FormData, append file
// 3. Call uploadMultipleFiles -> get fileKeys
// 4. Call createPostcards with fileKeys
```

---

### POST /v1/postcards/:postcardId/like

Toggle like on a postcard.

**Response:**
```json
{ "success": true, "data": { "liked": true, "currentLikes": 13 } }
```

**React Native RTK Query:**
```ts
toggleLikePostcard: build.mutation<{ liked: boolean; currentLikes: number }, { postcardId: string; eventId: string }>({
  query: ({ postcardId }) => ({ url: `/v1/postcards/${postcardId}/like`, method: 'POST' }),
}),
```

---

### POST /v1/postcards/:postcardId/comment

Add a comment to a postcard.

**Request body:**
```json
{ "content": "Great shot!" }
```

**React Native RTK Query:**
```ts
commentOnPostcard: build.mutation<any, { postcardId: string; content: string }>({
  query: ({ postcardId, content }) => ({
    url: `/v1/postcards/${postcardId}/comment`,
    method: 'POST',
    body: { content },
  }),
}),
```

---

### GET /v1/postcards/:postcardId/likes  &  GET /v1/postcards/:postcardId/comments

**React Native RTK Query:**
```ts
getPostcardLikes: build.query<any, string>({ query: (id) => `/v1/postcards/${id}/likes` }),
getPostcardComments: build.query<any, string>({ query: (id) => `/v1/postcards/${id}/comments` }),
```

---

### POST /v1/postcards/:postcardId/view

Track a postcard view (fire-and-forget).

**React Native RTK Query:**
```ts
trackPostcardView: build.mutation<void, { postcardId: string; sessionId?: string | null }>({
  query: ({ postcardId, sessionId }) => ({
    url: `/v1/postcards/${postcardId}/view`,
    method: 'POST',
    body: { sessionId: sessionId ?? null },
  }),
}),
```

---

### GET /v1/postcards/event/:eventId/leaderboard

Get the postcard leaderboard for an event.

**Query params:** `activityTiming` (optional)

**React Native RTK Query:**
```ts
getPostcardLeaderboard: build.query<any, { eventId: string; activityTiming?: string }>({
  query: ({ eventId, activityTiming }) => {
    const qs = activityTiming ? `?activityTiming=${activityTiming}` : '';
    return `/v1/postcards/event/${eventId}/leaderboard${qs}`;
  },
}),
```

---

### GET /v1/events/:eventId/postcards

Get postcards for a specific event, with optional phase filter.

**Query params:** `page`, `limit`, `phase`

**React Native RTK Query:**
```ts
getEventPostcards: build.query<any, { eventId: string; phase?: string; page?: number; limit?: number }>({
  query: ({ eventId, phase, page = 1, limit = 20 }) => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (phase && phase !== 'all') p.set('phase', phase);
    return `/v1/events/${eventId}/postcards?${p.toString()}`;
  },
}),
```

---

## 7. Vibe Tags

Base path: `/v1/vibe-tags`, `/v1/discover/tags` | Auth required: GET is public

---

### GET /v1/vibe-tags?eventId=:eventId

Get vibe tags for a specific event.

**Response:**
```json
{ "success": true, "data": [{ "id": "uuid", "name": "Afrobeats", "activityTiming": "DURING", "imageUrl": "https://..." }] }
```

**React Native RTK Query:**
```ts
getVibeTags: build.query<any, { eventId: string; activityTiming?: string }>({
  query: ({ eventId }) => `/v1/vibe-tags?eventId=${eventId}`,
}),
```

---

### POST /v1/vibe-tags

Create a custom vibe tag for an event. Sends `multipart/form-data`.

**Form fields:** `eventId`, `name`, `imageKey`, `activityTiming`

**React Native RTK Query:**
```ts
createVibeTag: build.mutation<any, { eventId: string; name: string; imageKey: string; activityTiming: string }>({
  query: ({ eventId, name, imageKey, activityTiming }) => {
    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('name', name);
    formData.append('imageKey', imageKey);
    formData.append('activityTiming', activityTiming);
    return { url: '/v1/vibe-tags', method: 'POST', body: formData };
  },
}),
```

---

### GET /v1/discover/tags

Get all platform-default vibe tags (public, sorted by orderIndex).

**Response:**
```json
[{ "id": "uuid", "name": "Afrobeats", "isPlatformDefault": true, "orderIndex": 1, "imageUrl": "https://..." }]
```

**React Native RTK Query:**
```ts
getDiscoverTags: build.query<VibeTag[], void>({
  query: () => '/v1/discover/tags',
  transformResponse: (res: any) => {
    const tags = Array.isArray(res) ? res : (res?.data ?? []);
    return [...tags].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  },
}),
```

---

## 8. Games & Rounds

Base path: `/v1/game-sessions`, `/v1/game-rounds`, `/v1/games` | Auth required: **Yes** (except anonymous & token endpoints)

---

### POST /v1/events/:eventId/game-sessions

Create a new game session for an event.

**Request body:**
```json
{
  "title": "Trivia Night",
  "scheduleType": "DURING",
  "maxWinners": 3,
  "gameDuration": 300
}
```

**React Native RTK Query:**
```ts
createGameSession: build.mutation<any, { eventId: string; body: any }>({
  query: ({ eventId, body }) => ({
    url: `/v1/events/${eventId}/game-sessions`,
    method: 'POST',
    body,
  }),
  invalidatesTags: ['Games'],
}),
```

---

### GET /v1/events/:eventId/game-sessions

List all game sessions for an event.

**React Native RTK Query:**
```ts
getGameSessions: build.query<any, string>({
  query: (eventId) => `/v1/events/${eventId}/game-sessions`,
  providesTags: ['Games'],
}),
```

---

### GET /v1/game-sessions/:sessionId

Get session details including `isJoined` status.

**React Native RTK Query:**
```ts
getGameSession: build.query<any, string>({
  query: (sessionId) => `/v1/game-sessions/${sessionId}`,
}),
```

---

### PATCH /v1/game-sessions/:sessionId

Update session-level fields (title, maxWinners, gameDuration).

**React Native RTK Query:**
```ts
updateGameSession: build.mutation<any, { sessionId: string; data: any }>({
  query: ({ sessionId, data }) => ({ url: `/v1/game-sessions/${sessionId}`, method: 'PATCH', body: data }),
}),
```

---

### PATCH /v1/game-sessions/:sessionId/status

Start or end a game session.

**Request body:**
```json
{ "status": "ACTIVE" }
```

**`status` values:** `ACTIVE` | `ENDED`

**React Native RTK Query:**
```ts
updateGameStatus: build.mutation<any, { sessionId: string; status: 'ACTIVE' | 'ENDED' }>({
  query: ({ sessionId, status }) => ({
    url: `/v1/game-sessions/${sessionId}/status`,
    method: 'PATCH',
    body: { status },
  }),
}),
```

---

### POST /v1/game-sessions/:sessionId/join

Join a game session (auth required).

**React Native RTK Query:**
```ts
joinGameSession: build.mutation<any, string>({
  query: (sessionId) => ({ url: `/v1/game-sessions/${sessionId}/join`, method: 'POST' }),
}),
```

---

### GET /v1/game-sessions/:sessionId/leaderboard

Get the ranked leaderboard for a game session.

**Response:**
```json
{ "success": true, "data": [{ "rank": 1, "userId": "uuid", "username": "...", "score": 950, "timeTakenMs": 4200 }] }
```

**React Native RTK Query:**
```ts
getSessionLeaderboard: build.query<any, string>({
  query: (sessionId) => `/v1/game-sessions/${sessionId}/leaderboard`,
}),
```

---

### GET /v1/game-sessions/:sessionId/edit-policy

Check if the game session is still editable (returns false once first player joins).

**Response:**
```json
{ "editable": true, "reason": null }
```

---

### POST /v1/game-sessions/:sessionId/rounds

Add a round to a game session.

**Request body example (trivia):**
```json
{
  "title": "Round 1",
  "gameType": "TRIVIA",
  "orderIndex": 0,
  "config": {
    "questions": [{ "question": "What year...", "options": ["2020","2021","2022","2023"], "correctIndex": 2 }]
  }
}
```

**React Native RTK Query:**
```ts
addGameRound: build.mutation<any, { sessionId: string; data: any }>({
  query: ({ sessionId, data }) => ({ url: `/v1/game-sessions/${sessionId}/rounds`, method: 'POST', body: data }),
}),
```

---

### PATCH /v1/game-rounds/:roundId  &  DELETE /v1/game-rounds/:roundId

**React Native RTK Query:**
```ts
updateGameRound: build.mutation<any, { roundId: string; data: any }>({
  query: ({ roundId, data }) => ({ url: `/v1/game-rounds/${roundId}`, method: 'PATCH', body: data }),
}),
deleteGameRound: build.mutation<any, string>({
  query: (roundId) => ({ url: `/v1/game-rounds/${roundId}`, method: 'DELETE' }),
}),
```

---

### PATCH /v1/game-rounds/:roundId/status

Activate or end a specific round.

**Request body:**
```json
{ "status": "ACTIVE" }
```

**React Native RTK Query:**
```ts
updateRoundStatus: build.mutation<any, { roundId: string; status: 'ACTIVE' | 'ENDED' }>({
  query: ({ roundId, status }) => ({
    url: `/v1/game-rounds/${roundId}/status`,
    method: 'PATCH',
    body: { status },
  }),
}),
```

---

### POST /v1/game-rounds/:roundId/submit

Submit answers for a round.

**Request body:**
```json
{ "answers": [2, 0, 1, 3], "metadata": { "timeTakenMs": 4200 } }
```

**Response:**
```json
{ "success": true, "data": { "score": 300, "correct": 3, "total": 4 } }
```

**React Native RTK Query:**
```ts
submitRoundAnswers: build.mutation<any, { roundId: string; answers: (number|string)[]; timeTakenMs?: number }>({
  query: ({ roundId, answers, timeTakenMs }) => ({
    url: `/v1/game-rounds/${roundId}/submit`,
    method: 'POST',
    body: { answers, metadata: { timeTakenMs: timeTakenMs ?? 0 } },
  }),
}),
```

---

### GET /v1/game-rounds/:roundId/participation

Check if the current user has already submitted answers for a round.

**React Native RTK Query:**
```ts
getGameRoundParticipation: build.query<any, string>({
  query: (roundId) => `/v1/game-rounds/${roundId}/participation`,
}),
```

---

### GET /v1/game-rounds/:roundId/responses

Get free-text responses for a FEEDBACK round (organizer only).

**React Native RTK Query:**
```ts
getRoundResponses: build.query<any, string>({
  query: (roundId) => `/v1/game-rounds/${roundId}/responses`,
}),
```

---

### GET /v1/games/t/:token  &  POST /v1/games/join/:token

Public: get and join a game via a viral share token.

**React Native RTK Query:**
```ts
getGameSessionByToken: build.query<any, string>({ query: (token) => `/v1/games/t/${token}` }),
joinGameSessionByToken: build.mutation<any, string>({
  query: (token) => ({ url: `/v1/games/join/${token}`, method: 'POST' }),
}),
```

---

### Anonymous game flow

For users who haven't signed up yet.

| Endpoint | Method | Description |
|---|---|---|
| `/v1/games/anonymous/join/:token` | POST | Join without auth  pass `anonymousId` |
| `/v1/games/anonymous/rounds/:roundId/submit` | POST | Submit answers anonymously |
| `/v1/games/anonymous/merge` | POST | Merge anonymous sessions after sign-up |

**React Native RTK Query:**
```ts
anonymousJoinGame: build.mutation<any, { token: string; anonymousId?: string }>({
  query: ({ token, anonymousId }) => ({ url: `/v1/games/anonymous/join/${token}`, method: 'POST', body: { anonymousId } }),
}),
anonymousSubmitRound: build.mutation<any, { roundId: string; anonymousId: string; answers?: any[]; metadata?: any }>({
  query: ({ roundId, ...body }) => ({ url: `/v1/games/anonymous/rounds/${roundId}/submit`, method: 'POST', body }),
}),
mergeAnonymousSessions: build.mutation<any, { anonymousId: string; confirmedEventIds: string[] }>({
  query: (body) => ({ url: '/v1/games/anonymous/merge', method: 'POST', body }),
}),
```

---

### AI Generation Endpoints

Generate game content with AI. Auth required.

| Endpoint | Description |
|---|---|
| POST `/v1/games/trivia/generate` | Generate trivia questions |
| POST `/v1/games/word-puzzle/generate` | Generate word puzzle |
| POST `/v1/games/word-puzzle/generate-from-words` | Generate puzzle from word list |
| POST `/v1/games/this-or-that/generate` | Generate This-or-That round |
| POST `/v1/games/two-truths-one-lie/generate` | Generate Two Truths One Lie |

**React Native RTK Query (example  trivia):**
```ts
generateTrivia: build.mutation<any, { topic: string; difficulty: string; count: number }>({
  query: (body) => ({ url: '/v1/games/trivia/generate', method: 'POST', body }),
}),
```

---

### Reward Tier management

| Endpoint | Method | Description |
|---|---|---|
| `/v1/game-sessions/:id/reward-tiers` | POST | Add reward tier |
| `/v1/game-reward-tiers/:tierId` | PATCH | Update reward tier |
| `/v1/game-reward-tiers/:tierId` | DELETE | Delete reward tier |

**React Native RTK Query:**
```ts
addGameRewardTier: build.mutation<any, { sessionId: string; data: any }>({
  query: ({ sessionId, data }) => ({ url: `/v1/game-sessions/${sessionId}/reward-tiers`, method: 'POST', body: data }),
}),
updateGameRewardTier: build.mutation<any, { tierId: string; data: any }>({
  query: ({ tierId, data }) => ({ url: `/v1/game-reward-tiers/${tierId}`, method: 'PATCH', body: data }),
}),
deleteGameRewardTier: build.mutation<any, string>({
  query: (tierId) => ({ url: `/v1/game-reward-tiers/${tierId}`, method: 'DELETE' }),
}),
```

---

## 9. Payments  Attendee

Base path: `/v1/payments` | Auth required: **Yes** (except purchase summary which is public)

---

### POST /v1/payments/purchase

Initiate a ticket purchase. Returns a Ercaspay checkout URL to redirect the user to.

**Request body:**
```json
{
  "eventId": "uuid",
  "ticketTiers": [
    { "tierId": "ticket-tier-uuid", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseId": "uuid",
    "paymentReference": "NV-abc123",
    "totalAmount": 10000,
    "checkoutUrl": "https://checkout.ercaspay.com/...",
    "expiresAt": "2026-08-10T19:00:00Z"
  }
}
```

**React Native RTK Query:**
```ts
initiatePurchase: build.mutation<
  { success: boolean; data: { purchaseId: string; checkoutUrl: string; totalAmount: number; paymentReference: string; expiresAt: string } },
  { eventId: string; ticketTiers: { tierId: string; quantity: number }[] }
>({
  query: (body) => ({ url: '/v1/payments/purchase', method: 'POST', body }),
}),

// Open the checkoutUrl in a WebView or with Linking.openURL():
// import { Linking } from 'react-native';
// await Linking.openURL(data.checkoutUrl);
```

---

### GET /v1/payments/purchases/:purchaseId/summary

Public endpoint. Get the purchase confirmation after payment. Poll until `paymentStatus` is `COMPLETED`.

**Query params:** `reference` or `transRef` (from payment gateway redirect)

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseId": "uuid",
    "paymentStatus": "COMPLETED",
    "paidAt": "2026-08-10T18:45:00Z",
    "totalAmount": 10000,
    "currency": "NGN",
    "customerName": "Jane Doe",
    "event": { "id": "uuid", "name": "Summer Gala", "startsAt": "2026-08-10T18:00:00Z" },
    "tickets": [{ "ticketNumber": "NV-001", "tierName": "VIP", "tierPrice": 5000, "status": "VALID", "qrCode": "data:image/png;base64,..." }]
  }
}
```

**React Native RTK Query:**
```ts
getPurchaseSummary: build.query<any, { purchaseId: string; reference?: string; transRef?: string }>({
  query: ({ purchaseId, reference, transRef }) => {
    const p = new URLSearchParams();
    if (reference) p.set('reference', reference);
    if (transRef) p.set('transRef', transRef);
    const qs = p.toString();
    return `/v1/payments/purchases/${purchaseId}/summary${qs ? `?${qs}` : ''}`;
  },
}),
```

---

### GET /v1/payments/purchases

Get the authenticated user's purchase history (paginated).

**Query params:** `page`, `limit`

**React Native RTK Query:**
```ts
getUserPurchases: build.query<any, { page?: number; limit?: number } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    const qs = p.toString();
    return `/v1/payments/purchases${qs ? `?${qs}` : ''}`;
  },
  providesTags: ['Purchases'],
}),
```

---

### GET /v1/payments/purchases/:id

Get full detail for a specific purchase.

**React Native RTK Query:**
```ts
getPurchaseById: build.query<any, string>({
  query: (id) => `/v1/payments/purchases/${id}`,
}),
```

---

## 10. Organizer Payments & Plans

Base path: `/v1/organizer-payments` | Auth required: **Yes** (organizer only)

---

### GET /v1/organizer-payments/publish-preview/:eventId

Get available plans and pricing before publishing a DRAFT event.

**Response:**
```json
{
  "eventId": "uuid",
  "tier": "SMALL",
  "isFreePublish": false,
  "availablePlans": [
    { "planType": "VIBETAGS_SINGLE", "tier": "SMALL", "baseAmount": 5000, "finalAmount": 5000 },
    { "planType": "MEGA_BUNDLE_SINGLE", "tier": "SMALL", "baseAmount": 15000, "finalAmount": 15000 }
  ]
}
```

**React Native RTK Query:**
```ts
getPublishPreview: build.query<any, string>({
  query: (eventId) => `/v1/organizer-payments/publish-preview/${eventId}`,
}),
```

---

### POST /v1/organizer-payments/quote

Get a re-priced quote with optional coupon code.

**Request body:**
```json
{ "eventId": "uuid", "planType": "MEGA_BUNDLE_SINGLE", "couponCode": "LAUNCH50" }
```

**React Native RTK Query:**
```ts
getQuote: build.mutation<any, { eventId: string; planType: string; couponCode?: string }>({
  query: (body) => ({ url: '/v1/organizer-payments/quote', method: 'POST', body }),
}),
```

---

### POST /v1/organizer-payments/plan/initiate

Start a plan payment to publish a DRAFT event. Returns `checkoutUrl`.

**Request body:**
```json
{ "eventId": "uuid", "planType": "MEGA_BUNDLE_SINGLE", "couponCode": "optional" }
```

**Response:**
```json
{ "success": true, "data": { "paymentId": "uuid", "checkoutUrl": "https://...", "status": "PENDING" } }
```

**React Native RTK Query:**
```ts
initiatePlanPayment: build.mutation<any, { eventId: string; planType: string; couponCode?: string }>({
  query: (body) => ({ url: '/v1/organizer-payments/plan/initiate', method: 'POST', body }),
}),
```

---

### POST /v1/organizer-payments/additional-game/initiate

Unlock an additional game session over quota on a PUBLISHED event.

**Request body:**
```json
{ "eventId": "uuid", "gameSessionId": "uuid", "couponCode": "optional" }
```

**React Native RTK Query:**
```ts
initiateAdditionalGamePayment: build.mutation<any, { eventId: string; gameSessionId: string; couponCode?: string }>({
  query: (body) => ({ url: '/v1/organizer-payments/additional-game/initiate', method: 'POST', body }),
}),
```

---

### POST /v1/organizer-payments/vibetag-addon/initiate

Add VibeTags to a PUBLISHED event.

**Request body:**
```json
{ "eventId": "uuid", "bundle": false }
```

---

### GET /v1/organizer-payments/verify/:paymentId

Verify organizer payment status. Poll every 2 seconds while status is `pending`.

**Response:**
```json
{ "success": true, "data": { "status": "completed", "paymentId": "uuid" } }
```

**React Native RTK Query:**
```ts
verifyOrganizerPayment: build.query<any, string>({
  query: (paymentId) => `/v1/organizer-payments/verify/${paymentId}`,
}),

// Poll example using useLazyVerifyOrganizerPaymentQuery:
// const [verify] = useLazyVerifyOrganizerPaymentQuery();
// const poll = setInterval(async () => {
//   const { data } = await verify(paymentId);
//   if (data?.data?.status !== 'pending') clearInterval(poll);
// }, 2000);
```

---

### GET /v1/organizer-payments/my-payments

Paginated payment history for the authenticated organizer.

**Query params:** `page`, `limit`

**React Native RTK Query:**
```ts
getMyOrganizerPayments: build.query<any, { page?: number; limit?: number } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    const qs = p.toString();
    return `/v1/organizer-payments/my-payments${qs ? `?${qs}` : ''}`;
  },
}),
```

---

## 11. Reminders

Base path: `/v1/events/:eventId/reminders` | Auth required: **Yes** (organizer)

---

### GET /v1/events/:eventId/reminders

Get all reminder templates for an event.

**Response:**
```json
[
  { "id": "uuid", "timing": "ONE_DAY", "rsvpStatus": "CONFIRMED", "subject": "See you tomorrow!", "message": "...", "enabled": true }
]
```

**`timing` values:** `ONE_DAY` | `THREE_DAYS` | `FIVE_DAYS` | `SEVEN_DAYS`

**React Native RTK Query:**
```ts
getReminders: build.query<any[], string>({
  query: (eventId) => `/v1/events/${eventId}/reminders`,
  transformResponse: (res: any) => res?.data ?? res ?? [],
}),
```

---

### POST /v1/events/:eventId/reminders

Create or update (upsert) a reminder template.

**Request body:**
```json
{
  "timing": "ONE_DAY",
  "rsvpStatus": "CONFIRMED",
  "subject": "See you tomorrow!",
  "message": "Hi {name}, the event starts tomorrow at {time}.",
  "enabled": true
}
```

**React Native RTK Query:**
```ts
upsertReminder: build.mutation<any, { eventId: string; timing: string; rsvpStatus: string; subject: string; message: string; enabled?: boolean }>({
  query: ({ eventId, ...body }) => ({ url: `/v1/events/${eventId}/reminders`, method: 'POST', body }),
}),
```

---

### PATCH /v1/events/:eventId/reminders/:templateId/toggle

Toggle a reminder on or off.

**Request body:**
```json
{ "enabled": false }
```

**React Native RTK Query:**
```ts
toggleReminder: build.mutation<any, { eventId: string; templateId: string; enabled: boolean }>({
  query: ({ eventId, templateId, enabled }) => ({
    url: `/v1/events/${eventId}/reminders/${templateId}/toggle`,
    method: 'PATCH',
    body: { enabled },
  }),
}),
```

---

### DELETE /v1/events/:eventId/reminders/:templateId

**React Native RTK Query:**
```ts
deleteReminder: build.mutation<any, { eventId: string; templateId: string }>({
  query: ({ eventId, templateId }) => ({ url: `/v1/events/${eventId}/reminders/${templateId}`, method: 'DELETE' }),
}),
```

---

### GET /v1/events/:eventId/reminders/logs

Get reminder delivery logs and summary.

**Response:**
```json
{
  "summary": { "ONE_DAY": { "sent": 45, "failed": 2, "pending": 10 } },
  "logs": [{ "id": "uuid", "timing": "ONE_DAY", "sent": true, "sentAt": "2026-08-09T10:00:00Z", "user": { "email": "..." } }]
}
```

**React Native RTK Query:**
```ts
getReminderLogs: build.query<any, string>({
  query: (eventId) => `/v1/events/${eventId}/reminders/logs`,
  transformResponse: (res: any) => res?.data ?? res,
}),
```

---

### POST /v1/events/:eventId/reminders/import-csv

Import attendee emails from a CSV file. Sends `multipart/form-data`.

**Query params:** `timing`, `channel=EMAIL`

**Form fields:** `file` (CSV file)

**Response:**
```json
{ "message": "Import complete", "totalRows": 100, "added": 95, "skipped": 3, "unmatched": 2 }
```

**React Native RTK Query:**
```ts
importCsvReminders: build.mutation<any, { eventId: string; timing: string; file: any }>({
  query: ({ eventId, timing, file }) => {
    const formData = new FormData();
    formData.append('file', file);
    return {
      url: `/v1/events/${eventId}/reminders/import-csv?timing=${timing}&channel=EMAIL`,
      method: 'POST',
      body: formData,
    };
  },
}),
```

---

## 12. Pledges

Base path: `/v1/pledges` | Auth required: **No** for initiate/verify (guests can pledge)

---

### POST /v1/pledges/initiate

Initiate a pledge (supporter tier purchase). Returns a checkout URL.

**Request body:**
```json
{
  "tierId": "vibesupporter",
  "quantity": 1,
  "email": "guest@example.com",
  "name": "Guest User"
}
```

**`tierId` values:** `vibewatcher` | `vibesupporter` | `vibefan` | `vibeenthusiast` | `vibechampion` | `vibepatron` | `vibemaestro` | `vibeking`

**Response:**
```json
{ "pledgeId": "uuid", "checkoutUrl": "https://...", "totalNgn": 5000, "totalUsd": 3, "expiresAt": "..." }
```

**React Native RTK Query:**
```ts
initiatePledge: build.mutation<any, { tierId: string; quantity: number; email?: string; name?: string }>({
  query: (body) => ({ url: '/v1/pledges/initiate', method: 'POST', body }),
}),
```

---

### GET /v1/pledges/verify/:pledgeId

Poll after payment redirect to confirm the pledge status.

**Response:**
```json
{ "status": "completed", "pledge": { "id": "uuid", "tierName": "vibesupporter", "quantity": 1, "totalNgn": 5000 } }
```

**React Native RTK Query:**
```ts
verifyPledge: build.query<any, string>({
  query: (pledgeId) => `/v1/pledges/verify/${pledgeId}`,
}),
```

---

### GET /v1/pledges/my

Get all pledges for the authenticated user.

**React Native RTK Query:**
```ts
getMyPledges: build.query<any, void>({
  query: () => '/v1/pledges/my',
  providesTags: ['Pledges'],
}),
```

---

## 13. Notifications

Base path: `/v1/notifications` | Auth required: **Yes**

---

### GET /v1/notifications

Get paginated notifications for the current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [{ "id": "uuid", "type": "like", "actor": { "username": "...", "avatarUrl": "..." }, "isRead": false, "createdAt": "..." }],
    "meta": { "total": 30, "page": 1, "limit": 20, "hasNext": true, "unreadCount": 5 }
  }
}
```

**React Native RTK Query:**
```ts
getNotifications: build.query<any, void>({
  query: () => '/v1/notifications',
  providesTags: ['Notifications'],
}),
```

---

### PATCH /v1/notifications/read-all

Mark all notifications as read.

**Response:**
```json
{ "success": true, "data": { "updatedCount": 5 } }
```

**React Native RTK Query:**
```ts
markAllRead: build.mutation<any, void>({
  query: () => ({ url: '/v1/notifications/read-all', method: 'PATCH' }),
  invalidatesTags: ['Notifications'],
}),
```

---

### PATCH /v1/notifications/:id/read

Mark a single notification as read.

**React Native RTK Query:**
```ts
markOneRead: build.mutation<any, string>({
  query: (id) => ({ url: `/v1/notifications/${id}/read`, method: 'PATCH' }),
  invalidatesTags: ['Notifications'],
}),
```

---

## 14. Messaging & Chat

Base path: `/v1/conversations`, `/v1/events/:eventId/chat` | Auth required: **Yes**

---

### GET /v1/conversations

Get all conversations for the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "participant": { "username": "...", "avatarUrl": "..." }, "lastMessage": { "body": "Hey!", "createdAt": "..." }, "unreadCount": 2 }
  ]
}
```

**React Native RTK Query:**
```ts
getConversations: build.query<any, void>({
  query: () => '/v1/conversations',
  providesTags: ['Conversations'],
}),
```

---

### POST /v1/conversations

Start a new direct message conversation.

**Request body:**
```json
{ "userId": "target-user-uuid" }
```

**React Native RTK Query:**
```ts
startConversation: build.mutation<any, { userId: string }>({
  query: (body) => ({ url: '/v1/conversations', method: 'POST', body }),
  invalidatesTags: ['Conversations'],
}),
```

---

### GET /v1/conversations/:conversationId/messages

Get paginated messages in a conversation.

**Query params:** `page`, `limit`

**Response:**
```json
{ "success": true, "data": { "data": [{ "id": "uuid", "senderId": "uuid", "body": "Hello", "createdAt": "..." }] } }
```

**React Native RTK Query:**
```ts
getMessages: build.query<any, { conversationId: string; page?: number; limit?: number }>({
  query: ({ conversationId, page = 1, limit = 50 }) => ({
    url: `/v1/conversations/${conversationId}/messages`,
    params: { page, limit },
  }),
}),
```

---

### GET /v1/events/:eventId/chat/:section

Get event chat message history for a specific phase.

**`section` values:** `pre-event` | `during` | `post-event`

**React Native RTK Query:**
```ts
getEventChat: build.query<any, { eventId: string; section: 'pre-event' | 'during' | 'post-event' }>({
  query: ({ eventId, section }) => `/v1/events/${eventId}/chat/${section}`,
}),
```

---

## 15. Social  Feed, Follow, Likes, Comments

Auth required: **Yes**

---

### GET /v1/feed/following

Get the postcards feed from accounts you follow.

**Query params:** `page`, `limit`

**React Native RTK Query:**
```ts
getFollowingFeed: build.query<any, { page?: number; limit?: number } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit ?? 20));
    const qs = p.toString();
    return `/v1/feed/following${qs ? `?${qs}` : ''}`;
  },
}),
```

---

### POST /v1/users/:userId/follow  &  DELETE /v1/users/:userId/follow

Follow or unfollow a user.

**React Native RTK Query:**
```ts
toggleFollow: build.mutation<any, { userId: string; isFollowing: boolean }>({
  query: ({ userId, isFollowing }) => ({
    url: `/v1/users/${userId}/follow`,
    method: isFollowing ? 'DELETE' : 'POST',
  }),
  invalidatesTags: ['People', 'Feed'],
}),
```

---

### GET /v1/my-following  |  GET /v1/my-followers  |  GET /v1/mutuals

**React Native RTK Query:**
```ts
getMyFollowing: build.query<any, void>({ query: () => '/v1/my-following' }),
getMyFollowers: build.query<any, void>({ query: () => '/v1/my-followers' }),
getMutuals: build.query<any, void>({ query: () => '/v1/mutuals' }),
```

---

### POST /v1/likes  &  DELETE /v1/likes

Like or unlike a target (postcard or event).

**Request body:**
```json
{ "targetType": "postcard", "targetId": "uuid" }
```

**React Native RTK Query:**
```ts
likeTarget: build.mutation<any, { targetType: 'postcard' | 'event'; targetId: string }>({
  query: (body) => ({ url: '/v1/likes', method: 'POST', body }),
}),
unlikeTarget: build.mutation<any, { targetType: 'postcard' | 'event'; targetId: string }>({
  query: (body) => ({ url: '/v1/likes', method: 'DELETE', body }),
}),
```

---

### GET /v1/comments

Get paginated comments for a target.

**Query params:** `targetType`, `targetId`, `page`, `limit`

**React Native RTK Query:**
```ts
getComments: build.query<any, { targetType: 'postcard' | 'event'; targetId: string; page?: number; limit?: number }>({
  query: ({ targetType, targetId, page = 1, limit = 20 }) =>
    `/v1/comments?targetType=${targetType}&targetId=${targetId}&page=${page}&limit=${limit}`,
}),
```

---

### POST /v1/comments

Post a comment on a target.

**Request body:**
```json
{ "targetType": "postcard", "targetId": "uuid", "body": "Amazing shot!", "parentId": null }
```

**React Native RTK Query:**
```ts
postComment: build.mutation<any, { targetType: string; targetId: string; body: string; parentId?: string | null }>({
  query: (body) => ({ url: '/v1/comments', method: 'POST', body }),
}),
```

---

### DELETE /v1/comments/:commentId

**React Native RTK Query:**
```ts
deleteComment: build.mutation<any, string>({
  query: (commentId) => ({ url: `/v1/comments/${commentId}`, method: 'DELETE' }),
}),
```

---

### GET /v1/comments/:commentId/replies

**React Native RTK Query:**
```ts
getCommentReplies: build.query<any, string>({ query: (commentId) => `/v1/comments/${commentId}/replies` }),
```

---

### POST /v1/shares

Record a content share action.

**Request body:**
```json
{ "targetType": "event", "targetId": "uuid", "platform": "whatsapp" }
```

**React Native RTK Query:**
```ts
recordShare: build.mutation<any, { targetType: string; targetId: string; platform: string }>({
  query: (body) => ({ url: '/v1/shares', method: 'POST', body }),
}),
```

---

## 16. Discover

Base path: `/v1/discover` | Auth required: GET tags is public; feed requires auth for personalisation

---

### GET /v1/discover/events

Get a personalised event feed with optional geo-filtering.

**Query params:** `page`, `limit`, `lat`, `lng`, `radiusKm`, `tag`

**Response:**
```json
{
  "data": [{ "id": "uuid", "name": "Summer Gala", "startsAt": "...", "tags": [{ "name": "Afrobeats" }] }],
  "meta": { "total": 40, "page": 1, "limit": 20, "hasNext": true }
}
```

**React Native RTK Query:**
```ts
getDiscoverFeed: build.query<any, { page?: number; limit?: number; lat?: number; lng?: number; radiusKm?: number; tag?: string } | void>({
  query: (params) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    if (params?.lat) p.set('lat', String(params.lat));
    if (params?.lng) p.set('lng', String(params.lng));
    if (params?.radiusKm) p.set('radiusKm', String(params.radiusKm));
    if (params?.tag) p.set('tag', params.tag);
    const qs = p.toString();
    return `/v1/discover/events${qs ? `?${qs}` : ''}`;
  },
}),
// For location: use expo-location to get coords, then pass lat/lng/radiusKm
```

---

### POST /v1/discover/tags

Create a custom discover tag.

**Request body:**
```json
{ "name": "Afropop" }
```

**React Native RTK Query:**
```ts
createDiscoverTag: build.mutation<{ id: string; name: string; slug: string }, { name: string }>({
  query: (body) => ({ url: '/v1/discover/tags', method: 'POST', body }),
  transformResponse: (res: any) => { const tag = res?.data ?? res; return { id: tag.id, name: tag.name, slug: tag.slug ?? '' }; },
}),
```

---

## 17. Analytics

Base path: `/v1/analytics` | Auth required: **Yes** (organizer only)

---

| Endpoint | Description |
|---|---|
| GET `/v1/analytics/overview` | Cross-event summary stats for the organizer |
| GET `/v1/analytics/overview/locations` | Attendee location clustering (all events) |
| GET `/v1/analytics/events/:eventId` | Full analytics bundle for a single event |
| GET `/v1/analytics/events/:eventId/vibetags` | Vibe tag engagement metrics |
| GET `/v1/analytics/events/:eventId/postcards` | Postcard performance metrics |
| GET `/v1/analytics/events/:eventId/revenue` | Revenue metrics |
| GET `/v1/analytics/events/:eventId/social` | Social engagement velocity |
| GET `/v1/analytics/events/:eventId/games` | Game session analytics |
| GET `/v1/analytics/events/:eventId/locations` | Per-event location breakdown |

**Response shape (example  overview):**
```json
{
  "success": true,
  "data": {
    "totalEvents": 5,
    "totalAttendees": 1200,
    "totalRevenue": 250000,
    "totalPostcards": 340
  }
}
```

**React Native RTK Query:**
```ts
export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Analytics'],
  keepUnusedDataFor: 120,
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<any, void>({ query: () => '/v1/analytics/overview' }),
    getEventAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}` }),
    getEventVibeTagAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/vibetags` }),
    getEventPostcardAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/postcards` }),
    getEventRevenueAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/revenue` }),
    getEventSocialAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/social` }),
    getEventGameAnalytics: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/games` }),
    getOverviewLocations: builder.query<any, void>({ query: () => '/v1/analytics/overview/locations' }),
    getEventLocations: builder.query<any, string>({ query: (id) => `/v1/analytics/events/${id}/locations` }),
  }),
});
```

---

## 18. Rewards

Base path: `/v1/my/rewards`, `/v1/rewards` | Auth required: **Yes**

---

### GET /v1/my/rewards

Get all rewards earned by the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "isClaimed": false,
      "rewardTier": { "rank": 1, "type": "CASH", "title": "First Place", "value": "10000" },
      "gameSession": { "id": "uuid", "title": "Trivia Night", "event": { "id": "uuid", "name": "Summer Gala" } }
    }
  ]
}
```

**React Native RTK Query:**
```ts
getMyRewards: build.query<any, void>({
  query: () => '/v1/my/rewards',
  providesTags: ['Rewards'],
}),
```

---

### POST /v1/rewards/:rewardId/claim

Claim a reward.

**Response:**
```json
{ "success": true, "data": { "id": "uuid", "isClaimed": true, "claimedAt": "2026-08-11T10:00:00Z" } }
```

**React Native RTK Query:**
```ts
claimReward: build.mutation<any, string>({
  query: (rewardId) => ({ url: `/v1/rewards/${rewardId}/claim`, method: 'POST' }),
  invalidatesTags: ['Rewards'],
}),
```

---

## 19. Admin

Base path: `/v1/admin` | Auth required: **Yes** (ADMIN or SUPER_ADMIN role)

---

### Stats & Analytics

| Endpoint | Method | Description |
|---|---|---|
| `/v1/admin/stats` | GET | Dashboard overview stats |
| `/v1/admin/analytics` | GET | Detailed analytics data |
| `/v1/admin/payments` | GET | Paginated payment records |
| `/v1/admin/payments/stats` | GET | Payment summary statistics |

---

### Events (Admin)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/admin/events` | GET | Paginated events list |
| `/v1/admin/events/:id` | GET | Single event detail |
| `/v1/admin/events/:id/cancel` | PATCH | Cancel an event (body: `{ reason?: string }`) |

---

### Users (Admin)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/admin/users` | GET | Paginated users (query: `role`) |
| `/v1/admin/users/:id` | GET | User detail with activity |
| `/v1/admin/users/:id/role` | PATCH | Update user role (`{ role: 'ORGANIZER' }`) |
| `/v1/admin/users/:id/ban` | PATCH | Toggle user ban status |

---

### Content (Admin)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/admin/postcards` | GET | Paginated postcards |
| `/v1/admin/game-sessions` | GET | Paginated game sessions |
| `/v1/admin/vibetags` | GET | Vibe tag statistics |

---

### Coupons (Admin)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/admin/coupons` | POST | Create coupon |
| `/v1/admin/coupons` | GET | List all coupons |
| `/v1/admin/coupons/:id` | GET | Coupon detail with redemptions |
| `/v1/admin/coupons/:id` | PATCH | Update coupon (isActive, usageLimit, expiresAt) |
| `/v1/admin/coupons/:id` | DELETE | Delete coupon |

**Create coupon request body:**
```json
{
  "code": "LAUNCH50",
  "discountType": "PERCENTAGE",
  "discountValue": 50,
  "usageLimit": 100,
  "expiresAt": "2026-12-31T23:59:59Z",
  "description": "Launch promo"
}
```

**React Native RTK Query (admin API pattern):**
```ts
// The admin API prefixes all URLs with /v1/admin automatically:
const adminBaseQuery = (args: any, api: any, extra: any) => {
  const adjusted = typeof args === 'string'
    ? `/v1/admin${args}`
    : { ...args, url: `/v1/admin${args.url}` };
  return baseQueryWithReauth(adjusted, api, extra);
};

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: adminBaseQuery,
  endpoints: (builder) => ({
    getStats: builder.query<any, void>({ query: () => '/stats' }),
    getUsers: builder.query<any, { page?: number; limit?: number; role?: string } | void>({
      query: (params) => ({ url: '/users', params: params ?? {} }),
    }),
    toggleUserBan: builder.mutation<any, string>({
      query: (id) => ({ url: `/users/${id}/ban`, method: 'PATCH' }),
    }),
    // ... add remaining endpoints following the same pattern
  }),
});
```

---

## 20. Launch / Waitlist

Base path: `/v1/launch` | Auth required: **No**

---

### POST /v1/launch/waitlist

Join the platform launch waitlist.

**Request body:**
```json
{ "email": "user@example.com", "name": "Jane Doe" }
```

**Response:**
```json
{ "success": true, "message": "Added to waitlist" }
```

**React Native RTK Query:**
```ts
// Uses a plain fetchBaseQuery (no auth needed)
export const launchApi = createApi({
  reducerPath: 'launchApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.EXPO_PUBLIC_API_URL }),
  endpoints: (build) => ({
    waitlist: build.mutation<any, { email: string; name?: string }>({
      query: (body) => ({ url: '/v1/launch/waitlist', method: 'POST', body }),
    }),
  }),
});
export const { useWaitlistMutation } = launchApi;
```

---

## 21. Storage / File Upload

Auth required: **Yes**

---

### POST /v1/storage/presigned-url

Get a short-lived presigned URL to upload a file directly to object storage.

**Request body:**
```json
{ "filename": "avatar.jpg", "mimeType": "image/jpeg", "context": "avatar" }
```

**Response:**
```json
{ "uploadUrl": "https://minio.../avatar.jpg?X-Amz-...", "objectUrl": "https://cdn.../avatar.jpg", "expiresIn": 300 }
```

**React Native usage:**
```ts
// 1. Get presigned URL
const { data } = await getPresignedUrl({ filename: 'avatar.jpg', mimeType: 'image/jpeg', context: 'avatar' });

// 2. PUT the file directly to the presigned URL (no auth header needed for the PUT)
const fileData = await fetch(localFileUri);
const blob = await fileData.blob();
await fetch(data.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: blob,
});

// 3. Save the objectUrl to the user's profile or event
await updateMe({ avatarUrl: data.objectUrl });
```

**React Native RTK Query:**
```ts
getPresignedUrl: build.mutation<
  { uploadUrl: string; objectUrl: string; expiresIn: number },
  { filename: string; mimeType: string; context: string }
>({
  query: (body) => ({ url: '/v1/storage/presigned-url', method: 'POST', body }),
}),
```

---

### POST /v1/events/upload-intent

Get a presigned upload URL for event flier/media. Alternative flow used during event creation.

**Request body:**
```json
{ "filename": "flier.jpg", "contentType": "image/jpeg", "folder": "events" }
```

**Response:**
```json
{ "success": true, "data": { "uploadUrl": "https://minio.../...", "fileUrl": "https://cdn.../flier.jpg" } }
```

**React Native RTK Query:**
```ts
uploadIntent: build.mutation<{ success: boolean; data: { uploadUrl: string; fileUrl: string } }, { filename: string; contentType: string; folder: string }>({
  query: (body) => ({ url: '/v1/events/upload-intent', method: 'POST', body }),
}),
// Then PUT the file to uploadUrl, and use fileUrl as the event flierUrl.
```

---

### POST /v1/storage/upload-multiple

Upload multiple files at once (used for postcards). Sends `multipart/form-data`.

**Request:** `multipart/form-data` with multiple `files` fields.

**Response:**
```json
{ "success": true, "data": [{ "url": "https://cdn.../img.jpg", "fileKey": "uploads/abc.jpg", "mediaType": "image" }] }
```

**React Native RTK Query:**
```ts
uploadMultipleFiles: build.mutation<any, FormData>({
  query: (formData) => ({ url: '/v1/storage/upload-multiple', method: 'POST', body: formData }),
}),

// Build FormData in React Native:
// const formData = new FormData();
// formData.append('files', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
```

---

## Quick Reference  All Endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 1 | POST | `/v1/auth/register` | No | Register |
| 2 | POST | `/v1/auth/login` | No | Login |
| 3 | POST | `/v1/auth/oauth/google` | No | Google OAuth |
| 4 | POST | `/v1/auth/forgot-password` | No | Forgot password |
| 5 | POST | `/v1/auth/reset-password` | No | Reset password |
| 6 | POST | `/v1/auth/refresh` | No | Refresh tokens |
| 7 | POST | `/v1/auth/logout` | Yes | Logout |
| 8 | GET | `/v1/users/me` | Yes | Get my profile |
| 9 | PATCH | `/v1/users/me` | Yes | Update my profile |
| 10 | POST | `/v1/users/me/switch-role` | Yes | Switch role |
| 11 | PATCH | `/v1/users/me/vibes` | Yes | Save vibe tags |
| 12 | GET | `/v1/users/:id/basic` | No | Public profile card |
| 13 | GET | `/v1/users/:id/activity` | No | User activity stats |
| 14 | GET | `/v1/events/organizer/:id` | No | Organizer events |
| 15 | GET | `/v1/events` | No | List events |
| 16 | GET | `/v1/events/:id` | No | Event detail |
| 17 | POST | `/v1/events` | Yes | Create event |
| 18 | PATCH | `/v1/events/:id` | Yes | Update event |
| 19 | DELETE | `/v1/events/:id` | Yes | Delete event |
| 20 | PATCH | `/v1/events/:id/status` | Yes | Change status |
| 21 | POST | `/v1/events/checkin` | Yes | Check in |
| 22 | POST | `/v1/events/:id/rsvp` | Yes | RSVP |
| 23 | GET | `/v1/events/:id/attendees` | Yes | List attendees |
| 24 | GET | `/v1/events/:id/active-game-status` | Yes | Active game info |
| 25 | POST | `/v1/events/:id/tags/add` | Yes | Add event tags |
| 26 | POST | `/v1/events/:id/tags/remove` | Yes | Remove event tags |
| 27 | GET | `/v1/events/:id/tickets` | No | List ticket tiers |
| 28 | POST | `/v1/events/:id/tickets` | Yes | Create ticket tier |
| 29 | PATCH | `/v1/events/:id/tickets/:tid` | Yes | Update ticket tier |
| 30 | DELETE | `/v1/events/:id/tickets/:tid` | Yes | Delete ticket tier |
| 31 | GET | `/v1/postcards` | No | Global feed |
| 32 | GET | `/v1/postcards/:id` | No | Single postcard |
| 33 | POST | `/v1/postcards` | Yes | Create postcard |
| 34 | POST | `/v1/postcards/:id/like` | Yes | Toggle like |
| 35 | POST | `/v1/postcards/:id/comment` | Yes | Add comment |
| 36 | GET | `/v1/postcards/:id/likes` | No | Postcard likes |
| 37 | GET | `/v1/postcards/:id/comments` | No | Postcard comments |
| 38 | POST | `/v1/postcards/:id/view` | No | Track view |
| 39 | GET | `/v1/postcards/event/:id/leaderboard` | No | Postcard leaderboard |
| 40 | GET | `/v1/events/:id/postcards` | No | Event postcards |
| 41 | GET | `/v1/vibe-tags?eventId=` | No | Event vibe tags |
| 42 | POST | `/v1/vibe-tags` | Yes | Create vibe tag |
| 43 | GET | `/v1/discover/tags` | No | Platform tags |
| 44 | POST | `/v1/discover/tags` | Yes | Create discover tag |
| 45 | GET | `/v1/discover/events` | Opt | Discover feed |
| 46 | POST | `/v1/events/:id/game-sessions` | Yes | Create game session |
| 47 | GET | `/v1/events/:id/game-sessions` | Yes | List game sessions |
| 48 | GET | `/v1/game-sessions/:id` | Yes | Session detail |
| 49 | PATCH | `/v1/game-sessions/:id` | Yes | Update session |
| 50 | PATCH | `/v1/game-sessions/:id/status` | Yes | Start/end session |
| 51 | POST | `/v1/game-sessions/:id/join` | Yes | Join session |
| 52 | GET | `/v1/game-sessions/:id/leaderboard` | No | Leaderboard |
| 53 | GET | `/v1/game-sessions/:id/edit-policy` | Yes | Editable? |
| 54 | POST | `/v1/game-sessions/:id/rounds` | Yes | Add round |
| 55 | PATCH | `/v1/game-rounds/:id` | Yes | Update round |
| 56 | DELETE | `/v1/game-rounds/:id` | Yes | Delete round |
| 57 | PATCH | `/v1/game-rounds/:id/status` | Yes | Start/end round |
| 58 | POST | `/v1/game-rounds/:id/submit` | Yes | Submit answers |
| 59 | GET | `/v1/game-rounds/:id/participation` | Yes | Check participation |
| 60 | GET | `/v1/game-rounds/:id/responses` | Yes | Feedback responses |
| 61 | GET | `/v1/games/t/:token` | No | Session by token |
| 62 | POST | `/v1/games/join/:token` | Yes | Join by token |
| 63 | POST | `/v1/games/anonymous/join/:token` | No | Anonymous join |
| 64 | POST | `/v1/games/anonymous/rounds/:id/submit` | No | Anonymous submit |
| 65 | POST | `/v1/games/anonymous/merge` | Yes | Merge sessions |
| 66 | POST | `/v1/games/trivia/generate` | Yes | AI trivia |
| 67 | POST | `/v1/games/word-puzzle/generate` | Yes | AI word puzzle |
| 68 | POST | `/v1/games/word-puzzle/generate-from-words` | Yes | Puzzle from words |
| 69 | POST | `/v1/games/this-or-that/generate` | Yes | AI this-or-that |
| 70 | POST | `/v1/games/two-truths-one-lie/generate` | Yes | AI 2T1L |
| 71 | POST | `/v1/game-sessions/:id/reward-tiers` | Yes | Add reward tier |
| 72 | PATCH | `/v1/game-reward-tiers/:id` | Yes | Update reward tier |
| 73 | DELETE | `/v1/game-reward-tiers/:id` | Yes | Delete reward tier |
| 74 | POST | `/v1/payments/purchase` | Yes | Initiate purchase |
| 75 | GET | `/v1/payments/purchases/:id/summary` | No | Purchase summary |
| 76 | GET | `/v1/payments/purchases` | Yes | Purchase history |
| 77 | GET | `/v1/payments/purchases/:id` | Yes | Purchase detail |
| 78 | GET | `/v1/organizer-payments/publish-preview/:id` | Yes | Publish preview |
| 79 | POST | `/v1/organizer-payments/quote` | Yes | Get quote |
| 80 | POST | `/v1/organizer-payments/plan/initiate` | Yes | Pay for plan |
| 81 | POST | `/v1/organizer-payments/additional-game/initiate` | Yes | Pay for game |
| 82 | POST | `/v1/organizer-payments/vibetag-addon/initiate` | Yes | Pay for vibetag |
| 83 | GET | `/v1/organizer-payments/verify/:id` | Yes | Verify payment |
| 84 | GET | `/v1/organizer-payments/my-payments` | Yes | Payment history |
| 85 | GET | `/v1/events/:id/reminders` | Yes | List reminders |
| 86 | POST | `/v1/events/:id/reminders` | Yes | Upsert reminder |
| 87 | PATCH | `/v1/events/:id/reminders/:tid/toggle` | Yes | Toggle reminder |
| 88 | DELETE | `/v1/events/:id/reminders/:tid` | Yes | Delete reminder |
| 89 | GET | `/v1/events/:id/reminders/logs` | Yes | Reminder logs |
| 90 | POST | `/v1/events/:id/reminders/import-csv` | Yes | Import CSV |
| 91 | POST | `/v1/pledges/initiate` | No | Initiate pledge |
| 92 | GET | `/v1/pledges/verify/:id` | No | Verify pledge |
| 93 | GET | `/v1/pledges/my` | Yes | My pledges |
| 94 | GET | `/v1/notifications` | Yes | Notifications |
| 95 | PATCH | `/v1/notifications/read-all` | Yes | Mark all read |
| 96 | PATCH | `/v1/notifications/:id/read` | Yes | Mark one read |
| 97 | GET | `/v1/conversations` | Yes | Conversations |
| 98 | POST | `/v1/conversations` | Yes | Start DM |
| 99 | GET | `/v1/conversations/:id/messages` | Yes | Messages |
| 100 | GET | `/v1/events/:id/chat/:section` | Yes | Event chat |
| 101 | GET | `/v1/feed/following` | Yes | Following feed |
| 102 | POST | `/v1/users/:id/follow` | Yes | Follow user |
| 103 | DELETE | `/v1/users/:id/follow` | Yes | Unfollow user |
| 104 | GET | `/v1/my-following` | Yes | Following list |
| 105 | GET | `/v1/my-followers` | Yes | Followers list |
| 106 | GET | `/v1/mutuals` | Yes | Mutuals |
| 107 | POST | `/v1/likes` | Yes | Like target |
| 108 | DELETE | `/v1/likes` | Yes | Unlike target |
| 109 | GET | `/v1/comments` | No | Get comments |
| 110 | POST | `/v1/comments` | Yes | Post comment |
| 111 | DELETE | `/v1/comments/:id` | Yes | Delete comment |
| 112 | GET | `/v1/comments/:id/replies` | No | Replies |
| 113 | POST | `/v1/shares` | Yes | Record share |
| 114 | GET | `/v1/analytics/overview` | Yes | Overview analytics |
| 115 | GET | `/v1/analytics/events/:id` | Yes | Event analytics |
| 116 | GET | `/v1/my/rewards` | Yes | My rewards |
| 117 | POST | `/v1/rewards/:id/claim` | Yes | Claim reward |
| 118 | POST | `/v1/launch/waitlist` | No | Join waitlist |
| 119 | POST | `/v1/storage/presigned-url` | Yes | Presigned URL |
| 120 | POST | `/v1/storage/upload-multiple` | Yes | Upload files |
| 121 | POST | `/v1/events/upload-intent` | Yes | Upload intent |
| 122 | GET | `/v1/admin/stats` | Admin | Admin stats |
| 123 | GET | `/v1/admin/users` | Admin | Manage users |
| 124 | POST | `/v1/admin/coupons` | Admin | Create coupon |

---

*Generated from the NextVibe web codebase (`src/app/provider/api/`)  reflects all RTK Query slices.*
