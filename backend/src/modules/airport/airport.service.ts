import { singleton } from "tsyringe";
import fuzzysort from "fuzzysort";
import { Airport, type IAirport } from "./airport.model.js";
import type { AirportResponse, ScoredAirport, GlobeAirportResponse } from "./airport.types.js";

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
            console.log("Initializing Airport Search Cache...");
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
            console.log(`Airport cache ready with ${this.airportsCache.length} airports.`);
        } catch (error) {
            console.error("Failed to initialize airport cache:", error);
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

    /**
     * Búsqueda con detección de errores (typos) usando fuzzysort y normalización
     */
    public async searchAirports(query: string): Promise<AirportResponse[]> {
        if (!this.isInitialized) {
            // Fallback si por alguna razón no está listo (aunque es poco probable)
            const results = await this.searchDatabase(query);
            return results;
        }

        const cleanQuery = query?.trim();
        if (!cleanQuery || cleanQuery.length < 2) return [];

        // Normalizamos la query para que coincida con nuestros campos normalizados
        const normalizedQuery = this.normalize(cleanQuery);

        // Fuzzysort en los campos normalizados
        const results = fuzzysort.go(normalizedQuery, this.airportsCache, {
            keys: ['_normIata', '_normCity', '_normName', '_normCountry', '_normCountryNames'],
            limit: 15,
            threshold: -10000, // Ajustable según sensibilidad deseada
        });

        return results.map(result => {
            const airport = result.obj;
            // Calculamos un bonus basado en importancia y precisión de fuzzysort
            // result.score es negativo (0 es match perfecto)
            let finalScore = (airport.importance_score || 0) * 50 + result.score;

            // Bonus por match exacto en IATA
            if (airport.iata_code?.toUpperCase() === cleanQuery.toUpperCase()) {
                finalScore += 5000;
            }

            return { ...airport, _sortScore: finalScore };
        }).sort((a, b) => b._sortScore - a._sortScore)
            .slice(0, 10)
            .map(({ _sortScore, searchKey, ...airport }) => airport as any);
    }

    private async searchDatabase(query: string) {
        // Fallback básico si la caché falla
        const regex = new RegExp(query, 'i');
        return await Airport.find({
            $or: [{ iata_code: regex }, { city: regex }, { name: regex }]
        }).limit(10).lean() as any;
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

    private formatForGlobe(airports: any[]): GlobeAirportResponse[] {
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
            console.error("getCandidateLayovers failed:", error);
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
