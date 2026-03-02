import { AppError } from "../../utils/errors.js";

export class UserAlreadyExistsError extends AppError<'CONFLICT', { field: 'email' | 'username'; value: string }> {
    public readonly code = 'CONFLICT';
    public readonly statusCode: number = 409;

    constructor(identifier: string, type: 'email' | 'username') {
        super(`User with ${type} ${identifier} already exists`);
        this.details = { field: type, value: identifier };
    }
}

export class UserNotFoundError extends AppError<'NOT_FOUND', { userId: string }> {
    public readonly code = 'NOT_FOUND';
    public readonly statusCode: number = 404;

    constructor(userId: string) {
        super(`User with ID ${userId} not found`);
        this.details = { userId };
    }
}

export class SelfFriendRequestError extends AppError<'SELF_FRIEND_REQUEST', undefined> {
    public readonly code = 'SELF_FRIEND_REQUEST';
    public readonly statusCode: number = 400;

    constructor() {
        super("No puedes enviarte una solicitud a ti mismo");
        this.details = undefined;
    }
}

export class AlreadyFriendsError extends AppError<'ALREADY_FRIENDS', undefined> {
    public readonly code = 'ALREADY_FRIENDS';
    public readonly statusCode: number = 400;

    constructor() {
        super("Este usuario ya es tu amigo");
        this.details = undefined;
    }
}

export class FriendRequestAlreadySentError extends AppError<'FRIEND_REQUEST_ALREADY_SENT', undefined> {
    public readonly code = 'FRIEND_REQUEST_ALREADY_SENT';
    public readonly statusCode: number = 400;

    constructor() {
        super("Ya has enviado una solicitud a este usuario");
        this.details = undefined;
    }
}

export class FriendRequestAlreadyReceivedError extends AppError<'FRIEND_REQUEST_ALREADY_RECEIVED', undefined> {
    public readonly code = 'FRIEND_REQUEST_ALREADY_RECEIVED';
    public readonly statusCode: number = 400;

    constructor() {
        super("El usuario ya te había enviado una petición, debes aceptarla");
        this.details = undefined;
    }
}

export class NoPendingFriendRequestError extends AppError<'NO_PENDING_FRIEND_REQUEST', undefined> {
    public readonly code = 'NO_PENDING_FRIEND_REQUEST';
    public readonly statusCode: number = 400;

    constructor() {
        super("No hay solicitud pendiente con este usuario");
        this.details = undefined;
    }
}

export class NoReceivedFriendRequestError extends AppError<'NO_RECEIVED_FRIEND_REQUEST', undefined> {
    public readonly code = 'NO_RECEIVED_FRIEND_REQUEST';
    public readonly statusCode: number = 400;

    constructor() {
        super("No tienes ninguna solicitud de este usuario");
        this.details = undefined;
    }
}

export class NotFriendsError extends AppError<'NOT_FRIENDS', undefined> {
    public readonly code = 'NOT_FRIENDS';
    public readonly statusCode: number = 400;

    constructor() {
        super("No tienes agregada a esa persona");
        this.details = undefined;
    }
}

export class EmailVerificationCodeInvalidOrExpiredError extends AppError<'EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED', undefined> {
    public readonly code = 'EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED';
    public readonly statusCode: number = 400;

    constructor() {
        super("El código de verificación es inválido o ha expirado");
        this.details = undefined;
    }
}

export class EmailAlreadyVerifiedError extends AppError<'EMAIL_ALREADY_VERIFIED', undefined> {
    public readonly code = 'EMAIL_ALREADY_VERIFIED';
    public readonly statusCode: number = 400;

    constructor() {
        super("El email ya ha sido verificado anteriormente");
        this.details = undefined;
    }
}
