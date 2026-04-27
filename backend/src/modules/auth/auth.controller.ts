import { Body, Controller, Post, Request, RequestProp, Response, Route, Security, Tags } from "tsoa";
import type { Request as ExpressRequest } from "express";
import { inject, injectable } from "tsyringe";
import { AuthService } from "./auth.service.js";
import { TurnstileService } from "./turnstile.service.js";
import type { AuthenticatedUser, ChangePasswordRequest, ChangePasswordValidationFailResponse, ForgotPasswordRequest, ForgotPasswordValidationFailResponse, LoginRequest, LoginResponseData, LoginValidationFailResponse, ResetPasswordRequest, ResetPasswordValidationFailResponse, ChangePasswordErrorResponse, GoogleLoginRequest, GoogleLoginValidationFailResponse, GoogleConnectRequest, GoogleConnectValidationFailResponse, SetPasswordRequest, SetPasswordValidationFailResponse, TurnstileFailResponse, AccountLinkRequiredFailResponse, InvalidTokenFailResponse, GoogleLoginError401, AuthError403, RequestLinkingResetRequest, DisconnectGoogleRequest, SecurityCodeRequest, SecurityCodeResponse } from "./auth.types.js";
import type { FailResponseFromError, MessageResponseData, SuccessResponse } from "../../utils/responses.js";
import type { AuthFailResponse } from "./auth.types.js";
import { InvalidCredentialsError, LoginUserNotFoundError, InvalidPasswordError, ResetTokenInvalidOrExpiredError, NewPasswordSameAsOldError, InvalidTokenError, GoogleAccountAlreadyLinkedError, CannotDisconnectGoogleWithoutPasswordError, PasswordAlreadySetError, TurnstileVerificationFailedError, AccountLinkRequiredError } from "./auth.errors.js";
import ms from "ms";
import { ServerConfig } from "../../config/server.config.js";

import logger from "../../utils/logger.js";

@injectable()
@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(TurnstileService) private turnstileService: TurnstileService,
        @inject(ServerConfig) private config: ServerConfig
    ) {
        super()
    }

    /**
     * Inicia sesión de forma tradicional (JSON).
     * 
     * Autentica al usuario usando su identificador (email o username) y contraseña.
     * Devuelve el token JWT directamente en el cuerpo de la respuesta para que el cliente lo gestione manualmente.
     * 
     * @param body Datos de inicio de sesión e identificador de Turnstile.
     * @param request Petición express para obtener la IP del cliente.
     */
    @Post("/login")
    @Response<LoginValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<InvalidCredentialsError>>(401, "Credenciales inválidas")
    @Response<TurnstileFailResponse>(403, "Verificación de seguridad fallida")
    public async login(@Body() body: LoginRequest, @Request() request: ExpressRequest): Promise<SuccessResponse<LoginResponseData>> {
        const { identifier, password, turnstileToken } = body;
        await this.turnstileService.verifyToken(turnstileToken, request.ip);
        try {
            const result = await this.authService.login(identifier, password);
            return result satisfies LoginResponseData as any;
        } catch (error) {
            // Transformar errores específicos a genérico por seguridad
            if (error instanceof LoginUserNotFoundError || error instanceof InvalidPasswordError) {
                throw new InvalidCredentialsError(identifier);
            }
            throw error;
        }
    }

    /**
     * Inicia sesión optimizada para entornos web (Cookie).
     * 
     * Autentica al usuario y establece una cookie HTTP-only con el token JWT.
     * Esta opción es más segura para aplicaciones web ya que previene ataques XSS al no exponer el token al JS.
     * 
     * @ResponseHeader Set-Cookie {string} Cookie de sesión segura (httpOnly, secure, sameSite).
     * @param body Datos de inicio de sesión e identificador de Turnstile.
     * @param request Petición express para obtener la IP del cliente.
     */
    @Post("/login/web")
    @Response<LoginValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<InvalidCredentialsError>>(401, "Credenciales inválidas")
    @Response<TurnstileFailResponse>(403, "Verificación de seguridad fallida")
    public async loginWeb(@Body() body: LoginRequest, @Request() request: ExpressRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { identifier, password, turnstileToken } = body;
        await this.turnstileService.verifyToken(turnstileToken, request.ip);
        try {
            const result = await this.authService.login(identifier, password);

            logger.info(`Setting auth cookie for user: ${result.userId}`);
            const isProduction = this.config.NODE_ENV === 'production';
            const maxAgeMs = ms(this.config.JWT_EXPIRATION);

            // Establecer cookie usando setHeader
            let cookieValue = `token=${result.token}; Path=/; HttpOnly; Max-Age=${Math.floor(maxAgeMs / 1000)}; SameSite=Lax`;
            if (isProduction) {
                cookieValue += '; Secure';
            }
            this.setHeader('Set-Cookie', cookieValue);

            return {
                message: "Sesión iniciada correctamente."
            } satisfies MessageResponseData as any;
        } catch (error) {
            if (error instanceof LoginUserNotFoundError || error instanceof InvalidPasswordError) {
                throw new InvalidCredentialsError(identifier);
            }
            throw error;
        }
    }

    /**
     * Inicia sesión mediante Google OAuth (JSON).
     * 
     * Autentica o registra al usuario utilizando una credencial de Google.
     * Devuelve el token JWT directamente en el cuerpo de la respuesta.
     * 
     * @param body Credencial de Google.
     */
    @Post("/login/google")
    @Response<GoogleLoginValidationFailResponse>(422, "Error de validación")
    @Response<GoogleLoginError401>(401, "Credenciales o token inválidos")
    @Response<AuthError403>(403, "Vinculación requerida o error de seguridad")
    public async loginWithGoogle(@Body() body: GoogleLoginRequest): Promise<SuccessResponse<LoginResponseData>> {
        const { credential, password, newPassword, verificationCode, transactionId } = body;
        const result = await this.authService.loginWithGoogle(credential, password, newPassword, verificationCode, transactionId);
        return result satisfies LoginResponseData as any;
    }

    /**
     * Inicia sesión mediante Google OAuth optimizada para web (Cookie).
     * 
     * Autentica o registra al usuario y establece una cookie HTTP-only con el token JWT.
     * 
     * @ResponseHeader Set-Cookie {string} Cookie de sesión segura.
     * @param body Credencial de Google.
     */
    @Post("/login/google/web")
    @Response<GoogleLoginValidationFailResponse>(422, "Error de validación")
    @Response<GoogleLoginError401>(401, "Credenciales o token inválidos")
    @Response<AuthError403>(403, "Vinculación requerida o error de seguridad")
    public async loginWithGoogleWeb(@Body() body: GoogleLoginRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { credential, password, newPassword, verificationCode, transactionId } = body;
        const result = await this.authService.loginWithGoogle(credential, password, newPassword, verificationCode, transactionId);

        logger.info(`Setting auth cookie for user: ${result.userId} via Google`);
        const isProduction = this.config.NODE_ENV === 'production';
        const maxAgeMs = ms(this.config.JWT_EXPIRATION);

        // Establecer cookie usando setHeader
        let cookieValue = `token=${result.token}; Path=/; HttpOnly; Max-Age=${Math.floor(maxAgeMs / 1000)}; SameSite=Lax`;
        if (isProduction) {
            cookieValue += '; Secure';
        }
        this.setHeader('Set-Cookie', cookieValue);

        return {
            message: "Sesión iniciada correctamente con Google."
        } satisfies MessageResponseData as any;
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
        const { credential, verificationCode, transactionId } = body;
        await this.authService.connectGoogle(user._id, credential, verificationCode, transactionId);
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
    public async disconnectGoogle(@RequestProp("user") user: AuthenticatedUser, @Body() body: DisconnectGoogleRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { verificationCode, transactionId } = body;
        await this.authService.disconnectGoogle(user._id, verificationCode, transactionId);
        return {
            message: "Cuenta de Google desvinculada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Cierra la sesión del usuario actual.
     * 
     * Invalida la sesión en el cliente borrando la cookie de autenticación.
     * 
     * @ResponseHeader Set-Cookie {string} Cookie expirada para limpieza en el cliente.
     */
    @Post("/logout")
    public async logout(): Promise<SuccessResponse<MessageResponseData>> {
        const isProduction = this.config.NODE_ENV === 'production';
        // Limpiar cookie usando setHeader
        let cookieValue = `token=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${isProduction ? 'None' : 'Strict'}`;
        if (isProduction) {
            cookieValue += '; Secure';
        }
        this.setHeader('Set-Cookie', cookieValue);

        return {
            message: "Sesión cerrada correctamente."
        } satisfies MessageResponseData as any;
    }

    /**
     * Cierra todas las sesiones activas del usuario.
     * 
     * Invalida todas las sesiones en el servidor (resetea auth_version) y
     * solicita al navegador limpiar la cookie actual.
     * 
     * @ResponseHeader Set-Cookie {string} Cookie expirada para limpieza.
     * @param user Usuario autenticado obtenido del token JWT.
     */
    @Post("/logoutAll")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async logoutAll(@RequestProp("user") user: AuthenticatedUser): Promise<SuccessResponse<MessageResponseData>> {
        await this.authService.logoutAll(user._id);
        const isProduction = this.config.NODE_ENV === 'production';

        // Limpiar cookie usando setHeader
        let cookieValue = `token=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${isProduction ? 'None' : 'Strict'}`;
        if (isProduction) {
            cookieValue += '; Secure';
        }
        this.setHeader('Set-Cookie', cookieValue);

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
        const { newPassword, verificationCode, transactionId } = body;
        await this.authService.changePassword(user._id, newPassword, verificationCode, transactionId);
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
        const { password, verificationCode, transactionId } = body;
        await this.authService.setPassword(user._id, password, verificationCode, transactionId);
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
    @Response<TurnstileFailResponse>(403, "Verificación de seguridad fallida")
    public async forgotPassword(@Body() body: ForgotPasswordRequest, @Request() request: ExpressRequest): Promise<SuccessResponse<MessageResponseData>> {
        const { email, turnstileToken } = body;
        await this.turnstileService.verifyToken(turnstileToken, request.ip);
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

    /**
     * Solicita un código de verificación para restablecer la contraseña durante la vinculación de Google.
     */
    @Post("/google/link/request-reset")
    public async requestLinkingResetCode(@Body() body: RequestLinkingResetRequest): Promise<SuccessResponse<SecurityCodeResponse>> {
        const { email } = body;
        const result = await this.authService.requestLinkingResetCode(email);
        return result satisfies SecurityCodeResponse as any;
    }

    /**
     * Solicita un código de verificación para una acción de seguridad (estando logueado).
     */
    @Post("/security/request-code")
    @Security("jwt")
    @Response<AuthFailResponse>(401, "No autenticado")
    public async requestSecurityCode(@RequestProp('user') user: AuthenticatedUser, @Body() body: SecurityCodeRequest): Promise<SuccessResponse<SecurityCodeResponse>> {
        const result = await this.authService.requestSecurityCode(user._id, body.actionName);
        return result satisfies SecurityCodeResponse as any;
    }
}
