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

