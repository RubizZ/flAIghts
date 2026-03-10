import { useState, useEffect, useRef, useMemo } from "react";
import { Plane, Loader2, Search } from "lucide-react";
import { useSearchAirports } from "@/api/generated/airports/airports";
import type { AirportResponse } from "@/api/generated/model";
import { COUNTRY_NAMES } from "@/constants/countries";
import SmartPopover from "./ui/SmartPopover";

interface AirportAutocompleteProps {
    value: string;
    displayValue?: string;
    onChange: (value: string, display?: string) => void | boolean;
    placeholder?: string;
    className?: string;
    side?: 'top' | 'bottom';
}

export default function AirportAutocomplete({ value, displayValue, onChange, placeholder, className, side = 'bottom' }: AirportAutocompleteProps) {
    const [query, setQuery] = useState(displayValue || value);
    const [debouncedQuery, setDebouncedQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);

    const { data, isFetching } = useSearchAirports(
        { q: debouncedQuery },
        {
            query: {
                enabled: debouncedQuery.length >= 2 && (!value || debouncedQuery !== displayValue),
                staleTime: 5 * 60 * 1000,
                refetchOnWindowFocus: false,
            },
        }
    );

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
        setQuery(displayValue || value);
    }, [value, displayValue]);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (airport: AirportResponse) => {
        const displayName = airport.name || airport.city || "Unknown Location";
        const display = `${displayName} (${airport.iata_code})`;
        const result = onChange(airport.iata_code, display);
        if (result === false) {
            setQuery(displayValue || value);
            setDebouncedQuery(value);
        } else {
            setQuery(display);
        }
        setIsOpen(false);
    };

    return (
        <SmartPopover
            isOpen={isOpen && (!value || query !== displayValue) && (debouncedQuery.length >= 2 || groupedSuggestions.length > 0)}
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
                            // Notify parent on every keystroke to sync state between cards
                            onChange("", newQuery);
                        }}
                        onFocus={(e) => {
                            setIsOpen(true);
                            if (query === displayValue && query !== "") {
                                e.target.select();
                            }
                        }}
                        onClick={(e) => {
                            if (query === displayValue && query !== "") {
                                (e.target as HTMLInputElement).select();
                            }
                        }}
                    />
                    {isFetching && (
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
                        <div key={country} className="flex flex-col">
                            <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md px-4 py-1.5 border-b border-line/50">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                                    {country}
                                </span>
                            </div>
                            {airports.map((airport) => (
                                <li
                                    key={airport.iata_code}
                                    className="px-4 py-3 hover:bg-surface transition-all cursor-pointer flex items-center gap-3 border-b border-line last:border-0 group/suggestion"
                                    onClick={() => handleSelect(airport)}
                                >
                                    <div className="bg-surface p-2 rounded-xl shrink-0 group-hover/suggestion:bg-brand/10 transition-colors">
                                        <Plane size={16} className="text-content-muted group-hover/suggestion:text-brand transition-colors" />
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
                        <div className="bg-surface p-3 rounded-2xl text-content-muted">
                            <Search size={24} />
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
