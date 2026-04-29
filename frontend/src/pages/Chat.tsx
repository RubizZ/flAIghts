import { useState, useEffect, useRef, UIEvent, useCallback, ChangeEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, CheckCheck, Plane, X, History, Calendar, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetUserById } from "@/api/generated/openapi/users";
import UserAvatar from "@/components/ui/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { getMessages, useMarkConversationAsRead, getGetConversationsQueryKey } from "@/api/generated/openapi/conversations";
import { useGetSearches, useShareSearch } from "@/api/generated/openapi/search";
import { useConversationsStreamWS } from "@/api/generated/asyncapi/hooks";
import type { MessageResponse, PaginatedMessagesResponse } from "@/api/generated/openapi/model";
import type { ChatServerMessage } from "@/api/generated/asyncapi/models";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import SharedSearchCard from "@/components/chat/SharedSearchCard";

export default function Chat() {
    const { t } = useTranslation();
    const { userId } = useParams<{ userId: string }>();
    const { user: selfUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState("");
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Cargar búsquedas del usuario actual para el modal de compartir
    const { data: userSearches, isLoading: isLoadingSearches } = useGetSearches(selfUser?._id || '', undefined, {
        query: { enabled: isShareModalOpen && !!selfUser?._id }
    });

    const { data: otherUser, isLoading: isLoadingUser } = useGetUserById(userId!, {
        query: { enabled: !!userId },
    });

    const { mutate: markConversationAsRead } = useMarkConversationAsRead({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                queryClient.invalidateQueries({ queryKey: ['messages', userId] });

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

    // Group messages by day to make sticky work propperly
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
            window.dispatchEvent(new CustomEvent('flaights:mission:open-chat'));
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

    const { connect, disconnect, send, status: wsStatus } = useConversationsStreamWS(useCallback((data: ChatServerMessage) => {
        if (data.type === 'receiveMessage') {
            const incomingMessage = data.message;
            const conversationUserIds = [selfUser?._id, userId];
            if (conversationUserIds.includes(incomingMessage.sender) && conversationUserIds.includes(incomingMessage.receiver)) {
                queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(['messages', userId], (oldData) => {
                    if (!oldData || oldData.pages.length === 0) {
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

                    const newPages = [...oldData.pages];
                    const firstPage = newPages[0];

                    if (firstPage) {
                        newPages[0] = {
                            ...firstPage,
                            items: [...firstPage.items, incomingMessage],
                        };
                    }

                    // Si el mensaje es para mí, lo marcamos como leído en el servidor
                    if (incomingMessage.receiver === selfUser?._id) {
                        markConversationAsRead({ otherUserId: userId! });
                    }

                    return { ...oldData, pages: newPages };
                });
            }
        }
        else if (data.type === 'userStatus') {
            if (data.userId === userId) {
                setIsOnline(data.online);
            }
        }
        else if (data.type === 'conversationRead') {
            if (data.byUserId === userId && selfUser) {
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
        }
    }, [selfUser?._id, userId, queryClient]));

    useEffect(() => {
        if (isAuthenticated && userId) {
            connect();
            return () => disconnect();
        }
    }, [isAuthenticated, selfUser, userId, connect, disconnect]);

    // Helper to format date separators (Today, Yesterday, DD/MM/YYYY)
    const formatDateSeparator = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return t("chat.today");
        if (date.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
        return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Helper para formatear "Visto por última vez"
    const formatLastSeen = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (date.toDateString() === now.toDateString()) return t("chat.lastSeenToday", { time });
        if (date.toDateString() === yesterday.toDateString()) return t("chat.lastSeenYesterday", { time });
        return t("chat.lastSeenDate", { date: date.toLocaleDateString(), time });
    };

    const { mutateAsync: shareSearch } = useShareSearch();


    const handleShareSearch = async (search: any) => {
        // Si la búsqueda es privada, la hacemos pública primero
        if (!search.shared) {
            try {
                await shareSearch({ searchId: search._id });
                // Actualizamos localmente para evitar re-llamadas si el usuario vuelve a compartir rápido
                search.shared = true;
            } catch (err) {
                toast.error(t("share.prepareShareError"));
                return;
            }
        }

        // Formato: SHARE_SEARCH:id
        send({
            type: 'sendMessage',
            receiverId: userId!,
            content: `SHARE_SEARCH:${search._id}`,
        });
        window.dispatchEvent(new CustomEvent('flaights:mission:send-message'));
        window.dispatchEvent(new CustomEvent('flaights:mission:share-from-chat'));
        setIsShareModalOpen(false);
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newMessage.trim() === "" || !userId) return;

        send({
            type: 'sendMessage',
            receiverId: userId,
            content: newMessage.trim(),
        });
        window.dispatchEvent(new CustomEvent('flaights:mission:send-message'));

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
                <h2 className="text-xl font-bold text-red-500">{t("chat.error")}</h2>
                <p className="text-content-muted mt-2">{t("chat.loadError")}</p>
                <Link to="/chats" className="mt-4 px-4 py-2 bg-brand text-content-on-brand rounded-full font-bold">
                    {t("chat.backToChats")}
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full w-full px-2 py-4 sm:px-6 sm:py-6 flex justify-center overflow-hidden">
        <Helmet>
            <title>
                {otherUser
                    ? t("seo.chat.titleWithUser", { username: otherUser.username })
                    : t("seo.chat.title")}
            </title>
            <meta name="description" content={t("seo.chat.description")} />
        </Helmet>
        <div className="flex flex-col w-full h-full max-w-4xl bg-main rounded-3xl border border-line shadow-lg overflow-hidden animate-in fade-in duration-300">

            <header className="flex items-center gap-4 p-4 border-b border-line shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-surface transition-colors cursor-pointer"
                >
                    <ArrowLeft size={24} />
                </button>
                <Link to={`/user/${otherUser._id}`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
                    <UserAvatar user={otherUser} size={40} />
                </Link>
                <div className="flex flex-col gap-1">
                    <Link to={`/user/${otherUser._id}`} className="hover:text-brand transition-colors">
                        <h1 className="text-lg font-bold text-content leading-none">{otherUser.username}</h1>
                    </Link>
                    <span className="text-xs font-medium text-content-muted animate-in fade-in">
                        {isOnline ? (
                            <span className="text-brand font-bold">{t("chat.online")}</span>
                        ) : (
                            t("chat.lastSeen", { time: formatLastSeen(otherUser.last_seen_at) })
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
                                    const isSharedSearch = msg.content.startsWith("SHARE_SEARCH:");

                                    const renderContent = () => {
                                        if (isSharedSearch) {
                                            return <SharedSearchCard content={msg.content} isSelf={isSelf} />;
                                        }
                                        return <p className="text-sm wrap-break-word whitespace-pre-wrap">{msg.content}</p>;
                                    };

                                    return (
                                        <div key={msg._id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                            {!isSelf && (
                                                <Link to={`/user/${otherUser._id}`} className="self-end hover:scale-110 transition-transform active:scale-95">
                                                    <UserAvatar user={otherUser} size={32} />
                                                </Link>
                                            )}
                                            <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm ${isSelf ? 'bg-brand text-content-on-brand rounded-br-none' : 'bg-surface text-content rounded-bl-none'}`}>
                                                {renderContent()}
                                                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                    <span className={`text-xs ${isSelf ? 'text-white/70' : 'text-content-muted'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isSelf && (
                                                        <CheckCheck size={14} className={msg.read ? "text-blue-300" : "text-white/50"} />
                                                    )}
                                                </div>
                                            </div>
                                            {isSelf && (
                                                <Link to={`/user/${selfUser?._id}`} className="self-end hover:scale-110 transition-transform active:scale-95">
                                                    <UserAvatar user={selfUser} size={32} />
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </>
                )
                }
            </div>

            <div className="p-4 border-t border-line bg-main shrink-0 relative">
                {/* Desplegable de compartir búsquedas */}
                {isShareModalOpen && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-main border border-line rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50 max-h-80 flex flex-col">
                        <div className="p-3 border-b border-line bg-surface/50 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-content-muted flex items-center gap-2">
                                <History size={14} /> {t("chat.recentSearches")}
                            </h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-content-muted hover:text-content cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 flex flex-col gap-2 custom-scrollbar">
                            {isLoadingSearches ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand" /></div>
                            ) : userSearches?.items.length === 0 ? (
                                <div className="p-8 text-center text-xs text-content-muted">{t("chat.noSearchesToShare")}</div>
                            ) : (
                                userSearches?.items.map((search: any) => (
                                    <button
                                        key={search._id}
                                        onClick={() => handleShareSearch(search)}
                                        className="flex flex-col gap-1 p-3 rounded-xl hover:bg-surface border border-transparent hover:border-line transition-all text-left group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-sm text-content flex items-center gap-2">
                                                {search.origins[0]} <Plane size={12} className="text-brand rotate-45" /> {search.destinations[0]}
                                            </div>
                                            <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold uppercase">
                                                {search.criteria.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-content-muted">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(search.departure_date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><MapPin size={10} /> {t("chat.cities", { count: search.origins.length + search.destinations.length })}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-start gap-4">
                    <button
                        type="button"
                        onClick={() => setIsShareModalOpen(!isShareModalOpen)}
                        className={`p-3 rounded-full transition-all shadow-sm border border-line cursor-pointer ${isShareModalOpen ? 'bg-brand text-white' : 'bg-surface text-content-muted hover:text-brand'}`}
                        title={t("share.shareFlightSearch")}
                    >
                        <Plane size={20} className={isShareModalOpen ? '' : 'rotate-45'} />
                    </button>
                    <TextareaAutosize
                        id="chat-textarea"
                        value={newMessage}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("chat.messagePlaceholder")}
                        className="flex-1 bg-surface placeholder-content-muted outline-none px-4 py-1.5 rounded-xl font-medium border border-line focus:border-brand shadow-sm resize-none custom-scrollbar max-h-32 transition-all duration-200"
                        autoComplete="off"
                        maxRows={5}
                        minRows={1}
                    />
                    <button
                        type="submit"
                        disabled={newMessage.trim() === "" || wsStatus !== 'open'}
                        title={wsStatus !== 'open' ? t('chat.connecting') : t('chat.sendMessage')}
                        className="p-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95 disabled:bg-brand/50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer"
                        aria-label={t('chat.sendMessage')}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    </div>
    );

}
