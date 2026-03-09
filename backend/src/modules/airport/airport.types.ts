export interface AirportResponse {
    iata_code: string;
    name: string;
    city: string;
    country: string;
    type: string;
    importance_score: number;
    location: {
        type: "Point";
        coordinates: number[];
    }
}

export interface ScoredAirport {
  iata: string;
  score: number;
}

export interface PaginatedAirportResponse {
    items: AirportResponse[];
    total: number;
    page: number;
    totalPages: number;
}