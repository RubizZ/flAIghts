import type { IExecutionError } from "./execution-error.model.js";

export interface ReportErrorRequest {
    errorName: string;
    errorMessage: string;
    stack?: string;
    componentStack?: string;
    url: string;
    userAgent: string;
}

export interface PaginatedExecutionErrorsResponse {
    errors: IExecutionError[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
