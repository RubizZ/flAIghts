import fs from "fs";
import readline from "readline";
import mongoose from "mongoose";
import { Airline } from "../src/modules/airline/airline.model.js";

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

async function migrate(mongoUri: string) {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected");

        const airlinesFile = readline.createInterface({
            input: fs.createReadStream("./scripts/airlines.csv"),
            terminal: false,
        });

        let isFirstLine = true;
        let count = 0;
        let skipped = 0;
        let batch: any[] = [];
        const batchSize = 100;

        console.log("Reading airlines.csv...");

        for await (const line of airlinesFile) {
            if (isFirstLine) {
                isFirstLine = false;
                continue;
            }

            const parts = parseCSVLine(line);
            const name = parts[0];
            let iata = parts[1];
            let icao = parts[2];
            const country = parts[4];
            const active = parts[5];

            if (active !== "Y") {
                skipped++;
                continue;
            }

            if (!iata || iata === "-" || iata === "N/A" || iata === "") iata = undefined;
            if (!icao || icao === "-" || icao === "N/A" || icao === "") icao = undefined;

            const mainCode = iata || icao;

            // Si no tiene nombre o no  tiene ningun código identificador, la saltamos
            if (!name || !mainCode) {
                skipped++;
                continue;
            }

            let score = 10;
            if (icao) score += 20;
            if (iata) score += 50;

            const airlineDoc = {
                code: mainCode,
                name: name,
                country: country || "Unknown",
                quality_score: score,
            };

            batch.push(airlineDoc);

            // Guardar por lotes
            if (batch.length >= batchSize) {
                await processBatch(batch);
                count += batch.length;
                console.log(`Processed ${count} airlines...`);
                batch = [];
            }

        }

        // Procesar el resto
        if (batch.length > 0) {
            await processBatch(batch);
            count += batch.length;
        }

        console.log(`Migration finished.`);
        console.log(`Total inserted/updated: ${count}`);
        console.log(`Skipped (Inactive or invalid): ${skipped}`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

async function processBatch(batch: any[]) {
    const ops = batch.map(doc => {
        return {
            updateOne: {
                filter: { code: doc.code },
                update: { $set: doc },
                upsert: true
            }
        };
    });

    await Airline.bulkWrite(ops);
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