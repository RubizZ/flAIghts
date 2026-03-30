import { Controller, Get, Route, Query, Tags, Response, SuccessResponse, Request } from "tsoa";
import { injectable, inject } from "tsyringe";
import axios from "axios";
import { AirportService } from "./airport.service.js";
import type { AirportResponse, AirportSearchPaginatedResult, GlobeAirportResponse } from "./airport.types.js";
import type { SuccessResponse as SuccessResponseType, RequestValidationFailResponse, ValidationDetails, QueryPath } from "../../utils/responses.js";

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
        @Query() lon?: number,
        @Request() request?: any
    ): Promise<SuccessResponseType<AirportSearchPaginatedResult>> {
        let userLat = lat;
        let userLon = lon;

        if (userLat === undefined || userLon === undefined) {
          try {
            const ip = request?.ip || request?.headers?.["x-forwarded-for"] || request?.socket?.remoteAddress;
            const geoUrl = ip && ip !== "::1" && ip !== "127.0.0.1"
              ? `https://get.geojs.io/v1/ip/geo/${ip}.json`
              : "https://get.geojs.io/v1/ip/geo.json";
            
            const response = await axios.get(geoUrl);
            if (response.status === 200 && response.data) {
              const data = response.data;
              if (data.latitude && data.longitude) {
                userLat = parseFloat(data.latitude);
                userLon = parseFloat(data.longitude);
              }
            }
          } catch (e) {
            console.error("Geo detect failed:", e);
          }
        }
        const results = await this.airportService.searchAirports(q, userLat, userLon, page, limit);
        return results satisfies AirportSearchPaginatedResult as any;
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
}
