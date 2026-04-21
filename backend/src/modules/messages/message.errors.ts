import { AppError } from "../../utils/errors.js";

export class MessageValidationError extends AppError<'MESSAGE_VALIDATION_FAILED', { missing: string[] }> {
    public readonly code = 'MESSAGE_VALIDATION_FAILED';
    public readonly statusCode: number = 400;

    constructor(missingFields: string[]) {
        const message = `Message validation failed. Missing fields: ${missingFields.join(', ')}`;
        super(message);
        this.details = { missing: missingFields };
    }
}
