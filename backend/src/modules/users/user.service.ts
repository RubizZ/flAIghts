import { inject, singleton } from "tsyringe";
import type { HydratedDocument } from "mongoose";
import { MongoServerError } from "mongodb";
import crypto, { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from 'file-type';
import ms from "ms";
import type {
    InitiateRegistrationData,
    CompleteRegistrationData,
    InitiateEmailChangeData,
    CompleteEmailChangeData,
    UpdateUserData,
    VerificationTransactionResponse
} from "./user.types.js";
import { User, type IUser, type IUserDocument, type IUserPopulated, type IUserUnpopulated } from "./models/user.model.js";
import { PreRegistration } from "./models/pre-registration.model.js";
import { PasswordService } from "../auth/auth.service.js";
import {
    UserNotFoundError,
    EmailAlreadyInUseError,
    UsernameAlreadyInUseError,
    SelfFriendRequestError,
    AlreadyFriendsError,
    FriendRequestAlreadySentError,
    FriendRequestAlreadyReceivedError,
    NoPendingFriendRequestError,
    NoReceivedFriendRequestError,
    NotFriendsError,
    EmailVerificationCodeInvalidOrExpiredError,
    InvalidProfilePictureError,
    ProfilePictureTooLargeError
} from "./user.errors.js";
import { MailService } from "@/services/mail.service.js";
import { MailTemplates } from "@/services/mail.templates.js";
import { S3Service, S3FileTooLargeError } from "@/services/s3.service.js";
import { AuditService } from "../audit/audit.service.js";
import { ServerConfig } from "@/config/server.config.js";

export class EmailVerificationService {
    public static generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    public static generateHashedCode(code: string) {
        return crypto.createHash("sha256").update(code).digest("hex");
    }
}

@singleton()
export class UserService {

    constructor(
        @inject(MailService) private mailService: MailService,
        @inject(S3Service) private s3Service: S3Service,
        @inject(AuditService) private auditService: AuditService,
        @inject(ServerConfig) private config: ServerConfig
    ) { }

    public async initiateRegistration(data: InitiateRegistrationData): Promise<VerificationTransactionResponse> {
        // Check if user already exists
        const userExists = await User.findOne({ email: data.email.toLowerCase() });
        if (userExists) {
            const error = new EmailAlreadyInUseError(data.email);
            this.auditService.register({
                resource: "USER",
                action: "FAILED_INITIATE_REGISTRATION",
                details: {
                    email: data.email,
                    reason: error.code
                }
            });
            throw error;
        }

        const verificationCode = EmailVerificationService.generateCode();
        const hashedCode = EmailVerificationService.generateHashedCode(verificationCode);
        const transactionId = randomUUID();

        // Save or update pre-registration
        await PreRegistration.findOneAndUpdate(
            { email: data.email.toLowerCase() },
            {
                code: hashedCode,
                transaction_id: transactionId,
                expires: new Date(Date.now() + ms(this.config.SECURITY_CODE_EXPIRATION))
            },
            { upsert: true, returnDocument: 'after' }
        );

        const template = MailTemplates.emailVerification(verificationCode, this.config.SECURITY_CODE_EXPIRATION);
        this.mailService.sendMail(data.email, template.subject, template.html);

        this.auditService.register({
            resource: "USER",
            action: "INITIATE_REGISTRATION",
            details: {
                email: data.email,
                transactionId
            }
        });

        return { transactionId };
    }

    public async completeRegistration(data: CompleteRegistrationData): Promise<IUserUnpopulated> {
        const preReg = await PreRegistration.findOne({ email: data.email.toLowerCase() });
        if (!preReg) {
            const error = new EmailVerificationCodeInvalidOrExpiredError();
            this.auditService.register({
                resource: "USER",
                action: "FAILED_COMPLETE_REGISTRATION",
                details: {
                    email: data.email,
                    reason: error.code,
                    subReason: "NO_PRE_REGISTRATION"
                }
            });
            throw error;
        }

        const hashedCode = EmailVerificationService.generateHashedCode(data.code);
        if (preReg.code !== hashedCode || preReg.expires < new Date() || preReg.transaction_id !== data.transactionId) {
            const error = new EmailVerificationCodeInvalidOrExpiredError();
            this.auditService.register({
                resource: "USER",
                action: "FAILED_COMPLETE_REGISTRATION",
                details: {
                    email: data.email,
                    reason: error.code,
                    subReason: preReg.expires < new Date() ? "EXPIRED" : "INVALID_CODE"
                }
            });
            throw error;
        }

        try {
            const user = await User.create({
                username: data.username,
                email: data.email.toLowerCase(),
                password: PasswordService.hashPassword(data.password),
                preferences: data.preferences,
                is_password_set: true
            });

            // Clean up pre-registration
            await PreRegistration.deleteOne({ email: data.email.toLowerCase() });

            this.auditService.register({
                resource: "USER",
                action: "COMPLETE_REGISTRATION",
                details: {
                    email: user.email,
                    username: user.username,
                    preferences: user.preferences
                }
            });

            const welcomeTemplate = MailTemplates.welcomeEmail(this.config.FRONTEND_URL);
            this.mailService.sendMail(user.email, welcomeTemplate.subject, welcomeTemplate.html);

            return this.sanitizeUser(user);
        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                const field = Object.keys(error.keyPattern ?? {})[0] as 'username' | 'email' | undefined;
                if (field === 'email') throw new EmailAlreadyInUseError(data.email);
                if (field === 'username') throw new UsernameAlreadyInUseError(data.username);
            }
            throw error;
        }
    }

    public async initiateEmailChange(userId: string, data: InitiateEmailChangeData): Promise<VerificationTransactionResponse> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);

        const newEmail = data.newEmail.toLowerCase();
        if (newEmail === user.email) return { transactionId: "" }; // O lanzar error si prefieres

        // Check availability
        const emailInUse = await User.findOne({ email: newEmail });
        if (emailInUse) {
            const error = new EmailAlreadyInUseError(newEmail);
            this.auditService.register({
                resource: "USER",
                action: "FAILED_INITIATE_EMAIL_CHANGE",
                details: {
                    userId,
                    newEmail,
                    reason: error.code
                }
            });
            throw error;
        }

        const oldEmailCode = EmailVerificationService.generateCode();
        const newEmailCode = EmailVerificationService.generateCode();
        const transactionId = randomUUID();

        user.email_change_request = {
            new_email: newEmail,
            old_email_code: EmailVerificationService.generateHashedCode(oldEmailCode),
            new_email_code: EmailVerificationService.generateHashedCode(newEmailCode),
            expires: new Date(Date.now() + ms(this.config.SECURITY_CODE_EXPIRATION))
        };

        await user.save();

        // Send both emails
        const oldTemplate = MailTemplates.emailChangeSecurity(oldEmailCode, this.config.SECURITY_CODE_EXPIRATION);
        const newTemplate = MailTemplates.emailChangeVerification(newEmailCode, this.config.SECURITY_CODE_EXPIRATION);

        this.mailService.sendMail(user.email, oldTemplate.subject, oldTemplate.html);
        this.mailService.sendMail(newEmail, newTemplate.subject, newTemplate.html);

        this.auditService.register({
            resource: "USER",
            action: "INITIATE_EMAIL_CHANGE",
            details: {
                newEmail: newEmail
            }
        });

        return { transactionId };
    }

    public async cancelEmailChange(userId: string): Promise<void> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);
        user.email_change_request = undefined;
        await user.save();

        this.auditService.register({
            resource: "USER",
            action: "CANCEL_EMAIL_CHANGE",
            details: {
                stayingEmail: user.email
            }
        });
    }

    public async completeEmailChange(userId: string, data: CompleteEmailChangeData): Promise<IUserUnpopulated> {
        const user = await User.findById(userId).select("+email_change_request.old_email_code +email_change_request.new_email_code +email_change_request.transaction_id");
        if (!user) throw new UserNotFoundError(userId);
        if (!user.email_change_request) throw new Error("No hay ninguna solicitud de cambio de email pendiente");

        if (user.email_change_request.expires < new Date()) {
            user.email_change_request = undefined;
            await user.save();
            throw new EmailVerificationCodeInvalidOrExpiredError();
        }

        const hashedOld = EmailVerificationService.generateHashedCode(data.oldEmailCode);
        const hashedNew = EmailVerificationService.generateHashedCode(data.newEmailCode);

        if (user.email_change_request.old_email_code !== hashedOld ||
            user.email_change_request.new_email_code !== hashedNew) {
            const error = new EmailVerificationCodeInvalidOrExpiredError();
            this.auditService.register({
                resource: "USER",
                action: "FAILED_COMPLETE_EMAIL_CHANGE",
                details: {
                    userId,
                    reason: error.code
                }
            });
            throw error;
        }

        const oldEmail = user.email;
        const newEmail = user.email_change_request.new_email;

        user.email = newEmail;
        user.email_change_request = undefined;
        user.auth_version++;
        await user.save();

        const successTemplate = MailTemplates.securityActionSuccess("Cambio de correo electrónico");
        this.mailService.sendMail(oldEmail, successTemplate.subject, successTemplate.html);
        this.mailService.sendMail(newEmail, successTemplate.subject, successTemplate.html);

        this.auditService.register({
            resource: "USER",
            action: "COMPLETE_EMAIL_CHANGE",
            details: {
                oldEmail,
                newEmail
            }
        });

        return this.sanitizeUser(user);
    }

    public async updateUser(userId: string, data: UpdateUserData): Promise<IUserUnpopulated> {
        if (data.username) {
            const existing = await User.findOne({ username: data.username, _id: { $ne: userId } });
            if (existing) {
                const error = new UsernameAlreadyInUseError(data.username);
                this.auditService.register({
                    resource: "USER",
                    action: "FAILED_UPDATE",
                    details: {
                        userId,
                        username: data.username,
                        reason: error.code
                    }
                });
                throw error;
            }
        }
        const user = await User.findByIdAndUpdate(userId, data, { returnDocument: 'after', runValidators: true });
        if (!user) throw new UserNotFoundError(userId);

        this.auditService.register({
            resource: "USER",
            action: "UPDATE",
            details: {
                username: data.username,
                public: data.public,
                preferences: data.preferences
            }
        });

        return this.sanitizeUser(user);
    }

    public async getUser(userId: string, populate: true): Promise<IUserPopulated>;
    public async getUser(userId: string, populate?: false): Promise<IUserUnpopulated>;
    public async getUser(userId: string, populate: boolean): Promise<IUser>;
    public async getUser(userId: string, populate: boolean = false): Promise<IUser> {
        let query = User.findById(userId);
        if (populate) {
            query = query
                .populate('friends.user', 'username _id role last_seen_at created_at')
                .populate('sent_friend_requests', 'username _id role last_seen_at created_at public')
                .populate('received_friend_requests', 'username _id role last_seen_at created_at public');
        }
        const user = await query;
        if (!user) throw new UserNotFoundError(userId);
        return populate ? this.sanitizeUser(user, true) : this.sanitizeUser(user, false);
    }

    public async searchUsers(query: string, excludeId?: string, limit: number = 20): Promise<IUserUnpopulated[]> {
        const regex = new RegExp(query, 'i');
        const filter = excludeId ? { username: regex, _id: { $ne: excludeId } } : { username: regex };
        const usersDocs = await User.find(filter).limit(limit);
        return usersDocs.map(userDoc => this.sanitizeUser(userDoc));
    }

    public async getAllUsers(page: number, limit: number, q?: string, role?: string, sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ users: IUserUnpopulated[], total: number, page: number, totalPages: number }> {
        const filter: any = {};

        if (q) {
            filter.$or = [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ];
        }

        if (role) {
            filter.role = role;
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }),
            User.countDocuments(filter)
        ]);
        return {
            users: users.map(u => this.sanitizeUser(u)),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    public async sendFriendRequest(requesterId: string, targetId: string): Promise<void> {
        if (requesterId === targetId) throw new SelfFriendRequestError();

        // Check if target is "flights" for auto-acceptance
        const target = await User.findById(targetId);
        if (!target) throw new UserNotFoundError(targetId);

        if (target.username.toLowerCase() === 'flaights') {
            // Auto-accept: check if already friends first
            if (target.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === requesterId)) {
                throw new AlreadyFriendsError();
            }

            const now = new Date();
            // Add to both friends lists and clean up any existing requests
            await Promise.all([
                User.updateOne(
                    { _id: requesterId },
                    {
                        $push: { friends: { user: targetId, friend_since: now } },
                        $pull: { sent_friend_requests: targetId, received_friend_requests: targetId }
                    }
                ),
                User.updateOne(
                    { _id: targetId },
                    {
                        $push: { friends: { user: requesterId, friend_since: now } },
                        $pull: { sent_friend_requests: requesterId, received_friend_requests: requesterId }
                    }
                )
            ]);

            this.auditService.register({
                resource: "USER",
                action: "SEND_FRIEND_REQUEST",
                details: {
                    userId: targetId
                }
            });

            this.auditService.register({
                resource: "USER",
                action: "ACCEPT_FRIEND_REQUEST",
                details: {
                    userId: requesterId
                },
                user: {
                    id: targetId,
                    ip: "system",
                    userAgent: "system"
                }
            });
            return;
        }

        const bulkResult = await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: requesterId, "friends.user": { $ne: targetId }, sent_friend_requests: { $ne: targetId }, received_friend_requests: { $ne: targetId } },
                    update: { $addToSet: { sent_friend_requests: targetId } }
                }
            },
            {
                updateOne: {
                    filter: { _id: targetId, "friends.user": { $ne: requesterId }, sent_friend_requests: { $ne: requesterId }, received_friend_requests: { $ne: requesterId } },
                    update: { $addToSet: { received_friend_requests: requesterId } }
                }
            }
        ]);

        if (bulkResult.modifiedCount < 2) {
            const requester = await User.findById(requesterId);
            if (!requester) throw new UserNotFoundError(requesterId);

            // target was already fetched above

            if (target.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === requesterId) || requester.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === targetId)) throw new AlreadyFriendsError();
            if (requester.sent_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === targetId)) throw new FriendRequestAlreadySentError();
            if (target.sent_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === requesterId) || requester.received_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === targetId)) throw new FriendRequestAlreadyReceivedError();
        }

        this.auditService.register({
            resource: "USER",
            action: "SEND_FRIEND_REQUEST",
            details: {
                userId: targetId
            }
        });
    }

    public async cancelFriendRequest(requesterId: string, targetId: string): Promise<void> {
        const bulkResult = await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: requesterId, sent_friend_requests: { $in: [targetId] } },
                    update: { $pull: { sent_friend_requests: targetId } }
                }
            },
            {
                updateOne: {
                    filter: { _id: targetId, received_friend_requests: { $in: [requesterId] } },
                    update: { $pull: { received_friend_requests: requesterId } }
                }
            }
        ]);

        if (bulkResult.modifiedCount < 2) {
            const requester = await User.findById(requesterId);
            if (!requester) throw new UserNotFoundError(requesterId);

            const target = await User.findById(targetId);
            if (!target) throw new UserNotFoundError(targetId);

            if (!requester.sent_friend_requests.some(id => id.toString() === targetId)) throw new NoPendingFriendRequestError();
        }

        this.auditService.register({
            resource: "USER",
            action: "CANCEL_FRIEND_REQUEST",
            details: {
                userId: targetId
            }
        });
    }

    public async acceptFriendRequest(requesterId: string, targetId: string): Promise<void> {
        const bulkResult = await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: requesterId, received_friend_requests: { $in: [targetId] } },
                    update: { $pull: { received_friend_requests: targetId }, $push: { friends: { user: targetId, friend_since: new Date() } } }
                }
            },
            {
                updateOne: {
                    filter: { _id: targetId, sent_friend_requests: { $in: [requesterId] } },
                    update: { $pull: { sent_friend_requests: requesterId }, $push: { friends: { user: requesterId, friend_since: new Date() } } }
                }
            }
        ]);

        if (bulkResult.modifiedCount < 2) {
            const requester = await User.findById(requesterId);
            if (!requester) throw new UserNotFoundError(requesterId);

            const target = await User.findById(targetId);
            if (!target) throw new UserNotFoundError(targetId);

            if (!requester.received_friend_requests.some(id => id.toString() === targetId)) throw new NoReceivedFriendRequestError();
        }

        this.auditService.register({
            resource: "USER",
            action: "ACCEPT_FRIEND_REQUEST",
            details: {
                userId: targetId
            }
        });
    }

    public async rejectFriendRequest(requesterId: string, targetId: string): Promise<void> {
        const bulkResult = await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: requesterId, received_friend_requests: { $in: [targetId] } },
                    update: { $pull: { received_friend_requests: targetId } }
                }
            },
            {
                updateOne: {
                    filter: { _id: targetId, sent_friend_requests: { $in: [requesterId] } },
                    update: { $pull: { sent_friend_requests: requesterId } }
                }
            }
        ]);

        if (bulkResult.modifiedCount < 2) {
            const requester = await User.findById(requesterId);
            if (!requester) throw new UserNotFoundError(requesterId);

            const target = await User.findById(targetId);
            if (!target) throw new UserNotFoundError(targetId);

            if (!requester.received_friend_requests.some(id => id.toString() === targetId)) throw new NoReceivedFriendRequestError();
        }

        this.auditService.register({
            resource: "USER",
            action: "REJECT_FRIEND_REQUEST",
            details: {
                userId: targetId
            }
        });
    }

    public async removeFriend(requesterId: string, targetId: string): Promise<void> {
        const bulkResult = await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: requesterId, "friends.user": targetId },
                    update: { $pull: { friends: { user: targetId } } }
                }
            },
            {
                updateOne: {
                    filter: { _id: targetId, "friends.user": requesterId },
                    update: { $pull: { friends: { user: requesterId } } }
                }
            }
        ]);

        if (bulkResult.modifiedCount < 2) {
            const requester = await User.findById(requesterId);
            if (!requester) throw new UserNotFoundError(requesterId);

            const target = await User.findById(targetId);
            if (!target) throw new UserNotFoundError(targetId);

            if (!requester.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === targetId)) throw new NotFriendsError();
        }

        this.auditService.register({
            resource: "USER",
            action: "REMOVE_FRIEND",
            details: {
                userId: targetId
            }
        });
    }

    public async getProfilePictureUrl(userId: string): Promise<string> {
        const user = await User.findById(userId);
        if (!user || !user.profile_picture) throw new UserNotFoundError(userId);
        return await this.s3Service.getDownloadUrl(user.profile_picture);
    }

    /**
     * Elimina un usuario y limpia todos sus datos relacionados (S3, amigos, solicitudes).
     */
    public async deleteUser(userId: string): Promise<void> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);

        // Eliminar avatar de S3 si existe
        if (user.profile_picture) {
            try {
                await this.s3Service.delete(user.profile_picture);
            } catch (error) {
                // No bloqueamos el borrado si falla la limpieza de S3
            }
        }

        // Limpieza de relaciones y el propio usuario
        await Promise.all([
            User.updateMany({ "friends.user": userId }, { $pull: { friends: { user: userId } } }),
            User.updateMany({ sent_friend_requests: userId }, { $pull: { sent_friend_requests: userId } }),
            User.updateMany({ received_friend_requests: userId }, { $pull: { received_friend_requests: userId } }),
            User.deleteOne({ _id: userId })
        ]);

        this.auditService.register({
            resource: "USER",
            action: "DELETE",
            details: { id: userId }
        });
    }

    public async setProfilePicture(userId: string, data: Buffer): Promise<IUserDocument> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);

        const buffer = data;

        // Detect type from buffer
        const fileType = await fileTypeFromBuffer(buffer);
        if (!fileType || !fileType.mime.startsWith("image/")) {
            throw new InvalidProfilePictureError();
        }

        // Validación de negocio: Limite de 5MB para avatares
        const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
        if (buffer.length > AVATAR_MAX_SIZE) {
            throw new ProfilePictureTooLargeError(buffer.length, AVATAR_MAX_SIZE);
        }

        try {
            // Remove old picture from S3 if exists
            if (user.profile_picture) {
                await this.s3Service.delete(user.profile_picture);
            }

            // Upload to S3 with correct extension and MIME type
            const key = await this.s3Service.upload(
                `avatars/${userId}-${Date.now()}.${fileType.ext}`,
                buffer,
                fileType.mime
            );

            user.profile_picture = key;
            await user.save();

            this.auditService.register({
                resource: "USER",
                action: "UPDATE_PROFILE_PICTURE",
                details: {
                    url: key
                }
            });

            return user;
        } catch (error: any) {
            // Transformamos solo errores de negocio (AppError) a dominio
            if (error instanceof S3FileTooLargeError) {
                throw new ProfilePictureTooLargeError(error.details.size, error.details.maxSize);
            }
            // Cualquier otro error de S3 (red, credenciales, etc.) lo simplemente relanzamos
            // ya que son Error y el global handler los trata como 500
            throw error;
        }
    }



    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate: true): IUserPopulated;
    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate?: false): IUserUnpopulated;
    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate: boolean = false): IUser {
        const { __v, password, ...cleanUser } = user.toObject();
        return cleanUser as IUser;
    }
}