import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse, FailResponseFromError } from "../../utils/responses.js";
import type { PopulatedUser } from "../users/user.types.js";
import { NoTokenProvidedError, InvalidTokenError, TokenUserNotFoundError, AuthenticationVersionMismatchError, InvalidPasswordError } from "./auth.errors.js";

// ==================== TIPOS DE AUTENTICACIÓN ====================

/**
 * Tipo de respuesta para errores de autenticación JWT (401).
 * Cubre todos los errores lanzados por expressAuthentication:
 * - NO_TOKEN_PROVIDED: No se proporcionó token (con reason en details)
 * - INVALID_TOKEN: Token inválido o expirado
 * - TOKEN_USER_NOT_FOUND: Usuario del token ya no existe (con userId en details)
 * - AUTH_VERSION_MISMATCH: Sesión invalidada (con userId, currentVersion, tokenVersion en details)
 */
export type AuthFailResponse =
    | FailResponseFromError<NoTokenProvidedError>
    | FailResponseFromError<InvalidTokenError>
    | FailResponseFromError<TokenUserNotFoundError>
    | FailResponseFromError<AuthenticationVersionMismatchError>;

export interface AuthenticatedUser extends PopulatedUser {
    token: string;
}

/**
 * Respuesta del endpoint POST /auth/login
 */
export interface LoginResponseData {
    userId: string;
    token: string;
    authVersion: number;
}

export interface JWTPayload {
    userId: string;
    version: number;
}

// ==================== REQUEST BODIES ====================

export interface LoginRequest {
    /**
     * @minLength 3
     */
    identifier: string;
    /**
     * @minLength 8
     */
    password: string;
    /**
     * Indicates how the token should be returned.
     * @default "json"
     */
    responseType?: "cookie" | "json";
}

export interface ChangePasswordRequest {
    /**
     * @minLength 8
     */
    oldPassword: string;
    /**
     * @minLength 8
     */
    newPassword: string;
}

export interface ForgotPasswordRequest {
    /**
     * @format email
     * @pattern ^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$     */
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    /**
     * @minLength 8
     */
    newPassword: string;
}

// ==================== VALIDATION FAIL RESPONSES (422) ====================

export type LoginRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.identifier"
    | "body.password"
    | "body.responseType"
>>;

export type ChangePasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.oldPassword"
    | "body.newPassword"
>>;

export type ForgotPasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.email"
>>;

export type ResetPasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.token"
    | "body.newPassword"
>>;

// Uniones para todas las posibles respuestas 422
export type LoginValidationFailResponse = LoginRequestValidationFailResponse;
export type ChangePasswordValidationFailResponse = ChangePasswordRequestValidationFailResponse | DatabaseValidationFailResponse;
export type ForgotPasswordValidationFailResponse = ForgotPasswordRequestValidationFailResponse;
export type ResetPasswordValidationFailResponse = ResetPasswordRequestValidationFailResponse | DatabaseValidationFailResponse;

export type ChangePasswordErrorResponse = AuthFailResponse | FailResponseFromError<InvalidPasswordError>;
