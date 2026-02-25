import { Schema, model } from "mongoose";
import { randomUUID } from "node:crypto";

export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
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
}

const UserSchema = new Schema<IUser>({
  id: { type: String, default: () => randomUUID(), unique: true, index: true },
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
  password_reset_expires: { type: Date, select: false }
});

// Índice único case-insensitive para username
UserSchema.index(
  { username: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

UserSchema.pre('save', function () {
  const sum = this.preferences.price_weight + this.preferences.duration_weight +
    this.preferences.stops_weight + this.preferences.airline_quality_weight;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error('Los pesos de preferencias deben sumar 1.0');
  }
});

export const User = model<IUser>("User", UserSchema);