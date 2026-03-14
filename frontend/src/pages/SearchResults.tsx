import { useParams, Link } from "react-router-dom";
import { useSearchResult } from "@/api/generated/search/search";
import { Loader2, Plane, Share2 } from "lucide-react";
import type { ItineraryResponse, FriendUser } from "@/api/generated/model";
import { useAuth } from "@/context/AuthContext";
import { useSendMessage } from "@/api/generated/conversations/conversations";
import SmartPopover from "@/components/ui/SmartPopover";
import UserAvatar from "@/components/ui/UserAvatar";
import { useState } from "react";
import { toast } from "sonner";

export default function SearchResults() {
    const { id } = useParams<{ id: string }>();
    const { user, isAuthenticated } = useAuth();
    const [isSharing, setIsSharing] = useState(false);

    // Fetch search results with polling enabled while status is 'searching'
    const { data, isLoading, error } = useSearchResult(
        id!,
        {
            query: {
                enabled: !!id,
                refetchInterval: (query) => {
                    const status = query.state.data?.status;
                    return status === 'searching' ? 1000 : false;
                }
            }
        }
    );

    const { mutate: sendMessage } = useSendMessage({
        mutation: {
            onSuccess: () => { toast.success("Vuelo compartido"); setIsSharing(false); },
            onError: () => toast.error("Error al compartir")
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                <p className="text-lg font-medium text-content">Cargando resultados...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-red-500">
                <p className="text-lg font-medium">Error al cargar la búsqueda</p>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

    const searchData = data;

    if (!searchData) return null;

    const renderItineraries = (title: string, itineraries?: ItineraryResponse[]) => {
        if (!itineraries || itineraries.length === 0) return null;

        const formatTime = (dateString?: string) => {
            if (!dateString) return "--:--";
            const date = new Date(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-content">{title}</h2>
                {itineraries.map((itinerary, index) => (
                    <div key={index} className="border border-line rounded-lg p-5 bg-main text-content shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-4">
                                {itinerary.legs.map((leg, legIndex) => (
                                    <div key={legIndex} className="flex flex-col gap-2">
                                        {/* Cabecera del vuelo: Aerolínea */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {leg.airline_logo && (
                                                <img src={leg.airline_logo} alt={leg.airline} className="w-6 h-6 object-contain" />
                                            )}
                                            <span className="text-sm font-semibold text-content-muted">{leg.airline}</span>
                                        </div>

                                        {/* Detalles del vuelo: Hora Origen -> Hora Destino */}
                                        <div className="flex items-center gap-6">
                                            <div className="text-center min-w-[60px]">
                                                <div className="text-xl font-bold text-content">{formatTime(leg.departure_time)}</div>
                                                <div className="text-xs text-content-muted font-mono">{leg.origin}</div>
                                            </div>

                                            <div className="flex flex-col items-center flex-1 px-4">
                                                <span className="text-xs text-content-muted mb-1">{Math.floor(leg.duration / 60)}h {leg.duration % 60}m</span>
                                                <div className="w-full h-[2px] bg-line relative flex items-center justify-center">
                                                    <Plane className="w-4 h-4 text-content-muted rotate-90 absolute bg-main px-0.5" />
                                                </div>
                                            </div>

                                            <div className="text-center min-w-[60px]">
                                                <div className="text-xl font-bold text-content">{formatTime(leg.arrival_time)}</div>
                                                <div className="text-xs text-content-muted font-mono">{leg.destination}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="ml-6 flex flex-col items-end justify-center h-full border-l border-line pl-6">
                                <span className="text-2xl font-bold text-brand">{itinerary.total_price} €</span>
                                <span className="text-xs text-content-muted">Precio total</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 text-content">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Resultados de búsqueda</h1>

                {isAuthenticated && user && data && (
                    <SmartPopover
                        isOpen={isSharing}
                        setIsOpen={setIsSharing}
                        preferredAlign="right"
                        trigger={
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsSharing(!isSharing);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                            >
                                <Share2 size={18} />
                                <span>Compartir</span>
                            </button>
                        }
                    >
                        <div className="p-2 flex flex-col gap-1 min-w-[220px]">
                            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-content-muted border-b border-line mb-1">Compartir con amigo</p>
                            {user.friends.filter((f): f is FriendUser => typeof f !== 'string').map(friend => (
                                <button
                                    key={friend._id}
                                    onClick={() => sendMessage({
                                        otherUserId: friend._id,
                                        data: { content: `SHARE_SEARCH:${id}:${data.origins[0]}:${data.destinations[0]}` }
                                    })}
                                    className="flex items-center gap-2 p-2 hover:bg-surface rounded-xl transition-all text-left w-full"
                                >
                                    <UserAvatar user={friend} size={28} />
                                    <span className="text-sm font-bold">{friend.username}</span>
                                </button>
                            ))}
                        </div>
                    </SmartPopover>
                )}

                {searchData.status === 'searching' && (
                    <div className="flex items-center gap-2 text-brand animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Buscando más vuelos...</span>
                    </div>
                )}
            </div>

            {renderItineraries("Vuelos de Ida", searchData.departure_itineraries)}
            {renderItineraries("Vuelos de Vuelta", searchData.return_itineraries)}
        </div>
    );
}