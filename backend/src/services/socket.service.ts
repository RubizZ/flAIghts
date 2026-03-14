import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { singleton, inject } from 'tsyringe';
import { AuthService } from '../modules/auth/auth.service.js';
import { MessageService } from '../modules/messages/message.service.js';
import type { MessageResponse } from '../modules/messages/message.types.js';

// Types of events and data that Server can send to Client
interface ServerToClientEvents {
    receiveMessage: (message: MessageResponse) => void;
    userStatus: (data: { userId: string, online: boolean }) => void;
    conversationRead: (data: { byUserId: string }) => void;
}

// Types of events and data that Client can send to Server
interface ClientToServerEvents {
    sendMessage: (data: { receiverId: string, content: string }, callback: (ack: { ok: boolean }) => void) => void;
}

interface InterServerEvents { }

// Data to be attached to each Socket
interface SocketData {
    userId: string;
}

@singleton()
export class SocketService {
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;
    private onlineUsers = new Map<string, Set<string>>(); // Map<userId, Set<socketId>> User can have multiple sockets (i.e. many open tabs)

    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(MessageService) private messageService: MessageService
    ) { }

    public initialize(httpServer: HttpServer) {
        // Create new instance of Socket.IO server and link it to the main HTTP server
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            try {
                const decoded = await this.authService.verifyToken(token);
                socket.data.userId = decoded._id; // Save userID in socket to know who is in later events
                next();
            } catch (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (socket) => {
            this.addOnlineUser(socket.data.userId!, socket.id);

            socket.on('sendMessage', async ({ receiverId, content }, callback) => {
                const senderId = socket.data.userId!;

                try {
                    const message = await this.messageService.createMessage(senderId, receiverId, content);
                    const formattedMessage = this.messageService.formatMessageResponse(message);
                    const receiverSocketIds = this.onlineUsers.get(receiverId);
                    receiverSocketIds?.forEach(socketId => this.io?.to(socketId).emit('receiveMessage', formattedMessage));

                    const senderSocketIds = this.onlineUsers.get(senderId);
                    senderSocketIds?.forEach(socketId => this.io?.to(socketId).emit('receiveMessage', formattedMessage));

                    callback({ ok: true });
                } catch (error) {
                    callback({ ok: false });
                }
            });

            socket.on('disconnect', () => {
                this.removeOnlineUser(socket.data.userId!, socket.id);
            });
        });

        console.log('✅ Socket.IO service initialized');
    }

    /**
     * Notify a sender that their messages have been read by the reader
     */
    public notifyMessagesRead(readerId: string, senderId: string) {
        const senderSockets = this.onlineUsers.get(senderId);
        if (senderSockets) {
            senderSockets.forEach(socketId => {
                this.io?.to(socketId).emit('conversationRead', { byUserId: readerId });
            });
        }
    }

    /**
     * Add socketId to user list and notify user status (online) in the first Socket connection
     */
    private addOnlineUser(userId: string, socketId: string) {
        if (!this.onlineUsers.has(userId)) {
            this.onlineUsers.set(userId, new Set());
            this.io?.emit('userStatus', { userId, online: true });
        }
        this.onlineUsers.get(userId)!.add(socketId);
    }

    /**
     * Remove socketId from user map. If it's the last, remove user from map and notify user status (offline)
     */
    private removeOnlineUser(userId: string, socketId: string) {
        const userSockets = this.onlineUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.onlineUsers.delete(userId);
                this.io?.emit('userStatus', { userId, online: false });
            }
        }
    }
}