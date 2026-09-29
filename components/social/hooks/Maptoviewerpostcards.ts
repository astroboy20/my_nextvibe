import { type PostcardItem } from "@/components/social/PostcardCard";

export function mapToViewerPostcards(items: PostcardItem[]) {
  return items.map((item) => ({
    id: item.id,
    caption: item.caption,
    likeCount: item.likeCount,
    isLiked: item.isLiked,
    commentCount: item.commentsCount,
    viewCount: 0,
    createdAt: item.createdAt,
    author: item.author
      ? {
          id: item.author.id,
          username: item.author.username,
          displayName: item.author.displayName,
          avatarUrl: item.author.avatarUrl,
        }
      : undefined,
    media: (item.media ?? []).map((m) => ({
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
    })),
  }));
}