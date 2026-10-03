export interface ChatMessage {
  id: string;
  body?: string;
  content?: string;
  text?: string;
  senderId?: string;
  isOrganizer?: boolean;
  createdAt?: string;
  status?: "sending" | "sent" | "failed";
  sender?: {
    id?: string;
    displayName?: string | any;
    username?: string;
    avatarUrl?: string | null;
    role?: string;
  };
}

export function msgText(m: ChatMessage): string {
  return m.body ?? m.content ?? m.text ?? "";
}
