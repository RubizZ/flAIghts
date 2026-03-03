import { Controller, Get, Route, Query, Tags, Response } from "tsoa"
import { injectable, inject } from "tsyringe";
import { AirlineService } from "./airline.service.js";
import type { IAirline } from "./airline.model.js";
import type { SuccessResponse } from "../../utils/responses.js";
@injectable()
@Route("airlines")
@Tags("Airlines")
export class AirlineController extends Controller {
    constructor(@inject(AirlineService) private airlineService: AirlineService) {
        super();
    }

    @Get("/")
    @Response<SuccessResponse<IAirline[]>>(200, "Aerolineas encontradas")
    public async search(@Query() q: string): Promise<SuccessResponse<IAirline[]>> {
        const airlines = await this.airlineService.searchAirlines(q);
        return airlines satisfies IAirline[] as any;
    }
}