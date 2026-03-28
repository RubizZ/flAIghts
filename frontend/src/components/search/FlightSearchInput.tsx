import React from "react";
import { MapPin, Search } from "lucide-react";
import { AirportResponse } from "@/api/generated/model";
import AirportAutocomplete from "../AirportAutocomplete";
import PremiumInput from "../ui/PremiumInput";

interface FlightSearchInputProps {
    type: 'origin' | 'destination';
    value: AirportResponse | null;
    onChange: (airport: AirportResponse | null, query?: string) => boolean;
    onMapClick: () => void;
    isMapSelecting?: boolean;
    placeholder?: string;
    className?: string;
}

const FlightSearchInput: React.FC<FlightSearchInputProps> = ({
    type,
    value,
    onChange,
    onMapClick,
    isMapSelecting = false,
    placeholder,
    className = "",
}) => {
    const isOrigin = type === 'origin';
    const label = isOrigin ? "Origen" : "Destino";
    const iconColorClass = value
        ? (isOrigin ? "text-origin" : "text-destination")
        : "text-content-muted";

    const MapButton = (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onMapClick();
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${isMapSelecting
                ? 'text-brand bg-brand/10'
                : 'text-content-muted hover:bg-surface hover:text-brand'
                }`}
            title="Seleccionar en el mapa"
        >
            <Search size={isOrigin ? 16 : 14} />
        </button>
    );

    return (
        <PremiumInput
            icon={<MapPin size={18} />}
            label={label}
            iconColorClass={iconColorClass}
            actionButton={MapButton}
            className={className}
        >
            <AirportAutocomplete
                placeholder={placeholder || (isOrigin ? "¿Desde dónde?" : "¿A dónde?")}
                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full text-sm lg:text-base font-sans"
                value={value}
                onChange={onChange}
            />
        </PremiumInput>
    );
};

export default FlightSearchInput;
