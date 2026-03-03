import { Controller, Get, Route, Query, Tags, Response } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AirportService } from "./airport.service.js";
import type { AirportResponse } from "./airport.types.js";
import type { SuccessResponse } from "../../utils/responses.js";

@injectable()
@Route("airports")
@Tags("Airports")
export class AirportController extends Controller {

    constructor(@inject(AirportService) private airportService: AirportService) {
        super();
    }

    @Get("/")
    @Response<SuccessResponse<AirportResponse[]>>(200, "Aeropuertos encontrados")
    public async search(@Query() q: string): Promise<SuccessResponse<AirportResponse[]>> {
        const results = await this.airportService.searchAirports(q);
        return results satisfies AirportResponse[] as any;
    }
}