import { useState, useRef, useEffect } from "react";
import { Plus, Globe as GlobeIcon, Calendar as CalendarIcon, Sparkles, SlidersHorizontal, Trash2 } from "lucide-react";
import { AirportResponse } from "@/api/generated/openapi/model";
import ManualSearchForm from "../search/ManualSearchForm";
import AgentChat, { ExtendedChatMessage } from "./AgentChat";

interface HomeCardProps {
    origins: AirportResponse[];
    setOrigins: (airports: AirportResponse[]) => void;
    destinations: AirportResponse[];
    setDestinations: (airports: AirportResponse[]) => void;
    departureDate: string;
    setDepartureDate: (date: string) => void;
    returnDate: string;
    setReturnDate: (date: string) => void;
    today: string;
    isPending: boolean;
    onSearch: () => void;
    startMapSelection: (type: 'origin' | 'destination') => void;
    activeDeparturePopover: 'main' | 'map' | null;
    setActiveDeparturePopover: (popover: 'main' | 'map' | null) => void;
    activeReturnPopover: 'main' | 'map' | null;
    setActiveReturnPopover: (popover: 'main' | 'map' | null) => void;
    onExploreGlobe?: () => void;
    searchMode?: 'manual' | 'ai';
    onSearchModeChange?: (mode: 'manual' | 'ai') => void;
    className?: string;
    onHoverChange?: (airport: AirportResponse | null) => void;
}

export default function HomeCard({
    origins,
    setOrigins,
    destinations,
    setDestinations,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,
    today,
    isPending,
    onSearch,
    startMapSelection,
    activeDeparturePopover,
    setActiveDeparturePopover,
    activeReturnPopover,
    setActiveReturnPopover,
    onExploreGlobe,
    searchMode = 'manual',
    onSearchModeChange,
    className = "",
    onHoverChange
}: HomeCardProps) {
    const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
    const chatRef = useRef<any>(null);

    const [localMode, setLocalMode] = useState<'manual' | 'ai'>(searchMode);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Efecto para orquestar la animación cuando cambia el modo global
    useEffect(() => {
        if (searchMode !== localMode) {
            setIsTransitioning(true); // Empieza a colapsar inmediatamente

            const timeoutId = setTimeout(() => {
                setLocalMode(searchMode); // Tras 400ms (colapsado), cambiamos el contenido
                setTimeout(() => setIsTransitioning(false), 50); // Expandimos
            }, 400);

            return () => clearTimeout(timeoutId);
        }
    }, [searchMode, localMode]);

    const handleModeSwitch = (newMode: 'manual' | 'ai') => {
        if (newMode === searchMode || isTransitioning) return;
        // Notificamos al instante al padre. Esto mueve el slider y cambia títulos ya mismo.
        onSearchModeChange?.(newMode);
    };

    return (
        <div className={`premium-glass relative rounded-4xl flex flex-col transition-all duration-700 ease-in-out w-[min(96vw,580px)] h-auto max-h-[calc(100dvh-200px)] lg:max-h-[700px] p-5 lg:p-7 gap-6 lg:gap-8 ${className}`}>

            {/* Card header: title & mode toggle */}
            <div className="flex flex-col gap-6 shrink-0">
                {/* Responsive Header Wrapper */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                    {/* Mode Segmented Control - Wider Fixed Size */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 lg:relative lg:top-0 lg:left-0 lg:translate-x-0 z-40 lg:order-2 flex-none sm:scale-100">
                        <div className="bg-surface/90 dark:bg-main/90 backdrop-blur-3xl p-1 gap-1.5 rounded-2xl border border-line flex items-center shrink-0 shadow-2xl transition-all duration-700 w-fit">
                            {searchMode === 'ai' && messages.length > 0 && (
                                <button
                                    onClick={() => chatRef.current?.clearChat()}
                                    className="p-2 text-content-muted hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl border border-line/30 animate-fade-in shrink-0 cursor-pointer"
                                    title="Limpiar chat"
                                >
                                    <Trash2 size={14} />
                                </button>

                            )}

                            <div className="relative flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5 border border-line/10 overflow-hidden flex-none">
                                {/* Sliding Background Indicator - Wider Math */}
                                <div
                                    className={`absolute inset-y-0.5 transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1) bg-brand shadow-[0_2px_10px_rgba(var(--brand-rgb),0.3)] rounded-[10px] ${searchMode === 'ai' ? 'left-0.5 w-[calc(50%-1px)]' : 'left-1/2 w-[calc(50%-0.5px)]'
                                        }`}
                                />

                                <button
                                    onClick={() => handleModeSwitch('ai')}
                                    className={`relative z-10 w-32.5 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors duration-300 flex-none ${searchMode === 'ai' ? 'text-content-on-brand' : 'text-content-muted hover:text-content cursor-pointer'
                                        }`}
                                >
                                    <Sparkles size={14} className={searchMode === 'ai' ? 'animate-pulse' : 'opacity-70'} />
                                    <span>Asistente IA</span>
                                </button>

                                <button
                                    onClick={() => handleModeSwitch('manual')}
                                    className={`relative z-10 w-32.5 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors duration-300 flex-none ${searchMode === 'manual' ? 'text-content-on-brand' : 'text-content-muted hover:text-content cursor-pointer'
                                        }`}
                                >
                                    <SlidersHorizontal size={14} className={searchMode === 'manual' ? '' : 'opacity-70'} />
                                    <span>Manual</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Title & Subtitle - Middle on mobile, left on desktop */}
                    <div className={`order-2 lg:order-1 pt-4 lg:pt-0 grid grid-cols-1 grid-rows-1 ${searchMode === 'ai' ? 'hidden lg:grid' : 'grid'}`}>
                        {/* Manual Mode Title */}
                        <div className={`col-start-1 row-start-1 flex flex-col gap-0.5 items-center lg:items-start text-center lg:text-left transition-all duration-700 ${searchMode === 'manual' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                            <h1 className="font-bold text-content tracking-tight text-3xl">Vuela más allá.</h1>
                            <p className="text-content-muted text-[13px]">Explora destinos mundiales con flAIghts.</p>
                        </div>

                        {/* AI Mode Title */}
                        <div className={`col-start-1 row-start-1 flex flex-col gap-0.5 items-center lg:items-start text-center lg:text-left transition-all duration-700 ${searchMode === 'ai' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            <h1 className="font-bold text-content tracking-tight text-3xl flex items-center gap-3">
                                Agente flAIghts
                            </h1>
                            <p className="text-content-muted text-[13px]">Tu copiloto inteligente para planificar viajes.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`grid w-full flex-1 min-h-0 transition-[grid-template-rows,opacity] duration-400 ease-in-out ${isTransitioning ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="overflow-hidden flex flex-col min-h-0 w-full h-full">
                    {localMode === 'manual' ? (
                        <div className="flex flex-col gap-6 w-full">
                            {/* Mobile Explore Globe Button - Improved Placement */}
                            {onExploreGlobe && (
                                <div className="lg:hidden flex flex-col gap-5 animate-fade-in-up">
                                    <button
                                        onClick={onExploreGlobe}
                                        className="mx-auto bg-surface/90 dark:bg-main/90 backdrop-blur-3xl px-5 py-2.5 rounded-full border border-line flex items-center gap-2.5 shadow-2xl active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        <GlobeIcon size={14} className="text-brand" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-content">Explorar globo terráqueo</span>
                                    </button>

                                    <div className="flex items-center gap-4 px-2">
                                        <div className="flex-1 h-px bg-line/20" />
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-line/20 bg-main/5 text-[9px] font-black text-content-muted uppercase tracking-tighter">o</div>
                                        <div className="flex-1 h-px bg-line/20" />
                                    </div>
                                </div>
                            )}

                            <ManualSearchForm
                                origins={origins}
                                setOrigins={setOrigins}
                                destinations={destinations}
                                setDestinations={setDestinations}
                                departureDate={departureDate}
                                setDepartureDate={setDepartureDate}
                                returnDate={returnDate}
                                setReturnDate={setReturnDate}
                                activeDeparturePopover={activeDeparturePopover === 'main'}
                                setActiveDeparturePopover={(open) => setActiveDeparturePopover(open ? 'main' : null)}
                                activeReturnPopover={activeReturnPopover === 'main'}
                                setActiveReturnPopover={(open) => setActiveReturnPopover(open ? 'main' : null)}
                                isPending={isPending}
                                onSearch={onSearch}
                                startMapSelection={startMapSelection}
                                selectingType={null}
                                isHorizontal={false}
                                isMapMode={false}
                                today={today}
                                onHoverChange={onHoverChange}
                            />
                            <div className="flex items-center justify-center gap-4 text-xs text-content-muted pb-2">
                                <div className="flex items-center gap-1">
                                    <Plus size={12} className="text-brand" />
                                    <span>Añadir escala</span>
                                </div>
                                <div className="w-1 h-1 bg-line rounded-full" />
                                <div className="flex items-center gap-1">
                                    <SlidersHorizontal size={12} className="text-brand" />
                                    <span>Filtros avanzados</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0 w-full h-full">
                            <AgentChat
                                ref={chatRef}
                                messages={messages}
                                setMessages={setMessages}
                                origins={origins}
                                destinations={destinations}
                                departureDate={departureDate}
                                returnDate={returnDate}
                                setReturnDate={setReturnDate}
                                setOrigins={setOrigins}
                                setDestinations={setDestinations}
                                setDepartureDate={setDepartureDate}
                            />
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
