import { Schema, model, type PopulatedDoc } from "mongoose";
import { randomUUID } from "node:crypto";

export interface IUserFields {
  _id: string;
  username: string;
  email: string;
  password: string;
  public: boolean;
  role: "user" | "admin";
  preferences: {
    price_weight: number;
    duration_weight: number;
    stops_weight: number;
    airline_quality_weight: number;
  };
  created_at: Date;
  last_seen_at: Date;
  auth_version: number;
  password_reset_token?: string;
  password_reset_expires?: Date;
  email_change_request?: {
    new_email: string;
    old_email_code: string;
    new_email_code: string;
    expires: Date;
  };
  profile_picture?: string;
}

export interface IFriendUnpopulated {
  user: string;
  friend_since: Date;
}

export interface IFriendPopulated {
  user: IUserUnpopulated;
  friend_since: Date;
}

export type IFriend = IFriendUnpopulated | IFriendPopulated;

export interface IUserUnpopulated extends Omit<IUserFields, 'password'> {
  friends: IFriendUnpopulated[];
  sent_friend_requests: string[];
  received_friend_requests: string[];
}

export interface IUserPopulated extends Omit<IUserFields, 'password'> {
  friends: IFriendPopulated[];
  sent_friend_requests: IUserUnpopulated[];
  received_friend_requests: IUserUnpopulated[];
}

export type IUser = IUserUnpopulated | IUserPopulated;

/**
 * Interface for Mongoose model definition, using PopulatedDoc for flexibility during queries.
 */
export interface IUserDocument extends Omit<IUserFields, 'password'> {
  password?: string; // Optional because it's usually +select
  friends: { user: PopulatedDoc<IUserDocument, string>; friend_since: Date }[];
  sent_friend_requests: PopulatedDoc<IUserDocument, string>[];
  received_friend_requests: PopulatedDoc<IUserDocument, string>[];
}

const UserSchema = new Schema<IUserDocument>({
  _id: { type: String, default: () => randomUUID() },
  username: {
    type: String,
    required: true,
    minlength: [3, "El nombre de usuario debe tener al menos 3 caracteres"],
    maxlength: [50, "El nombre de usuario no puede exceder 50 caracteres"],
    match: [/^[a-zA-Z0-9_-]+$/, "El nombre de usuario solo puede contener letras, números, guiones y guiones bajos"]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Proporciona un email válido"]
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  public: {
    type: Boolean,
    default: false
  },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  preferences: {
    price_weight: {
      type: Number,
      default: 0.4,
      min: [0, "El peso no puede ser menor a 0"],
      max: [1, "El peso no puede ser mayor a 1"]
    },
    duration_weight: {
      type: Number,
      default: 0.2,
      min: [0, "El peso no puede ser menor a 0"],
      max: [1, "El peso no puede ser mayor a 1"]
    },
    stops_weight: {
      type: Number,
      default: 0.2,
      min: [0, "El peso no puede ser menor a 0"],
      max: [1, "El peso no puede ser mayor a 1"]
    },
    airline_quality_weight: {
      type: Number,
      default: 0.2,
      min: [0, "El peso no puede ser menor a 0"],
      max: [1, "El peso no puede ser mayor a 1"]
    },
  },
  created_at: { type: Date, default: Date.now },
  last_seen_at: { type: Date, default: Date.now },
  auth_version: { type: Number, default: 1, min: 1 },
  password_reset_token: { type: String, select: false, index: true },
  password_reset_expires: { type: Date, select: false },
  friends: [{
    user: { type: String, ref: "User", required: true },
    friend_since: { type: Date, default: Date.now }
  }],
  sent_friend_requests: [{ type: String, ref: "User" }],
  received_friend_requests: [{ type: String, ref: "User" }],
  email_change_request: {
    new_email: { type: String, lowercase: true },
    old_email_code: { type: String, select: false },
    new_email_code: { type: String, select: false },
    expires: { type: Date, select: false }
  },
  profile_picture: { type: String }
});

// Índice único case-insensitive para username
UserSchema.index(
  { username: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

export const User = model<IUserDocument>("User", UserSchema);
