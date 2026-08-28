/**
 * store/api/eventsApi.ts — compatibility shim
 *
 * Re-exports every hook and type from the canonical eventApi slice,
 * plus aliases and utilities that screens/components expect under different names.
 * The real slice lives in eventApi.ts.
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
// Must match the EventCardData interface declared in components/discover/EventCard.tsx
export interface EventCardData {
  id: string;
  title: string;
  date: string;
  startsAt?: string;
  memories: number;
  location: string;
  flierUrl?: string | null;       // EventCard reads item.flierUrl
  isPublic?: boolean;
  eventMode?: "ONSITE" | "VIRTUAL" | "HYBRID";
  hasGames?: boolean;
  hasVibeTag?: boolean;
  tags: Array<{ label: string; color: string }>;
}

// Tag colour map matches TagColors.ts conventions used in EventCard
const TAG_COLORS: Record<string, string> = {
  Games:   "#ea580c",
  VibeTag: "#8B5CF6",
  Virtual: "#0891b2",
  Hybrid:  "#059669",
  Onsite:  "#2563eb",
  Free:    "#16a34a",
};

export function toCardData(event: DiscoverEvent): EventCardData {
  const tags: Array<{ label: string; color: string }> = [];

  if (event.mode === "VIRTUAL")     tags.push({ label: "Virtual", color: TAG_COLORS.Virtual });
  else if (event.mode === "HYBRID") tags.push({ label: "Hybrid",  color: TAG_COLORS.Hybrid  });

  if (event.hasGame)    tags.push({ label: "Games",   color: TAG_COLORS.Games   });
  if (event.hasVibeTag) tags.push({ label: "VibeTag", color: TAG_COLORS.VibeTag });

  // Append any server-side tags that aren't already represented
  (event.tags ?? []).forEach((t) => {
    if (!tags.find((x) => x.label === t.name)) {
      tags.push({ label: t.name, color: TAG_COLORS[t.name] ?? "#6b7280" });
    }
  });

  return {
    id:        event.id,
    title:     event.name,
    date:      event.startsAt
                 ? new Date(event.startsAt).toLocaleDateString("en-US", {
                     month: "short", day: "numeric", year: "numeric",
                   })
                 : "",
    startsAt:  event.startsAt,
    memories:  event.postcardCount ?? 0,
    location:  event.locationName ?? "",
    flierUrl:  event.flierUrl ?? null,
    isPublic:  event.isPublic,
    eventMode: (event.mode as "ONSITE" | "VIRTUAL" | "HYBRID") ?? "ONSITE",
    hasGames:  !!event.hasGame,
    hasVibeTag: !!event.hasVibeTag,
    tags,
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
