import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Globe from "../components/Globe.tsx"
import { Plus, Bot, SlidersHorizontal, Globe as GlobeIcon, Maximize2, PlaneTakeoff, PlaneLanding, AlertTriangle, X, Plane, ChevronDown, ChevronRight, Search, Calendar as CalendarIcon } from "lucide-react";
import { useSearchRequest } from "@/api/generated/search/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AirportResponse } from "@/api/generated/model";
import StarsBackground from "../components/ui/StarsBackground.tsx";
import ManualSearchForm from "../components/search/ManualSearchForm.tsx";
import type { Layover } from "../components/search/ManualSearchForm.tsx";
import NavIconButton from "../components/ui/NavIconButton.tsx";

function SearchFlight() {
    const { t } = useTranslation();
    const [origin, setOrigin] = useState<AirportResponse | null>(null);
    const [destination, setDestination] = useState<AirportResponse | null>(null);
    const [departureDate, setDepartureDate] = useState("");
    const [activeDeparturePopover, setActiveDeparturePopover] = useState<'main' | 'map' | null>(null);
    const [returnDate, setReturnDate] = useState("");
    const [activeReturnPopover, setActiveReturnPopover] = useState<'main' | 'map' | null>(null);
    const [layovers, setLayovers] = useState<Layover[]>([]);
    const [layoverPopoverOpen, setLayoverPopoverOpen] = useState<string | null>(null);
    const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
    const [selectingType, setSelectingType] = useState<'origin' | 'destination' | string | null>(null);
    const [globeReady, setGlobeReady] = useState(false);
    const [shouldCloseOnSelect, setShouldCloseOnSelect] = useState(false);
    const [searchMode, setSearchMode] = useState<'manual' | 'chatbot'>('manual');
    const today = new Date().toISOString().split('T')[0]!;
    const [isSMScreen, setIsSMScreen] = useState(window.innerWidth >= 640);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const [isXXLScreen, setIsXXLScreen] = useState(window.innerWidth >= 1536);
    const [isMobileCardExpanded, setIsMobileCardExpanded] = useState(false);
    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

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
                toast.success(t("searchFlight.toast.searchStarted"));
                navigate(`/search/${data._id}`);
            },
            onError: (error) => {
                console.error(error);
                toast.error(error?.message || t("searchFlight.toast.searchError"));
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
            if (airport.iata_code === destination?.iata_code) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return;
            }
            setOrigin(airport);
        } else if (selectingType === 'destination') {
            if (airport.iata_code === origin?.iata_code) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return;
            }
            setDestination(airport);
        } else if (selectingType?.startsWith('layover-')) {
            const index = parseInt(selectingType.split('-')[1]!);
            const iata = airport.iata_code;
            if (iata === origin?.iata_code || iata === destination?.iata_code || layovers.some((l, i) => i !== index && l.airport?.iata_code === iata)) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
            } else {
                const newLayovers = [...layovers];
                const existing = newLayovers[index]!;
                newLayovers[index] = { airport, date: existing.date };
                setLayovers(newLayovers);
            }
        } else {
            if (!origin) {
                if (airport.iata_code === destination?.iata_code) return;
                setOrigin(airport);
            } else if (!destination && origin.iata_code !== airport.iata_code) {
                setDestination(airport);
            } else {
                if (airport.iata_code === destination?.iata_code) return;
                setOrigin(airport);
                setDestination(null);
            }
        }
        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const startMapSelection = (type: 'origin' | 'destination' | string, fromMainCard: boolean = false) => {
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

    useEffect(() => {
        if (!isSelectingOnMap) {
            setInspectedAirport(null);
        }
    }, [isSelectingOnMap]);

    const handleSetOrigin = (airport: AirportResponse) => {
        if (airport.iata_code === destination?.iata_code) {
            toast.error(t("searchFlight.validation.sameOriginDestination"));
            return;
        }
        setOrigin(airport);
        setInspectedAirport(null);

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleSetDestination = (airport: AirportResponse) => {
        if (airport.iata_code === origin?.iata_code) {
            toast.error(t("searchFlight.validation.sameOriginDestination"));
            return;
        }
        setDestination(airport);
        setInspectedAirport(null);

        if (shouldCloseOnSelect) {
            setIsSelectingOnMap(false);
            setShouldCloseOnSelect(false);
        }
        setSelectingType(null);
    }

    const handleAddStop = () => {
        if (layovers.length >= 5) {
            toast.error(t("searchFlight.validation.maxLayovers"));
            return;
        }
        setLayovers([...layovers, { airport: null, date: "" }]);
    };

    const handleRemoveLayover = (index: number) => {
        const newLayovers = [...layovers];
        newLayovers.splice(index, 1);
        setLayovers(newLayovers);
    };

    const handleLayoverAirportChange = (index: number, airport: AirportResponse | null): boolean => {
        if (airport) {
            const iata = airport.iata_code;
            if (iata === origin?.iata_code || iata === destination?.iata_code || layovers.some((l, i) => i !== index && l.airport?.iata_code === iata)) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return false;
            }
        }
        const newLayovers = [...layovers];
        const existing = newLayovers[index]!;
        newLayovers[index] = { airport, date: existing.date };
        setLayovers(newLayovers);
        return true;
    };

    const handleLayoverDateChange = (index: number, date: string) => {
        const newLayovers = [...layovers];
        const existing = newLayovers[index]!;
        newLayovers[index] = { airport: existing.airport, date };
        setLayovers(newLayovers);
    };

    const handleSearch = () => {
        if (!origin || !destination || !departureDate || layovers.some(l => !l.airport || !l.date)) {
            toast.error(t("searchFlight.validation.completeFields"));
            return;
        }

        const requestData = {
            origins: [origin.iata_code],
            destinations: [...layovers.map(l => l.airport!.iata_code), destination.iata_code],
            dates: [...layovers.map(l => l.date)],
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
                setOrigin={setOrigin}
                destination={destination}
                setDestination={setDestination}
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
                layovers={layovers}
                onLayoverAirportChange={handleLayoverAirportChange}
                onLayoverDateChange={handleLayoverDateChange}
                onRemoveLayover={handleRemoveLayover}
                layoverPopoverOpen={layoverPopoverOpen}
                setLayoverPopoverOpen={setLayoverPopoverOpen}
                mode={mode}
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
                    origin={origin}
                    destination={destination}
                    layovers={layovers}
                    selectedAirports={[...layovers.map(l => l.airport?.iata_code).filter(Boolean) as string[], inspectedAirport?.iata_code].filter(Boolean) as string[]}
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
                    focusIata={inspectedAirport?.iata_code}
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
                    <span className="text-content-muted text-xs">{t("searchFlight.loading.loadingGlobe")}</span>
                </div>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>

            {/* Map Action HUD (Always rendered for smooth entry/exit transition) */}
            <div
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 w-[min(90vw,fit-content)] transition-all duration-500 ease-out
                    ${isSelectingOnMap
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-12 scale-90 pointer-events-none'}`}
            >
                {/* Floating Action Button (Unified with System HUD) */}
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

                    {/* Floating Search Button (Animate in place above the bar) */}
                    <div className={`absolute bottom-full mb-4 transition-all duration-400 ${!isLargeScreen && !isMobileCardExpanded && !selectingType
                        ? 'animate-fade-in opacity-100 scale-100 visible'
                        : 'animate-fade-out opacity-0 scale-95 invisible pointer-events-none'
                        }`}>
                        <button
                            onClick={handleSearch}
                            disabled={isPending || !origin || !destination || !departureDate}
                            className="group relative flex items-center justify-center gap-2.5 px-6 py-3 bg-brand text-content-on-brand rounded-xl font-bold shadow-[0_15px_40px_rgba(var(--brand-rgb),0.25)] active:scale-95 transition-all outline-hidden disabled:opacity-50 disabled:grayscale cursor-pointer overflow-hidden w-auto"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isPending ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t("searchFlight.actions.searching")}</span>
                                </div>
                            ) : (
                                <>
                                    <Search size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-sm">{t("searchFlight.search")}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {/* 1. Normal/Vertical Card (Center on Mobile, Left on Desktop) - ONLY HOME SCREEN */}
            <div className={`absolute transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-10 ${!isSelectingOnMap
                ? 'left-1/2 lg:left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 lg:translate-x-0 scale-100'
                : 'left-1/2 lg:-left-150 top-0 lg:top-1/2 -translate-y-[150%] lg:-translate-y-1/2 -translate-x-1/2 lg:translate-x-0 scale-95 pointer-events-none'
                }`}>
                <div className="premium-glass relative p-7 rounded-4xl flex flex-col gap-6 transition-all hover:scale-[1.01] w-[min(96vw,540px)] overflow-visible">

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
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/90">{t("searchFlight.mapButtons.viewMap3D")}</span>
                        </button>
                    )}

                    {/* Desktop Expand Button */}
                    {isLargeScreen && searchMode === 'manual' && (
                        <button
                            onClick={() => setIsSelectingOnMap(true)}
                            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-24 bg-main/90 backdrop-blur-xl border border-line rounded-2xl shadow-xl flex items-center justify-center group hover:bg-brand hover:border-brand/40 transition-all active:scale-95 cursor-pointer z-30"
                            title={t("searchFlight.tooltips.expandMap")}
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
                            <h1 className="text-3xl font-bold text-content tracking-tight">{t("searchFlight.title")}</h1>
                            <p className="text-content-muted text-sm">{t("searchFlight.subtitle")}</p>
                        </div>

                        <div className="flex shrink-0 items-center bg-main/50 dark:bg-surface rounded-xl p-1 gap-0.5 border border-line mt-1">
                            <button
                                onClick={() => setSearchMode('manual')}
                                title={t("searchFlight.tooltips.selectMapTitle")}
                                className={`p-2 rounded-lg transition-all ${searchMode === 'manual'
                                    ? 'bg-brand text-content-on-brand shadow-sm'
                                    : 'text-content-muted hover:text-content cursor-pointer'
                                    }`}
                            >
                                <SlidersHorizontal size={16} />
                            </button>
                            <button
                                onClick={() => setSearchMode('chatbot')}
                                title={t("searchFlight.tooltips.selectAssistant")}
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
                                    <button
                                        onClick={handleAddStop}
                                        disabled={layovers.length >= 5}
                                        className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={12} className="text-brand" />
                                        <span>{t("searchFlight.additionalOptions.addStop")}</span>
                                    </button>
                                    <div className="w-1 h-1 bg-line rounded-full" />
                                    <button className="hover:text-brand transition-colors cursor-pointer">
                                        <span>{t("searchFlight.additionalOptions.advancedFilters")}</span>
                                    </button>
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
                                                    ? `${origin.iata_code} → ${destination.iata_code}`
                                                    : "Configuración del viaje"}
                                            </span>
                                        </div>
                                    )}
                                </h1>
                                {!isMobileCardExpanded && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <span className="text-content-muted text-[10px] font-medium truncate">{origin ? (origin.city || origin.name || origin.iata_code) : "Origen"}</span>
                                            <ChevronRight size={8} className="text-content-muted/30 shrink-0" />
                                            <span className="text-content-muted text-[10px] font-medium truncate">{destination ? (destination.city || destination.name || destination.iata_code) : "Destino"}</span>
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

                    {/* Content Container */}
                    <div className={`${!isLargeScreen ? `transition-all duration-500 ${!isMobileCardExpanded ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-200 opacity-100 mt-4 overflow-visible!'}` : 'flex flex-row items-center gap-4 overflow-visible'}`}>
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

            {/* Mobile Click-away Backdrop */}
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
                                <span className="text-[10px] text-brand uppercase font-bold tracking-[0.2em]">{t("searchFlight.labels2.airport")}</span>
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
                                <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels2.name")}</span>
                                <span className="text-content font-medium">{renderedAirport?.name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels2.city")}</span>
                                <span className="text-content font-medium">{renderedAirport?.city}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels2.latitude")}</span>
                                    <span className="text-content text-xs font-mono">{renderedAirport?.location?.coordinates[1]?.toFixed(4)}°</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels2.longitude")}</span>
                                    <span className="text-content text-xs font-mono">{renderedAirport?.location?.coordinates[0]?.toFixed(4)}°</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-col gap-2">
                            <button
                                onClick={() => renderedAirport && handleSetOrigin(renderedAirport)}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-origin/10 hover:bg-origin/20 border border-origin/20 rounded-2xl text-origin text-xs font-bold transition-all group/btn cursor-pointer"
                            >
                                <PlaneTakeoff size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" />
                                {t("searchFlight.mapButtons.defineAsOrigin")}
                            </button>
                            <button
                                onClick={() => renderedAirport && handleSetDestination(renderedAirport)}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-destination/10 hover:bg-destination/20 border border-destination/20 rounded-2xl text-destination text-xs font-bold transition-all group/btn cursor-pointer"
                            >
                                <PlaneLanding size={14} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                {t("searchFlight.mapButtons.defineAsDestination")}
                            </button>
                            <button
                                onClick={() => { }}
                                className="flex items-center justify-center gap-1.5 self-center mt-3 text-[9px] font-bold text-red-500/60 hover:text-red-500 transition-all cursor-pointer group/report"
                            >
                                <AlertTriangle size={10} className="group-hover/report:animate-pulse" />
                                <span className="italic underline-offset-2 hover:underline">{t("searchFlight.mapButtons.reportError")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    )
}

export default SearchFlight;
