import {
    useGetUserById,
    useSendFriendRequest,
    useAcceptFriendRequest,
    useCancelFriendRequest,
    useRemoveFriend,
    getGetUserByIdQueryKey,
    getGetSelfUserQueryKey
} from "@/api/generated/openapi/users";
import { useGetSearchesInfinite } from "@/api/generated/openapi/search";
import { useState, UIEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Lock, MessageCircle, UserMinus, Share2, History, Star, Users, Calendar } from "lucide-react";
import { useEffect } from "react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useSendMessage } from "@/api/generated/openapi/conversations";
import SmartPopover from "@/components/ui/SmartPopover";
import type { FriendUser } from "@/api/generated/openapi/model/friendUser";
import SearchCard from "@/components/search/SearchCard";

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [sharingSearchId, setSharingSearchId] = useState<string | null>(null);
    const { isAuthenticated, user: authUser, isLoading: isAuthLoading } = useAuth();

    if (!id) {
        throw new Error("User ID is required");
    }

    const queryClient = useQueryClient();
    const invalidateUser = () => {
        queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
    };

    const { mutate: sendFriendRequest } = useSendFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success("Solicitud de amistad enviada");
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: sendMessage } = useSendMessage({
        mutation: {
            onSuccess: () => {
                toast.success("Vuelo compartido con éxito");
                window.dispatchEvent(new CustomEvent('send_message'));
                window.dispatchEvent(new CustomEvent('share_from_results'));
            },
            onError: () => toast.error("Error al compartir el vuelo")
        }
    });

    const { mutate: acceptFriendRequest } = useAcceptFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success("Solicitud de amistad aceptada");
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: cancelFriendRequest } = useCancelFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success("Solicitud de amistad cancelada");
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: removeFriend } = useRemoveFriend({
        mutation: {
            onSuccess: () => {
                toast.success("Amigo eliminado");
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        }
    });

    const { data: user, isLoading, isError, error } = useGetUserById(id, {
        query: {
            enabled: !!id && isAuthenticated,
        },
    });

    const {
        data: searchesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isSearchesLoading
    } = useGetSearchesInfinite(
        id, 
        { 
            limit: 10,
            sharedOnly: true // Siempre mostramos solo las destacadas en el perfil
        },
        {
            query: {
                enabled: !!id && !!user && (user.type !== "public" || user.public === true),
                refetchOnWindowFocus: false,
            }
        }
    );

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    useEffect(() => {
        if (user && user.type !== "self") {
            window.dispatchEvent(new CustomEvent('view_user_profile'));
        }
    }, [user]);

    if (isAuthLoading || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <Lock className="w-12 h-12 text-red-500" />
                </div>
                <div className="text-center gap-2 flex flex-col items-center">
                    <h1 className="text-3xl font-bold text-content">Inicia sesión para ver perfiles</h1>
                    <p className="text-content-muted max-w-sm">
                        Debes tener una cuenta en <span className="font-bold">flAIghts</span> para ver el perfil de otros viajeros y contactar con ellos.
                    </p>
                </div>
                <Link to="/login" className="px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold">
                    Iniciar sesión
                </Link>
            </div>
        );
    }

    if (isError && error?.code === "NOT_FOUND") {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="text-center gap-2 flex flex-col">
                    <h1 className="text-3xl font-bold text-content">Usuario no encontrado</h1>
                    <p className="text-content-muted max-w-sm">
                        Lo sentimos, el perfil con ID <span className="font-mono font-bold text-red-500">{id}</span> no pudo ser localizado.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer hover:scale-[1.02] text-bold"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    if (isError || user === undefined) return null;

    const lastSeenAt = new Date(user.last_seen_at).getTime();
    const now = new Date().getTime();

    return (
        <div className="flex flex-col lg:flex-row p-4 lg:p-8 gap-6 lg:gap-8 justify-center w-full max-w-6xl mx-auto items-start min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden">
            <div className="flex flex-col gap-6 w-full lg:w-fit">
                <div className="flex flex-col text-center gap-4 bg-main p-6 lg:p-8 rounded-3xl border border-line shadow-sm shrink-0 w-full lg:w-fit lg:sticky lg:top-8">
                    <div className="relative self-center">
                        <UserAvatar user={user} className="w-32 h-32 lg:w-64 lg:h-64 border-4 border-line p-1 bg-main" />
                        {lastSeenAt + 5 * 60 * 1000 >= now ? (
                            <div className="absolute bottom-2 right-2 lg:bottom-6 lg:right-6 w-6 h-6 lg:w-8 lg:h-8 bg-green-500 rounded-full border-4 border-line shadow-sm" title="Online"></div>
                        ) : (
                            <div className="absolute bottom-2 right-2 lg:bottom-6 lg:right-6 w-6 h-6 lg:w-8 lg:h-8 bg-red-500 rounded-full border-4 border-line shadow-sm" title="Offline"></div>
                        )}
                    </div>
                    <div className="flex flex-col gap-3">
                        <h1 className="text-3xl font-black text-content tracking-tight">{user.username}</h1>
                        
                        <div className="flex flex-col gap-2 items-center sm:items-start lg:items-center">
                            {user.type === "friend" && 'friend_since' in user ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/5 border border-brand/10 rounded-xl">
                                    <Users size={12} className="text-brand" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">Amigos desde {new Date(user.friend_since).toLocaleDateString()}</span>
                                </div>
                            ) : user.type === "public" && 'sent_friend_request' in user && user.sent_friend_request ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <Users size={12} className="text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Solicitud enviada</span>
                                </div>
                            ) : user.type === "public" && 'received_friend_request' in user && user.received_friend_request ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-xl">
                                    <Users size={12} className="text-green-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Solicitud recibida</span>
                                </div>
                            ) : null}

                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-line rounded-xl">
                                <Calendar size={12} className="text-content-muted opacity-60" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted opacity-80">En flAIghts desde {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        {user.type === "self" ? (
                            <button onClick={() => navigate("/settings")} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                Editar mi perfil
                            </button>
                        ) : user.type === "friend" ? (
                            <div className="flex flex-col gap-3">
                                <Link to={`/chats/${id}`} className="w-full justify-center flex items-center gap-2 px-8 py-3 bg-brand text-content-on-brand rounded-full transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                    <MessageCircle size={18} />
                                    Mensaje
                                </Link>
                                <button onClick={() => removeFriend({ id })} className="w-full justify-center flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                    <UserMinus size={18} />
                                    Eliminar
                                </button>
                            </div>
                        ) : user.type === "public" && 'received_friend_request' in user && user.received_friend_request ? (
                            <button onClick={() => acceptFriendRequest({ id })} className="w-full px-8 py-3 bg-green-500 text-content-on-brand rounded-full hover:bg-green-600 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                Aceptar solicitud de amistad
                            </button>
                        ) : user.type === "public" && 'sent_friend_request' in user && user.sent_friend_request ? (
                            <button onClick={() => cancelFriendRequest({ id })} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                Cancelar solicitud de amistad
                            </button>
                        ) : (
                            <button onClick={() => sendFriendRequest({ id })} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                Enviar solicitud de amistad
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-main rounded-3xl border border-line shadow-sm p-6 lg:p-8 flex flex-col w-full lg:h-full lg:max-h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Star className="w-6 h-6 text-amber-500" fill="currentColor" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-content tracking-tight">Búsquedas destacadas</h1>
                    </div>
                    
                    {user.type === "self" && (
                        <Link 
                            to="/history" 
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-2xl text-sm font-bold text-content hover:border-brand hover:text-brand transition-all shadow-sm"
                        >
                            <History size={16} />
                            Ver historial completo
                        </Link>
                    )}
                </div>

                {user.type === "public" && !user.public ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-content-muted opacity-70">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-xl font-bold">Cuenta privada</h2>
                        <p className="max-w-xs text-center">Para ver las búsquedas de <span className="font-bold">{user.username}</span> debes ser su amigo.</p>
                    </div>
                ) : (
                    <div
                        className="flex-1 lg:overflow-y-auto lg:pr-4 flex flex-col gap-6 custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        {isSearchesLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                            </div>
                        ) : searchesData?.pages[0]?.items?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center gap-4 border-2 border-dashed border-line rounded-[2.5rem] bg-surface/30">
                                <div className="p-4 bg-surface border border-line rounded-full shadow-sm">
                                    <Star className="w-8 h-8 text-content-muted opacity-20" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-bold text-content">Sin búsquedas destacadas</h3>
                                    <p className="text-sm text-content-muted max-w-[250px]">
                                        Este usuario aún no ha compartido ninguna de sus búsquedas de vuelos.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {searchesData?.pages.map((page, i) => (
                                    <div key={i} className="flex flex-col gap-6">
                                        {page.items.map((search) => (
                                            <SearchCard 
                                                key={search._id} 
                                                search={search} 
                                                isFeatured 
                                            >
                                                {user.type === "self" && (
                                                    <SmartPopover
                                                        isOpen={sharingSearchId === search._id}
                                                        setIsOpen={(open) => setSharingSearchId(open ? search._id : null)}
                                                        preferredAlign="right"
                                                        trigger={
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSharingSearchId(sharingSearchId === search._id ? null : search._id);
                                                                }}
                                                                className="p-3 bg-surface border border-line rounded-full text-content-muted hover:text-brand hover:border-brand transition-all shadow-md cursor-pointer hover:scale-110 active:scale-95"
                                                            >
                                                                <Share2 size={18} />
                                                            </button>
                                                        }
                                                    >
                                                        <div className="p-3 flex flex-col gap-1 min-w-[220px]">
                                                            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-content-muted border-b border-line mb-2 opacity-50">Compartir con amigo</p>
                                                            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                                {'friends' in user && user.friends && (user.friends as any[]).filter((f): f is FriendUser => typeof f !== 'string').map(friend => (
                                                                    <button
                                                                        key={friend._id}
                                                                        onClick={() => {
                                                                            sendMessage({
                                                                                otherUserId: friend._id,
                                                                                data: { content: `SHARE_SEARCH:${search._id}:${search.origins[0]}:${search.destinations[0]}` }
                                                                            });
                                                                            setSharingSearchId(null);
                                                                        }}
                                                                        className="flex items-center gap-3 p-2.5 hover:bg-surface-variant rounded-2xl transition-all text-left w-full cursor-pointer group"
                                                                    >
                                                                        <UserAvatar user={friend} size={32} className="group-hover:ring-2 ring-brand transition-all" />
                                                                        <span className="text-xs font-bold text-content">{friend.username}</span>
                                                                    </button>
                                                                ))}
                                                                {'friends' in user && user.friends && user.friends.length === 0 && (
                                                                    <p className="text-center py-4 text-xs text-content-muted">No tienes amigos añadidos</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </SmartPopover>
                                                )}
                                            </SearchCard>
                                        ))}
                                    </div>
                                ))}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand"></div>
                                    </div>
                                )}

                                {!hasNextPage && (searchesData?.pages[0]?.items?.length ?? 0) > 0 && (
                                    <div className="text-center p-8 text-[10px] text-content-muted/40 uppercase tracking-[0.2em] font-black">
                                        Fin de las búsquedas destacadas
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}