import { useParams } from "react-router-dom";
import { useSearchResult } from "@/api/generated/search/search";
import { Loader2, Plane } from "lucide-react";
import type { ItineraryResponse } from "@/api/generated/model";

export default function SearchResults() {
    const { id } = useParams<{ id: string }>();

    // Fetch search results with polling enabled while status is 'searching'
    // The first argument is the path parameter `id`.
    // The `data` returned by the hook is the unwrapped search object due to the Orval mutator.
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-lg font-medium">Cargando resultados...</p>
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
            // SerpApi devuelve fechas como "2024-05-21 06:50"
            const date = new Date(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">{title}</h2>
                {itineraries.map((itinerary, index) => (
                    <div key={index} className="border border-themed rounded-lg p-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-4">
                                {itinerary.legs.map((leg, legIndex) => (
                                    <div key={legIndex} className="flex flex-col gap-2">
                                        {/* Cabecera del vuelo: Aerolínea */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {leg.airline_logo && (
                                                <img src={leg.airline_logo} alt={leg.airline} className="w-6 h-6 object-contain" />
                                            )}
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{leg.airline}</span>
                                        </div>

                                        {/* Detalles del vuelo: Hora Origen -> Hora Destino */}
                                        <div className="flex items-center gap-6">
                                            <div className="text-center min-w-[60px]">
                                                <div className="text-xl font-bold">{formatTime(leg.departure_time)}</div>
                                                <div className="text-xs text-gray-500 font-mono">{leg.origin}</div>
                                            </div>

                                            <div className="flex flex-col items-center flex-1 px-4">
                                                <span className="text-xs text-gray-500 mb-1">{Math.floor(leg.duration / 60)}h {leg.duration % 60}m</span>
                                                <div className="w-full h-[2px] bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center">
                                                    <Plane className="w-4 h-4 text-gray-400 rotate-90 absolute bg-white dark:bg-gray-800 px-0.5" />
                                                </div>
                                            </div>

                                            <div className="text-center min-w-[60px]">
                                                <div className="text-xl font-bold">{formatTime(leg.arrival_time)}</div>
                                                <div className="text-xs text-gray-500 font-mono">{leg.destination}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="ml-6 flex flex-col items-end justify-center h-full border-l border-gray-200 dark:border-gray-700 pl-6">
                                <span className="text-2xl font-bold text-accent">{itinerary.total_price} €</span>
                                <span className="text-xs text-gray-500">Precio total</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 text-primary">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Resultados de búsqueda</h1>
                {searchData.status === 'searching' && (
                    <div className="flex items-center gap-2 text-accent animate-pulse">
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