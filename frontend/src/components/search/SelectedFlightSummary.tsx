import { Plane } from "lucide-react";
import type { ItineraryResponse } from "@/api/generated/model";
import FlightRouteInfo from "./FlightRouteInfo";

export default function SelectedFlightSummary({ itinerary, type }: { itinerary: ItineraryResponse, type: 'Ida' | 'Vuelta' }) {
    const formatTime = (dateString?: string) => {
        if (!dateString) return "--:--";
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border-2 border-brand/40 rounded-2xl shadow-lg p-5">
            <h2 className="text-xl font-bold text-content flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${type === 'Ida' ? 'bg-origin/20' : 'bg-destination/20'}`}>
                    <Plane className={`w-5 h-5 ${type === 'Ida' ? 'text-origin -rotate-45' : 'text-destination rotate-[135deg]'}`} />
                </div>
                Vuelo de {type} Seleccionado
            </h2>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <FlightRouteInfo
                    itinerary={itinerary}
                    formatTime={formatTime}
                    formatDuration={formatDuration}
                />
                <div className="text-left lg:text-right w-full lg:w-auto pt-4 lg:pt-0 lg:pl-8 lg:border-l border-line">
                    <span className="text-3xl font-black text-brand tracking-tight">{itinerary.total_price}€</span>
                </div>
            </div>
        </div>
    );
}
