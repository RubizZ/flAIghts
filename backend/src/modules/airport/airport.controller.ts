import { Controller, Get, Post, Route, Query, Path, Body, Tags, Response, SuccessResponse, Security, RequestProp } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AirportService } from "./airport.service.js";
import type { AirportResponse, AirportSearchPaginatedResult, GlobeAirportResponse, AirportReportRequest } from "./airport.types.js";
import type { SuccessResponse as SuccessResponseType, MessageResponseData, RequestValidationFailResponse, ValidationDetails, QueryPath, PathPath } from "../../utils/responses.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

@injectable()
@Route("airports")
@Tags("Airports")
export class AirportController extends Controller {

    constructor(@inject(AirportService) private airportService: AirportService) {
        super();
    }

    @Get("/")
    @SuccessResponse(200, "Aeropuertos encontrados")
    @Response<RequestValidationFailResponse<ValidationDetails<QueryPath<{ q: string }>>>>(422, "Error de validación")
    public async searchAirports(
        @Query() q: string,
        @Query() page: number = 1,
        @Query() limit: number = 10,
        @Query() lat?: number,
        @Query() lon?: number
    ): Promise<SuccessResponseType<AirportSearchPaginatedResult>> {
        const results = await this.airportService.searchAirports(q, lat, lon, page, limit);
        return { status: "success", data: results };
    }

    @Get("/near")
    @Response<SuccessResponseType<AirportResponse[]>>(200, "Aeropuertos cercanos encontrados")
    public async getNearAirports(
        @Query() lat: number,
        @Query() lon: number,
        @Query() limit?: number,
        @Query() maxDistanceKm?: number
    ): Promise<SuccessResponseType<AirportResponse[]>> {
        const results = await this.airportService.getNearAirports(lat, lon, limit, maxDistanceKm);
        return {
            status: "success",
            data: results
        };
    }

    @Get("/globe")
    @SuccessResponse(200, "Aeropuertos para el globo")
    public async getGlobeAirports(): Promise<SuccessResponseType<GlobeAirportResponse[]>> {
        const airports = await this.airportService.getGlobeAirports();
        return { status: "success", data: airports as any };
    }

    @Get("/{iata}")
    @SuccessResponse(200, "Aeropuerto encontrado")
    public async getAirportByIata(iata: string): Promise<SuccessResponseType<AirportResponse>> {
        const result = await this.airportService.getAirportByIata(iata);
        if (!result) {
            this.setStatus(404);
            return { status: "fail", data: { message: "Aeropuerto no encontrado" } } as any;
        }
        return { status: "success", data: result as any };
    }

    /**
     * Reporta un error en los datos de un aeropuerto.
     */
    @Post("/{iata}/report")
    @Security('jwt-optional')
    @Response<RequestValidationFailResponse<ValidationDetails<PathPath<{ iata: string }>>>>(422, "Error de validación")
    @SuccessResponse(200, "Reporte enviado con éxito")
    public async reportAirportError(
        @Path() iata: string,
        @Body() body: AirportReportRequest,
        @RequestProp("user") user: AuthenticatedUser | null
    ): Promise<SuccessResponseType<MessageResponseData>> {
        const result = await this.airportService.reportError(iata, body.reason, user?._id);
        return result as any;
    }
}
