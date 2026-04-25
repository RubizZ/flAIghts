import { injectable, inject } from "tsyringe";
import axios from "axios";
import { ServerConfig } from "../../config/server.config.js";
import {
    TurnstileVerificationFailedError,
    TurnstileMissingTokenError,
    TurnstileInvalidTokenError,
    TurnstileTokenAlreadySpentError,
    TurnstileError
} from "./auth.errors.js";
import logger from "../../utils/logger.js";

@injectable()
export class TurnstileService {
    private readonly VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    constructor(@inject(ServerConfig) private config: ServerConfig) { }

    /**
     * Verifica un token de Turnstile con la API de Cloudflare.
     * Si la verificación falla, lanza un error específico de Turnstile.
     * Si no se ha configurado la clave secreta, la verificación se omite (solo en desarrollo/test).
     */
    public async verifyToken(token?: string, remoteIp?: string): Promise<void> {
        const secretKey = this.config.TURNSTILE_SECRET_KEY;

        if (!token) {
            throw new TurnstileMissingTokenError();
        }

        try {
            const response = await axios.post(this.VERIFY_URL, {
                secret: secretKey,
                response: token,
                remoteip: remoteIp
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 5000
            });

            const data = response.data;

            if (!data.success) {
                const cloudflareErrors: string[] = data["error-codes"] || [];

                if (cloudflareErrors.includes("timeout-or-duplicate")) {
                    throw new TurnstileTokenAlreadySpentError();
                } else if (cloudflareErrors.includes("invalid-input-response")) {
                    throw new TurnstileInvalidTokenError();
                } else if (cloudflareErrors.includes("missing-input-response")) {
                    throw new TurnstileMissingTokenError();
                } else {
                    // Cualquier otro error (bad-request, internal-error, o errores de secret key) 
                    // se reporta como un fallo genérico al cliente por seguridad.
                    throw new TurnstileVerificationFailedError();
                }
            }
        } catch (error) {
            if (error instanceof TurnstileError) {
                throw error;
            }
            logger.error({ error }, "Error al conectar con el servicio de verificación de Turnstile");
            // Errores de conexión también se reportan como fallo genérico al cliente
            throw new TurnstileVerificationFailedError();
        }
    }
}
