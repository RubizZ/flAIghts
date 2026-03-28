import { Body, Controller, Post, Get, RequestProp, Response, Route, Security, Tags, Request } from "tsoa";
import * as express from 'express';
import { inject, injectable } from "tsyringe";
import { AgentService } from "./agent.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse as SuccessResponseType } from "../../utils/responses.js";
import type { AgentRequest, AgentResponse, AgentValidationFailResponse } from "./agent.types.js";
import { AgentUnavailableError } from "./agent.errors.js";
import type { FailResponseFromError } from "../../utils/responses.js";

@injectable()
@Route("agent")
@Tags("Agent")
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
    @Post("/stream")
    @Security("jwt")
    public async agentChatStream(
        @Body() body: AgentRequest,
        @RequestProp('user') user: AuthenticatedUser,
        @Request() request: express.Request
    ): Promise<void> {
        const { messages, location, manual_state, model, date } = body;
        const res = request.res!;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
            for await (const event of this.agentService.chatStream(messages, user._id, location, manual_state, model, date)) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
                if ((res as any).flush) {
                    (res as any).flush();
                }
            }
        } catch (error: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            if ((res as any).flush) {
                (res as any).flush();
            }
        } finally {
            res.end();
        }
    }
}
