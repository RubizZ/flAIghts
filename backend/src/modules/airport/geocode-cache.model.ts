import { Schema, model } from "mongoose";

export interface IGeocodeCache {
    query: string;
    lat: number;
    lon: number;
    display_name: string;
    country: string;
    expiresAt: Date;
}

const GeocodeCacheSchema = new Schema<IGeocodeCache>({
    query: { type: String, required: true, unique: true, index: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    display_name: { type: String, required: true },
    country: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // MongoDB TTL index
}, { timestamps: true });

export const GeocodeCache = model<IGeocodeCache>("GeocodeCache", GeocodeCacheSchema);
