export interface AirportInfo {
    name: string;
    id: string;
    time: string;
}

export interface Layover {
    duration: number;
    name: string;
    id: string;
    overnight: boolean;
}

export interface CarbonEmmisions {
    this_flight: number;
    typical_for_this_route: number;
    difference_percent: number;
}

export interface Flight {
    departure_airport: AirportInfo;
    arrival_airport: AirportInfo;
    duration: number;
    airplane: string;
    airline: string;
    airline_logo?: string;
    travel_class: string;
    flight_number: string;
    extensions: string[];
    ticket_also_sold_by: string[];
    legroom: string;
    overnight: boolean;
    often_delayed_by_30_min: boolean;
    plane_and_crew_by: string;
}

export interface FlightRoute {
    flights: Flight[];
    layovers?: Layover[];
    total_duration: number;
    carbon_emmisions?: CarbonEmmisions;
    price: number;
    type: string;
    airline_logo?: string; //aerolineas mixtas
    extensions: string[];
    departure_token: string;
    booking_token: string;
}

export interface ApiRequestParameters {
    departure_id: string | string[];
    arrival_id: string | string[];

    gl: string; //país usado para la busqueda de google vuelos
    hl: string; //idioma de los resultados
    currency: string; //default:USD

    type: 2; // 2 = one way, lo usamos así siempre
    outbound_date: string; //formato: YYYY-MM-DD
    travel_class?: 1 | 2 | 3 | 4; // 1=Economy(default), 2=Premium, 3=Business, 4=First

    show_hidden?: boolean; //default: false
    deep_search?: boolean; //default: false

    adults?: number; //default: 1
    children?: number; //default: 0
    infants_in_seat?: number; //default: 0
    infants_on_lap?: number; //default: 0

    sort_by?: 1 | 2 | 3 | 4 | 5 | 6;
    //1 - Top flights (default)
    //2 - Price
    //3 - Departure time
    //4 - Arrival time
    //5 - Duration
    //6 - Emissions

    stops?: 0 | 1 | 2 | 3;
    //0 - Any number of stops (default)
    //1 - Nonstop only
    //2 - 1 stop or fewer
    //3 - 2 stops or fewer

    bags?: number; //default: 0
}

export interface SerpApiRequest {
    parameters: ApiRequestParameters;
    engine: "google_flights";
    api_key: string;
}

export interface Airport {
    airport?: {
        name?: string;
        id?: string;
    }

    city?: string;
    country?: string;
    country_code?: string;
    image?: string; //url de la imagen de la ciudad
    thumbnail?: string;
}

export interface PriceInsights {
    lowest_price: number;
    price_level: "low" | "medium" | "high";
    typical_price_range: [number, number]; //[min, max]
    price_history: [number, number][]; //momento, precio
}

export interface Segment {
    departure?: Airport[];
    arrival?: Airport[];
}

export interface SerpApiResponse {
    search_metadata: {
        id: string;
        status: string;
        json_endpoint: string;
        created_at: string;
        processed_at: string;
        google_flights_url: string;
        raw_html_file: string;
        prettify_html_file: string;
        total_time_taken: number;
    };
    search_parameters: ApiRequestParameters;

    best_flights: FlightRoute[];
    other_flights?: FlightRoute[];

    price_insights?: PriceInsights;

    airports?: Segment[];
}