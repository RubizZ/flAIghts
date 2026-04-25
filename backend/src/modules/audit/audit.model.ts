import { model, Schema } from "mongoose";
import idValidator from "@/utils/mongoose-id-validator.js";

export interface IAudit {
    timestamp: Date;
    user: {
        id: string | null;
        username: string | null;
        ip: string;
        userAgent: string;
    };
    resource: string;
    action: string;
    details: any;
}

const AuditSchema = new Schema<IAudit>({
    timestamp: { type: Date, default: Date.now },
    user: {
        id: { type: String, default: null, ref: "User" },
        username: { type: String, default: null },
        ip: String,
        userAgent: String
    },
    resource: String,
    action: String,
    details: Object
})

AuditSchema.plugin(idValidator)

export const Audit = model<IAudit>("Audit", AuditSchema);