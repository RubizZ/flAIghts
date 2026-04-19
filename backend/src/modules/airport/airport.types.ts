import type { IAirport } from "./airport.model.js";

export interface CachedAirport extends IAirport {
    _normIata: string;
    _normCity: string;
    _normName: string;
    _normCountry: string;
    _normCountryNames: string;
}

export interface AirportResponse {
    iata_code: string;
    name: string;
    city: string;
    country: string;
    type: "airport";
    importance_score: number;
    location: {
        type: "Point";
        coordinates: number[];
    };
    combined_score?: number;
    distance_km_to_user?: number;
    distance_km_to_city?: number;
    highlight?: {
        iata_code?: string;
        name?: string;
        city?: string;
    };
}

export interface CityResponse {
    name: string;
    country: string;
    type: "city";
    location: {
        type: "Point";
        coordinates: number[];
    };
    airports: AirportResponse[];
    combined_score?: number;
    highlight?: {
        name?: string;
    };
}

export type SearchResult = AirportResponse | CityResponse;

export interface ScoredAirport {
    iata: string;
    score: number;
}

export interface AirportSearchPaginatedResult {
    items: SearchResult[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Compact format for globe visualization
 */
export interface GlobeAirportResponse {
    /**
     * IATA code
     */
    i: string;
    /**
     * Name
     */
    n: string;
    /**
     * City
     */
    ci: string;
    /**
     * Latitude
     */
    la: number;
    /**
     * Longitude
     */
    lo: number;
    /**
     * Importance score
     */
    s: number;
    /**
     * Country (ISO)
     */
    c: string;
}

export interface AirportReportRequest {
    reason: string;
}