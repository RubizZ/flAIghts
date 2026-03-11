import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

const rateLimitMessages = {
    es: {
        global: 'Demasiadas peticiones desde esta IP. Por favor, inténtalo de nuevo en un minuto.',
        auth: 'Demasiados intentos de autenticación. Por favor, inténtalo de nuevo en un minuto.',
        registration: 'Demasiados intentos de registro. Por favor, inténtalo de nuevo en un minuto.',
        search: 'Demasiadas peticiones de búsqueda. Por favor, inténtalo de nuevo en un minuto.',
        profilePicture: 'Demasiadas peticiones de cambio de foto de perfil. Inténtalo de nuevo más tarde.'
    },
    en: {
        global: 'Too many requests from this IP, please try again after a minute.',
        auth: 'Too many authentication attempts, please try again after a minute.',
        registration: 'Too many registration attempts, please try again after a minute.',
        search: 'Too many search requests, please try again after a minute.',
        profilePicture: 'Too many profile picture change requests, please try again later.'
    }
};


function detectLanguage(req: Request): 'es' | 'en' {
    const acceptLanguage = req.headers['accept-language'] || '';
    if (acceptLanguage.includes('es')) {
        return 'es';
    }
    return 'en';
}


function createRateLimitHandler(messageKey: keyof typeof rateLimitMessages.es) {
    return (req: Request, res: Response) => {
        const lang = detectLanguage(req);
        const message = rateLimitMessages[lang][messageKey];
        res.status(429).json({
            status: 'fail',
            data: {
                code: 'RATE_LIMIT_EXCEEDED',
                message
            }
        });
    };
}

export const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: createRateLimitHandler('global'),
    skipSuccessfulRequests: false,
});

export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: createRateLimitHandler('auth'),
    skipSuccessfulRequests: false,
});

export const registrationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: createRateLimitHandler('registration'),
    skipSuccessfulRequests: false,
});

export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: createRateLimitHandler('search'),
    skipSuccessfulRequests: false,
});

export const profilePictureRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: createRateLimitHandler('profilePicture'),
    skipSuccessfulRequests: false,
});