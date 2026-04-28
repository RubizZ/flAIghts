import { Schema, model, type PopulatedDoc } from "mongoose";
import { randomUUID } from "node:crypto";
import idValidator from "../../../utils/mongoose-id-validator.js";

import type { IItinerary } from "./itinerary.model.js";
import "@/modules/airport/airport.model.js"; // Necesario para mongoose.model("Airport") en idValidator
import type { DijkstraFlightEdge } from "@/algorithms/dijkstra.js";

export interface ISearch {
  _id: string;
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
  source: "manual" | "agent";
  departure_itineraries_price?: PopulatedDoc<IItinerary>[];
  departure_itineraries_duration?: PopulatedDoc<IItinerary>[];
  departure_itineraries_custom?: PopulatedDoc<IItinerary>[];
  return_itineraries_price?: PopulatedDoc<IItinerary>[];
  return_itineraries_duration?: PopulatedDoc<IItinerary>[];
  return_itineraries_custom?: PopulatedDoc<IItinerary>[];
  created_at: Date;
  last_error?: string;
  exploration_state?: Map<string, {
    A: DijkstraFlightEdge[][];
    candidates: {
      path: DijkstraFlightEdge[];
      weight: number;
    }[];
    last_explored_index: number;
  }>;
}

const SearchSchema = new Schema<ISearch>({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String, ref: "User", required: false },
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
  source: { type: String, enum: ["manual", "agent"], default: "manual" },
  departure_itineraries_price: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  departure_itineraries_duration: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  departure_itineraries_custom: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  return_itineraries_price: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  return_itineraries_duration: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  return_itineraries_custom: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
  created_at: { type: Date, default: Date.now },
  last_error: { type: String, required: false },
  exploration_state: {
    type: Map,
    of: new Schema({
      A: [[Schema.Types.Mixed]],
      candidates: [{
        path: [Schema.Types.Mixed],
        weight: Number
      }],
      last_explored_index: { type: Number, default: 0 }
    }),
    default: {}
  }
}, {
  toJSON: {
    versionKey: false
  },
  toObject: {
    versionKey: false
  }
});

SearchSchema.plugin(idValidator);

export const Search = model<ISearch>("Search", SearchSchema);
