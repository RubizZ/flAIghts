import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse } from "../../utils/responses.js";

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

    layover_days?: number[];

    

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
    id: string;
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
    departure_itineraries?: ItineraryResponse[];
    return_itineraries?: ItineraryResponse[];
    /**
     * @isDateTime
     */
    created_at: string;
}

export type SearchRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.origins"
    | "body.destinations"
    | "body.criteria"
    | "body.criteria.priority"
    | "body.criteria.max_price"
>>;

// Unión de todas las posibles respuestas 422 para search
export type SearchValidationFailResponse = SearchRequestValidationFailResponse | DatabaseValidationFailResponse;
