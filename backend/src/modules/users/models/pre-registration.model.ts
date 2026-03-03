import { Schema, model } from "mongoose";

export interface IPreRegistration {
    email: string;
    code: string;
    expires: Date;
}

const PreRegistrationSchema = new Schema<IPreRegistration>({
    email: { type: String, required: true, unique: true, lowercase: true },
    code: { type: String, required: true },
    expires: { type: Date, required: true }
});

export const PreRegistration = model<IPreRegistration>("PreRegistration", PreRegistrationSchema);
