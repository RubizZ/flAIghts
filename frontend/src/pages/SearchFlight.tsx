import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Globe from "../components/Globe.tsx"
import { ArrowLeftRight, Plus, Calendar as CalendarIcon, MapPin, Search, Bot, SlidersHorizontal, Globe as GlobeIcon, Maximize2, Info, PlaneTakeoff, PlaneLanding, AlertTriangle, X, Plane } from "lucide-react";
import AirportAutocomplete from "../components/AirportAutocomplete.tsx";
import { useSearchRequest } from "@/api/generated/search/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Calendar from "../components/ui/Calendar.tsx";
import Tooltip from "../components/ui/Tooltip.tsx";

function SearchFlight() {
    const { t } = useTranslation();
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
    const today = new Date().toISOString().split('T')[0];
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navigate = useNavigate();

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

    const handleSwitch = () => {
        const temp = origin;
        setOrigin(destination);
        setDestination(temp);
        const tempDisplay = originDisplay;
        setOriginDisplay(destinationDisplay);
        setDestinationDisplay(tempDisplay);
    }

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
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return;
            }
            setOrigin(iata);
            setOriginDisplay(displayText);
        } else if (selectingType === 'destination') {
            if (iata === origin) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
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
        !selectingType &&
        !isGlobeMoving
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
                // Wait a tiny bit for React to render new content before fading back in
                setTimeout(() => setIsChanging(false), 50);
            }, 400); // Match or slightly exceed CSS transition duration
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
            toast.error(t("searchFlight.validation.sameOriginDestination"));
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
            toast.error(t("searchFlight.validation.sameOriginDestination"));
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
            toast.error(t("searchFlight.validation.completeFields"));
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
        const isHorizontal = mode === 'map';
        return (
            <div className={`grow ${isHorizontal ? 'flex flex-col md:flex-row items-stretch gap-2 md:gap-3 lg:gap-4 w-full' : 'flex flex-col gap-3'}`}>
                {/* ── ORIGIN & DESTINATION ── */}
                <div className={`relative flex gap-2 lg:gap-3 items-center grow ${isHorizontal ? 'flex-col md:flex-row' : 'flex-col items-stretch'}`}>
                    {/* Origin */}
                    <div className={`group flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 transition-all focus-within:border-brand/60 py-2.5 lg:py-3 ${isHorizontal ? 'flex-[2.5] min-w-0' : 'w-full'}`}>
                        <MapPin className={`shrink-0 transition-colors ${origin ? 'text-origin' : 'text-content-muted'}`} size={18} />
                        <div className="flex flex-col grow min-w-0">
                            <span className="text-[9px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels.origin")}</span>
                            <AirportAutocomplete
                                placeholder={t("searchFlight.placeholders.origin")}
                                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full text-sm lg:text-base font-sans"
                                value={origin}
                                displayValue={originDisplay}
                                onChange={(val, display) => {
                                    if (val === destination && val !== "") {
                                        toast.error(t("searchFlight.validation.sameOriginDestination"));
                                        return false;
                                    } else {
                                        setOrigin(val);
                                        setOriginDisplay(display || val);
                                        return true;
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={() => startMapSelection('origin', !isHorizontal)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${selectingType === 'origin' ? 'text-brand bg-brand/10' : 'text-content-muted hover:bg-surface hover:text-brand'}`}
                            title="Seleccionar en el mapa"
                        >
                            <Search size={16} />
                        </button>
                    </div>

                    {/* Switch Button */}
                    <button
                        onClick={handleSwitch}
                        className={`shrink-0 bg-brand text-content-on-brand rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-main z-20 ${isHorizontal ? 'p-1.5 self-center md:self-auto' : 'absolute right-6 top-[50%] -translate-y-1/2 p-2.5 border-4'}`}
                    >
                        <ArrowLeftRight size={16} />
                    </button>

                    {/* Destination */}
                    <div className={`group flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 transition-all focus-within:border-brand/60 py-2.5 lg:py-3 ${isHorizontal ? 'flex-[2.5] min-w-0' : 'w-full'}`}>
                        <MapPin className={`shrink-0 transition-colors ${destination ? 'text-destination' : 'text-content-muted'}`} size={18} />
                        <div className="flex flex-col grow min-w-0">
                            <span className="text-[9px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels.destination")}</span>
                            <AirportAutocomplete
                                placeholder={t("searchFlight.placeholders.destination")}
                                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full text-sm lg:text-base font-sans"
                                value={destination}
                                displayValue={destinationDisplay}
                                onChange={(val, display) => {
                                    if (val === origin && val !== "") {
                                        toast.error(t("searchFlight.validation.sameOriginDestination"));
                                        return false;
                                    } else {
                                        setDestination(val);
                                        setDestinationDisplay(display || val);
                                        return true;
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={() => startMapSelection('destination', !isHorizontal)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${selectingType === 'destination' ? 'text-brand bg-brand/10' : 'text-content-muted hover:bg-surface hover:text-brand'}`}
                            title="Seleccionar en el mapa"
                        >
                            <Search size={16} />
                        </button>
                    </div>
                </div>

                {/* ── DATES ── */}
                <div className={`grid gap-2 shrink-0 ${isHorizontal ? 'grid-cols-2 md:w-64 lg:w-76' : 'grid-cols-2'}`}>
                    <Calendar
                        isOpen={activeDeparturePopover === mode}
                        setIsOpen={(val) => setActiveDeparturePopover(val ? mode : null)}
                        value={departureDate}
                        onChange={(date) => {
                            setDepartureDate(date);
                            setActiveDeparturePopover(null);
                            if (returnDate && date > returnDate) {
                                setReturnDate("");
                            }
                        }}
                        minDate={today}
                        trigger={
                            <div
                                onClick={() => setActiveDeparturePopover(activeDeparturePopover === mode ? null : mode)}
                                className="flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 transition-all cursor-pointer group relative py-2.5 lg:py-3 h-full"
                            >
                                <CalendarIcon className={`shrink-0 transition-colors ${departureDate ? 'text-origin' : 'text-content-muted'}`} size={16} />
                                <div className="flex flex-col grow min-w-0">
                                    <span className="text-[9px] text-content-muted uppercase font-bold tracking-wider text-left">{t("searchFlight.labels.departure")}</span>
                                    <div className="relative h-4 lg:h-5 flex items-center">
                                        <span className={`truncate text-sm lg:text-base text-left font-sans ${departureDate ? 'text-content' : 'text-content-muted/50 font-normal'}`}>
                                            {departureDate ? formatDate(departureDate) : t("searchFlight.placeholders.selectDate")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        }
                        contentClassName="w-[380px] bg-main/90 backdrop-blur-3xl border border-line shadow-2xl rounded-3xl"
                    />

                    {/* Return Date */}
                    <div className="relative flex min-w-0">
                        <Tooltip content={t("searchFlight.tooltips.selectFirstDate")} disabled={!!departureDate} position="bottom">
                            <Calendar
                                isOpen={activeReturnPopover === mode}
                                setIsOpen={(val) => setActiveReturnPopover(val ? mode : null)}
                                value={returnDate}
                                onChange={(date) => {
                                    setReturnDate(date);
                                    setActiveReturnPopover(null);
                                }}
                                minDate={departureDate || today}
                                defaultMonth={departureDate}
                                trigger={
                                    <div
                                        onClick={() => departureDate && setActiveReturnPopover(activeReturnPopover === mode ? null : mode)}
                                        className={`flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 transition-all relative group w-full focus-within:border-brand/60 py-2.5 lg:py-3 h-full ${!departureDate ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <CalendarIcon className={`shrink-0 transition-colors ${returnDate ? 'text-destination' : 'text-content-muted'}`} size={16} />
                                        <div className="flex flex-col grow min-w-0 text-left">
                                            <span className="text-[9px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels.return")}</span>
                                            <div className="relative h-4 lg:h-5 flex items-center">
                                                <span className={`truncate text-sm lg:text-base font-sans ${returnDate ? 'text-content' : 'text-content-muted/50 font-normal'}`}>
                                                    {returnDate ? formatDate(returnDate) : t("searchFlight.placeholders.selectDate")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                }
                                contentClassName="w-[380px] bg-main/90 backdrop-blur-3xl border border-line shadow-2xl rounded-3xl"
                            />
                        </Tooltip>

                        {returnDate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setReturnDate("");
                                }}
                                className="absolute -right-1 -top-1 bg-surface text-content-muted p-1 rounded-full border border-line hover:text-red-500 transition-all shadow-sm z-20 cursor-pointer"
                            >
                                <Plus size={10} className="rotate-45" />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isPending || !origin || !destination || !departureDate}
                    className={`group relative flex items-center justify-center gap-2 bg-brand text-content-on-brand rounded-2xl font-bold hover:bg-brand-hover transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-brand/20 active:scale-95 shrink-0 px-8 cursor-pointer ${isHorizontal ? 'w-full md:w-40 py-3.5 md:py-0' : 'py-4 lg:py-4.5 text-lg'}`}
                >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isPending ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{t("searchFlight.actions.searching")}</span>
                        </div>
                    ) : (
                        <>
                            <Search size={18} />
                            <span>{isHorizontal ? t("searchFlight.actions.search") : t("searchFlight.actions.exploreFlights")}</span>
                        </>
                    )}
                </button>
            </div>
        );
    }


    return (
        <div className="absolute inset-0 overflow-hidden bg-black">
            {/* Background Globe */}
            <div className="absolute inset-0 z-0 opacity-100">
                <Globe
                    onAirportSelect={selectingType ? handleMapSelect : undefined}
                    selectedAirports={[origin, destination, inspectedAirport?.iata].filter(Boolean) as string[]}
                    originIata={origin}
                    destinationIata={destination}
                    interactive={isSelectingOnMap}
                    horizontalOffset={isSelectingOnMap ? 0 : (isLargeScreen ? 258 : 0)}
                    onReady={() => setGlobeReady(true)}
                    onSetOrigin={handleSetOrigin}
                    onSetDestination={handleSetDestination}
                    onAirportClick={setInspectedAirport}
                    onMovementChange={setIsGlobeMoving}
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
                    <span className="text-content font-semibold text-lg tracking-tight">flAIghts</span>
                    <span className="text-content-muted text-xs">{t("searchFlight.loading.loadingGlobe")}</span>
                </div>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>

            {isSelectingOnMap && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 animate-fade-in-up">
                    <div className="bg-main/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${selectingType ? 'animate-pulse bg-brand' : 'bg-content-muted/40'}`} />
                        <span className="text-content font-medium opacity-90">
                            {selectingType
                                ? t(`searchFlight.mapSelection.selecting${selectingType === 'origin' ? 'Origin' : 'Destination'}`)
                                : t("searchFlight.mapSelection.exploring")}
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
                            className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider cursor-pointer border border-red-500/20"
                        >
                            <X size={14} />
                            <span>{selectingType ? t("searchFlight.mapSelection.cancelSelection") : t("searchFlight.mapSelection.closeMap")}</span>
                        </button>
                    </div>
                </div>
            )}
            {/* 1. Normal/Vertical Card (Center on Mobile, Left on Desktop) */}
            <div className={`absolute transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) z-20 ${!isSelectingOnMap
                ? 'left-1/2 lg:left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 lg:translate-x-0 opacity-100 scale-100'
                : 'left-1/2 lg:-left-full top-0 lg:top-1/2 -translate-y-[calc(100%+2rem)] lg:-translate-y-1/2 -translate-x-1/2 lg:translate-x-0 opacity-0 scale-95 pointer-events-none'
                }`}>
                <div className="relative bg-main/85 backdrop-blur-3xl p-6 sm:p-8 rounded-4xl border border-line shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col gap-6 sm:gap-8 transition-all hover:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.5)] w-[min(94vw,420px)]">

                    {/* Mobile Map Toggle Button */}
                    {!isLargeScreen && searchMode === 'manual' && (
                        <button
                            onClick={() => setIsSelectingOnMap(true)}
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
                            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-24 bg-surface/80 backdrop-blur-xl border border-line rounded-2xl shadow-xl flex items-center justify-center group hover:bg-brand hover:border-brand/40 transition-all active:scale-95 cursor-pointer z-30"
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

                        <div className="flex shrink-0 items-center bg-surface rounded-xl p-1 gap-0.5 border border-line mt-1">
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

                    {searchMode === 'manual' ? (
                        <>
                            {renderManualSearch('main')}
                            <div className="flex items-center justify-center gap-4 text-xs text-content-muted">
                                <div className="flex items-center gap-1">
                                    <Plus size={12} className="text-brand" />
                                    <span>{t("searchFlight.additionalOptions.addStop")}</span>
                                </div>
                                <div className="w-1 h-1 bg-line rounded-full" />
                                <span>{t("searchFlight.additionalOptions.advancedFilters")}</span>
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
                                    <span className="text-content font-semibold">{t("searchFlight.chatbot.title")}</span>
                                    <span className="text-content-muted text-sm">{t("searchFlight.chatbot.comingSoon")}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 py-3 opacity-50 pointer-events-none">
                                <Bot size={18} className="text-content-muted shrink-0" />
                                <span className="text-content-muted text-sm">{t("searchFlight.chatbot.placeholder")}</span>
                            </div>
                            <button disabled className="flex items-center justify-center gap-3 bg-brand/50 text-content-on-brand py-4 rounded-2xl font-bold text-base opacity-50 cursor-not-allowed">
                                <Bot size={18} />
                                <span>{t("searchFlight.chatbot.askAssistant")}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Horizontal/Top Card (Only when general map expanded) */}
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 w-[min(96%,1240px)] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isSelectingOnMap && !selectingType
                ? 'top-20 2xl:top-6 translate-y-0 opacity-100 scale-100'
                : 'top-0 -translate-y-full opacity-0 scale-95 pointer-events-none'
                }`}>
                <div className={`relative bg-main/85 backdrop-blur-3xl p-3 md:p-2 lg:p-3 md:pr-3 lg:pr-4 rounded-3xl lg:rounded-4xl border border-line shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center gap-2 lg:gap-4 transition-all duration-500 ${isGlobeMoving ? 'opacity-20 scale-95 pointer-events-none lg:opacity-100 lg:scale-100 lg:pointer-events-auto' : 'opacity-100 scale-100'}`}>
                    {/* Minimized Header */}
                    <div className="hidden lg:flex items-center gap-2 px-4 border-r border-line/10 h-10">
                        <Plane size={18} className="text-brand fill-brand rotate-45" />
                        <h1 className="text-xl font-black text-brand tracking-tighter italic uppercase">flAIghts</h1>
                    </div>
                    {renderManualSearch('map')}
                </div>
            </div>

            {/* Airport Info Card (Right Side) */}
            <div className={`absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 z-10 w-[min(90vw,320px)] transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) ${isVisible
                ? 'opacity-100 translate-x-0 scale-100'
                : 'opacity-0 translate-x-12 scale-95 pointer-events-none'
                }`}>
                <div className="bg-main/85 backdrop-blur-2xl p-6 rounded-3xl border border-line shadow-2xl flex flex-col gap-5 overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-brand uppercase font-bold tracking-[0.2em]">{t("searchFlight.labels2.airport")}</span>
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
                                <span className="text-content text-xs font-mono">{renderedAirport?.lat.toFixed(4)}°</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{t("searchFlight.labels2.longitude")}</span>
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
                            {t("searchFlight.mapButtons.defineAsOrigin")}
                        </button>
                        <button
                            onClick={() => renderedAirport && handleSetDestination(renderedAirport.iata, `${renderedAirport.city || renderedAirport.name} (${renderedAirport.iata})`)}
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
            </div >
        </div >
    )
}

export default SearchFlight;
