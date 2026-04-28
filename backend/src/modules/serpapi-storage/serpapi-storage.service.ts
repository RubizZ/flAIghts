import type { FlightRoute, ApiRequestParameters, SerpApiResponse } from "../../services/serpapi/serpapi.types.js";
import { singleton, inject } from "tsyringe";
import { SerpapiStorage } from "./serpapi-storage.model.js";
import { SerpApiClient } from "../../services/serpapi/serpapi.client.js";
import type { DijkstraFlightEdge } from "../../algorithms/dijkstra.js";
import ms from "ms";

import { ServerConfig } from "../../config/server.config.js";
import type { SearchRequest } from "../search/search.types.js";

@singleton()
export class SerpapiStorageService {
    private minPriceCache = new Map<string, number>();


    constructor(
        @inject(SerpApiClient) private readonly serpApiClient: SerpApiClient,
        @inject(ServerConfig) private config: ServerConfig
    ) { }

    public async getFlightEdges(
        origins: string[],
        destinations: string[],
        date: string,
        userId?: string
    ): Promise<DijkstraFlightEdge[]> {
        const sortedOrigins = [...origins].sort();
        const sortedDestinations = [...destinations].sort();

        const freshnessLimit = new Date(Date.now() - ms(this.config.FLIGHT_CACHE_TTL));

        const record = await SerpapiStorage.findOne({
            "search_parameters.departure_id": sortedOrigins.length === 1 ? sortedOrigins[0] : sortedOrigins.join(","),
            "search_parameters.arrival_id": sortedDestinations.length === 1 ? sortedDestinations[0] : sortedDestinations.join(","),
            "search_parameters.outbound_date": date,
            createdAt: { $gte: freshnessLimit }
        }).sort({ createdAt: -1 }).lean();

        let response: SerpApiResponse;

        if (!record) {
            const params: ApiRequestParameters = {
                departure_id: sortedOrigins.join(","),
                arrival_id: sortedDestinations.join(","),
                outbound_date: date,
                type: 2,
                currency: "EUR",
                show_hidden: true,
                hl: "es",
                gl: "es",
            };

            response = await this.serpApiClient.search(params, userId);



            try {
                await SerpapiStorage.create(response);
            } catch (error: any) {
                if (error.code !== 11000) {
                    throw error;
                }
            }
        } else {
            response = record as SerpApiResponse;
        }

        const allFlights: FlightRoute[] = [
            ...(response.best_flights || []),
            ...(response.other_flights || []),
        ];

        return allFlights
            .map((flight) => {
                const first = flight.flights[0]!;
                const last = flight.flights[flight.flights.length - 1]!;
                return {
                    id: flight.booking_token,
                    from: first.departure_airport.id,
                    to: last.arrival_airport.id,
                    price: flight.price,
                    duration: flight.total_duration,
                    stops: flight.layovers ? flight.layovers.length : 0,
                    date: date,
                    airline: first.airline,
                    airline_logo: first.airline_logo ?? "",
                    departure_time: first.departure_airport.time,
                    arrival_time: last.arrival_airport.time,
                    airplane: first.airplane,
                    flight_number: first.flight_number,
                    travel_class: first.travel_class,
                    extensions: flight.extensions,
                    segments: flight.flights.map(f => ({
                        departure_airport: {
                            name: f.departure_airport.name,
                            id: f.departure_airport.id,
                            time: f.departure_airport.time
                        },
                        arrival_airport: {
                            name: f.arrival_airport.name,
                            id: f.arrival_airport.id,
                            time: f.arrival_airport.time
                        },
                        duration: f.duration,
                        airplane: f.airplane,
                        airline: f.airline,
                        airline_logo: f.airline_logo,
                        travel_class: f.travel_class,
                        flight_number: f.flight_number,
                        extensions: f.extensions
                    }))
                };
            })
            .filter(
                edge =>
                    origins.includes(edge.from) &&
                    destinations.includes(edge.to) &&
                    edge.from !== edge.to
            )
            .map(edge => {
                const key = `${edge.from}|${edge.to}|${date}`;
                const current = this.minPriceCache.get(key) ?? Infinity;
                if (edge.price !== undefined && edge.price !== null && edge.price < current) {
                    this.minPriceCache.set(key, edge.price);
                }
                return edge;
            });
    }


    public getMinPrice(from: string, to: string, date: string): number {
        return this.minPriceCache.get(`${from}|${to}|${date}`) ?? Infinity;
    }


    public clearPriceCache(): void {
        this.minPriceCache.clear();
    }


    public async warmUpCache(date: string): Promise<void> {
        const freshnessLimit = new Date(Date.now() - ms(this.config.FLIGHT_CACHE_TTL));

        const records = await SerpapiStorage.find({
            "search_parameters.outbound_date": date,
            createdAt: { $gte: freshnessLimit }
        }).lean();

        for (const record of records) {
            const allFlights = [
                ...(record.best_flights || []),
                ...(record.other_flights || []),
            ];

            for (const flight of allFlights) {
                const first = flight.flights[0];
                const last = flight.flights[flight.flights.length - 1];
                if (!first || !last) continue;
                const from = first.departure_airport.id;
                const to = last.arrival_airport.id;
                const key = `${from}|${to}|${date}`;
                const current = this.minPriceCache.get(key) ?? Infinity;
                if (flight.price !== undefined && flight.price !== null && flight.price < current) {
                    this.minPriceCache.set(key, flight.price);
                }
            }
        }
    }
    public async getAllFlights(criteria: SearchRequest, overrides?: Partial<ApiRequestParameters>, userId?: string): Promise<FlightRoute[]> {
        const freshnessLimit = new Date(Date.now() - ms(this.config.FLIGHT_CACHE_TTL));

        // Generamos los parámetros exactos que se usarían para la API
        const params = this.createApiParams(criteria, overrides);

        // Creamos un query que coincida con todos los parámetros relevantes
        const query: any = {
            "search_parameters.departure_id": params.departure_id,
            "search_parameters.arrival_id": params.arrival_id,
            "search_parameters.outbound_date": params.outbound_date,
            createdAt: { $gte: freshnessLimit }
        };

        // Añadimos parámetros opcionales al query si existen
        if (params.stops !== undefined) query["search_parameters.stops"] = params.stops;
        if (params.max_price !== undefined) query["search_parameters.max_price"] = params.max_price;
        if (params.travel_class !== undefined) query["search_parameters.travel_class"] = params.travel_class;

        const record = await SerpapiStorage.findOne(query).sort({ createdAt: -1 }).lean();

        if (!record) {
            const params: ApiRequestParameters = this.createApiParams(criteria, overrides);
            const response = await this.serpApiClient.search(params, userId);
            await SerpapiStorage.create(response);
            return [...(response.best_flights || []), ...(response.other_flights || [])];
        }

        return [
            ...(record.best_flights || []),
            ...(record.other_flights || []),
        ];
    }
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Realiza búsquedas masivas agrupando orígenes y destinos de 7 en 7.
     * Evita el error 400 filtrando aeropuertos que estén en el origen y destino simultáneamente.
     */
    public async getBatchedFlightEdges(
        origins: string[],
        destinations: string[],
        date: string,
        userId?: string
    ): Promise<DijkstraFlightEdge[]> {
        const originChunks = this.chunkArray(origins, 7);
        const destinationChunks = this.chunkArray(destinations, 7);
        const promises: Promise<DijkstraFlightEdge[]>[] = [];

        for (const originChunk of originChunks) {
            for (const destinationChunk of destinationChunks) {
                const safeDestinations = destinationChunk.filter(iata => !originChunk.includes(iata));

                if (safeDestinations.length > 0) {
                    const promise = this.getFlightEdges(originChunk, safeDestinations, date, userId)
                        .catch((error) => {
                            console.error(`Error en batched flight retrieval: ${originChunk} -> ${safeDestinations} @ ${date}`, error.message);
                            return [] as DijkstraFlightEdge[];
                        });
                    promises.push(promise);
                }
            }
        }

        const results = await Promise.all(promises);
        return results.flat().sort((a, b) => (a.price || 1000000) - (b.price || 1000000));
    }

    /**
     * Pre-fetching inteligente para el Algoritmo Genético.
     * Usa la estrategia de "Directed Pair Batching" para cubrir todos los pares (i, j)
     * minimizando peticiones y evitando que un aeropuerto sea origen y destino a la vez.
     */
    public async getGeneticIntermediateEdges(
        cities: string[],
        date: string,
        userId?: string
    ): Promise<DijkstraFlightEdge[]> {
        if (cities.length < 2) return [];

        const allPairs: [string, string][] = [];
        for (const from of cities) {
            for (const to of cities) {
                if (from !== to) allPairs.push([from, to]);
            }
        }

        const batches: { origins: Set<string>; destinations: Set<string> }[] = [];
        let remaining = [...allPairs];

        while (remaining.length > 0) {
            const origins = new Set<string>();
            const destinations = new Set<string>();
            const pairsInBatch: [string, string][] = [];

            // Intentar llenar un batch (máximo 7x7 y disjuntos)
            for (let i = 0; i < remaining.length; i++) {
                const [u, v] = remaining[i]!;

                const potentialOrigins = new Set(origins).add(u);
                const potentialDestinations = new Set(destinations).add(v);

                // Regla: No solapamiento (crucial para Google Flights)
                const hasOverlap = [...potentialOrigins].some(o => potentialDestinations.has(o));

                if (!hasOverlap && potentialOrigins.size <= 7 && potentialDestinations.size <= 7) {
                    origins.add(u);
                    destinations.add(v);
                    pairsInBatch.push([u, v]);
                }
            }

            batches.push({ origins, destinations });
            // Filtrar los pares que ya cubrimos en este batch
            remaining = remaining.filter(p => !pairsInBatch.some(pb => pb[0] === p[0] && pb[1] === p[1]));
        }

        const promises = batches.map(batch =>
            this.getFlightEdges([...batch.origins], [...batch.destinations], date, userId)
                .catch(() => [] as DijkstraFlightEdge[])
        );

        const results = await Promise.all(promises);
        return results.flat();
    }

    private createApiParams(criteria: SearchRequest, overrides?: Partial<ApiRequestParameters>): ApiRequestParameters {
        const outboundDate = new Date(criteria.departure_date).toISOString().split("T")[0]!;

        const params: ApiRequestParameters = {
            departure_id: criteria.origins.join(","),
            arrival_id: criteria.destinations.join(","),
            outbound_date: outboundDate,
            gl: "es",
            show_hidden: true,
            hl: "es",
            currency: "EUR",
            deep_search: true,
            type: 2,
            max_price: criteria.criteria.max_price,
            ...overrides
        };

        if (Array.isArray(params.departure_id)) params.departure_id = params.departure_id.join(",");
        if (Array.isArray(params.arrival_id)) params.arrival_id = params.arrival_id.join(",");

        return params;
    }
}