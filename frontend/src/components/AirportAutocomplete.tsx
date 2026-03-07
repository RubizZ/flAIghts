import { useState, useEffect, useRef } from "react";
import { Plane, Loader2 } from "lucide-react";
import { useSearchAirports } from "@/api/generated/airports/airports";
import type { AirportResponse } from "@/api/generated/model";

interface AirportAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function AirportAutocomplete({ value, onChange, placeholder, className }: AirportAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [debouncedQuery, setDebouncedQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data, isFetching } = useSearchAirports(
        { q: debouncedQuery },
        {
            query: {
                enabled: debouncedQuery.length >= 2 && debouncedQuery !== value,
                staleTime: 5 * 60 * 1000, // Keep results fresh for 5 minutes.
                refetchOnWindowFocus: false,
            },
        }
    );

    const suggestions = data ?? [];

    // Sync internal state with prop value (e.g. when swapping origin/dest)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce query input to avoid excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (airport: AirportResponse) => {
        onChange(airport.iata_code); // Update parent state with the selected airport's IATA code
        /* Sync input value with selection. This will make `debouncedQuery` equal to `value` and 
        the hook's `enabled` condition will become `false`, preventing a reload */
        setQuery(airport.iata_code);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                placeholder={placeholder}
                className={className}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value === "") onChange("");
                }}
                onFocus={() => setIsOpen(true)}
            />
            {isFetching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin h-4 w-4 text-content-muted" />
                </div>
            )}
            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-main text-content border border-line rounded-md shadow-lg max-h-60 overflow-auto text-left">
                    {suggestions.map((airport) => (
                        <li
                            key={airport.iata_code}
                            className="px-3 py-2 hover:bg-surface cursor-pointer flex items-center gap-3 border-b border-line last:border-0"
                            onClick={() => handleSelect(airport)}
                        >
                            <div className="bg-surface p-1.5 rounded-full shrink-0">
                                <Plane size={14} className="text-content-muted" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-semibold truncate">
                                    {airport.city} <span className="text-content-muted font-normal">({airport.iata_code})</span>
                                </span>
                                <span className="text-xs text-content-muted truncate">
                                    {airport.name}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}