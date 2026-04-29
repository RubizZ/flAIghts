import { AXIOS_INSTANCE } from "./axios-instance";

export interface ReportErrorRequest {
    errorName: string;
    errorMessage: string;
    stack?: string;
    componentStack?: string;
    url: string;
    userAgent: string;
}

export interface ExecutionError {
    _id: string;
    timestamp: string;
    errorName: string;
    errorMessage: string;
    stack?: string;
    componentStack?: string;
    url: string;
    userAgent: string;
    user?: {
        id: string;
        username: string;
    };
}

export interface PaginatedExecutionErrorsResponse {
    errors: ExecutionError[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Envía un reporte de error al backend.
 */
export const reportExecutionError = async (data: ReportErrorRequest) => {
    try {
        const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL;
        if (!baseUrl) return;

        await AXIOS_INSTANCE.post(`${baseUrl}/execution-errors/report`, data);
    } catch (err) {
        // Fallback silencioso para evitar bucles de error infinitos
        console.error("Failed to report execution error:", err);
    }
};

/**
 * Obtiene la lista de errores (Solo Admin).
 */
export const getExecutionErrors = async (page = 1, limit = 20): Promise<PaginatedExecutionErrorsResponse> => {
    const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL;
    const response = await AXIOS_INSTANCE.get(`${baseUrl}/execution-errors`, {
        params: { page, limit }
    });

    // Si la respuesta sigue el formato JSend ({ status: 'success', data: ... })
    if (response.data && response.data.status === 'success') {
        return response.data.data;
    }
    return response.data;
};
