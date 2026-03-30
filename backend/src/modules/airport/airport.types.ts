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
  };
  combined_score?: number;
  distance_km?: number;
}

export interface ScoredAirport {
  iata: string;
  score: number;
}

export interface AirportSearchPaginatedResult {
    items: AirportResponse[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Compact format for globe visualization
 */
export interface GlobeAirportResponse {
  i: string;  // iata_code
  n: string;  // name
  ci: string; // city
  la: number; // latitude
  lo: number; // longitude
  s: number;  // importance_score
  c: string;  // country (ISO)
}

