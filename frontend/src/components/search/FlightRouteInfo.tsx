import { useMemo } from "react";
import { Plane } from "lucide-react";
import type { ItineraryResponse } from "@/api/generated/model";

interface FlightRouteInfoProps {
    itinerary: ItineraryResponse;
    formatTime: (s?: string) => string;
    formatDuration: (m: number) => string;
}

export default function FlightRouteInfo({ itinerary, formatTime, formatDuration }: FlightRouteInfoProps) {
    const firstLeg = itinerary.legs[0];
    const lastLeg = itinerary.legs[itinerary.legs.length - 1];
    const stopovers = itinerary.legs.length - 1;
    const stopoverAirports = itinerary.legs.slice(0, -1).map(leg => leg.destination).join(", ");

    const uniqueAirlines = useMemo(() => {
        const airlines = new Map<string, { logo?: string }>();
        itinerary.legs.forEach(leg => {
            if (!airlines.has(leg.airline)) {
                airlines.set(leg.airline, { logo: leg.airline_logo });
            }
        });
        return Array.from(airlines.entries());
    }, [itinerary.legs]);

    return (
        <div className="flex-1 w-full flex flex-col gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
                {uniqueAirlines.map(([name, { logo }]) => (
                    <div key={name} className="flex items-center gap-2 shrink-0" title={name}>
                        {logo ? (
                            <img src={logo} alt={name} className="w-6 h-6 object-contain rounded-xs bg-surface p-0.5" />
                        ) : (
                            <Plane className="w-5 h-5 p-1 bg-surface rounded-full" />
                        )}
                    </div>
                ))}
                <span className="text-sm font-semibold text-content/90 truncate">
                    {uniqueAirlines.map(([name]) => name).join(', ')}
                </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 w-full">
                <div className="text-center min-w-[70px]">
                    <div className="text-2xl font-bold text-content tracking-tight">{formatTime(firstLeg?.departure_time)}</div>
                    <div className="text-xs font-bold text-content-muted/80 bg-surface/30 px-2 py-0.5 rounded-full inline-block mt-1">{firstLeg?.origin}</div>
                </div>

                <div className="flex flex-col items-center flex-1 px-2 relative min-w-[100px]">
                    <span className="text-[10px] uppercase font-bold text-content-muted mb-1.5 tracking-wider">{formatDuration(itinerary.total_duration)}</span>
                    <div className="w-full h-[2px] bg-line relative flex items-center justify-center">
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-line left-0" />
                        {stopovers > 0 && Array.from({ length: stopovers }).map((_, i) => (
                            <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-orange-400"
                                style={{
                                    position: 'absolute',
                                    left: `calc(${(100 / (stopovers + 1)) * (i + 1)}% - 3px)`
                                }}
                            />
                        ))}
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-line right-0" />
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 text-center ${stopovers > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {stopovers === 0 ? 'Directo' : `${stopovers} ${stopovers === 1 ? 'escala' : 'escalas'} (${stopoverAirports})`}
                    </span>
                </div>

                <div className="text-center min-w-[70px]">
                    <div className="text-2xl font-bold text-content tracking-tight">{formatTime(lastLeg?.arrival_time)}</div>
                    <div className="text-xs font-bold text-content-muted/80 bg-surface/30 px-2 py-0.5 rounded-full inline-block mt-1">{lastLeg?.destination}</div>
                </div>
            </div>
        </div>
    );
}
