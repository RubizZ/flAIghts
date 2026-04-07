import 'reflect-metadata'
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { RegisterRoutes } from './tsoa/routes.js';
import { ValidateError as TsoaValidateError } from 'tsoa';
import { AppError, CorsError } from './utils/errors.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import compression from 'compression';
import { Error as MongooseError } from 'mongoose';
import { container } from 'tsyringe';
import { ServerConfig } from './config/server.config.js';
import { contextStorage, type RequestContext } from './utils/context.js';
import logger from './utils/logger.js';
import {
    globalApiLimiter,
    authLimiter,
    registrationLimiter,
    searchLimiter
} from './middlewares/rateLimiter.js';


logger.info(`
   __ _          _____      _     _       
  / _| |   /\\   |_   _|    | |   | |      
 | |_| |  /  \\    | |  __ _| |__ | |_ ___ 
 |  _| | / /\\ \\   | | / _\` | '_ \\| __/ __|
 | | | |/ ____ \\ _| || (_| | | | | |_\\__ \\
 |_| |_/_/    \\_\\____/\\__, |_| |_|\\__|___/
                       __/ |              
                      |___/               
`);



const config = container.resolve(ServerConfig);

const PORT = config.PORT;

const app = express();
app.use(compression());

const origins = config.ALLOWED_ORIGINS || [];
if (config.FRONTEND_URL) {
    origins.unshift(config.FRONTEND_URL);
}
const allOrigins = Array.from(new Set(origins));

const originRegexes = allOrigins.map(o => {
    const pattern = o
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`);
});

app.use(cors({
    origin: (origin, callback) => {
        // En desarrollo, permitimos cualquier origen para facilitar el testing
        if (!origin || config.NODE_ENV === 'development') {
            return callback(null, true);
        }

        if (originRegexes.some(regex => regex.test(origin))) {
            callback(null, true);
        } else {
            callback(new CorsError());
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request Context Middleware for auditing and tracking
app.use((req, res, next) => {
    const store: RequestContext = {
        ip: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
        userAgent: req.headers['user-agent'] || '',
        userId: null // Puede actualizarse en el middleware de autenticación si es necesario
    };
    contextStorage.run(store, next);
});

// Connect to database
await connectDB(config.MONGODB_URI);

// Middleware to wrap all successful responses in JSend format
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        // Only wrap if it's a success status (2xx)
        // and it's not already wrapped (to accept manual JSend responses in controllers)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const isAlreadyWrapped = body && typeof body === 'object' && 'status' in body && 'data' in body;
            if (!isAlreadyWrapped) {
                return originalJson.call(this, {
                    status: 'success',
                    data: body
                });
            }
        }
        return originalJson.call(this, body);
    };
    next();
});

// Swagger UI documentation (only in development)
if (config.NODE_ENV !== 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const openApiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/openapi.json'), 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}


// Authentication endpoints rate limiter (5 req/min)
app.post('/auth/login', authLimiter);
app.post('/auth/forgot-password', authLimiter);
app.post('/auth/reset-password', authLimiter);

// Registration endpoints rate limiter (3 req/min)
app.post('/users/register/initiate', registrationLimiter);
app.post('/users/register/complete', registrationLimiter);

// Search endpoint rate limiter (20 req/min)
app.post('/search', searchLimiter);

// Global API rate limiter (100 req/min)
app.use(globalApiLimiter);


// Authentication endpoints rate limiter (5 req/min)
app.post('/auth/login', authLimiter);
app.post('/auth/forgot-password', authLimiter);
app.post('/auth/reset-password', authLimiter);

// Registration endpoints rate limiter (3 req/min)
app.post('/users/register/initiate', registrationLimiter);
app.post('/users/register/complete', registrationLimiter);

// Search endpoint rate limiter (20 req/min)
app.post('/search', searchLimiter);

// Global API rate limiter (100 req/min)
app.use(globalApiLimiter);

// Register routes from tsoa
RegisterRoutes(app)

// Error handling middleware for validation request errors, business logic errors and unhandled errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): express.Response | void => {
    // Validación de REQUEST: errores en los datos del HTTP request (tipo, formato, rango)
    // Estos errores vienen de tsoa antes de ejecutar el controlador
    if (err instanceof TsoaValidateError) {
        logger.warn({ error: err }, `REQUEST_VALIDATION_ERROR on ${req.method} ${req.path}`);
        return res.status(422).json({
            status: 'fail',
            data: {
                code: 'REQUEST_VALIDATION_ERROR',
                message: 'Request validation failed',
                details: err.fields,
            },
        });
    }

    // Validación de BASE DE DATOS: errores de Mongoose ValidationError
    // Estos errores vienen cuando un documento no cumple las validaciones del schema
    if (err instanceof MongooseError.ValidationError) {
        logger.warn({ error: err }, `DATABASE_VALIDATION_ERROR on ${req.method} ${req.path}`);
        const details: Record<string, { message: string; value: any }> = {};
        for (const key in err.errors) {
            const error = err.errors[key];
            if (error) {
                details[key] = {
                    message: error.message,
                    value: error.value
                };
            }
        }
        return res.status(422).json({
            status: 'fail',
            data: {
                code: 'DATABASE_VALIDATION_ERROR',
                message: err.message,
                details
            },
        });
    }

    // Errores de NEGOCIO: errores del servicio
    // Incluye lógica de negocio, conflictos, recursos no encontrados, etc.
    if (err instanceof AppError) {
        logger.info({ error: err.toJSON() }, `AppError on ${req.method} ${req.path}`);
        return res.status(err.statusCode).json({
            status: 'fail',
            data: err.toJSON()
        });
    }

    // Errores de CORS: bloqueo de orígenes no permitidos
    if (err instanceof CorsError) {
        logger.warn({ origin: req.headers.origin }, `CORS Error on ${req.method} ${req.path}: ${err.message}`);
        return res.status(403).json({
            status: 'fail',
            message: err.message
        });
    }

    // Errores INTERNOS no capturados
    if (err instanceof Error) {
        logger.error({ error: err }, `Unhandled Error on ${req.method} ${req.path}`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
        });
    }

    next();
});

app.listen(PORT, () => {
    logger.info(`Server initialized successfully on port ${PORT}`);
});