import { singleton } from "tsyringe";
import { Airline } from "./airline.model.js";
import type { PaginatedAirlineResponse } from "./airline.types.js";

@singleton()
export class AirlineService {
    public async searchAirlines(query: string, page: number = 1, limit: number = 10): Promise<PaginatedAirlineResponse> {
        if (!query || query.length < 2) {
            return { items: [], total: 0, page, totalPages: 0 };
        }

        const regex = new RegExp(query, 'i');

        const findQuery = {
            $or: [
                { name: regex },
                { code: regex }
            ]
        };

        const skip = (page - 1) * limit;

        const [airlines, total] = await Promise.all([
            Airline.find(findQuery)
                .sort({ quality_score: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Airline.countDocuments(findQuery)
        ]);

        return {
            items: airlines,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
}