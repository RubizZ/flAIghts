import { Schema, model } from "mongoose";
import { randomUUID } from "node:crypto";

export interface IMessage {
    _id: string;
    conversationId: string; // ID único para cada conversación entre dos usuarios
    sender: string;
    receiver: string; 
    content: string;
    read: boolean;
    created_at: Date;
}

const MessageSchema = new Schema<IMessage>({
    _id: { type: String, default: () => randomUUID() },
    conversationId: { type: String, required: true, index: true },
    sender: { type: String, ref: 'User', required: true },
    receiver: { type: String, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, minLength: 1, maxLength: 2000 },
    read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now}
});

MessageSchema.index({ conversationId: 1, created_at: -1 });

export const Message = model<IMessage>("Message", MessageSchema);
