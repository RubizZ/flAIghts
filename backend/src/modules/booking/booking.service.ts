import { singleton, inject } from "tsyringe";
import { SerpApiClient } from "../../services/serpapi/serpapi.client.js";
import { AuditService } from "../audit/audit.service.js";
import type { BookingRequest, BookingResponse, BookingSegment } from "./booking.types.js";
import logger from "../../utils/logger.js";

@singleton()
export class BookingService {
    constructor(
        @inject(SerpApiClient) private readonly serpApiClient: SerpApiClient,
        @inject(AuditService) private readonly auditService: AuditService
    ) { }

    public async prepareBooking(data: BookingRequest, userId?: string): Promise<BookingResponse> {
        // Register audit event
        await this.auditService.register({
            resource: "BOOKING",
            action: "PREPARE",
            details: {
                tokens: data.tokens
            },
            user: { id: userId }
        });

        const segments: BookingSegment[] = [];
        const uniqueTokens = Array.from(new Map(data.tokens.map(t => [t.token, t])).values());

        await Promise.all(uniqueTokens.map(async (tokenData) => {
            const { token, origin, destination, departure_date } = tokenData;
            try {
                const response = await this.serpApiClient.search({
                    booking_token: token,
                    departure_id: origin,
                    arrival_id: destination,
                    outbound_date: departure_date,
                    type: 2,
                    gl: "es",
                    hl: "es",
                    currency: "EUR"
                } as any, userId);

                if (response.booking_options && response.selected_flights && response.selected_flights.length > 0) {
                    const firstFlight = response.selected_flights[0];
                    const flights = firstFlight?.flights;
                    const firstLeg = flights?.[0];
                    const lastLeg = flights ? flights[flights.length - 1] : undefined;

                    if (firstLeg && lastLeg) {
                        segments.push({
                            origin: firstLeg.departure_airport.id,
                            destination: lastLeg.arrival_airport.id,
                            departure_time: firstLeg.departure_airport.time,
                            arrival_time: lastLeg.arrival_airport.time,
                            airline: firstLeg.airline,
                            options: response.booking_options.map(opt => {
                                if (opt.together) {
                                    return {
                                        name: opt.together.book_with,
                                        price: opt.together.price,
                                        url: opt.together.booking_request.url,
                                        post_data: opt.together.booking_request.post_data,
                                        logo: opt.together.airline_logos?.[0],
                                        extensions: opt.together.extensions
                                    };
                                }
                                return {
                                    name: opt.name || 'Unknown Provider',
                                    price: opt.price,
                                    url: opt.url || '',
                                    post_data: opt.post_data
                                };
                            }).filter(opt => opt.url !== '')
                        });
                    }
                } else {
                    logger.warn({ token }, "No booking options found for token");
                }
            } catch (error: any) {
                logger.error({
                    message: error.message,
                    token
                }, "Error fetching booking options for token");
            }
        }));

        segments.sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());

        return { segments };
    }
}
