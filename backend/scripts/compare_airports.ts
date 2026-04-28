import fs from 'fs';
import readline from 'readline';

function parseCSVLine(line: string) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else cur += char;
    }
    result.push(cur.trim());
    return result;
}

async function run() {
    const mainIatas = new Set();
    const mainFile = readline.createInterface({ input: fs.createReadStream('./scripts/airports.csv') });
    let isFirst = true;
    for await (const line of mainFile) {
        if (isFirst) { isFirst = false; continue; }
        const parts = parseCSVLine(line);
        const iata = parts[13];
        if (iata && iata.length === 3) mainIatas.add(iata);
    }

    console.log('Fallbacks (in airports_data.csv but NOT in airports.csv):');
    const dataFile = readline.createInterface({ input: fs.createReadStream('./scripts/airports_data.csv') });
    isFirst = true;
    let fallbackCount = 0;
    const fallbacks = [];
    for await (const line of dataFile) {
        if (isFirst) { isFirst = false; continue; }
        const parts = parseCSVLine(line);
        const iata = parts[2];
        const name = parts[1];
        const country = parts[6];
        if (iata && iata.length === 3 && !mainIatas.has(iata)) {
            fallbacks.push({ iata, name, country });
            fallbackCount++;
        }
    }

    // Sort by IATA and print first 100 for brevity, or summarize
    fallbacks.sort((a, b) => a.iata.localeCompare(b.iata));
    fallbacks.forEach(f => {
        console.log(`- ${f.iata}: ${f.name} (${f.country})`);
    });
    console.log(`\nTotal fallbacks: ${fallbackCount}`);
}
run();
