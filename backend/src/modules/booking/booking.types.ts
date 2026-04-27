export interface BookingTokenData {
    token: string;
    origin: string;
    destination: string;
    departure_date: string; // YYYY-MM-DD
}

export interface BookingRequest {
    /**
     * @minItems 1
     */
    tokens: BookingTokenData[];
}

export interface BookingOption {
    name: string;
    price?: number;
    url?: string;
    post_data?: string;
    logo?: string;
    extensions?: string[];
}

export interface BookingSegment {
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    airline: string;
    options: BookingOption[];
}

export interface BookingResponse {
    segments: BookingSegment[];
}
