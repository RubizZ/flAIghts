import { Schema, model } from "mongoose";
import idValidator from "../../utils/mongoose-id-validator.js";

export interface IAirportReport {
    airport_iata: string;
    reason: string;
    user_id?: string;
    status: 'pending' | 'resolved' | 'rejected';
    created_at: Date;
    updated_at: Date;
}

const AirportReportSchema = new Schema<IAirportReport>({
    airport_iata: {
        type: String,
        ref: "Airport",
        refField: "iata_code",
        required: true,
        uppercase: true,
        match: [/^[A-Z]{3}$/, "El código IATA debe ser 3 letras mayúsculas"]
    },
    reason: {
        type: String,
        required: true,
        minlength: [5, "La razón debe tener al menos 5 caracteres"],
        maxlength: [1000, "La razón no puede exceder 1000 caracteres"]
    },
    user_id: { type: String, ref: 'User', required: false },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

AirportReportSchema.plugin(idValidator);

export const AirportReport = model<IAirportReport>("AirportReport", AirportReportSchema);
