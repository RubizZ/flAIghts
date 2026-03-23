import { model, Schema } from "mongoose";
import type { AuditDetails, AuditEntry } from "./audit.types.js";
import idValidator from "@/utils/mongoose-id-validator.js";

export interface IAudit extends AuditEntry<keyof AuditDetails, keyof AuditDetails[keyof AuditDetails]> { }

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