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

export interface EnrichedFlightEdge extends DijkstraFlightEdge {
    airplane: string;
    flight_number: string;
    travel_class: string;
    extensions?: string[];
}

/**
 * Estructura genérica de mensaje para el historial del chat.
 */
export interface AssistantChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

/**
 * Mensaje devuelto por el asistente en la respuesta.
 */
export interface AssistantResponseMessage {
    role: "assistant";
    content: string;
}

/**
 * Mensaje enviado por el cliente al asistente. Solo permitimos 'user' y 'assistant'
 * para evitar que se inyecten mensajes de 'system'.
 */
export interface AssistantRequestMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AssistantExtractedData {
    origin?: AirportResponse | null;
    destination?: AirportResponse | null;
    departure_date?: string | null;
    return_date?: string | null;
}

export interface AssistantRequest {
    messages: AssistantRequestMessage[];
    location?: {
        latitude: number;
        longitude: number;
    };
}

export interface AssistantResponse {
    message: AssistantResponseMessage;
    data: AssistantExtractedData;
    ready: boolean;
}

export type AssistantValidationFailResponse = RequestValidationFailResponse<ValidationDetails<"body" | "body.messages" | "body.location">>;

