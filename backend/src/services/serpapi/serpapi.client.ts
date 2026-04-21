import { inject, injectable } from "tsyringe";
import type { ApiRequestParameters, SerpApiResponse } from "./serpapi.types.js";
import mongoose, { Schema } from "mongoose";
import { ServerConfig } from "../../config/server.config.js";
import logger from "../../utils/logger.js";

import { SerpapiQuotaExceededError } from "./serpapi.errors.js";
import { User } from "../../modules/users/models/user.model.js";
import { contextStorage } from "../../utils/context.js";

const serpApiQuotaSchema = new Schema({
    identifier: { type: String, required: true }, // userId, IP o 'global'
    period: { type: String, enum: ['hour', 'day'], required: true },
    key: { type: String, required: true },
    count: { type: Number, default: 0 }
});

serpApiQuotaSchema.index({ identifier: 1, period: 1, key: 1 }, { unique: true });

export const SerpApiQuota = mongoose.model("SerpApiQuota", serpApiQuotaSchema);

@injectable()
export class SerpApiClient {

    private baseUrl = "https://serpapi.com";

    constructor(@inject(ServerConfig) private config: ServerConfig) { }

    private globalDailyLimit = 1000;
    private userHourlyLimit = 100;

    public async search(
        parameters: ApiRequestParameters,
        explicitUserId?: string
    ): Promise<SerpApiResponse> {
        const store = contextStorage.getStore();
        const userId = explicitUserId || store?.userId;
        const ip = store?.ip || "unknown";

        let isAdmin = false;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const user = await User.findById(userId).select('role').lean();
            if (user && user.role === 'admin') {
                isAdmin = true;
            }
        }

        if (!isAdmin) {
            const now = new Date();
            const dateKey = now.toISOString().slice(0, 10);
            const hourKey = `${dateKey}-${now.getHours()}`;

            // Check and increment Global Daily Quota
            const globalQuota = await SerpApiQuota.findOneAndUpdate(
                { identifier: 'global', period: 'day', key: dateKey },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );

            if (globalQuota && globalQuota.count > this.globalDailyLimit) {
                throw new SerpapiQuotaExceededError("Límite diario global de SerpApi alcanzado.");
            }

            // Check and increment User Hourly Quota
            const userIdentifier = userId || ip;
            const userQuota = await SerpApiQuota.findOneAndUpdate(
                { identifier: userIdentifier, period: 'hour', key: hourKey },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );

            if (userQuota && userQuota.count > this.userHourlyLimit) {
                throw new SerpapiQuotaExceededError(`Has excedido tu límite de 100 créditos de SerpApi por hora.`);
            }
        }

        const cleanParameters = Object.fromEntries(
            Object.entries(parameters).filter(([_, v]) => v !== undefined && v !== null)
        );

        const query = new URLSearchParams({
            engine: "google_flights",
            api_key: this.config.SERPAPI_API_KEY,
            ...cleanParameters as any
        });

        const response = await fetch(`${this.baseUrl}/search?${query.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            logger.error({
                status: response.status,
                error: data.error || data,
                parameters: { ...parameters, api_key: 'REDACTED' }
            }, 'SerpApi Request Failed');
            throw new Error(`SerpApi error: ${response.status} - ${data.error || JSON.stringify(data)}`);
        }

        return data;
    }
}
