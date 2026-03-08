import { injectable } from "tsyringe";
import type { ApiRequestParameters, SerpApiResponse } from "./serpapi.types.js";
import mongoose, { Schema } from "mongoose";
import { ServerConfig } from "../../config/server.config.js";

const requestsPerDaySchema = new Schema<{ date: string; count: number }>({
    date: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0, max: 2500 },
});

export const RequestsPerDay = mongoose.model<{ date: string; count: number }>("RequestsPerDay", requestsPerDaySchema);

@injectable()
export class SerpApiClient {

    private baseUrl = "https://serpapi.com";

    constructor(private config: ServerConfig) { }

    private maxRequestPerDay = 1000;

    public async search(
        parameters: ApiRequestParameters
    ): Promise<SerpApiResponse> {

        try {
            RequestsPerDay.findOneAndUpdate(
                { date: new Date().toISOString().slice(0, 10) },
                { $inc: { count: 1 } },
                { runValidators: true, upsert: true, new: true }
            ).then(doc => {
                if (doc && doc.count > this.maxRequestPerDay) {
                    throw new Error("SerpApi daily request limit exceeded");
                }
            });
        } catch (error: any) {
            if (error.name === "ValidationError") {
                throw new Error("SerpApi daily request limit exceeded");
            }
            throw error;
        }

        const query = new URLSearchParams({
            engine: "google_flights",
            api_key: this.config.SERPAPI_API_KEY,
            ...parameters as any
        });

        const response = await fetch(`${this.baseUrl}/search?${query.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi error: ${response.status}`);
        }

        return await response.json();
    }
}
