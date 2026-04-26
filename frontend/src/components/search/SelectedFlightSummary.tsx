import { Plane } from "lucide-react";
import type { ItineraryResponse, GlobeAirportResponse } from "@/api/generated/openapi/model";
import FlightCard from "./FlightCard";
import { useTranslation } from "react-i18next";

export default function SelectedFlightSummary({
    itinerary,
    type,
    airportsMap,
    formatTime,
    formatDuration,
    title,
    onEdit
}: {
    itinerary: ItineraryResponse,
    type: 'Ida' | 'Vuelta',
    airportsMap: Map<string, GlobeAirportResponse>,
    formatTime: (s?: string) => string,
    formatDuration: (m: number) => string,
    title: string,
    onEdit?: () => void
}) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between ml-2">
                <h2 className="text-xl font-bold text-content flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type === 'Ida' ? 'bg-origin/20' : 'bg-destination/20'}`}>
                        <Plane className={`w-5 h-5 ${type === 'Ida' ? 'text-origin -rotate-45' : 'text-destination rotate-[135deg]'}`} />
                    </div>
                    {title}
                </h2>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="text-xs font-black uppercase tracking-widest text-brand px-4 py-2 bg-main/90 dark:bg-main/80 backdrop-blur-xl border border-line/50 rounded-xl shadow-lg hover:bg-brand hover:text-white hover:border-brand transition-all cursor-pointer active:scale-95"
                    >
                        {t('searchResultsPage.change')}
                    </button>
                )}
            </div>
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
