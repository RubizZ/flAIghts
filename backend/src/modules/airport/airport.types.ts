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

