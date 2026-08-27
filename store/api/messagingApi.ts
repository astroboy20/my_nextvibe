import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface Participant {
  username: string;
  avatarUrl: string;
}

export interface LastMessage {
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant: Participant;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
}

export interface MessagesResponse {
  success: boolean;
  data: {data: Message[]};
}

export interface StartConversationResponse {
  success: boolean;
  data: Conversation;
}

export const messagingApi = createApi({
  reducerPath: "messagingApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Conversations", "Messages"],
  keepUnusedDataFor: 60, // messages are real-time sensitive, 1 minute cache
  endpoints: (build) => ({
    getConversations: build.query<ConversationsResponse, void>({
      query: () => ({ url: "/v1/conversations", method: "GET" }),
      providesTags: ["Conversations"],
    }),

    startConversation: build.mutation<StartConversationResponse, { userId: string }>({
      query: (body) => ({
        url: "/v1/conversations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Conversations"],
    }),

    getMessages: build.query<MessagesResponse, { conversationId: string; page?: number; limit?: number }>({
      query: ({ conversationId, page = 1, limit = 50 }) => ({
        url: `/v1/conversations/${conversationId}/messages`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _err, { conversationId }) => [
        { type: "Messages", id: conversationId },
      ],
    }),

    /** GET /v1/events/{eventId}/chat/{section} — load message history */
    getEventChat: build.query<any, { eventId: string; section: "pre-event" | "during" | "post-event" }>({
      query: ({ eventId, section }) => ({
        url: `/v1/events/${eventId}/chat/${section}`,
        method: "GET",
      }),
      providesTags: (_result, _err, { eventId, section }) => [
        { type: "Messages", id: `${eventId}-${section}` },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useStartConversationMutation,
  useGetMessagesQuery,
  useGetEventChatQuery,
} = messagingApi;
