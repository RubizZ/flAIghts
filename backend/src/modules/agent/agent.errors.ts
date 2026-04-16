import { AppError } from "../../utils/errors.js";

export class AgentUnavailableError extends AppError<"ASSISTANT_UNAVAILABLE"> {
    public readonly code = "ASSISTANT_UNAVAILABLE";
    public readonly statusCode = 503;

    constructor(error: Error) {
        super("Asistente de búsqueda no disponible en este momento.");
        this.cause = error;
    }
}
