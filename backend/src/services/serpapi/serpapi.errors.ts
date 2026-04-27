import { AppError } from "../../utils/errors.js";

export class SerpapiQuotaExceededError extends AppError<"SERPAPI_QUOTA_EXCEEDED"> {
    public readonly code = "SERPAPI_QUOTA_EXCEEDED" as const;
    public readonly statusCode = 429;

    constructor(message: string = "Límite de cuota de SerpApi excedido") {
        super(message);
    }
}
