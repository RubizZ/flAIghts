import { Body, Controller, Post, Get, RequestProp, Response, Route, Security, Tags, Request } from "tsoa";
import * as express from 'express';
import { inject, injectable } from "tsyringe";
import { AgentService } from "./agent.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse as SuccessResponseType } from "../../utils/responses.js";
import type { AgentRequest, AgentResponse, AgentValidationFailResponse } from "./agent.types.js";
import { AgentUnavailableError } from "./agent.errors.js";
import type { FailResponseFromError } from "../../utils/responses.js";
import { AsyncAPIChannel, AsyncAPIController } from "../../utils/asyncapi.decorators.js";
import type { AgentStreamEvent } from "./agent.types.js";

@injectable()
@Route("agent")
@Tags("Agent")
@AsyncAPIController("Agent")
export class AgentController extends Controller {

    constructor(
        @inject(AgentService) private readonly agentService: AgentService
    ) {
        super();
    }

    /**
     * Listar modelos de IA disponibles.
     */
    @Get("/models")
    public async models(): Promise<SuccessResponseType<string[]>> {
        return await this.agentService.listModels() satisfies string[] as any;
    }

    /**
     * Chat con el asistente de flAIghts.
     */
    @Post("/")
    @Security("jwt")
    @Response<AgentValidationFailResponse>(422, "Error de validación")
    @Response<FailResponseFromError<AgentUnavailableError>>(503, "Servicio no disponible")
    public async agentChat(
        @Body() body: AgentRequest,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponseType<AgentResponse>> {
        const { messages, location, manual_state, model } = body;
        const result = await this.agentService.chat(messages, user._id, location, manual_state, model);
        return result satisfies AgentResponse as any;
    }

    /**
     * Canal de streaming para el progreso del agente (SSE).
     */
    @AsyncAPIChannel("/stream", { method: 'POST', summary: "Canal de streaming del agente", security: "jwt" })
    public agentChatStream(
        @Body() body: AgentRequest,
        @RequestProp('user') user: AuthenticatedUser
    ): AsyncGenerator<AgentStreamEvent> {
        return this.agentService.chatStream(body.messages, user._id, body.location, body.manual_state, body.model, body.date);
    }
}


