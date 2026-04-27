import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse, FailResponseFromError, BodyPath } from "../../utils/responses.js";
import {
    NoTokenProvidedError,
    InvalidTokenError,
    TokenUserNotFoundError,
    AuthenticationVersionMismatchError,
    InvalidPasswordError,
    TurnstileVerificationFailedError,
    TurnstileMissingTokenError,
    TurnstileInvalidTokenError,
    TurnstileTokenAlreadySpentError,
    AccountLinkRequiredError,
    GoogleAccountAlreadyLinkedError,
    InvalidResetCodeError
} from "./auth.errors.js";

// ==================== TIPOS DE AUTENTICACIÓN ====================

/**
 * Tipo de respuesta para errores de login con Google (401).
 */
export type InvalidTokenFailResponse = FailResponseFromError<InvalidTokenError>;
export type InvalidPasswordFailResponse = FailResponseFromError<InvalidPasswordError>;
export type GoogleAccountAlreadyLinkedFailResponse = FailResponseFromError<GoogleAccountAlreadyLinkedError>;

export type GoogleLoginError401 = InvalidTokenFailResponse | InvalidPasswordFailResponse;

/**
 * Tipo de respuesta para errores de conexión de cuenta de Google (403).
 */
export type AccountLinkRequiredFailResponse = FailResponseFromError<AccountLinkRequiredError>;

/**
 * Tipo de respuesta para errores de Turnstile (403).
 */
export type TurnstileFailResponse =
    | FailResponseFromError<TurnstileVerificationFailedError>
    | FailResponseFromError<TurnstileMissingTokenError>
    | FailResponseFromError<TurnstileInvalidTokenError>
    | FailResponseFromError<TurnstileTokenAlreadySpentError>;

export type AuthError403 = AccountLinkRequiredFailResponse | TurnstileFailResponse | FailResponseFromError<InvalidResetCodeError>;

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

export interface AuthenticatedUser {
    _id: string;
    username: string;
    email: string;
    role: "user" | "admin" | "superadmin";
    auth_version: number;
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
     * Cloudflare Turnstile token for bot protection.
     */
    turnstileToken: string;
}

export interface GoogleLoginRequest {
    credential: string;
    password?: string;
    newPassword?: string;
    verificationCode?: string;
    transactionId?: string;

}

export interface RequestLinkingResetRequest {
    /**
     * @format email
     */
    email: string;

}

export interface SecurityCodeResponse {
    transactionId: string;
}

export interface GoogleConnectRequest {
    credential: string;
    verificationCode: string;
    transactionId: string;
}

export interface DisconnectGoogleRequest {
    verificationCode: string;
    transactionId: string;
}

export interface ChangePasswordRequest {
    /**
     * @minLength 8
     */
    newPassword: string;
    verificationCode: string;
    transactionId: string;
}

export interface SecurityCodeRequest {
    actionName: string;
}

export interface SetPasswordRequest {
    /**
     * @minLength 8
     */
    password: string;
    verificationCode: string;
    transactionId: string;
}

export interface SecurityCodeRequest {
    actionName: string;
}

export interface ForgotPasswordRequest {
    /**
     * @format email
     * @pattern ^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$     */
    email: string;
    /**
     * Cloudflare Turnstile token for bot protection.
     */
    turnstileToken: string;
}

export interface ResetPasswordRequest {
    token: string;
    /**
     * @minLength 8
     */
    newPassword: string;
}

// ==================== VALIDATION FAIL RESPONSES (422) ====================

export type LoginValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<LoginRequest>
>>;

export type GoogleLoginValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<GoogleLoginRequest>
>>;

export type GoogleConnectValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<GoogleConnectRequest>
>>;

export type ChangePasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<ChangePasswordRequest>
>>;

export type ForgotPasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<ForgotPasswordRequest>
>>;

export type ResetPasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<ResetPasswordRequest>
>>;

// Uniones para todas las posibles respuestas 422
// Ya no usamos unión para login porque son requests diferentes con detalles diferentes.
export type ChangePasswordValidationFailResponse = ChangePasswordRequestValidationFailResponse | DatabaseValidationFailResponse;
export type ForgotPasswordValidationFailResponse = ForgotPasswordRequestValidationFailResponse;
export type ResetPasswordValidationFailResponse = ResetPasswordRequestValidationFailResponse | DatabaseValidationFailResponse;

export type SetPasswordRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<SetPasswordRequest>
>>;
export type SetPasswordValidationFailResponse = SetPasswordRequestValidationFailResponse | DatabaseValidationFailResponse;

export type ChangePasswordErrorResponse = AuthFailResponse | FailResponseFromError<InvalidPasswordError>;
