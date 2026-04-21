import { Body, Controller, Post, RequestProp, Route, Security, SuccessResponse, Tags } from "tsoa";
import { inject, injectable } from "tsyringe";
import { BookingService } from "./booking.service.js";
import type { BookingRequest, BookingResponse } from "./booking.types.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse as SuccessResponseType } from "../../utils/responses.js";

@injectable()
@Route("booking")
@Tags("Booking")
export class BookingController extends Controller {
    constructor(
        @inject(BookingService) private readonly bookingService: BookingService
    ) {
        super();
    }

    /**
     * Prepara las opciones de reserva para un conjunto de tokens de vuelo.
     * Recupera los enlaces de reserva y proveedores de SerpApi.
     */
    @Post("/prepare")
    @Security('jwt-optional')
    @SuccessResponse(200, "Opciones de reserva recuperadas")
    public async prepareBooking(
        @Body() body: BookingRequest,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponseType<BookingResponse>> {
        const result = await this.bookingService.prepareBooking(body, user?._id);
        return result satisfies BookingResponse as any;
    }
}
