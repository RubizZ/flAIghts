import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse, FailResponseFromError } from "../../utils/responses.js";
import type { EmailVerificationCodeInvalidOrExpiredError, EmailAlreadyVerifiedError, SelfFriendRequestError, AlreadyFriendsError, FriendRequestAlreadySentError, FriendRequestAlreadyReceivedError } from "./user.errors.js";

// ==================== TIPOS DE USUARIO ====================

export interface User {
    _id: string;
    type: 'self'
    username: string;
    public: boolean;
    email: string;
    email_verified: boolean;
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
    friends: string[];
    sent_friend_requests: string[];
    received_friend_requests: string[];
}

export interface PopulatedUser extends Omit<User, 'friends' | 'sent_friend_requests' | 'received_friend_requests'> {
    friends: FriendUser[];
    sent_friend_requests: PublicUser[];
    received_friend_requests: PublicUser[];
}

export interface FriendUser {
    _id: string;
    type: 'friend';
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
    /**
     * @isDateTime
     */
    friend_since: string;
}

export interface PublicUser {
    _id: string;
    type: 'public';
    username: string;
    public: boolean;
    role: "user" | "admin";
    /**
     * @isDateTime
     */
    created_at: string;
    /**
     * @isDateTime
     */
    last_seen_at: string;
    sent_friend_request: boolean;
    received_friend_request: boolean;
}

// ==================== TIPOS DE RESPUESTA POR ENDPOINT ====================

/**
 * Respuesta del endpoint POST /users (registro)
 */
export type CreateUserResponseData = User;

/**
 * Respuesta del endpoint POST /users/verify-email
 */
export type VerifyEmailResponseData = null;

/**
 * Respuesta del endpoint GET /users/me
 */
export type GetUserResponseData = PopulatedUser;

/**
 * Respuesta del endpoint GET /users/:id
 */
export type GetUserByIdResponseData = User | PublicUser | FriendUser;

/**
 * Respuesta del endpoint PATCH /users/me
 */
export type UpdateUserResponseData = User;

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

export type VerifyEmailRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    | "body"
    | "body.token"
>>;


// Unión de todas las posibles respuestas 422 para register
export type RegisterValidationFailResponse = RegisterRequestValidationFailResponse | DatabaseValidationFailResponse;

// Unión de todas las posibles respuestas 422 para update
export type UpdateUserValidationFailResponse = UpdateUserRequestValidationFailResponse | DatabaseValidationFailResponse;

// Unión de todas las posibles respuestas 422 para verify-email
export type VerifyEmailValidationFailResponse = VerifyEmailRequestValidationFailResponse | DatabaseValidationFailResponse;

// Respuestas de error consolidadas para TSOA (evitar stack overflow)
export type VerifyEmailErrorResponse = FailResponseFromError<EmailVerificationCodeInvalidOrExpiredError> | FailResponseFromError<EmailAlreadyVerifiedError>;
export type FriendRequestErrorResponse = FailResponseFromError<SelfFriendRequestError> | FailResponseFromError<AlreadyFriendsError> | FailResponseFromError<FriendRequestAlreadySentError> | FailResponseFromError<FriendRequestAlreadyReceivedError>;
