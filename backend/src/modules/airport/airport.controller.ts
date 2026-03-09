import { Controller, Get, Route, Query, Tags, Response } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AirportService } from "./airport.service.js";
import type { PaginatedAirportResponse } from "./airport.types.js";
import type { SuccessResponse } from "../../utils/responses.js";

@injectable()
@Route("airports")
@Tags("Airports")
export class AirportController extends Controller {

    constructor(@inject(AirportService) private airportService: AirportService) {
        super();
    }

    @Get("/")
    @Response<SuccessResponse<PaginatedAirportResponse>>(200, "Aeropuertos encontrados")
    public async searchAirports(
        @Query() q: string,
        @Query() page: number = 1,
        @Query() limit: number = 10
    ): Promise<SuccessResponse<PaginatedAirportResponse>> {
        const results = await this.airportService.searchAirports(q, page, limit);
        return results satisfies PaginatedAirportResponse as any;
    }
}