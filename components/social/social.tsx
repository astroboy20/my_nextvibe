/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  MessageCircle,
  Share2,
  Search,
  Users,
  Calendar,
  UserPlus,
  Check,
  GalleryHorizontal,
  ChevronDown,
  ChevronUp,
  Loader2,
  ImageOff,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  useGetFollowingFeedQuery,
  useToggleFollowMutation,
  useGetMyFollowersQuery,
  useGetMyFollowingQuery,
  useGetMutualsQuery,
  useRecordShareMutation,
  type PostcardItem,
  type SocialUser,
} from "@/app/provider/api/socialApi";
import { useStartConversationMutation } from "@/app/provider/api/messagingApi";
import { toast } from "sonner";
import {
  useCommentOnPostcardMutation,
  useGetPostcardCommentsQuery,
  useToggleLikePostcardMutation,
} from "@/app/provider/api/eventApi";
import {
  PostcardViewer,
  type PostcardData,
} from "@/components/postcard-viewer";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// ── Map feed item → PostcardData for the viewer ───────────────────────────────
function toPostcardData(p: PostcardItem): PostcardData {
  const user = p.user ?? p.author;
  const mediaItems = (p.media ?? p.gallery_items ?? []).map((m) => ({
    id: m._id ?? undefined,
    mediaUrl: m.mediaUrl ?? m.url ?? null,
    mediaType: m.type === "video" || m.type === "VIDEO" ? "VIDEO" : "PHOTO",
  }));
  return {
    id: p.id ?? p._id ?? p.post_id ?? "",
    caption: p.caption ?? null,
    likeCount: p.likeCount ?? p.likesCount ?? 0,
    commentCount: p.commentsCount ?? 0,
    eventId: p.eventId ?? p.event_id ?? p.event?.id ?? "",
    createdAt: p.createdAt,
    author: {
      displayName: user?.name ?? user?.username ?? undefined,
      username: user?.username ?? undefined,
      avatarUrl: user?.avatarUrl ?? user?.avatar ?? null,
    },
    event: p.event ? { id: p.event.id, name: p.event.name } : undefined,
    media: mediaItems,
  };
}

// ── Comments panel ────────────────────────────────────────────────────────────
function CommentsPanel({ postcardId }: { postcardId: string }) {
  const [content, setContent] = useState("");
  const { data, isLoading, refetch } = useGetPostcardCommentsQuery(postcardId, {
    skip: !postcardId,
  });
  const [commentOnPostcard, { isLoading: sending }] = useCommentOnPostcardMutation();

  const comments: any[] = data?.data ?? (Array.isArray(data) ? data : []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setContent("");
    try {
      await commentOnPostcard({ postcardId, content: trimmed }).unwrap();
      refetch();
    } catch {
      setContent(trimmed);
      toast.error("Failed to post comment.");
    }
  };

  if (isLoading) {
    return (
      <div className="border-t px-4 py-3 space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t px-4 py-3 space-y-3">
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => {
            const name = c.author?.displayName ?? c.author?.username ?? "User";
            return (
              <div key={c.id} className="flex gap-2">
                {c.author?.avatarUrl ? (
                  <img src={c.author.avatarUrl} alt={name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold">{name}</span>
                  <p className="text-xs text-foreground mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2 pt-1 border-t border-border">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Add a comment…"
          className="h-8 rounded-full text-xs"
        />
        <Button size="sm" className="h-8 rounded-full px-3" onClick={handleSubmit} disabled={sending || !content.trim()}>
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  );
}

// ── Postcard card ─────────────────────────────────────────────────────────────
function PostcardCard({
  postcard,
  onOpenViewer,
}: {
  postcard: PostcardItem;
  onOpenViewer: (p: PostcardItem) => void;
}) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(postcard.isLiked ?? false);
  const [optimisticCount, setOptimisticCount] = useState(postcard.likeCount ?? postcard.likesCount ?? 0);

  const [toggleLikePostcard] = useToggleLikePostcardMutation();
  const [recordShare] = useRecordShareMutation();

  const postcardId = postcard.id ?? postcard._id ?? postcard.post_id ?? "";
  const user = postcard.user ?? postcard.author;
  const mediaItems = postcard.media ?? postcard.gallery_items ?? [];
  const primaryMedia = mediaItems.find((m) => !!(m.mediaUrl ?? m.url));
  const mediaUrl = primaryMedia?.mediaUrl ?? primaryMedia?.url ?? "";
  const isVideo =
    primaryMedia?.type === "video" ||
    primaryMedia?.type === "VIDEO" ||
    mediaUrl.includes(".webm") ||
    mediaUrl.includes(".mp4");
  const hasMultiple = mediaItems.filter((m) => !!(m.mediaUrl ?? m.url)).length > 1;
  const eventName = postcard.event?.name ?? "";
  const vibeTagName = postcard.vibeTag?.name ?? "";
  const username = user?.username ?? user?.name ?? "";

  // Use live comment count from the query so it reflects real-time state.
  // Skip the query when comments are not expanded — lazy load.
  const { data: commentsData } = useGetPostcardCommentsQuery(postcardId, {
    skip: !postcardId,
  });
  const liveComments: any[] = commentsData?.data ?? (Array.isArray(commentsData) ? commentsData : []);
  // Prefer live count once loaded; fall back to stale feed count while loading
  const commentCount = liveComments.length > 0
    ? liveComments.length
    : (postcard.commentsCount ?? 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = optimisticLiked;
    const prevCount = optimisticCount;
    setOptimisticLiked(!prev);
    setOptimisticCount((c) => (prev ? c - 1 : c + 1));
    try {
      const res = await toggleLikePostcard({
        eventId: postcard.event?.id ?? postcard.eventId ?? postcard.event_id ?? "",
        postcardId,
      }).unwrap();
      if (res?.liked !== undefined) setOptimisticLiked(res.liked);
      if (res?.currentLikes !== undefined) setOptimisticCount(res.currentLikes);
    } catch {
      setOptimisticLiked(prev);
      setOptimisticCount(prevCount);
      toast.error("Could not update like.");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareLink = `${window.location.origin}/postcard/${postcardId}`;
    await recordShare({ targetType: "postcard", targetId: postcardId, platform: "copy" }).catch(() => {});

    if (navigator.share && mediaUrl && !isVideo) {
      try {
        const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(mediaUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "postcard.jpg", { type: blob.type || "image/jpeg" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Check out this postcard on NextVibe",
              text: postcard.caption ?? "Check out this postcard on NextVibe",
              url: shareLink,
            });
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        // fall through to URL-only share
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Check out this postcard on NextVibe", url: shareLink });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    navigator.clipboard?.writeText(shareLink);
    toast.success("Link copied to clipboard");
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-3 pb-2">
        <Avatar className="h-9 w-9 cursor-pointer shrink-0" onClick={() => user?.id && router.push(`/users/${user.id}`)}>
          <AvatarImage src={user?.avatarUrl ?? user?.avatar} />
          <AvatarFallback>{(user?.username ?? user?.name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user?.name ?? user?.username ?? "User"}</p>
          {username && <p className="text-xs text-muted-foreground">@{username.replace(/^@/, "")}</p>}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatTime(postcard.createdAt)}</span>
      </div>

      <div className="relative cursor-pointer" onClick={() => onOpenViewer(postcard)}>
        {mediaUrl ? (
          isVideo ? (
            <div className="relative aspect-square bg-black">
              <video src={mediaUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-square">
              <img src={mediaUrl} alt={postcard.caption ?? "postcard"} className="w-full h-full object-cover" />
            </div>
          )
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center">
            <ImageOff className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {vibeTagName && (
          <div className="absolute top-2 left-2 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
            #{vibeTagName}
          </div>
        )}
        {hasMultiple && (
          <div className="absolute top-2 right-2">
            <svg className="h-4 w-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H7a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2zM5 7H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2H5V7z" />
            </svg>
          </div>
        )}
      </div>

      <CardContent className="p-3 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition-transform active:scale-90">
            <Heart className={cn("h-5 w-5 transition-all duration-150", optimisticLiked ? "fill-[#5B1A57] text-[#5B1A57] scale-110" : "text-foreground")} />
            <span className="font-medium text-foreground">{optimisticCount}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); }} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span>{commentCount}</span>
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button onClick={handleShare} className="ml-auto text-muted-foreground">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        {postcard.caption && (
          <p className="text-sm mb-1.5">
            <span className="font-semibold">@{username.replace(/^@/, "")}</span>{" "}{postcard.caption}
          </p>
        )}
        {eventName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{eventName}</span>
          </div>
        )}
      </CardContent>

      {showComments && <CommentsPanel postcardId={postcardId} />}
    </Card>
  );
}

// ── People list ───────────────────────────────────────────────────────────────
function PeopleList({
  users,
  isLoading,
  emptyText,
  defaultFollowing = false,
}: {
  users: SocialUser[];
  isLoading: boolean;
  emptyText: string;
  defaultFollowing?: boolean;
}) {
  const router = useRouter();
  const [toggleFollow] = useToggleFollowMutation();
  const [startConversation] = useStartConversationMutation();
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const handleToggle = async (user: SocialUser) => {
    const current = followingState[user.id] ?? user.isFollowing ?? defaultFollowing;
    setFollowingState((s) => ({ ...s, [user.id]: !current }));
    try {
      await toggleFollow({ userId: user.id, isFollowing: !!current }).unwrap();
    } catch {
      setFollowingState((s) => ({ ...s, [user.id]: current }));
    }
  };

  const handleChat = async (userId: string) => {
    setStartingChat(userId);
    try {
      const res = await startConversation({ userId }).unwrap();
      const conversationId = res?.data?.id;
      router.push(conversationId ? `/messages?conversation=${conversationId}` : `/messages?chat=${userId}`);
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? err?.data?.message ?? "You can only message mutual followers.");
    } finally {
      setStartingChat(null);
    }
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  if (!users.length)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {users.map((person) => {
        const isFollowing = followingState[person.id] ?? person.isFollowing ?? defaultFollowing;
        const name = person.displayName ?? person.username ?? "User";
        return (
          <Card key={person.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 cursor-pointer shrink-0" onClick={() => router.push(`/users/${person.id}`)}>
                  <AvatarImage src={person.avatarUrl} />
                  <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  {person.username && <p className="text-xs text-muted-foreground">@{person.username.replace(/^@/, "")}</p>}
                  {person.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{person.bio}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    className={cn("gap-1 rounded-full", !isFollowing && "bg-[#531342] hover:bg-[#531342]/90 text-white")}
                    onClick={() => handleToggle(person)}
                  >
                    {isFollowing ? <><Check className="h-3 w-3" /> Following</> : <><UserPlus className="h-3 w-3" /> Follow</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={startingChat === person.id} onClick={() => handleChat(person.id)}>
                    {startingChat === person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const Social = () => {
  const [activeTab, setActiveTab] = useState("feed");
  const [peopleTab, setPeopleTab] = useState<"following" | "followers" | "mutuals">("following");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerPostcard, setViewerPostcard] = useState<PostcardItem | null>(null);

  const { data: feedData, isLoading: feedLoading, isError: feedError, refetch: refetchFeed } = useGetFollowingFeedQuery();
  const { data: followingData, isLoading: followingLoading } = useGetMyFollowingQuery(undefined, { skip: activeTab !== "people" });
  const { data: followersData, isLoading: followersLoading } = useGetMyFollowersQuery(undefined, { skip: activeTab !== "people" });
  const { data: mutualsData, isLoading: mutualsLoading } = useGetMutualsQuery(undefined, { skip: activeTab !== "people" });

  const postcards = feedData?.data?.data ?? [];

  const filterUsers = (users: SocialUser[]) => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => (u.displayName ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q));
  };

  const followingList: SocialUser[] = followingData?.data?.data ?? [];
  const followersList: SocialUser[] = followersData?.data?.data ?? [];
  const followingIds = new Set(followingList.map((u) => u.id));
  const followerIds = new Set(followersList.map((u) => u.id));

  const enrichedFollowing = followingList.map((u) => ({ ...u, isFollowing: true }));
  const enrichedFollowers = followersList.map((u) => ({ ...u, isFollowing: followingIds.has(u.id) }));
  const apiMutuals: SocialUser[] = mutualsData?.data?.data ?? [];
  const derivedMutuals = followingList.filter((u) => followerIds.has(u.id)).map((u) => ({ ...u, isFollowing: true }));
  const mutualUsers = apiMutuals.length > 0 ? apiMutuals : derivedMutuals;

  const peopleMap = {
    following: { users: filterUsers(enrichedFollowing), isLoading: followingLoading, emptyText: "You're not following anyone yet.", defaultFollowing: true },
    followers: { users: filterUsers(enrichedFollowers), isLoading: followersLoading, emptyText: "No followers yet.", defaultFollowing: false },
    mutuals: { users: filterUsers(mutualUsers), isLoading: mutualsLoading, emptyText: "No mutuals yet.", defaultFollowing: true },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container px-4 py-4">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Social</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 h-10">
              <TabsTrigger value="feed" className="gap-2"><GalleryHorizontal className="h-4 w-4" /> Feed</TabsTrigger>
              <TabsTrigger value="people" className="gap-2"><Users className="h-4 w-4" /> People</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container px-4 py-4">
        {activeTab === "feed" && (
          <>
            {feedLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {feedError && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground mb-4">Failed to load feed.</p>
                <Button variant="outline" onClick={() => refetchFeed()}>Retry</Button>
              </div>
            )}
            {!feedLoading && !feedError && postcards.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GalleryHorizontal className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Nothing in your feed yet</h3>
                <p className="text-sm text-muted-foreground">Follow people to see their postcards here.</p>
              </div>
            )}
            {!feedLoading && !feedError && postcards.length > 0 && (
              <div className="space-y-4">
                {postcards.map((p) => (
                  <PostcardCard key={p.id ?? p._id ?? p.post_id} postcard={p} onOpenViewer={setViewerPostcard} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "people" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search people…" className="pl-10 rounded-full" />
            </div>
            <Tabs value={peopleTab} onValueChange={(v) => setPeopleTab(v as typeof peopleTab)}>
              <TabsList className="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="following" className="text-xs">Following</TabsTrigger>
                <TabsTrigger value="followers" className="text-xs">Followers</TabsTrigger>
                <TabsTrigger value="mutuals" className="text-xs">Mutuals</TabsTrigger>
              </TabsList>
            </Tabs>
            <PeopleList key={peopleTab} {...peopleMap[peopleTab]} />
          </div>
        )}
      </div>

      {viewerPostcard && (
        <PostcardViewer
          postcard={toPostcardData(viewerPostcard)}
          eventId={viewerPostcard.event?.id ?? viewerPostcard.eventId ?? viewerPostcard.event_id ?? ""}
          eventName={viewerPostcard.event?.name ?? ""}
          onClose={() => setViewerPostcard(null)}
          zIndex={60}
          postcardList={postcards.map(toPostcardData)}
          initialPostcardIndex={postcards.findIndex(
            (p) => (p.id ?? p._id ?? p.post_id) === (viewerPostcard.id ?? viewerPostcard._id ?? viewerPostcard.post_id)
          )}
          onNavigatePostcard={(idx) => setViewerPostcard(postcards[idx])}
        />
      )}
    </div>
  );
};

export default Social;
