import type { ValidationDetails, RequestValidationFailResponse, DatabaseValidationFailResponse, FailResponseFromError, RateLimitFailResponse, BodyPath } from "../../utils/responses.js";
export type { RateLimitFailResponse };

// ==================== TIPOS DE USUARIO ====================

export interface User {
    _id: string;
    type: 'self'
    username: string;
    public: boolean;
    email: string;
    role: "user" | "admin" | "superadmin";
    preferences: {
        price_weight: number;
        duration_weight: number;
        stops_weight: number;
        airline_quality_weight: number;
    };
    created_at: string;
    last_seen_at: string;
    auth_version: number;
    friends: string[];
    sent_friend_requests: string[];
    received_friend_requests: string[];
    pending_email?: string;
    profile_picture?: string;
    google_id?: string;
    google_email?: string;
    is_password_set: boolean;
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
    role: "user" | "admin" | "superadmin";
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
    profile_picture?: string;
}

export interface PublicUser {
    _id: string;
    type: 'public';
    username: string;
    public: boolean;
    role: "user" | "admin" | "superadmin";
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
    profile_picture?: string;
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
export type GetUserByIdResponseData = PopulatedUser | User | PublicUser | FriendUser;

/**
 * Respuesta del endpoint PATCH /users/me
 */
export type UpdateUserResponseData = User;

// ==================== TIPOS DE REQUEST ====================

export interface UpdateUserData {
    /**
     * @minLength 3
     * @maxLength 20
     */
    username?: string;
    public?: boolean;
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


export interface InitiateRegistrationData {
    /**
     * @format email
     * @pattern ^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$     */
    email: string;
}

export interface CompleteRegistrationData {
    /**
     * @format email
     * @pattern ^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$     */
    email: string;
    /**
     * @minLength 6
     * @maxLength 6
     */
    code: string;
    /**
     * @minLength 3
     * @maxLength 20
     */
    username: string;
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
    };
}

export interface InitiateEmailChangeData {
    /**
     * @format email
     * @pattern ^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$     */
    newEmail: string;
}

export interface CompleteEmailChangeData {
    /**
     * @minLength 6
     * @maxLength 6
     */
    oldEmailCode: string;
    /**
     * @minLength 6
     * @maxLength 6
     */
    newEmailCode: string;
}

// Tipo para soportar solo Binario (Buffer)
export type SetProfilePictureRequest = Buffer;

// ==================== TIPOS DE ERROR ====================

export type RegisterRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<CompleteRegistrationData>
>>;

export type UpdateUserRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<UpdateUserData>
>>;

export type InitiateRegistrationRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<InitiateRegistrationData>
>>;

export type CompleteRegistrationRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<CompleteRegistrationData>
>>;

export type InitiateEmailChangeRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<InitiateEmailChangeData>
>>;

export type CompleteEmailChangeRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<CompleteEmailChangeData>
>>;

export type VerifyEmailRequestValidationFailResponse = RequestValidationFailResponse<ValidationDetails<
    BodyPath<{ code: string }>
>>;


// Unión de todas las posibles respuestas 422 para register
export type RegisterValidationFailResponse = RegisterRequestValidationFailResponse | DatabaseValidationFailResponse;

// Unión de todas las posibles respuestas 422 para update
export type UpdateUserValidationFailResponse = UpdateUserRequestValidationFailResponse | DatabaseValidationFailResponse;

// Unión de todas las posibles respuestas 422 para verify-email
export type VerifyEmailValidationFailResponse = VerifyEmailRequestValidationFailResponse | DatabaseValidationFailResponse;
