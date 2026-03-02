import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import {
    useAcceptFriendRequest,
    useRejectFriendRequest,
    useCancelFriendRequest,
    useRemoveFriend,
    getGetUserQueryKey
} from "@/api/generated/users/users";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserMinus, Check, X, Clock, Users, UserPlus, MessageCircle, UserSearch } from "lucide-react";
import { useState } from "react";

export default function Friends() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

    const invalidateUser = () => {
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey() });
    };

    const { mutate: acceptRequest } = useAcceptFriendRequest({
        mutation: {
            onSuccess: () => { toast.success("Solicitud aceptada"); invalidateUser(); },
            onError: (error: any) => toast.error(error.message)
        }
    });

    const { mutate: rejectRequest } = useRejectFriendRequest({
        mutation: {
            onSuccess: () => { toast.success("Solicitud rechazada"); invalidateUser(); },
            onError: (error: any) => toast.error(error.message)
        }
    });

    const { mutate: cancelRequest } = useCancelFriendRequest({
        mutation: {
            onSuccess: () => { toast.success("Solicitud cancelada"); invalidateUser(); },
            onError: (error: any) => toast.error(error.message)
        }
    });

    const { mutate: removeFriend } = useRemoveFriend({
        mutation: {
            onSuccess: () => { toast.success("Amigo eliminado"); invalidateUser(); },
            onError: (error: any) => toast.error(error.message)
        }
    });

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <UserPlus className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-primary">No has iniciado sesión</h1>
                <Link to="/login" className="px-8 py-3 bg-accent bg-accent-hover text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95">
                    Iniciar sesión
                </Link>
            </div>
        );
    }

    // Assuming user's arrays have populated objects with at least _id and username
    const friends = user?.friends || [];
    const received = user?.received_friend_requests || [];
    const sent = user?.sent_friend_requests || [];

    const totalRequests = received.length + sent.length;

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full p-6 sm:p-8 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold text-primary tracking-tight">Amigos</h1>
                <p className="text-secondary text-lg">Gestiona a las personas con las que compartes tus viajes.</p>
            </header>

            <div className="flex gap-4 border-b border-themed">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`flex items-center gap-2 pb-4 text-lg font-medium transition-all relative cursor-pointer ${activeTab === 'friends' ? 'text-accent' : 'text-secondary hover:text-primary'}`}
                >
                    <Users size={20} />
                    <span>Mis Amigos</span>
                    <span className="bg-secondary/10 px-2 py-0.5 rounded-full text-xs font-bold text-primary ml-1">{friends.length}</span>
                    {activeTab === 'friends' && (
                        <span className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full transition-all" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex items-center gap-2 pb-4 text-lg font-medium transition-all relative cursor-pointer ${activeTab === 'requests' ? 'text-accent' : 'text-secondary hover:text-primary'}`}
                >
                    <UserPlus size={20} />
                    <span>Solicitudes</span>
                    {totalRequests > 0 && (
                        <span className="bg-accent text-white px-2 py-0.5 rounded-full text-xs font-bold ml-1">{totalRequests}</span>
                    )}
                    {activeTab === 'requests' && (
                        <span className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full transition-all" />
                    )}
                </button>

                <Link
                    to="/user/search"
                    className="ml-auto mb-4 flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                    <UserSearch size={18} />
                    <span>Añadir amigo</span>
                </Link>
            </div>

            <main className="flex flex-col gap-6">
                {activeTab === 'friends' && (
                    <section className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-themed">
                                <Users size={48} className="text-secondary opacity-50 mb-4" />
                                <h3 className="text-xl font-bold text-primary">Aún no tienes amigos</h3>
                                <p className="text-secondary text-center mt-2 max-w-sm">Busca a otros viajeros conectando con ellos y agregándolos a tu lista para planear viajes juntos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {friends.map((friend: any) => (
                                    <div key={friend._id} className="flex flex-col p-5 bg-primary rounded-3xl border border-themed shadow-xs hover:border-accent hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <Link to={`/user/${friend._id}`} className="shrink-0 relative">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend._id}`} alt={friend.username} className="w-16 h-16 rounded-full bg-secondary border border-themed transition-transform group-hover:scale-105" />
                                            </Link>
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <Link to={`/user/${friend._id}`} className="font-bold text-lg text-primary truncate hover:text-accent transition-colors">
                                                    {friend.username}
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-themed flex justify-end gap-2">
                                            <Link
                                                to={`/chat/${friend._id}`}
                                                onClick={(e) => e.preventDefault()}
                                                className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent rounded-full text-sm font-bold opacity-50 hover:cursor-not-allowed"
                                                title="Enviar mensaje"
                                            >
                                                <MessageCircle size={16} />
                                                Mensaje
                                            </Link>
                                            <button
                                                onClick={() => removeFriend({ id: friend._id })}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-sm font-bold transition-colors cursor-pointer"
                                                title="Eliminar amigo"
                                            >
                                                <UserMinus size={16} />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'requests' && (
                    <section className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-10">

                        {/* Recibidas */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                                Solicitudes Recibidas
                                <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-bold">{received.length}</span>
                            </h2>
                            {received.length === 0 ? (
                                <div className="p-8 text-center text-secondary bg-secondary/5 rounded-2xl border border-dashed border-themed">
                                    No tienes solicitudes de amistad pendientes.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {received.map((req: any) => (
                                        <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary rounded-2xl border border-themed shadow-sm gap-4">
                                            <div className="flex items-center gap-4">
                                                <Link to={`/user/${req._id}`}>
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req._id}`} alt={req.username} className="w-12 h-12 rounded-full bg-secondary border border-themed" />
                                                </Link>
                                                <Link to={`/user/${req._id}`} className="font-bold text-primary text-lg hover:text-accent transition-colors">
                                                    {req.username}
                                                </Link>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                <button
                                                    onClick={() => acceptRequest({ id: req._id })}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-sm active:scale-95 cursor-pointer"
                                                >
                                                    <Check size={18} /> Aceptar
                                                </button>
                                                <button
                                                    onClick={() => rejectRequest({ id: req._id })}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors active:scale-95 cursor-pointer"
                                                >
                                                    <X size={18} /> Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Enviadas */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                                Solicitudes Enviadas
                                <span className="bg-secondary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{sent.length}</span>
                            </h2>
                            {sent.length === 0 ? (
                                <div className="p-8 text-center text-secondary bg-secondary/5 rounded-2xl border border-dashed border-themed">
                                    No has enviado solicitudes de amistad.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {sent.map((req: any) => (
                                        <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary rounded-2xl border border-themed border-opacity-50 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-4">
                                                <Link to={`/user/${req._id}`}>
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req._id}`} alt={req.username} className="w-10 h-10 rounded-full bg-secondary border border-themed grayscale opacity-70" />
                                                </Link>
                                                <div className="flex flex-col">
                                                    <Link to={`/user/${req._id}`} className="font-bold text-primary hover:text-accent transition-colors">
                                                        {req.username}
                                                    </Link>
                                                    <span className="text-xs text-secondary flex items-center gap-1">
                                                        <Clock size={12} /> Esperando respuesta...
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => cancelRequest({ id: req._id })}
                                                className="w-full sm:w-auto px-4 py-2 bg-secondary/20 hover:bg-red-100 hover:text-red-600 text-secondary rounded-xl font-bold transition-colors text-sm cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </section>
                )}
            </main>
        </div>
    );
}
