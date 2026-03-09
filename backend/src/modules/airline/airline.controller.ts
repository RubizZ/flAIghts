import { Controller, Get, Route, Query, Tags, Response } from "tsoa"
import { injectable, inject } from "tsyringe";
import { AirlineService } from "./airline.service.js";
import type { SuccessResponse } from "../../utils/responses.js";
import type { PaginatedAirlineResponse } from "./airline.types.js";
@injectable()
@Route("airlines")
@Tags("Airlines")
export class AirlineController extends Controller {
    constructor(@inject(AirlineService) private airlineService: AirlineService) {
        super();
    }
    @Get("/")
    @Response<SuccessResponse<PaginatedAirlineResponse>>(200, "Aerolineas encontradas")
    public async searchAirlines(@Query() q: string, @Query() page: number = 1, @Query() limit: number = 10): Promise<SuccessResponse<PaginatedAirlineResponse>> {
        const airlines = await this.airlineService.searchAirlines(q, page, limit);
        return airlines satisfies PaginatedAirlineResponse as any;
    }
}