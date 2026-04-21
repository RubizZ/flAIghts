import { useState, useEffect, useRef, useMemo } from "react";
import { Plane, Loader2, Search, X, Building2, MapPin, ChevronLeft } from "lucide-react";
import type { AirportResponse, SearchResult, CityResponse } from "@/api/generated/openapi/model";
import { COUNTRY_NAMES } from "@/constants/countries";
import SmartPopover from "./ui/SmartPopover";
import { useUserLocation } from "@/context/UserLocationContext";
import { useSearchAirportsInfinite } from "@/api/generated/openapi/airports";

interface AirportAutocompleteProps {
    value: AirportResponse[];
    onChange: (airports: AirportResponse[]) => void;
    placeholder?: string;
    className?: string;
    otherSelected?: AirportResponse[];
    onHoverChange?: (airport: AirportResponse | null) => void;
}

const getDisplay = (value: AirportResponse[]) => {
    // Para multiselección con chips, el input suele estar vacío o mostrar un placeholder
    return "";
};

const HighlightedText = ({ text, highlight, query }: { text: string; highlight?: string; query: string }) => {
    if (highlight) {
        return <span className="[&>b]:text-brand [&>b]:font-bold" dangerouslySetInnerHTML={{ __html: highlight }} />;
    }
    if (!query.trim()) return <span>{text}</span>;

    // Normalize both for comparison (remove accents)
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedText = normalize(text);
    const normalizedQuery = normalize(query);

    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return <span>{text}</span>;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
        <span>
            {before}
            <span className="text-brand font-bold underline decoration-brand/30 underline-offset-2">{match}</span>
            {after}
        </span>
    );
};

export default function AirportAutocomplete({ value, onChange, placeholder, className, otherSelected = [], onHoverChange }: AirportAutocompleteProps) {
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

    const { location } = useUserLocation();

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useSearchAirportsInfinite(
        {
            q: debouncedQuery,
            lat: location?.latitude,
            lon: location?.longitude,
        },
        {
            query: {
                enabled: debouncedQuery.length >= 2,
                staleTime: 5 * 60 * 1000,
                refetchOnWindowFocus: false,
                getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
            }
        }
    );

    const suggestions = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);

    // Use only the first page for initial grouped view to keep it clean
    const firstPageSuggestions = useMemo(() => data?.pages[0]?.items ?? [], [data]);

    const groupedSuggestions = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        const groupOrder: string[] = [];

        firstPageSuggestions.forEach(item => {
            let groupName = "";
            if (item.type === 'city') {
                groupName = "Ciudades";
            } else {
                const countryCode = item.country || "Otros";
                const countryInfo = COUNTRY_NAMES[countryCode];
                groupName = (countryInfo && countryInfo[1]) || countryCode;
            }

            let group = groups[groupName];
            if (!group) {
                group = [];
                groups[groupName] = group;
                // Push "Ciudades" to the front if possible
                if (groupName === "Ciudades") {
                    groupOrder.unshift("Ciudades");
                } else {
                    groupOrder.push(groupName);
                }
            }
            group.push(item);
        });

        // Deduplicate and ensure unicity in groupOrder
        const uniqueOrder = Array.from(new Set(groupOrder));

        return uniqueOrder.map(name => [name, groups[name]] as [string, SearchResult[]]);
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
    // Reset scroll of suggestions on new search or view mode change
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [debouncedQuery, showFlatList]);

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
        window.dispatchEvent(new CustomEvent('app:add-airport', { detail: { airport } }));
        onHoverChange?.(null); // Clear hover on select
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
            setIsOpen={(val) => {
                setIsOpen(val);
                if (!val) onHoverChange?.(null);
            }}
            className="w-full"
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
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (e.target.value.length > 0) setIsOpen(true);
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                setIsOpen(false);
                                onHoverChange?.(null);
                            }, 200);
                        }}
                        onFocus={(e) => {
                            setIsOpen(true);
                            window.dispatchEvent(new CustomEvent('app:open-airport-card'));
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
            <ul
                ref={scrollContainerRef}
                className="flex flex-col max-h-100 overflow-y-auto custom-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
                onMouseLeave={() => onHoverChange?.(null)}
            >
                {/* Helper functions for unified rendering */}
                {(() => {
                    const renderAirport = (airport: AirportResponse, isSub: boolean = false) => {
                        const airportIsSelected = selectedIatas.has(airport.iata_code);
                        const airportIsConflict = otherIatas.has(airport.iata_code);

                        return (
                            <li
                                key={`${airport.iata_code}-${isSub ? 'sub' : 'main'}`}
                                className={`px-4 py-3 hover:bg-surface transition-all cursor-pointer flex items-center gap-3 border-b border-line/40 last:border-0 group/suggestion ${isSub ? 'pl-10' : ''} ${(airportIsSelected || airportIsConflict) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !(airportIsSelected || airportIsConflict) && handleSelect(airport)}
                                onMouseEnter={() => onHoverChange?.(airport)}
                            >
                                <div className={`bg-surface/50 p-2 rounded-xl shrink-0 transition-colors ${airportIsSelected ? 'bg-brand/20' : (airportIsConflict ? 'bg-error/10' : 'group-hover/suggestion:bg-brand/10')}`}>
                                    {isSub ? (
                                        <MapPin size={14} className="text-content-muted" />
                                    ) : (
                                        <Plane size={16} className={`transition-colors ${airportIsSelected ? 'text-brand' : (airportIsConflict ? 'text-error' : 'text-content-muted/60 group-hover/suggestion:text-brand')}`} />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className={`text-sm font-semibold truncate transition-colors ${airportIsSelected ? 'text-brand' : (airportIsConflict ? 'text-error' : '')}`}>
                                        <HighlightedText text={airport.name} highlight={airport.highlight?.name} query={debouncedQuery} />
                                        <span className="text-content-muted font-normal transition-colors ml-1">(<HighlightedText text={airport.iata_code} highlight={airport.highlight?.iata_code} query={debouncedQuery} />)</span>
                                    </span>
                                    <span className="text-xs text-content-muted truncate opacity-70">
                                        {isSub ? (
                                            <>
                                                {airport.distance_km_to_city ? (
                                                    <span className="text-brand/80 font-medium italic">A {Math.round(airport.distance_km_to_city)} km de la ciudad</span>
                                                ) : (
                                                    (airport.country && COUNTRY_NAMES[airport.country]?.[1]) || airport.country
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <HighlightedText text={airport.city} highlight={airport.highlight?.city} query={debouncedQuery} />, {(airport.country && COUNTRY_NAMES[airport.country]?.[1]) || airport.country}
                                            </>
                                        )}
                                    </span>
                                </div>
                                {!isSub && airport.distance_km_to_user && (
                                    <div className="ml-auto text-[10px] font-medium text-brand/70 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10 text-center">
                                        {Math.round(airport.distance_km_to_user)} km
                                    </div>
                                )}
                            </li>
                        );
                    };

                    const renderCity = (city: CityResponse, suffix: string = "") => (
                        <div key={`city-${city.name}-${suffix}`} className="flex flex-col bg-surface/5">
                            <div className="px-4 py-2 flex items-center gap-3 bg-surface/95 border-b border-line/30 sticky top-0 z-10 backdrop-blur-md transition-all">
                                <div className="bg-brand/10 p-1.5 rounded-lg shrink-0">
                                    <Building2 size={14} className="text-brand" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-brand truncate leading-tight">
                                        <HighlightedText text={city.name} highlight={city.highlight?.name} query={debouncedQuery} />
                                    </span>
                                </div>
                            </div>
                            {city.airports.map((sub: AirportResponse) => renderAirport(sub, true))}
                        </div>
                    );

                    if (!showFlatList && groupedSuggestions.length > 0) {
                        return (
                            <>
                                {groupedSuggestions.map(([groupName, items]) => (
                                    <div key={groupName} className="flex flex-col border-b border-line last:border-0">
                                        {groupName !== "Ciudades" && (
                                            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md px-4 py-2 border-b border-line flex items-center">
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/50 pr-3 border-r border-line mr-3 leading-none">
                                                    {groupName}
                                                </span>
                                            </div>
                                        )}
                                        {items.map((item, idx) => {
                                            if (item.type === 'city') return renderCity(item as CityResponse, `grouped-${idx}`);
                                            return renderAirport(item as AirportResponse);
                                        })}
                                    </div>
                                ))}

                                {(hasNextPage || suggestions.length > firstPageSuggestions.length) ? (
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setShowFlatList(true)}
                                        className="w-full py-4 text-xs font-bold text-brand hover:bg-brand/5 transition-colors uppercase tracking-widest border-t border-line/50 cursor-pointer"
                                    >
                                        {hasNextPage ? "Ver más aeropuertos" : "Ver todos los resultados"}
                                    </button>
                                ) : suggestions.length > 0 && (
                                    <div className="py-8 flex justify-center border-t border-line/20 bg-surface/5">
                                        <span className="text-[10px] font-bold text-content-muted/40 uppercase tracking-[0.25em] flex items-center gap-4">
                                            <div className="h-px w-8 bg-line/40" />
                                            No hay más resultados
                                            <div className="h-px w-8 bg-line/40" />
                                        </span>
                                    </div>
                                )}
                            </>
                        );
                    }

                    if (showFlatList) {
                        return (
                            <>
                                <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-line shadow-sm">
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setShowFlatList(false)}
                                        className="w-full py-2.5 px-4 text-[10px] font-bold text-brand hover:text-brand-dark transition-colors uppercase tracking-[0.15em] flex items-center gap-2 cursor-pointer group/back"
                                    >
                                        <div className="p-1 rounded-md bg-brand/10 transition-colors group-hover/back:bg-brand/20">
                                            <ChevronLeft size={10} />
                                        </div>
                                        Volver a resultados destacados
                                    </button>
                                </div>

                                {suggestions.map((item, idx) => {
                                    if (item.type === 'city') return renderCity(item as CityResponse, `flat-${idx}`);
                                    return renderAirport(item as AirportResponse);
                                })}

                                <div ref={sentinelRef} className="py-12 flex flex-col items-center justify-center border-t border-line/20 bg-surface/5">
                                    {isFetchingNextPage ? (
                                        <Loader2 className="animate-spin h-5 w-5 text-brand" />
                                    ) : !hasNextPage && suggestions.length > 0 && (
                                        <span className="text-[10px] font-bold text-content-muted/40 uppercase tracking-[0.25em] flex items-center gap-4">
                                            <div className="h-px w-8 bg-line/40" />
                                            No hay más resultados
                                            <div className="h-px w-8 bg-line/40" />
                                        </span>
                                    )}
                                </div>
                            </>
                        );
                    }

                    return null;
                })()}

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
