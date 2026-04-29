import { model, Schema } from "mongoose";
import idValidator from "@/utils/mongoose-id-validator.js";

export interface IExecutionError {
    timestamp: Date;
    errorName: string;
    errorMessage: string;
    stack?: string;
    componentStack?: string;
    url: string;
    userAgent: string;
    user?: {
        id: string | null;
        username: string | null;
    };
}

const ExecutionErrorSchema = new Schema<IExecutionError>({
    timestamp: { type: Date, default: Date.now },
    errorName: { type: String, required: true },
    errorMessage: { type: String, required: true },
    stack: { type: String },
    componentStack: { type: String },
    url: { type: String, required: true },
    userAgent: { type: String, required: true },
    user: {
        id: { type: String, default: null, ref: "User" },
        username: { type: String, default: null }
    }
});

ExecutionErrorSchema.plugin(idValidator);

export const ExecutionError = model<IExecutionError>("ExecutionError", ExecutionErrorSchema);
