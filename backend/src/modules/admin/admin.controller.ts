import { Controller, Get, Patch, Path, Query, Route, Security, SuccessResponse, Tags, Body, Delete } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AdminService } from "./admin.service.js";
import type { SuccessResponse as SuccessResponseType } from "../../utils/responses.js";
import type { AdminStats, UpdateAirportRequest, PaginatedUsersResponse, PaginatedAuditsResponse, PopulatedAirportReport, PopulatedEvaluationDocument, PaginatedAirportsResponse } from "./admin.types.js";
import type { IAirportReport } from "../airport/airport-report.model.js";
import type { IAirport } from "../airport/airport.model.js";
import type { IUserUnpopulated } from "../users/models/user.model.js";
import type { AuditDetails } from "../audit/audit.types.js";

@injectable()
@Route("admin")
@Tags("Admin")
@Security("jwt", ["admin"])
export class AdminController extends Controller {
    constructor(@inject(AdminService) private adminService: AdminService) {
        super();
    }

    /**
     * Obtener estadísticas generales del sistema.
     */
    @Get("/stats")
    public async getStats(): Promise<SuccessResponseType<AdminStats>> {
        const stats = await this.adminService.getSystemStats();
        return { status: "success", data: stats };
    }

    /**
     * Listar todos los usuarios (Solo Admin).
     */
    @Get("/users")
    public async listUsers(
        @Query() page: number = 1,
        @Query() limit: number = 20,
        @Query() q?: string,
        @Query() role?: 'user' | 'admin'
    ): Promise<SuccessResponseType<PaginatedUsersResponse>> {
        const result = await this.adminService.getUsers(page, limit, q, role);
        return { status: "success", data: result };
    }

    /**
     * Listar todos los aeropuertos con paginación y búsqueda simple (Solo Admin).
     */
    @Get("/airports")
    public async listAirports(
        @Query() page: number = 1,
        @Query() limit: number = 20,
        @Query() q?: string
    ): Promise<SuccessResponseType<PaginatedAirportsResponse>> {
        const result = await this.adminService.getAirports(page, limit, q);
        return { status: "success", data: result };
    }

    /**
     * Listar auditorías del sistema.
     */
    @Get("/audits")
    public async listAudits(
        @Query() page: number = 1,
        @Query() limit: number = 50,
        @Query() resource?: keyof AuditDetails,
        @Query() action?: string
    ): Promise<SuccessResponseType<PaginatedAuditsResponse>> {
        const result = await this.adminService.getAudits(page, limit, resource, action);
        return { status: "success", data: result };
    }

    /**
     * Listar reportes de errores en aeropuertos.
     */
    @Get("/airport-reports")
    public async listAirportReports(@Query() status?: 'pending' | 'resolved' | 'rejected'): Promise<SuccessResponseType<PopulatedAirportReport[]>> {
        const reports = await this.adminService.getAirportReports(status);
        return { status: "success", data: reports };
    }

    /**
     * Actualizar el estado de un reporte de aeropuerto.
     */
    @Patch("/airport-reports/{id}")
    public async updateReportStatus(@Path() id: string, @Body() body: { status: 'resolved' | 'rejected' }): Promise<SuccessResponseType<IAirportReport | null>> {
        const report = await this.adminService.updateReportStatus(id, body.status);
        return { status: "success", data: report };
    }

    /**
     * Eliminar un usuario permanentemente (Solo Admin).
     */
    @Delete("/users/{id}")
    @SuccessResponse(204, "No Content")
    public async deleteUser(@Path() id: string): Promise<void> {
        await this.adminService.deleteUser(id);
    }

    /**
     * Cambiar el rol de un usuario.
     */
    @Patch("/users/{id}/role")
    public async updateUserRole(@Path() id: string, @Body() body: { role: 'user' | 'admin' }): Promise<SuccessResponseType<IUserUnpopulated | null>> {
        const user = await this.adminService.updateUserRole(id, body.role);
        return { status: "success", data: user as any };
    }

    /**
     * Modificar datos de un aeropuerto.
     */
    @Patch("/airports/{iata}")
    public async updateAirport(@Path() iata: string, @Body() body: UpdateAirportRequest): Promise<SuccessResponseType<IAirport | null>> {
        const airport = await this.adminService.updateAirport(iata, body);
        return { status: "success", data: airport };
    }

    /**
     * Ver resultados de las evaluaciones del TFG.
     */
    @Get("/evaluations")
    public async listEvaluations(): Promise<SuccessResponseType<PopulatedEvaluationDocument[]>> {
        const evals = await this.adminService.getEvaluations();
        return { status: "success", data: evals };
    }
}
