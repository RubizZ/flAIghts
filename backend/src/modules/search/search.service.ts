import { singleton, inject } from "tsyringe";
import type { SearchRequest, SearchResponseData, LegResponse, EnrichedFlightEdge, SearchProgressEvent } from "./search.types.js";
import type { SearchRequest, SearchResponseData, LegResponse } from "./search.types.js";
import { Itinerary } from "./models/itinerary.model.js";
import { Search, type ISearch } from "./models/search.model.js";
import "./models/itinerary.model.js"; // Necesario para .populate("itineraries")
import { SearchNotFoundError, SearchNotAuthorizedError } from "./search.errors.js";
import { SerpapiStorageService } from "../serpapi-storage/serpapi-storage.service.js";
import { Dijkstra, parseEdgeDateTime } from "@/algorithms/dijkstra.js";
import type { DijkstraFlightEdge, RoutePreferences } from "@/algorithms/dijkstra.js";
import { AirportService } from "../airport/airport.service.js";
import { UserService } from "../users/user.service.js";
import type { IFriendUnpopulated } from "../users/models/user.model.js";
import { GeneticTripOptimizer } from "@/algorithms/genetic-trip.js";
import { AuditService } from "../audit/audit.service.js";
import logger from "@/utils/logger.js";



@singleton()
export class SearchService {
    constructor(
        @inject(SerpapiStorageService) private readonly storageService: SerpapiStorageService,
        @inject(AirportService) private readonly airportService: AirportService,
        @inject(Dijkstra) private readonly dijkstra: Dijkstra,
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
            for await (const _ of this.runExploration(search._id, data)) {
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
                dates: data.dates,
                criteria: data.criteria
            }
        });
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
        this.runGeneticTrip(search._id, data);
        return this.formatSearchResponse(search.toJSON());
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

    public async *runExploration(searchId: string, criteria: SearchRequest): AsyncGenerator<SearchProgressEvent> {
    private async runExploration(searchId: string, criteria: SearchRequest & { user_id?: string }) {
        try {
            let userPreferences: RoutePreferences = {
                price_weight: 0.4,
                duration_weight: 0.2,
                stops_weight: 0.2,
                airline_quality_weight: 0.2
            };

            if (criteria.user_id) {
                const targetUser = await this.userService.getUser(criteria.user_id);
                if (targetUser && targetUser.preferences) {
                    userPreferences = {
                        price_weight: targetUser.preferences.price_weight,
                        duration_weight: targetUser.preferences.duration_weight,
                        stops_weight: targetUser.preferences.stops_weight,
                        airline_quality_weight: targetUser.preferences.airline_quality_weight
                    };
                }
            }

            // OUTBOUND ITINERARY
            const sequenceOutbound = [criteria.origins[0], ...criteria.destinations].filter((node): node is string => !!node);
            const currentDateOutbound = criteria.departure_date instanceof Date
                ? criteria.departure_date.toISOString().split("T")[0]!
                : new Date(criteria.departure_date).toISOString().split("T")[0]!;

            const outboundItinerary = await this.calculateAndSaveItinerary(sequenceOutbound, criteria.dates ?? [], currentDateOutbound, userPreferences);

            if (!outboundItinerary) {
                logger.warn(`Tramo outbound inalcanzable para búsqueda ${searchId}`);
                await Search.updateOne({ _id: searchId }, { status: "failed" });
                this.auditService.register({
                    resource: "SEARCH",
                    action: "FAIL",
                    details: { id: searchId }
                });
                return;
            }

            await Search.updateOne(
                { _id: searchId },
                {
                    status: criteria.return_date ? "searching" : "completed",
                    $push: { departure_itineraries: outboundItinerary._id }
                }
            );

            // RETURN ITINERARY
            if (criteria.return_date) {
                const origin = criteria.origins[0];
                const destination = criteria.destinations[criteria.destinations.length - 1];

                if (origin && destination) {
                    const sequenceReturn = [destination, origin];
                    const currentDateReturn = criteria.return_date instanceof Date
                        ? criteria.return_date.toISOString().split("T")[0]!
                        : new Date(criteria.return_date).toISOString().split("T")[0]!;

                    const returnItinerary = await this.calculateAndSaveItinerary(sequenceReturn, [], currentDateReturn, userPreferences);

                    if (returnItinerary) {
                        await Search.updateOne(
                            { _id: searchId },
                            {
                                status: "completed",
                                $push: { return_itineraries: returnItinerary._id }
                            }
                        );
                    } else {
                        await Search.updateOne({ _id: searchId }, { status: "completed" });
                    }
                } else {
                    await Search.updateOne({ _id: searchId }, { status: "completed" });
                }
            }

            this.auditService.register({
                resource: "SEARCH",
                action: "COMPLETE",
                details: {
                    id: searchId,
                    itinerary_id: outboundItinerary._id.toString()
                }
            });

        } catch (error) {
            logger.error({ error, searchId }, `Error en exploración ${searchId}`);
            await Search.updateOne({ _id: searchId }, { status: "failed" });
        }
    }

    private async calculateAndSaveItinerary(sequence: string[], dates: string[], startDate: string, userPreferences: RoutePreferences) {
        try {
            const fullPath: DijkstraFlightEdge[] = [];
            let previousArrival: Date | undefined = undefined;
            let currentDate = startDate;

            for (let i = 0; i < totalSteps; i++) {
                const puntoA = sequence[i];
                const puntoB = sequence[i + 1];
                const edges: DijkstraFlightEdge[] = [];

                if (!puntoA || !puntoB) continue;

                yield {
                    type: "progress",
                        message: `Buscando la mejor ruta de ${puntoA} a ${puntoB}...`,
                            step: i + 1,
                                total_steps: totalSteps
                };

                const searchDate = (i === 0 ? currentDate : dates[i - 1]) ?? currentDate;

                const candidatos = await this.airportService.getCandidateLayovers(puntoA, puntoB);

                const layoverOrigins = candidatos.length > 0 ? candidatos : [puntoA];
                const fetchLayoverConnections = userPreferences.stops_weight <= 0.4 && candidatos.length > 1;

                const fetchPromises = [
                    this.getFlightsFromSerpApi([puntoA], candidatos.length > 0 ? candidatos : [puntoB], searchDate),
                    this.getFlightsFromSerpApi(layoverOrigins, [puntoB], searchDate),
                    this.getFlightsFromSerpApi(layoverOrigins, [puntoB], addDays(searchDate, 1)),
                    this.getFlightsFromSerpApi([puntoA], [puntoB], searchDate)
                ];

                if (fetchLayoverConnections) {
                    fetchPromises.push(
                        this.getFlightsFromSerpApi(candidatos, candidatos, searchDate),
                        this.getFlightsFromSerpApi(candidatos, candidatos, addDays(searchDate, 1))
                    );
                }

                const results = await Promise.all(fetchPromises);

                for (const resultEdges of results) {
                    edges.push(...resultEdges.filter(edge => isValidNextFlight(edge.date, searchDate)));
                }

                const tramo = this.dijkstra.findPath(puntoA, puntoB, edges, userPreferences, previousArrival);

                if (!tramo) {
                    logger.warn(`Tramo inalcanzable: ${puntoA} -> ${puntoB} para búsqueda ${searchId}`);
                    await Search.updateOne({ _id: searchId }, { status: "failed" });
                    yield { type: "failed", message: `No se encontró una ruta válida entre ${puntoA} y ${puntoB}.` };
                    this.auditService.register({
                        resource: "SEARCH",
                        action: "FAIL",
                        details: {
                            id: searchId
                        }
                    });
                    return;
                }
                currentDate = tramo[tramo.length - 1]!.date;


                fullPath.push(...(tramo as EnrichedFlightEdge[]));
                return null;
            }
            const lastEdge = tramo[tramo.length - 1]!;
            currentDate = lastEdge.date;
            previousArrival = parseEdgeDateTime(lastEdge.arrival_time);

            fullPath.push(...tramo);
        }

            if (fullPath.length > 0) {
            let totalPrice = 0;
            let totalDuration = 0;
            const legs: LegResponse[] = [];
            let previousArrivalLeg: Date | null = null;

            for (let i = 0; i < fullPath.length; i++) {
                const edge = fullPath[i];
                totalPrice += edge!.price;

                const depart = parseEdgeDateTime(edge!.departure_time);
                const arrive = parseEdgeDateTime(edge!.arrival_time);

                let wait = 0;
                if (previousArrivalLeg) {
                    wait = Math.max(0, (depart.getTime() - previousArrivalLeg.getTime()) / 60000);
                }

                totalDuration += edge!.duration + wait;

                legs.push({
                    order: i + 1,
                    flight_id: edge!.id,
                    origin: edge!.from,
                    destination: edge!.to,
                    price: edge!.price,
                    duration: edge!.duration,
                    airline: edge!.airline,
                    airline_logo: edge!.airline_logo ?? "",
                    departure_time: edge!.departure_time,
                    arrival_time: edge!.arrival_time,
                    wait_time: wait,
                    airplane: edge!.airplane,
                    flight_number: edge!.flight_number,
                    travel_class: edge!.travel_class,
                    extensions: edge!.extensions,
                });

                previousArrivalLeg = arrive;
            }

            return await Itinerary.create({
                total_price: totalPrice,
                total_duration: totalDuration,
                legs: legs,
                city_order: sequence,
                score: 10,
                created_at: new Date()
            });
        }
        return null;
    } catch(error) {
        logger.error({ error }, `Error en cálculo de itinerario`);
        return null;
    }
}

    private async runGeneticTrip(searchId: string, data: { origin: string, cities: string[], startDate: Date, daysPerCity: number }) {
    try {
        const result = await this.geneticOptimizer.findBestTrip(
            data.origin,
            data.cities,
            data.startDate,
            data.daysPerCity
        );

        if (!result || !result.route || result.route.length === 0) {
            await Search.updateOne({ _id: searchId }, { status: "failed" });
            return;
        }


        const legs: LegResponse[] = [];
        let currentPrice = 0;
        let currentDuration = 0;

        for (let i = 0; i < result.route.length - 1; i++) {
            const from = result.route[i]!;
            const to = result.route[i + 1]!;
            const date = addDays(data.startDate.toISOString().split("T")[0]!, data.daysPerCity * i);

            const edges = await this.storageService.getFlightEdges([from], [to], date);
            if (edges.length === 0) {
                await Search.updateOne({ _id: searchId }, { status: "failed" });
                return;
            }
            const bestEdge = edges.reduce((min, cur) => cur.price < min.price ? cur : min, edges[0]!);

            currentPrice += bestEdge.price;
            currentDuration += bestEdge.duration;

            legs.push({
                order: i + 1,
                flight_id: bestEdge.id,
                origin: bestEdge.from,
                destination: bestEdge.to,
                price: bestEdge.price,
                duration: bestEdge.duration,
                airline: bestEdge.airline,
                airline_logo: bestEdge.airline_logo ?? "",
                departure_time: bestEdge.departure_time,
                arrival_time: bestEdge.arrival_time,
                wait_time: 0, // For now, we don't calculate wait times for genetic trip legs
                airplane: bestEdge.airplane,
                flight_number: bestEdge.flight_number,
                travel_class: bestEdge.travel_class,
                extensions: bestEdge.extensions,
            });
        }

        const itinerary = await Itinerary.create({
            total_price: currentPrice,
            total_duration: currentDuration,
            legs: legs,
            city_order: result.route,
            score: 10,
            created_at: new Date()
        });

        const updatedSearch = await Search.findByIdAndUpdate(
            searchId,
            {
                status: "completed",
                $push: { departure_itineraries: itinerary._id }
            },
            { new: true }
        ).populate("departure_itineraries").populate("return_itineraries");

        if (!updatedSearch) throw new Error("Search not found after update");

        const responseData = this.formatSearchResponse(updatedSearch.toJSON());

                yield {
            type: "completed",
                message: "Búsqueda finalizada con éxito.",
                    data: responseData
        };

        this.auditService.register({
            resource: "SEARCH",
            action: "COMPLETE",
            details: {
                id: searchId,
                itinerary_id: itinerary._id.toString()
            }
        });

    } else {
        await Search.updateOne({ _id: searchId }, { status: "failed" });
                yield { type: "failed", message: "No se encontraron vuelos para esta ruta." };
    }
    await Search.updateOne(
        { _id: searchId },
        {
            status: "completed",
            $push: { departure_itineraries: itinerary._id }
        }
    );
    await Search.updateOne(
        { _id: searchId },
        {
            status: "completed",
            $push: { departure_itineraries: itinerary._id }
        }
    );

} catch (error: any) {
    logger.error({ error, searchId }, `Error en exploración ${searchId}`);
} catch (error) {
    await Search.updateOne({ _id: searchId }, { status: "failed" });
            yield { type: "failed", message: error.message || "Error interno durante la exploración." };
}
    }

    public async getSearches(userId: string, requesterId: string | undefined, page: number = 1, limit: number = 10): Promise < { items: SearchResponseData[], total: number, page: number, totalPages: number } > {
    const targetUser = await this.userService.getUser(userId);
    if(!targetUser) throw new SearchNotFoundError(userId, requesterId ?? 'anonymous');

    const isOwner = requesterId === userId;
    const isFriend = targetUser.friends.some((f: IFriendUnpopulated) => f.user === requesterId);

    // Si el perfil es privado, solo sus amigos o el propio dueño pueden ver sus búsquedas (y solo las públicas).
    if(!targetUser.public && !isOwner && !isFriend) {
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

    private async getFlightsFromSerpApi(origin: string[], destination: string[], date: string): Promise < DijkstraFlightEdge[] > {
    return this.storageService.getFlightEdges(origin, destination, date);
    return this.storageService.getFlightEdges(origin, destination, date);
}
}



function isValidNextFlight(flightDate: string, minDate: string): boolean {
    return new Date(flightDate) >= new Date(minDate);
}

function addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0]!;
}
