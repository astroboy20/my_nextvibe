/**
 * store/api/eventsApi.ts
 *
 * Compatibility shim — re-exports every hook and type from the canonical
 * eventApi slice, plus aliases and utilities that various screens/components
 * expect under different names.
 *
 * Screens import from "eventsApi"; the real slice lives in "eventApi".
 */

// ─── Re-export everything from the canonical slice ────────────────────────────
export * from "./eventApi";

// ─── Named API object — needed by useAuth.ts resetApiState ───────────────────
export { eventsApi } from "./eventApi";

// ─── Hook aliases ─────────────────────────────────────────────────────────────
// app/events/[id].tsx and app/edit-event.tsx:
export {
    useGetEventDetailsQuery as useGetEventByIdQuery,
    useGetVibeTagsQuery as useGetEventVibeTagsQuery
} from "./eventApi";

// components/event/RsvpTab.tsx:
export {
    useGetTicketsQuery as useGetEventTicketsQuery,
    useRsvpMutation as useRsvpEventMutation
} from "./eventApi";

// ─── DiscoverEvent type used by app/(tabs)/index.tsx ─────────────────────────
export interface DiscoverEvent {
  id: string;
  name: string;
  description?: string | null;
  flierUrl?: string | null;
  locationName?: string | null;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  mode?: string;
  isPublic?: boolean;
  tier?: string;
  hasGame?: boolean;
  hasVibeTag?: boolean;
  postcardCount?: number;
  tags?: { id: string; name: string }[];
  organizer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

// ─── EventCardData + toCardData — used by home screen ────────────────────────
export interface EventCardData {
  id: string;
  title: string;
  location: string;
  startsAt?: string;
  imageUrl?: string | null;
  tags: { label: string }[];
  hasGames: boolean;
  hasVibeTag: boolean;
  status?: string;
}

export function toCardData(event: DiscoverEvent): EventCardData {
  return {
    id:         event.id,
    title:      event.name,
    location:   event.locationName ?? "",
    startsAt:   event.startsAt,
    imageUrl:   event.flierUrl ?? null,
    tags:       (event.tags ?? []).map((t) => ({ label: t.name })),
    hasGames:   !!event.hasGame,
    hasVibeTag: !!event.hasVibeTag,
    status:     event.status,
  };
}

// ─── FeedPostcard type used by components/discover/PostcardCard.tsx ──────────
export interface FeedPostcard {
  id: string;
  mediaUrl?: string | null;
  caption?: string | null;
  likeCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  createdAt?: string;
  author?: {
    id?: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
  event?: { id: string; name: string };
  vibeTag?: { name: string };
}
