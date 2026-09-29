import { type PostcardItem } from "@/components/social/PostcardCard";

/**
 * Normalizes a raw feed API item into the shape PostcardCard expects.
 *
 * The feed API uses `likesCount` + `user` + `gallery_items`;
 * PostcardCard expects `likeCount` + `author` + `media`.
 */
export function normalizeFeedItem(raw: any): PostcardItem {
    return {
        ...raw,
        id: raw.id ?? raw._id ?? raw.post_id,
        likeCount: raw.likeCount ?? raw.likesCount ?? 0,
        commentsCount: raw.commentsCount ?? 0,
        isLiked: raw.isLiked ?? false,
        author: normalizeAuthor(raw.author ?? raw.user),
        media: (raw.media ?? raw.gallery_items ?? []).map((m: any) => ({
            mediaUrl: m.mediaUrl ?? m.url,
            mediaType:
                (m.mediaType ?? m.type ?? "PHOTO").toUpperCase() === "VIDEO"
                    ? "VIDEO"
                    : "PHOTO",
        })),
        event:
            raw.event ?? (raw.event_id || raw.eventId)
                ? {
                    id: raw.event?.id ?? raw.event_id ?? raw.eventId,
                    name: raw.event?.name ?? "",
                }
                : null,
    };
}

function normalizeAuthor(u: any) {
    if (!u) return null;
    return {
        id: u.id,
        username: u.username,
        displayName: u.displayName ?? u.name,
        avatarUrl: u.avatarUrl ?? u.avatar ?? null,
    };
}