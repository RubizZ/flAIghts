import { Body, Controller, Get, Patch, Path, Post, Query, RequestProp, Response, Route, Security, SuccessResponse as SuccessResponseDecorator, Tags } from "tsoa";
import type { RegisterData, UpdateUserData, RegisterValidationFailResponse, UpdateUserValidationFailResponse, CreateUserResponseData, GetUserResponseData, User, PopulatedUser, UpdateUserResponseData, PublicUser, GetUserByIdResponseData, FriendUser, VerifyEmailResponseData, VerifyEmailValidationFailResponse, VerifyEmailErrorResponse, FriendRequestErrorResponse } from "./user.types.js";
import { inject, injectable } from "tsyringe";
import { UserService } from "./user.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { IFriend, IUser } from "./user.model.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { AuthFailResponse } from "../auth/auth.types.js";
import { UserAlreadyExistsError, UserNotFoundError, SelfFriendRequestError, AlreadyFriendsError, FriendRequestAlreadySentError, FriendRequestAlreadyReceivedError, NoPendingFriendRequestError, NoReceivedFriendRequestError, NotFriendsError, EmailAlreadyVerifiedError, EmailVerificationTokenInvalidOrExpiredError } from "./user.errors.js";
import type { PopulatedDoc } from "mongoose";

@injectable()
@Route("users")
@Tags("Users")
export class UsersController extends Controller {

    constructor(@inject(UserService) private userService: UserService) {
        super();
    }

    /**
     * Registra un nuevo usuario en el sistema.
     */
    @Post("/")
    @SuccessResponseDecorator(201, "Created")
    @Response<FailResponseFromError<UserAlreadyExistsError>>(409, "Email o username ya registrado")
    @Response<RegisterValidationFailResponse>(422, "Error de validación")
    public async createUser(@Body() body: RegisterData): Promise<SuccessResponse<CreateUserResponseData>> {
        const user = await this.userService.createUser(body);
        return this.sanitizeUser(user) satisfies CreateUserResponseData as any;
    }

    /**
     * Verifica el email de un usuario usando un código.
     */
    @Post("/verify-email")
    @SuccessResponseDecorator(200, "OK")
    @Response<VerifyEmailValidationFailResponse>(422, "Código de verificación inválido")
    @Response<VerifyEmailErrorResponse>(400, "Código de verificación inválido o expirado o Email ya verificado")
    public async verifyEmail(@Body() body: { email: string, code: string }): Promise<SuccessResponse<VerifyEmailResponseData>> {
        await this.userService.verifyEmail(body.email, body.code);
        return null as any;
    }


    /**
     * Obtiene los datos del usuario autenticado.
     */
    @Get("/me")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public getUser(@RequestProp('user') user: AuthenticatedUser): SuccessResponse<GetUserResponseData> {
        const { token, ...cleanUser } = user;
        return cleanUser satisfies GetUserResponseData as any;
    }

    /**
     * Actualiza los datos del usuario autenticado.
     */
    @Patch("/me")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<UserAlreadyExistsError>>(409, "Email o username ya en uso")
    @Response<UpdateUserValidationFailResponse>(422, "Error de validación")
    public async updateUser(@RequestProp('user') user: AuthenticatedUser, @Body() body: UpdateUserData): Promise<SuccessResponse<UpdateUserResponseData>> {
        const updatedUser = await this.userService.updateUser(user._id, body);
        return this.sanitizeUser(updatedUser) satisfies UpdateUserResponseData as any;
    }

    /**
     * Busca usuarios por regex en username.
     */
    @Get("/search")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async searchUsers(@Query() q: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<PublicUser[]>> {
        if (!q || !q.trim()) return [] satisfies PublicUser[] as any;
        const foundUsers = await this.userService.searchUsers(q.trim());
        const mappedUsers = foundUsers
            .filter(u => u._id.toString() !== user._id.toString())
            .map(u => {
                const sentReq = user.sent_friend_requests.some(req => (typeof req === 'string' ? req : req._id?.toString() || req.toString()) === u._id.toString());
                const recReq = user.received_friend_requests.some(req => (typeof req === 'string' ? req : req._id?.toString() || req.toString()) === u._id.toString());
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
        const targetUser = await this.userService.getUserById(id);
        if (targetUser._id === user._id) {
            return this.sanitizeUser(targetUser) satisfies GetUserByIdResponseData as any;
        }
        if (targetUser.friends.some(f => (typeof f.user === 'string' ? f.user : (f.user as any)._id?.toString() || f.user.toString()) === user._id)) {
            return this.sanitizeFriendUser(targetUser) satisfies GetUserByIdResponseData as any;
        }
        if (targetUser.sent_friend_requests.some(f => (typeof f === 'string' ? f : f._id) === user._id)) {
            return this.sanitizePublicUser(targetUser, true, false) satisfies GetUserByIdResponseData as any;
        }
        if (targetUser.received_friend_requests.some(f => (typeof f === 'string' ? f : f._id) === user._id)) {
            return this.sanitizePublicUser(targetUser, false, true) satisfies GetUserByIdResponseData as any;
        }
        return this.sanitizePublicUser(targetUser, false, false) satisfies GetUserByIdResponseData as any;
    }

    @Post("/{id}/send-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FriendRequestErrorResponse>(400, "Error en la solicitud de amistad (mismo usuario, ya amigos o solicitud ya existente)")
    public async sendFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<null>> {


        if (id === user._id) throw new SelfFriendRequestError();
        if (user.friends.some(f => f._id === id)) throw new AlreadyFriendsError();
        if (user.sent_friend_requests.some(req => req._id === id)) throw new FriendRequestAlreadySentError();
        if (user.received_friend_requests.some(req => req._id === id)) throw new FriendRequestAlreadyReceivedError();

        await this.userService.sendFriendRequest(user._id, id);
        return {} as any;
    }

    @Post("/{id}/cancel-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoPendingFriendRequestError>>(400, "No hay solicitud pendiente con este usuario")
    public async cancelFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<null>> {
        if (!user.sent_friend_requests.some(req => req._id === id)) throw new NoPendingFriendRequestError();

        await this.userService.cancelFriendRequest(user._id, id);
        return {} as any;
    }

    @Post("/{id}/accept-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoReceivedFriendRequestError>>(400, "No tienes ninguna solicitud de este usuario")
    public async acceptFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<null>> {
        if (!user.received_friend_requests.some(req => req._id === id)) throw new NoReceivedFriendRequestError();

        await this.userService.acceptFriendRequest(user._id, id);
        return {} as any;
    }

    @Post("/{id}/reject-friend-request")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NoReceivedFriendRequestError>>(400, "No tienes ninguna solicitud de este usuario para rechazar")
    public async rejectFriendRequest(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<null>> {
        if (!user.received_friend_requests.some(req => req._id === id)) throw new NoReceivedFriendRequestError();

        await this.userService.rejectFriendRequest(user._id, id);
        return {} as any;
    }

    @Post("/{id}/remove-friend")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    @Response<FailResponseFromError<NotFriendsError>>(400, "No tienes agregada a esa persona")
    public async removeFriend(@Path() id: string, @RequestProp('user') user: AuthenticatedUser): Promise<SuccessResponse<null>> {
        if (!user.friends.some(f => f._id === id)) throw new NotFriendsError();

        await this.userService.removeFriend(user._id, id);
        return {} as any;
    }

    private sanitizeUser(user: IUser): User {
        return {
            _id: user._id,
            type: 'self',
            public: user.public,
            username: user.username,
            email: user.email,
            email_verified: user.email_verified,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: user.auth_version,
            friends: user.friends.map(f => this.friendPopulatedDocToString(f)),
            sent_friend_requests: user.sent_friend_requests.map(p => this.userPopulatedDocToString(p)),
            received_friend_requests: user.received_friend_requests.map(p => this.userPopulatedDocToString(p))
        };
    }

    private userPopulatedDocToString(user: PopulatedDoc<IUser, string>): string {
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
            email_verified: user.email_verified,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: user.auth_version,
            friends: user.friends.filter(f => typeof f.user !== 'string').map(f => this.sanitizeFriendUser(f.user as IUser)),
            sent_friend_requests: user.sent_friend_requests.filter((f): f is IUser => typeof f !== 'string').map(f => this.sanitizePublicUser(f, true, false)),
            received_friend_requests: user.received_friend_requests.filter((f): f is IUser => typeof f !== 'string').map(f => this.sanitizePublicUser(f, false, true))
        };
    }

    private sanitizePublicUser(user: IUser, sentFriendRequest: boolean, receivedFriendRequest: boolean): PublicUser {
        return {
            _id: user._id,
            type: 'public',
            public: user.public,
            username: user.username,
            role: user.role,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            sent_friend_request: sentFriendRequest,
            received_friend_request: receivedFriendRequest
        };
    }

    private sanitizeFriendUser(user: IUser): FriendUser {
        return {
            _id: user._id,
            type: 'friend',
            username: user.username,
            role: user.role,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            friend_since: user.friends.find(f => f.user.toString() === user._id.toString())?.friend_since.toISOString() || new Date().toISOString()
        };
    }

}