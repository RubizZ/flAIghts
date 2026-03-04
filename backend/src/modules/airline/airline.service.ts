import { singleton } from "tsyringe";
import { Airline } from "./airline.model.js";
import type { AirlineResponse } from "./airline.types.js";

@singleton()
export class AirlineService {
    public async searchAirlines(query: string): Promise<AirlineResponse[]> {
        if (!query || query.length < 2) return [];

        const regex = new RegExp(query, 'i');

        const airlines = await Airline.find({
            $or: [
                { name: regex },
                { code: regex }
            ]
        }).sort({ quality_score: -1 }).limit(10).lean();

        return airlines;
    }
}