import type { QueryFilter } from "mongoose";
import { Audit, type IAudit } from "./audit.model.js";
import type { AuditDetails, AuditEntry, AuditUser } from "./audit.types.js";
import { singleton } from "tsyringe";
import { contextStorage } from "../../utils/context.js";

@singleton()
export class AuditService {
    /**
     * Registers a new audit entry.
     * Automatically captures timestamp and request context (IP, User Agent) if available.
     */
    async register<R extends keyof AuditDetails, A extends keyof AuditDetails[R]>(
        entry: Omit<AuditEntry<R, A>, 'timestamp' | 'user'> & { user?: Partial<AuditUser> }
    ) {
        const context = contextStorage.getStore();

        const audit = new Audit({
            ...entry,
            timestamp: new Date(),
            user: {
                id: entry.user?.id || context?.userId || null,
                ip: entry.user?.ip || context?.ip || "unknown",
                userAgent: entry.user?.userAgent || context?.userAgent || "unknown"
            }
        });

        await audit.save();
    }

    /**
     * Gets audits based on filters sort and pagination
     */
    async getAll(options: {
        filters: {
            resource?: keyof AuditDetails;
            action?: keyof AuditDetails[keyof AuditDetails];
            user?: { id?: string; ip?: string; userAgent?: string };
        },
        pagination: {
            page: number;
            limit: number;
        },
        sort: {
            field: keyof IAudit;
            order: "asc" | "desc";
        }
    } = {
            filters: {},
            pagination: { page: 1, limit: 10 },
            sort: { field: "timestamp", order: "desc" }
        }
    ): Promise<{
        audits: IAudit[];
        page: number;
        total: number;
        totalPages: number;
    }> {
        const { filters, pagination, sort } = options;
        const query: QueryFilter<IAudit> = { resource: filters.resource, action: filters.action };

        if (filters.user) {
            // Use dot-notation to filter specific fields of the nested "user" object
            if (filters.user.id) query["user.id"] = filters.user.id;
            if (filters.user.ip) query["user.ip"] = filters.user.ip;
            if (filters.user.userAgent) query["user.userAgent"] = filters.user.userAgent;
        }

        const audits = await Audit.find(query).sort({ [sort.field]: sort.order }).skip((pagination.page - 1) * pagination.limit).limit(pagination.limit);
        const total = await Audit.countDocuments(query);
        return { audits, page: pagination.page, total, totalPages: Math.ceil(total / pagination.limit) };
    }
}