import "reflect-metadata";
import mongoose from "mongoose";
import "dotenv/config";

// Importación dinámica para evitar cargar ServerConfig antes de tiempo si fuera necesario,
// aunque al instanciar AirportService manualmente ya no es estrictamente crítico.
const { AirportService } = await import("../src/modules/airport/airport.service.js");
const { Airport } = await import("../src/modules/airport/airport.model.js");

async function runTest() {
    // Solo necesitamos la URI de MongoDB para que el script funcione
    const mongoUri = process.env.MONGODB_URI || "mongodb://root:1234@localhost:27017/flAIghts?authSource=admin";

    console.log("🔌 Conectando a MongoDB...");
    try {
        await mongoose.connect(mongoUri);
        console.log("✅ Conectado.");
    } catch (error) {
        console.error("❌ Error de conexión a MongoDB:", error);
        process.exit(1);
    }

    // Instanciamos el servicio MANUALMENTE inyectando un mock de configuración mínimo.
    // Esto evita que el contenedor de tsyringe intente resolver ServerConfig, 
    // lo cual dispararía la validación de TODAS las variables de entorno (.env).
    const mockConfig: any = {
        GEOCODE_CACHE_TTL: "7d",
        GEOCODING_PROVIDER: "nominatim"
    };
    
    const service = new AirportService(mockConfig);

    const originIata = (process.argv[2] || "MAD").toUpperCase(); 
    const destinationIata = (process.argv[3] || "LHR").toUpperCase(); 

    console.log(`\n✈️  ANÁLISIS DE ESCALAS CANDIDATAS`);
    console.log(`📡 Ruta: ${originIata} -> ${destinationIata}`);

    try {
        const start = Date.now();
        const layovers = await service.getCandidateLayovers(originIata, destinationIata);
        const time = Date.now() - start;

        if (layovers.length === 0) {
            console.log("\n❌ No se encontraron aeropuertos intermedios para esta ruta que cumplan los criterios LCC.");
            await mongoose.disconnect();
            process.exit(0);
        }

        // Buscamos detalles de los aeropuertos encontrados
        const details = await Airport.find({ iata_code: { $in: layovers } }).lean();
        
        // Combinamos la info del DB conservando el orden original (por distancia total)
        const combined = layovers.map(iata => {
            const detail = details.find(d => d.iata_code === iata);
            return detail;
        }).filter(Boolean);

        console.log(`\n✅ Se encontraron ${combined.length} candidatos en ${time}ms (ordenados por cercanía del trayecto):\n`);
        
        console.log(`| #  | IATA | Ciudad          | País | Tipo             |`);
        console.log(`|----|------|-----------------|------|------------------|`);
        
        combined.forEach((a: any, index) => {
            const city = (a.city || "").padEnd(15).slice(0, 15);
            const country = (a.country || "").padEnd(4).slice(0, 4);
            const type = (a.type || "").padEnd(16).slice(0, 16);
            
            console.log(`| ${(index + 1).toString().padEnd(2)} | ${a.iata_code.padEnd(4)} | ${city} | ${country} | ${type} |`);
        });

        console.log("\n-------------------------------------------------------------------");

    } catch (error) {
        console.error("\n❌ Error durante la prueba:", error);
    }

    await mongoose.disconnect();
    process.exit(0);
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
