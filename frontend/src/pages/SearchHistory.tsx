import { useState, UIEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGetSearchesInfinite } from "@/api/generated/openapi/search";
import SearchCard from "@/components/search/SearchCard";
import { 
    Filter, 
    Search as SearchIcon, 
    X, 
    History, 
    SlidersHorizontal,
    PlaneTakeoff,
    PlaneLanding,
    CreditCard,
    Calendar as CalendarIcon,
    ArrowLeft,
    ChevronDown,
    Globe,
    Lock,
    Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import Calendar from "@/components/ui/Calendar";
import { useShareSearch, usePrivatizeSearch } from "@/api/generated/openapi/search";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SearchHistory() {
    const { user, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    
    // Hooks de compartir/privatizar
    const { mutate: shareSearch, isPending: isSharing } = useShareSearch({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['infinite'] });
                toast.success("Búsqueda ahora es pública");
            },
            onError: () => toast.error("Error al compartir la búsqueda")
        }
    });

    const { mutate: privatizeSearch, isPending: isPrivatizing } = usePrivatizeSearch({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['infinite'] });
                toast.success("Búsqueda ahora es privada");
            },
            onError: () => toast.error("Error al privatizar la búsqueda")
        }
    });

    const toggleShare = (searchId: string, isShared: boolean) => {
        if (isShared) {
            privatizeSearch({ searchId });
        } else {
            shareSearch({ searchId });
        }
    };
    
    // Filtros
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [status, setStatus] = useState("");
    const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [isFilterMobileOpen, setIsFilterMobileOpen] = useState(false);
    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
    const [isStartCalendarMobileOpen, setIsStartCalendarMobileOpen] = useState(false);
    const [isEndCalendarMobileOpen, setIsEndCalendarMobileOpen] = useState(false);

    const {
        data: searchesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useGetSearchesInfinite(
        user?._id || "", 
        { 
            limit: 10,
            origin: origin || undefined,
            destination: destination || undefined,
            status: status || undefined,
            minPrice,
            maxPrice,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        },
        {
            query: {
                enabled: !!user?._id && isAuthenticated,
                refetchOnWindowFocus: false,
            }
        }
    );

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const clearFilters = () => {
        setOrigin("");
        setDestination("");
        setStatus("");
        setMinPrice(undefined);
        setMaxPrice(undefined);
        setStartDate("");
        setEndDate("");
    };

    if (!isAuthenticated) return null;

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto w-full p-4 sm:p-8 gap-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link 
                        to={`/user/${user?._id}`}
                        className="p-2 hover:bg-surface rounded-full transition-colors border border-line"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-content-muted text-xs font-black uppercase tracking-widest opacity-60">
                            <History size={12} />
                            <span>Exploración</span>
                        </div>
                        <h1 className="text-3xl font-black text-content tracking-tight">Historial de búsquedas</h1>
                    </div>
                </div>

                <button 
                    onClick={() => setIsFilterMobileOpen(true)}
                    className="lg:hidden p-3 bg-brand text-content-on-brand rounded-2xl shadow-lg shadow-brand/20 active:scale-95 transition-all"
                >
                    <Filter size={20} />
                </button>
            </div>

            <div className="flex flex-1 gap-8 relative min-h-0">
                {/* Sidebar Filters - Desktop */}
                <aside className="hidden lg:flex flex-col gap-6 w-80 shrink-0 sticky top-0 h-fit bg-main p-6 rounded-[2.5rem] border border-line shadow-sm">
                    <div className="flex items-center justify-between border-b border-line pb-4">
                        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                            <SlidersHorizontal size={16} className="text-brand" />
                            Filtros
                        </div>
                        <button 
                            onClick={clearFilters}
                            className="text-[10px] font-black text-brand uppercase tracking-tighter hover:underline cursor-pointer"
                        >
                            Limpiar todo
                        </button>
                    </div>

                    <div className="flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar max-h-[calc(100vh-250px)]">
                        {/* Origin / Destination */}
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Origen (IATA)</label>
                                <div className="relative">
                                    <PlaneTakeoff className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="MAD, BCN..." 
                                        value={origin}
                                        onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                                        className="w-full pl-11 pr-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Destino (IATA)</label>
                                <div className="relative">
                                    <PlaneLanding className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="JFK, LHR..." 
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value.toUpperCase())}
                                        className="w-full pl-11 pr-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Estado</label>
                            <select 
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Todos los estados</option>
                                <option value="completed">Completada</option>
                                <option value="searching">Buscando</option>
                                <option value="failed">Fallida</option>
                            </select>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Presupuesto Máximo (€)</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                                <input 
                                    type="number" 
                                    placeholder="Ej: 500" 
                                    value={maxPrice || ""}
                                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full pl-11 pr-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Desde fecha</label>
                                <Calendar
                                    value={startDate}
                                    onChange={setStartDate}
                                    isOpen={isStartCalendarOpen}
                                    setIsOpen={setIsStartCalendarOpen}
                                    trigger={
                                        <button 
                                            onClick={() => setIsStartCalendarOpen(!isStartCalendarOpen)}
                                            className="w-full flex items-center justify-between pl-11 pr-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all relative cursor-pointer"
                                        >
                                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                                            <span>{startDate ? new Date(startDate).toLocaleDateString() : "Seleccionar"}</span>
                                            <ChevronDown size={14} className={`text-content-muted transition-transform ${isStartCalendarOpen ? "rotate-180" : ""}`} />
                                        </button>
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Hasta fecha</label>
                                <Calendar
                                    value={endDate}
                                    onChange={setEndDate}
                                    isOpen={isEndCalendarOpen}
                                    setIsOpen={setIsEndCalendarOpen}
                                    trigger={
                                        <button 
                                            onClick={() => setIsEndCalendarOpen(!isEndCalendarOpen)}
                                            className="w-full flex items-center justify-between pl-11 pr-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none transition-all relative cursor-pointer"
                                        >
                                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                                            <span>{endDate ? new Date(endDate).toLocaleDateString() : "Seleccionar"}</span>
                                            <ChevronDown size={14} className={`text-content-muted transition-transform ${isEndCalendarOpen ? "rotate-180" : ""}`} />
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0">
                    <div 
                        className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
                                <p className="text-sm font-bold text-content-muted animate-pulse">Cargando tu historial...</p>
                            </div>
                        ) : searchesData?.pages[0]?.items?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center gap-6 border-2 border-dashed border-line rounded-[3rem] bg-surface/30 min-h-[400px]">
                                <div className="p-6 bg-surface border border-line rounded-full shadow-lg">
                                    <SearchIcon className="w-12 h-12 text-content-muted opacity-20" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-2xl font-black text-content">No hay resultados</h3>
                                    <p className="text-sm text-content-muted max-w-[300px]">
                                        No hemos encontrado búsquedas que coincidan con los filtros seleccionados.
                                    </p>
                                </div>
                                <button 
                                    onClick={clearFilters}
                                    className="px-6 py-3 bg-brand text-content-on-brand rounded-2xl font-bold shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-6">
                                    {searchesData?.pages.map((page, i) => (
                                        <div key={i} className="flex flex-col gap-6">
                                            {page.items.map((search) => (
                                                <SearchCard 
                                                    key={search._id} 
                                                    search={search} 
                                                    isFeatured={search.shared}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleShare(search._id, !!search.shared);
                                                        }}
                                                        disabled={isSharing || isPrivatizing}
                                                        className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                                            search.shared 
                                                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" 
                                                            : "bg-surface text-content-muted border-line hover:border-brand hover:text-brand"
                                                        }`}
                                                        title={search.shared ? "Hacer privada" : "Hacer pública"}
                                                    >
                                                        {isSharing || isPrivatizing ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : search.shared ? (
                                                            <Globe size={16} />
                                                        ) : (
                                                            <Lock size={16} />
                                                        )}
                                                    </button>
                                                </SearchCard>
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                                    </div>
                                )}

                                {!hasNextPage && (searchesData?.pages[0]?.items?.length ?? 0) > 0 && (
                                    <div className="text-center p-12">
                                        <div className="w-24 h-1 bg-line/30 mx-auto rounded-full mb-6" />
                                        <p className="text-[10px] text-content-muted/40 uppercase tracking-[0.3em] font-black">
                                            Has llegado al principio de tus viajes
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Mobile Filters Modal */}
            {isFilterMobileOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-main rounded-[2.5rem] border border-line shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between p-6 border-b border-line">
                            <div className="flex items-center gap-3">
                                <Filter className="w-5 h-5 text-brand" />
                                <h2 className="text-xl font-black text-content tracking-tight">Filtros Avanzados</h2>
                            </div>
                            <button 
                                onClick={() => setIsFilterMobileOpen(false)}
                                className="p-2 hover:bg-surface rounded-full transition-all border border-line"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="flex flex-col gap-6">
                                {/* Reutilizamos los mismos campos de input pero adaptados al móvil */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Origen</label>
                                        <input 
                                            type="text" 
                                            placeholder="MAD" 
                                            value={origin}
                                            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                                            className="w-full px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Destino</label>
                                        <input 
                                            type="text" 
                                            placeholder="JFK" 
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value.toUpperCase())}
                                            className="w-full px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Presupuesto Máximo</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ej: 500" 
                                        value={maxPrice || ""}
                                        onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold focus:border-brand outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Estado</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["", "completed", "searching", "failed"].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s)}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                                    status === s 
                                                    ? "bg-brand text-content-on-brand border-brand" 
                                                    : "bg-surface text-content-muted border-line hover:border-brand"
                                                }`}
                                            >
                                                {s === "" ? "Todos" : s === "completed" ? "OK" : s === "searching" ? "..." : "Error"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Desde</label>
                                        <Calendar
                                            value={startDate}
                                            onChange={setStartDate}
                                            isOpen={isStartCalendarMobileOpen}
                                            setIsOpen={setIsStartCalendarMobileOpen}
                                            trigger={
                                                <button 
                                                    onClick={() => setIsStartCalendarMobileOpen(!isStartCalendarMobileOpen)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold text-left cursor-pointer"
                                                >
                                                    <span>{startDate ? new Date(startDate).toLocaleDateString() : "Seleccionar"}</span>
                                                    <ChevronDown size={14} className="text-content-muted" />
                                                </button>
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-content-muted ml-1">Hasta</label>
                                        <Calendar
                                            value={endDate}
                                            onChange={setEndDate}
                                            isOpen={isEndCalendarMobileOpen}
                                            setIsOpen={setIsEndCalendarMobileOpen}
                                            trigger={
                                                <button 
                                                    onClick={() => setIsEndCalendarMobileOpen(!isEndCalendarMobileOpen)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold text-left cursor-pointer"
                                                >
                                                    <span>{endDate ? new Date(endDate).toLocaleDateString() : "Seleccionar"}</span>
                                                    <ChevronDown size={14} className="text-content-muted" />
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-line flex gap-4">
                            <button 
                                onClick={clearFilters}
                                className="flex-1 py-4 bg-surface border border-line rounded-2xl text-sm font-black uppercase tracking-widest text-content-muted"
                            >
                                Limpiar
                            </button>
                            <button 
                                onClick={() => setIsFilterMobileOpen(false)}
                                className="flex-1 py-4 bg-brand text-content-on-brand rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand/20"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
