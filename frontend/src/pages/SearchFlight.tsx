import { useState, useEffect } from "react";
import Globe from "../components/Globe.tsx"
import { Plus, Bot, SlidersHorizontal, Globe as GlobeIcon, Maximize2, PlaneTakeoff, PlaneLanding, AlertTriangle, X, Plane, ChevronDown, ChevronRight, Search, Calendar as CalendarIcon } from "lucide-react";
import { useSearchRequest } from "@/api/generated/search/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import StarsBackground from "../components/ui/StarsBackground.tsx";
import ManualSearchForm from "../components/search/ManualSearchForm.tsx";

function SearchFlight() {
    const [origin, setOrigin] = useState("");
    const [originDisplay, setOriginDisplay] = useState("");
    const [destination, setDestination] = useState("");
    const [destinationDisplay, setDestinationDisplay] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [activeDeparturePopover, setActiveDeparturePopover] = useState<'main' | 'map' | null>(null);
    const [returnDate, setReturnDate] = useState("");
    const [activeReturnPopover, setActiveReturnPopover] = useState<'main' | 'map' | null>(null);
    const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
    const [selectingType, setSelectingType] = useState<'origin' | 'destination' | null>(null);
    const [globeReady, setGlobeReady] = useState(false);
    const [shouldCloseOnSelect, setShouldCloseOnSelect] = useState(false);
    const [searchMode, setSearchMode] = useState<'manual' | 'chatbot'>('manual');
    const today = new Date().toISOString().split('T')[0]!;
    const [isSMScreen, setIsSMScreen] = useState(window.innerWidth >= 640);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const [isXXLScreen, setIsXXLScreen] = useState(window.innerWidth >= 1536);
    const [isMobileCardExpanded, setIsMobileCardExpanded] = useState(false);
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsSMScreen(window.innerWidth >= 640);
            setIsLargeScreen(window.innerWidth >= 1024);
            setIsXXLScreen(window.innerWidth >= 1536);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        if (!isLargeScreen && isUserInteracting && isMobileCardExpanded) {
            setIsMobileCardExpanded(false);
        }
    }, [isUserInteracting, isLargeScreen, isMobileCardExpanded]);

    const { mutate: searchRequest, isPending } = useSearchRequest({
        mutation: {
            onSuccess: (data) => {
                toast.success("Búsqueda iniciada");
                navigate(`/search/${data._id}`);
            },
            onError: (error) => {
                console.error(error);
                toast.error(error?.message || "Error al buscar vuelos");
            }
        }
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const isCurrentYear = date.getFullYear() === new Date().getFullYear();

        if (isCurrentYear) {
            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }

    const handleMapSelect = (iata: string, display?: string) => {
        const displayText = display || iata;
        if (selectingType === 'origin') {
            if (iata === destination) {
                toast.error("El origen y el destino no pueden ser el mismo");
                return;
            }
            setOrigin(iata);
            setOriginDisplay(displayText);
        } else if (selectingType === 'destination') {
            if (iata === origin) {
                toast.error("El origen y el destino no pueden ser el mismo");
                return;
            }
            setDestination(iata);
            setDestinationDisplay(displayText);
        } else {
            if (!origin) {
                if (iata === destination) return;
                setOrigin(iata);
                setOriginDisplay(displayText);
            } else if (!destination && origin !== iata) {
                setDestination(iata);
                setDestinationDisplay(displayText);
            } else {
                if (iata === destination) return;
                setOrigin(iata);
                setOriginDisplay(displayText);
                setDestination("");
                setDestinationDisplay("");
            }
        }
        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const startMapSelection = (type: 'origin' | 'destination', fromMainCard: boolean = false) => {
        setSelectingType(type);
        setIsSelectingOnMap(true);
        setShouldCloseOnSelect(fromMainCard);
        if (!isLargeScreen) {
            setIsMobileCardExpanded(false);
        }
    }

    const [inspectedAirport, setInspectedAirport] = useState<{ iata: string; name: string; city: string; lat: number; lon: number } | null>(null);
    const [renderedAirport, setRenderedAirport] = useState<{ iata: string; name: string; city: string; lat: number; lon: number } | null>(null);
    const [isChanging, setIsChanging] = useState(false);

    const [isGlobeMoving, setIsGlobeMoving] = useState(false);

    const isVisible = !!(
        isSelectingOnMap &&
        inspectedAirport &&
        renderedAirport &&
        inspectedAirport.iata === renderedAirport.iata &&
        !isChanging &&
        !selectingType
    );


    useEffect(() => {
        if (!inspectedAirport) {
            setIsChanging(false);
            const timer = setTimeout(() => setRenderedAirport(null), 400); // Wait for fade out
            return () => clearTimeout(timer);
        }

        if (!renderedAirport) {
            setRenderedAirport(inspectedAirport);
            setIsChanging(false);
        } else if (renderedAirport.iata !== inspectedAirport.iata) {
            setIsChanging(true);
            const timer = setTimeout(() => {
                setRenderedAirport(inspectedAirport);
                setTimeout(() => setIsChanging(false), 50);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [inspectedAirport, renderedAirport?.iata]);

    useEffect(() => {
        if (!isSelectingOnMap) {
            setInspectedAirport(null);
        }
    }, [isSelectingOnMap]);

    const handleSetOrigin = (iata: string, display: string) => {
        if (iata === destination) {
            toast.error("El origen y el destino no pueden ser el mismo");
            return;
        }
        setOrigin(iata);
        setOriginDisplay(display);
        setInspectedAirport(null);

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleSetDestination = (iata: string, display: string) => {
        if (iata === origin) {
            toast.error("El origen y el destino no pueden ser el mismo");
            return;
        }
        setDestination(iata);
        setDestinationDisplay(display);
        setInspectedAirport(null);

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleSearch = () => {
        if (!origin || !destination || !departureDate) {
            toast.error("Por favor, completa origen, destino y fecha de salida");
            return;
        }

        const requestData = {
            origins: [origin],
            destinations: [destination],
            criteria: {
                priority: "balanced" as const,
            },
            departure_date: departureDate,
            return_date: returnDate || undefined,
        };

        searchRequest({
            data: requestData
        });
    }

    const renderManualSearch = (mode: 'main' | 'map') => {
        const isMapMode = mode === 'map';
        return (
            <ManualSearchForm
                origin={origin}
                originDisplay={originDisplay}
                setOrigin={(val, display) => {
                    setOrigin(val);
                    setOriginDisplay(display || val);
                }}
                destination={destination}
                destinationDisplay={destinationDisplay}
                setDestination={(val, display) => {
                    setDestination(val);
                    setDestinationDisplay(display || val);
                }}
                departureDate={departureDate}
                setDepartureDate={setDepartureDate}
                returnDate={returnDate}
                setReturnDate={setReturnDate}
                activeDeparturePopover={activeDeparturePopover === mode}
                setActiveDeparturePopover={(open) => setActiveDeparturePopover(open ? mode : null)}
                activeReturnPopover={activeReturnPopover === mode}
                setActiveReturnPopover={(open) => setActiveReturnPopover(open ? mode : null)}
                isPending={isPending}
                onSearch={handleSearch}
                startMapSelection={(type) => startMapSelection(type, !isMapMode)}
                selectingType={selectingType}
                isHorizontal={isMapMode && isLargeScreen}
                isMapMode={isMapMode}
                today={today}
            />
        );
    }


    return (
        <div className={`absolute inset-0 overflow-hidden transition-colors duration-700 ${!isLargeScreen && !isSelectingOnMap ? 'bg-main' : 'bg-black'}`}>
            {/* CSS Parallax Stars Background (Visible mainly on small screens when map is collapsed) */}
            <StarsBackground className={`transition-opacity duration-1000 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-30' : 'opacity-0'}`} />
            {/* Background Globe */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-700 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <Globe
                    onAirportSelect={selectingType ? handleMapSelect : undefined}
                    selectedAirports={[origin, destination, inspectedAirport?.iata].filter(Boolean) as string[]}
                    originIata={origin}
                    destinationIata={destination}
                    interactive={isSelectingOnMap && !(inspectedAirport && !isLargeScreen)}
                    horizontalOffset={isSelectingOnMap ? 0 : (isLargeScreen ? 258 : 0)}
                    onReady={() => setGlobeReady(true)}
                    onSetOrigin={handleSetOrigin}
                    onSetDestination={handleSetDestination}
                    onAirportClick={setInspectedAirport}
                    onMovementChange={(moving, interacting) => {
                        setIsGlobeMoving(moving);
                        setIsUserInteracting(interacting);
                    }}
                />
            </div>


            {/* Full-screen loading overlay — visible until Globe is fully ready */}
            <div className={`absolute inset-0 z-50 bg-main flex flex-col items-center justify-center gap-6 transition-opacity duration-700 pointer-events-none ${globeReady ? 'opacity-0' : 'opacity-100'}`}>
                <div className="relative flex items-center justify-center">
                    {/* Radar rings — staggered expanding pulses using brand color */}
                    <div className="absolute w-20 h-20 rounded-full border border-brand/40 animate-radar" style={{ animationDelay: '0s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/25 animate-radar" style={{ animationDelay: '0.8s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/15 animate-radar" style={{ animationDelay: '1.6s' }} />
                    <svg className="w-10 h-10 text-brand relative z-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-content-muted text-xs">Cargando globo terráqueo...</span>
                </div>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>

            {isSelectingOnMap && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 animate-fade-in-up w-[min(90vw,fit-content)]">
                    <div className="bg-main/85 backdrop-blur-3xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 w-auto">
                        <div className={`shrink-0 w-3 h-3 rounded-full ${selectingType ? 'animate-pulse bg-brand' : 'bg-content-muted/40'}`} />
                        <span className="text-sm text-content font-medium opacity-90 leading-tight grow-0">
                            {selectingType
                                ? `Selecciona ${selectingType === 'origin' ? 'origen' : 'destino'} en el mapa`
                                : "Explorando el globo terráqueo"}
                        </span>
                        <button
                            onClick={() => {
                                if (selectingType && !shouldCloseOnSelect) {
                                    setSelectingType(null);
                                } else {
                                    setIsSelectingOnMap(false);
                                    setSelectingType(null);
                                    setShouldCloseOnSelect(false);
                                }
                            }}
                            className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider cursor-pointer border border-red-500/20"
                        >
                            <X size={14} />
                            <span>{selectingType ? "Cancelar" : "Cerrar"}</span>
                        </button>
                    </div>
                </div>
            )}
            {/* 1. Normal/Vertical Card (Center on Mobile, Left on Desktop) - ONLY HOME SCREEN */}
            <div className={`absolute transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) z-10 ${!isSelectingOnMap
                ? 'left-1/2 lg:left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 lg:translate-x-0 opacity-100 scale-100'
                : 'left-1/2 lg:-left-full top-0 lg:top-1/2 -translate-y-[calc(100%+2rem)] lg:-translate-y-1/2 -translate-x-1/2 lg:translate-x-0 opacity-0 scale-95 pointer-events-none'
                }`}>
                <div className="premium-glass relative p-7 rounded-4xl flex flex-col gap-6 transition-all hover:scale-[1.01] w-[min(96vw,540px)]">

                    {/* Mobile Map Toggle Button */}
                    {!isLargeScreen && searchMode === 'manual' && !isSelectingOnMap && (
                        <button
                            onClick={() => {
                                setIsSelectingOnMap(true);
                                setIsMobileCardExpanded(false);
                            }}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-2xl border border-line px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 group hover:bg-surface transition-all active:scale-95 cursor-pointer z-30 whitespace-nowrap"
                        >
                            <GlobeIcon size={14} className="text-brand" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/90">Ver mapa 3D</span>
                        </button>
                    )}

                    {/* Desktop Expand Button */}
                    {isLargeScreen && searchMode === 'manual' && (
                        <button
                            onClick={() => setIsSelectingOnMap(true)}
                            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-24 bg-main/90 backdrop-blur-xl border border-line rounded-2xl shadow-xl flex items-center justify-center group hover:bg-brand hover:border-brand/40 transition-all active:scale-95 cursor-pointer z-30"
                            title="Expandir mapa"
                        >
                            <Maximize2 size={18} className="text-content-muted group-hover:text-content-on-brand transition-colors rotate-90" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                                <GlobeIcon size={40} className="text-white" />
                            </div>
                        </button>
                    )}

                    {/* Card header: title + mode toggle */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                            <h1 className="text-3xl font-bold text-content tracking-tight">Vuela más allá.</h1>
                            <p className="text-content-muted text-sm">Explora destinos mundiales con flAIghts.</p>
                        </div>

                        <div className="flex shrink-0 items-center bg-main/50 dark:bg-surface rounded-xl p-1 gap-0.5 border border-line mt-1">
                            <button
                                onClick={() => setSearchMode('manual')}
                                title="Búsqueda manual"
                                className={`p-2 rounded-lg transition-all ${searchMode === 'manual'
                                    ? 'bg-brand text-content-on-brand shadow-sm'
                                    : 'text-content-muted hover:text-content cursor-pointer'
                                    }`}
                            >
                                <SlidersHorizontal size={16} />
                            </button>
                            <button
                                onClick={() => setSearchMode('chatbot')}
                                title="Asistente IA"
                                className={`p-2 rounded-lg transition-all ${searchMode === 'chatbot'
                                    ? 'bg-brand text-content-on-brand shadow-sm'
                                    : 'text-content-muted hover:text-content cursor-pointer'
                                    }`}
                            >
                                <Bot size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 pt-2 mt-2">
                        {searchMode === 'manual' ? (
                            <>
                                {renderManualSearch('main')}
                                <div className="flex items-center justify-center gap-4 text-xs text-content-muted">
                                    <div className="flex items-center gap-1">
                                        <Plus size={12} className="text-brand" />
                                        <span>Añadir escala</span>
                                    </div>
                                    <div className="w-1 h-1 bg-line rounded-full" />
                                    <span>Filtros avanzados</span>
                                </div>
                            </>
                        ) : (
                            /* Chatbot mode panel */
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                                        <Bot size={28} className="text-brand" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-content font-semibold">Asistente flAIghts</span>
                                        <span className="text-content-muted text-sm">Próximamente — describe tu viaje ideal con IA</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-main/60 dark:bg-surface/60 border border-line rounded-2xl px-4 py-3 opacity-50 pointer-events-none">
                                    <Bot size={18} className="text-content-muted shrink-0" />
                                    <span className="text-content-muted text-sm">Ej: "Quiero ir a Tokio en verano por menos de 600€"</span>
                                </div>
                                <button disabled className="flex items-center justify-center gap-3 bg-brand/50 text-content-on-brand py-4 rounded-2xl font-bold text-base opacity-50 cursor-not-allowed">
                                    <Bot size={18} />
                                    <span>Preguntar al asistente</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Horizontal/Top Card (Only when general map expanded) */}
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isSelectingOnMap && !selectingType
                ? (isXXLScreen
                    ? 'top-6 w-[min(calc(100%-600px),1200px)] opacity-100 scale-100'
                    : isLargeScreen
                        ? 'top-6 w-[min(calc(100%-300px),1200px)] opacity-100 scale-100'
                        : isMobileCardExpanded
                            ? 'top-20 w-[calc(100%-20px)] opacity-100 scale-100'
                            : isSMScreen
                                ? 'top-4 w-[calc(100%-180px)] opacity-100 scale-100'
                                : 'top-4 w-[calc(100%-110px)] opacity-100 scale-100')
                : 'top-0 -translate-y-full opacity-0 scale-95 pointer-events-none'
                }`}>
                <div className={`premium-glass relative border border-line/50 flex flex-col transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${!isLargeScreen && isSelectingOnMap && !isMobileCardExpanded ? 'p-2 px-4 rounded-3xl' : 'p-3 lg:p-4 rounded-3xl lg:rounded-4xl'}`}>

                    {/* Summary Header (Only for Collapsible Drawer mode < 1024px) */}
                    {!isLargeScreen && (
                        <div
                            className="flex items-center justify-between gap-4 cursor-pointer select-none"
                            onClick={() => setIsMobileCardExpanded(!isMobileCardExpanded)}
                        >
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <h1 className={`font-bold text-content tracking-tight transition-all truncate ${!isMobileCardExpanded ? 'text-base' : 'text-xl'}`}>
                                    {isMobileCardExpanded ? (
                                        <div className="flex items-center gap-2">
                                            <Search size={16} className="text-brand shrink-0" />
                                            <span>Configura tu búsqueda</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Plane size={14} className="text-brand rotate-45 shrink-0" />
                                            <span>
                                                {origin && destination
                                                    ? `${origin.split('(')[1]?.replace(')', '') || origin} → ${destination.split('(')[1]?.replace(')', '') || destination}`
                                                    : "Detalle del viaje"}
                                            </span>
                                        </div>
                                    )}
                                </h1>
                                {!isMobileCardExpanded && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <span className="text-content-muted text-[10px] font-medium truncate">{originDisplay || "Origen"}</span>
                                            <ChevronRight size={8} className="text-content-muted/30 shrink-0" />
                                            <span className="text-content-muted text-[10px] font-medium truncate">{destinationDisplay || "Destino"}</span>
                                        </div>
                                        {departureDate && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-content-muted/20 shrink-0" />
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <CalendarIcon size={8} className="text-brand/60" />
                                                    <span className="text-content-muted text-[10px] font-medium">{formatDate(departureDate)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-2 rounded-full bg-surface border border-line shadow-sm">
                                <ChevronDown size={14} className={`text-content-muted transition-transform duration-300 ${isMobileCardExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                    )}

                    {/* Content Container */}
                    <div className={`${!isLargeScreen ? `transition-all duration-500 overflow-hidden ${!isMobileCardExpanded ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100 mt-4'}` : 'flex flex-row items-center gap-4 overflow-hidden'}`}>
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-4 w-full min-w-0 opacity-100 scale-100">
                            {/* Minimized Header (Fixed Horizontal Bar Only) */}
                            {isXXLScreen && (
                                <div className="hidden lg:flex items-center gap-2 px-3 border-r border-line/10 h-10 shrink-0">
                                    <Plane size={18} className="text-brand fill-brand rotate-45" />
                                    <h1 className="text-lg font-black text-brand tracking-tighter italic uppercase">flAIghts</h1>
                                </div>
                            )}
                            {renderManualSearch('map')}
                        </div>
                    </div>

                    {/* Mobile/Tablet Collapse Button (Only for Expanded Drawer) */}
                    {!isLargeScreen && isSelectingOnMap && isMobileCardExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMobileCardExpanded(false);
                            }}
                            className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-2xl border border-line px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 group hover:bg-surface transition-all active:scale-95 cursor-pointer z-30 whitespace-nowrap animate-fade-in"
                        >
                            <ChevronDown size={14} className="text-brand rotate-180 transition-transform group-active:-translate-y-1" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/90">Plegar búsqueda</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Airport Info Card */}
            <div className={`absolute z-5 w-[min(90vw,320px)] transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) ${!isLargeScreen
                ? `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${isVisible
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`
                : `right-6 lg:right-12 top-1/2 -translate-y-1/2 ${isVisible
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 translate-x-12 scale-95 pointer-events-none'
                }`
                }`}>
                <div className="bg-white/95 dark:bg-main/60 backdrop-blur-3xl p-6 rounded-3xl border border-line/50 shadow-2xl flex flex-col gap-5 overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-brand uppercase font-bold tracking-[0.2em]">Aeropuerto</span>
                            <h2 className="text-2xl font-bold text-content tracking-tight">{renderedAirport?.iata}</h2>
                        </div>
                        <button
                            onClick={() => setInspectedAirport(null)}
                            className="p-2 hover:bg-surface rounded-xl text-content-muted transition-colors cursor-pointer"
                        >
                            <Plus size={18} className="rotate-45" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Nombre</span>
                            <span className="text-content font-medium">{renderedAirport?.name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Ciudad / Región</span>
                            <span className="text-content font-medium">{renderedAirport?.city}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Latitud</span>
                                <span className="text-content text-xs font-mono">{renderedAirport?.lat.toFixed(4)}°</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Longitud</span>
                                <span className="text-content text-xs font-mono">{renderedAirport?.lon.toFixed(4)}°</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                        <button
                            onClick={() => renderedAirport && handleSetOrigin(renderedAirport.iata, `${renderedAirport.city || renderedAirport.name} (${renderedAirport.iata})`)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-origin/10 hover:bg-origin/20 border border-origin/20 rounded-2xl text-origin text-xs font-bold transition-all group/btn cursor-pointer"
                        >
                            <PlaneTakeoff size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" />
                            Definir como Origen
                        </button>
                        <button
                            onClick={() => renderedAirport && handleSetDestination(renderedAirport.iata, `${renderedAirport.city || renderedAirport.name} (${renderedAirport.iata})`)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-destination/10 hover:bg-destination/20 border border-destination/20 rounded-2xl text-destination text-xs font-bold transition-all group/btn cursor-pointer"
                        >
                            <PlaneLanding size={14} className="group-hover/btn:translate-y-0.5 transition-transform" />
                            Definir como Destino
                        </button>
                        <button
                            onClick={() => { }}
                            className="flex items-center justify-center gap-1.5 self-center mt-3 text-[9px] font-bold text-red-500/60 hover:text-red-500 transition-all cursor-pointer group/report"
                        >
                            <AlertTriangle size={10} className="group-hover/report:animate-pulse" />
                            <span className="italic underline-offset-2 hover:underline">Reportar error en los datos</span>
                        </button>
                    </div>
                </div>
            </div >
        </div >
    )
}

export default SearchFlight;
