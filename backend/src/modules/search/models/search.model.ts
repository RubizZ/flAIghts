import { Schema, model } from "mongoose";
import { randomUUID } from "node:crypto";
import idValidator from "../../../utils/mongoose-id-validator.js";

import type { IItinerary } from "./itinerary.model.js";
import "@/modules/airport/airport.model.js"; // Necesario para mongoose.model("Airport") en idValidator

export interface ISearch {
  id: string;
  user_id?: string;
  shared: boolean;
  origins: string[];
  destinations: string[];
  departure_date: Date;
  return_date?: Date;
  criteria: {
    priority: "balanced" | "cheap" | "fast";
    max_price?: number;
  };
  status: "searching" | "completed" | "failed";
  departure_itineraries?: IItinerary[];
  return_itineraries?: IItinerary[];
  created_at: Date;
}

const SearchSchema = new Schema<ISearch>({
  id: { type: String, default: () => randomUUID(), unique: true, index: true },
  user_id: { type: String, ref: "User", refField: "id", required: false },
  shared: { type: Boolean, default: false },
  origins: [{
    type: String,
    ref: "Airport",
    refField: "iata_code",
    required: true,
    uppercase: true,
    match: [/^[A-Z]{3}$/, "Cada origen debe ser código IATA válido"]
  }],
  destinations: [{
    type: String,
    ref: "Airport",
    refField: "iata_code",
    required: true,
    uppercase: true,
    match: [/^[A-Z]{3}$/, "Cada destino debe ser código IATA válido"]
  }],
  departure_date: { type: Date, required: true },
  return_date: { type: Date, required: false },
  criteria: {
    priority: { type: String, enum: ["balanced", "cheap", "fast"], default: "balanced" },
    max_price: {
      type: Number,
      required: false,
      validate: {
        validator: function (v: number | undefined) {
          return v === undefined || v > 0;
        },
        message: "El precio máximo debe ser mayor a 0"
      }
    }
  },
  status: { type: String, enum: ["searching", "completed", "failed"], default: "searching" },
  departure_itineraries: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  return_itineraries: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }
  },
  id: false
});

SearchSchema.plugin(idValidator);

export const Search = model<ISearch>("Search", SearchSchema);
