import { Controller, Get, Patch, Path, Query, Route, Security, SuccessResponse, Tags, Body, Delete, RequestProp } from "tsoa";
import { injectable, inject } from "tsyringe";
import { AdminService } from "./admin.service.js";
import type { SuccessResponse as SuccessResponseType } from "../../utils/responses.js";
import type { AdminStats, UpdateAirportRequest, PaginatedUsersResponse, PaginatedAuditsResponse, PopulatedAirportReport, PopulatedEvaluationDocument, PaginatedAirportsResponse, EvaluationAdminResponse } from "./admin.types.js";
import type { IAirportReport } from "../airport/airport-report.model.js";
import type { IAirport } from "../airport/airport.model.js";
import type { IUserUnpopulated } from "../users/models/user.model.js";
import type { AuditDetails } from "../audit/audit.types.js";
import type { AuthenticatedUser } from "../auth/auth.types.js"

@injectable()
@Route("admin")
@Tags("Admin")
@Security("jwt", ["admin", "superadmin"])
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
        @Query() role?: 'user' | 'admin' | 'superadmin',
        @Query() sortBy: string = 'created_at',
        @Query() sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<SuccessResponseType<PaginatedUsersResponse>> {
        const result = await this.adminService.getUsers(page, limit, q, role, sortBy, sortOrder);
        return { status: "success", data: result };
    }

    /**
     * Listar todos los aeropuertos con paginación y búsqueda simple (Solo Admin).
     */
    @Get("/airports")
    public async listAirports(
        @Query() page: number = 1,
        @Query() limit: number = 20,
        @Query() q?: string,
        @Query() sortBy: string = 'importance_score',
        @Query() sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<SuccessResponseType<PaginatedAirportsResponse>> {
        const result = await this.adminService.getAirports(page, limit, q, sortBy, sortOrder);
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
     * Obtener metadatos de auditoría (recursos y acciones disponibles dinámicamente).
     */
    @Get("/audits/metadata")
    public async getAuditMetadata(): Promise<SuccessResponseType<{ resources: string[], actionsByResource: Record<string, string[]> }>> {
        const result = await this.adminService.getAuditMetadata();
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
    public async deleteUser(
        @Path() id: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<void> {
        await this.adminService.deleteUser(id, user);
    }

    /**
     * Cambiar el rol de un usuario.
     */
    @Patch("/users/{id}/role")
    public async updateUserRole(
        @Path() id: string,
        @Body() body: { role: 'user' | 'admin' | 'superadmin' },
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponseType<IUserUnpopulated | null>> {
        const result = await this.adminService.updateUserRole(id, body.role, user!);
        return { status: "success", data: result as any };
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
    public async listEvaluations(): Promise<SuccessResponseType<EvaluationAdminResponse>> {
        const result = await this.adminService.getEvaluations();
        return { status: "success", data: result };
    }
}
