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

@singleton()
export class AuthService {
    private readonly jwtSecret: string;
    private readonly jwtExpiration: number;
    private readonly frontendUrl: string;

    constructor(@inject(MailService) private mailService: MailService) {

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }
        if (!process.env.FRONTEND_URL) {
            throw new Error("FRONTEND_URL is not defined");
        }

        this.jwtSecret = process.env.JWT_SECRET;
        this.frontendUrl = process.env.FRONTEND_URL;
        this.jwtExpiration = process.env.JWT_EXPIRATION ? Math.floor(ms(process.env.JWT_EXPIRATION as ms.StringValue) / 1000) : 2592000; // 30 days
    }

    public async login(identifier: string, password: string): Promise<LoginResponseData> {
        const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
            .collation({ locale: 'en', strength: 2 })
            .select('+password');

        if (!user) {
            throw new LoginUserNotFoundError(identifier);
        }

        const passwordMatch = PasswordService.comparePassword(password, user.password!);

        if (!passwordMatch) {
            throw new InvalidPasswordError(identifier);
        }

        const token = jwt.sign(
            {
                userId: user._id,
                version: user.auth_version
            } as JWTPayload,
            this.jwtSecret,
            { expiresIn: this.jwtExpiration }
        );

        return {
            userId: user._id,
            token,
            authVersion: user.auth_version
        };
    }

    public async logoutAll(userId: string) {
        await User.updateOne({ _id: userId }, { $inc: { auth_version: 1 } });
    }

    public async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await User.findOne({ _id: userId }).select('+password');
        if (!user) throw new LoginUserNotFoundError(userId);

        const passwordMatch = PasswordService.comparePassword(oldPassword, user.password!);
        if (!passwordMatch) throw new InvalidPasswordError(userId);

        if (PasswordService.comparePassword(newPassword, user.password!)) {
            throw new NewPasswordSameAsOldError();
        }

        user.password = PasswordService.hashPassword(newPassword);
        user.auth_version += 1;
        await user.save();

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

        if (!user) return false;

        const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
        const template = MailTemplates.passwordReset(resetUrl);

        this.mailService.sendMail(user.email, template.subject, template.html);

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
            throw new ResetTokenInvalidOrExpiredError();
        }

        return true;
    }
}