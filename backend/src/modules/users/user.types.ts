import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse } from "../../utils/responses.js";

// ==================== TIPOS DE USUARIO ====================

export interface SafeUser {
    id: string;
    username: string;
    email: string;
    role: "user" | "admin";
    preferences: {
        price_weight: number;
        duration_weight: number;
        stops_weight: number;
        airline_quality_weight: number;
    };
    /**
     * @isDateTime
     */
    created_at: string;
    /**
     * @isDateTime
     */
    last_seen_at: string;
    auth_version: number;
}

export interface PublicUser {
    id: string;
    username: string;
    role: "user" | "admin";
    /**
     * @isDateTime
     */
    created_at: string;
    /**
     * @isDateTime
     */
    last_seen_at: string;
}

// ==================== TIPOS DE RESPUESTA POR ENDPOINT ====================

/**
 * Respuesta del endpoint POST /users (registro)
 */
export type CreateUserResponseData = SafeUser;

/**
 * Respuesta del endpoint GET /users/me
 */
export type GetUserResponseData = SafeUser;

/**
 * Respuesta del endpoint GET /users/:id
 */
export type GetUserByIdResponseData = PublicUser;

/**
 * Respuesta del endpoint PATCH /users/me
 */
export type UpdateUserResponseData = SafeUser;

// ==================== TIPOS DE REQUEST ====================

export interface RegisterData {
    /**
     * @minLength 3
     * @maxLength 20
     */
    username: string;
    /**
     * @format email
     * @pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ 
     */
    email: string;
    /**
     * @minLength 8
     */
    password: string;
    preferences?: {
        /**
         * @minimum 0
         * @maximum 1
         */
        price_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        duration_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        stops_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        airline_quality_weight?: number;
    }
}

export interface UpdateUserData {
    /**
     * @minLength 3
     * @maxLength 20
     */
    username?: string;
    /**
     * @format email
     * @pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ 
     */
    email?: string;
    preferences?: {
        /**
         * @minimum 0
         * @maximum 1
         */
        price_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        duration_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        stops_weight?: number;
        /**
         * @minimum 0
         * @maximum 1
         */
        airline_quality_weight?: number;
    }
}

// ==================== TIPOS DE ERROR ====================

export type RegisterRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.username"
    | "body.email"
    | "body.password"
    | "body.preferences"
    | "body.preferences.price_weight"
    | "body.preferences.duration_weight"
    | "body.preferences.stops_weight"
    | "body.preferences.airline_quality_weight"
>>;

export type UpdateUserRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.username"
    | "body.email"
    | "body.preferences"
    | "body.preferences.price_weight"
    | "body.preferences.duration_weight"
    | "body.preferences.stops_weight"
    | "body.preferences.airline_quality_weight"
>>;

// Unión de todas las posibles respuestas 422 para register
export type RegisterValidationFailResponse = RegisterRequestValidationFailResponse | DatabaseValidationFailResponse;

// Unión de todas las posibles respuestas 422 para update
export type UpdateUserValidationFailResponse = UpdateUserRequestValidationFailResponse | DatabaseValidationFailResponse;