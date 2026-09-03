/**
 * store/api/usersApi.ts
 *
 * Compatibility shim — re-exports the correct hooks and types from the
 * canonical API slices so that app screens/components that import from
 * "usersApi" work without modifying the existing endpoints.
 *
 * Sources:
 *   authApi     — getMe, getUser, getOrganizerEvents, getUserActivity, updateUser, getUserBasic
 *   userApi     — switchRole, updateMe
 *   discoverApi — saveUserVibes  (→ useSaveVibesMutation)
 *   eventApi    — uploadMultipleFiles (→ useUploadFileMutation)
 */

// ─── authApi hooks ────────────────────────────────────────────────────────────
export {
    useGetMeQuery, useGetOrganizerEventsQuery,
    useGetUserActivityQuery,
    useGetUserBasicQuery, useGetUserQuery, useUpdateUserMutation,
    // usersApi object — needed by useAuth.ts for resetApiState
    // authApi is the primary owner of user data; expose it as "usersApi"
    authApi as usersApi
} from "./authApi";

// ─── userApi hooks ────────────────────────────────────────────────────────────
export { useSwitchRoleMutation, useUpdateMeMutation } from "./userApi";

// ─── discoverApi hooks ────────────────────────────────────────────────────────
export { useSaveUserVibesMutation as useSaveVibesMutation } from "./discoverApi";

// ─── eventApi hooks ───────────────────────────────────────────────────────────
// edit-profile.tsx calls uploadFile(formData).unwrap() and reads
// uploaded.data[0].url  (uploadMultipleFiles returns { data: [{url, fileKey}] })
export { useUploadMultipleFilesMutation as useUploadFileMutation } from "./eventApi";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface OrganizerEvent {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  locationName?: string | null;
  flierUrl?: string | null;
}

export interface PostcardItem {
  id: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: 'PHOTO' | 'VIDEO' | null;
  likeCount?: number;
  caption?: string | null;
  createdAt?: string;
}

export interface UserTicket {
  id: string;
  eventName: string;
  ticketType: string;
  date: string;
  status: string;
  ticketNumber?: string;
}
