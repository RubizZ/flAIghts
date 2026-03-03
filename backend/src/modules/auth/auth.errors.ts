import { AppError } from "../../utils/errors.js";

// Errores de token JWT
export class NoTokenProvidedError extends AppError<'NO_TOKEN_PROVIDED', { reason: string }> {
    public readonly code = 'NO_TOKEN_PROVIDED';
    public readonly statusCode: number = 401;

    constructor(reason: string) {
        super(`No token provided in authorization header: ${reason}`);
        this.details = { reason };
    }
}

export class InvalidTokenError extends AppError<'INVALID_TOKEN'> {
    public readonly code = 'INVALID_TOKEN';
    public readonly statusCode: number = 401;

    constructor(reason: string = 'Invalid token') {
        super(reason);
    }
}

export class TokenUserNotFoundError extends AppError<'TOKEN_USER_NOT_FOUND', { userId: string }> {
    public readonly code = 'TOKEN_USER_NOT_FOUND';
    public readonly statusCode: number = 401;

    constructor(userId: string) {
        super("The user associated with this token no longer exists.");
        this.details = { userId };
    }
}

export class AuthenticationVersionMismatchError extends AppError<'AUTH_VERSION_MISMATCH', { userId: string; currentVersion: number; tokenVersion: number }> {
    public readonly code = 'AUTH_VERSION_MISMATCH';
    public readonly statusCode: number = 401;

    constructor(userId: string, currentVersion: number, tokenVersion: number) {
        super("Authentication version mismatch. Please login again.");
        this.details = { userId, currentVersion, tokenVersion };
    }
}

// Errores de autenticación (login) - internos, específicos
export class LoginUserNotFoundError extends AppError<'USER_NOT_FOUND', { identifier: string }> {
    public readonly code = 'USER_NOT_FOUND';
    public readonly statusCode: number = 401;

    constructor(identifier: string) {
        super(`User not found for identifier: ${identifier}`);
        this.details = { identifier };
    }
}

export class InvalidPasswordError extends AppError<'INVALID_PASSWORD', { identifier: string }> {
    public readonly code = 'INVALID_PASSWORD';
    public readonly statusCode: number = 401;

    constructor(identifier: string) {
        super(`Invalid password for identifier: ${identifier}`);
        this.details = { identifier };
    }
}

// Errores de autenticación (login) - públicos, genéricos
export class InvalidCredentialsError extends AppError<'INVALID_CREDENTIALS', { identifier: string }> {
    public readonly code = 'INVALID_CREDENTIALS';
    public readonly statusCode: number = 401;

    constructor(identifier: string) {
        super(`Invalid credentials for identifier: ${identifier}`);
        this.details = { identifier };
    }
}

// Errores de reset de contraseña
export class ResetTokenInvalidOrExpiredError extends AppError<'RESET_TOKEN_INVALID_OR_EXPIRED'> {
    public readonly code = 'RESET_TOKEN_INVALID_OR_EXPIRED';
    public readonly statusCode: number = 400;

    constructor() {
        super("The reset token is invalid or has expired.");
    }
}

export class EmailNotVerifiedError extends AppError<'EMAIL_NOT_VERIFIED', { email: string }> {
    public readonly code = 'EMAIL_NOT_VERIFIED';
    public readonly statusCode: number = 403;

    constructor(email: string) {
        super(`Email ${email} has not been verified.`);
        this.details = { email };
    }
}

export class NewPasswordSameAsOldError extends AppError<'NEW_PASSWORD_SAME_AS_OLD'> {
    public readonly code = 'NEW_PASSWORD_SAME_AS_OLD';
    public readonly statusCode: number = 400;

    constructor() {
        super("La nueva contraseña debe ser diferente a la actual.");
    }
}
