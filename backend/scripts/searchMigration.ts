import mongoose from "mongoose";
import dns from "node:dns";
import { Search } from "../src/modules/search/models/search.model.js";

// Workaround for Node.js DNS SRV issues on some environments (especially Windows)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
}
// Force use of Google DNS if local DNS is failing to resolve SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function migrate(mongoUri: string) {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected");

        const db = mongoose.connection.db;
        if (!db) throw new Error("No database connection");
        
        const searchCollection = db.collection("searches");

        // Buscamos todas las búsquedas que tengan el campo 'departure_itineraries' o 'return_itineraries'
        // Usamos la colección cruda para evitar que Mongoose filtre campos fuera del esquema
        const cursor = searchCollection.find({
            $or: [
                { departure_itineraries: { $exists: true } },
                { return_itineraries: { $exists: true } }
            ]
        });

        const searchesToMigrate = await cursor.toArray();
        console.log(`Found ${searchesToMigrate.length} searches to migrate.`);

        let migratedCount = 0;

        for (const search of searchesToMigrate) {
            const update: any = { $set: {}, $unset: {} };

            // Migrar itinerarios de ida
            if (search.departure_itineraries && Array.isArray(search.departure_itineraries)) {
                update.$set.departure_itineraries_price = search.departure_itineraries;
                update.$set.departure_itineraries_duration = search.departure_itineraries;
                update.$set.departure_itineraries_custom = search.departure_itineraries;
                update.$unset.departure_itineraries = "";
            }

            // Migrar itinerarios de vuelta
            if (search.return_itineraries && Array.isArray(search.return_itineraries)) {
                // Solo copiamos si el campo legacy tiene contenido y los nuevos están vacíos/inexistentes
                const hasData = search.return_itineraries.length > 0;
                const newMissing = !search.return_itineraries_price || search.return_itineraries_price.length === 0;
                
                if (hasData && newMissing) {
                    update.$set.return_itineraries_price = search.return_itineraries;
                    update.$set.return_itineraries_duration = search.return_itineraries;
                    update.$set.return_itineraries_custom = search.return_itineraries;
                }
                
                // Siempre eliminamos el campo legacy para limpiar
                update.$unset.return_itineraries = "";
            }

            if (Object.keys(update.$set).length > 0 || Object.keys(update.$unset).length > 0) {
                await searchCollection.updateOne({ _id: search._id }, update);
                migratedCount++;
                if (migratedCount % 10 === 0) {
                    console.log(`Migrated ${migratedCount} searches...`);
                }
            }
        }

        console.log(`Migration finished. Total migrated: ${migratedCount}`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

let uri = process.argv[2] || process.env.MONGODB_URI;

if (!uri && (process.env.NODE_ENV === "development" || process.argv.includes("--docker"))) {
    uri = "mongodb://root:1234@localhost:27017/flAIghts?authSource=admin";
}

if (!uri) {
    console.error("Error: MONGODB_URI must be provided as path argument or MONGODB_URI env var.");
    process.exit(1);
}

migrate(uri);
