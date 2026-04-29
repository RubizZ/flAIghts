import { Controller, Post, Get, Route, Tags, Body, Query, Security, RequestProp } from "tsoa";
import { injectable, inject } from "tsyringe";
import { ExecutionErrorService } from "./execution-error.service.js";
import type { ReportErrorRequest, PaginatedExecutionErrorsResponse } from "./execution-error.types.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse } from "../../utils/responses.js";

@injectable()
@Route("execution-errors")
@Tags("Execution Errors")
export class ExecutionErrorController extends Controller {
    constructor(
        @inject(ExecutionErrorService) private errorService: ExecutionErrorService
    ) {
        super();
    }

    /**
     * Reportar un error de ejecución desde el frontend.
     */
    @Post("report")
    public async reportError(
        @Body() body: ReportErrorRequest,
        @RequestProp("user") user?: AuthenticatedUser
    ): Promise<SuccessResponse<any>> {
        await this.errorService.reportError(body, user);
        return { status: "success", data: { message: "Error reported successfully" } };
    }

    /**
     * Listar errores de ejecución (Solo Admin).
     */
    @Get()
    @Security("jwt", ["admin", "superadmin"])
    public async getErrors(
        @Query() page: number = 1,
        @Query() limit: number = 20
    ): Promise<SuccessResponse<PaginatedExecutionErrorsResponse>> {
        const result = await this.errorService.getErrors(page, limit);
        return { status: "success", data: result };
    }
}
