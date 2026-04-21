import { Body, Controller, Get, Patch, Path, Post, Query, RequestProp, Response, Route, Security, SuccessResponse, Tags, Request } from "tsoa";
import * as express from 'express';
import type { SearchRequest, SearchResponseData, SearchValidationFailResponse } from "./search.types.js";
import { inject, injectable } from "tsyringe";
import { SearchService } from "./search.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse as SuccessResponseType, FailResponseFromError, PathPath, QueryPath, ValidationDetails, RequestValidationFailResponse } from "../../utils/responses.js";
import { SearchNotFoundError, SearchNotAuthorizedError } from "./search.errors.js";
import { AsyncAPIChannel, AsyncAPIController, AsyncAPIMessage } from "../../utils/asyncapi.decorators.js";
import type { SearchProgressEvent } from "./search.types.js";


@injectable()
@Route("search")
@Tags("Search")
@AsyncAPIController("Search")
export class SearchController extends Controller {


    constructor(
        @inject(SearchService) private readonly searchService: SearchService
    ) {
        super();
    }

    /**
     * Crea una nueva búsqueda de vuelos.
     * Si el usuario está autenticado, la búsqueda se asocia a su cuenta.
     */
    @Post("/")
    @Security('jwt-optional')
    @Response<SearchValidationFailResponse>(422, "Error de validación")
    @SuccessResponse(201, "Búsqueda creada")
    public async searchRequest(
        @Body() body: SearchRequest,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponseType<SearchResponseData>> {
        const request: SearchRequest & { user_id?: string } = { ...body };
        if (user) request.user_id = user._id;
        this.setStatus(201);
        const result = await this.searchService.createSearch(request);
        return result satisfies SearchResponseData as any;
    }

    /**
     * Canal de streaming para el progreso de la búsqueda (SSE).
     */
    @AsyncAPIChannel("/stream", { method: 'POST', summary: "Canal de streaming de búsqueda de vuelos", security: "jwt-optional" })
    public async *searchRequestStream(
        @Body() body: SearchRequest,
        @RequestProp('user') user: AuthenticatedUser | null
    ): AsyncGenerator<SearchProgressEvent> {
        const requestData: SearchRequest & { user_id?: string } = { ...body };
        if (user) requestData.user_id = user._id;

        yield* this.searchService.createSearchStream(requestData);
    }


    /**
     * Obtiene los resultados de una búsqueda por su ID.
     * Si la búsqueda es privada, solo devolverá el resultado a su dueño.
     */
    @Get("/{searchId}")
    @Security('jwt-optional')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Búsqueda privada no autorizada")
    @Response<RequestValidationFailResponse<ValidationDetails<PathPath<{ searchId: string }>>>>(422, "Error de validación")
    public async searchResult(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponseType<SearchResponseData>> {
        const result = await this.searchService.getSearch(searchId, user?._id);
        return result satisfies SearchResponseData as any;
    }

    @Patch("/{searchId}/share")
    @Security('jwt')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Operación no autorizada sobre un recurso ajeno")
    @Response<RequestValidationFailResponse<ValidationDetails<PathPath<{ searchId: string }>>>>(422, "Error de validación")
    @SuccessResponse(200, "Búsqueda compartida")
    public async shareSearch(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponseType<SearchResponseData>> {
        const result = await this.searchService.shareSearch(searchId, user._id);
        return result satisfies SearchResponseData as any;
    }

    @Patch("/{searchId}/privatize")
    @Security('jwt')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Operación no autorizada sobre un recurso ajeno")
    @Response<RequestValidationFailResponse<ValidationDetails<PathPath<{ searchId: string }>>>>(422, "Error de validación")
    @SuccessResponse(200, "Búsqueda privatizada")
    public async privatizeSearch(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponseType<SearchResponseData>> {
        const result = await this.searchService.privatizeSearch(searchId, user._id);
        return result satisfies SearchResponseData as any;
    }

    @Get("/user/{userId}")
    @Security('jwt-optional')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Búsqueda privada no autorizada")
    @Response<RequestValidationFailResponse<ValidationDetails<PathPath<{ userId: string }> | QueryPath<{ page: number, limit: number, origin?: string, destination?: string, status?: string, minPrice?: number, maxPrice?: number, startDate?: string, endDate?: string, sharedOnly?: boolean }>>>>(422, "Error de validación")
    public async getSearches(
        @Path('userId') userId: string,
        @RequestProp('user') user: AuthenticatedUser | null,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('origin') origin?: string,
        @Query('destination') destination?: string,
        @Query('status') status?: string,
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('sharedOnly') sharedOnly?: boolean
    ): Promise<SuccessResponseType<{ items: SearchResponseData[], total: number, page: number, totalPages: number }>> {
        const searches = await this.searchService.getSearches(
            userId,
            user?._id || undefined,
            page,
            limit,
            { origin, destination, status, minPrice, maxPrice, startDate, endDate, sharedOnly }
        );
        return searches satisfies { items: SearchResponseData[], total: number, page: number, totalPages: number } as any;
    }
}

