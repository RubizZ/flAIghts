import { Plane } from "lucide-react";
import type { ItineraryResponse, GlobeAirportResponse } from "@/api/generated/openapi/model";
import FlightCard from "./FlightCard";

export default function SelectedFlightSummary({
    itinerary,
    type,
    airportsMap,
    formatTime,
    formatDuration
}: {
    itinerary: ItineraryResponse,
    type: 'Ida' | 'Vuelta',
    airportsMap: Map<string, GlobeAirportResponse>,
    formatTime: (s?: string) => string,
    formatDuration: (m: number) => string
}) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-content flex items-center gap-3 ml-2">
                <div className={`p-2 rounded-lg ${type === 'Ida' ? 'bg-origin/20' : 'bg-destination/20'}`}>
                    <Plane className={`w-5 h-5 ${type === 'Ida' ? 'text-origin -rotate-45' : 'text-destination rotate-[135deg]'}`} />
                </div>
                Vuelo de {type} Seleccionado
            </h2>
            <FlightCard
                itinerary={itinerary}
                airportsMap={airportsMap}
                formatTime={formatTime}
                formatDuration={formatDuration}
                onHover={() => { }}
                onSelect={() => { }}
                showSelectButton={false}
            />
        </div>
    );
}
