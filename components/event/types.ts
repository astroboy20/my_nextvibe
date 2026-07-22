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

export interface EventDetail {
  id: string;
  name: string;
  description?: string | null;
  flierUrl?: string | null;
  promoVideoUrl?: string | null;
  startsAt: string;
  status: string;
  mode: 'ONSITE' | 'VIRTUAL' | 'HYBRID';
  locationName?: string | null;
  virtualLink?: string | null;
  isPublic: boolean;
  hasGame?: boolean;
  hasVibeTag?: boolean;
  attendeeCount?: number;
  isRsvped?: boolean;
  rsvpStatus?: string | null;
  organizer?: EventOrganizer;
  tags?: string[];
}
