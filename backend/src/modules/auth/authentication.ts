import type { Request } from "express";
import type { AuthenticatedUser, JWTPayload } from "./auth.types.js";
import jwt from "jsonwebtoken";
import { User, type IFriend, type IUser } from "../users/user.model.js";
import { AuthenticationVersionMismatchError, InvalidTokenError, NoTokenProvidedError, TokenUserNotFoundError } from "./auth.errors.js";
import type { FriendUser, PopulatedUser, PublicUser } from "../users/user.types.js";
import type { PopulatedDoc } from "mongoose";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function expressAuthentication(
    request: Request,
    securityName: string,
    _scopes?: string[]
): Promise<AuthenticatedUser | null> {
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

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

        let user = await User.findById(decoded.userId);
        if (!user) {
            throw new TokenUserNotFoundError(decoded.userId);
        }

        if (user.auth_version !== decoded.version) {
            throw new AuthenticationVersionMismatchError(decoded.userId, user.auth_version, decoded.version);
        }

        user.last_seen_at = new Date();
        await user.save();

        await user.populate('friends.user', 'username role created_at last_seen_at');
        await user.populate('sent_friend_requests', 'username role created_at last_seen_at public');
        await user.populate('received_friend_requests', 'username role created_at last_seen_at public');

        const userObj = user.toObject();
        const safeUser = {
            _id: userObj._id,
            type: 'self',
            username: userObj.username,
            email: userObj.email,
            email_verified: userObj.email_verified,
            role: userObj.role,
            preferences: userObj.preferences,
            public: userObj.public,
            created_at: user.created_at.toISOString(),
            last_seen_at: user.last_seen_at.toISOString(),
            auth_version: userObj.auth_version,
            friends: userObj.friends.map(f => {
                const user = f.user as IUser;
                return {
                    _id: user._id,
                    type: 'friend',
                    username: user.username,
                    role: user.role,
                    created_at: user.created_at.toISOString(),
                    last_seen_at: user.last_seen_at.toISOString(),
                    friend_since: f.friend_since.toISOString()
                } satisfies FriendUser;
            }),
            sent_friend_requests: userObj.sent_friend_requests.map(u => {
                const user = u as IUser;
                return {
                    _id: user._id,
                    type: 'public',
                    username: user.username,
                    role: user.role,
                    public: user.public,
                    created_at: user.created_at.toISOString(),
                    last_seen_at: user.last_seen_at.toISOString(),
                    sent_friend_request: true,
                    received_friend_request: false
                } satisfies PublicUser;
            }),
            received_friend_requests: userObj.received_friend_requests.map(u => {
                const user = u as IUser;
                return {
                    _id: user._id,
                    type: 'public',
                    username: user.username,
                    role: user.role,
                    public: user.public,
                    created_at: user.created_at.toISOString(),
                    last_seen_at: user.last_seen_at.toISOString(),
                    sent_friend_request: false,
                    received_friend_request: true
                } satisfies PublicUser;
            })
        } satisfies PopulatedUser;

        return {
            ...safeUser,
            token: token,
        };
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
            throw err;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new InvalidTokenError(message);
    }

    throw new Error(`Invalid security name: ${securityName}`)
}
