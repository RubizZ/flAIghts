import fs from "fs";
import readline from "readline";
import mongoose from "mongoose";
import { Airport } from "../src/modules/airport/airport.model.js";


function parseCSVLine(line: string) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}


const EXCLUDED_KEYWORDS = ["Base", "Military", "Air Base", "Heliport", "Helipad"];

function isNonCommercial(name: string): boolean {
    return EXCLUDED_KEYWORDS.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Migra los aeropuertos de airports.csv a la base de datos
 * 
 * El archivo airports.csv contiene todos (o la mayoria de) los aeropuertos y bases aereas
 * del mundo, puesto que no se necesitan los helipuertos pequeños, las bases militares, etc,
 * se usa el archivo airports_data.csv que contiene solo aeropuertos comerciales para filtrar
 * y como fallback de aeropuertos relevantes
 */
async function migrate(mongoUri: string) {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected.");

        // Cargar airports_data.csv como filtro y fallback de aeropuertos relevantes
        const iataRegistry = new Map<string, any>();
        console.log("Loading iata filter from airports_data.csv...");
        const dataFile = readline.createInterface({
            input: fs.createReadStream("./scripts/airports_data.csv"),
            terminal: false,
        });

        let isFirstData = true;
        for await (const line of dataFile) {
            if (isFirstData) {
                isFirstData = false;
                continue;
            }
            const parts = line.split(",");
            const name = parts[1] || "";
            const iata = parts[2] || "";

            // Filtramos por nombre para evitar bases militares y helipuertos
            if (isNonCommercial(name)) {
                continue;
            }

            if (iata && iata.length === 3) {
                iataRegistry.set(iata, {
                    name: parts[1] || "Unknown",
                    iata: iata,
                    lat: parseFloat(parts[4] || "0"),
                    lon: parseFloat(parts[5] || "0"),
                    country: parts[6] || "Unknown"
                });
            }
        }
        console.log(`Filter registry loaded with ${iataRegistry.size} IATA codes.`);

        const processedIatas = new Set<string>();
        const batchSize = 100;
        let batch: any[] = [];
        let count = 0;

        // Procesar airports.csv como fuente primaria de informacion
        console.log("Reading airports.csv (Primary Source)...");
        const airportsFile = readline.createInterface({
            input: fs.createReadStream("./scripts/airports.csv"),
            terminal: false,
        });

        let isFirstAirports = true;
        for await (const line of airportsFile) {
            if (isFirstAirports) {
                isFirstAirports = false;
                continue;
            }
            const parts = parseCSVLine(line);
            const iata = parts[13];
            const name = parts[3] || "Unknown";
            const type = parts[2] || "";

            const ALLOWED_TYPES = ["small_airport", "medium_airport", "large_airport"];

            // Solo procesamos si tiene IATA, está en nuestra lista de filtros,
            // el nombre es comercial y el tipo es uno de los permitidos.
            if (
                iata && iata.length === 3 &&
                iataRegistry.has(iata) &&
                !isNonCommercial(name) &&
                ALLOWED_TYPES.includes(type)
            ) {
                const lat = parseFloat(parts[4] || "0");
                const lon = parseFloat(parts[5] || "0");
                const country = parts[8] || "Unknown";
                const city = parts[10] || parts[3] || "Unknown";

                let importance_score = 10;
                if (type === "large_airport") importance_score = 100;
                else if (type === "medium_airport") importance_score = 50;

                const airportDoc = {
                    iata_code: iata,
                    name: name,
                    city: city,
                    country: country,
                    type: type,
                    importance_score: importance_score,
                    location: {
                        type: "Point" as const,
                        coordinates: [lon, lat] as [number, number],
                    },
                };

                batch.push(airportDoc);
                processedIatas.add(iata);

                if (batch.length >= batchSize) {
                    await Airport.bulkWrite(batch.map(doc => ({
                        updateOne: { filter: { iata_code: doc.iata_code }, update: { $set: doc }, upsert: true }
                    })));
                    count += batch.length;
                    console.log(`Processed ${count} airports from primary source...`);
                    batch = [];
                }
            }
        }

        // Procesar fallbacks (IATAs en airports_data.csv que no estaban en airports.csv)
        console.log("Processing fallbacks from airports_data.csv...");
        for (const [iata, data] of iataRegistry) {
            if (!processedIatas.has(iata)) {
                const airportDoc = {
                    iata_code: iata,
                    name: data.name,
                    city: data.name,
                    country: data.country,
                    type: "small_airport",
                    importance_score: 10,
                    location: {
                        type: "Point" as const,
                        coordinates: [data.lon, data.lat] as [number, number],
                    },
                };

                batch.push(airportDoc);

                if (batch.length >= batchSize) {
                    await Airport.bulkWrite(batch.map(doc => ({
                        updateOne: { filter: { iata_code: doc.iata_code }, update: { $set: doc }, upsert: true }
                    })));
                    count += batch.length;
                    console.log(`Processed ${count} airports (including fallbacks)...`);
                    batch = [];
                }
            }
        }

        if (batch.length > 0) {
            await Airport.bulkWrite(batch.map((doc: any) => ({
                updateOne: { filter: { iata_code: doc.iata_code }, update: { $set: doc }, upsert: true }
            })));
            count += batch.length;
        }

        console.log(`Migration finished. Total: ${count} airports.`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

let uri = process.argv[2] || process.env.MONGODB_URI;

if (process.env.NODE_ENV === "development" || process.argv.includes("--docker")) {
    uri = "mongodb://root:1234@localhost:27017/flAIghts?authSource=admin";
}

if (!uri) {
    console.error("Error: MONGODB_URI must be provided as path argument or MONGODB_URI env var.");
    process.exit(1);
}

migrate(uri);

