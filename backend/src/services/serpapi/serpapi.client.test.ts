import "reflect-metadata";
import { writeFile } from "fs/promises";
import { SerpApiClient } from "./serpapi.client.js";
import { ServerConfig } from "../../config/server.config.js";

async function test() {
    const client = new SerpApiClient(new ServerConfig());

    const result = await client.search({
    departure_id: "MAD",
    arrival_id: "BCN",
    outbound_date: "2026-03-10",
    type: 2,
    currency: "EUR",
    hl: "es",
    gl: "es",
});

  await writeFile(
    "serpapi-response.json",
    JSON.stringify(result, null, 2),
    "utf8"
  );

}

test().catch(console.error);
