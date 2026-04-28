import { useState, useEffect, useRef, useMemo } from "react";
import { Plane, Loader2, Search, X, Building2, MapPin, ChevronLeft, Plus, Check } from "lucide-react";
import type { AirportResponse, SearchResult, CityResponse } from "@/api/generated/openapi/model";

import SmartPopover from "./ui/SmartPopover";
import { useUserLocation } from "@/context/UserLocationContext";
import { useSearchAirportsInfinite } from "@/api/generated/openapi/airports";
import { UnifiedSelection, isAirport, isCity, getEntityId, getEntityName } from "@/types/selection";
import { useTranslation } from "react-i18next";

interface AirportAutocompleteProps {
    value: UnifiedSelection[];
    onChange: (selections: UnifiedSelection[]) => void;
    placeholder?: string;
    className?: string;
    otherSelected?: UnifiedSelection[];
    onHoverChange?: (entity: UnifiedSelection | null) => void;
    disableCities?: boolean;
    maxSelections?: number;
    hideSelections?: boolean;
}

const getDisplay = (value: UnifiedSelection[]) => {
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

export default function AirportAutocomplete({
    value,
    onChange,
    placeholder,
    className,
    otherSelected = [],
    onHoverChange,
    disableCities = false,
    maxSelections,
    hideSelections = false,
}: AirportAutocompleteProps) {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [showFlatList, setShowFlatList] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLUListElement>(null);
    const chipsScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Selected IDs for fast lookup and conflict check
    const selectedIds = useMemo(() => new Set(value.map(getEntityId)), [value]);
    const selectedIatas = useMemo(() => new Set(value.flatMap(v => isAirport(v) ? [v.iata_code] : v.airports.map(a => a.iata_code))), [value]);
    const otherIatas = useMemo(() => new Set(otherSelected.flatMap(v => isAirport(v) ? [v.iata_code] : v.airports.map(a => a.iata_code))), [otherSelected]);

    // Group selected airports by city for visual display
    const groupedValue = useMemo(() => {
        const groups: Map<string, UnifiedSelection[]> = new Map();
        value.forEach(v => {
            const key = isCity(v) ? v.name : (v.city || v.iata_code);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(v);
        });
        return Array.from(groups.entries());
    }, [value]);

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



    const getLocalizedCountryName = (countryCode?: string) => {
        if (!countryCode) return t("common.others");
        return t(`countries.${countryCode}`, { defaultValue: 'Unknown' });
    };

    const groupedSuggestions = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        const groupOrder: string[] = [];

        firstPageSuggestions.forEach(item => {
            if (isCity(item) && disableCities) {
                // If cities are disabled, extract their airports and show them instead
                item.airports?.forEach(airport => {
                    const groupName = getLocalizedCountryName(airport.country);

                    let group = groups[groupName];
                    if (!group) {
                        group = [];
                        groups[groupName] = group;
                        groupOrder.push(groupName);
                    }
                    if (!group.some(a => a.type === 'airport' && (a as any).iata_code === airport.iata_code)) {
                        group.push({
                            ...airport,
                            type: 'airport',
                            // Copy the city's distance to the airport if it doesn't have one
                            distance_km_to_user: airport.distance_km_to_user || item.distance_km_to_user
                        } as SearchResult);
                    }
                });
                return;
            }

            let groupName = "";
            if (item.type === 'city') {
                groupName = t("common.cities");
            } else {
                groupName = getLocalizedCountryName(item.country);
            }

            let group = groups[groupName];
            if (!group) {
                group = [];
                groups[groupName] = group;
                // Push "Ciudades" to the front if possible
                if (groupName === t("common.cities")) {
                    groupOrder.unshift(t("common.cities"));
                } else {
                    groupOrder.push(groupName);
                }
            }
            if (!group.some(a => a.type === item.type && (a as any).iata_code === (item as any).iata_code && (a as any).name === (item as any).name)) {
                group.push(item);
            }
        });

        // Deduplicate and ensure unicity in groupOrder
        const uniqueOrder = Array.from(new Set(groupOrder));

        return uniqueOrder.map(name => [name, groups[name]] as [string, SearchResult[]]);
    }, [firstPageSuggestions, t, disableCities]);

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
        window.dispatchEvent(new CustomEvent('flaights:mission:add-airport', { detail: { airport } }));
        onHoverChange?.(null); // Clear hover on select
        setQuery("");
        setDebouncedQuery("");
        setIsOpen(false);
    };

    const handleSelectCity = (city: CityResponse) => {
        const cityId = getEntityId(city);

        // If already selected as a city entity, remove it
        if (selectedIds.has(cityId)) {
            onChange(value.filter(v => getEntityId(v) !== cityId));
            return;
        }

        // If we select a city, we should remove individual airports from that city if they were already selected
        const cityIatas = new Set(city.airports.map(a => a.iata_code));
        const newValue = value.filter(v => !isAirport(v) || !cityIatas.has(v.iata_code));

        onChange([...newValue, city]);

        city.airports.forEach(airport => {
            window.dispatchEvent(new CustomEvent('flaights:mission:add-airport', { detail: { airport } }));
        });

        onHoverChange?.(null);
        setQuery("");
        setDebouncedQuery("");
        setIsOpen(false);
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
                <div className="relative w-full h-full group">
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
                    className="flex items-center gap-1.5 w-full h-full min-h-[1.75rem] lg:min-h-[2rem] overflow-x-auto custom-scrollbar py-0.5"
                >
                    {maxSelections === 1 && value.length === 1 ? (() => {
                        const item = value[0]!;
                        const cityName = isCity(item) ? item.name : (item.city || item.name);
                        const airportName = isCity(item) ? t("common.allAirports") : item.name;
                        const countryName = getLocalizedCountryName(item.country);
                        const iata = !isCity(item) ? item.iata_code : null;

                        return (
                            <div className="flex items-center justify-between w-full h-full pr-1 cursor-default group transition-colors">
                                <div className="flex flex-col flex-1 min-w-0 leading-normal py-0.5">
                                    <div className="flex items-center gap-2 overflow-hidden mb-0.5">
                                        <span className="text-sm font-black text-content truncate uppercase tracking-tight">
                                            {cityName}
                                        </span>
                                        {iata && (
                                            <span className="text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded-md shrink-0 uppercase tabular-nums">
                                                {iata}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0">
                                        <span className="text-[10px] text-content-muted font-bold truncate opacity-80 leading-tight">
                                            {airportName}
                                        </span>
                                        {countryName && (
                                            <span className="text-[9px] text-content-muted font-medium truncate opacity-60 uppercase tracking-tighter leading-tight">
                                                {countryName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange([]);
                                        setTimeout(() => inputRef.current?.focus(), 50);
                                    }}
                                    className="text-content-muted hover:text-error hover:bg-error/10 p-1.5 rounded-xl transition-all ml-2 shrink-0 cursor-pointer active:scale-95"
                                    title={t("common.remove", "Eliminar")}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        );
                    })() : (
                        <>
                            {!hideSelections && value.map((item, idx) => (
                                <div
                                    key={`${getEntityId(item)}-${idx}`}
                                    className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-lg shrink-0 animate-in zoom-in-95 duration-200"
                                >
                                    <span className="text-[10px] font-bold text-brand whitespace-nowrap">
                                        {isCity(item) ? item.name : (item.iata_code || getEntityName(item))}
                                    </span>
                                    <div className="w-[1px] h-3 bg-brand/20 ml-0.5" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newValue = [...value];
                                            newValue.splice(idx, 1);
                                            onChange(newValue);
                                        }}
                                        className="text-brand hover:text-brand-dark transition-colors cursor-pointer p-0.5"
                                        title={t("common.remove", "Eliminar")}
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={value.length === 0 || hideSelections ? placeholder : t("common.add")}
                                className={`${className} shrink-0`}
                                style={{ width: value.length === 0 || hideSelections ? '100%' : 'auto', minWidth: '80px' }}
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
                                    window.dispatchEvent(new CustomEvent('flaights:mission:open-airport-card'));
                                    if (window.visualViewport) {
                                        const scrollParent = e.target.closest('.overflow-y-auto, .custom-scrollbar');
                                        if (scrollParent) {
                                            const parentRect = scrollParent.getBoundingClientRect();
                                            const targetRect = (e.target as HTMLElement).getBoundingClientRect();
                                            const scrollTop = scrollParent.scrollTop + targetRect.top - parentRect.top - (parentRect.height / 2) + (targetRect.height / 2);
                                            scrollParent.scrollTo({ top: scrollTop, behavior: 'smooth' });
                                        } else {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }
                                }}
                            />
                        </>
                    )}
                    {isFetching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                            <Loader2 className="animate-spin h-3.5 w-3.5 text-brand" />
                        </div>
                    )}
                </div>
            </div>
        }
        >
            <ul
                ref={scrollContainerRef}
                className="flex flex-col max-h-100 overflow-y-auto custom-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
                onMouseLeave={() => onHoverChange?.(null)}
            >
                {isFetching && !isFetchingNextPage && suggestions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-300">
                        <div className="relative">
                            <Loader2 className="animate-spin h-8 w-8 text-brand" />
                            <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full animate-pulse" />
                        </div>
                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.2em]">
                            {t("airportAutocomplete.searching", "Buscando...")}
                        </span>
                    </div>
                )}
                {/* Helper functions for unified rendering */}
                {(() => {
                    const renderAirport = (airport: AirportResponse, isSub: boolean = false, parentLocation?: string) => {
                        const airportIsSelected = selectedIatas.has(airport.iata_code);
                        const airportIsConflict = otherIatas.has(airport.iata_code);

                        return (
                            <li
                                key={`${airport.iata_code}-${isSub ? 'sub' : 'main'}`}
                                className={`px-4 py-3 transition-all flex items-center gap-3 border-b border-line/40 last:border-0 group/suggestion ${isSub ? 'pl-10' : ''} ${airportIsSelected || airportIsConflict ? 'bg-surface/50 opacity-40 cursor-not-allowed' : 'hover:bg-surface cursor-pointer'}`}
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
                                                    <span className="text-brand/80 font-medium italic">{t("airportAutocomplete.fromCity", { distance: Math.round(airport.distance_km_to_city), location: parentLocation })}</span>
                                                ) : (
                                                    getLocalizedCountryName(airport.country)
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <HighlightedText text={airport.city} highlight={airport.highlight?.city} query={debouncedQuery} />, {getLocalizedCountryName(airport.country)}
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

                    const renderCity = (city: CityResponse, suffix: string = "") => {
                        const cityId = getEntityId(city);
                        const isSelectedAsEntity = selectedIds.has(cityId);
                        const cityIatas = city.airports.map(a => a.iata_code);
                        const allAirportsSelected = city.airports.every(a => selectedIatas.has(a.iata_code));
                        const isFullySelected = isSelectedAsEntity || allAirportsSelected;

                        const hasOtherConflicts = city.airports.some(a => otherIatas.has(a.iata_code));
                        const hasSameSelected = city.airports.some(a => selectedIatas.has(a.iata_code));

                        // We can select if not already an entity AND no conflicts in OTHER list
                        const canSelect = !isSelectedAsEntity && !hasOtherConflicts;

                        return (
                            <div key={`city-${city.name}-${suffix}`} className="flex flex-col bg-surface/5">
                                <div
                                    className={`px-4 py-2.5 flex items-center justify-between bg-surface/95 border-b border-line/30 sticky top-0 z-10 backdrop-blur-md transition-all group/city ${isSelectedAsEntity || hasOtherConflicts ? 'bg-surface/50 opacity-40 cursor-not-allowed' : (canSelect ? 'cursor-pointer hover:bg-surface' : '')}`}
                                    onClick={() => !isSelectedAsEntity && canSelect && handleSelectCity(city)}
                                    onMouseEnter={() => !isSelectedAsEntity && onHoverChange?.(city)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isFullySelected ? 'bg-brand/20' : 'bg-brand/10 group-hover/city:bg-brand/20'}`}>
                                            <Building2 size={14} className={isFullySelected ? 'text-brand' : 'text-brand'} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`text-sm font-bold truncate leading-tight transition-colors ${isFullySelected ? 'text-brand' : 'text-brand'}`}>
                                                <HighlightedText text={city.name} highlight={city.highlight?.name} query={debouncedQuery} />
                                            </span>
                                            <span className="text-[10px] text-content-muted font-medium uppercase tracking-wider opacity-60">
                                                {city.airports.length} {city.airports.length === 1 ? 'aeropuerto' : 'aeropuertos'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isSelectedAsEntity ? (
                                            <div className="p-1.5 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center opacity-70">
                                                <Check size={16} className="text-brand" />
                                            </div>
                                        ) : hasOtherConflicts ? null : (
                                            <div className="p-1.5 bg-brand/10 border border-brand/20 rounded-xl group-hover/city:bg-brand/20 transition-all flex items-center justify-center">
                                                <Plus size={16} className="text-brand" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {(() => {
                                    const referenceAirport = city.airports.find(a => a.distance_km_to_city === 0);
                                    const reference = referenceAirport
                                        ? `${referenceAirport.iata_code} ${t("searchFlight.labels2.airport")}`
                                        : city.name.split(',')[0];
                                    return city.airports.map((sub: AirportResponse) => renderAirport(sub, true, reference));
                                })()}
                            </div>
                        );
                    };

                    if (!showFlatList && groupedSuggestions.length > 0) {
                        return (
                            <>
                                {groupedSuggestions.map(([groupName, items]) => (
                                    <div key={groupName} className="flex flex-col border-b border-line last:border-0">
                                        {groupName !== t("common.cities") && (
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
                                        {hasNextPage ? t("airportAutocomplete.seeMoreAirports") : t("airportAutocomplete.seeAllResults")}
                                    </button>
                                ) : suggestions.length > 0 && (
                                    <div className="py-8 flex justify-center border-t border-line/20 bg-surface/5">
                                        <span className="text-[10px] font-bold text-content-muted/40 uppercase tracking-[0.25em] flex items-center gap-4">
                                            <div className="h-px w-8 bg-line/40" />
                                            {t("airportAutocomplete.noMoreResults")}
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
                                        {t("airportAutocomplete.backToFeatured")}
                                    </button>
                                </div>

                                {suggestions.map((item, idx) => {
                                    if (item.type === 'city') {
                                        if (disableCities) return null;
                                        return renderCity(item as CityResponse, `flat-${idx}`);
                                    }
                                    return renderAirport(item as AirportResponse);
                                })}

                                <div ref={sentinelRef} className="py-12 flex flex-col items-center justify-center border-t border-line/20 bg-surface/5">
                                    {isFetchingNextPage ? (
                                        <Loader2 className="animate-spin h-5 w-5 text-brand" />
                                    ) : !hasNextPage && suggestions.length > 0 && (
                                        <span className="text-[10px] font-bold text-content-muted/40 uppercase tracking-[0.25em] flex items-center gap-4">
                                            <div className="h-px w-8 bg-line/40" />
                                            {t("airportAutocomplete.noMoreResults")}
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
                            <p className="text-sm font-bold">{t("airportAutocomplete.noResults")}</p>
                            <p className="text-xs text-content-muted">{t("airportAutocomplete.tryOtherSearch")}</p>
                        </div>
                    </div>
                )}
            </ul>
        </SmartPopover>
    );
}

