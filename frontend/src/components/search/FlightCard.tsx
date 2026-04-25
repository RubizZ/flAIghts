import { useState, Fragment, useMemo } from "react";
import { ChevronDown, Clock, Info, PlaneLanding, PlaneTakeoff, Ticket, Calendar, Moon, AlertTriangle, CalendarClock, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const firstDepartureTime = itinerary.legs[0]?.departure_time;
    const lastArrivalLeg = itinerary.legs[itinerary.legs.length - 1];

    const isGeneticTrip = useMemo(() =>
        itinerary.city_order &&
        itinerary.city_order.length > 2 &&
        itinerary.city_order[0] === itinerary.city_order[itinerary.city_order.length - 1],
        [itinerary.city_order]);

    const groupedLegs = useMemo(() => {
        const groups: LegResponse[][] = [];
        let currentGroup: LegResponse[] = [];

        itinerary.legs.forEach((leg, i) => {
            if (i > 0 && leg.flight_id !== itinerary.legs[i - 1]?.flight_id) {
                groups.push(currentGroup);
                currentGroup = [];
            }
            currentGroup.push(leg);
        });
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        return groups;
    }, [itinerary.legs]);

    return (
        <div
            className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border border-line rounded-2xl shadow-lg transition-all duration-300 hover:border-brand/40 hover:bg-surface overflow-hidden"
            onMouseEnter={() => onHover(itinerary)}
            onMouseLeave={() => onHover(null)}
        >
            <div
                className="group relative pt-5 px-5 pb-10 cursor-pointer"
                onClick={() => {
                    const next = !isExpanded;
                    setIsExpanded(next);
                    if (next) {
                        window.dispatchEvent(new CustomEvent('app:view-flight-details'));
                    }
                    onExpandChange?.(next ? itinerary : null);
                }}
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
                    <div className="flex flex-col items-center sm:items-end justify-center px-4 sm:px-8 border-t sm:border-t-0 sm:border-l border-line/20 py-4 sm:py-0 bg-brand/[0.02] sm:bg-transparent w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-content-muted/60 uppercase tracking-widest mb-1">{t('flightCard.totalPrice')}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-brand tracking-tight">{itinerary.total_price}€</span>
                        </div>
                        {showSelectButton && onSelect && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(itinerary);
                                }}
                                className="mt-3 w-full sm:w-auto px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 transition-all hover:-translate-y-px active:translate-y-px cursor-pointer"
                            >
                                {t('flightCard.select')}
                            </button>
                        )}
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
                <div className="px-5 border-t border-line animate-in fade-in duration-300">
                    <div className="pt-4 space-y-6">
                        {(() => {
                            let scaleCounter = 0;
                            let currentFlightId = "";

                            return itinerary.legs.map((leg, index) => {
                                const prevLeg = index > 0 ? itinerary.legs[index - 1] : null;
                                const isNewFlight = index === 0 || leg.flight_id !== prevLeg?.flight_id;
                                
                                // Resetear contador de escalas si es un nuevo vuelo o cambio de ID
                                if (isNewFlight) scaleCounter = 0;
                                if (index > 0 && leg.wait_time && leg.wait_time > 0) scaleCounter++;

                                // Encontrar el índice del vuelo para el encabezado
                                const flightIndex = isGeneticTrip 
                                    ? Array.from(new Set(itinerary.legs.slice(0, index + 1).map(l => l.flight_id))).length - 1
                                    : 0;

                                const totalPoints = itinerary.legs.length * 2;
                                const getPointColor = (pointIdx: number) => 
                                    `color-mix(in srgb, var(--color-origin), var(--color-destination) ${(pointIdx / (totalPoints - 1)) * 100}%)`;

                                return (
                                    <Fragment key={index}>
                                        {/* Encabezado de Vuelo (Solo para viajes genéticos y cuando cambia el ID) */}
                                        {isGeneticTrip && isNewFlight && (
                                            <div className="flex items-center gap-2 mb-4 mt-6 first:mt-2">
                                                <div className="h-px bg-linear-to-r from-brand/50 to-transparent flex-1" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand bg-brand/5 px-2 py-0.5 rounded-md border border-brand/10">
                                                    {t('flightCard.flight')} {flightIndex + 1}: {leg.origin} → {itinerary.legs.filter(l => l.flight_id === leg.flight_id).at(-1)?.destination}
                                                </span>
                                                <div className="h-px bg-linear-to-l from-brand/50 to-transparent flex-1" />
                                            </div>
                                        )}

                                        {/* Escala: Siempre que haya tiempo de espera */}
                                        {index > 0 && leg.wait_time !== undefined && leg.wait_time > 0 && (
                                            <StopoverDetails
                                                leg={leg}
                                                airportsMap={airportsMap}
                                                formatDuration={formatDuration}
                                                index={scaleCounter} 
                                                previousLeg={prevLeg!}
                                                stopoverColor={getPointColor((index * 2) - 1)}
                                            />
                                        )}

                                        <LegDetails
                                            leg={leg}
                                            airportsMap={airportsMap}
                                            formatDuration={formatDuration}
                                            formatTime={formatTime}
                                            itineraryStart={firstDepartureTime}
                                            isGeneticTrip={isGeneticTrip}
                                            originColor={getPointColor(index * 2)}
                                            destinationColor={getPointColor(index * 2 + 1)}
                                        />
                                    </Fragment>
                                );
                            });
                        })()}

                        {/* Final arrival summary notice */}
                        <div className="mt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-content-muted bg-surface/20 -mx-5 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-brand" />
                                <span>{isGeneticTrip ? t('flightCard.tripCompletion') : t('flightCard.finalArrival', { airport: lastArrivalLeg?.destination })}:</span>
                            </div>
                            <span className="text-xs font-bold text-content leading-none">
                                {isGeneticTrip
                                    ? t('flightCard.arrivingAt', { airport: lastArrivalLeg?.destination })
                                    : t('flightCard.finalArrival', { airport: lastArrivalLeg?.destination })
                                }
                                <span className="text-brand ml-1">
                                    {t('flightCard.atTime', { time: formatTime(lastArrivalLeg?.arrival_time) })}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface StopoverDetailsPropsWithParams extends StopoverDetailsProps {
    index: number;
    previousLeg: LegResponse;
    stopoverColor: string;
}

function StopoverDetails({ leg, formatDuration, airportsMap, index, previousLeg, stopoverColor }: StopoverDetailsPropsWithParams) {
    const { t } = useTranslation();
    const airport = airportsMap.get(leg.origin);

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
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest px-2 py-0.5 bg-brand/10 rounded-md">
                            {t('flightCard.scale', { number: index })} - {formatDuration(leg.wait_time || 0)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        {isOvernight && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <Moon size={12} />
                                <span>{t('flightCard.overnightScale')}</span>
                            </div>
                        )}
                        {isShortLayover && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                                <Clock3 size={12} />
                                <span>{t('flightCard.shortScale')}</span>
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
    isGeneticTrip?: boolean;
}

function LegDetails({ leg, airportsMap, formatDuration, formatTime, itineraryStart, originColor, destinationColor, isGeneticTrip }: LegDetailsPropsWithColors) {
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

    const formatDateSuperscript = (targetTime?: string) => {
        if (!targetTime) return null;
        const date = new Date(targetTime);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
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
                            {departureDayDiff > 0 && (
                                <sup className="text-[10px] text-brand ml-0.5 font-bold">
                                    {isGeneticTrip ? formatDateSuperscript(leg.departure_time) : `+${departureDayDiff}`}
                                </sup>
                            )}
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
                            {arrivalDayDiff > 0 && (
                                <sup className="text-[10px] text-brand ml-0.5 font-bold">
                                    {isGeneticTrip ? formatDateSuperscript(leg.arrival_time) : `+${arrivalDayDiff}`}
                                </sup>
                            )}
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
