import { Controller, Get, Route, Query, Tags, Response, SuccessResponse } from "tsoa"
import { injectable, inject } from "tsyringe";
import { AirlineService } from "./airline.service.js";
import type { SuccessResponse as SuccessResponseType, RequestValidationFailResponse, ValidationDetails, QueryPath } from "../../utils/responses.js";
import type { PaginatedAirlineResponse } from "./airline.types.js";

@injectable()
@Route("airlines")
@Tags("Airlines")
export class AirlineController extends Controller {
    constructor(@inject(AirlineService) private airlineService: AirlineService) {
        super();
    }

    @Get("/")
    @SuccessResponse(200, "Aerolineas encontradas")
    @Response<RequestValidationFailResponse<ValidationDetails<QueryPath<{ q: string }>>>>(422, "Error de validación")
    public async searchAirlines(@Query() q: string, @Query() page: number = 1, @Query() limit: number = 10): Promise<SuccessResponseType<PaginatedAirlineResponse>> {
        const airlines = await this.airlineService.searchAirlines(q, page, limit);
        return airlines satisfies PaginatedAirlineResponse as any;
    }
}