import { singleton } from "tsyringe";
import { Airport, type IAirport } from "./airport.model.js";
import type { AirportResponse, PaginatedAirportResponse, ScoredAirport } from "./airport.types.js";

// Parámetros para la función de búsqueda de aeropuertos candidatos
// Radios base (km)
const MIN_RADIUS_KM = 150;
const MAX_RADIUS_KM = 800;
// Cuántas escalas máximas devolvemos
const MAX_LAYOVERS = 6;

@singleton()
export class AirportService {
    public async searchAirports(query: string, page: number = 1, limit: number = 10): Promise<PaginatedAirportResponse> {
        const cleanQuery = query?.trim();

        if (!cleanQuery || cleanQuery.length < 2) {
            return { items: [], total: 0, page, totalPages: 0 };
        }

        const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');
        const qUpper = cleanQuery.toUpperCase();
        const escapedUpperQuery = qUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const findQuery = {
            $or: [
                { iata_code: regex },
                { city: regex },
                { name: regex },
                { country: regex }
            ]
        };

        const scoreStage = {
            $addFields: {
                _sortScore: {
                    $add: [
                        { $ifNull: ["$importance_score", 0] },
                        { $cond: [{ $eq: ["$iata_code", qUpper] }, 1000, 0] },
                        { $cond: [{ $eq: [{ $toUpper: "$city" }, qUpper] }, 500, 0] },
                        { $cond: [{ $regexMatch: { input: { $toUpper: "$city" }, regex: `^${escapedUpperQuery}` } }, 200, 0] },
                        { $cond: [{ $regexMatch: { input: { $toUpper: "$name" }, regex: `^${escapedUpperQuery}` } }, 100, 0] },
                        { $cond: [{ $eq: [{ $toUpper: "$country" }, qUpper] }, 300, 0] },
                        { $cond: [{ $regexMatch: { input: { $toUpper: "$country" }, regex: `^${escapedUpperQuery}` } }, 100, 0] },
                    ]
                }
            }
        };

        const dataPipeline = [
            { $match: findQuery },
            scoreStage,
            { $sort: { _sortScore: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _sortScore: 0 } }
        ];

        const [total, items] = await Promise.all([
            Airport.countDocuments(findQuery),
            Airport.aggregate<AirportResponse>(dataPipeline)
        ]);

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
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