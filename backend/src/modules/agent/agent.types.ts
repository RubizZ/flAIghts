import type { SearchResponseData, SearchProgressEvent } from "../search/search.types.js";
import type { ValidationDetails, RequestValidationFailResponse } from "../../utils/responses.js";

/**
 * Estructura genérica de mensaje para el historial del chat.
 */
export interface AssistantChatMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * Mensaje devuelto por el asistente en la respuesta.
 */
export interface AssistantResponseMessage {
    role: "assistant";
    content: string;
}

/**
 * Mensaje enviado por el cliente al asistente. Solo permitimos 'user' y 'assistant'
 * para evitar que se inyecten mensajes de 'system'.
 */
export interface AssistantRequestMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AgentRequest {
    messages: AssistantRequestMessage[];
    model?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    date?: Date;
    manual_state?: {
        origins?: string[];
        destinations?: string[];
        departure_date?: string;
        return_date?: string;
    };
}

export interface AgentResponse {
    message: AssistantResponseMessage;
    suggestions?: string[];
    flights?: SearchResponseData[];
}

export type AgentValidationFailResponse = RequestValidationFailResponse<ValidationDetails<"body" | "body.messages" | "body.location">>;

import { type ToolArgsMap, type ToolResultsMap } from "./agent.toolregistry.js";

export type ToolCallEvent = {
    [K in keyof ToolArgsMap]: {
        type: 'tool_call';
        name: K;
        args: ToolArgsMap[K];
        call_id: string;
    }
}[keyof ToolArgsMap];

export type ToolResultEvent = {
    [K in keyof ToolResultsMap]: {
        type: 'tool_result';
        name: K;
        result: ToolResultsMap[K];
        call_id: string;
    }
}[keyof ToolResultsMap];

export type AgentStreamEvent =
    | { type: 'step', message: string }
    | { type: 'iteration', count: number }
    | ToolCallEvent
    | { type: 'tool_progress', name: string, event: SearchProgressEvent, call_id: string }
    | ToolResultEvent
    | { type: 'final_result', data: AgentResponse }
    | { type: 'error', message: string };
