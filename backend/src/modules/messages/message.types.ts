import type { IMessage } from "./models/message.model.js";

export type MessageResponse = Omit<IMessage, 'created_at'> & {
    created_at: string;
};

export interface PaginatedMessagesResponse {
    items: MessageResponse[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ConversationUser {
    _id: string;
    username: string;
    profile_picture?: string;
}

export interface ConversationResponse {
    conversationId: string;
    otherUser: ConversationUser;
    lastMessage: MessageResponse;
    unreadCount: number;
}

export interface PaginatedConversationsResponse {
    items: ConversationResponse[];
    total: number;
    page: number;
    totalPages: number;
}
