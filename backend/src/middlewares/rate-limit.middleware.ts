import { rateLimit } from 'express-rate-limit';

export const profilePictureRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 5, // Límite de 5 peticiones por ventana
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'fail',
        data: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Demasiadas peticiones de cambio de foto de perfil. Inténtalo de nuevo más tarde.'
        }
    },
    skipSuccessfulRequests: false,
});
