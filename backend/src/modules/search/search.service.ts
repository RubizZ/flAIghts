import { singleton, inject } from "tsyringe";
import type { SearchRequest, SearchResponseData, LegResponse, EnrichedFlightEdge, SearchProgressEvent } from "./search.types.js";
import { Itinerary } from "./models/itinerary.model.js";
import { SerpApiClient } from "@/services/serpapi/serpapi.client.js";
import { Search, type ISearch } from "./models/search.model.js";
import "./models/itinerary.model.js"; // Necesario para .populate("itineraries")
import { SearchNotFoundError, SearchNotAuthorizedError } from "./search.errors.js";
import { SerpapiStorageService } from "../serpapi-storage/serpapi-storage.service.js";
import { Dijkstra, parseEdgeDateTime } from "@/algorithms/dijkstra.js";
import type { DijkstraFlightEdge, RoutePreferences, WeightCriteria } from "@/algorithms/dijkstra.js";
import { Yen } from "@/algorithms/yen.js";
import type { ApiRequestParameters, SerpApiResponse, FlightRoute } from "@/services/serpapi/serpapi.types.js";
import { AirportService } from "../airport/airport.service.js";
import { UserService } from "../users/user.service.js";
import type { IFriendUnpopulated } from "../users/models/user.model.js";
import { AuditService } from "../audit/audit.service.js";
import { GeneticTripOptimizer } from "@/algorithms/genetic-trip.js";
import logger from "@/utils/logger.js";



@singleton()
export class SearchService {
    constructor(
        @inject(SerpapiStorageService) private readonly storageService: SerpapiStorageService,
        @inject(AirportService) private readonly airportService: AirportService,
        @inject(SerpApiClient) private readonly serpApiClient: SerpApiClient,
        @inject(Dijkstra) private readonly dijkstra: Dijkstra,
        @inject(Yen) private readonly yen: Yen,
        @inject(UserService) private readonly userService: UserService,
        @inject(GeneticTripOptimizer) private readonly geneticOptimizer: GeneticTripOptimizer,
        @inject(AuditService) private readonly auditService: AuditService
    ) { }
    public async createSearch(data: SearchRequest & { user_id?: string }): Promise<SearchResponseData> {
        const createdData: Partial<ISearch> = { ...data };
        createdData.shared = !data.user_id;
        const search = await Search.create(createdData);

        // Ejecución desvinculada (background)
        void (async () => {
            for await (const _ of this.runExploration(search._id, data, data.user_id)) {
                // Consumimos el generador para que se ejecute la lógica
            }
        })();

        this.auditService.register({
            resource: "SEARCH",
            action: "CREATE",
            details: {
                id: search._id.toString(),
                origins: data.origins,
                destinations: data.destinations,
                departure_date: data.departure_date,
                return_date: data.return_date,
                criteria: data.criteria
            }
        });
        return this.formatSearchResponse(search.toJSON());
    }

    public async createGeneticSearch(data: { origin: string, cities: string[], startDate: Date, daysPerCity: number, user_id?: string }): Promise<SearchResponseData> {
        const createdData: Partial<ISearch> = {
            origins: [data.origin],
            destinations: data.cities,
            departure_date: data.startDate,
            criteria: { priority: "balanced" },
            user_id: data.user_id,
            shared: !data.user_id
        };
        const search = await Search.create(createdData);
        this.runGeneticTrip(search._id.toString(), data, data.user_id);
        return this.formatSearchResponse(search.toJSON());
    }

    public async *createSearchStream(data: SearchRequest & { user_id?: string }): AsyncGenerator<SearchProgressEvent> {
        const createdData: Partial<ISearch> = { ...data };
        createdData.shared = !data.user_id;
        const search = await Search.create(createdData);

        yield* this.runExploration(search._id, data);
    }

    public async createSearchBlocking(data: SearchRequest & { user_id?: string }): Promise<SearchResponseData> {
        const createdData: Partial<ISearch> = { ...data };
        createdData.shared = !data.user_id;
        const search = await Search.create(createdData);

        let finalData: SearchResponseData | undefined;
        for await (const event of this.runExploration(search._id, data)) {
            if (event.type === 'completed') {
                finalData = event.data;
            } else if (event.type === 'failed') {
                throw new Error(event.message);
            }
        }

        if (!finalData) throw new Error("La exploración no pudo completarse.");
        return finalData;
    }

    public async getSearch(searchId: string, requesterId: string | undefined): Promise<SearchResponseData> {
        const search = await Search.findById(searchId);

        if (search == null) {
            throw new SearchNotFoundError(searchId, requesterId ?? 'anonymous');
        }

        if (!search.shared && search.user_id !== requesterId) {
            throw new SearchNotAuthorizedError(searchId, requesterId ?? 'anonymous');
        }

        await search.populate("departure_itineraries");
        await search.populate("return_itineraries");

        return this.formatSearchResponse(search.toJSON());
    }

    public async shareSearch(searchId: string, requesterId: string): Promise<SearchResponseData> {
        const search = await Search.findById(searchId);

        if (search == null) {
            throw new SearchNotFoundError(searchId, requesterId);
        }

        if (search.user_id !== requesterId) {
            throw new SearchNotAuthorizedError(searchId, requesterId);
        }

        search.shared = true;
        await search.save();

        this.auditService.register({
            resource: "SEARCH",
            action: "SHARE",
            details: {
                id: searchId
            }
        });

        return this.formatSearchResponse(search.toJSON());
    }

    public async privatizeSearch(searchId: string, requesterId: string): Promise<SearchResponseData> {
        const search = await Search.findById(searchId);

        if (search == null) {
            throw new SearchNotFoundError(searchId, requesterId);
        }

        if (search.user_id !== requesterId) {
            throw new SearchNotAuthorizedError(searchId, requesterId);
        }

        search.shared = false;
        await search.save();

        this.auditService.register({
            resource: "SEARCH",
            action: "PRIVATIZE",
            details: {
                id: searchId
            }
        });

        return this.formatSearchResponse(search.toJSON());
    }



    public async *runExploration(searchId: string, criteria: SearchRequest, userId?: string): AsyncGenerator<SearchProgressEvent> {
        try {
            let userPreferences = {
                price_weight: 0.4,
                duration_weight: 0.2,
                stops_weight: 0.2,
                airline_quality_weight: 0.2
            };

            if (userId) {
                const targetUser = await this.userService.getUser(userId);
                if (targetUser && targetUser.preferences) {
                    userPreferences = {
                        price_weight: targetUser.preferences.price_weight,
                        duration_weight: targetUser.preferences.duration_weight,
                        stops_weight: targetUser.preferences.stops_weight,
                        airline_quality_weight: targetUser.preferences.airline_quality_weight
                    };
                }
            }
            yield { type: "progress", message: "Iniciando búsqueda de vuelos..." };

            const edgePool: EnrichedFlightEdge[] = [];

            const serpapiFlights = await this.getFlightsFromSerpApi(criteria, userId);
            const directEdges = serpapiFlights;
            edgePool.push(...directEdges);

            logger.info({ searchId, count: directEdges.length }, `[Search] Aristas directas recuperadas`);

            if (criteria.origins.length === 1 && criteria.destinations.length === 1) {
                yield { type: "progress", message: "Explorando combinaciones de vuelos candidatos..." };
                const manualEdges = await this.collectAvailableEdges(criteria, userPreferences, userId);
                edgePool.push(...manualEdges);
            }

            if (edgePool.length === 0) {
                logger.warn({ searchId }, `[Search] EdgePool vacío. Abortando.`);
                await Search.updateOne({ _id: searchId }, { status: "completed" });
                yield {
                    type: "completed",
                    message: "No se encontraron vuelos para los criterios seleccionados.",
                    data: await this.getSearch(searchId, userId)
                };
                return;
            }

            yield { type: "progress", message: "Calculando mejores rutas con algoritmo de Yen..." };

            const allOptimalPaths: DijkstraFlightEdge[][] = [];
            for (const origin of criteria.origins) {
                for (const destination of criteria.destinations) {
                    const [bestByPrice, bestByDuration, bestByCustom] = await Promise.all([
                        this.yen.findKPaths(origin, destination, edgePool, 15, "price", userPreferences),
                        this.yen.findKPaths(origin, destination, edgePool, 15, "duration", userPreferences),
                        this.yen.findKPaths(origin, destination, edgePool, 15, "custom", userPreferences)
                    ]);
                    allOptimalPaths.push(...bestByPrice, ...bestByDuration, ...bestByCustom);
                }
            }

            logger.info({
                searchId,
                pathsCount: allOptimalPaths.length,
                totalEdges: edgePool.length
            }, `[Search] Resultados consolidados de algoritmos de Yen para múltiples orígenes/destinos`);

            const uniqueItineraryIds = await this.saveOptimalPathsAsItineraries(allOptimalPaths, userPreferences);

            await Search.findByIdAndUpdate(
                searchId,
                {
                    status: criteria.return_date ? "searching" : "completed",
                    departure_itineraries: uniqueItineraryIds
                }
            );

            if (criteria.return_date) {
                yield { type: "progress", message: "Buscando vuelos de vuelta..." };

                const returnCriteria: SearchRequest = {
                    ...criteria,
                    origins: criteria.destinations,
                    destinations: criteria.origins,
                    departure_date: criteria.return_date,
                    return_date: undefined
                };

                const returnEdgePool: EnrichedFlightEdge[] = [];
                const rSerpapiFlights = await this.getFlightsFromSerpApi(returnCriteria, userId);
                returnEdgePool.push(...rSerpapiFlights);

                if (returnCriteria.origins.length === 1 && returnCriteria.destinations.length === 1) {
                    yield { type: "progress", message: "Explorando combinaciones de vuelta..." };
                    const rManualEdges = await this.collectAvailableEdges(returnCriteria, userPreferences, userId);
                    returnEdgePool.push(...rManualEdges);
                }

                const rAllOptimalPaths: DijkstraFlightEdge[][] = [];
                for (const org of returnCriteria.origins) {
                    for (const dest of returnCriteria.destinations) {
                        const [rBestByPrice, rBestByDuration, rBestByCustom] = await Promise.all([
                            this.yen.findKPaths(org, dest, returnEdgePool, 5, "price", userPreferences),
                            this.yen.findKPaths(org, dest, returnEdgePool, 5, "duration", userPreferences),
                            this.yen.findKPaths(org, dest, returnEdgePool, 5, "custom", userPreferences)
                        ]);
                        rAllOptimalPaths.push(...rBestByPrice, ...rBestByDuration, ...rBestByCustom);
                    }
                }

                const rUniqueItineraryIds = await this.saveOptimalPathsAsItineraries(rAllOptimalPaths, userPreferences);

                await Search.findByIdAndUpdate(searchId, {
                    status: "completed",
                    return_itineraries: rUniqueItineraryIds
                });
            }

            const finalSearch = await Search.findById(searchId)
                .populate("departure_itineraries")
                .populate("return_itineraries");

            yield { type: "progress", message: "Resultados obtenidos y procesados.", data: undefined };

            if (finalSearch) {
                yield {
                    type: "completed",
                    message: "Exploración finalizada con éxito.",
                    data: this.formatSearchResponse(finalSearch.toJSON() as any)
                };
            }

        } catch (error: any) {
            logger.error({ error, searchId }, `Error en exploración ${searchId}`);

            await Search.updateOne(
                { _id: searchId },
                {
                    status: "failed",
                    $set: { last_error: error.message || String(error) }
                }
            );

            yield { type: "failed", message: error.message || "Error interno durante la exploración." };
        }
    }




    public async getSearches(userId: string, requesterId: string | undefined, page: number = 1, limit: number = 10): Promise<{ items: SearchResponseData[], total: number, page: number, totalPages: number }> {
        const targetUser = await this.userService.getUser(userId);
        if (!targetUser) throw new SearchNotFoundError(userId, requesterId ?? 'anonymous');

        const isOwner = requesterId === userId;
        const isFriend = targetUser.friends.some((f: IFriendUnpopulated) => f.user === requesterId);

        // Si el perfil es privado, solo sus amigos o el propio dueño pueden ver sus búsquedas (y solo las públicas).
        if (!targetUser.public && !isOwner && !isFriend) {
            throw new SearchNotAuthorizedError(userId, requesterId ?? 'anonymous');
        }

        const skip = (page - 1) * limit;
        const query = {
            user_id: userId,
            // Solo el dueño puede ver sus búsquedas NO compartidas. Todos los demás ven SOLO las compartidas.
            ...(!isOwner ? { shared: true } : {})
        };

        const [searches, total] = await Promise.all([
            Search.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),
            Search.countDocuments(query)
        ]);

        return {
            items: searches.map(s => this.formatSearchResponse(s.toJSON())),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    private formatSearchResponse(data: ISearch): SearchResponseData {
        return {
            ...data,
            created_at: data.created_at instanceof Date ? data.created_at.toISOString() : data.created_at,
            departure_itineraries: data.departure_itineraries?.map((itinerary) => ({
                ...itinerary,
                created_at: itinerary.created_at instanceof Date ? itinerary.created_at.toISOString() : itinerary.created_at
            })),
            return_itineraries: data.return_itineraries?.map((itinerary) => ({
                ...itinerary,
                created_at: itinerary.created_at instanceof Date ? itinerary.created_at.toISOString() : itinerary.created_at
            }))
        };
    }

    private async getFlightsFromSerpApi(criteria: SearchRequest, userId?: string): Promise<EnrichedFlightEdge[]> {
        const flights = await this.storageService.getAllFlights(criteria, undefined, userId);
        const outboundDate = new Date(criteria.departure_date).toISOString().split("T")[0]!;
        return this.mapResponseToEdges(flights, outboundDate);
    }


    private async collectAvailableEdges(criteria: SearchRequest, preferences: RoutePreferences, userId?: string): Promise<EnrichedFlightEdge[]> {
        const origin = criteria.origins[0]!;
        const destination = criteria.destinations[0]!;
        const allEdges: EnrichedFlightEdge[] = [];

        const departureDate = new Date(criteria.departure_date);
        const dateStr = departureDate.toISOString().split("T")[0]!;
        const nextDayStr = addDays(dateStr, 1);

        const layovers = await this.airportService.getCandidateLayovers(origin, destination);
        logger.info({ origin, destination, count: layovers.length }, `[Search] Layovers candidatos encontrados`);
        if (layovers.length > 0) {
            const batchSize = 7;
            for (let i = 0; i < layovers.length; i += batchSize) {
                const batch = layovers.slice(i, i + batchSize);
                const batchStr = batch.join(",");

                try {
                    const [legs1Batch, legs2TodayBatch, legs2NextDayBatch] = await Promise.all([
                        this.storageService.getAllFlights(criteria, { departure_id: origin, arrival_id: batchStr, stops: 1 }, userId),
                        this.storageService.getAllFlights(criteria, { departure_id: batchStr, arrival_id: destination, outbound_date: dateStr, stops: 1 }, userId),
                        this.storageService.getAllFlights(criteria, { departure_id: batchStr, arrival_id: destination, outbound_date: nextDayStr, stops: 1 }, userId)
                    ]);

                    allEdges.push(...this.mapResponseToEdges(legs1Batch, dateStr));
                    allEdges.push(...this.mapResponseToEdges(legs2TodayBatch, dateStr));
                    allEdges.push(...this.mapResponseToEdges(legs2NextDayBatch, nextDayStr));
                } catch (error) {
                    logger.error({ error, batch }, `Error recolectando aristas layover: ${batchStr}`);
                }
            }
        }

        if (preferences.stops_weight <= 0.1) {
            try {
                const hubs1 = await this.airportService.getHubsNear(origin, 3000, 14);
                const hubs2 = await this.airportService.getHubsNear(destination, 3000, 14);
                logger.info({ origin, hubs1: hubs1.length, destination, hubs2: hubs2.length }, `[Search] hubs cercanos encontrados (Pinza)`);

                if (hubs1.length > 0 && hubs2.length > 0) {
                    const [edgesLeg1, todayEdges, tomorrowEdges, edgesLeg2, edgesLeg2NextDay] = await Promise.all([
                        this.storageService.getBatchedFlightEdges([origin], hubs1, dateStr, userId),
                        this.storageService.getBatchedFlightEdges(hubs2, [destination], dateStr, userId),
                        this.storageService.getBatchedFlightEdges(hubs2, [destination], nextDayStr, userId),
                        this.storageService.getBatchedFlightEdges(hubs1, hubs2, dateStr, userId),
                        this.storageService.getBatchedFlightEdges(hubs1, hubs2, nextDayStr, userId)
                    ]);

                    allEdges.push(...(edgesLeg1 as EnrichedFlightEdge[]));
                    allEdges.push(...(todayEdges as EnrichedFlightEdge[]));
                    allEdges.push(...(tomorrowEdges as EnrichedFlightEdge[]));
                    allEdges.push(...(edgesLeg2 as EnrichedFlightEdge[]));
                    allEdges.push(...(edgesLeg2NextDay as EnrichedFlightEdge[]));
                }
            } catch (error) {
                logger.error({ error }, "Error recolectando aristas de Hubs");
            }
        } else {
            logger.info({ stops_weight: preferences.stops_weight }, `[Search] Omitiendo Algoritmo de Pinza por alta importancia de escalas`);
        }

        return allEdges;
    }


    private async saveOptimalPathsAsItineraries(paths: DijkstraFlightEdge[][], preferences: RoutePreferences): Promise<string[]> {
        const itineraryIds: string[] = [];

        if (paths.length === 0) return [];

        const pathData = paths.map(path => {
            let totalPrice = 0;
            let totalDuration = 0;
            let totalWaitTime = 0;
            const stops = path.length - 1;

            for (let i = 0; i < path.length; i++) {
                const edge = path[i]!;
                totalPrice += edge.price;
                if (i > 0) {
                    const prevArrival = parseEdgeDateTime(path[i - 1]!.arrival_time);
                    const currDeparture = parseEdgeDateTime(edge.departure_time);
                    const wait = Math.max(0, Math.round((currDeparture.getTime() - prevArrival.getTime()) / 60000));
                    totalWaitTime += wait;
                }
                totalDuration += edge.duration;
            }

            const totalJourneyDuration = totalDuration + totalWaitTime;
            const weightedCost = (totalPrice * preferences.price_weight) +
                (totalJourneyDuration * preferences.duration_weight) +
                (stops * 100 * preferences.stops_weight);

            return {
                path,
                totalPrice,
                totalJourneyDuration,
                totalWaitTime,
                weightedCost,
                stops,
                key: path.map(e => e.id).join("|")
            };
        });

        const uniquePaths = [];
        const seen = new Set();
        for (const p of pathData) {
            if (!seen.has(p.key)) {
                seen.add(p.key);
                uniquePaths.push(p);
            }
        }

        const costs = uniquePaths.map(p => p.weightedCost);
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const costRange = maxCost - minCost;

        for (const p of uniquePaths) {
            let score = 10;
            if (costRange > 0) {
                score = 10 * (1 - (p.weightedCost - minCost) / costRange);
                score = Math.max(1, Math.round(score * 10) / 10);
            }

            const legs: any[] = [];
            const cityOrder: string[] = [];
            let currentOrder = 0;
            let previousArrivalTime: string | null = null;

            for (let i = 0; i < p.path.length; i++) {
                const edge = p.path[i]! as EnrichedFlightEdge;

                if (edge.segments && edge.segments.length > 0) {
                    for (let sIndex = 0; sIndex < edge.segments.length; sIndex++) {
                        const seg = edge.segments[sIndex]!;

                        let waitTime = 0;
                        if (previousArrivalTime) {
                            const prevArr = parseEdgeDateTime(previousArrivalTime);
                            const currDep = parseEdgeDateTime(seg.departure_airport.time);
                            waitTime = Math.max(0, Math.round((currDep.getTime() - prevArr.getTime()) / 60000));
                        }

                        if (cityOrder.length === 0) {
                            cityOrder.push(seg.departure_airport.id);
                        }
                        cityOrder.push(seg.arrival_airport.id);

                        legs.push({
                            order: currentOrder++,
                            flight_id: edge.id,
                            origin: seg.departure_airport.id,
                            destination: seg.arrival_airport.id,
                            price: sIndex === 0 ? edge.price : 0,
                            duration: seg.duration,
                            airline: seg.airline,
                            airline_logo: seg.airline_logo ?? "",
                            departure_time: seg.departure_airport.time,
                            arrival_time: seg.arrival_airport.time,
                            wait_time: waitTime,
                            airplane: seg.airplane,
                            flight_number: seg.flight_number,
                            travel_class: seg.travel_class,
                            booking_token: edge.id,
                            extensions: seg.extensions
                        });
                        previousArrivalTime = seg.arrival_airport.time;
                    }
                } else {
                    let waitTime = 0;
                    if (previousArrivalTime) {
                        const prevArr = parseEdgeDateTime(previousArrivalTime);
                        const currDep = parseEdgeDateTime(edge.departure_time);
                        waitTime = Math.max(0, Math.round((currDep.getTime() - prevArr.getTime()) / 60000));
                    }

                    if (cityOrder.length === 0) {
                        cityOrder.push(edge.from);
                    }
                    cityOrder.push(edge.to);

                    legs.push({
                        order: currentOrder++,
                        flight_id: edge.id,
                        origin: edge.from,
                        destination: edge.to,
                        price: edge.price,
                        duration: edge.duration,
                        airline: edge.airline,
                        airline_logo: edge.airline_logo,
                        departure_time: edge.departure_time,
                        arrival_time: edge.arrival_time,
                        wait_time: waitTime,
                        airplane: edge.airplane,
                        flight_number: edge.flight_number,
                        travel_class: edge.travel_class,
                        booking_token: edge.id,
                        extensions: edge.extensions
                    });
                    previousArrivalTime = edge.arrival_time;
                }
            }

            const itinerary = await Itinerary.create({
                score: score,
                total_price: p.totalPrice,
                total_duration: p.totalJourneyDuration,
                city_order: cityOrder,
                legs: legs
            });
            itineraryIds.push(itinerary._id.toString());
        }

        return itineraryIds;
    }


    private mapResponseToEdges(flights: FlightRoute[], outboundDate: string): EnrichedFlightEdge[] {
        return flights.map((flight): EnrichedFlightEdge => {
            const firstSegment = flight.flights[0];
            const lastSegment = flight.flights[flight.flights.length - 1];

            return {
                id: flight.booking_token,
                from: firstSegment!.departure_airport.id,
                to: lastSegment!.arrival_airport.id,
                price: flight.price,
                duration: flight.total_duration,
                stops: flight.layovers ? flight.layovers.length : 0,
                date: outboundDate,
                airline: firstSegment!.airline,
                airline_logo: firstSegment!.airline_logo ?? "",
                departure_time: firstSegment!.departure_airport.time,
                arrival_time: lastSegment!.arrival_airport.time,
                airplane: firstSegment!.airplane,
                flight_number: firstSegment!.flight_number,
                travel_class: firstSegment!.travel_class,
                departure_token: flight.departure_token,
                extensions: firstSegment!.extensions,
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
        });
    }

    private async runGeneticTrip(searchId: string, data: { origin: string, cities: string[], startDate: Date, daysPerCity: number }, userId?: string) {
        logger.info({ searchId, origin: data.origin, cities: data.cities, startDate: data.startDate, daysPerCity: data.daysPerCity }, `[Genetic] Iniciando runGeneticTrip`);
        try {
            const result = await this.geneticOptimizer.findBestTrip(
                data.origin,
                data.cities,
                data.startDate,
                data.daysPerCity
            );

            if (!result || !result.route || result.route.length === 0) {
                logger.warn({ searchId }, `[Genetic] GA no devolvió ruta válida (resultado vacío)`);
                await Search.updateOne({ _id: searchId }, { status: "failed" });
                return;
            }

            // Si el coste es Infinity, ningún cromosoma encontró ruta completa válida
            if (result.cost === Infinity) {
                logger.warn({ searchId, route: result.route }, `[Genetic] GA devolvió coste Infinity — no existe ruta completa con datos disponibles`);
                await Search.updateOne({ _id: searchId }, { status: "failed" });
                return;
            }

            logger.info({ searchId, route: result.route, cost: result.cost }, `[Genetic] Mejor ruta encontrada`);

            const legs: any[] = [];
            let currentPrice = 0;
            let currentDuration = 0;
            let currentOrder = 0;

            for (let i = 0; i < result.route.length - 1; i++) {
                const from = result.route[i]!;
                const to = result.route[i + 1]!;
                const date = addDays(data.startDate.toISOString().split("T")[0]!, data.daysPerCity * i);

                logger.debug({ searchId, from, to, date, leg: i }, `[Genetic] Buscando vuelo para tramo`);
                const edges = await this.storageService.getFlightEdges([from], [to], date, userId);

                if (edges.length === 0) {
                    logger.error({ searchId, from, to, date, leg: i }, `[Genetic] Sin vuelos para el tramo ${from}→${to}@${date}`);
                    await Search.updateOne({ _id: searchId }, { status: "failed" });
                    return;
                }

                const bestEdge = edges.reduce((min, cur) => cur.price < min.price ? cur : min, edges[0]!) as EnrichedFlightEdge;
                logger.debug({ searchId, from, to, date, price: bestEdge.price, id: bestEdge.id }, `[Genetic] Tramo resuelto`);

                currentPrice += bestEdge.price;
                // La duración total del itinerario genético es la suma de las duraciones de los vuelos
                // más el tiempo de estancia en las ciudades (daysPerCity).
                currentDuration += bestEdge.duration;

                const segments = bestEdge.segments;
                if (segments && segments.length > 0) {
                    for (let sIndex = 0; sIndex < segments.length; sIndex++) {
                        const seg = segments[sIndex]!;
                        let wait_time = 0;
                        if (sIndex > 0) {
                            const prevSegment = segments[sIndex - 1]!;
                            const prevArrival = parseEdgeDateTime(prevSegment.arrival_airport.time);
                            const currDeparture = parseEdgeDateTime(seg.departure_airport.time);
                            wait_time = Math.max(0, Math.round((currDeparture.getTime() - prevArrival.getTime()) / 60000));
                        } else if (i > 0) {
                            // Este es el primer segmento de un vuelo intermedio.
                            // El "tiempo de espera" aquí es en realidad la estancia en la ciudad anterior.
                            // Lo ponemos en minutos para mantener consistencia, aunque sean días.
                            wait_time = data.daysPerCity * 24 * 60;
                        }

                        legs.push({
                            order: currentOrder++,
                            flight_id: bestEdge.id,
                            origin: seg.departure_airport.id,
                            destination: seg.arrival_airport.id,
                            price: sIndex === 0 ? bestEdge.price : 0,
                            duration: seg.duration,
                            airline: seg.airline,
                            airline_logo: seg.airline_logo ?? "",
                            departure_time: seg.departure_airport.time,
                            arrival_time: seg.arrival_airport.time,
                            wait_time: wait_time,
                            airplane: seg.airplane,
                            flight_number: seg.flight_number,
                            travel_class: seg.travel_class,
                            booking_token: bestEdge.id,
                            extensions: seg.extensions,
                        });
                    }
                } else {
                    let wait_time = 0;
                    if (i > 0) {
                        wait_time = data.daysPerCity * 24 * 60;
                    }

                    legs.push({
                        order: currentOrder++,
                        flight_id: bestEdge.id,
                        origin: bestEdge.from,
                        destination: bestEdge.to,
                        price: bestEdge.price,
                        duration: bestEdge.duration,
                        airline: bestEdge.airline,
                        airline_logo: bestEdge.airline_logo ?? "",
                        departure_time: bestEdge.departure_time,
                        arrival_time: bestEdge.arrival_time,
                        wait_time: wait_time,
                        airplane: bestEdge.airplane,
                        flight_number: bestEdge.flight_number,
                        travel_class: bestEdge.travel_class,
                        booking_token: bestEdge.id,
                        extensions: bestEdge.extensions,
                    });
                }
            }

            const itinerary = await Itinerary.create({
                total_price: currentPrice,
                total_duration: currentDuration,
                legs: legs,
                city_order: result.route,
                score: 10,
                created_at: new Date()
            });

            logger.info({ searchId, itineraryId: itinerary._id, totalPrice: currentPrice }, `[Genetic] Itinerario creado correctamente`);

            await Search.updateOne(
                { _id: searchId },
                {
                    status: "completed",
                    $push: { departure_itineraries: itinerary._id }
                }
            );

        } catch (error: any) {
            logger.error({ error, searchId, message: error?.message, stack: error?.stack }, `[Genetic] Error inesperado en runGeneticTrip`);
            await Search.updateOne({ _id: searchId }, { status: "failed" });
        }
    }

}
function addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0]!;
}



