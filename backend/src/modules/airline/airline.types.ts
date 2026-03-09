export interface AirlineResponse {
    code: string;
    name: string;
    country: string;
    quality_score: number;
}

export interface PaginatedAirlineResponse {
    items: AirlineResponse[];
    total: number;
    page: number;
    totalPages: number;
}