import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useGetConversations, getGetConversationsQueryKey } from "@/api/generated/conversations/conversations";
import { MessageSquare, Clock, UserPlus } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

export default function Chats() {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const queryClient = useQueryClient();

    const { data: response, isLoading: isConversationsLoading, isError } = useGetConversations({ page: 1, limit: 100 }, {
        query: {
            enabled: isAuthenticated,
        }
    });

    // Real-time updates for conversation list
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const socket = io(import.meta.env.VITE_BACKEND_API_BASE_URL, { withCredentials: true });

        socket.on('receiveMessage', () => {
            // When any message is received (even if it's a new conversation), refresh the list
            // This updates the unread count and the "last message" preview
            queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated, user, queryClient]);

    if (isAuthLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <UserPlus className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-content">No has iniciado sesión</h1>
                <Link to="/login" className="px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 font-bold hover:scale-[1.02]">
                    Iniciar sesión
                </Link>
            </div>
        );
    }

    const conversations = response?.items || [];

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full p-6 sm:p-8 md:pt-24 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold text-content tracking-tight">Chats</h1>
                <p className="text-content-muted text-lg">Tus conversaciones recientes.</p>
            </header>

            <main className="flex flex-col gap-6">
                {isConversationsLoading ? (
                    <div className="flex justify-center p-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand"></div>
                    </div>
                ) : isError ? (
                    <div className="flex justify-center p-10">
                        <p className="text-red-500 font-medium">Error al cargar las conversaciones.</p>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-surface/10 rounded-3xl border border-dashed border-line">
                        <MessageSquare size={48} className="text-content-muted opacity-50 mb-4" />
                        <h3 className="text-xl font-bold text-content">No tienes chats activos</h3>
                        <p className="text-content-muted text-center mt-2 max-w-sm">Busca amigos e inicia una conversación.</p>
                        <Link to="/friends" className="mt-6 px-6 py-2 bg-brand text-content-on-brand rounded-full font-bold hover:bg-brand/90 transition-all shadow-lg hover:scale-105 active:scale-95">
                            Ver mis amigos
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {conversations.map((conv: any) => (
                            <Link
                                to={`/chats/${conv.otherUser._id}`}
                                key={conv.conversationId}
                                className="flex items-center gap-4 p-4 bg-main rounded-2xl border border-line shadow-xs hover:border-brand hover:shadow-md transition-all group"
                            >
                                <div className="shrink-0 relative">
                                    <UserAvatar user={conv.otherUser} size={56} className="transition-transform group-hover:scale-105" />
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-5 w-5 bg-brand text-[10px] items-center justify-center font-bold text-white border border-main">
                                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                            </span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-lg text-content truncate group-hover:text-brand transition-colors">
                                            {conv.otherUser.username}
                                        </h3>
                                        <span className="text-xs text-content-muted flex items-center gap-1 shrink-0 ml-2">
                                            <Clock size={12} />
                                            {new Date(conv.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-content' : 'text-content-muted'}`}>
                                        {conv.lastMessage.content}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
