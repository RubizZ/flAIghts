import type { Request } from "express";
import type { AuthenticatedUser, JWTPayload } from "./auth.types.js";
import jwt from "jsonwebtoken";
import { User, type IUser } from "../users/models/user.model.js";
import { AuthenticationVersionMismatchError, InvalidTokenError, NoTokenProvidedError, TokenUserNotFoundError } from "./auth.errors.js";
import type { FriendUser, PopulatedUser, PublicUser } from "../users/user.types.js";

import { container } from "tsyringe"
import { ServerConfig } from "../../config/server.config.js"

export async function expressAuthentication(
    request: Request,
    securityName: string,
    _scopes?: string[]
): Promise<AuthenticatedUser | null> {
    const config = container.resolve(ServerConfig);
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    // Lógica principal de validación JWT
    const validateJWT = async () => {
        let token: string | undefined;

        // Intentar obtener desde cookie (HttpOnly)
        if (request.cookies && request.cookies.token) {
            token = request.cookies.token;
        }

        // Si no hay cookie, intentar desde header Authorization
        if (!token && headerValue && headerValue.startsWith('Bearer ')) {
            token = headerValue.split(' ')[1];
        }

        if (!token) {
            throw new NoTokenProvidedError('Missing or invalid authorization token (Cookie or Bearer header)');
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

        let user = await User.findById(decoded.userId);
        if (!user) {
            throw new TokenUserNotFoundError(decoded.userId);
        }

        if (user.auth_version !== decoded.version) {
            throw new AuthenticationVersionMismatchError(decoded.userId, user.auth_version, decoded.version);
        }

        user.last_seen_at = new Date();
        await user.save();

        const safeUser: AuthenticatedUser = {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            auth_version: user.auth_version,
            token: token,
        };

        return safeUser;
    };

    try {
        if (securityName === 'jwt') {
            return await validateJWT();
        }

        if (securityName === 'jwt-optional') {
            if (headerValue || (request.cookies && request.cookies.token)) { // Si hay token jwt en header o cookie, validarlo
                return await validateJWT();
            }
            return null; // Invitado si no hay token jwt
        }
    } catch (err) {
        // Propagar errores de autenticación específicos
        if (err instanceof NoTokenProvidedError ||
            err instanceof TokenUserNotFoundError ||
            err instanceof AuthenticationVersionMismatchError ||
            err instanceof InvalidTokenError) {

            // Si hay un error de token, limpiamos la cookie si existe
            if (request.cookies && request.cookies.token) {
                const isProduction = process.env.NODE_ENV === 'production';
                request.res?.clearCookie('token', {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? 'none' : 'strict',
                });
            }

            throw err;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new InvalidTokenError(message);
    }

    throw new Error(`Invalid security name: ${securityName}`)
}
