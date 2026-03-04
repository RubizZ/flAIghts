import {
    useGetUserById,
    useSendFriendRequest,
    useAcceptFriendRequest,
    useCancelFriendRequest,
    useRemoveFriend,
    getGetUserByIdQueryKey,
    getGetSelfUserQueryKey
} from "@/api/generated/users/users";
import { getSearches } from "@/api/generated/search/search";
import { UIEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Lock, MessageCircle, UserMinus } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

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
    } = useInfiniteQuery({
        queryKey: ["user-searches", id],
        queryFn: ({ pageParam = 1 }) => getSearches(id, { page: pageParam, limit: 10 }),
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.totalPages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        enabled: !!id && !!user && (user.type !== "public" || user.public === true),
        initialPageParam: 1,
    });

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
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
                    <h1 className="text-3xl font-bold text-primary">Inicia sesión para ver perfiles</h1>
                    <p className="text-secondary max-w-sm">
                        Debes tener una cuenta en <span className="font-bold">flAIghts</span> para ver el perfil de otros viajeros y contactar con ellos.
                    </p>
                </div>
                <Link to="/login" className="px-8 py-3 bg-accent bg-accent-hover text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95 cursor-pointer font-bold">
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
                    <h1 className="text-3xl font-bold text-primary">Usuario no encontrado</h1>
                    <p className="text-secondary max-w-sm">
                        Lo sentimos, el perfil con ID <span className="font-mono font-bold text-red-500">{id}</span> no pudo ser localizado.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-accent text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95"
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
        <div className="flex p-8 gap-8 justify-center w-full max-w-6xl mx-auto items-start h-[calc(100vh-100px)]">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col text-center gap-4 bg-primary p-8 rounded-3xl border border-themed shadow-sm shrink-0 w-fit sticky top-8">
                    <div className="relative self-center">
                        <UserAvatar user={user} size={256} className="border-4 border-themed p-1 bg-primary" />
                        {lastSeenAt + 5 * 60 * 1000 >= now ? (
                            <div className="absolute bottom-6 right-6 w-8 h-8 bg-green-500 rounded-full border-4 border-themed shadow-sm" title="Online"></div>
                        ) : (
                            <div className="absolute bottom-6 right-6 w-8 h-8 bg-red-500 rounded-full border-4 border-themed shadow-sm" title="Offline"></div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-primary">{user.username}</h1>
                        {user.type === "friend" ? (
                            <p className="text-secondary text-sm">Amigo desde {new Date(user.friend_since).toLocaleDateString()}</p>
                        ) : user.type === "public" && user.sent_friend_request ? (
                            <p className="text-secondary text-sm">Solicitud de amistad enviada</p>
                        ) : user.type === "public" && user.received_friend_request ? (
                            <p className="text-secondary text-sm">Solicitud de amistad recibida</p>
                        ) : null}
                        <p className="text-secondary text-sm">Miembro desde {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                {user.type === "self" ? (
                    <button onClick={() => navigate("/settings")} className="px-8 py-3 bg-accent text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95 cursor-pointer">
                        Editar mi perfil
                    </button>
                ) : user.type === "friend" ? (
                    <div className="flex gap-4">
                        <Link to={`/chat/${id}`} onClick={(e) => e.preventDefault()} className="flex-1 justify-center flex items-center gap-2 px-8 py-3 bg-accent text-on-accent rounded-full shadow-xl font-bold hover:cursor-not-allowed opacity-50">
                            <MessageCircle size={18} />
                            Mensaje
                        </Link>
                        <button onClick={() => removeFriend({ id })} className="flex-1 justify-center flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-all shadow-xl active:scale-95 cursor-pointer font-bold">
                            <UserMinus size={18} />
                            Eliminar
                        </button>
                    </div>
                ) : user.type === "public" && user.received_friend_request ? (
                    <button onClick={() => acceptFriendRequest({ id })} className="px-8 py-3 bg-green-500 text-on-accent rounded-full hover:bg-green-600 transition-all shadow-xl active:scale-95 cursor-pointer">
                        Aceptar solicitud de amistad
                    </button>
                ) : user.type === "public" && user.sent_friend_request ? (
                    <button onClick={() => cancelFriendRequest({ id })} className="px-8 py-3 bg-accent text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95 cursor-pointer">
                        Cancelar solicitud de amistad
                    </button>
                ) : (
                    <button onClick={() => sendFriendRequest({ id })} className="px-8 py-3 bg-accent text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95 cursor-pointer">
                        Enviar solicitud de amistad
                    </button>
                )}

            </div>

            <div className="flex-1 bg-primary rounded-3xl border border-themed shadow-sm p-8 flex flex-col h-full max-h-full">
                <h1 className="text-3xl font-bold text-primary mb-6">Últimas búsquedas</h1>

                {user.type === "public" && !user.public ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-secondary opacity-70">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-xl font-bold">Cuenta privada</h2>
                        <p className="max-w-xs text-center">Para ver las búsquedas de <span className="font-bold">{user.username}</span> debes ser su amigo.</p>
                    </div>
                ) : (
                    <div
                        className="flex-1 overflow-y-auto pr-4 flex flex-col gap-4 custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        {isSearchesLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                            </div>
                        ) : searchesData?.pages[0]?.items?.length === 0 ? (
                            <div className="text-center p-8 text-secondary border-2 border-dashed border-themed rounded-2xl">
                                Este usuario aún no tiene búsquedas de vuelos guardadas.
                            </div>
                        ) : (
                            <>
                                {searchesData?.pages.map((page, i) => (
                                    <div key={i} className="flex flex-col gap-4">
                                        {page.items.map((search) => (
                                            <div
                                                key={search._id}
                                                className="p-5 border border-themed rounded-3xl hover:border-accent hover:shadow-md cursor-pointer transition-all bg-secondary flex flex-col gap-3 group"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2 text-lg font-bold">
                                                        <span>{search.origins.join(', ')}</span>
                                                        <span className="text-accent group-hover:px-1 transition-all">→</span>
                                                        <span>{search.destinations.join(', ')}</span>
                                                    </div>
                                                    <div className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full uppercase tracking-wider">
                                                        {search.criteria?.priority || 'Balanced'}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 text-sm text-secondary font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Salida: {new Date(search.departure_date).toLocaleDateString()}</span>
                                                    </div>

                                                    {search.return_date && (
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                            </svg>
                                                            <span>Regreso: {new Date(search.return_date).toLocaleDateString()}</span>
                                                        </div>
                                                    )}

                                                    {search.criteria?.max_price && (
                                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 ml-auto">
                                                            <span>Max {search.criteria.max_price}€</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-accent"></div>
                                    </div>
                                )}

                                {!hasNextPage && (searchesData?.pages[0]?.items?.length ?? 0) > 0 && (
                                    <div className="text-center p-4 text-xs text-secondary/60 uppercase tracking-widest font-bold">
                                        No hay más búsquedas
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}