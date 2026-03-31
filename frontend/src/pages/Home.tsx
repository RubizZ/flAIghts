import { useState, useEffect, useRef } from "react";
import Globe from "../components/Globe.tsx"
import { Plus, Globe as GlobeIcon, Maximize2, PlaneTakeoff, PlaneLanding, X, Plane, ChevronDown, ChevronRight, Search, Calendar as CalendarIcon } from "lucide-react";
import { useSearchRequest } from "@/api/generated/search/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AirportResponse } from "@/api/generated/model";
import StarsBackground from "../components/ui/StarsBackground.tsx";
import ManualSearchForm from "../components/search/ManualSearchForm.tsx";
import NavIconButton from "../components/ui/NavIconButton.tsx";
import HomeCard from "../components/home/HomeCard.tsx";

export default function Home() {
    const [origins, setOrigins] = useState<AirportResponse[]>([]);
    const [destinations, setDestinations] = useState<AirportResponse[]>([]);
    const [departureDate, setDepartureDate] = useState("");
    const [activeDeparturePopover, setActiveDeparturePopover] = useState<'main' | 'map' | null>(null);
    const [returnDate, setReturnDate] = useState("");
    const [activeReturnPopover, setActiveReturnPopover] = useState<'main' | 'map' | null>(null);
    const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
    const [selectingType, setSelectingType] = useState<'origin' | 'destination' | null>(null);
    const [globeReady, setGlobeReady] = useState(false);
    const [shouldCloseOnSelect, setShouldCloseOnSelect] = useState(false);
    const today = new Date().toISOString().split('T')[0]!;
    const [isSMScreen, setIsSMScreen] = useState(window.innerWidth >= 640);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const [isXXLScreen, setIsXXLScreen] = useState(window.innerWidth >= 1536);
    const [isMobileCardExpanded, setIsMobileCardExpanded] = useState(false);
    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
    const [isInteractionSuppressed, setIsInteractionSuppressed] = useState(false);
    const [initialMousePos, setInitialMousePos] = useState<{ x: number, y: number } | null>(null);
    const [searchMode, setSearchMode] = useState<'manual' | 'ai'>(() => {
        const saved = localStorage.getItem('searchMode');
        return (saved === 'manual' || saved === 'ai') ? saved : 'manual';
    });

    useEffect(() => {
        localStorage.setItem('searchMode', searchMode);
    }, [searchMode]);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn("Geolocation Error:", error.message);
                }
            );
        }
    }, []);

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
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
        }
    }

    const handleMapSelect = (airport: AirportResponse) => {
        if (selectingType === 'origin') {
            if (destinations.some(d => d.iata_code === airport.iata_code)) {
                toast.error("El origen y el destino no pueden ser el mismo");
                return;
            }
            if (origins.some(o => o.iata_code === airport.iata_code)) {
                toast.error("Ese aeropuerto ya está seleccionado como origen");
                return;
            }
            setOrigins([...origins, airport]);
        } else if (selectingType === 'destination') {
            if (origins.some(o => o.iata_code === airport.iata_code)) {
                toast.error("El origen y el destino no pueden ser el mismo");
                return;
            }
            if (destinations.some(d => d.iata_code === airport.iata_code)) {
                toast.error("Ese aeropuerto ya está seleccionado como destino");
                return;
            }
            setDestinations([...destinations, airport]);
        } else {
            // Default logic if not specifically selecting for one side (e.g. from general map click)
            if (origins.length === 0) {
                if (destinations.some(d => d.iata_code === airport.iata_code)) return;
                setOrigins([airport]);
            } else if (destinations.length === 0 && !origins.some(o => o.iata_code === airport.iata_code)) {
                setDestinations([airport]);
            } else {
                if (destinations.some(d => d.iata_code === airport.iata_code)) return;
                setOrigins([airport]);
                setDestinations([]);
            }
        }

        // Si el usuario selecciona algo del mapa, pasamos a modo manual para que lo vea en la tarjeta
        setSearchMode('manual');

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

    const [inspectedAirport, setInspectedAirport] = useState<AirportResponse | null>(null);
    const [renderedAirport, setRenderedAirport] = useState<AirportResponse | null>(null);
    const [isChanging, setIsChanging] = useState(false);
    const [isGlobeMoving, setIsGlobeMoving] = useState(false);

    const isCardVisible = !!(isSelectingOnMap && inspectedAirport && renderedAirport && !selectingType && !isChanging);
    const isContentVisible = isCardVisible;

    useEffect(() => {
        if (!inspectedAirport) {
            setIsChanging(false);
            const timer = setTimeout(() => setRenderedAirport(null), 400); // Wait for fade out
            return () => clearTimeout(timer);
        }

        if (!renderedAirport) {
            setRenderedAirport(inspectedAirport);
            setIsChanging(false);
        } else if (renderedAirport.iata_code !== inspectedAirport.iata_code) {
            setIsChanging(true);
            const timer = setTimeout(() => {
                setRenderedAirport(inspectedAirport);
                setTimeout(() => setIsChanging(false), 50);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [inspectedAirport, renderedAirport?.iata_code]);

    const wasOpenRef = useRef(isSelectingOnMap);
    useEffect(() => {
        if (!isSelectingOnMap && wasOpenRef.current) {
            setIsInteractionSuppressed(true);
            setInitialMousePos(null);
        }
        wasOpenRef.current = isSelectingOnMap;
    }, [isSelectingOnMap]);

    useEffect(() => {
        if (!isInteractionSuppressed) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!initialMousePos) {
                setInitialMousePos({ x: e.clientX, y: e.clientY });
                return;
            }

            const dx = e.clientX - initialMousePos.x;
            const dy = e.clientY - initialMousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 150) {
                setIsInteractionSuppressed(false);
                setInitialMousePos(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isInteractionSuppressed, initialMousePos]);

    useEffect(() => {
        if (!isSelectingOnMap) {
            setInspectedAirport(null);
        }
    }, [isSelectingOnMap]);

    const handleSetOrigin = (airport: AirportResponse) => {
        if (destinations.some(d => d.iata_code === airport.iata_code)) {
            toast.error("El origen y el destino no pueden ser el mismo");
            return;
        }
        if (origins.some(o => o.iata_code === airport.iata_code)) {
            toast.error("Ese aeropuerto ya está seleccionado como origen");
            return;
        }
        setOrigins([...origins, airport]);
        setInspectedAirport(null);
        setSearchMode('manual');

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleSetDestination = (airport: AirportResponse) => {
        if (origins.some(o => o.iata_code === airport.iata_code)) {
            toast.error("El origen y el destino no pueden ser el mismo");
            return;
        }
        if (destinations.some(d => d.iata_code === airport.iata_code)) {
            toast.error("Ese aeropuerto ya está seleccionado como destino");
            return;
        }
        setDestinations([...destinations, airport]);
        setInspectedAirport(null);
        setSearchMode('manual');

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleSearch = () => {
        if (origins.length === 0 || destinations.length === 0 || !departureDate) {
            toast.error("Por favor, completa origen, destino y fecha de salida");
            return;
        }

        const requestData = {
            origins: origins.map(o => o.iata_code),
            destinations: destinations.map(d => d.iata_code),
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
                origins={origins}
                setOrigins={setOrigins}
                destinations={destinations}
                setDestinations={setDestinations}
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
            <StarsBackground className={`transition-opacity duration-1000 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-30' : 'opacity-0'}`} />

            {/* Mobile Explore Button at the very bottom */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-700 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <Globe
                    onAirportSelect={selectingType ? handleMapSelect : undefined}
                    selectedAirports={[...origins.map(o => o.iata_code), ...destinations.map(d => d.iata_code), inspectedAirport?.iata_code].filter(Boolean) as string[]}
                    origins={origins}
                    destinations={destinations}
                    interactive={isSelectingOnMap && !(inspectedAirport && !isLargeScreen)}
                    horizontalOffset={isSelectingOnMap ? 0 : (isLargeScreen ? 306 : 0)}
                    onReady={() => setGlobeReady(true)}
                    onSetOrigin={handleSetOrigin}
                    onSetDestination={handleSetDestination}
                    onAirportClick={setInspectedAirport}
                    onMovementChange={(moving, interacting) => {
                        setIsGlobeMoving(moving);
                        setIsUserInteracting(interacting);
                    }}
                    focusIata={inspectedAirport?.iata_code}
                />
            </div>

            {/* Background Interaction Overlay - Restricted to a centered square over the globe */}
            {!isSelectingOnMap && !isInteractionSuppressed && isLargeScreen && (
                <div
                    onClick={() => setIsSelectingOnMap(true)}
                    className={`absolute top-1/2 left-1/2 -translate-y-1/2 z-5 cursor-pointer group flex items-center justify-center overflow-hidden w-[100vh] h-[100vh] rounded-[4rem] transition-all duration-700 ${isLargeScreen ? '-translate-x-[calc(50%-306px)]' : '-translate-x-1/2'}`}
                >
                    <div className={`flex flex-col items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-95 group-hover:scale-100 bg-black/10 backdrop-blur-sm px-10 py-8 rounded-[2.5rem] border border-white/5 shadow-2xl`}>
                        <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center shadow-[0_0_30px_rgba(var(--brand-rgb),0.3)] animate-radar-slow">
                            <Maximize2 size={24} className="text-white animate-pulse" />
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-white font-black uppercase tracking-[0.4em] text-[10px] text-center drop-shadow-lg">Interacción 3D</span>
                            <div className="h-px w-8 bg-white/20" />
                            <span className="text-white/60 text-[9px] font-bold uppercase tracking-widest text-center drop-shadow-sm">Haz clic para explorar el mapa</span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`absolute inset-0 z-50 bg-main flex flex-col items-center justify-center gap-6 transition-opacity duration-700 pointer-events-none ${globeReady ? 'opacity-0' : 'opacity-100'}`}>
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 rounded-full border border-brand/40 animate-radar" style={{ animationDelay: '0s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/25 animate-radar" style={{ animationDelay: '0.8s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/15 animate-radar" style={{ animationDelay: '1.6s' }} />
                    <svg className="w-10 h-10 text-brand relative z-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-content-muted text-xs font-bold uppercase tracking-widest">flAIghts está despegando...</span>
                </div>
            </div>

            <div
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 w-[min(90vw,fit-content)] transition-all duration-500 ease-out
                    ${isSelectingOnMap
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-12 scale-90 pointer-events-none'}`}
            >
                <div className="relative flex flex-col items-center w-full">
                    <NavIconButton
                        onClick={() => {
                            if (selectingType && !shouldCloseOnSelect) {
                                setSelectingType(null);
                            } else {
                                setIsSelectingOnMap(false);
                                setSelectingType(null);
                                setShouldCloseOnSelect(false);
                            }
                        }}
                        variant="floating"
                        isPill={true}
                        className={`h-14! px-8! text-red-500 hover:bg-red-500! hover:text-white! border-red-500/20! z-10 transition-all
                            ${selectingType ? 'animate-pulse bg-red-500/10! border-red-500/40!' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap leading-none">
                                {selectingType ? "Cancelar selección" : "Cerrar mapa"}
                            </span>
                        </div>
                    </NavIconButton>

                    <div className={`absolute bottom-full mb-4 transition-all duration-400 ${!isLargeScreen && !isMobileCardExpanded && !selectingType
                        ? 'animate-fade-in opacity-100 scale-100 visible'
                        : 'animate-fade-out opacity-0 scale-95 invisible pointer-events-none'
                        }`}>
                        <button
                            onClick={handleSearch}
                            disabled={isPending || origins.length === 0 || destinations.length === 0 || !departureDate}
                            className="group relative flex items-center justify-center gap-2.5 px-6 py-3 bg-brand text-content-on-brand rounded-xl font-bold shadow-[0_15px_40px_rgba(var(--brand-rgb),0.25)] active:scale-95 transition-all outline-hidden disabled:opacity-50 disabled:grayscale cursor-pointer overflow-hidden w-auto"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isPending ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Buscando...</span>
                                </div>
                            ) : (
                                <>
                                    <Search size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-sm">Buscar vuelos</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Search Card */}
            <div className={`absolute transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-10 ${!isSelectingOnMap
                ? 'left-1/2 lg:left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 lg:translate-x-0 scale-100'
                : 'left-1/2 lg:-left-150 top-0 lg:top-1/2 -translate-y-[150%] lg:-translate-y-1/2 -translate-x-1/2 lg:translate-x-0 scale-95 pointer-events-none'
                }`}>
                <div className="relative">
                    <HomeCard
                        origins={origins}
                        setOrigins={setOrigins}
                        destinations={destinations}
                        setDestinations={setDestinations}
                        departureDate={departureDate}
                        setDepartureDate={setDepartureDate}
                        returnDate={returnDate}
                        setReturnDate={setReturnDate}
                        today={today}
                        isPending={isPending}
                        onSearch={handleSearch}
                        startMapSelection={(type) => startMapSelection(type, true)}
                        activeDeparturePopover={activeDeparturePopover}
                        setActiveDeparturePopover={setActiveDeparturePopover}
                        activeReturnPopover={activeReturnPopover}
                        setActiveReturnPopover={setActiveReturnPopover}
                        userLocation={userLocation}
                        onExploreGlobe={() => {
                            setIsSelectingOnMap(true);
                            setIsMobileCardExpanded(false);
                        }}
                        searchMode={searchMode}
                        onSearchModeChange={setSearchMode}
                    />
                </div>
            </div>

            {/* Horizontal/Top Card (Only when general map expanded) */}
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isSelectingOnMap && !selectingType
                ? (isXXLScreen
                    ? 'top-6 w-[min(calc(100%-400px),1200px)] scale-100'
                    : isLargeScreen
                        ? 'top-6 w-[min(calc(100%-300px),1200px)] scale-100'
                        : isMobileCardExpanded
                            ? 'top-20 w-[calc(100%-20px)] scale-100'
                            : isSMScreen
                                ? 'top-4 w-[calc(100%-180px)] scale-100'
                                : 'top-4 w-[calc(100%-140px)] scale-100')
                : 'top-0 -translate-y-[200%] scale-95 pointer-events-none'
                }`}>
                <div className={`premium-glass relative border border-line/50 flex flex-col transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${!isLargeScreen && isSelectingOnMap && !isMobileCardExpanded ? 'p-2 px-4 rounded-3xl' : 'p-3 lg:p-4 rounded-3xl lg:rounded-4xl'}`}>
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
                                                {origins.length > 0 && destinations.length > 0
                                                    ? `${origins[0]?.iata_code || '???'}${origins.length > 1 ? '...' : ''} → ${destinations[0]?.iata_code || '???'}${destinations.length > 1 ? '...' : ''}`
                                                    : "Configuración del viaje"}
                                            </span>
                                        </div>
                                    )}
                                </h1>
                                {!isMobileCardExpanded && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <span className="text-content-muted text-[10px] font-medium truncate">{origins.length > 0 ? (origins[0]?.city || origins[0]?.name || origins[0]?.iata_code || "Origen") + (origins.length > 1 ? ` +${origins.length - 1}` : '') : "Origen"}</span>
                                            <ChevronRight size={8} className="text-content-muted/30 shrink-0" />
                                            <span className="text-content-muted text-[10px] font-medium truncate">{destinations.length > 0 ? (destinations[0]?.city || destinations[0]?.name || destinations[0]?.iata_code || "Destino") + (destinations.length > 1 ? ` +${destinations.length - 1}` : '') : "Destino"}</span>
                                        </div>
                                        {(departureDate || returnDate) && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-content-muted/20 shrink-0" />
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <CalendarIcon size={8} className="text-brand/60" />
                                                    <span className="text-content-muted text-[10px] font-medium">
                                                        {departureDate && formatDate(departureDate)}
                                                        {departureDate && returnDate && " - "}
                                                        {returnDate && formatDate(returnDate)}
                                                    </span>
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

                    <div className={`${!isLargeScreen ? `transition-all duration-500 ${!isMobileCardExpanded ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-200 opacity-100 mt-4 overflow-visible!'}` : 'flex flex-row items-center gap-4 overflow-visible'}`}>
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-4 w-full min-w-0 opacity-100 scale-100">
                            {renderManualSearch('map')}
                        </div>
                    </div>

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

                {/* Floating validation bubble attached to the card summary (detalles) ONLY ON MOBILE */}
                {origins.length > 0 && destinations.length > 0 && !departureDate && !isMobileCardExpanded && !isLargeScreen && (
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-2xl border border-white/20 animate-bounce flex items-center gap-1.5 whitespace-nowrap z-50">
                        <CalendarIcon size={10} />
                        <span>Falta fecha de salida</span>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
                    </div>
                )}
            </div>

            {!isLargeScreen && isCardVisible && (
                <div
                    className="absolute inset-0 z-25 cursor-default bg-black/5 backdrop-blur-[1px] animate-fade-in"
                    onClick={() => setInspectedAirport(null)}
                />
            )}

            {/* Airport Info Card */}
            <div className={`absolute z-30 w-[min(90vw,320px)] transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${!isLargeScreen
                ? `left-1/2 top-1/2 -translate-y-1/2 ${isCardVisible
                    ? '-translate-x-1/2 opacity-100'
                    : 'translate-x-[100vw] opacity-100 pointer-events-none'
                }`
                : `right-6 lg:right-12 top-1/2 -translate-y-1/2 ${isCardVisible
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-[150%] opacity-100 pointer-events-none'
                }`
                }`}>
                <div className="premium-glass p-6 rounded-3xl shadow-2xl overflow-hidden group">
                    <div className={`flex flex-col gap-5 transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-brand uppercase font-bold tracking-[0.2em]">Aeropuerto</span>
                                <h2 className="text-2xl font-bold text-content tracking-tight">{renderedAirport?.iata_code}</h2>
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
                                <span className="text-xs text-content-muted uppercase font-bold tracking-wider">Nombre</span>
                                <span className="text-content font-medium">{renderedAirport?.name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-content-muted uppercase font-bold tracking-wider">Ciudad / Región</span>
                                <span className="text-content font-medium">{renderedAirport?.city}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line/50">
                                <div className="flex flex-col">
                                    <span className="text-xs text-content-muted uppercase font-bold tracking-wider">Latitud</span>
                                    <span className="text-content text-xs font-mono">{renderedAirport?.location?.coordinates[1]?.toFixed(4)}°</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-content-muted uppercase font-bold tracking-wider">Longitud</span>
                                    <span className="text-content text-xs font-mono">{renderedAirport?.location?.coordinates[0]?.toFixed(4)}°</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-col gap-2">
                            <button
                                onClick={() => renderedAirport && handleSetOrigin(renderedAirport)}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-2xl text-brand text-xs font-black uppercase transition-all group/btn cursor-pointer"
                            >
                                <PlaneTakeoff size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" />
                                Definir como Origen
                            </button>
                            <button
                                onClick={() => renderedAirport && handleSetDestination(renderedAirport)}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-2xl text-brand text-xs font-black uppercase transition-all group/btn cursor-pointer"
                            >
                                <PlaneLanding size={14} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                Definir como Destino
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    )
}
