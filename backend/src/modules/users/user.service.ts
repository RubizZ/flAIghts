import { inject, singleton } from "tsyringe";
import type { HydratedDocument } from "mongoose";
import { MongoServerError } from "mongodb";
import crypto from "node:crypto";
import type {
    InitiateRegistrationData,
    CompleteRegistrationData,
    InitiateEmailChangeData,
    CompleteEmailChangeData,
    UpdateUserData
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
    EmailVerificationCodeInvalidOrExpiredError
} from "./user.errors.js";
import { MailService } from "@/services/mail.service.js";
import { MailTemplates } from "@/services/mail.templates.js";

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

    constructor(@inject(MailService) private mailService: MailService) { }

    public async initiateRegistration(data: InitiateRegistrationData): Promise<void> {
        // Check if user already exists
        const userExists = await User.findOne({ email: data.email.toLowerCase() });
        if (userExists) throw new EmailAlreadyInUseError(data.email);

        const verificationCode = EmailVerificationService.generateCode();
        const hashedCode = EmailVerificationService.generateHashedCode(verificationCode);

        // Save or update pre-registration
        await PreRegistration.findOneAndUpdate(
            { email: data.email.toLowerCase() },
            {
                code: hashedCode,
                expires: new Date(Date.now() + 3600000)
            },
            { upsert: true }
        );

        const template = MailTemplates.emailVerification(verificationCode);
        this.mailService.sendMail(data.email, template.subject, template.html);
    }

    public async completeRegistration(data: CompleteRegistrationData): Promise<IUserUnpopulated> {
        const preReg = await PreRegistration.findOne({ email: data.email.toLowerCase() });
        if (!preReg) throw new EmailVerificationCodeInvalidOrExpiredError();

        const hashedCode = EmailVerificationService.generateHashedCode(data.code);
        if (preReg.code !== hashedCode || preReg.expires < new Date()) {
            throw new EmailVerificationCodeInvalidOrExpiredError();
        }

        try {
            const user = await User.create({
                username: data.username,
                email: data.email.toLowerCase(),
                password: PasswordService.hashPassword(data.password),
                preferences: data.preferences
            });

            // Clean up pre-registration
            await PreRegistration.deleteOne({ email: data.email.toLowerCase() });

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

    public async initiateEmailChange(userId: string, data: InitiateEmailChangeData): Promise<void> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);

        const newEmail = data.newEmail.toLowerCase();
        if (newEmail === user.email) return;

        // Check availability
        const emailInUse = await User.findOne({ email: newEmail });
        if (emailInUse) throw new EmailAlreadyInUseError(newEmail);

        const oldEmailCode = EmailVerificationService.generateCode();
        const newEmailCode = EmailVerificationService.generateCode();

        user.email_change_request = {
            new_email: newEmail,
            old_email_code: EmailVerificationService.generateHashedCode(oldEmailCode),
            new_email_code: EmailVerificationService.generateHashedCode(newEmailCode),
            expires: new Date(Date.now() + 3600000)
        };

        await user.save();

        // Send both emails
        const oldTemplate = MailTemplates.emailChangeSecurity(oldEmailCode);
        const newTemplate = MailTemplates.emailChangeVerification(newEmailCode);

        this.mailService.sendMail(user.email, oldTemplate.subject, oldTemplate.html);
        this.mailService.sendMail(newEmail, newTemplate.subject, newTemplate.html);
    }

    public async cancelEmailChange(userId: string): Promise<void> {
        const user = await User.findById(userId);
        if (!user) throw new UserNotFoundError(userId);
        user.email_change_request = undefined;
        await user.save();
    }

    public async completeEmailChange(userId: string, data: CompleteEmailChangeData): Promise<IUserUnpopulated> {
        const user = await User.findById(userId).select("+email_change_request.old_email_code +email_change_request.new_email_code");
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
            throw new EmailVerificationCodeInvalidOrExpiredError();
        }

        user.email = user.email_change_request.new_email;
        user.email_change_request = undefined;
        user.auth_version++;
        await user.save();

        return this.sanitizeUser(user);
    }

    public async updateUser(userId: string, data: UpdateUserData): Promise<IUserUnpopulated> {
        if (data.username) {
            const existing = await User.findOne({ username: data.username, _id: { $ne: userId } });
            if (existing) throw new UsernameAlreadyInUseError(data.username);
        }
        const user = await User.findByIdAndUpdate(userId, data, { new: true });
        if (!user) throw new UserNotFoundError(userId);
        return this.sanitizeUser(user);
    }

    public async getUser(userId: string, populate: true): Promise<IUserPopulated>;
    public async getUser(userId: string, populate?: false): Promise<IUserUnpopulated>;
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

    public async sendFriendRequest(requesterId: string, targetId: string): Promise<void> {
        if (requesterId === targetId) throw new SelfFriendRequestError();

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
            const [requester, target] = await Promise.all([
                User.findById(requesterId),
                User.findById(targetId)
            ]);

            if (!requester) throw new UserNotFoundError(requesterId);
            if (!target) throw new UserNotFoundError(targetId);

            if (target.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === requesterId) || requester.friends.some(f => (typeof f.user === 'string' ? f.user : f.user._id) === targetId)) throw new AlreadyFriendsError();
            if (requester.sent_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === targetId)) throw new FriendRequestAlreadySentError();
            if (target.sent_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === requesterId) || requester.received_friend_requests.some(id => (typeof id === 'string' ? id : id._id) === targetId)) throw new FriendRequestAlreadyReceivedError();
        }
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
    }



    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate: true): IUserPopulated;
    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate?: false): IUserUnpopulated;
    private sanitizeUser(user: HydratedDocument<IUserDocument>, populate: boolean = false): IUser {
        const { __v, password, ...cleanUser } = user.toObject();
        return cleanUser as IUser;
    }
}