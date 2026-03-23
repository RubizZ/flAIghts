import { singleton, inject } from "tsyringe";
import { User } from "../users/models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ms from 'ms'
import crypto from "node:crypto";
import { MailService } from "../../services/mail.service.js";
import { MailTemplates } from "../../services/mail.templates.js";
import { ResetTokenInvalidOrExpiredError, LoginUserNotFoundError, InvalidPasswordError, NewPasswordSameAsOldError } from "./auth.errors.js";
import type { LoginResponseData, JWTPayload } from "./auth.types.js";

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

    constructor(
        @inject(MailService) private mailService: MailService,
        @inject(ServerConfig) private config: ServerConfig,
        @inject(AuditService) private auditService: AuditService
    ) { }

    public async login(identifier: string, password: string): Promise<LoginResponseData> {
        const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
            .collation({ locale: 'en', strength: 2 })
            .select('+password');

        if (!user) {
            const error = new LoginUserNotFoundError(identifier);
            this.auditService.register({
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
            this.auditService.register({
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

        this.auditService.register({
            resource: "AUTH",
            action: "LOGIN",
            details: {
                identifier
            }
        });

        return {
            userId: user._id,
            token,
            authVersion: user.auth_version
        };
    }

    public async logoutAll(userId: string) {
        const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { auth_version: 1 } });
        if (!user) {
            const error = new LoginUserNotFoundError(userId);
            this.auditService.register({
                resource: "AUTH",
                action: "FAILED_LOGOUT_ALL",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }
        this.auditService.register({
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

        const passwordMatch = PasswordService.comparePassword(oldPassword, user.password!);
        if (!passwordMatch) {
            const error = new InvalidPasswordError(userId);
            this.auditService.register({
                resource: "AUTH",
                action: "FAILED_CHANGE_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        if (PasswordService.comparePassword(newPassword, user.password!)) {
            const error = new NewPasswordSameAsOldError();
            this.auditService.register({
                resource: "AUTH",
                action: "FAILED_CHANGE_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        user.password = PasswordService.hashPassword(newPassword);
        user.auth_version += 1;
        await user.save();

        this.auditService.register({
            resource: "AUTH",
            action: "CHANGE_PASSWORD",
            details: {
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
            { new: true }
        );

        if (!user) {
            const error = new LoginUserNotFoundError(email);
            this.auditService.register({
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

        this.auditService.register({
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
                $set: { password: PasswordService.hashPassword(newPassword) },
                $unset: { password_reset_token: 1, password_reset_expires: 1 },
                $inc: { auth_version: 1 }
            },
            { new: true }
        );

        if (!user) {
            const error = new ResetTokenInvalidOrExpiredError();
            this.auditService.register({
                resource: "AUTH",
                action: "FAILED_RESET_PASSWORD",
                details: {
                    reason: error.code
                }
            });
            throw error;
        }

        this.auditService.register({
            resource: "AUTH",
            action: "RESET_PASSWORD",
            details: {
                email: user.email
            }
        });

        return true;
    }
}