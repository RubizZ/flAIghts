import 'dotenv/config'
import 'reflect-metadata'
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { RegisterRoutes } from './tsoa/routes.js';
import { ValidateError as TsoaValidateError } from 'tsoa';
import { AppError } from './utils/errors.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { Error as MongooseError } from 'mongoose';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();

const origins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim().replace(/\/$/, '')) || [];
if (process.env.FRONTEND_URL) {
    origins.unshift(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

const originRegexes = origins.map(o => {
    const pattern = o
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`);
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (originRegexes.some(regex => regex.test(origin))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to database
connectDB();

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
if (process.env.NODE_ENV !== 'production') {
    const openApiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/openapi.json'), 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

// Register routes from tsoa
RegisterRoutes(app)

// Error handling middleware for validation request errors, business logic errors and unhandled errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): express.Response | void => {
    // Validación de REQUEST: errores en los datos del HTTP request (tipo, formato, rango)
    // Estos errores vienen de tsoa antes de ejecutar el controlador
    if (err instanceof TsoaValidateError) {
        console.log('REQUEST_VALIDATION_ERROR on path %s:\n', req.path, err);
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
        console.log('DATABASE_VALIDATION_ERROR on path %s:\n', req.path, err);
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
        console.log(`AppError on path ${req.path}:\n`, err);
        return res.status(err.statusCode).json({
            status: 'fail',
            data: err.toJSON()
        });
    }

    // Errores INTERNOS no capturados
    if (err instanceof Error) {
        console.error(`Unhandled Error on path ${req.path}:\n`, err);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
        });
    }

    next();
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});