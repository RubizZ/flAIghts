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
