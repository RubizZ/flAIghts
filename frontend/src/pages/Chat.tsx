import { useState, useEffect, useRef, UIEvent, Fragment } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, CheckCheck } from "lucide-react";
import { useGetUserById } from "@/api/generated/users/users";
import UserAvatar from "@/components/ui/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { io, Socket } from "socket.io-client";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { getMessages, useMarkConversationAsRead, getGetConversationsQueryKey } from "@/api/generated/conversations/conversations";
import type { MessageResponse, PaginatedMessagesResponse } from "@/api/generated/model";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

export default function Chat() {
    const { userId } = useParams<{ userId: string }>();
    const { user: selfUser, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState("");
    const socketRef = useRef<Socket | null>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [isOnline, setIsOnline] = useState(false);

    const { data: otherUser, isLoading: isLoadingUser } = useGetUserById(userId!, {
        query: { enabled: !!userId },
    });

    const { mutate: markConversationAsRead } = useMarkConversationAsRead({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });

                queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(['messages', userId], (oldData) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            items: page.items.map(msg => ({ ...msg, read: true }))
                        }))
                    };
                });
            }
        }
    })

    const {
        data: history,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingHistory,
        isError: isHistoryError,
    } = useInfiniteQuery({
        queryKey: ['messages', userId],
        queryFn: ({ pageParam = 1 }) => getMessages(userId!, { page: pageParam, limit: 30 }),
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.totalPages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        enabled: !!userId && isAuthenticated,
        initialPageParam: 1,
    });

    const messages = history?.pages.slice().reverse().flatMap(page => page.items) ?? [];
    const lastMessageId = messages.length > 0 ? messages[messages.length - 1]!._id : null; // Get ID of the last message to control scrolling.

    // Agrupamos los mensajes por día para que el efecto "sticky" funcione correctamente (WhatsApp style)
    const groupedMessages = messages.reduce((acc, msg) => {
        const dateKey = new Date(msg.created_at).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(msg);
        return acc;
    }, {} as Record<string, MessageResponse[]>);

    // Initialize the online status based on the last seen time (5 min margin) when otherUser changes
    useEffect(() => {
        if (otherUser) {
            const lastSeenTime = new Date(otherUser.last_seen_at).getTime();
            const now = new Date().getTime();
            setIsOnline(lastSeenTime + 5 * 60 * 1000 >= now);
        }
    }, [otherUser]);

    // Mark messages as read when entering into chat
    useEffect(() => {
        if (userId) {
            markConversationAsRead({ otherUserId: userId });
        }
    }, [userId, markConversationAsRead]);

    // Scroll to bottom when new message is added
    useEffect(() => {
        if (messageContainerRef.current) {
            setTimeout(() => {
                if (messageContainerRef.current) {
                    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [lastMessageId, isLoadingHistory]);

    useEffect(() => {
        if (!isAuthenticated || !selfUser || !userId) return;

        const socket = io(import.meta.env.VITE_BACKEND_API_BASE_URL, { withCredentials: true });
        socketRef.current = socket;

        socket.on('receiveMessage', (incomingMessage: MessageResponse) => {
            const conversationUserIds = [selfUser._id, userId];
            if (conversationUserIds.includes(incomingMessage.sender) && conversationUserIds.includes(incomingMessage.receiver)) {
                queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(['messages', userId], (oldData) => {
                    if (!oldData || oldData.pages.length === 0) {
                        // Si no hay datos (chat nuevo), se crea la estructura inicial.
                        return {
                            pages: [{
                                items: [incomingMessage],
                                page: 1,
                                total: 1,
                                totalPages: 1,
                            }],
                            pageParams: [1],
                        };
                    }

                    // Si ya hay datos, se actualiza la primera página (la más reciente).
                    const newPages = [...oldData.pages];
                    const firstPage = newPages[0]; // Es de tipo `PaginatedMessagesResponse | undefined`

                    if (firstPage) {
                        newPages[0] = {
                            ...firstPage,
                            items: [...firstPage.items, incomingMessage],
                        };
                    }
                    return { ...oldData, pages: newPages };
                });
            }
        });

        socket.on('userStatus', (data: { userId: string, online: boolean }) => {
            if (data.userId === userId) {
                setIsOnline(data.online);
            }
        });

        // Listen for when the other user reads MY messages
        socket.on('conversationRead', (data: { byUserId: string }) => {
            if (data.byUserId === userId) {
                queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(['messages', userId], (oldData) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            items: page.items.map(msg => msg.sender === selfUser._id ? { ...msg, read: true } : msg)
                        }))
                    };
                });
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, selfUser, userId, queryClient]);

    // Helper to format date separators (Today, Yesterday, DD/MM/YYYY)
    const formatDateSeparator = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return "Hoy";
        if (date.toDateString() === yesterday.toDateString()) return "Ayer";
        return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Helper para formatear "Visto por última vez"
    const formatLastSeen = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (date.toDateString() === now.toDateString()) return `hoy a las ${time}`;
        if (date.toDateString() === yesterday.toDateString()) return `ayer a las ${time}`;
        return `${date.toLocaleDateString()} a las ${time}`;
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newMessage.trim() === "" || !socketRef.current || !userId) return;

        socketRef.current.emit('sendMessage', {
            receiverId: userId,
            content: newMessage.trim(),
        }, (ack: { ok: boolean }) => {
            if (!ack.ok) toast.error("Error al enviar el mensaje");
        });

        setNewMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    if (isLoadingUser) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (!otherUser || isHistoryError) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center p-8">
                <h2 className="text-xl font-bold text-red-500">Error</h2>
                <p className="text-content-muted mt-2">No se pudo cargar el chat.</p>
                <Link to="/chats" className="mt-4 px-4 py-2 bg-brand text-content-on-brand rounded-full font-bold">
                    Volver a Chats
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full w-full px-2 py-4 sm:px-6 sm:py-6 sm:pt-20 flex justify-center">
            <div className="flex flex-col w-full h-[calc(100vh-5.5rem)] sm:h-full max-w-4xl bg-main rounded-3xl border border-line shadow-lg overflow-hidden animate-in fade-in duration-300">

                <header className="flex items-center gap-4 p-4 border-b border-line shrink-0">
                    <Link to="/chats" className="p-2 rounded-full hover:bg-surface transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <UserAvatar user={otherUser} size={40} />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-lg font-bold text-content leading-none">{otherUser.username}</h1>
                        <span className="text-xs font-medium text-content-muted animate-in fade-in">
                            {isOnline ? (
                                <span className="text-brand font-bold">En línea</span>
                            ) : (
                                `Últ. vez ${formatLastSeen(otherUser.last_seen_at)}`
                            )}
                        </span>
                    </div>
                </header>

                <div ref={messageContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4 custom-scrollbar">
                    {isLoadingHistory ? (
                        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
                    ) : (
                        <>
                            {isFetchingNextPage && <div className="flex justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>}
                            {Object.entries(groupedMessages).map(([dateKey, dayMessages], groupIndex) => (
                                <div key={dateKey} className={`flex flex-col gap-4 ${groupIndex === 0 ? 'mt-auto' : ''}`}>
                                    <div className="flex justify-center my-4 sticky top-0 z-10">
                                        <span className="bg-surface/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold text-content-muted shadow-sm border border-line uppercase tracking-widest">
                                            {dayMessages[0] && formatDateSeparator(dayMessages[0].created_at)}
                                        </span>
                                    </div>
                                    {dayMessages.map((msg) => {
                                        const isSelf = msg.sender === selfUser?._id;
                                        return (
                                            <div key={msg._id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                                {!isSelf && <UserAvatar user={otherUser} size={32} className="self-end" />}
                                                <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm ${isSelf ? 'bg-brand text-content-on-brand rounded-br-none' : 'bg-surface text-content rounded-bl-none'}`}>
                                                    <p className="text-sm">{msg.content}</p>
                                                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                        <span className={`text-xs ${isSelf ? 'text-white/70' : 'text-content-muted'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isSelf && (
                                                            <CheckCheck size={14} className={msg.read ? "text-blue-300" : "text-white/50"} />
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelf && <UserAvatar user={selfUser} size={32} className="self-end" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    )
                    }
                </div>

                <div className="p-4 border-t border-line bg-main shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-start gap-4">
                        <TextareaAutosize
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-surface placeholder-content-muted outline-none px-4 pt-3 pb-3.5 rounded-xl font-medium border border-line focus:border-brand shadow-sm resize-none custom-scrollbar"
                            autoComplete="off"
                            maxRows={4}
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={newMessage.trim() === ""}
                            className="p-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95 disabled:bg-brand/50 disabled:cursor-not-allowed disabled:scale-100"
                            aria-label="Enviar mensaje"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

}
