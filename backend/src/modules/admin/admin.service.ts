import { singleton, inject } from "tsyringe";
import { User } from "../users/models/user.model.js";
import { AirportReport } from "../airport/airport-report.model.js";
import { Evaluation } from "../evaluation/evaluation.model.js";
import { Airport } from "../airport/airport.model.js";
import type { AuditDetails } from "../audit/audit.types.js";
import { AuditService } from "../audit/audit.service.js";
import { UserService } from "../users/user.service.js";
import type { AdminStats, UpdateAirportRequest, PopulatedAirportReport, PopulatedEvaluationDocument, PaginatedUsersResponse, PaginatedAuditsResponse, PopulatedUserRef, PaginatedAirportsResponse } from "./admin.types.js";
import type { IUserUnpopulated } from "../users/models/user.model.js";
import { AirportService } from "../airport/airport.service.js";

@singleton()
export class AdminService {
    constructor(
        @inject(AuditService) private auditService: AuditService,
        @inject(UserService) private userService: UserService,
        @inject(AirportService) private airportService: AirportService
    ) { }

    public async getSystemStats(): Promise<AdminStats> {
        const [users, pendingReports, totalEvaluations, airports] = await Promise.all([
            User.countDocuments(),
            AirportReport.countDocuments({ status: 'pending' }),
            Evaluation.countDocuments(),
            Airport.countDocuments()
        ]);

        return { users, pendingReports, totalEvaluations, airports };
    }

    public async getUsers(page: number, limit: number, q?: string, role?: string): Promise<PaginatedUsersResponse> {
        return this.userService.getAllUsers(page, limit, q, role);
    }

    public async getAirports(page: number, limit: number, q?: string): Promise<PaginatedAirportsResponse> {
        return this.airportService.listAirports(page, limit, q);
    }

    public async getAudits(page: number, limit: number, resource?: keyof AuditDetails, action?: string): Promise<PaginatedAuditsResponse> {
        return this.auditService.getAll({
            filters: { resource: resource as any, action },
            pagination: { page, limit },
            sort: { field: "timestamp", order: "desc" }
        });
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

    public async deleteUser(id: string) {
        await this.userService.deleteUser(id);
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

    public async updateUserRole(id: string, role: 'user' | 'admin') {
        const user = await User.findByIdAndUpdate(id, { role }, { new: true });

        this.auditService.register({
            resource: "USER",
            action: "UPDATE",
            details: { userId: id, newRole: role }
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

    public async getEvaluations(): Promise<PopulatedEvaluationDocument[]> {
        return await Evaluation.find()
            .sort({ timestamp: -1 })
            .populate<PopulatedUserRef>('userId', 'username email')
            .lean<PopulatedEvaluationDocument[]>();
    }
}