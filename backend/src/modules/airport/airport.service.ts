import { singleton } from "tsyringe";
import { Airport, type IAirport } from "./airport.model.js";
import type { AirportResponse, ScoredAirport } from "./airport.types.js";

// Parámetros para la función de búsqueda de aeropuertos candidatos
// Radios base (km)
const MIN_RADIUS_KM = 150;
const MAX_RADIUS_KM = 800;
// Cuántas escalas máximas devolvemos
const MAX_LAYOVERS = 6;

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


    public async getCandidateLayovers(
    originIata: string,
    destinationIata: string
    ): Promise<string[]> {
    try {
        if (!originIata || !destinationIata) return [];

        const origin = await Airport.findOne({ iata_code: originIata }).lean<IAirport>();
        const destination = await Airport.findOne({ iata_code: destinationIata }).lean<IAirport>();

        if (!origin || !destination) return [];

        const [oLon, oLat] = origin.location.coordinates;
        const [dLon, dLat] = destination.location.coordinates;

        const totalDistance = this.haversine(oLat, oLon, dLat, dLon);

        const radius = this.computeAdaptiveRadius(totalDistance);

        const midLat = (oLat + dLat) / 2;
        const midLon = (oLon + dLon) / 2;

        const candidates = await Airport.find({
        iata_code: { $nin: [originIata, destinationIata] },
        location: {
            $geoWithin: {
            $centerSphere: [[midLon, midLat], radius / 6371],
            },
        },
        })
        .lean<IAirport[]>()
        .limit(50);

        const scored = candidates.map((a: IAirport): ScoredAirport => {
        const [lon, lat] = a.location.coordinates;

        const dOrigin = this.haversine(oLat, oLon, lat, lon);
        const dDest = this.haversine(dLat, dLon, lat, lon);

        return {
            iata: a.iata_code,
            score: this.computeScore({
            totalDistance,
            dOrigin,
            dDest,
            importance: a.importance_score,
            }),
        };
        });

        return scored
        .sort((a: ScoredAirport, b: ScoredAirport) => b.score - a.score)
        .slice(0, MAX_LAYOVERS)
        .map((a: ScoredAirport) => a.iata);

    } catch (error) {
        console.error("getCandidateLayovers failed:", error);
        return [];
    }
    }

    computeScore(params: {
    totalDistance: number;
    dOrigin: number;
    dDest: number;
    importance: number;
    }): number {
    const { totalDistance, dOrigin, dDest, importance } = params;

    const detourPenalty = (dOrigin + dDest) / totalDistance;

    return (
        importance * 2 -
        detourPenalty * 100
    );
    }

    computeAdaptiveRadius(distanceKm: number): number {
    if (distanceKm < 800) return MIN_RADIUS_KM;
    if (distanceKm > 8000) return MAX_RADIUS_KM;

    const factor = distanceKm / 8000;
    return MIN_RADIUS_KM + factor * (MAX_RADIUS_KM - MIN_RADIUS_KM);
    }


    haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
    ): number {
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
    }    
}