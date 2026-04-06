import { singleton } from "tsyringe";
import fuzzysort from "fuzzysort";
import { Airport, type IAirport } from "./airport.model.js";
import type { AirportResponse, AirportSearchPaginatedResult, ScoredAirport, GlobeAirportResponse } from "./airport.types.js";
import logger from "../../utils/logger.js";

// Radios base (km) para búsqueda de rutas
const MIN_RADIUS_KM = 150;
const MAX_RADIUS_KM = 800;
const MAX_LAYOVERS = 6;
import { COUNTRY_NAMES } from "./countries.js";

@singleton()
export class AirportService {
    private airportsCache: any[] = [];
    private isInitialized = false;

    constructor() {
        this.initializeCache();
    }

    private async initializeCache() {
        try {
            logger.info("Initializing Airport Search Cache...");
            // Cargamos todos los aeropuertos en memoria
            const airports = await Airport.find({}).lean();

            // Pre-procesamos para fuzzysort con normalización
            this.airportsCache = airports.map(a => {
                const names = COUNTRY_NAMES[a.country] || [];
                return {
                    ...a,
                    // Almacenamos versiones normalizadas para una búsqueda que ignore acentos/tildes
                    _normIata: this.normalize(a.iata_code),
                    _normCity: this.normalize(a.city),
                    _normName: this.normalize(a.name),
                    _normCountry: this.normalize(a.country),
                    // Añadimos nombres de países en múltiples idiomas para mejorar la búsqueda
                    _normCountryNames: names.map(n => this.normalize(n)).join(" ")
                };
            });

            this.isInitialized = true;
            logger.info(`Airport cache ready: ${this.airportsCache.length} airports`);
        } catch (error) {
            logger.error({ error }, "Failed to initialize airport cache");
        }
    }

    /**
     * Normaliza un string eliminando acentos y carácteres especiales básicos
     */
    private normalize(str: string): string {
        if (!str) return "";
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Elimina diacríticos (acentos)
            .toLowerCase();
    }

    public async searchAirports(query: string, userLat?: number, userLon?: number, page: number = 1, limit: number = 10): Promise<AirportSearchPaginatedResult> {
        if (!this.isInitialized) {
            return await this.searchDatabase(query, page, limit);
        }

        const cleanQuery = query?.trim();
        if (!cleanQuery || cleanQuery.length < 2) {
            return { items: [], total: 0, page, totalPages: 0 };
        }

        const normalizedQuery = this.normalize(cleanQuery);

        const results = fuzzysort.go(normalizedQuery, this.airportsCache, {
            keys: ['_normIata', '_normCity', '_normName', '_normCountry', '_normCountryNames'],
            threshold: -10000,
        });

        const sortedResults = results.map((result: any) => {
            const airport = result.obj;
            let finalScore = (result.score * 1000) + (airport.importance_score || 0);

            let distance_km: number | undefined = undefined;
            if (userLat !== undefined && userLon !== undefined) {
                const [lon, lat] = airport.location.coordinates;
                distance_km = this.haversine(userLat, userLon, lat, lon);
                const distanceBonus = Math.max(0, 100000 * (1 - distance_km / 5000));
                finalScore += distanceBonus;
            }

            if (airport.iata_code?.toUpperCase() === cleanQuery.toUpperCase()) {
                finalScore += 1000000;
            }

            if (airport.city?.toLowerCase() === cleanQuery.toLowerCase()) {
                finalScore += 500000;
            }

            return {
                ...airport,
                combined_score: finalScore,
                distance_km: distance_km ? Math.round(distance_km) : undefined
            };
        }).sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0));

        const total = sortedResults.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const items = sortedResults.slice(start, start + limit)
            .map(({ _normIata, _normCity, _normName, _normCountry, _normCountryNames, ...airport }) => airport as any);

        return { items, total, page, totalPages };
    }

    private async searchDatabase(query: string, page: number = 1, limit: number = 10): Promise<AirportSearchPaginatedResult> {
        // Fallback básico si la caché falla
        const regex = new RegExp(query, 'i');
        const findQuery = {
            $or: [{ iata_code: regex }, { city: regex }, { name: regex }]
        };

        const skip = (page - 1) * limit;

        const [airports, total] = await Promise.all([
            Airport.find(findQuery)
                .skip(skip)
                .limit(limit)
                .lean(),
            Airport.countDocuments(findQuery)
        ]);

        return {
            items: airports as AirportResponse[],
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Devuelve todos los aeropuertos en formato ultra-compacto para el globo
     */
    public async getGlobeAirports(): Promise<GlobeAirportResponse[]> {
        if (!this.isInitialized) {
            const airports = await Airport.find({}).lean();
            return this.formatForGlobe(airports);
        }
        return this.formatForGlobe(this.airportsCache);
    }

    private formatForGlobe(airports: IAirport[]): GlobeAirportResponse[] {
        return airports.map(a => ({
            i: a.iata_code,
            n: a.name,
            ci: a.city || a.name,
            la: a.location.coordinates[1],
            lo: a.location.coordinates[0],
            s: a.importance_score,
            c: a.country
        }));
    }

    public async getAirportByIata(iata: string): Promise<IAirport | null> {
        if (!iata || iata.length !== 3) return null;
        if (this.isInitialized) {
            const found = this.airportsCache.find(a => a.iata_code === iata.toUpperCase());
            return found || null;
        }
        return await Airport.findOne({ iata_code: iata.toUpperCase() }).lean();
    }

    /**
     * Obtiene los aeropuertos más cercanos a una ubicación (lat, lon) 
     * utilizando una consulta geoespacial nativa de MongoDB ($near).
     * @param lat Latitud
     * @param lon Longitud
     * @param limit Cantidad máxima de resultados
     * @param maxDistanceKm Radio máximo en kilómetros
     */
    public async getNearAirports(lat: number, lon: number, limit: number = 5, maxDistanceKm: number = 500): Promise<AirportResponse[]> {
        const airports = await Airport.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lon, lat] },
                    distanceField: "distance_meters", // MongoDB devuelve el cálculo en metros directamente
                    maxDistance: maxDistanceKm * 1000,
                    spherical: true
                }
            },
            { $limit: limit }
        ]);

        return airports.map(a => {
            return {
                iata_code: a.iata_code,
                name: a.name,
                city: a.city,
                country: a.country,
                type: a.type,
                importance_score: a.importance_score,
                location: a.location,
                distance_km: Math.round(a.distance_meters / 1000)
            } as AirportResponse;
        });
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
            }).lean<IAirport[]>().limit(50);

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
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_LAYOVERS)
                .map(a => a.iata);

        } catch (error) {
            logger.error({ error, originIata, destinationIata }, "getCandidateLayovers failed");
            return [];
        }
    }

    private computeScore(params: {
        totalDistance: number;
        dOrigin: number;
        dDest: number;
        importance: number;
    }): number {
        const { totalDistance, dOrigin, dDest, importance } = params;
        const detourPenalty = (dOrigin + dDest) / totalDistance;
        return (importance * 2 - detourPenalty * 100);
    }

    private computeAdaptiveRadius(distanceKm: number): number {
        if (distanceKm < 800) return MIN_RADIUS_KM;
        if (distanceKm > 8000) return MAX_RADIUS_KM;
        const factor = distanceKm / 8000;
        return MIN_RADIUS_KM + factor * (MAX_RADIUS_KM - MIN_RADIUS_KM);
    }

    private haversine(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // km
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
}
