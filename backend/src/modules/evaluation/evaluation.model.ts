import { Schema, model } from "mongoose";
import { randomUUID } from "node:crypto";
import type { SurveyResult } from "./evaluation.types.js";
import idValidator from "@/utils/mongoose-id-validator.js";
import "@/modules/users/models/user.model.js"; // Necesario para mongoose.model("User") en idValidator

export interface IEvaluationDocument {
    _id: string;
    results: SurveyResult[];
    susResults?: number[];
    timestamp: Date;
    userId?: string;
    fullName?: string;
    age?: number;
    gender?: string;
    educationLevel?: string;
    screenInfo?: {
        width: number;
        height: number;
        innerWidth: number;
        innerHeight: number;
        devicePixelRatio: number;
    };
    userAgent: string;
    receivedAt: Date;
}

const EvaluationSchema = new Schema<IEvaluationDocument>({
    _id: { type: String, default: () => randomUUID() },
    results: [{
        missionId: { type: String, required: true },
        completedBy: { type: String, ref: "User" },
        completedAt: { type: Date, required: true },
        steps: [{
            id: { type: String, required: true },
            title: { type: String, required: true },
            completedAt: { type: Date, required: true },
        }],
        answer: {
            rating: { type: Number, required: true },
            comment: { type: String }
        }
    }],
    susResults: [{ type: Number }],
    timestamp: { type: Date, required: true },
    userId: { type: String, ref: "User" },
    fullName: { type: String },
    age: { type: Number },
    gender: { type: String },
    educationLevel: { type: String },
    screenInfo: {
        width: { type: Number },
        height: { type: Number },
        innerWidth: { type: Number },
        innerHeight: { type: Number },
        devicePixelRatio: { type: Number }
    },
    userAgent: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now }
});

EvaluationSchema.plugin(idValidator);

export const Evaluation = model<IEvaluationDocument>("Evaluation", EvaluationSchema);
