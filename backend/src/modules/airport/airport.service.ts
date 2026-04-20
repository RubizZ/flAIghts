import { singleton, inject } from "tsyringe";
import fuzzysort from "fuzzysort";
import axios from "axios";
import ms from "ms";
import { ServerConfig } from "../../config/server.config.js";
import { Airport, type IAirport } from "./airport.model.js";
import logger from "../../utils/logger.js";
import { GeocodeCache } from "./geocode-cache.model.js";
import type { AirportResponse, AirportSearchPaginatedResult, ScoredAirport, GlobeAirportResponse, CachedAirport, SearchResult, CityResponse } from "./airport.types.js";
import { COUNTRY_NAMES } from "./countries.js";

// Radios base (km) para búsqueda de rutas
const MIN_RADIUS_KM = 1000;
const MAX_RADIUS_KM = 3000;
const MAX_LAYOVERS = 21;
const GLOBAL_LCC_BASES: string[] = [
    "ACE", "AEP", "AGP", "AKL", "ALC", "AMM", "ARN", "ATH", "ATL", "AUH",
    "AUS", "BCN", "BEG", "BER", "BFS", "BGY", "BKI", "BLQ", "BLR", "BNA",
    "BNE", "BOD", "BOG", "BOM", "BRS", "BTS", "BUD", "BVA", "BWI", "CAI",
    "CAN", "CCU", "CDG", "CEB", "CGH", "CGK", "CGN", "CJU", "CMN", "CNF",
    "COR", "CPH", "CPT", "CRL", "CTA", "CTG", "CUN", "CVG", "DAD", "DAL",
    "DEL", "DEN", "DFW", "DMK", "DPS", "DTM", "DUB", "DUR", "DWC", "DXB",
    "EDI", "EIN", "EPA", "EVE", "EWR", "EZE", "FAO", "FCO", "FLL", "FMM",
    "GDL", "GDN", "GRU", "HAN", "HEL", "HKT", "HOU", "HYD", "IBZ", "ICN",
    "ISM", "JED", "JNB", "KIX", "KRK", "KTW", "KUL", "KWI", "LAS", "LAX",
    "LGW", "LIM", "LIS", "LPA", "LTN", "MAA", "MAD", "MAN", "MCO", "MCT",
    "MDE", "MDW", "MEL", "MEX", "MIA", "MLA", "MNL", "MRS", "MTY", "MXP",
    "NAP", "NRN", "NRT", "NTE", "OOL", "OPO", "ORD", "ORY", "OSL", "OTP",
    "PEN", "PGD", "PHX", "PIE", "PMI", "PMO", "PRG", "PSA", "PVG", "RAK",
    "RIX", "RUH", "SAN", "SAW", "SCL", "SFB", "SGN", "SHJ", "SIN", "SJD",
    "SJU", "SKG", "SKP", "SOF", "STN", "SUB", "SYD", "TFS", "TIA", "TIJ",
    "TLL", "TPA", "TPE", "TSF", "TTN", "VCE", "VCP", "VIE", "VNO", "WAW",
    "WMI"
];

@singleton()
export class AirportService {
    private airportsCache: CachedAirport[] = [];
    private citiesCache = new Map<string, { lat: number, lon: number, display_name: string, country: string }>();
    private isInitialized = false;

    constructor(@inject(ServerConfig) private config: ServerConfig) {
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
                } as CachedAirport;
            });

            // Precomputamos las ciudades más importantes (O(1) lookup para geocodificación gratuita)
            const tempCityImportance = new Map<string, { airport: CachedAirport, importance: number }>();
            this.airportsCache.forEach(a => {
                const cityKey = a._normCity;
                const existing = tempCityImportance.get(cityKey);
                if (!existing || a.importance_score > existing.importance) {
                    tempCityImportance.set(cityKey, { airport: a, importance: a.importance_score });
                }
            });

            tempCityImportance.forEach((val, cityKey) => {
                const a = val.airport;
                const countryInfo = COUNTRY_NAMES[a.country];
                const countryName = (countryInfo && countryInfo[1]) || a.country;
                this.citiesCache.set(cityKey, {
                    lat: a.location.coordinates[1],
                    lon: a.location.coordinates[0],
                    display_name: `${a.city}, ${countryName}`,
                    country: countryName
                });
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
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    public async searchAirports(query: string, userLat?: number, userLon?: number, page: number = 1, limit: number = 10): Promise<AirportSearchPaginatedResult> {
        let airports = this.isInitialized ? this.airportsCache : (await Airport.find({}).lean()).map(a => {
            const names = COUNTRY_NAMES[a.country] || [];
            return {
                ...a,
                _normIata: this.normalize(a.iata_code),
                _normCity: this.normalize(a.city),
                _normName: this.normalize(a.name),
                _normCountry: this.normalize(a.country),
                _normCountryNames: names.map(n => this.normalize(n)).join(" ")
            };
        });

        const cleanQuery = query?.trim();
        if (!cleanQuery || cleanQuery.length < 2) return { items: [], total: 0, page, totalPages: 0 };

        const normalizedQuery = this.normalize(cleanQuery);
        const results = fuzzysort.go<CachedAirport>(normalizedQuery, airports, {
            keys: ['iata_code', 'city', 'name', '_normIata', '_normCity', '_normName', '_normCountry', '_normCountryNames'],
            threshold: -2500,
        });

        const fuzzyItems = results.map((result) => {
            const airport = result.obj;
            const textScore = Math.max(0, (1000 + result.score) / 1000);
            const importanceScore = (airport.importance_score || 0) / 100;
            let distanceScore = 0;
            let distance_km: number | undefined = undefined;

            if (userLat !== undefined && userLon !== undefined) {
                const [lon, lat] = airport.location.coordinates;
                distance_km = this.haversine(userLat, userLon, lat, lon);
                distanceScore = Math.max(0, 1 - (distance_km / 5000));
            }

            let weightedScore = (textScore * 70) + (importanceScore * 15) + (distanceScore * 15);

            if (airport.iata_code?.toUpperCase() === cleanQuery.toUpperCase()) weightedScore += 1000;
            if (airport.city?.toLowerCase() === normalizedQuery) weightedScore += 500;
            if (airport._normCity.startsWith(normalizedQuery)) weightedScore += 200;

            const highlight = {
                iata_code: result[0]?.highlight('<b>', '</b>'),
                city: result[1]?.highlight('<b>', '</b>'),
                name: result[2]?.highlight('<b>', '</b>'),
            };

            const cityScore = result[1]?.score ?? 0;

            return {
                ...this.toAirportResponse(airport),
                combined_score: weightedScore,
                distance_km_to_user: distance_km ? Math.round(distance_km) : undefined,
                highlight,
                cityScore
            };
        });

        // Intelligent city search trigger
        const topFuzzyScore = fuzzyItems.length > 0 ? (fuzzyItems[0] as any).combined_score : 0;
        const bestCityMatch = fuzzyItems.find(i => i.cityScore > 0.9);
        const isIataQuery = cleanQuery.length === 3 && /^[A-Za-z]{3}$/.test(cleanQuery);

        let finalItems: SearchResult[] = [];
        let cityToGeocode: string | null = null;

        if (!isIataQuery) {
            if (bestCityMatch) {
                // We have a high-confidence city match in our DB, use its canonical name
                cityToGeocode = bestCityMatch.city;
            } else if (topFuzzyScore < 200) {
                // Weak overall results, try geocoding the raw query as a fallback
                cityToGeocode = cleanQuery;
            }
        }

        if (cityToGeocode) {
            try {
                const coordsResult = await this.geocodeCity(cityToGeocode);
                if (coordsResult) {
                    const countryName = coordsResult.country;
                    const countryCode = Object.entries(COUNTRY_NAMES).find(([_, names]) => names.includes(countryName))?.[0] || "";
                    const near = await this.getNearAirports(coordsResult.lat, coordsResult.lon, 8, 200);
                    const nearIatas = new Set(near.map(n => n.iata_code));

                    // Build the final subAirports list using data from fuzzyItems (for highlights) where possible
                    const subAirports = near.map(n => {
                        const fuzzyMatch = fuzzyItems.find(f => f.iata_code === n.iata_code);
                        if (fuzzyMatch) {
                            return { ...this.toAirportResponse(fuzzyMatch), distance_km_to_city: n.distance_km_to_city, highlight: fuzzyMatch.highlight };
                        }
                        return n;
                    });

                    // Create City Item
                    const cityItem: CityResponse = {
                        name: coordsResult.display_name,
                        country: countryCode,
                        type: "city" as const,
                        location: { type: "Point", coordinates: [coordsResult.lon, coordsResult.lat] },
                        airports: subAirports,
                        combined_score: (fuzzyItems[0]?.combined_score || 350) + 50,
                        highlight: {
                            name: coordsResult.display_name.replace(new RegExp(cityToGeocode, 'gi'), '<b>$&</b>')
                        }
                    };

                    // Remaining independent airports (those NOT in the near group)
                    const otherAirports = fuzzyItems.filter(f => !nearIatas.has(f.iata_code));

                    finalItems = [cityItem, ...otherAirports];;
                } else {
                    finalItems = fuzzyItems;
                }
            } catch (e) {
                console.error("City geocoding failed", e);
                finalItems = fuzzyItems;
            }
        } else {
            finalItems = fuzzyItems;
        }

        const sortedResults = finalItems.sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0));

        // Final cleaning and pagination
        const total = sortedResults.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const items = sortedResults.slice(start, start + limit).map(item => {
            if (item.type === 'city') {
                return this.toCityResponse(item);
            }
            return this.toAirportResponse(item);
        });

        return { items, total, page, totalPages };
    }

    private async geocodeCity(query: string): Promise<{ lat: number, lon: number, display_name: string, country: string } | null> {
        const cacheKey = query.toLowerCase().trim();
        const normalizedQuery = this.normalize(cacheKey);

        // 1. O(1) Memory Lookup for known cities with airports (Zero cost/latency)
        const staticMatch = this.citiesCache.get(normalizedQuery);
        if (staticMatch) return staticMatch;

        // 2. MongoDB persistent cache (Low cost/latency)
        const cached = await GeocodeCache.findOne({ query: cacheKey });
        const now = Date.now();
        const expiresAt = new Date(now + ms(this.config.GEOCODE_CACHE_TTL));

        if (cached) {
            // refresh TTL
            cached.expiresAt = expiresAt;
            await cached.save();
            return {
                lat: cached.lat,
                lon: cached.lon,
                display_name: cached.display_name,
                country: cached.country
            };
        }

        // 3. External geocoding fallback (Rare, requires geocoding small towns or new cities)
        const provider = this.config.GEOCODING_PROVIDER;
        const apiKey = this.config.GEOCODING_API_KEY;

        try {
            let result: { lat: number, lon: number, display_name: string, country: string } | null = null;

            if (provider === "google" && apiKey) {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
                const resp = await axios.get(url, { timeout: 2000 });
                if (resp.data?.results?.[0]) {
                    const first = resp.data.results[0];
                    const countryComp = first.address_components?.find((c: any) => c.types.includes("country"));
                    result = {
                        lat: first.geometry.location.lat,
                        lon: first.geometry.location.lng,
                        display_name: first.formatted_address,
                        country: countryComp?.long_name || ""
                    };
                }
            } else {
                // Nominatim Public as fallback (rate-limited but works for occasional misses)
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
                const resp = await axios.get(url, { headers: { 'User-Agent': 'flAIghts-Backend' }, timeout: 2000 });
                if (resp.data?.[0]) {
                    result = {
                        lat: parseFloat(resp.data[0].lat),
                        lon: parseFloat(resp.data[0].lon),
                        display_name: resp.data[0].display_name,
                        country: resp.data[0].address?.country || ""
                    };
                }
            }

            if (result) {
                await GeocodeCache.create({ query: cacheKey, ...result, expiresAt });
                return result;
            }
        } catch (e: any) {
            if (e.response?.status === 429) {
                console.warn("Geocoding rate limited (429). Pure DB fallback failed.");
            } else {
                console.error("Geocoding failed", e.message);
            }
        }
        return null;
    }

    public async getGlobeAirports(): Promise<GlobeAirportResponse[]> {
        const airports = this.isInitialized ? this.airportsCache : await Airport.find({}).lean() as IAirport[];
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
        if (this.isInitialized) return this.airportsCache.find(a => a.iata_code === iata.toUpperCase()) || null;
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
                    distanceField: "distance_meters",
                    maxDistance: maxDistanceKm * 1000,
                    spherical: true
                }
            },
            { $limit: limit }
        ]);

        return airports.map(a => {
            return {
                ...this.toAirportResponse(a),
                distance_km_to_city: Math.round(a.distance_meters / 1000)
            };
        });
    }

    private toAirportResponse(a: any): AirportResponse {
        return {
            iata_code: a.iata_code,
            name: a.name,
            city: a.city,
            country: a.country,
            type: "airport",
            importance_score: a.importance_score,
            location: a.location,
            combined_score: a.combined_score,
            distance_km_to_user: a.distance_km_to_user,
            distance_km_to_city: a.distance_km_to_city,
            highlight: a.highlight
        };
    }

    private toCityResponse(c: any): CityResponse {
        return {
            name: c.name,
            country: c.country,
            type: "city",
            location: c.location,
            airports: (c.airports || []).map((a: any) => this.toAirportResponse(a)),
            combined_score: c.combined_score,
            highlight: c.highlight
        };
    }


    public async getCandidateLayovers(
        originIata: string,
        destinationIata: string
    ): Promise<string[]> {
        try {
            if (!originIata || !destinationIata) return [];

            const [origin, destination] = await Promise.all([
                Airport.findOne({ iata_code: originIata }).lean<IAirport>(),
                Airport.findOne({ iata_code: destinationIata }).lean<IAirport>()
            ]);

            if (!origin || !destination) return [];

            const [oLon, oLat] = origin.location.coordinates;
            const [dLon, dLat] = destination.location.coordinates;

            const directDistance = this.haversine(oLat, oLon, dLat, dLon);

            const hubs = await Airport.find({
                iata_code: {
                    $in: GLOBAL_LCC_BASES,
                    $nin: [originIata, destinationIata]
                }
            }).lean<IAirport[]>();

            const viableHubs = hubs
                .map(hub => {
                    const [hLon, hLat] = hub.location.coordinates;
                    const dOriginToHub = this.haversine(oLat, oLon, hLat, hLon);
                    const dHubToDest = this.haversine(hLat, hLon, dLat, dLon);
                    const totalJourneyDistance = dOriginToHub + dHubToDest;

                    return {
                        iata: hub.iata_code,
                        totalJourneyDistance,
                        detourRatio: totalJourneyDistance / directDistance,
                        extraDistance: totalJourneyDistance - directDistance
                    };
                })
                .filter(item => {
                    return (item.detourRatio <= 1.8) || (item.extraDistance <= 1500);
                });

            viableHubs.sort((a, b) => a.totalJourneyDistance - b.totalJourneyDistance);

            return viableHubs.slice(0, MAX_LAYOVERS).map(item => item.iata);

        } catch (error) {
            logger.error({ error, originIata, destinationIata }, "getCandidateLayovers failed");
            return [];
        }
    }

    public async getHubsNear(iata: string, maxDistanceKm: number = 3000, limit: number = 14): Promise<string[]> {
        const airport = await this.getAirportByIata(iata);
        if (!airport) return [];

        const [lon, lat] = airport.location.coordinates;

        let candidates: { iata: string; distance: number }[] = [];

        if (this.isInitialized && this.airportsCache.length > 0) {
            candidates = this.airportsCache
                .filter(a => GLOBAL_LCC_BASES.includes(a.iata_code) && a.iata_code !== iata.toUpperCase())
                .map(a => {
                    const [hLon, hLat] = a.location.coordinates;
                    const distance = this.haversine(lat, lon, hLat, hLon);
                    return { iata: a.iata_code, distance };
                })
                .filter(a => a.distance <= maxDistanceKm);
        } else {
            const near = await this.getNearAirports(lat, lon, limit * 2, maxDistanceKm);
            candidates = near
                .filter(a => GLOBAL_LCC_BASES.includes(a.iata_code) && a.iata_code !== iata.toUpperCase())
                .map(a => ({
                    iata: a.iata_code,
                    distance: a.distance_km_to_city || 0
                }));
        }

        return candidates
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit)
            .map(a => a.iata);
    }

    private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // radio de la Tierra en km
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
