import { Schema, model } from "mongoose";

export interface IAirport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  type: string;
  importance_score: number;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  created_at: Date;
  updated_at: Date;
}

export interface IAirportReport {
  airport_iata: string;
  reason: string;
  user_id?: string;
  status: 'pending' | 'resolved' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

const AirportSchema = new Schema<IAirport>({
  iata_code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    match: [/^[A-Z]{3}$/, "El código IATA debe ser 3 letras mayúsculas"]
  },
  name: {
    type: String,
    required: true,
    minlength: [2, "El nombre debe tener al menos 2 caracteres"],
    maxlength: [150, "El nombre no puede exceder 150 caracteres"]
  },
  city: {
    type: String,
    required: true,
    minlength: [2, "La ciudad debe tener al menos 2 caracteres"],
    maxlength: [100, "La ciudad no puede exceder 100 caracteres"]
  },
  country: {
    type: String,
    required: true,
    minlength: [2, "El país debe tener al menos 2 caracteres"],
    maxlength: [100, "El país no puede exceder 100 caracteres"]
  },
  type: {
    type: String,
    enum: ['large_airport', 'medium_airport', 'small_airport', 'closed'],
    required: true
  },
  importance_score: {
    type: Number,
    required: true,
    min: [0, "El score no puede ser negativo"],
    max: [10, "El score no puede exceder 10"]
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return Array.isArray(v) && v.length === 2 &&
            typeof v[0] === 'number' && v[0] >= -180 && v[0] <= 180 &&
            typeof v[1] === 'number' && v[1] >= -90 && v[1] <= 90;
        },
        message: "Las coordenadas deben ser [longitud, latitud] válidas"
      }
    }
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

AirportSchema.index({ location: "2dsphere" });

const AirportReportSchema = new Schema<IAirportReport>({
  airport_iata: { type: String, required: true, uppercase: true },
  reason: {
    type: String,
    required: true,
    minlength: [5, "La razón debe tener al menos 5 caracteres"],
    maxlength: [1000, "La razón no puede exceder 1000 caracteres"]
  },
  user_id: { type: String, ref: 'User', required: false },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Airport = model<IAirport>("Airport", AirportSchema);
export const AirportReport = model<IAirportReport>("AirportReport", AirportReportSchema);
