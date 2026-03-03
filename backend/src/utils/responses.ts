// ==================== RESPUESTAS DE ÉXITO ====================

import type { AppError } from "./errors.js";

/**
 * Wrapper de éxito JSend (aplicado por el middleware global).
 */
export interface SuccessResponse<T = null> {
    status: 'success';
    data: T;
}

/**
 * Respuesta de éxito solo con mensaje (sin datos).
 * El wrapper global lo convertirá en: { status: 'success', data: { message: string } }
 */
export interface MessageResponseData {
    message: string;
}

// ==================== RESPUESTAS DE ERROR ====================


/**
 * Tipo genérico base para respuestas de error con código y detalles opcionales.
 */
export type FailResponse<TCode extends string, TDetails = undefined> = {
    status: 'fail';
    data: {
        code: TCode;
        message: string;
        details: TDetails;
    };
};

/**
 * Extrae automáticamente code y details de una clase AppError.
 * 
 * Ejemplo:
 * - FailResponseFromError<UserAlreadyExistsError> → { status: 'fail', data: { code: 'CONFLICT', message: string, details: { field, value } } }
 * - FailResponseFromError<UserNotFoundError> → { status: 'fail', data: { code: 'NOT_FOUND', message: string, details: { userId } } }
 */
export type FailResponseFromError<T extends AppError<any, any>> =
    T extends AppError<infer TCode, infer TDetails>
    ? FailResponse<TCode, TDetails>
    : never;

// Patrón para las claves de detalle de validación (el "regex" de TypeScript)
type ValidationKey = `body.${string}` | `query.${string}` | `path.${string}` | `header.${string}` | `formData.${string}` | `body` | `query` | `path` | `header` | `formData`;

/**
 * Generador de estructura de detalles.
 * Transforma una unión de llaves ('body' | 'body.id') en el objeto que TSOA espera.
 */
export type ValidationDetails<K extends ValidationKey> = {
    [P in K]?: { message: string, value?: any };
};

export type RequestValidationFailResponse<
    TDetails extends { [K in keyof TDetails]: K extends ValidationKey ? { message: string, value?: any } : never } | undefined = undefined,
> = {
    status: 'fail';
    data: {
        code: 'REQUEST_VALIDATION_ERROR';
        message: string;
        details: TDetails;
    };
};

export type DatabaseValidationFailResponse = { //TODO Hacer que el detalle tenga más información (que sea genérico)
    status: 'fail';
    data: {
        code: 'DATABASE_VALIDATION_ERROR';
        message: string;
        details: Record<string, { message: string; value: any }>;
    };
};
