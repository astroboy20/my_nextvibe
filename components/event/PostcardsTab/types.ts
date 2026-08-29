export interface VibeTag {
  id: string;
  name: string;
  imageUrl: string;
  activityTiming?: string;
}

export interface PostcardMediaItem {
  id?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  vibeTagOverlayUrl?: string | null;
}

export interface PostcardData {
  id?: string;
  caption?: string | null;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  eventId?: string;
  vibeTagId?: string | null;
  createdAt?: string;
  author?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
  event?: {
    id?: string;
    name?: string;
    locationName?: string | null;
  };
  media?: PostcardMediaItem[];
}

export type ActivityTiming = 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT';
export type PostcardPhase = 'all' | 'pre-event' | 'main-event' | 'post-event';

export const TIMING_META: Record<ActivityTiming, { label: string; phase: string }> = {
  PRE_EVENT:    { label: 'Pre-Event',  phase: 'pre-event'  },
  DURING_EVENT: { label: 'Main Event', phase: 'main-event' },
  POST_EVENT:   { label: 'Post-Event', phase: 'post-event' },
};

export const TIMING_PILL: Record<string, { label: string; color: string }> = {
  PRE_EVENT:    { label: 'Pre',  color: '#F59E0B' },
  DURING_EVENT: { label: 'Main', color: '#5B1A57' },
  POST_EVENT:   { label: 'Post', color: '#10B981' },
  BOTH:         { label: 'All',  color: '#8B5CF6' },
};
