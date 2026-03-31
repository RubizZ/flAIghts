import type { SearchResponseData, SearchProgressEvent } from "../search/search.types.js";
import type { ValidationDetails, RequestValidationFailResponse } from "../../utils/responses.js";

/**
 * Estructura genérica de mensaje para el historial del chat.
 */
export interface AssistantChatMessage {
    role: "user" | "assistant" | "system";
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

export type AgentStreamEvent =
    | { type: 'step', message: string }
    | { type: 'iteration', count: number }
    | { type: 'tool_call', name: string, args: any, call_id: string }
    | { type: 'tool_progress', name: string, event: SearchProgressEvent, call_id: string }
    | { type: 'tool_result', name: string, result: any, call_id: string }
    | { type: 'final_result', data: AgentResponse }
    | { type: 'error', message: string };
