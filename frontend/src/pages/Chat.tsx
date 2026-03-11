import { useState, useEffect, useRef, UIEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useGetUserById } from "@/api/generated/users/users";
import UserAvatar from "@/components/ui/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { io, Socket } from "socket.io-client";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { getMessages } from "@/api/generated/messages/messages";
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

    const { data: otherUser, isLoading: isLoadingUser } = useGetUserById(userId!, {
        query: { enabled: !!userId },
    });

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

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, selfUser, userId, queryClient]);

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
                <Link to="/friends" className="mt-4 px-4 py-2 bg-brand text-content-on-brand rounded-full font-bold">
                    Volver a Amigos
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto w-full bg-main rounded-t-3xl border-x border-t border-line shadow-lg overflow-hidden animate-in fade-in duration-300">
            <header className="flex items-center gap-4 p-4 border-b border-line shrink-0">
                <Link to="/friends" className="p-2 rounded-full hover:bg-surface transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <UserAvatar user={otherUser} size={40} />
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-content">{otherUser.username}</h1>
                </div>
            </header>

            <div ref={messageContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {isLoadingHistory ? (
                    <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
                ) : (
                    <>
                        {isFetchingNextPage && <div className="flex justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>}
                        {messages.map((msg) => {
                            const isSelf = msg.sender === selfUser?._id;
                            return (
                                <div key={msg._id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                    {!isSelf && <UserAvatar user={otherUser} size={32} className="self-end" />}
                                    <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm ${isSelf ? 'bg-brand text-content-on-brand rounded-br-none' : 'bg-surface text-content rounded-bl-none'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <p className={`text-xs mt-1 ${isSelf ? 'text-white/70' : 'text-content-muted'} text-right`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {isSelf && <UserAvatar user={selfUser} size={32} className="self-end" />}
                                </div>
                            );
                        })}
                    </>
                )}
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
    );
}
