export interface EventOrganizer {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isFollowing?: boolean;
}

export interface EventAttendee {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  rsvpStatus?: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED' | string;
}

export interface EventPostcard {
  id: string;
  caption?: string | null;
  likeCount?: number;
  commentCount?: number;
  author?: { username?: string; displayName?: string; avatarUrl?: string | null };
  media?: Array<{ mediaUrl?: string | null; mediaType?: 'PHOTO' | 'VIDEO' | null }>;
}

export interface EventVibeTag {
  id: string;
  name: string;
  imageUrl: string;
  activityTiming?: 'PRE_EVENT' | 'DURING_EVENT' | 'POST_EVENT' | 'BOTH' | string;
}

export interface EventDetail {
  id: string;
  name: string;
  description?: string | null;
  flierUrl?: string | null;
  promoVideoUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  mode: 'ONSITE' | 'VIRTUAL' | 'HYBRID';
  locationName?: string | null;
  virtualLink?: string | null;
  isPublic: boolean;
  capacity?: number | null;
  hasGame?: boolean;
  hasVibeTag?: boolean;
  attendeeCount?: number;
  attendingCount?: number;
  maybeCount?: number;
  cantGoCount?: number;
  isRsvped?: boolean;
  rsvpStatus?: string | null;
  organizer?: EventOrganizer;
  tags?: Array<{ id: string; name: string; imageUrl?: string | null }>;
  /** VibeTags attached to this event — present when hasVibeTag is true */
  vibeTag?: EventVibeTag[] | null;
  qrCode?: string;
  _count?: { attendees?: number; postcards?: number };
}
