import { Controller, Get, Route, Query, Tags, Response } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AirportService } from "./airport.service.js";
import type { AirportResponse, GlobeAirportResponse } from "./airport.types.js";
import type { SuccessResponse, RequestValidationFailResponse, ValidationDetails, QueryPath } from "../../utils/responses.js";

@injectable()
@Route("airports")
@Tags("Airports")
export class AirportController extends Controller {

    constructor(@inject(AirportService) private airportService: AirportService) {
        super();
    }

    @Get("/")
    @Response<SuccessResponse<AirportResponse[]>>(200, "Aeropuertos encontrados")
    @Response<RequestValidationFailResponse<ValidationDetails<QueryPath<{ q: string }>>>>(422, "Error de validación")
    public async searchAirports(@Query() q: string): Promise<SuccessResponse<AirportResponse[]>> {
        const results = await this.airportService.searchAirports(q);
        return results as any;
    }

    @Get("/globe")
    @Response<GlobeAirportResponse[]>(200, "Aeropuertos para el globo")
    public async getGlobeAirports(): Promise<GlobeAirportResponse[]> {
        return this.airportService.getGlobeAirports();
    }

    @Get("/{iata}")
    @Response<SuccessResponse<AirportResponse>>(200, "Aeropuerto encontrado")
    public async getAirportByIata(iata: string): Promise<SuccessResponse<AirportResponse>> {
        const result = await this.airportService.getAirportByIata(iata);
        if (!result) {
            this.setStatus(404);
            return { status: "fail", data: { message: "Aeropuerto no encontrado" } } as any;
        }
        return { status: "success", data: result as any };
    }
}
