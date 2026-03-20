import { useState } from "react";
import { ChevronDown, Clock, Info, PlaneLanding, PlaneTakeoff, Ticket } from "lucide-react";
import type { ItineraryResponse, GlobeAirportResponse, LegResponse } from "@/api/generated/model";
import FlightRouteInfo from "./FlightRouteInfo";

// Optimized Flight Card Component
export default function FlightCard({ itinerary, formatTime, formatDuration, airportsMap, onHover, onSelect }: { itinerary: ItineraryResponse, formatTime: (s?: string) => string, formatDuration: (m: number) => string, airportsMap: Map<string, GlobeAirportResponse>, onHover: (it: ItineraryResponse | null) => void, onSelect: (itinerary: ItineraryResponse) => void }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border border-line rounded-2xl shadow-lg transition-all duration-300 hover:border-brand/40 hover:bg-surface overflow-hidden"
            onMouseEnter={() => onHover(itinerary)}
            onMouseLeave={() => onHover(null)}
        >
            <div
                className="group relative pt-5 px-5 pb-10 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Hover Shine Effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <FlightRouteInfo
                        itinerary={itinerary}
                        formatTime={formatTime}
                        formatDuration={formatDuration}
                    />

                    {/* Price & Action */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto pt-0 lg:pl-8 lg:border-l border-line gap-3">
                        <div className="text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-content-muted tracking-wider block mb-0.5">Precio total</span>
                            <span className="text-3xl font-black text-brand tracking-tight">{itinerary.total_price}€</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(itinerary);
                            }}
                            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
                        >
                            Seleccionar
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 p-1 bg-surface/30 rounded-full border border-line/20 group-hover:bg-surface transition-colors">
                    <ChevronDown
                        size={16}
                        className={`text-content-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 border-t border-line animate-in fade-in duration-300">
                    <div className="py-4 space-y-4">
                        {itinerary.legs.map((leg, legIndex) => (
                            <>
                                {legIndex > 0 && leg.wait_time && leg.wait_time > 0 && (
                                    <StopoverDetails leg={leg} airportsMap={airportsMap} formatDuration={formatDuration} />
                                )}
                                <LegDetails key={legIndex} leg={leg} airportsMap={airportsMap} formatDuration={formatDuration} formatTime={formatTime} />
                            </>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StopoverDetails({ leg, formatDuration, airportsMap }: { leg: LegResponse, airportsMap: Map<string, GlobeAirportResponse>, formatDuration: (m: number) => string }) {
    return (
        <div className="flex items-center gap-4 text-xs text-content-muted border-t border-b border-line py-4 pl-2">
            <Clock size={16} className="text-orange-400 shrink-0" />
            <span className="font-bold text-orange-400">
                {formatDuration(leg.wait_time!)} de escala
            </span>
            <div className="w-1 h-1 bg-line rounded-full" />
            <span className="font-medium">{airportsMap.get(leg.origin)?.n} ({leg.origin})</span>
        </div>
    );
}

function LegDetails({ leg, airportsMap, formatDuration, formatTime }: { leg: LegResponse, airportsMap: Map<string, GlobeAirportResponse>, formatDuration: (m: number) => string, formatTime: (s?: string) => string }) {
    const originAirport = airportsMap.get(leg.origin);
    const destinationAirport = airportsMap.get(leg.destination);

    return (
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex flex-col gap-4 flex-1">
                <div className="flex items-center gap-2">
                    <img src={leg.airline_logo} alt={leg.airline} className="w-6 h-6 object-contain rounded-xs bg-surface p-0.5" />
                    <span className="font-bold text-content">{leg.airline}</span>
                    {leg.flight_number && (
                        <span className="text-xs font-mono text-content-muted bg-surface px-1.5 py-0.5 rounded border border-line/50">
                            {leg.flight_number}
                        </span>
                    )}
                </div>
                <div className="flex items-start gap-4">
                    <PlaneTakeoff size={18} className="text-origin shrink-0 mt-1" />
                    <div className="flex flex-col">
                        <span className="font-bold text-content">{formatTime(leg.departure_time)} - {leg.origin}</span>
                        <span className="text-xs text-content-muted">{originAirport?.n}, {originAirport?.ci}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <PlaneLanding size={18} className="text-destination shrink-0 mt-1" />
                    <div className="flex flex-col">
                        <span className="font-bold text-content">{formatTime(leg.arrival_time)} - {leg.destination}</span>
                        <span className="text-xs text-content-muted">{destinationAirport?.n}, {destinationAirport?.ci}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col text-xs text-content-muted font-medium items-start gap-2 sm:max-w-[40%]">
                <div className="flex items-center gap-2" title="Clase de viaje">
                    <Ticket size={14} className="text-brand/70" />
                    <span>{leg.travel_class || 'Turista'}</span>
                </div>

                <div className="flex items-center gap-2" title="Duración del vuelo">
                    <Clock size={14} className="text-brand/70" />
                    <span>{formatDuration(leg.duration)}</span>
                </div>


                {leg.airplane && (
                    <div className="flex items-center gap-2 text-xs text-content-muted font-medium" title="Modelo de avión">
                        <Info size={14} className="text-brand/70" />
                        <span>{leg.airplane}</span>
                    </div>
                )}

                {leg.extensions && leg.extensions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {leg.extensions.map((ext, i) => (
                            <span key={i} className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {ext}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
