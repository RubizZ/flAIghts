import { singleton } from "tsyringe";
import { Message, type IMessage } from "./models/message.model.js";
import { MessageValidationError } from "./message.errors.js";
import type { ConversationResponse, MessageResponse } from "./message.types.js";
import type { HydratedDocument } from "mongoose";
import type { PipelineStage } from "mongoose";

@singleton()
export class MessageService {
    public static getConversationId(userId: string, otherUserId: string): string {
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

    public async markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
        const conversationId = MessageService.getConversationId(userId, otherUserId);
        await Message.updateMany(
            { conversationId, receiver: userId, read: false },
            { $set: { read: true } }
        );
    }

    public async getUserConversations(userId: string, page: number = 1, limit: number = 50): Promise<{ items: HydratedDocument<ConversationResponse>[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;

        // Obtain unique conversations sorted by most recent
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }]
                }
            },
            {
                $sort: { created_at: -1 } as const
            },
            {
                $group: {
                    _id: "$conversationId",
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$receiver", userId] }, { $eq: ["$read", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { "lastMessage.created_at": -1 } as const
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: "users",
                                let: {
                                    sender: "$lastMessage.sender",
                                    receiver: "$lastMessage.receiver"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$_id", { $cond: [{ $eq: ["$$sender", userId] }, "$$receiver", "$$sender"] }] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 1,
                                            username: 1,
                                            profile_picture: 1
                                        }
                                    }
                                ],
                                as: "otherUser"
                            }
                        },
                        {
                            $unwind: "$otherUser"
                        }
                    ]
                }
            }
        ];

        const [result] = await Message.aggregate(pipeline);

        const total = result.metadata[0]?.total || 0;
        const items = result.data.map((item: any) => ({
            conversationId: item._id,
            otherUser: item.otherUser,
            lastMessage: this.formatMessageResponse(item.lastMessage),
            unreadCount: item.unreadCount
        }));

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    public formatMessageResponse(message: HydratedDocument<IMessage> | IMessage): MessageResponse {
        const messageObj = (typeof (message as any).toObject === 'function')
            ? (message as HydratedDocument<IMessage>).toObject()
            : message;

        const { _id, sender, receiver, created_at, ...rest } = messageObj;

        return {
            ...rest,
            _id: _id.toString(),
            sender: sender.toString(),
            receiver: receiver.toString(),
            created_at: new Date(created_at).toISOString(),
        };
    }

    public formatPaginatedResponse(paginatedResult: { items: HydratedDocument<IMessage>[], total: number, page: number, totalPages: number }) {
        return {
            ...paginatedResult,
            items: paginatedResult.items.map(this.formatMessageResponse)
        };
    }
}
