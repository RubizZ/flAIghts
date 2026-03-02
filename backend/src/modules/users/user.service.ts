import { inject, singleton } from "tsyringe";
import type { HydratedDocument } from "mongoose";
import { MongoServerError } from "mongodb";
import crypto from "node:crypto";
import type { RegisterData, UpdateUserData } from "./user.types.js";
import { User, type IUser } from "./user.model.js";
import { PasswordService } from "../auth/auth.service.js";
import {
    UserNotFoundError,
    UserAlreadyExistsError,
    SelfFriendRequestError,
    AlreadyFriendsError,
    FriendRequestAlreadySentError,
    FriendRequestAlreadyReceivedError,
    NoPendingFriendRequestError,
    NoReceivedFriendRequestError,
    NotFriendsError,
    EmailAlreadyVerifiedError,
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

    public async createUser(data: RegisterData): Promise<IUser> {
        try {
            const verificationCode = EmailVerificationService.generateCode();
            const hashedCode = EmailVerificationService.generateHashedCode(verificationCode);
            const user = await User.create({
                ...data,
                password: PasswordService.hashPassword(data.password),
                email_verification_code: hashedCode,
                email_verification_expires: new Date(Date.now() + 3600000)
            });
            const template = MailTemplates.emailVerification(verificationCode)
            this.mailService.sendMail(data.email, template.subject, template.html);
            return this.sanitizeUser(user);
        } catch (error) {
            // Duplicate key error de MongoDB (código 11000)
            if (error instanceof MongoServerError && error.code === 11000) {
                const field = Object.keys(error.keyPattern ?? {})[0] as 'username' | 'email' | undefined;
                if (field) {
                    throw new UserAlreadyExistsError(data[field], field);
                }
            }
            throw error;
        }
    }

    public async updateUser(userId: string, data: UpdateUserData): Promise<IUser> {
        try {
            const updatedUser = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
            if (!updatedUser) {
                throw new UserNotFoundError(userId);
            }
            return this.sanitizeUser(updatedUser);
        } catch (error) {
            if (error instanceof UserNotFoundError) throw error;

            // Duplicate key error de MongoDB
            if (error instanceof MongoServerError && error.code === 11000) {
                const field = Object.keys(error.keyPattern ?? {})[0] as 'username' | 'email' | undefined;
                if (field && data[field]) {
                    throw new UserAlreadyExistsError(data[field], field);
                }
            }
            throw error;
        }
    }

    public async getUserById(id: string): Promise<IUser> {
        const user = await User.findById(id);
        if (!user) {
            throw new UserNotFoundError(id);
        }
        return this.sanitizeUser(user);
    }

    public async searchUsers(query: string, limit: number = 20): Promise<IUser[]> {
        const regex = new RegExp(query, 'i');
        const usersDocs = await User.find({ username: regex }).limit(limit);
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

    public async verifyEmail(email: string, code: string): Promise<void> {
        const hashedCode = EmailVerificationService.generateHashedCode(code);
        const user = await User.findOne({ email }).select('+email_verification_code +email_verification_expires');

        if (!user) {
            throw new UserNotFoundError(email);
        }

        if (user.email_verified) {
            throw new EmailAlreadyVerifiedError();
        }

        if (user.email_verification_code !== hashedCode || (user.email_verification_expires && user.email_verification_expires < new Date())) {
            throw new EmailVerificationCodeInvalidOrExpiredError();
        }

        user.email_verified = true;
        user.email_verification_code = undefined;
        user.email_verification_expires = undefined;
        await user.save();
    }

    public async resendVerificationEmail(email: string): Promise<void> {
        const user = await User.findOne({ email });

        if (!user) {
            throw new UserNotFoundError(email);
        }

        if (user.email_verified) {
            throw new EmailAlreadyVerifiedError();
        }

        const verificationCode = EmailVerificationService.generateCode();
        const hashedCode = EmailVerificationService.generateHashedCode(verificationCode);

        user.email_verification_code = hashedCode;
        user.email_verification_expires = new Date(Date.now() + 3600000); // 1 hora
        await user.save();

        const template = MailTemplates.emailVerification(verificationCode);
        this.mailService.sendMail(email, template.subject, template.html);
    }


    private sanitizeUser(user: HydratedDocument<IUser>): IUser {

        const { __v, ...cleanUser } = user.toObject();
        return cleanUser as IUser;
    }
}