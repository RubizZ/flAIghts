import { singleton, inject } from "tsyringe";
import { User } from "../users/models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ms from 'ms'
import crypto from "node:crypto";
import { MailService } from "../../services/mail.service.js";
import { MailTemplates } from "../../services/mail.templates.js";
import { ResetTokenInvalidOrExpiredError, LoginUserNotFoundError, InvalidPasswordError, NewPasswordSameAsOldError, InvalidTokenError, TokenUserNotFoundError, AuthenticationVersionMismatchError, GoogleAccountAlreadyLinkedError, CannotDisconnectGoogleWithoutPasswordError, PasswordAlreadySetError } from "./auth.errors.js";
import type { LoginResponseData, JWTPayload, AuthenticatedUser } from "./auth.types.js";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { fileTypeFromBuffer } from 'file-type';
import { S3Service } from "../../services/s3.service.js";
import logger from "../../utils/logger.js";

export class PasswordService {
    public static hashPassword(password: string) {
        return bcrypt.hashSync(password, 10);
    }

    public static comparePassword(password: string, hash: string) {
        return bcrypt.compareSync(password, hash);
    }
}

export class ResetTokenService {
    public static generateToken() {
        return crypto.randomBytes(32).toString("hex");
    }

    public static generateHashedToken(token: string) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }
}

import { ServerConfig } from "../../config/server.config.js";
import { AuditService } from "../audit/audit.service.js";

@singleton()
export class AuthService {

    private googleClient: OAuth2Client;

    constructor(
        @inject(MailService) private mailService: MailService,
        @inject(ServerConfig) private config: ServerConfig,
        @inject(AuditService) private auditService: AuditService,
        @inject(S3Service) private s3Service: S3Service
    ) {
        this.googleClient = new OAuth2Client(this.config.GOOGLE_CLIENT_ID);
    }

    public async login(identifier: string, password: string): Promise<LoginResponseData> {
        const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
            .collation({ locale: 'en', strength: 2 })
            .select('+password');

        if (!user) {
            const error = new LoginUserNotFoundError(identifier);
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_LOGIN",
                details: {
                    identifier,
                    reason: error.code
                }
            });
            throw error;
        }

        const passwordMatch = PasswordService.comparePassword(password, user.password!);

        if (!passwordMatch) {
            const error = new InvalidPasswordError(identifier);
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_LOGIN",
                details: {
                    identifier,
                    reason: error.code
                }
            });
            throw error;
        }

        const token = jwt.sign(
            {
                userId: user._id,
                version: user.auth_version
            } as JWTPayload,
            this.config.JWT_SECRET,
            { expiresIn: this.config.JWT_EXPIRATION }
        );

        await this.auditService.register({
            resource: "AUTH",
            action: "LOGIN",
            details: {
                identifier
            },
            user: {
                id: user._id.toString()
            }
        });

        return {
            userId: user._id,
            token,
            authVersion: user.auth_version
        };
    }

    public async loginWithGoogle(credential: string): Promise<LoginResponseData> {
        const ticket = await this.googleClient.verifyIdToken({
            idToken: credential,
            audience: this.config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            const error = new InvalidTokenError("Invalid Google token payload");
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_LOGIN_GOOGLE",
                details: {
                    reason: error.code,
                    details: "Invalid payload or missing email"
                }
            });
            throw error;
        }

        const email = payload.email.toLowerCase();
        const googleId = payload.sub;

        // Intentar encontrar por google_id primero, luego por email
        let user = await User.findOne({ $or: [{ google_id: googleId }, { email }] }).select('+password');

        if (!user) {
            // Generar username basado en email
            let baseUsername = email!.split('@')[0]!.replace(/[^a-zA-Z0-9_-]/g, '');
            if (baseUsername.length < 3) baseUsername += 'user';
            if (baseUsername.length > 40) baseUsername = baseUsername.substring(0, 40);

            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username }).collation({ locale: 'en', strength: 2 })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            // Generar password seguro y aleatorio
            const randomPassword = crypto.randomBytes(32).toString('hex');

            let profilePictureKey: string | undefined;
            if (payload.picture) {
                profilePictureKey = await this.uploadGoogleProfilePictureToS3(payload.picture, payload.sub || email);
            }

            user = new User({
                email,
                username,
                password: PasswordService.hashPassword(randomPassword),
                profile_picture: profilePictureKey || payload.picture, // Fallback a URL si falla S3
                google_id: googleId,
                google_email: email,
                is_password_set: false
            });
            await user.save();
        } else if (!user.google_id) {
            // Si el usuario existe por email pero no tiene vinculado el google_id, lo vinculamos
            user.google_id = googleId;
            user.google_email = email;
            await user.save();

            await this.auditService.register({
                resource: "AUTH",
                action: "AUTO_LINK_GOOGLE",
                details: {
                    email,
                    googleId
                },
                user: {
                    id: user._id.toString()
                }
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                version: user.auth_version
            } as JWTPayload,
            this.config.JWT_SECRET,
            { expiresIn: this.config.JWT_EXPIRATION }
        );

        await this.auditService.register({
            resource: "AUTH",
            action: "LOGIN_GOOGLE",
            details: {
                email
            },
            user: {
                id: user._id.toString()
            }
        });

        return {
            userId: user._id,
            token,
            authVersion: user.auth_version
        };
    }

    public async connectGoogle(userId: string, credential: string): Promise<void> {
        const ticket = await this.googleClient.verifyIdToken({
            idToken: credential,
            audience: this.config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new InvalidTokenError("Invalid Google token payload");
        }

        const googleId = payload.sub;

        // Check if this googleId is already linked to ANOTHER user
        const existingUser = await User.findOne({ google_id: googleId });
        if (existingUser && existingUser._id.toString() !== userId) {
            const error = new GoogleAccountAlreadyLinkedError(payload.email);
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_CONNECT_GOOGLE",
                details: {
                    userId,
                    googleId,
                    email: payload.email,
                    reason: error.code
                }
            });
            throw error;
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new TokenUserNotFoundError(userId);
        }

        user.google_id = googleId;
        user.google_email = payload.email.toLowerCase();

        // Optionally update profile picture if user doesn't have one
        if (!user.profile_picture && payload.picture) {
            const profilePictureKey = await this.uploadGoogleProfilePictureToS3(payload.picture, googleId);
            if (profilePictureKey) {
                user.profile_picture = profilePictureKey;
            }
        }

        await user.save();

        await this.auditService.register({
            resource: "AUTH",
            action: "CONNECT_GOOGLE",
            details: {
                userId,
                googleId,
                email: payload.email
            }
        });
    }

    public async disconnectGoogle(userId: string): Promise<void> {
        const user = await User.findById(userId);
        if (!user) throw new TokenUserNotFoundError(userId);

        if (!user.google_id) return;

        // Verificación crítica: ¿Tiene contraseña manual?
        if (!user.is_password_set) {
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_DISCONNECT_GOOGLE",
                details: {
                    userId,
                    reason: "NO_PASSWORD_SET"
                }
            });
            throw new CannotDisconnectGoogleWithoutPasswordError();
        }

        const googleId = user.google_id;
        user.google_id = undefined;
        user.google_email = undefined;
        await user.save();

        await this.auditService.register({
            resource: "AUTH",
            action: "DISCONNECT_GOOGLE",
            details: {
                userId,
                googleId
            }
        });
    }

    /**
     * Descarga la imagen de perfil de Google y la sube a S3.
     */
    private async uploadGoogleProfilePictureToS3(url: string, identifier: string): Promise<string | undefined> {
        try {
            logger.info({ url, identifier }, "Downloading Google profile picture...");
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
            const buffer = Buffer.from(response.data, 'binary');

            const fileType = await fileTypeFromBuffer(buffer);
            const mime = fileType?.mime ?? 'image/jpeg';
            const ext = fileType?.ext ?? 'jpg';

            const key = await this.s3Service.upload(
                `avatars/google-${identifier}-${Date.now()}.${ext}`,
                buffer,
                mime
            );

            logger.info({ key, identifier }, "Google profile picture uploaded to S3 successfully");
            return key;
        } catch (error) {
            logger.error({ error, url, identifier }, "Failed to upload Google profile picture to S3");
            return undefined;
        }
    }

    public async logoutAll(userId: string) {
        const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { auth_version: 1 } }, { returnDocument: 'after' });
        if (!user) {
            const error = new LoginUserNotFoundError(userId);
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_LOGOUT_ALL",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }
        await this.auditService.register({
            resource: "AUTH",
            action: "LOGOUT_ALL",
            details: {
                auth_version: user.auth_version
            }
        });
    }

    public async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await User.findOne({ _id: userId }).select('+password');
        if (!user) throw new LoginUserNotFoundError(userId);

        // Si el usuario no tiene contraseña establecida (ej: entró por Google la primera vez)
        // permitimos establecerla sin pedir la anterior, ya que está autenticado.
        if (user.is_password_set) {
            const passwordMatch = PasswordService.comparePassword(oldPassword, user.password!);
            if (!passwordMatch) {
                await this.auditService.register({
                    resource: "AUTH",
                    action: "FAILED_CHANGE_PASSWORD",
                    details: { reason: "INVALID_OLD_PASSWORD" }
                });
                throw new InvalidPasswordError(userId);
            }
        }

        if (PasswordService.comparePassword(newPassword, user.password!)) {
            const error = new NewPasswordSameAsOldError();
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_CHANGE_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        user.password = PasswordService.hashPassword(newPassword);
        user.is_password_set = true;
        user.auth_version += 1;
        await user.save();

        await this.auditService.register({
            resource: "AUTH",
            action: "CHANGE_PASSWORD",
            details: {
                method: "change-password",
                auth_version: user.auth_version
            }
        });

        return true;
    }

    public async setPassword(userId: string, password: string) {
        const user = await User.findOne({ _id: userId }).select('+password');
        if (!user) throw new LoginUserNotFoundError(userId);

        if (user.is_password_set) {
            const error = new PasswordAlreadySetError();
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_SET_PASSWORD",
                details: {
                    userId,
                    reason: error.code
                }
            });
            throw error;
        }

        user.password = password;
        user.is_password_set = true;
        // Incrementamos la versión de autenticación para invalidar sesiones antiguas si las hubiera
        user.auth_version = (user.auth_version || 0) + 1;

        await user.save();

        await this.auditService.register({
            resource: "AUTH",
            action: "CHANGE_PASSWORD",
            details: {
                method: "set-password",
                auth_version: user.auth_version
            }
        });

        return true;
    }

    public async forgotPassword(email: string) {
        const resetToken = ResetTokenService.generateToken();
        const hashedToken = ResetTokenService.generateHashedToken(resetToken);

        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    password_reset_token: hashedToken,
                    password_reset_expires: new Date(Date.now() + 3600000)
                }
            },
            { returnDocument: 'after' }
        );

        if (!user) {
            const error = new LoginUserNotFoundError(email);
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_FORGOT_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        const resetUrl = `${this.config.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const template = MailTemplates.passwordReset(resetUrl);

        this.mailService.sendMail(user.email, template.subject, template.html);

        await this.auditService.register({
            resource: "AUTH",
            action: "FORGOT_PASSWORD_REQUEST",
            details: {
                email
            }
        });

        return true;
    }

    public async resetPassword(token: string, newPassword: string) {
        const hashedToken = ResetTokenService.generateHashedToken(token);

        const user = await User.findOneAndUpdate(
            {
                password_reset_token: hashedToken,
                password_reset_expires: { $gt: new Date() }
            },
            {
                $set: { password: PasswordService.hashPassword(newPassword), is_password_set: true },
                $unset: { password_reset_token: 1, password_reset_expires: 1 },
                $inc: { auth_version: 1 }
            },
            { returnDocument: 'after' }
        );

        if (!user) {
            const error = new ResetTokenInvalidOrExpiredError();
            await this.auditService.register({
                resource: "AUTH",
                action: "FAILED_RESET_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        await this.auditService.register({
            resource: "AUTH",
            action: "RESET_PASSWORD",
            details: {
                email: user.email
            }
        });

        return true;
    }

    public async verifyToken(token: string): Promise<AuthenticatedUser> {
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, this.config.JWT_SECRET) as JWTPayload;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown JWT error';
            throw new InvalidTokenError(message);
        }

        const user = await User.findById(decoded.userId);
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
    }
}