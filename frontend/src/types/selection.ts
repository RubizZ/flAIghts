import { AirportResponse, CityResponse, GlobeAirportResponse } from "@/api/generated/openapi/model";

export type UnifiedSelection = AirportResponse | CityResponse;

export const isAirport = (item: UnifiedSelection): item is AirportResponse => {
    return (item as AirportResponse).iata_code !== undefined;
};

export const isCity = (item: UnifiedSelection): item is CityResponse => {
    return (item as CityResponse).airports !== undefined;
};

export const getIatas = (item: UnifiedSelection): string[] => {
    if (isAirport(item)) return [item.iata_code];
    return item.airports.map(a => a.iata_code);
};

export const getAllIatas = (items: UnifiedSelection[]): string[] => {
    return items.flatMap(getIatas);
};

export const getEntityId = (item: UnifiedSelection): string => {
    if (isAirport(item)) return item.iata_code;
    return `city-${item.name}-${item.country}`;
};

export const getEntityName = (item: UnifiedSelection): string => {
    return item.name;
};

export const getEntityLocation = (item: UnifiedSelection) => {
    return item.location;
};
export const serializeSelection = (item: UnifiedSelection): string => {
    if (isAirport(item)) return item.iata_code;
    
    const data = {
        n: item.name,
        c: item.country,
        la: item.location.coordinates[1],
        lo: item.location.coordinates[0],
        a: item.airports.map(a => a.iata_code)
    };
    try {
        const json = JSON.stringify(data);
        // Use btoa with unescape/encodeURIComponent for Unicode safety
        return `city:${btoa(unescape(encodeURIComponent(json)))}`;
    } catch (e) {
        console.error("Failed to serialize city", e);
        return `city-error`;
    }
};

export const deserializeSelection = (val: string, globeAirports: GlobeAirportResponse[]): UnifiedSelection | null => {
    if (val.startsWith('city:')) {
        try {
            const base64 = val.substring(5);
            const json = decodeURIComponent(escape(atob(base64)));
            const data = JSON.parse(json);
            
            const airports = data.a.map((iata: string) => {
                const ga = globeAirports.find(a => a.i === iata);
                if (!ga) return null;
                return {
                    iata_code: ga.i,
                    name: ga.n,
                    city: ga.ci,
                    country: ga.c,
                    location: { coordinates: [ga.lo, ga.la], type: "Point" },
                    type: 'airport',
                    importance_score: ga.s,
                } as AirportResponse;
            }).filter(Boolean) as AirportResponse[];

            return {
                name: data.n,
                country: data.c,
                location: { coordinates: [data.lo, data.la], type: "Point" },
                airports,
                type: 'city'
            } as CityResponse;
        } catch (e) {
            console.error("Failed to deserialize city", e);
            return null;
        }
    } else {
        // Fallback to regular IATA lookup
        const ga = globeAirports.find(a => a.i === val);
        if (!ga) return null;
        return {
            iata_code: ga.i,
            name: ga.n,
            city: ga.ci,
            country: ga.c,
            location: { coordinates: [ga.lo, ga.la], type: "Point" },
            type: 'airport',
            importance_score: ga.s,
        } as AirportResponse;
    }
};
