import { useState, useEffect, useRef, useMemo } from "react";
import { Plane, Loader2, Search, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useGetAirportByIata } from "@/api/generated/openapi/airports";
import { customInstance } from "@/api/axios-instance";
import type { AirportResponse, AirportSearchPaginatedResult } from "@/api/generated/openapi/model";
import { COUNTRY_NAMES } from "@/constants/countries";
import SmartPopover from "./ui/SmartPopover";

interface AirportAutocompleteProps {
    value: AirportResponse[];
    onChange: (airports: AirportResponse[]) => void;
    placeholder?: string;
    className?: string;
    side?: 'top' | 'bottom';
    otherSelected?: AirportResponse[];
}

const getDisplay = (value: AirportResponse[]) => {
    // Para multiselección con chips, el input suele estar vacío o mostrar un placeholder
    return "";
};

export default function AirportAutocomplete({ value, onChange, placeholder, className, side = 'bottom', otherSelected = [] }: AirportAutocompleteProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [showFlatList, setShowFlatList] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLUListElement>(null);
    const chipsScrollRef = useRef<HTMLDivElement>(null);

    // Selected IATAs for fast lookup and conflict check
    const selectedIatas = useMemo(() => new Set(value.map(a => a.iata_code)), [value]);
    const otherIatas = useMemo(() => new Set(otherSelected.map(a => a.iata_code)), [otherSelected]);

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['airports', 'autocomplete', debouncedQuery],
        initialPageParam: 1,
        queryFn: async ({ pageParam }) => {
            const resp = await customInstance<AirportSearchPaginatedResult>({
                url: '/airports',
                method: 'GET',
                params: { q: debouncedQuery, page: pageParam, limit: 20 }
            });
            return resp.data; // Retorna el objeto AirportSearchPaginatedResult
        },
        getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: debouncedQuery.length >= 2,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const suggestions = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);

    // Use only the first page for initial grouped view to keep it clean
    const firstPageSuggestions = useMemo(() => data?.pages[0]?.items ?? [], [data]);

    const groupedSuggestions = useMemo(() => {
        const groups: Record<string, AirportResponse[]> = {};
        const countryOrder: string[] = [];

        firstPageSuggestions.forEach(airport => {
            const countryCode = airport.country || "Otros";
            const countryName = (COUNTRY_NAMES[countryCode] && COUNTRY_NAMES[countryCode][1]) || countryCode;

            if (!groups[countryName]) {
                groups[countryName] = [];
                countryOrder.push(countryName);
            }
            groups[countryName].push(airport);
        });

        return countryOrder.map(name => [name, groups[name]] as [string, AirportResponse[]]);
    }, [firstPageSuggestions]);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            setShowFlatList(false); // Reset view on new search
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Auto-scroll chips to end
    useEffect(() => {
        if (chipsScrollRef.current) {
            chipsScrollRef.current.scrollTo({
                left: chipsScrollRef.current.scrollWidth,
                behavior: 'smooth'
            });
        }
    }, [value.length]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!showFlatList || !hasNextPage || isFetchingNextPage) return;
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                fetchNextPage();
            }
        }, {
            root: scrollContainerRef.current,
            rootMargin: '100px'
        });

        const el = sentinelRef.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [showFlatList, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleSelect = (airport: AirportResponse) => {
        if (otherIatas.has(airport.iata_code)) {
            setIsOpen(false);
            setQuery("");
            return;
        }

        if (selectedIatas.has(airport.iata_code)) {
            setIsOpen(false);
            setQuery("");
            return;
        }

        onChange([...value, airport]);
        setQuery("");
        setDebouncedQuery("");
        setIsOpen(false);
    };

    const removeAirport = (iata: string | undefined) => {
        if (!iata) return;
        onChange(value.filter(a => a.iata_code !== iata));
    };

    return (
        <SmartPopover
            isOpen={isOpen && (debouncedQuery.length >= 2 || (debouncedQuery.length > 0 && groupedSuggestions.length > 0))}
            setIsOpen={setIsOpen}
            className="w-full"
            side={side}
            trigger={
                <div
                    ref={chipsScrollRef}
                    onWheel={(e) => {
                        if (e.deltaY !== 0) {
                            e.preventDefault();
                            chipsScrollRef.current?.scrollBy({
                                left: e.deltaY * 0.5,
                                behavior: 'smooth'
                            });
                        }
                    }}
                    className="flex items-center gap-1.5 w-full h-7 lg:h-8 overflow-x-auto overflow-y-hidden custom-scrollbar py-0 pb-1"
                >
                    {value.map((airport) => (
                        <div
                            key={airport.iata_code}
                            className="flex items-center gap-1 bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded-lg animate-in zoom-in-95 duration-200 shrink-0"
                        >
                            <span className="text-[10px] font-bold text-brand">{airport.iata_code}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAirport(airport.iata_code);
                                }}
                                className="text-brand hover:text-brand-dark transition-colors cursor-pointer"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <input
                        type="text"
                        placeholder={value.length === 0 ? placeholder : "Añadir..."}
                        className={`${className} shrink-0`}
                        style={{ width: value.length === 0 ? '100%' : 'auto', minWidth: '80px' }}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onBlur={() => {
                            setTimeout(() => setIsOpen(false), 200);
                        }}
                        onFocus={(e) => {
                            setIsOpen(true);
                            if (window.visualViewport) {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }}
                    />
                    {isFetching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin h-3.5 w-3.5 text-content-muted" />
                        </div>
                    )}
                </div>
            }
        >
            <ul ref={scrollContainerRef} className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
                {!showFlatList && groupedSuggestions.length > 0 && (
                    <>
                        {groupedSuggestions.map(([country, airports]) => (
                            <div key={country} className="flex flex-col border-b border-line last:border-0">
                                <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md px-4 py-2 border-b border-line flex items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/50 pr-3 border-r border-line mr-3 leading-none">
                                        {country}
                                    </span>
                                </div>
                                {airports.map((airport) => {
                                    const isSelected = selectedIatas.has(airport.iata_code);
                                    const isConflict = otherIatas.has(airport.iata_code);
                                    return (
                                        <li
                                            key={airport.iata_code}
                                            className={`px-4 py-3 hover:bg-surface transition-all cursor-pointer flex items-center gap-3 border-b border-line/40 last:border-0 group/suggestion ${(isSelected || isConflict) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => !(isSelected || isConflict) && handleSelect(airport)}
                                        >
                                            <div className={`bg-surface/50 p-2 rounded-xl shrink-0 transition-colors ${isSelected ? 'bg-brand/20' : (isConflict ? 'bg-error/10' : 'group-hover/suggestion:bg-brand/10')}`}>
                                                <Plane size={16} className={`transition-colors ${isSelected ? 'text-brand' : (isConflict ? 'text-error' : 'text-content-muted/60 group-hover/suggestion:text-brand')}`} />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-brand' : (isConflict ? 'text-error' : 'group-hover/suggestion:text-brand')}`}>
                                                    {airport.name} <span className="text-content-muted font-normal group-hover/suggestion:text-content-muted transition-colors">({airport.iata_code})</span>
                                                </span>
                                                <span className="text-xs text-content-muted truncate opacity-70">
                                                    {airport.city}, {(airport.country && COUNTRY_NAMES[airport.country]?.[1]) || airport.country}
                                                </span>
                                            </div>
                                            {airport.distance_km && (
                                                <div className="ml-auto text-[10px] font-medium text-brand/70 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
                                                    {Math.round(airport.distance_km)} km
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </div>
                        ))}

                        {hasNextPage && (
                            <button
                                onClick={() => setShowFlatList(true)}
                                className="w-full py-4 text-xs font-bold text-brand hover:bg-brand/5 transition-colors uppercase tracking-widest border-t border-line/50 cursor-pointer"
                            >
                                Ver más aeropuertos
                            </button>
                        )}
                    </>
                )}

                {showFlatList && (
                    <>
                        {suggestions.map((airport) => {
                            const isSelected = selectedIatas.has(airport.iata_code);
                            const isConflict = otherIatas.has(airport.iata_code);
                            return (
                                <li
                                    key={`${airport.iata_code}-flat`}
                                    className={`px-4 py-3 hover:bg-surface transition-all cursor-pointer flex items-center gap-3 border-b border-line/40 last:border-0 group/suggestion ${(isSelected || isConflict) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => !(isSelected || isConflict) && handleSelect(airport)}
                                >
                                    <div className={`bg-surface/50 p-2 rounded-xl shrink-0 transition-colors ${isSelected ? 'bg-brand/20' : (isConflict ? 'bg-error/10' : 'group-hover/suggestion:bg-brand/10')}`}>
                                        <Plane size={16} className={`transition-colors ${isSelected ? 'text-brand' : (isConflict ? 'text-error' : 'text-content-muted/60 group-hover/suggestion:text-brand')}`} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-brand' : (isConflict ? 'text-error' : 'group-hover/suggestion:text-brand')}`}>
                                            {airport.name} <span className="text-content-muted font-normal group-hover/suggestion:text-content-muted transition-colors">({airport.iata_code})</span>
                                        </span>
                                        <span className="text-xs text-content-muted truncate opacity-70">
                                            {airport.city}, {(airport.country && COUNTRY_NAMES[airport.country]?.[1]) || airport.country}
                                        </span>
                                    </div>
                                    {airport.distance_km && (
                                        <div className="ml-auto text-[10px] font-medium text-brand/70 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
                                            {Math.round(airport.distance_km)} km
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && <Loader2 className="animate-spin h-5 w-5 text-brand" />}
                        </div>
                    </>
                )}

                {debouncedQuery.length >= 2 && suggestions.length === 0 && !isFetching && (
                    <div className="px-6 py-10 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="bg-surface/50 p-4 rounded-3xl text-content-muted/40">
                            <Search size={32} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold">No hay resultados</p>
                            <p className="text-xs text-content-muted">Prueba con otro código o nombre de ciudad</p>
                        </div>
                    </div>
                )}
            </ul>
        </SmartPopover>
    );
}
