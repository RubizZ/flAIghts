import mongoose, { Schema, Model } from "mongoose";
import type {
    SerpApiResponse,
    AirportInfo,
    Layover,
    CarbonEmmisions,
    Flight,
    FlightRoute,
    PriceInsights,
    Airport,
    Segment,
    ApiRequestParameters
} from "@/services/serpapi/serpapi.types.js";

const AirportInfoSchema = new Schema<AirportInfo>({
    name: { type: String, required: true },
    id: { type: String, required: true },
    time: { type: String, required: true },
}, { _id: false });

const LayoverSchema = new Schema<Layover>({
    duration: { type: Number, required: true },
    name: { type: String, required: true },
    id: { type: String, required: true },
    overnight: { type: Boolean, required: false },
}, { _id: false });

const CarbonEmissionsSchema = new Schema<CarbonEmmisions>({
    this_flight: { type: Number, required: true },
    typical_for_this_route: { type: Number, required: true },
    difference_percent: { type: Number, required: true },
}, { _id: false });

const FlightSchema = new Schema<Flight>({
    departure_airport: { type: AirportInfoSchema, required: true },
    arrival_airport: { type: AirportInfoSchema, required: true },
    duration: { type: Number, required: true },
    airplane: { type: String, required: true },
    airline: { type: String, required: true },
    airline_logo: { type: String, required: false },
    travel_class: { type: String, required: true },
    flight_number: { type: String, required: true },
    extensions: { type: [String], required: true },
    ticket_also_sold_by: { type: [String], required: true },
    legroom: { type: String, required: true },
    overnight: { type: Boolean, required: false },
    often_delayed_by_30_min: { type: Boolean, required: false },
    plane_and_crew_by: { type: String, required: false },
}, { _id: false });

const FlightRouteSchema = new Schema<FlightRoute>({
    flights: { type: [FlightSchema], required: true },
    layovers: { type: [LayoverSchema], required: false },
    total_duration: { type: Number, required: true },
    carbon_emmisions: { type: CarbonEmissionsSchema, required: false },
    price: { type: Number, required: true },
    type: { type: String, required: true },
    airline_logo: { type: String, required: false },
    extensions: { type: [String], required: true },
    departure_token: { type: String, required: false }, // required for round-trip flights only
    booking_token: { type: String, required: true },
}, { _id: false });

const PriceInsightsSchema = new Schema<PriceInsights>({
    lowest_price: { type: Number, required: true },
    price_level: { type: String, enum: ["low", "medium", "high"], required: true },
    typical_price_range: { type: [Number], required: true }, // [min, max]
    price_history: { type: [[Number]], required: true }, // [[timestamp, price], ...]
}, { _id: false });

const AirportSchema = new Schema<Airport>({
    airport: {
        name: { type: String, required: false },
        id: { type: String, required: false },
    },
    city: { type: String, required: false },
    country: { type: String, required: false },
    country_code: { type: String, required: false },
    image: { type: String, required: false },
    thumbnail: { type: String, required: false },
}, { _id: false });

const SegmentSchema = new Schema<Segment>({
    departure: { type: [AirportSchema], required: false },
    arrival: { type: [AirportSchema], required: false },
}, { _id: false });

const SearchMetadataSchema = new Schema<SerpApiResponse["search_metadata"]>({
    id: { type: String, required: true },
    status: { type: String, required: true },
    json_endpoint: { type: String, required: true },
    created_at: { type: String, required: true },
    processed_at: { type: String, required: true },
    google_flights_url: { type: String, required: true },
    raw_html_file: { type: String, required: true },
    prettify_html_file: { type: String, required: true },
    total_time_taken: { type: Number, required: true },
}, { _id: false });

const SearchParametersSchema = new Schema<ApiRequestParameters>({
    departure_id: { type: Schema.Types.Mixed, required: true }, // string | string[]
    arrival_id: { type: Schema.Types.Mixed, required: true }, // string | string[]
    gl: { type: String, required: true },
    hl: { type: String, required: true },
    currency: { type: String, required: true },
    type: { type: Number, required: true },
    outbound_date: { type: String, required: true },
    travel_class: { type: Number, enum: [1, 2, 3, 4], required: false },
    show_hidden: { type: Boolean, required: false },
    deep_search: { type: Boolean, required: false },
    adults: { type: Number, required: false },
    children: { type: Number, required: false },
    infants_in_seat: { type: Number, required: false },
    infants_on_lap: { type: Number, required: false },
    sort_by: { type: Number, enum: [1, 2, 3, 4, 5, 6], required: false },
    stops: { type: Number, enum: [0, 1, 2, 3], required: false },
    bags: { type: Number, required: false },
}, { _id: false });

// Schema principal de SerpApiStorage
const SerpapiStorageSchema = new Schema<SerpApiResponse>({
    search_metadata: { type: SearchMetadataSchema, required: true },
    search_parameters: { type: SearchParametersSchema, required: true },
    best_flights: { type: [FlightRouteSchema], required: false },
    other_flights: { type: [FlightRouteSchema], required: false },
    price_insights: { type: PriceInsightsSchema, required: false },
    airports: { type: [SegmentSchema], required: false },
}, {
    timestamps: true,
    collection: "serpapi_storage"
});

// Índices para búsquedas frecuentes
SerpapiStorageSchema.index({ "search_metadata.id": 1 }, { unique: true });
SerpapiStorageSchema.index({ "search_parameters.departure_id": 1, "search_parameters.arrival_id": 1 });
SerpapiStorageSchema.index({ "search_parameters.outbound_date": 1 });
SerpapiStorageSchema.index({ createdAt: 1 });

export const SerpapiStorage: Model<SerpApiResponse> = mongoose.model<SerpApiResponse>("SerpapiStorage", SerpapiStorageSchema);