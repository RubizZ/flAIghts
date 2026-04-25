import type { IAirportReport } from "../airport/airport-report.model.js";
import type { IAirport } from "../airport/airport.model.js";
import type { IAudit } from "../audit/audit.model.js";
import type { IEvaluationDocument } from "../evaluation/evaluation.model.js";
import type { IUserUnpopulated } from "../users/models/user.model.js";
import type { AirportSearchPaginatedResult } from "../airport/airport.types.js";

export type PaginatedAirportsResponse = AirportSearchPaginatedResult;

export interface AdminStats {
    users: number;
    pendingReports: number;
    totalEvaluations: number;
    airports: number;
    audits: number;
}

export interface UpdateAirportRequest {
    name?: string;
    city?: string;
    importance_score?: number;
    type?: string;
    latitude?: number;
    longitude?: number;
}

export type PopulatedUserRef = Pick<IUserUnpopulated, '_id' | 'username' | 'email'>;

export interface PopulatedAirportReport extends Omit<IAirportReport, 'user_id' | 'airport_iata'> {
    user_id?: PopulatedUserRef;
    airport_iata: IAirport;
}

export interface PopulatedEvaluationDocument extends Omit<IEvaluationDocument, 'userId'> {
    userId?: PopulatedUserRef;
}

export interface PaginatedUsersResponse {
    users: IUserUnpopulated[];
    total: number;
    page: number;
    totalPages: number;
}

export interface PaginatedAuditsResponse {
    audits: IAudit[];
    page: number;
    total: number;
    totalPages: number;
}
