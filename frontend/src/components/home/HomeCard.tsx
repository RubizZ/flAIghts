import { useState, useRef, useEffect } from "react";
import { Plus, Globe as GlobeIcon, Calendar as CalendarIcon, Sparkles, SlidersHorizontal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AirportResponse } from "@/api/generated/openapi/model";
import { UnifiedSelection } from "@/types/selection";
import ManualSearchForm from "../search/ManualSearchForm";
import AgentChat, { ExtendedChatMessage } from "./AgentChat";

interface HomeCardProps {
    origins: UnifiedSelection[];
    setOrigins: (selections: UnifiedSelection[]) => void;
    destinations: UnifiedSelection[];
    setDestinations: (selections: UnifiedSelection[]) => void;
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
    onHoverChange?: (entity: UnifiedSelection | null, type?: 'origin' | 'destination') => void;
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
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
    const chatRef = useRef<any>(null);

    const [localMode, setLocalMode] = useState<'manual' | 'ai'>(searchMode);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Efecto para orquestar la animación cuando cambia el modo global
    useEffect(() => {
        if (searchMode !== localMode) {
            setIsTransitioning(true);

            const timeoutId = setTimeout(() => {
                setLocalMode(searchMode);
                setIsTransitioning(false);
            }, 200);


            return () => clearTimeout(timeoutId);
        }
    }, [searchMode, localMode]);



    const handleModeSwitch = (newMode: 'manual' | 'ai') => {
        if (newMode === searchMode || isTransitioning) return;
        onSearchModeChange?.(newMode);
    };

    return (
        <div className={`premium-glass relative rounded-4xl flex flex-col transition-all duration-300 ease-in-out overflow-visible w-[min(96vw,580px)] ${localMode === 'ai' ? 'h-[calc(100svh-160px)] lg:h-[min(720px,85vh)]' : 'h-auto max-h-[calc(100svh-140px)]'} p-5 lg:p-7 gap-4 lg:gap-6 ${className}`}>

            {/* Card header: title & mode toggle */}
            <div className="flex flex-col gap-6 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                    {/* Mode Segmented Control */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 lg:relative lg:top-0 lg:left-0 lg:translate-x-0 z-40 lg:order-2 flex-none sm:scale-100">
                        <div className="bg-surface/90 dark:bg-main/90 backdrop-blur-3xl p-1 gap-1.5 rounded-2xl border border-line flex items-center shrink-0 shadow-2xl transition-all duration-300 w-fit">
                            <div className="relative flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5 border border-line/10 overflow-hidden flex-none">
                                <div
                                    className={`absolute inset-y-0.5 transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) bg-brand shadow-[0_2px_10px_rgba(var(--brand-rgb),0.3)] rounded-[10px] ${searchMode === 'ai' ? 'left-0.5 right-1/2' : 'left-1/2 right-0.5'}`}
                                />

                                <button
                                    onClick={() => handleModeSwitch('ai')}
                                    className={`relative z-10 w-32.5 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors duration-200 flex-none ${searchMode === 'ai' ? 'text-content-on-brand' : 'text-content-muted hover:text-content cursor-pointer'}`}
                                >
                                    <Sparkles size={14} className={searchMode === 'ai' ? 'animate-pulse' : 'opacity-70'} />
                                    <span>{t('homeCard.aiAssistant')}</span>
                                </button>

                                <button
                                    onClick={() => handleModeSwitch('manual')}
                                    className={`relative z-10 w-32.5 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors duration-200 flex-none ${searchMode === 'manual' ? 'text-content-on-brand' : 'text-content-muted hover:text-content cursor-pointer'}`}
                                >
                                    <SlidersHorizontal size={14} className={searchMode === 'manual' ? '' : 'opacity-70'} />
                                    <span>{t('homeCard.manual')}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Title & Subtitle - ONLY VISIBLE ON DESKTOP */}
                    <div className={`order-2 lg:order-1 pt-4 lg:pt-0 hidden lg:grid grid-cols-1 grid-rows-1 ${localMode === 'ai' ? 'grid' : 'grid'}`}>
                        <div className={`col-start-1 row-start-1 flex flex-col gap-0.5 items-center lg:items-start text-center lg:text-left transition-all duration-300 ${localMode === 'manual' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                            <h1 className="font-bold text-content tracking-tight text-3xl">{t('homeCard.manualTitle')}</h1>
                            <p className="text-content-muted text-[13px]">{t('homeCard.manualSubtitle')}<span className="text-brand">AI</span>ghts.</p>
                        </div>

                        <div className={`col-start-1 row-start-1 flex flex-col gap-0.5 items-center lg:items-start text-center lg:text-left transition-all duration-300 ${localMode === 'ai' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            <h1 className="font-bold text-content tracking-tight text-3xl">
                                Agente fl<span className="text-brand">AI</span>ghts
                            </h1>
                            <p className="text-content-muted text-[13px]">{t('homeCard.aiSubtitle')}</p>
                        </div>

                    </div>
                </div>
            </div>

            <div className={`flex-1 min-h-0 flex flex-col transition-all duration-200 ${isTransitioning ? 'opacity-0 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                {localMode === 'manual' ? (
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-4 lg:gap-5">
                        <div className="lg:hidden flex flex-col items-center gap-0.5 mb-1 animate-fade-in-up">
                            <h2 className="font-bold text-content tracking-tight text-2xl">Explorar vuelos</h2>
                            <p className="text-content-muted text-[11px]">Encuentra tu próximo destino mundial</p>
                        </div>
                        {onExploreGlobe && (
                            <div className="lg:hidden flex flex-col gap-5 animate-fade-in-up">
                                <button
                                    onClick={onExploreGlobe}
                                    className="mx-auto bg-surface/90 dark:bg-main/90 backdrop-blur-3xl px-5 py-2.5 rounded-full border border-line flex items-center gap-2.5 shadow-2xl active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                                >
                                    <GlobeIcon size={14} className="text-brand" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-content">{t('homeCard.exploreGlobe')}</span>
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
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 w-full h-full relative group">
                        {messages.length > 0 && (
                            <button
                                onClick={() => chatRef.current?.clearChat()}
                                className="absolute top-2 left-2 z-20 p-2 text-content-muted hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl border border-line/30 bg-surface/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                                title="Limpiar chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
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
    );
}
