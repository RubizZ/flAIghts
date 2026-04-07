import type { FlightRoute, ApiRequestParameters, SerpApiResponse } from "../../services/serpapi/serpapi.types.js";
import { singleton, inject } from "tsyringe";
import { SerpapiStorage } from "./serpapi-storage.model.js";
import { SerpApiClient } from "../../services/serpapi/serpapi.client.js";
import type { DijkstraFlightEdge } from "../../algorithms/dijkstra.js";
import ms from "ms";

import { ServerConfig } from "../../config/server.config.js";

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
        date: string
    ): Promise<DijkstraFlightEdge[]> {
        const sortedOrigins = [...origins].sort();
        const sortedDestinations = [...destinations].sort();

        const freshnessLimit = new Date(Date.now() - ms(this.config.FLIGHT_CACHE_TTL));

        const record = await SerpapiStorage.findOne({
            "search_parameters.departure_id": sortedOrigins.length === 1 ? sortedOrigins[0] : sortedOrigins,
            "search_parameters.arrival_id": sortedDestinations.length === 1 ? sortedDestinations[0] : sortedDestinations,
            "search_parameters.outbound_date": date,
            createdAt: { $gte: freshnessLimit }
        }).sort({ createdAt: -1 }).lean();

        let response: SerpApiResponse;

        if (!record) {
            const params: ApiRequestParameters = {
                departure_id: sortedOrigins.length === 1 ? sortedOrigins[0]! : sortedOrigins,
                arrival_id: sortedDestinations.length === 1 ? sortedDestinations[0]! : sortedDestinations,
                outbound_date: date,
                type: 2,
                currency: "EUR",
                hl: "es",
                gl: "es",
            };

            response = await this.serpApiClient.search(params);
            try {
                await SerpapiStorage.create(response);
            } catch (error: any) {
                if (error.code !== 11000) {
                    throw error;
                }
            }
        } else {
            response = record as unknown as SerpApiResponse;
        }

        const allFlights: FlightRoute[] = [
            ...(response.best_flights || []),
            ...(response.other_flights || []),
        ];

        return allFlights
            .map((flight): DijkstraFlightEdge => {
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
                if (edge.price < current) {
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
                ...((record as any).best_flights || []),
                ...((record as any).other_flights || []),
            ];

            for (const flight of allFlights) {
                const first = flight.flights[0];
                const last = flight.flights[flight.flights.length - 1];
                const from = first.departure_airport.id;
                const to = last.arrival_airport.id;
                const key = `${from}|${to}|${date}`;
                const current = this.minPriceCache.get(key) ?? Infinity;
                if (flight.price < current) {
                    this.minPriceCache.set(key, flight.price);
                }
            }
        }
    }
    public async getAllFlights(departure: string, arrival: string, date: string): Promise<FlightRoute[]> {

        const freshnessLimit = new Date(Date.now() - ms(this.config.FLIGHT_CACHE_TTL));

        const record = await SerpapiStorage.findOne({
            "search_parameters.departure_id": departure,
            "search_parameters.arrival_id": arrival,
            "search_parameters.outbound_date": date,
            createdAt: { $gte: freshnessLimit }
        }).sort({ createdAt: -1 }).lean();

        if (!record) {
            const params: ApiRequestParameters = {
                departure_id: departure,
                arrival_id: arrival,
                outbound_date: date,
                type: 2,
                currency: "EUR",
                hl: "es",
                gl: "es",
            }
            const response = await this.serpApiClient.search(params);
            await SerpapiStorage.create(response);
            return [...(response.best_flights || []), ...(response.other_flights || [])];
        }

        return [
            ...(record.best_flights || []),
            ...(record.other_flights || []),
        ];
    }
}