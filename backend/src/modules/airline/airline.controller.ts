import { Controller, Get, Route, Query, Tags, Response } from "tsoa"
import { injectable, inject } from "tsyringe";
import { AirlineService } from "./airline.service.js";
import type { SuccessResponse } from "../../utils/responses.js";
import type { AirlineResponse } from "./airline.types.js";
@injectable()
@Route("airlines")
@Tags("Airlines")
export class AirlineController extends Controller {
    constructor(@inject(AirlineService) private airlineService: AirlineService) {
        super();
    }
    @Get("/")
    @Response<SuccessResponse<AirlineResponse[]>>(200, "Aerolineas encontradas")
    public async searchAirlines(@Query() q: string): Promise<SuccessResponse<AirlineResponse[]>> {
        const airlines = await this.airlineService.searchAirlines(q);
        return airlines satisfies AirlineResponse[] as any;
    }
}