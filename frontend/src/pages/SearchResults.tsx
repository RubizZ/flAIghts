import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSearchResult } from "@/api/generated/search/search";
import { useGetGlobeAirports } from "@/api/generated/airports/airports";
import { AlertCircle, Loader2, Plane, ArrowLeft, DollarSign, Clock, Calendar, ChevronDown, Info, Ticket, PlaneTakeoff, PlaneLanding } from "lucide-react";
import type { ItineraryResponse, GlobeAirportResponse, Leg } from "@/api/generated/model";
import StarsBackground from "@/components/ui/StarsBackground";
import Globe from "@/components/Globe";

export default function SearchResults() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState<'price' | 'duration'>('price');
    const [isGlobeReady, setIsGlobeReady] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { data: airportsData } = useGetGlobeAirports({
        query: { staleTime: Infinity, refetchOnWindowFocus: false }
    });

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

    const searchData = data;

    const airportsMap = useMemo(() => {
        if (!airportsData) return new Map<string, GlobeAirportResponse>();
        const map = new Map(airportsData.map(a => [a.i, a]));
        return map;
    }, [airportsData]);

    // Derived state for Globe: extracts origin/destination from search criteria to visualize the route
    const globeRoute = useMemo(() => {
        if (!searchData) return { origin: undefined, destination: undefined };
        // Try to get explicit origins/destinations from search data if available
        // Or fallback to the first itinerary found to visualize the route
        const origin = searchData.origins?.[0] || searchData.departure_itineraries?.[0]?.legs?.[0]?.origin;
        // For destination, check the last leg of the first itinerary if explicit destination unavailable
        const firstItinerary = searchData.departure_itineraries?.[0];
        const destination = searchData.destinations?.[0] || (firstItinerary ? firstItinerary.legs[firstItinerary.legs.length - 1]?.destination : undefined);

        return { origin, destination };
    }, [searchData]);

    const sortItineraries = (itineraries?: ItineraryResponse[]) => {
        if (!itineraries) return [];
        return [...itineraries].sort((a, b) => {
            if (sortBy === 'price') return a.total_price - b.total_price;
            if (sortBy === 'duration') return a.total_duration - b.total_duration;
            return 0;
        });
    };

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

    const formatDateForDisplay = (dateStr?: string): string | null => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const formatted = date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        // Example: "vie., 24 may." -> "Vie, 24 may"
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '');
    };

    // --- Loading State ---
    if (isLoading && !data) {
        return (
            <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center gap-6">
                <StarsBackground className="opacity-40" />
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 rounded-full border border-brand/40 animate-radar" style={{ animationDelay: '0s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/25 animate-radar" style={{ animationDelay: '0.8s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/15 animate-radar" style={{ animationDelay: '1.6s' }} />
                    <Loader2 className="w-10 h-10 animate-spin text-brand relative z-10" />
                </div>
                <p className="text-lg font-medium text-white/80 z-10">Buscando las mejores rutas...</p>
            </div>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-main text-red-500 gap-4 p-4 text-center">
                <AlertCircle size={48} className="opacity-80" />
                <p className="text-lg font-medium">Error al cargar la búsqueda</p>
                <p className="text-sm opacity-70 max-w-md">{error.message}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-6 py-2 bg-brand text-content-on-brand rounded-xl font-bold hover:bg-brand-hover transition-colors"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    if (!data) return null;

    const departureItineraries = sortItineraries(searchData.departure_itineraries);
    const returnItineraries = sortItineraries(searchData.return_itineraries);

    // Calculate offset to center globe in the right empty space (approx 35% of screen width shift)
    const globeOffset = windowWidth >= 1024 ? windowWidth * 0.35 : 0;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-main lg:bg-black text-content flex">
            {/* Mobile Background Globe (Full screen) */}
            <div className="absolute inset-0 z-0 lg:hidden">
                <StarsBackground className="opacity-30" />
            </div>

            {/* Left Column: Results List */}
            <div className="relative z-10 w-full lg:w-[65%] xl:w-[60%] h-full">
                <div className="relative w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth">
                    <div className="max-w-3xl mx-auto px-4 pt-24 pb-6 lg:pt-24 lg:pb-10 min-h-full flex flex-col gap-6 lg:gap-8">

                        {/* Header Card */}
                        <div className="sticky top-24 z-20 backdrop-blur-2xl bg-main/70 border border-line/40 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="p-2.5 bg-surface/50 hover:bg-surface border border-line/30 rounded-xl transition-all group active:scale-95 cursor-pointer"
                                    title="Volver al inicio"
                                >
                                    <ArrowLeft size={20} className="text-content-muted group-hover:text-content" />
                                </button>
                                <div>
                                    <h1 className="text-lg md:text-xl font-bold flex items-center gap-3 text-white">
                                        {globeRoute.origin} <Plane className="w-5 h-5 text-brand rotate-90" /> {globeRoute.destination}
                                    </h1>
                                    <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-content-muted font-medium">
                                        <div className="flex items-center gap-2">
                                            {searchData.status === 'searching' && (
                                                <Loader2 className="w-3 h-3 animate-spin text-brand" />
                                            )}
                                            <p>
                                                {searchData.status === 'searching' ? 'Buscando en tiempo real...' : `${(departureItineraries?.length || 0) + (returnItineraries?.length || 0)} resultados encontrados`}
                                            </p>
                                        </div>
                                        {searchData.departure_date && (
                                            <div className="flex items-center gap-2 border-l-0 pl-0 sm:border-l sm:border-white/10 sm:pl-3">
                                                <Calendar size={14} className="text-brand/80" />
                                                <span>{formatDateForDisplay(searchData.departure_date)}</span>
                                                {searchData.return_date && (
                                                    <>
                                                        <span className="text-white/30 mx-1">→</span>
                                                        <span>{formatDateForDisplay(searchData.return_date)}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sorting Controls */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-content-muted block">Ordenar por:</span>
                                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
                                    <button
                                        onClick={() => setSortBy('price')}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${sortBy === 'price'
                                            ? 'bg-brand text-content-on-brand shadow-sm'
                                            : 'text-content-muted hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <DollarSign size={14} />
                                        <span>Precio</span>
                                    </button>
                                    <button
                                        onClick={() => setSortBy('duration')}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${sortBy === 'duration'
                                            ? 'bg-brand text-content-on-brand shadow-sm'
                                            : 'text-content-muted hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <Clock size={14} />
                                        <span>Duración</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Columns */}
                        <div className="grid grid-cols-1 gap-10 pb-24">
                            {/* Departure Flights */}
                            {departureItineraries && departureItineraries.length > 0 && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3 ml-2">
                                        <div className="p-2 bg-origin/20 rounded-lg">
                                            <Plane className="w-5 h-5 text-origin -rotate-45" />
                                        </div>
                                        Vuelos de Ida
                                    </h2>
                                    <div className="space-y-4">
                                        {departureItineraries.map((itinerary, index) => (
                                            <FlightCard
                                                key={index}
                                                itinerary={itinerary}
                                                formatTime={formatTime}
                                                formatDuration={formatDuration}
                                                airportsMap={airportsMap}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Return Flights */}
                            {returnItineraries && returnItineraries.length > 0 && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3 ml-2">
                                        <div className="p-2 bg-destination/20 rounded-lg">
                                            <Plane className="w-5 h-5 text-destination rotate-[135deg]" />
                                        </div>
                                        Vuelos de Vuelta
                                    </h2>
                                    <div className="space-y-4">
                                        {returnItineraries.map((itinerary, index) => (
                                            <FlightCard
                                                key={index}
                                                itinerary={itinerary}
                                                formatTime={formatTime}
                                                formatDuration={formatDuration}
                                                airportsMap={airportsMap}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isLoading && (!departureItineraries?.length) && (!returnItineraries?.length) && (
                                <div className="flex flex-col items-center justify-center py-20 bg-main/40 backdrop-blur-md rounded-3xl border border-line/30 text-center text-content-muted mx-4">
                                    <AlertCircle size={48} className="mb-4 opacity-50 text-white" />
                                    <h3 className="text-xl font-semibold text-white mb-2">No se encontraron vuelos</h3>
                                    <p className="text-sm opacity-70">Intenta cambiar las fechas o los aeropuertos en la búsqueda.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Globe (Absolute Full Screen with Offset) */}
            <div className="hidden lg:block absolute inset-0 z-0">
                <Globe
                    originIata={globeRoute.origin}
                    destinationIata={globeRoute.destination}
                    selectedAirports={[globeRoute.origin, globeRoute.destination].filter(Boolean) as string[]}
                    onReady={() => setIsGlobeReady(true)}
                    interactive={true} // Allow interaction on desktop
                    horizontalOffset={globeOffset}
                />
            </div>
        </div>
    );
}

// Optimized Flight Card Component
function FlightCard({ itinerary, formatTime, formatDuration, airportsMap }: { itinerary: ItineraryResponse, formatTime: (s?: string) => string, formatDuration: (m: number) => string, airportsMap: Map<string, GlobeAirportResponse> }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-main/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg transition-all duration-300 hover:border-brand/40 hover:bg-main/80 overflow-hidden">
            <div
                className="group relative pt-5 px-5 pb-10 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Hover Shine Effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 space-y-6 w-full">
                        {itinerary.legs.map((leg, legIndex) => (
                            <div key={legIndex} className="flex flex-col gap-3">
                                {/* Airline Header */}
                                <div className="flex items-center gap-2.5">
                                    {leg.airline_logo ? (
                                        <img src={leg.airline_logo} alt={leg.airline} className="w-6 h-6 object-contain rounded-xs bg-white/5 p-0.5" />
                                    ) : (
                                        <Plane className="w-5 h-5 p-1 bg-white/10 rounded-full" />
                                    )}
                                    <span className="text-sm font-semibold text-content/90">{leg.airline}</span>
                                </div>

                                {/* Flight Route Visual */}
                                <div className="flex items-center gap-4 sm:gap-6 w-full">
                                    {/* Departure */}
                                    <div className="text-center min-w-[70px]">
                                        <div className="text-2xl font-bold text-white tracking-tight">{formatTime(leg.departure_time)}</div>
                                        <div className="text-xs font-bold text-content-muted/80 bg-surface/30 px-2 py-0.5 rounded-full inline-block mt-1">{leg.origin}</div>
                                    </div>

                                    {/* Path & Duration */}
                                    <div className="flex flex-col items-center flex-1 px-2 relative min-w-[100px]">
                                        <span className="text-[10px] uppercase font-bold text-content-muted mb-1.5 tracking-wider">{formatDuration(leg.duration)}</span>
                                        <div className="w-full h-[2px] bg-white/10 relative flex items-center justify-center">
                                            <div className="absolute w-1.5 h-1.5 rounded-full bg-white/20 left-0" />
                                            <Plane className="w-4 h-4 text-brand rotate-90 absolute bg-black p-0.5 rounded-full" />
                                            <div className="absolute w-1.5 h-1.5 rounded-full bg-white/20 right-0" />
                                        </div>
                                        <span className={`text-[10px] font-bold mt-1.5 ${leg.wait_time > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                            {leg.wait_time > 0 ? `${Math.floor(leg.wait_time / 60)}h ${leg.wait_time % 60}m escala` : 'Directo'}
                                        </span>
                                    </div>

                                    {/* Arrival */}
                                    <div className="text-center min-w-[70px]">
                                        <div className="text-2xl font-bold text-white tracking-tight">{formatTime(leg.arrival_time)}</div>
                                        <div className="text-xs font-bold text-content-muted/80 bg-surface/30 px-2 py-0.5 rounded-full inline-block mt-1">{leg.destination}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Price & Action */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto pt-1 lg:pt-0 lg:pl-8 lg:border-l border-white/10 gap-3">
                        <div className="text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-content-muted tracking-wider block mb-0.5">Precio total</span>
                            <span className="text-3xl font-black text-brand tracking-tight">{itinerary.total_price}€</span>
                        </div>
                        <button className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer">
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
                <div className="px-5 pb-5 border-t border-white/10 animate-in fade-in duration-300">
                    <div className="py-4 space-y-8">
                        {itinerary.legs.map((leg, legIndex) => (
                            <LegDetails key={legIndex} leg={leg} airportsMap={airportsMap} formatTime={formatTime} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function LegDetails({ leg, airportsMap, formatTime }: { leg: Leg, airportsMap: Map<string, GlobeAirportResponse>, formatTime: (s?: string) => string }) {
    const originAirport = airportsMap.get(leg.origin);
    const destinationAirport = airportsMap.get(leg.destination);

    return (
        <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3 text-xs text-content-muted font-medium">
                <div className="flex items-center gap-2">
                    <Ticket size={14} className="text-brand/70" />
                    <span>{leg.flight_number}</span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-brand/70" />
                    <span>{leg.airplane}</span>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <PlaneTakeoff size={18} className="text-origin shrink-0 mt-1" />
                <div className="flex flex-col">
                    <span className="font-bold text-white">{formatTime(leg.departure_time)} - {leg.origin}</span>
                    <span className="text-xs text-content-muted">{originAirport?.n}, {originAirport?.ci}</span>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <PlaneLanding size={18} className="text-destination shrink-0 mt-1" />
                <div className="flex flex-col">
                    <span className="font-bold text-white">{formatTime(leg.arrival_time)} - {leg.destination}</span>
                    <span className="text-xs text-content-muted">{destinationAirport?.n}, {destinationAirport?.ci}</span>
                </div>
            </div>
        </div>
    );
}