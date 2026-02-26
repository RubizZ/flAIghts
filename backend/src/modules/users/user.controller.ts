import { Body, Controller, Get, Patch, Path, Post, RequestProp, Response, Route, Security, SuccessResponse as SuccessResponseDecorator, Tags } from "tsoa";
import type { RegisterData, UpdateUserData, RegisterValidationFailResponse, UpdateUserValidationFailResponse, CreateUserResponseData, GetUserResponseData, SafeUser, UpdateUserResponseData, PublicUser, GetUserByIdResponseData } from "./user.types.js";
import { inject, injectable } from "tsyringe";
import { UserService } from "./user.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { IUser } from "./user.model.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { AuthFailResponse } from "../auth/auth.types.js";
import { UserAlreadyExistsError, UserNotFoundError } from "./user.errors.js";

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
        const updatedUser = await this.userService.updateUser(user.id, body);
        return this.sanitizeUser(updatedUser) satisfies UpdateUserResponseData as any;
    }

    /**
     * Obtiene los datos de un usuario por su ID.
     */
    @Get("/{id}")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    public async getUserById(@Path() id: string): Promise<SuccessResponse<GetUserByIdResponseData>> {
        const targetUser = await this.userService.getUserById(id);
        return this.sanitizePublicUser(targetUser) satisfies GetUserByIdResponseData as any;
    }

    private sanitizeUser(user: IUser): SafeUser {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: user.auth_version
        };
    }

    private sanitizePublicUser(user: IUser): PublicUser {
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString()
        };
    }

}