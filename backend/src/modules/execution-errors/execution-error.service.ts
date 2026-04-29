import { injectable } from "tsyringe";
import { ExecutionError, type IExecutionError } from "./execution-error.model.js";
import type { ReportErrorRequest, PaginatedExecutionErrorsResponse } from "./execution-error.types.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

@injectable()
export class ExecutionErrorService {
    /**
     * Registra un nuevo error de ejecución capturado en el frontend.
     */
    public async reportError(data: ReportErrorRequest, user?: AuthenticatedUser): Promise<IExecutionError> {
        const error = new ExecutionError({
            ...data,
            user: user ? {
                id: user._id,
                username: user.username
            } : undefined
        });

        return await error.save();
    }

    /**
     * Obtiene errores de ejecución con paginación para el panel de administración.
     */
    public async getErrors(page: number = 1, limit: number = 20): Promise<PaginatedExecutionErrorsResponse> {
        const skip = (page - 1) * limit;

        const [errors, total] = await Promise.all([
            ExecutionError.find()
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ExecutionError.countDocuments()
        ]);

        return {
            errors: errors as IExecutionError[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
}
