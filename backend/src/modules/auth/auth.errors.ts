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

export class InvalidResetCodeError extends AppError<'INVALID_RESET_CODE'> {
    public readonly code = 'INVALID_RESET_CODE';
    public readonly statusCode: number = 400;

    constructor() {
        super("El código de verificación es inválido o ha expirado.");
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

export class GoogleAccountAlreadyLinkedError extends AppError<'GOOGLE_ACCOUNT_ALREADY_LINKED', { email: string }> {
    public readonly code = 'GOOGLE_ACCOUNT_ALREADY_LINKED';
    public readonly statusCode: number = 409;

    constructor(email: string) {
        super(`Esta cuenta de Google ya está vinculada a otro usuario.`);
        this.details = { email };
    }
}

export class CannotDisconnectGoogleWithoutPasswordError extends AppError<'CANNOT_DISCONNECT_GOOGLE_WITHOUT_PASSWORD'> {
    public readonly code = 'CANNOT_DISCONNECT_GOOGLE_WITHOUT_PASSWORD';
    public readonly statusCode: number = 400;

    constructor() {
        super("Debes establecer una contraseña antes de desconectar tu cuenta de Google para no perder el acceso.");
    }
}

export class PasswordAlreadySetError extends AppError<'PASSWORD_ALREADY_SET'> {
    public readonly code = 'PASSWORD_ALREADY_SET';
    public readonly statusCode: number = 400;

    constructor() {
        super("Ya has establecido una contraseña. Usa el cambio de contraseña si quieres modificarla.");
    }
}

export abstract class TurnstileError<TCode extends string = string> extends AppError<TCode> {
    public readonly statusCode: number = 403;
}

export class TurnstileVerificationFailedError extends TurnstileError<'TURNSTILE_VERIFICATION_FAILED'> {
    public readonly code = 'TURNSTILE_VERIFICATION_FAILED';
    constructor() {
        super("La verificación de seguridad ha fallado. Por favor, inténtalo de nuevo.");
    }
}

export class TurnstileMissingTokenError extends TurnstileError<'TURNSTILE_MISSING_TOKEN'> {
    public readonly code = 'TURNSTILE_MISSING_TOKEN';
    constructor() {
        super("Falta el token de verificación de seguridad.");
    }
}

export class TurnstileInvalidTokenError extends TurnstileError<'TURNSTILE_INVALID_TOKEN'> {
    public readonly code = 'TURNSTILE_INVALID_TOKEN';
    constructor() {
        super("El token de seguridad no es válido.");
    }
}

export class TurnstileTokenAlreadySpentError extends TurnstileError<'TURNSTILE_TOKEN_ALREADY_SPENT'> {
    public readonly code = 'TURNSTILE_TOKEN_ALREADY_SPENT';
    constructor() {
        super("La verificación de seguridad ya ha sido utilizada o ha expirado.");
    }
}

export class AccountLinkRequiredError extends AppError<'ACCOUNT_LINK_REQUIRED', { email: string }> {
    public readonly code = 'ACCOUNT_LINK_REQUIRED';
    public readonly statusCode: number = 403;

    constructor(email: string) {
        super(`Ya existe una cuenta con el correo ${email}. Para vincularla con Google, por favor introduce tu contraseña.`);
        this.details = { email };
    }
}
