import "reflect-metadata";
import mongoose from "mongoose";
import { container } from "tsyringe";
import { SerpapiStorageService } from "../src/modules/serpapi-storage/serpapi-storage.service.js";
import "dotenv/config";

async function runTest() {
    // Conexión a MongoDB (asume que tienes el docker levantado y el puerto 27017 expuesto)
    const mongoUri = "mongodb://root:1234@localhost:27017/flAIghts?authSource=admin";

    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Conectado.");

    const service = container.resolve(SerpapiStorageService);

    // --- PARÁMETROS DE PRUEBA ---
    const departure = "LIM"; // Madrid
    const arrival = "MAD";   // Londres Heathrow
    // Buscamos una fecha 30 días en el futuro para asegurar que haya vuelos
    const date = new Date();
    date.setDate(date.getDate() + 30);
    const dateStr = date.toISOString().split('T')[0];

    console.log(`\n✈️  PRUEBA DE CACHÉ: ${departure} -> ${arrival} [${dateStr}]`);

    // 1. PRIMERA CONSULTA (Debería ir a la API de SerpApi)
    console.log("\n1️⃣  Ejecutando PRIMERA consulta (esperando a SerpApi)...");
    const start1 = Date.now();
    const flights1 = await service.getAllFlights(departure, arrival, dateStr);
    const time1 = Date.now() - start1;
    console.log(`   👉 Resultados: ${flights1.length} vuelos.`);
    console.log(`   ⏱️  Tiempo: ${time1} ms (Lento = API)`);

    // 2. SEGUNDA CONSULTA (Debería ir a la Base de Datos)
    console.log("\n2️⃣  Ejecutando SEGUNDA consulta (debería ser instantánea)...");
    const start2 = Date.now();
    const flights2 = await service.getAllFlights(departure, arrival, dateStr);
    const time2 = Date.now() - start2;
    console.log(`   👉 Resultados: ${flights2.length} vuelos.`);
    console.log(`   ⏱️  Tiempo: ${time2} ms (Rápido = Caché)`);

    // Verificación
    if (time2 < time1 && time2 < 500) {
        console.log("\n🎉 ÉXITO: El sistema de caché está funcionando correctamente.");
    } else {
        console.log("\n⚠️  ATENCIÓN: Revisa los tiempos, parece que no se usó la caché o la API fue muy rápida.");
    }

    await mongoose.disconnect();
}

runTest().catch(console.error);
