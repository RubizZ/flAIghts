import { singleton, inject } from "tsyringe";
import OpenAI from "openai";
import type { AssistantChatMessage, AssistantRequestMessage, AssistantResponse } from "./search.types.js";
import { AssistantUnavailableError } from "./search.errors.js";
import { AirportService } from "../airport/airport.service.js";

@singleton()
export class SearchAssistantService {
    private openai: OpenAI;

    constructor(@inject(AirportService) private airportService: AirportService) {
        if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL) {
            console.warn("Ni OPENAI_API_KEY ni OPENAI_BASE_URL están definidos. El asistente de búsqueda podría no funcionar.");
        }

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || "ollama",
            baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        });
    }

    public async extractSearchData(messages: AssistantRequestMessage[], location?: { latitude: number; longitude: number }): Promise<AssistantResponse> {
        const filteredMessages = messages.filter(msg =>
            msg.role === "user" || msg.role === "assistant"
        );

        const airportSummary = await this.airportService.getTopAirportsSummary(400);

        const systemMessage: AssistantChatMessage = {
            role: "system",
            content: `Eres flAIghts, un experto buscador de vuelos. Tu ÚNICA misión es extraer datos para rellenar un formulario: ORIGEN, DESTINO, FECHA DE SALIDA y decidir sobre la VUELTA.
            ${location ? `El usuario está en lat:${location.latitude}, lon:${location.longitude}.` : ""}
            
            REGLAS DE ORO (INCUMPLIRLAS ES FALLAR):
            1. **Origen Sagrado**: NUNCA rellenes el campo "origin" en el JSON si el usuario no lo ha confirmado. Si el usuario no dice nada, déjalo null. PROHIBIDO poner "MAD" o "Madrid" por defecto si el usuario no lo ha dicho.
            2. **Confirmación de Ubicación**: Si usas la geolocalización, PREGUNTA: "Veo que estás cerca de [Ciudad], ¿quieres salir desde allí?". Hasta que no diga "sí", "vale" o confirme, el campo "origin" sigue siendo null.
            3. **Pregunta Obligatoria por la Vuelta**: NO pongas "ready": true sin haber preguntado antes si necesita fecha de regreso. Es un paso obligatorio para todos los usuarios.
            4. **Consistencia Texto-Datos**: El aeropuerto que menciones en el texto (ej: Haneda) DEBE ser el mismo que pongas en el JSON (ej: HND). No mezcles NRT y HND si son diferentes.
            5. **Ciudades Multi-Aeropuerto**: Si la ciudad tiene varios (Tokio, Londres), pregunta cuál prefiere antes de asignar un IATA. PROHIBIDO usar códigos de ciudad generalistas como TYO, LON, PAR, NYC.
            6. **Ready**: Solo "ready": true si tienes Origen, Destino, Salida Y el usuario ya respondió sobre la vuelta.
            7. **Validación IATA**: Usa la lista de aeropuertos proporcionada abajo (${airportSummary}). Si el usuario pide un destino que NO está en la lista pero conoces su código IATA, ÚSALO. Si no lo conoces, deja el campo null y pregunta: "¿A qué aeropuerto de [Ciudad] te refieres?".
            8. **Direccionalidad**: Presta atención a las preposiciones. "A [Ciudad]" o "Quiero ir a [Ciudad]" indica DESTINO. "Desde [Ciudad]", "Salgo de [Ciudad]" o "Estoy en [Ciudad]" indica ORIGEN. No los confundas.
            9. **Sentido Común**: No propongas el mismo aeropuerto como origen y destino.
            10. **Fechas Sagradas**: NUNCA rellenes el campo "departure_date" o "return_date" si el usuario no ha mencionado una fecha o confirmado una propuesta tuya. PROHIBIDO asumir que el usuario sale "hoy" o "mañana" por defecto. Si no tienes la fecha, PREGUNTA. Si el usuario menciona una fecha que no puedes interpretar, deja el campo null y pregunta: "¿Podrías especificar la fecha de [salida/vuelta]? No la he entendido bien."
            
            IDIOMA: 100% el del usuario. No mezcles.
            FECHAS: Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (ISO: ${new Date().toISOString().split('T')[0]}).
            
            FORMATO JSON (ESTRICTO):
            {
              "message": "Respuesta breve confirmando lo que sabes y pidiendo lo que falta.",
              "data": {
                "origin": "IATA o null (SOLO SI ESTÁ CONFIRMADO)",
                "destination": "IATA o null",
                "departure_date": "YYYY-MM-DD o null",
                "return_date": "YYYY-MM-DD o null"
              },
              "ready": "boolean"
            }
            `
        };

        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.CHAT_MODEL || "gpt-4o-mini",
                messages: [systemMessage, ...filteredMessages],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "search_flight_response",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                data: {
                                    type: "object",
                                    properties: {
                                        origin: { type: ["string", "null"] },
                                        destination: { type: ["string", "null"] },
                                        departure_date: { type: ["string", "null"] },
                                        return_date: { type: ["string", "null"] }
                                    },
                                    required: ["origin", "destination", "departure_date", "return_date"],
                                    additionalProperties: false
                                },
                                ready: { type: "boolean" }
                            },
                            required: ["message", "data", "ready"],
                            additionalProperties: false
                        }
                    }
                }
            });

            const choice = response.choices[0];
            if (!choice?.message?.content) {
                throw new Error("No response from OpenAI");
            }

            const parsedResponse = JSON.parse(choice.message.content);

            const originIata = parsedResponse.data.origin && parsedResponse.data.origin !== "null" ? parsedResponse.data.origin : null;
            const destIata = parsedResponse.data.destination && parsedResponse.data.destination !== "null" ? parsedResponse.data.destination : null;

            const [originAirport, destAirport] = await Promise.all([
                originIata ? this.airportService.getAirportByIata(originIata) : Promise.resolve(null),
                destIata ? this.airportService.getAirportByIata(destIata) : Promise.resolve(null)
            ]);

            return {
                message: {
                    role: "assistant",
                    content: parsedResponse.message,
                },
                data: {
                    origin: originAirport,
                    destination: destAirport,
                    departure_date: parsedResponse.data.departure_date && parsedResponse.data.departure_date !== "null" ? parsedResponse.data.departure_date : null,
                    return_date: parsedResponse.data.return_date && parsedResponse.data.return_date !== "null" ? parsedResponse.data.return_date : null
                },
                ready: !!(parsedResponse.ready &&
                    originAirport &&
                    destAirport &&
                    parsedResponse.data.departure_date && parsedResponse.data.departure_date !== "null")
            };
        } catch (error: any) {
            if (error instanceof OpenAI.APIError || error instanceof SyntaxError) {
                throw new AssistantUnavailableError(error);
            }
            throw error;
        }
    }
}
