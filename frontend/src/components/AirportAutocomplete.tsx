import { useState, useEffect, useRef } from "react";
import { Plane } from "lucide-react";
import { AXIOS_INSTANCE } from "../api/axios-instance";

interface Airport {
    iata_code: string;
    name: string;
    city: string;
    country: string;
}

interface AirportAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function AirportAutocomplete({ value, onChange, placeholder, className }: AirportAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Airport[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    // Debounce search to avoid too many requests
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            // Only fetch if query is different from current selected value (to avoid refetching on selection)
            // and has at least 2 characters
            if (query && query !== value && query.length >= 2) {
                try {
                    const response = await AXIOS_INSTANCE.get<{ data: Airport[] }>(
                        `/airports?q=${encodeURIComponent(query)}`,
                        { baseURL: import.meta.env.VITE_BACKEND_API_BASE_URL }
                    );
                    // The backend wraps responses in { status: 'success', data: [...] }.
                    // The base AXIOS_INSTANCE doesn't unwrap this, so we access response.data.data.
                    setSuggestions(response.data.data);
                    setIsOpen(true);
                } catch (error) {
                    console.error("Failed to fetch airports", error);
                    setSuggestions([]);
                    setIsOpen(false);
                }
            } else if (query.length < 2) {
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, value]);

    const handleSelect = (airport: Airport) => {
        setQuery(airport.iata_code);
        onChange(airport.iata_code);
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
                onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            />
            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white text-black border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto text-left">
                    {suggestions.map((airport) => (
                        <li
                            key={airport.iata_code}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                            onClick={() => handleSelect(airport)}
                        >
                            <div className="bg-gray-100 p-1.5 rounded-full shrink-0">
                                <Plane size={14} className="text-gray-600" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-semibold truncate">
                                    {airport.city} <span className="text-gray-500 font-normal">({airport.iata_code})</span>
                                </span>
                                <span className="text-xs text-gray-500 truncate">
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