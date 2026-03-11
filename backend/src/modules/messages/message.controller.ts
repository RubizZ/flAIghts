import { Controller, Get, Path, Query, RequestProp, Response, Route, Security, Tags } from "tsoa";
import { inject, injectable } from "tsyringe";
import { MessageService } from "./message.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { PaginatedMessagesResponse } from "./message.types.js";
import { NotFriendsError, UserNotFoundError } from "../users/user.errors.js";
import { UserService } from "../users/user.service.js";

@injectable()
@Route("messages")
@Tags("Messages")
@Security("jwt")
export class MessageController extends Controller {

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(UserService) private readonly userService: UserService
    ) {
        super();
    }

    /**
     * Obtiene el historial de mensajes con otro usuario.
     */
    @Get("/{otherUserId}")
    @Response<FailResponseFromError<NotFriendsError>>(403, "No son amigos")
    @Response<FailResponseFromError<UserNotFoundError>>(404, "Usuario no encontrado")
    public async getMessages(
        @Path('otherUserId') otherUserId: string,
        @RequestProp('user') user: AuthenticatedUser,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50
    ): Promise<SuccessResponse<PaginatedMessagesResponse>> {
        // Security check: ensure users are friends before allowing them to see chat history
        const selfUser = await this.userService.getUser(user._id);
        const isFriend = selfUser.friends.some(f => f.user.toString() === otherUserId);
        if (!isFriend) {
            throw new NotFriendsError();
        }

        const history = await this.messageService.getConversationHistory(user._id, otherUserId, page, limit);
        return this.messageService.formatPaginatedResponse(history) as any;
    }
}