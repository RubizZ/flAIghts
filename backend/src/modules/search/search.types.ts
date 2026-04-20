import type { AirportResponse } from "../airport/airport.types.js";
import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse, BodyPath } from "../../utils/responses.js";
import type { DijkstraFlightEdge } from "@/algorithms/dijkstra.js";

export interface SearchRequest {
    /**
     * @minItems 1
     * @pattern ^[A-Z]{3}$
     */
    origins: string[];
    /**
     * @minItems 1
     * @pattern ^[A-Z]{3}$
     */
    destinations: string[];
    /**
     * @isDateTime Fecha de ida (YYYY-MM-DD o formato ISO)
     */
    departure_date: Date;
    /**
     * @isDateTime Fecha de vuelta (si es round_trip)
     */
    return_date?: Date;
    criteria: {
        priority: "balanced" | "cheap" | "fast";
        /**
         * @minimum 0
         */
        max_price?: number;
    };

    dates?: string[];
    source?: "manual" | "agent";
}

export interface GeneticTripRequest {
    /**
     * @pattern ^[A-Z]{3}$
     */
    origin: string;
    /**
     * @minItems 1
     * @pattern ^[A-Z]{3}$
     */
    cities: string[];
    /**
     * @isDateTime Fecha de inicio del viaje
     */
    startDate: Date;
    /**
     * @minimum 1
     */
    daysPerCity: number;
}

export interface LegResponse {
    order: number;
    flight_id: string;
    origin: string;
    destination: string;
    price: number;
    duration: number;
    airline: string;
    airline_logo?: string;
    departure_time: string;
    arrival_time: string;
    wait_time?: number;
    airplane: string;
    flight_number: string;
    travel_class: string;
    extensions?: string[];
}

export interface ItineraryResponse {
    score: number;
    total_price: number;
    total_duration: number;
    city_order: string[];
    legs: LegResponse[];
    /**
     * @isDateTime
     */
    created_at: string;
}

export interface SearchResponseData {
    _id: string;
    user_id?: string;
    origins: string[];
    destinations: string[];
    /**
     * @isDateTime
     */
    departure_date: Date;
    /**
     * @isDateTime
     */
    return_date?: Date;
    criteria: {
        priority: "balanced" | "cheap" | "fast";
        max_price?: number;
    };
    status: "searching" | "completed" | "failed";
    source: "manual" | "agent";
    departure_itineraries?: ItineraryResponse[];
    return_itineraries?: ItineraryResponse[];
    /**
     * @isDateTime
     */
    created_at: string;
}

export type SearchRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<SearchRequest>
>>;

// Unión de todas las posibles respuestas 422 para search
export type SearchValidationFailResponse = SearchRequestValidationFailResponse | DatabaseValidationFailResponse;

export interface FlightSegment {
    departure_airport: {
        name: string;
        id: string;
        time: string;
    };
    arrival_airport: {
        name: string;
        id: string;
        time: string;
    };
    duration: number;
    airplane: string;
    airline: string;
    airline_logo?: string;
    travel_class: string;
    flight_number: string;
    extensions?: string[];
}

export interface EnrichedFlightEdge extends DijkstraFlightEdge {
    airplane: string;
    flight_number: string;
    travel_class: string;
    departure_token?: string;
    extensions?: string[];
    segments?: FlightSegment[];
}

export interface SearchProgressEvent {
    type: "progress" | "completed" | "failed";
    message: string;
    step?: number;
    total_steps?: number;
    data?: SearchResponseData;
}
