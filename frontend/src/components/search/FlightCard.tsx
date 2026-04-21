import { useState, Fragment, useMemo } from "react";
import { ChevronDown, Clock, Info, PlaneLanding, PlaneTakeoff, Ticket, Calendar, Moon, AlertTriangle } from "lucide-react";
import type { ItineraryResponse, GlobeAirportResponse, LegResponse } from "@/api/generated/openapi/model";
import FlightRouteInfo from "./FlightRouteInfo";
import { COUNTRY_NAMES } from "@/constants/countries";

interface FlightCardProps {
    itinerary: ItineraryResponse,
    formatTime: (s?: string) => string,
    formatDuration: (m: number) => string,
    airportsMap: Map<string, GlobeAirportResponse>,
    onHover: (it: ItineraryResponse | null) => void,
    onExpandChange?: (it: ItineraryResponse | null) => void,
    onSelect?: (itinerary: ItineraryResponse) => void,
    showSelectButton?: boolean
}

interface StopoverDetailsProps {
    leg: LegResponse,
    airportsMap: Map<string, GlobeAirportResponse>,
    formatDuration: (m: number) => string
}

interface LegDetailsProps {
    leg: LegResponse,
    airportsMap: Map<string, GlobeAirportResponse>,
    formatDuration: (m: number) => string,
    formatTime: (s?: string) => string,
    itineraryStart?: string
}

export default function FlightCard({ itinerary, formatTime, formatDuration, airportsMap, onHover, onExpandChange, onSelect, showSelectButton = true }: FlightCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const firstDepartureTime = itinerary.legs[0]?.departure_time;
    const lastArrivalLeg = itinerary.legs[itinerary.legs.length - 1];

    const formattedArrivalDate = useMemo(() => {
        if (!lastArrivalLeg?.arrival_time) return "";
        return new Date(lastArrivalLeg.arrival_time).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }, [lastArrivalLeg?.arrival_time]);

    return (
        <div
            className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border border-line rounded-2xl shadow-lg transition-all duration-300 hover:border-brand/40 hover:bg-surface overflow-hidden cursor-pointer group active:scale-[0.99] relative"
            onMouseEnter={() => onHover(itinerary)}
            onMouseLeave={() => onHover(null)}
            onClick={() => {
                const next = !isExpanded;
                setIsExpanded(next);
                if (next) {
                    window.dispatchEvent(new CustomEvent('app:view-flight-details'));
                }
                onExpandChange?.(next ? itinerary : null);
            }}
        >
            {/* Hover Shine Effect - Now covers entire card */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none z-20" />

            <div className="relative pt-5 px-5 pb-10">
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
                        {showSelectButton && onSelect && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(itinerary);
                                }}
                                className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 transition-all hover:-translate-y-px active:translate-y-px cursor-pointer"
                            >
                                Seleccionar
                            </button>
                        )}
                    </div>
                </div>
                {/* Collapsed Expand Button - Inside header section */}
                {!isExpanded && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 p-1 bg-surface/30 rounded-full border border-line/20 group-hover:bg-surface transition-colors z-30">
                        <ChevronDown
                            size={16}
                            className="text-content-muted transition-transform duration-300"
                        />
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="px-5 border-t border-line animate-in fade-in duration-300">
                    <div className="pt-4 space-y-4">
                        {itinerary.legs.map((leg, legIndex) => (
                            <Fragment key={legIndex}>
                                {legIndex > 0 && leg.wait_time && leg.wait_time > 0 && (
                                    <StopoverDetails
                                        leg={leg}
                                        airportsMap={airportsMap}
                                        formatDuration={formatDuration}
                                        index={legIndex}
                                        totalSteps={itinerary.legs.length - 1}
                                        previousLeg={itinerary.legs[legIndex - 1]!}
                                    />
                                )}
                                <LegDetails
                                    leg={leg}
                                    airportsMap={airportsMap}
                                    formatDuration={formatDuration}
                                    formatTime={formatTime}
                                    itineraryStart={firstDepartureTime}
                                    originColor={legIndex === 0 ? 'var(--color-origin)' : `color-mix(in srgb, var(--color-origin), var(--color-destination) ${(legIndex / itinerary.legs.length) * 100}%)`}
                                    destinationColor={legIndex === itinerary.legs.length - 1 ? 'var(--color-destination)' : `color-mix(in srgb, var(--color-origin), var(--color-destination) ${((legIndex + 1) / itinerary.legs.length) * 100}%)`}
                                />
                            </Fragment>
                        ))}

                        {/* Final arrival summary notice - Now contains the collapse button */}
                        <div className="mt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-content-muted bg-surface/20 -mx-5 px-5 py-4 relative">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-brand" />
                                <span>Llegada final a <strong>{lastArrivalLeg?.destination}</strong>:</span>
                            </div>

                            <span className="font-bold text-content text-sm first-letter:uppercase">
                                {formattedArrivalDate} a las {formatTime(lastArrivalLeg?.arrival_time)}
                            </span>

                            {/* Collapse Button inside this section - now at the end for mobile ordering */}
                            <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 p-1 bg-surface/50 border border-line/20 rounded-full text-content-muted transition-colors order-last sm:order-none">
                                <ChevronDown
                                    size={16}
                                    className="rotate-180"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

interface StopoverDetailsPropsWithParams extends StopoverDetailsProps {
    index: number;
    totalSteps: number;
    previousLeg: LegResponse;
}

function StopoverDetails({ leg, formatDuration, airportsMap, index, totalSteps, previousLeg }: StopoverDetailsPropsWithParams) {
    const airport = airportsMap.get(leg.origin);
    const t = index / (totalSteps + 1);
    const stopoverColor = `color-mix(in srgb, var(--color-origin), var(--color-destination) ${t * 100}%)`;

    const isOvernight = useMemo(() => {
        const arrivalDate = new Date(previousLeg.arrival_time).getDate();
        const departureDate = new Date(leg.departure_time).getDate();
        const isLongLayover = (leg.wait_time || 0) > 240; // > 4 hours

        return (isLongLayover && arrivalDate !== departureDate);
    }, [leg, previousLeg]);

    const isShortLayover = (leg.wait_time || 0) < 70; // Escada < 1h 10m

    return (
        <div
            className="flex items-center gap-4 text-xs text-content-muted border-t border-b border-line py-4 pl-2 -mx-5 px-5"
            style={{ backgroundColor: `color-mix(in srgb, ${stopoverColor} 8%, transparent)` }}
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ backgroundColor: stopoverColor }}
                >
                    {index}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold whitespace-nowrap" style={{ color: stopoverColor }}>
                        {index}ª Escala - {formatDuration(leg.wait_time!)}
                    </span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        {isOvernight && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tighter">
                                <Moon size={10} className="fill-current" />
                                Escala nocturna
                            </div>
                        )}
                        {isShortLayover && (
                            <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-tight">
                                <AlertTriangle size={11} className="fill-current" strokeWidth={3} />
                                Escala muy corta
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="w-1 h-1 bg-line rounded-full" />
            <div className="flex flex-col min-w-0">
                <span className="font-bold text-content truncate">
                    {airport?.ci}, {airport?.c && (COUNTRY_NAMES[airport.c]?.[1] || airport.c)}
                </span>
                <span className="font-medium text-[10px] text-content-muted truncate">
                    {airport?.n} ({leg.origin})
                </span>
            </div>
        </div>
    );
}

interface LegDetailsPropsWithColors extends LegDetailsProps {
    originColor: string;
    destinationColor: string;
}

function LegDetails({ leg, airportsMap, formatDuration, formatTime, itineraryStart, originColor, destinationColor }: LegDetailsPropsWithColors) {
    const originAirport = airportsMap.get(leg.origin);
    const destinationAirport = airportsMap.get(leg.destination);

    const calculateDayDiff = (targetTime?: string) => {
        if (!itineraryStart || !targetTime) return 0;
        const start = new Date(itineraryStart);
        const end = new Date(targetTime);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diff = endDay.getTime() - startDay.getTime();
        return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    const departureDayDiff = useMemo(() =>
        calculateDayDiff(leg.departure_time),
        [itineraryStart, leg.departure_time]
    );

    const arrivalDayDiff = useMemo(() =>
        calculateDayDiff(leg.arrival_time),
        [itineraryStart, leg.arrival_time]
    );

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
                    <PlaneTakeoff size={18} className="shrink-0 mt-1" style={{ color: originColor }} />
                    <div className="flex flex-col">
                        <span className="font-bold text-content">
                            {formatTime(leg.departure_time)} - {leg.origin}
                            {departureDayDiff > 0 && <sup className="text-[12px] text-brand ml-0.5 font-bold">+{departureDayDiff}</sup>}
                        </span>
                        <span className="text-xs text-content-muted">
                            {originAirport?.ci}, {originAirport?.c && (COUNTRY_NAMES[originAirport.c]?.[1] || originAirport.c)} • {originAirport?.n}
                        </span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <PlaneLanding size={18} className="shrink-0 mt-1" style={{ color: destinationColor }} />
                    <div className="flex flex-col">
                        <span className="font-bold text-content">
                            {formatTime(leg.arrival_time)} - {leg.destination}
                            {arrivalDayDiff > 0 && <sup className="text-[12px] text-brand ml-0.5 font-bold">+{arrivalDayDiff}</sup>}
                        </span>
                        <span className="text-xs text-content-muted">
                            {destinationAirport?.ci}, {destinationAirport?.c && (COUNTRY_NAMES[destinationAirport.c]?.[1] || destinationAirport.c)} • {destinationAirport?.n}
                        </span>
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
