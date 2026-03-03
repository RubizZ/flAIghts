import { singleton } from "tsyringe";
import { Airport } from "./airport.model.js";
import type { AirportResponse } from "./airport.types.js";

@singleton()
export class AirportService {
    public async searchAirports(query: string): Promise<AirportResponse[]> {
        const cleanQuery = query?.trim();

        if (!cleanQuery || cleanQuery.length < 2) return [];

        const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');

        const airports = await Airport.find({
            $or: [
                { iata_code: regex },
                { city: regex },
                { name: regex },
                { country: regex }
            ]
        }).limit(50).lean();

        const scoredAirports = airports.map(airport => {
            let score = airport.importance_score || 0;
            const qUpper = cleanQuery.toUpperCase();
            
            const iata = airport.iata_code?.toUpperCase();
            const city = airport.city?.toUpperCase();
            const name = airport.name?.toUpperCase();
            const country = airport.country?.toUpperCase();

            if (iata === qUpper) {
                score += 1000;
            }

            if (city === qUpper) {
                score += 500;
            } else if (city?.startsWith(qUpper)) {
                score += 200;
            }

            if (name?.startsWith(qUpper)) {
                score += 100;
            }

            if (country === qUpper) {
                score += 300;
            } else if (country?.startsWith(qUpper)) {
                score += 100;
            }

            return { ...airport, _sortScore: score };
        });

        scoredAirports.sort((a, b) => b._sortScore - a._sortScore);

        return scoredAirports.slice(0, 10).map(({ _sortScore, ...airport }) => airport);
    }
}