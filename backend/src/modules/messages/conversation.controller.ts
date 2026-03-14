import { Controller, Get, Path, Post, Query, RequestProp, Response, Route, Security, Tags } from "tsoa";
import { inject, injectable } from "tsyringe";
import { MessageService } from "./message.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { PaginatedMessagesResponse, PaginatedConversationsResponse } from "./message.types.js";
import { NotFriendsError, UserNotFoundError } from "../users/user.errors.js";
import { UserService } from "../users/user.service.js";
import { SocketService } from "../../services/socket.service.js";

@injectable()
@Route("conversations")
@Tags("Conversations")
@Security("jwt")
export class ConversationController extends Controller {

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(UserService) private readonly userService: UserService,
        @inject(SocketService) private readonly socketService: SocketService
    ) {
        super();
    }

    /**
     * Get list of user's latest conversations
     */
    @Get()
    public async getConversations(
        @RequestProp('user') user: AuthenticatedUser,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50
    ): Promise<SuccessResponse<PaginatedConversationsResponse>> {
        const conversations = await this.messageService.getUserConversations(user._id, page, limit);
        // Types conform to the generated Swagger spec and our custom SuccessResponse wrapper
        return conversations as any;
    }

    /**
     * Get messages history with another user
     */
    @Get("{otherUserId}/messages")
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

    /**
     * Mark all messages in conversation as read by user and notify this event to SocketService
     */
    @Post("{otherUserId}/read")
    public async markConversationAsRead(
        @Path('otherUserId') otherUserId: string,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<SuccessResponse<null>> {
        await this.messageService.markConversationAsRead(user._id, otherUserId);
        this.socketService.notifyMessagesRead(user._id, otherUserId);
        return null as any;
    }


}