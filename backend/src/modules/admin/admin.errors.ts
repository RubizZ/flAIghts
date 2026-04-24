import { AppError } from "../../utils/errors.js";

export class AdminActionNotAuthorizedError extends AppError<'ADMIN_ACTION_NOT_AUTHORIZED', { reason: string }> {
    public readonly code = 'ADMIN_ACTION_NOT_AUTHORIZED';
    public readonly statusCode = 403;

    constructor(reason: string) {
        super(reason);
        this.details = { reason };
    }
}
