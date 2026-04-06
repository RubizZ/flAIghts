import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserLocation {
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
}

interface CountryFeature {
    type: string;
    properties: {
        ISO_A2: string;
        NAME: string;
        [key: string]: any;
    };
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: any[][][];
    };
}

interface UserLocationContextType {
    location: UserLocation | null;
    countryData: any | null;
    isLoading: boolean;
    error: string | null;
}

const UserLocationContext = createContext<UserLocationContextType | undefined>(undefined);

// Helper function: Point in Polygon (Ray Casting Algorithm)
function isPointInPolygon(point: [number, number], polygon: [number, number][]) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pI = polygon[i];
        const pJ = polygon[j];
        if (!pI || !pJ) continue;
        
        const xi = pI[0], yi = pI[1];
        const xj = pJ[0], yj = pJ[1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function findCountryAtPoint(lat: number, lon: number, geojson: any): CountryFeature | null {
    if (!geojson || !geojson.features) return null;
    
    for (const feature of geojson.features) {
        const { geometry } = feature;
        if (geometry.type === 'Polygon') {
            for (const ring of geometry.coordinates) {
                if (isPointInPolygon([lon, lat], ring)) return feature;
            }
        } else if (geometry.type === 'MultiPolygon') {
            for (const polygon of geometry.coordinates) {
                for (const ring of polygon) {
                    if (isPointInPolygon([lon, lat], ring)) return feature;
                }
            }
        }
    }
    return null;
}

export const UserLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [countryData, setCountryData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch user location by IP
                const geoRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
                if (!geoRes.ok) throw new Error("Failed to fetch IP location");
                const geoData = await geoRes.json();
                
                const userLoc: UserLocation = {
                    latitude: Number(geoData.latitude),
                    longitude: Number(geoData.longitude),
                    city: geoData.city,
                    region: geoData.region,
                    country: geoData.country,
                    country_code: geoData.country_code
                };
                setLocation(userLoc);

                // 2. Fetch GeoJSON used by the globe (countries)
                // Note: The globe uses ne_110m_borders_land.geojson for visual borders,
                // but ne_110m_countries.geojson is needed for point-in-polygon detection.
                const countriesRes = await fetch('/ne_110m_countries.geojson');
                if (!countriesRes.ok) throw new Error("Failed to fetch countries GeoJSON");
                const countriesGeojson = await countriesRes.json();

                // 3. Find country in GeoJSON
                const feature = findCountryAtPoint(userLoc.latitude, userLoc.longitude, countriesGeojson);
                if (feature) {
                    setCountryData(feature.properties);
                }

            } catch (err: any) {
                console.error("UserLocationContext Error:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <UserLocationContext.Provider value={{ location, countryData, isLoading, error }}>
            {children}
        </UserLocationContext.Provider>
    );
};

export const useUserLocation = () => {
    const context = useContext(UserLocationContext);
    if (context === undefined) {
        throw new Error('useUserLocation must be used within a UserLocationProvider');
    }
    return context;
};
