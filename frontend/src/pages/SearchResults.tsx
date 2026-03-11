import { useParams } from "react-router-dom";
import { useSearchResult } from "@/api/generated/search/search";
import { Loader2, Plane } from "lucide-react";
import type { ItineraryResponse } from "@/api/generated/model";
import { useTranslation } from "react-i18next";


export default function SearchResults() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();

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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                <p className="text-lg font-medium text-content">{t("searchResults.loading")}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-red-500">
                <p className="text-lg font-medium">{t("searchResults.error.fetch")}</p>
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
                                <span className="text-xs text-content-muted">{t("searchResults.itineraries.totalPrice")}</span>
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
                <h1 className="text-2xl font-bold">{t("searchResults.title")}</h1>
                {searchData.status === 'searching' && (
                    <div className="flex items-center gap-2 text-brand animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">{t("searchResults.loadingMore")}</span>
                    </div>
                )}
            </div>

            {renderItineraries(t("searchResults.itineraries.departure"), searchData.departure_itineraries)}
            {renderItineraries(t("searchResults.itineraries.return"), searchData.return_itineraries)}
        </div>
    );
}