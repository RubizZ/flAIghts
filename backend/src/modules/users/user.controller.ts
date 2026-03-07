import { Body, Controller, Get, Patch, Path, Post, Query, RequestProp, Response, Route, Security, SuccessResponse as SuccessResponseDecorator, Tags, Request, Consumes, Middlewares } from "tsoa";
import express from 'express';
import type {
    InitiateRegistrationData,
    CompleteRegistrationData,
    InitiateEmailChangeData,
    CompleteEmailChangeData,
    UpdateUserData,
    UpdateUserValidationFailResponse,
    InitiateRegistrationRequestValidationFailResponse,
    CompleteRegistrationRequestValidationFailResponse,
    InitiateEmailChangeRequestValidationFailResponse,
    CompleteEmailChangeRequestValidationFailResponse,
    GetUserResponseData,
    User,
    PopulatedUser,
    UpdateUserResponseData,
    PublicUser,
    GetUserByIdResponseData,
    FriendUser,
    SetProfilePictureRequest,
    RateLimitFailResponse
} from "./user.types.js";
import { inject, injectable } from "tsyringe";
import { UserService } from "./user.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { IFriend, IFriendPopulated, IUser, IUserUnpopulated } from "./models/user.model.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { AuthFailResponse } from "../auth/auth.types.js";
import {
    EmailAlreadyInUseError,
    UsernameAlreadyInUseError,
    UserNotFoundError,
    NoPendingFriendRequestError,
    NoReceivedFriendRequestError,
    NotFriendsError,
    EmailVerificationCodeInvalidOrExpiredError,
    InvalidProfilePictureError,
    SelfFriendRequestError,
    AlreadyFriendsError,
    FriendRequestAlreadySentError,
    FriendRequestAlreadyReceivedError,
    ProfilePictureTooLargeError
} from "./user.errors.js";
import { profilePictureRateLimit } from "../../middlewares/rate-limit.middleware.js";

@injectable()
@Route("users")
@Tags("Users")
export class UsersController extends Controller {

    constructor(@inject(UserService) private userService: UserService) {
        super();
    }

    /**
     * Paso 1 del registro: Inicia el registro enviando un código de verificación al email.
     */
    @Post("/register/initiate")
    @SuccessResponseDecorator(200, "OK")
    @Response<FailResponseFromError<EmailAlreadyInUseError>>(409, "Email ya registrado")
    @Response<InitiateRegistrationRequestValidationFailResponse>(422, "Error de validación")
    public async initiateRegistration(@Body() body: InitiateRegistrationData): Promise<SuccessResponse> {
        await this.userService.initiateRegistration(body);
        return {} satisfies {} as any;
    }

    /**
     * Paso 2 del registro: Completa el registro verificando el código y creando el usuario.
     */
    @Post("/register/complete")
    @SuccessResponseDecorator(201, "Created")
    @Response<FailResponseFromError<EmailAlreadyInUseError> | FailResponseFromError<UsernameAlreadyInUseError>>(409, "Email ya registrado")
    @Response<FailResponseFromError<EmailVerificationCodeInvalidOrExpiredError>>(400, "Código inválido o expirado")
    @Response<CompleteRegistrationRequestValidationFailResponse>(422, "Error de validación")
    public async completeRegistration(@Body() body: CompleteRegistrationData): Promise<SuccessResponse<User>> {
        const user = await this.userService.completeRegistration(body);
        this.setStatus(201);
        return this.sanitizeUser(user) satisfies User as any;
    }

    /**
     * Obtiene los datos del usuario autenticado.
     */
    @Get("/me")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async getSelfUser(@RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<GetUserResponseData>> {
        const freshUser = await this.userService.getUser(user._id, true);
        return this.sanitizePopulatedUser(freshUser) satisfies GetUserResponseData as any;
    }

    /**
     * Actualiza los datos del usuario autenticado (sin incluir email).
     */
    @Patch("/me")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<UsernameAlreadyInUseError>>(409, "El nombre de usuario ya está en uso")
    @Response<UpdateUserValidationFailResponse>(422, "Error de validación")
    public async updateUser(@RequestProp('user') user: AuthenticatedUser, @Body() body: UpdateUserData): Promise<SuccessResponse<UpdateUserResponseData>> {
        const updatedUser = await this.userService.updateUser(user._id, body);
        return this.sanitizeUser(updatedUser) satisfies UpdateUserResponseData as any;
    }

    /**
     * Inicia el proceso de cambio de email enviando códigos al email antiguo y al nuevo.
     */
    @Post("/me/change-email/initiate")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<EmailAlreadyInUseError>>(409, "El nuevo email ya está en uso")
    @Response<InitiateEmailChangeRequestValidationFailResponse>(422, "Error de validación")
    public async initiateEmailChange(@RequestProp('user') user: AuthenticatedUser, @Body() body: InitiateEmailChangeData): Promise<SuccessResponse> {
        await this.userService.initiateEmailChange(user._id, body);
        return {} satisfies {} as any;
    }

    /**
     * Completa el cambio de email verificando ambos códigos.
     */
    @Post("/me/change-email/complete")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<EmailVerificationCodeInvalidOrExpiredError>>(400, "Códigos inválidos o expirados")
    @Response<CompleteEmailChangeRequestValidationFailResponse>(422, "Error de validación")
    public async completeEmailChange(@RequestProp('user') user: AuthenticatedUser, @Body() body: CompleteEmailChangeData): Promise<SuccessResponse<User>> {
        const updatedUser = await this.userService.completeEmailChange(user._id, body);
        return this.sanitizeUser(updatedUser) satisfies User as any;
    }

    /**
     * Cancela el cambio de email pendiente.
     */
    @Post("/me/change-email/cancel")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    public async cancelEmailChange(@RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.cancelEmailChange(user._id);
        return {} satisfies {} as any;
    }

    /**
     * Busca usuarios.
     */
    @Get("/search")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async searchUsers(@Query() q: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<PublicUser[]>> {
        if (!q || !q.trim()) return [] satisfies PublicUser[] as any;
        const foundUsers = await this.userService.searchUsers(q.trim(), user._id);

        const mappedUsers = foundUsers
            .map(u => {
                const sentReq = u.received_friend_requests.some(reqId => reqId.toString() === user._id);
                const recReq = u.sent_friend_requests.some(reqId => reqId.toString() === user._id);

                return this.sanitizePublicUser(u, sentReq, recReq);
            });
        return mappedUsers satisfies PublicUser[] as any;
    }

    /**
     * Obtiene los datos de un usuario por su ID.
     */
    @Get("/{id}")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    public async getUserById(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<GetUserByIdResponseData>> {
        if (id === user._id) {
            const targetUser = await this.userService.getUser(id, true);
            return this.sanitizePopulatedUser(targetUser) satisfies GetUserByIdResponseData as any;
        } else {
            const targetUser = await this.userService.getUser(id, false);
            const friendship = targetUser.friends.find(f => f.user === user._id);

            if (friendship) {
                return this.sanitizeFriendUser(targetUser, friendship.friend_since) satisfies GetUserByIdResponseData as any;
            }

            const sentReq = targetUser.received_friend_requests.some(req => req === user._id);
            const recReq = targetUser.sent_friend_requests.some(req => req === user._id);

            return this.sanitizePublicUser(targetUser, sentReq, recReq) satisfies GetUserByIdResponseData as any;
        }
    }

    @Post("/{id}/send-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<SelfFriendRequestError> | FailResponseFromError<AlreadyFriendsError> | FailResponseFromError<FriendRequestAlreadySentError> | FailResponseFromError<FriendRequestAlreadyReceivedError>>(400, "Error en la solicitud de amistad")
    public async sendFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.sendFriendRequest(user._id, id);
        return {} satisfies {} as any;
    }

    @Post("/{id}/cancel-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoPendingFriendRequestError>>(400, "No hay solicitud pendiente")
    public async cancelFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.cancelFriendRequest(user._id, id);
        return {} satisfies {} as any;
    }

    @Post("/{id}/accept-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoReceivedFriendRequestError>>(400, "No has recibido solicitud de esta persona")
    public async acceptFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.acceptFriendRequest(user._id, id);
        return {} satisfies {} as any;
    }

    @Post("/{id}/reject-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoReceivedFriendRequestError>>(400, "No has recibido solicitud de esta persona")
    public async rejectFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.rejectFriendRequest(user._id, id);
        return {} satisfies {} as any;
    }

    @Post("/{id}/remove-friend")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NotFriendsError>>(400, "No tienes agregada a esa persona")
    public async removeFriend(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse> {
        await this.userService.removeFriend(user._id, id);
        return {} satisfies {} as any;
    }

    @Post("/me/profile-picture")
    @Middlewares(profilePictureRateLimit)
    @Consumes("application/octet-stream")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<InvalidProfilePictureError>>(400, "Error en la imagen")
    @Response<FailResponseFromError<ProfilePictureTooLargeError>>(413, "Imagen demasiado grande")
    @Response<RateLimitFailResponse>(429, "Límite de peticiones excedido")
    public async setProfilePicture(
        @RequestProp('user') user: AuthenticatedUser,
        @Body() body: SetProfilePictureRequest
    ): Promise<SuccessResponse> {
        await this.userService.setProfilePicture(user._id, body);
        return {} satisfies {} as any;
    }

    /**
     * Obtiene el avatar del usuario y redirige a la URL firmada de S3.
     */
    @Get("/{id}/avatar")
    @SuccessResponseDecorator(302, "Redirect to S3")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    public async getUserAvatar(@Path() id: string, @Request() request: express.Request): Promise<void> {
        const url = await this.userService.getProfilePictureUrl(id);
        const res = request.res!;
        res.redirect(url);
    }

    private sanitizeUser(user: IUser): User {
        return {
            _id: user._id,
            type: 'self',
            public: user.public,
            username: user.username,
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: user.auth_version,
            friends: user.friends.map(f => this.friendPopulatedDocToString(f)),
            sent_friend_requests: user.sent_friend_requests.map(p => this.userPopulatedDocToString(p)),
            received_friend_requests: user.received_friend_requests.map(p => this.userPopulatedDocToString(p)),
            pending_email: user.email_change_request?.new_email,
            profile_picture: this.getAvatarUrl(user)
        };
    }

    private userPopulatedDocToString(user: string | IUser): string {
        if (typeof user === 'string') return user;
        return user._id;
    }

    private friendPopulatedDocToString(friend: IFriend): string {
        if (typeof friend.user === 'string') return friend.user;
        return friend.user._id;
    }

    private sanitizePopulatedUser(user: IUser): PopulatedUser {
        return {
            _id: user._id,
            type: 'self',
            public: user.public,
            username: user.username,
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: user.auth_version,
            friends: user.friends.filter((f): f is IFriendPopulated => typeof f.user !== 'string').map(f => this.sanitizeFriendUser(f.user, f.friend_since)),
            sent_friend_requests: user.sent_friend_requests.filter((f): f is IUserUnpopulated => typeof f !== 'string').map(f => this.sanitizePublicUser(f, true, false)),
            received_friend_requests: user.received_friend_requests.filter((f): f is IUserUnpopulated => typeof f !== 'string').map(f => this.sanitizePublicUser(f, false, true)),
            pending_email: user.email_change_request?.new_email,
            profile_picture: this.getAvatarUrl(user)
        };
    }

    private sanitizePublicUser(user: IUserUnpopulated, sentFriendRequest: boolean, receivedFriendRequest: boolean): PublicUser {
        return {
            _id: user._id,
            type: 'public',
            public: user.public,
            username: user.username,
            role: user.role,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            sent_friend_request: sentFriendRequest,
            received_friend_request: receivedFriendRequest,
            profile_picture: this.getAvatarUrl(user)
        };
    }

    private sanitizeFriendUser(user: IUserUnpopulated, friendSince?: Date): FriendUser {
        return {
            _id: user._id,
            type: 'friend',
            username: user.username,
            role: user.role,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            friend_since: friendSince ? friendSince.toISOString() : user.friends.find(f => f.user.toString() === user._id.toString())!.friend_since.toISOString(),
            profile_picture: this.getAvatarUrl(user)
        };
    }

    private getAvatarUrl(user: { _id: string; profile_picture?: string }): string | undefined {
        if (!user.profile_picture) return undefined;

        // Extraemos el timestamp de la key (ej: media/avatars/uuid-TIMESTAMP.jpg)
        const parts = user.profile_picture.split('-');
        const hash = parts[parts.length - 1]?.split('.')[0] || Date.now();

        return `/users/${user._id}/avatar?v=${hash}`;
    }

}
