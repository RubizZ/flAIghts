import type { FlightRoute, ApiRequestParameters } from "../../services/serpapi/serpapi.types.js";
import { singleton, inject } from "tsyringe";
import { SerpapiStorage } from "./serpapi-storage.model.js";
import { SerpApiClient } from "../../services/serpapi/serpapi.client.js";

@singleton()
export class SerpapiStorageService {
    constructor(
        @inject(SerpApiClient) private readonly serpApiClient: SerpApiClient
    ) {}

    private get CACHE_TTL_HOURS() {
        return Number(process.env.FLIGHT_CACHE_TTL_HOURS) || 24;
    }

    public async getAllFlights(departure: string, arrival: string, date: string): Promise<FlightRoute[]> {
        
        const freshnessLimit = new Date();
        freshnessLimit.setHours(freshnessLimit.getHours() - this.CACHE_TTL_HOURS);

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

        // Concatenate best flights and other flights
        const allFlights: FlightRoute[] = [
            ...(record.best_flights || []), 
            ...(record.other_flights || [])
        ];

        return allFlights;
    }
}