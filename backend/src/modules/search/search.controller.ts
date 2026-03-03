import { Body, Controller, Get, Patch, Path, Post, Query, RequestProp, Response, Route, Security, SuccessResponse as SuccessResponseDecorator, Tags } from "tsoa";
import type { SearchRequest, SearchResponseData, SearchValidationFailResponse } from "./search.types.js";
import { inject, injectable } from "tsyringe";
import { SearchService } from "./search.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import { SearchNotFoundError, SearchNotAuthorizedError } from "./search.errors.js";

@injectable()
@Route("search")
@Tags("Search")
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
    @SuccessResponseDecorator(201, "Búsqueda creada")
    public async searchRequest(
        @Body() body: SearchRequest,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponse<SearchResponseData>> {
        const request: SearchRequest & { user_id?: string } = { ...body };
        if (user) request.user_id = user.id;
        this.setStatus(201);
        const result = await this.searchService.createSearch(request);
        return result satisfies SearchResponseData as any;
    }

    /**
     * Obtiene los resultados de una búsqueda por su ID.
     * Si la búsqueda es privada, solo devolverá el resultado a su dueño.
     */
    @Get("/{searchId}")
    @Security('jwt-optional')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Búsqueda privada no autorizada")
    public async searchResult(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<SuccessResponse<SearchResponseData>> {
        const result = await this.searchService.getSearch(searchId, user?.id);
        return result satisfies SearchResponseData as any;
    }

    @Patch("/{searchId}/share")
    @Security('jwt')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Operación no autorizada sobre un recurso ajeno")
    @SuccessResponseDecorator(200, "Búsqueda compartida")
    public async shareSearch(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponse<SearchResponseData>> {
        const result = await this.searchService.shareSearch(searchId, user.id);
        return result satisfies SearchResponseData as any;
    }

    @Patch("/{searchId}/privatize")
    @Security('jwt')
    @Response<FailResponseFromError<SearchNotFoundError>>(404, "Búsqueda no encontrada")
    @Response<FailResponseFromError<SearchNotAuthorizedError>>(403, "Operación no autorizada sobre un recurso ajeno")
    @SuccessResponseDecorator(200, "Búsqueda privatizada")
    public async privatizeSearch(
        @Path('searchId') searchId: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponse<SearchResponseData>> {
        const result = await this.searchService.privatizeSearch(searchId, user.id);
        return result satisfies SearchResponseData as any;
    }
}