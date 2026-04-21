import { Body, Controller, Get, Path, Post, Query, RequestProp, Response, Route, Security, Tags } from "tsoa";
import { inject, injectable } from "tsyringe";
import { MessageService } from "./message.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SuccessResponse, FailResponseFromError } from "../../utils/responses.js";
import type { PaginatedMessagesResponse, PaginatedConversationsResponse, MessageResponse, ChatClientMessage, ChatServerMessage } from "./message.types.js";
import { NotFriendsError, UserNotFoundError } from "../users/user.errors.js";
import { UserService } from "../users/user.service.js";
import { AsyncAPIChannel, AsyncAPIController } from "../../utils/asyncapi.decorators.js";
import type { TypedWebSocket } from "../../utils/asyncapi.utils.js";

@injectable()
@AsyncAPIController("Conversations")
@Route("conversations")
@Tags("Conversations")
@Security("jwt")
export class ConversationController extends Controller {

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(UserService) private readonly userService: UserService
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
     * Send a message to a user (for sharing content)
     */
    @Post("{otherUserId}/messages")
    public async sendMessage(
        @Path('otherUserId') otherUserId: string,
        @RequestProp('user') user: AuthenticatedUser,
        @Body() body: { content: string }
    ): Promise<SuccessResponse<MessageResponse>> {
        const message = await this.messageService.createMessage(user._id, otherUserId, body.content);
        const formatted = this.messageService.formatMessageResponse(message);

        // Notify via Sockets for real-time delivery
        this.messageService.emitToUser(otherUserId, { type: 'receiveMessage', message: formatted });
        this.messageService.emitToUser(user._id, { type: 'receiveMessage', message: formatted });

        return formatted as any;
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
        this.messageService.emitToUser(otherUserId, { type: 'conversationRead', byUserId: user._id });
        return null as any;
    }

    /**
     * WebSocket channel for real-time chat
     */
    @AsyncAPIChannel("/stream", { protocol: "ws", security: "jwt" })
    public async chatStream(
        typedWs: TypedWebSocket<ChatClientMessage, ChatServerMessage>,
        @RequestProp('user') user: AuthenticatedUser
    ): Promise<void> {
        this.messageService.addOnlineUser(user._id, typedWs);

        typedWs.onMessage(async (data) => {
            try {
                if (data.type === 'sendMessage') {
                    const message = await this.messageService.createMessage(user._id, data.receiverId, data.content);
                    const formatted = this.messageService.formatMessageResponse(message);

                    const receiveEvent: ChatServerMessage = { type: 'receiveMessage', message: formatted };
                    typedWs.send(JSON.stringify(receiveEvent) as any);
                    this.messageService.emitToUser(data.receiverId, receiveEvent);
                }
                else if (data.type === 'readConversation') {
                    await this.messageService.markConversationAsRead(user._id, data.otherUserId);
                    this.messageService.emitToUser(data.otherUserId, { type: 'conversationRead', byUserId: user._id });
                }
            } catch (err: any) {
                typedWs.send(JSON.stringify({ type: 'error', message: err.message || 'Error processing message' }) as any);
            }
        });

        typedWs.on('close', () => {
            this.messageService.removeOnlineUser(user._id, typedWs);
        });
    }
}