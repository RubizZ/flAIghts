import { singleton, inject } from "tsyringe";
import { User } from "../users/models/user.model.js";
import { AirportReport } from "../airport/airport-report.model.js";
import { Evaluation } from "../evaluation/evaluation.model.js";
import { Airport } from "../airport/airport.model.js";
import { Audit } from "../audit/audit.model.js";
import type { AuditDetails } from "../audit/audit.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AdminActionNotAuthorizedError } from "./admin.errors.js";
import { UserService } from "../users/user.service.js";
import type { AdminStats, UpdateAirportRequest, PopulatedAirportReport, PopulatedEvaluationDocument, PaginatedUsersResponse, PaginatedAuditsResponse, PopulatedUserRef, PaginatedAirportsResponse, EvaluationSummary, EvaluationAdminResponse } from "./admin.types.js";
import type { IUserUnpopulated } from "../users/models/user.model.js";
import { AirportService } from "../airport/airport.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

@singleton()
export class AdminService {
    constructor(
        @inject(AuditService) private auditService: AuditService,
        @inject(UserService) private userService: UserService,
        @inject(AirportService) private airportService: AirportService
    ) { }

    public async getSystemStats(): Promise<AdminStats> {
        const [users, pendingReports, totalEvaluations, airports, audits] = await Promise.all([
            User.countDocuments(),
            AirportReport.countDocuments({ status: 'pending' }),
            Evaluation.countDocuments(),
            Airport.countDocuments(),
            Audit.countDocuments()
        ]);

        return { users, pendingReports, totalEvaluations, airports, audits };
    }

    public async getUsers(page: number, limit: number, q?: string, role?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedUsersResponse> {
        return this.userService.getAllUsers(page, limit, q, role, sortBy, sortOrder);
    }

    public async getAirports(page: number, limit: number, q?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedAirportsResponse> {
        return this.airportService.listAirports(page, limit, q, sortBy, sortOrder);
    }

    public async getAudits(page: number, limit: number, resource?: keyof AuditDetails, action?: string): Promise<PaginatedAuditsResponse> {
        return this.auditService.getAll({
            filters: { resource: resource as any, action },
            pagination: { page, limit },
            sort: { field: "timestamp", order: "desc" }
        });
    }

    public async getAuditMetadata() {
        const resources = await Audit.distinct('resource');
        const actionsByResource: Record<string, string[]> = {};

        await Promise.all(resources.map(async (resource) => {
            actionsByResource[resource] = await Audit.distinct('action', { resource });
        }));

        return { resources, actionsByResource };
    }

    public async getAirportReports(status?: 'pending' | 'resolved' | 'rejected'): Promise<PopulatedAirportReport[]> {
        const query = status ? { status } : {};
        return await AirportReport.find(query)
            .sort({ created_at: -1 })
            .populate<PopulatedUserRef>('user_id', 'username email')
            .populate({
                path: 'airport_iata',
                model: 'Airport',
                localField: 'airport_iata',
                foreignField: 'iata_code'
            }).lean<PopulatedAirportReport[]>();
    }

    public async deleteUser(id: string, requester: AuthenticatedUser) {
        const targetUser = await User.findById(id);
        if (!targetUser) return;

        // Solo superadmin puede borrar a otros admin/superadmin
        if (targetUser.role !== 'user' && requester.role !== 'superadmin') {
            throw new AdminActionNotAuthorizedError("Solo un Super Administrador puede eliminar cuentas administrativas.");
        }

        await this.userService.deleteUser(id);

        await this.auditService.register({
            resource: "USER",
            action: "DELETE",
            details: { deletedUserId: id, deletedUsername: targetUser.username }
        } as any);
    }

    public async updateReportStatus(id: string, status: 'resolved' | 'rejected') {
        const report = await AirportReport.findByIdAndUpdate(id, { status }, { new: true });

        this.auditService.register({
            resource: "USER",
            action: "UPDATE",
            details: { reportId: id, newStatus: status }
        } as any);

        return report;
    }

    public async updateUserRole(id: string, role: 'user' | 'admin' | 'superadmin', requester: AuthenticatedUser) {
        const targetUser = await User.findById(id);

        if (!targetUser) return null;

        // Solo superAdmin puede cambiar roles de admin/superadmin, admin puede cambiar roles de usuarios
        if ((role !== 'user' || targetUser.role !== 'user') && requester.role !== 'superadmin') {
            throw new AdminActionNotAuthorizedError("Solo un Super Administrador puede gestionar roles administrativos.");
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });

        if (!user) return null;

        await this.auditService.register({
            resource: "USER",
            action: "UPDATE",
            details: { userId: id, role }
        } as any);

        return user;
    }

    public async updateAirport(iata: string, data: UpdateAirportRequest) {
        const { latitude, longitude, ...otherData } = data;
        const update: any = { ...otherData };

        if (latitude !== undefined && longitude !== undefined) {
            update.location = {
                type: "Point",
                coordinates: [longitude, latitude]
            };
        }

        const airport = await Airport.findOneAndUpdate(
            { iata_code: iata.toUpperCase() },
            { $set: update },
            { new: true }
        );

        // Sincronizar caché de memoria del AirportService si la actualización fue exitosa
        if (airport) {
            this.airportService.updateAirportInCache(airport.toObject());
        }

        this.auditService.register({
            resource: "USER",
            action: "UPDATE",
            details: { airportIata: iata, changes: data }
        } as any);

        return airport;
    }

    public async getEvaluations(): Promise<EvaluationAdminResponse> {
        const rawEvals = await Evaluation.find()
            .sort({ timestamp: -1 })
            .populate<PopulatedUserRef>('userId', 'username email')
            .lean<PopulatedEvaluationDocument[]>();

        const evaluations = rawEvals.map(ev => {
            let susScore: number | undefined;
            if (ev.susResults && ev.susResults.length === 10) {
                // SUS Calculation:
                // Odd items (1, 3, 5, 7, 9) are 1-indexed in SUS, 0, 2, 4, 6, 8 in array
                // Even items (2, 4, 6, 8, 10) are 1-indexed in SUS, 1, 3, 5, 7, 9 in array
                const score = ev.susResults.reduce((acc, val, idx) => {
                    if (idx % 2 === 0) { // Odd SUS item
                        return acc + (val - 1);
                    } else { // Even SUS item
                        return acc + (5 - val);
                    }
                }, 0);
                susScore = score * 2.5;
            }
            return { ...ev, susScore };
        });

        const validScores = evaluations
            .map(e => e.susScore)
            .filter((s): s is number => s !== undefined);

        const summary: EvaluationSummary = {
            totalEvaluations: evaluations.length,
            averageSusScore: validScores.length > 0
                ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
                : 0,
            minSusScore: validScores.length > 0 ? Math.min(...validScores) : 0,
            maxSusScore: validScores.length > 0 ? Math.max(...validScores) : 0,
            distribution: {
                excellent: validScores.filter(s => s >= 80.3).length,
                good: validScores.filter(s => s >= 68 && s < 80.3).length,
                ok: validScores.filter(s => s >= 51 && s < 68).length,
                poor: validScores.filter(s => s < 51).length
            }
        };

        return { evaluations, summary };
    }
}