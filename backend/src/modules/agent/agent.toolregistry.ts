import type { ChatCompletionTool } from "openai/resources/chat/completions.js";
import { inject, singleton } from "tsyringe";
import { UserService } from "../users/user.service.js";
import { SearchService } from "../search/search.service.js";
import { AirportService } from "../airport/airport.service.js";
import { AirlineService } from "../airline/airline.service.js";
import type { AgentStreamEvent } from "./agent.types.js";
import type { SearchRequest, SearchResponseData } from "../search/search.types.js";
import type { AirportSearchPaginatedResult } from "../airport/airport.types.js";
import type { PaginatedAirlineResponse } from "../airline/airline.types.js";
import type { IUserPopulated } from "../users/models/user.model.js";

export interface SummarizedUserInfo {
    username: string;
    preferences: IUserPopulated['preferences'];
}

export interface SummarizedSearch {
    origins: string[];
    destinations: string[];
    departure_date: Date | string;
    status: string;
}

export interface SummarizedAirport {
    iata: string | null;
    name: string;
    city: string;
    type: string;
}

export interface SummarizedAirline {
    iata: string;
    name: string;
}

export interface SummarizedFlightPath {
    status: string;
    search_id: string;
    itineraries_count: number;
    best_itinerary: {
        price: number | undefined;
        duration: number;
        legs: {
            from: string;
            to: string;
            airline: string;
            departure: string;
            arrival: string;
        }[];
    } | null;
}


export interface ToolSchema<TArgs, TResult, TSummary> {
    args: TArgs;
    result: TResult;
    summary: TSummary;
}

export interface ToolDefinitions {
    getUserInfo: ToolSchema<
        {},
        { username: string; preferences: IUserPopulated['preferences'] },
        SummarizedUserInfo
    >;
    getUserSearchHistory: ToolSchema<
        { limit?: number },
        SearchResponseData[],
        SummarizedSearch[]
    >;
    searchAirports: ToolSchema<
        { query: string },
        AirportSearchPaginatedResult,
        { total: number; items: SummarizedAirport[] }
    >;
    searchAirlines: ToolSchema<
        { query: string },
        PaginatedAirlineResponse,
        SummarizedAirline[]
    >;
    performSearch: ToolSchema<
        {
            origins: string[];
            destinations: string[];
            departure_date: string;
            return_date?: string;
            priority: "balanced" | "cheap" | "fast";
        },
        SearchResponseData,
        SummarizedFlightPath | SearchResponseData
    >;
}

export type ToolName = keyof ToolDefinitions;

export type ToolArgsMap = { [K in ToolName]: ToolDefinitions[K]['args'] };
export type ToolResultsMap = { [K in ToolName]: ToolDefinitions[K]['result'] };
export type ToolSummariesMap = { [K in ToolName]: ToolDefinitions[K]['summary'] };

export interface ToolDefinition<T extends ToolName> {
    metadata: {
        description: string;
        parameters: Extract<ChatCompletionTool, { type: 'function' }>['function']['parameters'];
    };
    summarize: (result: ToolResultsMap[T]) => ToolSummariesMap[T];
    execute: (args: ToolArgsMap[T], userId?: string, callId?: string) => AsyncGenerator<AgentStreamEvent, ToolResultsMap[T]>;
}




@singleton()
export class ToolRegistry {
    constructor(
        @inject(UserService) private userService: UserService,
        @inject(SearchService) private searchService: SearchService,
        @inject(AirportService) private airportService: AirportService,
        @inject(AirlineService) private airlineService: AirlineService
    ) { }

    public getRegistry(): { [K in ToolName]: ToolDefinition<K> } {
        const self = this;

        return {
            getUserInfo: {
                metadata: {
                    description: "Obtiene la información del usuario actual, incluyendo preferencias de viaje y base, usalo para recomendaciones.",
                    parameters: { type: "object", properties: {} }
                },
                summarize: (r) => ({ username: r.username, preferences: r.preferences }),
                execute: async function* (_args, userId) {
                    if (!userId) throw new Error("No autenticado");
                    const user = await self.userService.getUser(userId);
                    return { username: user.username, preferences: user.preferences };
                }
            },
            getUserSearchHistory: {
                metadata: {
                    description: "Obtiene el historial de búsquedas recientes del usuario.",
                    parameters: {
                        type: "object",
                        properties: {
                            limit: { type: "number", description: "Número de búsquedas a recuperar." }
                        }
                    }
                },
                summarize: (r) => r.slice(0, 3).map((s) => ({
                    origins: s.origins,
                    destinations: s.destinations,
                    departure_date: s.departure_date,
                    status: s.status
                })),
                execute: async function* (args, userId) {
                    if (!userId) throw new Error("No autenticado");
                    const history = await self.searchService.getSearches(userId, userId, 1, args.limit || 5);
                    return history.items;
                }
            },
            searchAirports: {
                metadata: {
                    description: "Busca aeropuertos por ciudad, nombre o código IATA.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Término de búsqueda (ej: 'Madrid', 'LHR')." }
                        },
                        required: ["query"]
                    }
                },
                summarize: (r) => ({
                    total: r.total || 0,
                    items: (r.items || []).slice(0, 5).map((a) => {
                        if ("airports" in a) {
                            return {
                                iata: a.airports[0]?.iata_code || null,
                                name: a.name,
                                city: a.name,
                                type: a.type
                            };
                        }
                        return {
                            iata: a.iata_code,
                            name: a.name,
                            city: a.city,
                            type: a.type
                        };
                    })
                }),
                execute: async function* (args) {
                    return await self.airportService.searchAirports(args.query);
                }
            },
            searchAirlines: {
                metadata: {
                    description: "Busca aerolíneas por nombre o código IATA.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Término de búsqueda (ej: 'Iberia', 'IB')." }
                        },
                        required: ["query"]
                    }
                },
                summarize: (r) => (r.items || []).slice(0, 5).map((a) => ({ iata: a.code, name: a.name })),
                execute: async function* (args, userId, callId) {
                    return await self.airlineService.searchAirlines(args.query);
                }
            },
            performSearch: {
                metadata: {
                    description: "Realiza una búsqueda de vuelos real con los parámetros proporcionados.",
                    parameters: {
                        type: "object",
                        properties: {
                            origins: { type: "array", items: { type: "string" }, description: "Códigos IATA de origen." },
                            destinations: { type: "array", items: { type: "string" }, description: "Códigos IATA de destino." },
                            departure_date: { type: "string", description: "Fecha de salida (YYYY-MM-DD)." },
                            return_date: { type: "string", description: "Fecha de regreso (YYYY-MM-DD), opcional." },
                            priority: { type: "string", enum: ["balanced", "cheap", "fast"], description: "Prioridad de la búsqueda." }
                        },
                        required: ["origins", "destinations", "departure_date"]
                    }
                },
                summarize: (r) => {
                    if (r.status !== 'completed') return r;
                    const itineraries = r.departure_itineraries_price || r.departure_itineraries_duration || r.departure_itineraries_custom || [];
                    return {
                        status: 'completed',
                        search_id: r._id,
                        itineraries_count: itineraries.length,
                        best_itinerary: itineraries[0] ? {
                            price: itineraries[0].total_price,
                            duration: itineraries[0].total_duration,
                            legs: itineraries[0].legs.map((l) => ({
                                from: l.origin,
                                to: l.destination,
                                airline: l.airline,
                                departure: l.departure_time,
                                arrival: l.arrival_time
                            }))
                        } : null
                    };
                },
                execute: async function* (args, userId, callId) {
                    const searchReq: SearchRequest & { user_id?: string } = {
                        origins: args.origins,
                        destinations: args.destinations,
                        departure_date: new Date(args.departure_date),
                        return_date: args.return_date ? new Date(args.return_date) : undefined,
                        criteria: { priority: args.priority },
                        source: "agent",
                        user_id: userId
                    };

                    let finalData: SearchResponseData | undefined;
                    for await (const event of self.searchService.createSearchStream(searchReq)) {
                        yield { type: 'tool_progress', name: 'performSearch', event, call_id: callId } as AgentStreamEvent;
                        if (event.type === 'completed') {
                            finalData = event.data;
                        }
                    }
                    if (!finalData) throw new Error("Search failed to complete");
                    return finalData;
                }
            }
        };
    }
}
