import { useState, useEffect, useMemo } from "react";
import { Plane, Loader2, Search } from "lucide-react";
import { useSearchAirports, useGetAirportByIata } from "@/api/generated/airports/airports";
import type { AirportResponse } from "@/api/generated/model";
import { COUNTRY_NAMES } from "@/constants/countries";
import SmartPopover from "./ui/SmartPopover";

interface AirportAutocompleteProps {
    value: AirportResponse | null;
    onChange: (airport: AirportResponse | null, query?: string) => void | boolean;
    placeholder?: string;
    className?: string;
    side?: 'top' | 'bottom';
}

export default function AirportAutocomplete({ value, onChange, placeholder, className, side = 'bottom' }: AirportAutocompleteProps) {
    const getDisplay = (a: AirportResponse | null) => {
        if (!a) return "";
        const name = a.name || a.city || "Unknown Location";
        return a.iata_code ? `${name} (${a.iata_code})` : name;
    }

    const [query, setQuery] = useState(getDisplay(value));
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const { data, isFetching } = useSearchAirports(
        { q: debouncedQuery },
        {
            query: {
                enabled: debouncedQuery.length >= 2 && (!value || debouncedQuery !== getDisplay(value)),
                staleTime: 5 * 60 * 1000,
                refetchOnWindowFocus: false,
            },
        }
    );

    // Resolve IATA code if only IATA is provided in value
    const shouldResolve = !!(value && value.iata_code && value.iata_code.length === 3 && !value.city && !value.name);
    const { data: resolvedData, isFetching: isResolving } = useGetAirportByIata(
        value?.iata_code || "",
        {
            query: {
                enabled: shouldResolve,
                staleTime: Infinity,
            }
        }
    );

    useEffect(() => {
        if (resolvedData && shouldResolve) {
            onChange(resolvedData);
        }
    }, [resolvedData, shouldResolve, onChange]);

    const suggestions = data ?? [];

    const groupedSuggestions = useMemo(() => {
        const groups: Record<string, AirportResponse[]> = {};
        const countryOrder: string[] = [];

        suggestions.forEach(airport => {
            const countryCode = airport.country || "Otros";
            const countryName = (COUNTRY_NAMES[countryCode] && COUNTRY_NAMES[countryCode][1]) || countryCode;

            if (!groups[countryName]) {
                groups[countryName] = [];
                countryOrder.push(countryName);
            }
            groups[countryName].push(airport);
        });

        return countryOrder.map(name => [name, groups[name]] as [string, AirportResponse[]]);
    }, [suggestions]);

    // Sync input with external value
    useEffect(() => {
        if (!isOpen) {
            setQuery(getDisplay(value));
        }
    }, [value, isOpen]);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen || !value) {
                setDebouncedQuery(query);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, isOpen, value]);

    const handleSelect = (airport: AirportResponse) => {
        const result = onChange(airport);
        if (result === false) {
            setQuery(getDisplay(value));
            setDebouncedQuery("");
        } else {
            setQuery(getDisplay(airport));
        }
        setIsOpen(false);
    };

    return (
        <SmartPopover
            isOpen={isOpen && (!value || query !== getDisplay(value)) && (debouncedQuery.length >= 2 || groupedSuggestions.length > 0)}
            setIsOpen={setIsOpen}
            className="w-full"
            trigger={
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder={placeholder}
                        className={className}
                        value={query}
                        onChange={(e) => {
                            const newQuery = e.target.value;
                            setQuery(newQuery);
                            // If user clears the input, notify parent
                            if (!newQuery) {
                                onChange(null);
                            } else {
                                onChange(null, newQuery);
                            }
                        }}
                        onFocus={(e) => {
                            setIsOpen(true);
                            const target = e.target;
                            setTimeout(() => {
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                            if (query === getDisplay(value) && query !== "") {
                                e.target.select();
                            }
                        }}
                        onClick={(e) => {
                            if (query === getDisplay(value) && query !== "") {
                                (e.target as HTMLInputElement).select();
                            }
                        }}
                    />
                    {(isFetching || isResolving) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin h-4 w-4 text-content-muted" />
                        </div>
                    )}
                </div>
            }
        >
            <ul className="flex flex-col">
                {groupedSuggestions.length > 0 ? (
                    groupedSuggestions.map(([country, airports]) => (
                        <div key={country} className="flex flex-col border-b border-line last:border-0">
                            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md px-4 py-2 border-b border-line flex items-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/50 pr-3 border-r border-line mr-3 leading-none">
                                    {country}
                                </span>
                            </div>
                            {airports.map((airport) => (
                                <li
                                    key={airport.iata_code}
                                    className="px-4 py-3 hover:bg-surface transition-all cursor-pointer flex items-center gap-3 border-b border-line/40 last:border-0 group/suggestion"
                                    onClick={() => handleSelect(airport)}
                                >
                                    <div className="bg-surface/50 p-2 rounded-xl shrink-0 group-hover/suggestion:bg-brand/10 transition-colors">
                                        <Plane size={16} className="text-content-muted/60 group-hover/suggestion:text-brand transition-colors" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-semibold truncate group-hover/suggestion:text-brand transition-colors">
                                            {airport.name} <span className="text-content-muted font-normal group-hover/suggestion:text-content-muted transition-colors">({airport.iata_code})</span>
                                        </span>
                                        <span className="text-xs text-content-muted truncate opacity-70">
                                            {airport.city}, {(airport.country && COUNTRY_NAMES[airport.country]?.[1]) || airport.country}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </div>
                    ))
                ) : debouncedQuery.length >= 2 && !isFetching ? (
                    <div className="px-6 py-10 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="bg-surface/50 p-4 rounded-3xl text-content-muted/40">
                            <Search size={32} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold">No hay resultados</p>
                            <p className="text-xs text-content-muted">Prueba con otro código o nombre de ciudad</p>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 py-10 flex items-center justify-center gap-3 text-content-muted">
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span className="text-sm">Buscando aeropuertos...</span>
                    </div>
                )}
            </ul>
        </SmartPopover>
    );
}
