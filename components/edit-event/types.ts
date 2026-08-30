// Shared types for the edit-event feature

export interface EventDraft {
  id: string;
  name: string;
  description: string;
  mode: 'ONSITE' | 'VIRTUAL' | 'HYBRID';
  locationName: string;
  virtualLink: string;
  capacity: string;
  startsAt: string;   // "YYYY-MM-DD HH:MM"
  endsAt: string;     // "YYYY-MM-DD HH:MM"
  flierUrl: string | null;
  promoVideoUrl: string | null;
  status: string;
  /** Whether the event is publicly discoverable (true) or invite-only/private (false) */
  isPublic?: boolean;
}

export interface MediaState {
  status: 'idle' | 'picked' | 'uploading' | 'done' | 'error';
  uri: string | null;
  fileName: string | null;
  remoteUrl: string | null;
}

export const IDLE_MEDIA: MediaState = {
  status: 'idle',
  uri: null,
  fileName: null,
  remoteUrl: null,
};

// Convert ISO string -> "YYYY-MM-DD HH:MM" for display in text inputs
export function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Returns true when the event start time has already passed
export function isEventStarted(startsAt?: string | null): boolean {
  if (!startsAt) return false;
  return new Date(startsAt).getTime() <= Date.now();
}
