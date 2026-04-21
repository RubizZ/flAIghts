import { Body, Controller, Post, Request, RequestProp, Response, Route, Security, Tags } from "tsoa";
import type { Request as ExpressRequest } from "express";
import { inject, injectable } from "tsyringe";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedUser, ChangePasswordRequest, ChangePasswordValidationFailResponse, ForgotPasswordRequest, ForgotPasswordValidationFailResponse, LoginRequest, LoginResponseData, LoginValidationFailResponse, ResetPasswordRequest, ResetPasswordValidationFailResponse, ChangePasswordErrorResponse, GoogleLoginRequest, GoogleLoginValidationFailResponse, GoogleConnectRequest, GoogleConnectValidationFailResponse, SetPasswordRequest, SetPasswordValidationFailResponse } from "./auth.types.js";
import type { FailResponseFromError, MessageResponseData, SuccessResponse } from "../../utils/responses.js";
import type { AuthFailResponse } from "./auth.types.js";
import { InvalidCredentialsError, LoginUserNotFoundError, InvalidPasswordError, ResetTokenInvalidOrExpiredError, NewPasswordSameAsOldError, InvalidTokenError, GoogleAccountAlreadyLinkedError, CannotDisconnectGoogleWithoutPasswordError, PasswordAlreadySetError } from "./auth.errors.js";

import { ServerConfig } from "../../config/server.config.js";

import logger from "../../utils/logger.js";

@injectable()
@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(ServerConfig) private config: ServerConfig
    ) {
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
                    logger.info(`Setting auth cookie for user: ${result.userId}`);
                    const isProduction = this.config.NODE_ENV === 'production';
                    request.res!.cookie('token', result.token, {
                        httpOnly: true,
                        secure: isProduction,
                        sameSite: 'lax',
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
     * Inicia sesión o registra usuario mediante Google OAuth.
     */
    @Post("/login/google")
    @Response<GoogleLoginValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<InvalidTokenError>>(401, "Token de Google inválido")
    public async loginWithGoogle(@Body() body: GoogleLoginRequest, @Request() request: ExpressRequest): Promise<SuccessResponse<LoginResponseData>> {
        const { credential, responseType } = body;

        const result = await this.authService.loginWithGoogle(credential);

        switch (responseType) {
            case 'cookie':
                logger.info(`Setting auth cookie for user: ${result.userId} via Google`);
                const isProduction = this.config.NODE_ENV === 'production';
                request.res!.cookie('token', result.token, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });
                return result satisfies LoginResponseData as any;
            case 'json':
            default:
                return result satisfies LoginResponseData as any;
        }
    }

    /**
     * Vincula la cuenta de Google al usuario actual.
     */
    @Post("/google/connect")
    @Security("jwt")
    @Response<GoogleConnectValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<InvalidTokenError>>(401, "Token de Google inválido")
    @Response<FailResponseFromError<GoogleAccountAlreadyLinkedError>>(409, "Cuenta de Google ya vinculada")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async connectGoogle(@RequestProp("user") user: AuthenticatedUser, @Body() body: GoogleConnectRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { credential } = body;
        await this.authService.connectGoogle(user._id, credential);
        return {
            message: "Cuenta de Google vinculada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Desvincula la cuenta de Google del usuario actual.
     */
    @Post("/google/disconnect")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    @Response<FailResponseFromError<CannotDisconnectGoogleWithoutPasswordError>>(400, "Debe establecer una contraseña primero")
    public async disconnectGoogle(@RequestProp("user") user: AuthenticatedUser): Promise<SuccessResponse<MessageResponseData>> {
        await this.authService.disconnectGoogle(user._id);
        return {
            message: "Cuenta de Google desvinculada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
 * Cierra la sesión actual (limpia la cookie del navegador).
 */
    @Post("/logout")
    public async logout(@Request() request: ExpressRequest): Promise<SuccessResponse<MessageResponseData>> {
        const isProduction = this.config.NODE_ENV === 'production';
        request.res!.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict'
        });
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
        await this.authService.logoutAll(user._id);
        const isProduction = this.config.NODE_ENV === 'production';
        request.res!.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict'
        });
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
    @Response<ChangePasswordErrorResponse>(401, "No autenticado o contraseña incorrecta")
    @Response<FailResponseFromError<NewPasswordSameAsOldError>>(400, "Nueva contraseña igual a la anterior")
    @Response<FailResponseFromError<LoginUserNotFoundError>>(404, "Usuario no encontrado")
    public async changePassword(@RequestProp("user") user: AuthenticatedUser, @Body() body: ChangePasswordRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { oldPassword, newPassword } = body;
        await this.authService.changePassword(user._id, oldPassword, newPassword);
        return {
            message: "Contraseña cambiada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Establece la contraseña por primera vez para el usuario autenticado (si no tiene una).
     */
    @Post("/set-password")
    @Security("jwt")
    @Response<SetPasswordValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<PasswordAlreadySetError>>(400, "Contraseña ya establecida")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async setPassword(@RequestProp("user") user: AuthenticatedUser, @Body() body: SetPasswordRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { password } = body;
        await this.authService.setPassword(user._id, password);
        return {
            message: "Contraseña establecida correctamente."
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
        try {
            await this.authService.forgotPassword(email);
        } catch {
            // Por seguridad, no se debe hacer nada si el usuario no existe.
        }
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
