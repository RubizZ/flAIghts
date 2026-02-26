import { Body, Controller, Post, Request, RequestProp, Response, Route, Security, Tags } from "tsoa";
import type { Request as ExpressRequest } from "express";
import { inject, injectable } from "tsyringe";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedUser, ChangePasswordRequest, ChangePasswordValidationFailResponse, ForgotPasswordRequest, ForgotPasswordValidationFailResponse, LoginRequest, LoginResponseData, LoginValidationFailResponse, ResetPasswordRequest, ResetPasswordValidationFailResponse } from "./auth.types.js";
import type { FailResponseFromError, MessageResponseData, SuccessResponse } from "../../utils/responses.js";
import type { AuthFailResponse } from "./auth.types.js";
import { InvalidCredentialsError, LoginUserNotFoundError, InvalidPasswordError, ResetTokenInvalidOrExpiredError } from "./auth.errors.js";

@injectable()
@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
    constructor(@inject(AuthService) private authService: AuthService) {
        super()
    }

    /**
     * Inicia sesión con un identificador (email o username) y contraseña.
     */
    @Post("/login")
    @Response<LoginValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<InvalidCredentialsError>>(401, "Credenciales inválidas")
    public async login(@Body() body: LoginRequest, @Request() request: ExpressRequest): Promise<SuccessResponse<LoginResponseData>> {
        const { identifier, password, responseType } = body;
        try {
            const result = await this.authService.login(identifier, password);

            switch (responseType) {
                case 'cookie':
                    console.log('Setting cookie for user:', result.userId);
                    request.res!.cookie('token', result.token, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'strict',
                        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                    });
                    return result satisfies LoginResponseData as any;
                case 'json':
                default:
                    return result satisfies LoginResponseData as any;
            }
        } catch (error) {
            // Transformar errores específicos a genérico por seguridad
            if (error instanceof LoginUserNotFoundError || error instanceof InvalidPasswordError) {
                throw new InvalidCredentialsError(identifier);
            }
            throw error;
        }
    }

    /**
     * Cierra la sesión actual (limpia la cookie del navegador).
     */
    @Post("/logout")
    public async logout(@Request() request: ExpressRequest): Promise<SuccessResponse<MessageResponseData>> {
        request.res!.clearCookie('token');
        return {
            message: "Sesión cerrada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Cierra todas las sesiones activas del usuario (invalida todos los tokens).
     */
    @Post("/logoutAll")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async logoutAll(@RequestProp("user") user: AuthenticatedUser, @Request() request: ExpressRequest): Promise<SuccessResponse<MessageResponseData>> {
        await this.authService.logoutAll(user.id);
        request.res!.clearCookie('token');
        return {
            message: "Sesiones cerradas correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Cambia la contraseña del usuario autenticado.
     */
    @Post("/change-password")
    @Security("jwt")
    @Response<ChangePasswordValidationFailResponse>(422, "Error de validación")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<InvalidPasswordError>>(401, "Contraseña incorrecta")
    @Response<FailResponseFromError<LoginUserNotFoundError>>(404, "Usuario no encontrado")
    public async changePassword(@RequestProp("user") user: AuthenticatedUser, @Body() body: ChangePasswordRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { oldPassword, newPassword } = body;
        await this.authService.changePassword(user.id, oldPassword, newPassword);
        return {
            message: "Contraseña cambiada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Solicita un email de recuperación de contraseña.
     * Por seguridad, siempre devuelve éxito aunque el email no exista.
     */
    @Post("/forgot-password")
    @Response<ForgotPasswordValidationFailResponse>(422, "Error de validación")
    public async forgotPassword(@Body() body: ForgotPasswordRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { email } = body;
        await this.authService.forgotPassword(email);
        return {
            message: "Si existe un usuario asociado a esa cuenta, se ha enviado un email de recuperación."
        } satisfies MessageResponseData as any;
    }

    /**
     * Restablece la contraseña usando un token de recuperación.
     */
    @Post("/reset-password")
    @Response<ResetPasswordValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<ResetTokenInvalidOrExpiredError>>(400, "Token inválido o expirado")
    public async resetPassword(@Body() body: ResetPasswordRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { token, newPassword } = body;
        await this.authService.resetPassword(token, newPassword);
        return {
            message: "Contraseña restablecida correctamente."
        } satisfies MessageResponseData as any;
    }
}
