import { singleton } from "tsyringe";
import { Message, type IMessage } from "./models/message.model.js";
import { MessageValidationError } from "./message.errors.js";
import type { MessageResponse } from "./message.types.js";
import type { HydratedDocument } from "mongoose";

@singleton()
export class MessageService {
    public static getConversationId(userId: string, otherUserId: string): string  {
        return [userId, otherUserId].sort().join('--');
    }

    public async createMessage(senderId: string, receiverId: string, content: string): Promise<HydratedDocument<IMessage>> {
        const missingFields: string[] = [];

        if (!senderId) missingFields.push('senderId');
        if (!receiverId) missingFields.push('receiverId');
        if (!content) missingFields.push('content');

        if (missingFields.length > 0) {
            throw new MessageValidationError(missingFields);
        }

        const conversationId = MessageService.getConversationId(senderId, receiverId);

        const message = await Message.create({
            conversationId, 
            sender: senderId,
            receiver: receiverId,
            content
        });

        return message;
    }

    public async getConversationHistory(userId: string, otherUserId: string, page: number = 1, limit: number = 50): Promise<{ items: HydratedDocument<IMessage>[], total: number, page: number, totalPages: number }> {
        const conversationId = MessageService.getConversationId(userId, otherUserId);
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversationId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ conversationId })
        ]);

        return {
            items: messages.reverse(),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    public formatMessageResponse(message: HydratedDocument<IMessage>): MessageResponse {
        const { _id, sender, receiver, created_at, ...rest } = message.toObject();

        return {
            ...rest,
            _id: _id.toString(),
            sender: sender.toString(),
            receiver: receiver.toString(),
            created_at: created_at.toISOString(),
        };
    }

    public formatPaginatedResponse(paginatedResult: { items: HydratedDocument<IMessage>[], total: number, page: number, totalPages: number }) {
        return {
            ...paginatedResult,
            items: paginatedResult.items.map(this.formatMessageResponse)
        };
    }
}
